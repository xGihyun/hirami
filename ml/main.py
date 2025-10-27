from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Optional, Tuple
from datetime import datetime
import numpy as np
from sklearn.ensemble import IsolationForest
from contextlib import asynccontextmanager


# ====================================
# Pydantic Models (camelCase aliases)
# ====================================


class Equipment(BaseModel):
    equipment_type_id: str = Field(alias="equipmentTypeId")
    quantity: int


class UserBasicInfo(BaseModel):
    user_id: str = Field(alias="userId")
    name: str


class BorrowTransaction(BaseModel):
    borrow_request_id: str = Field(alias="borrowRequestId")
    borrowed_at: str = Field(alias="borrowedAt")
    expected_return_at: str = Field(alias="expectedReturnAt")
    actual_return_at: Optional[str] = Field(default=None, alias="actualReturnAt")
    borrower: UserBasicInfo
    equipments: List[Equipment]
    location: str
    purpose: str
    borrow_reviewed_by: UserBasicInfo = Field(alias="borrowReviewedBy")
    return_confirmed_by: Optional[UserBasicInfo] = Field(
        default=None, alias="returnConfirmedBy"
    )
    remarks: Optional[str] = None
    status: str


# ====================================
# Feature Representation
# ====================================


class BorrowRecord(BaseModel):
    num_items: int
    num_item_types: int
    borrow_duration_hours: float
    borrow_hour_of_day: int
    day_of_week: int


def transaction_to_record(tx: BorrowTransaction) -> BorrowRecord:
    """Convert a BorrowTransaction into numeric features for anomaly detection."""
    borrowed_at = datetime.fromisoformat(tx.borrowed_at)
    expected_return_at = datetime.fromisoformat(tx.expected_return_at)

    borrow_duration_hours = (expected_return_at - borrowed_at).total_seconds() / 3600.0
    num_items = sum(eq.quantity for eq in tx.equipments)
    num_item_types = len(tx.equipments)

    return BorrowRecord(
        num_items=num_items,
        num_item_types=num_item_types,
        borrow_duration_hours=borrow_duration_hours,
        borrow_hour_of_day=borrowed_at.hour,
        day_of_week=borrowed_at.weekday(),
    )


# ====================================
# Model Utilities
# ====================================


def train_model(data: np.ndarray) -> IsolationForest:
    model = IsolationForest(contamination=0.1, random_state=42)
    model.fit(data)
    return model


def detect_borrow_anomalies(
    model: IsolationForest, x: np.ndarray
) -> Tuple[np.ndarray, np.ndarray]:
    predictions = model.predict(x)
    scores = model.decision_function(x)
    return scores, predictions


# ====================================
# Lifespan Event for App Startup
# ====================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    np.random.seed(42)

    normal_samples = []

    # Generate diverse but realistic normal patterns
    for _ in range(300):
        # Mix of different normal scenarios
        scenario = np.random.choice(["short", "medium", "day"])

        if scenario == "short":  # Quick borrow (2-4 hours)
            num_items = np.random.randint(1, 4)
            num_types = np.random.randint(1, 3)
            duration = np.random.uniform(1, 5)
        elif scenario == "medium":  # Half day (4-8 hours)
            num_items = np.random.randint(1, 5)
            num_types = np.random.randint(1, 4)
            duration = np.random.uniform(4, 10)
        else:  # Full day (6-12 hours)
            num_items = np.random.randint(1, 6)
            num_types = np.random.randint(1, 4)
            duration = np.random.uniform(6, 14)

        hour = np.random.randint(7, 19)  # 7am-7pm (wider range)
        day = np.random.randint(0, 7)  # Include weekends

        normal_samples.append([num_items, num_types, duration, hour, day])

    X = np.array(normal_samples)
    app.state.model = train_model(X)
    print(f"✅ Model trained on {len(normal_samples)} normal samples.")
    yield
    print("👋 Shutting down model...")


# ====================================
# FastAPI App
# ====================================

app = FastAPI(title="Borrow Anomaly Detection Service", lifespan=lifespan)


@app.post("/anomalies")
def detect_anomalies(transactions: List[BorrowTransaction]):
    model = app.state.model  # Access shared model

    records = [transaction_to_record(tx) for tx in transactions]
    X = np.array(
        [
            [
                r.num_items,
                r.num_item_types,
                r.borrow_duration_hours,
                r.borrow_hour_of_day,
                r.day_of_week,
            ]
            for r in records
        ]
    )

    scores, preds = detect_borrow_anomalies(model, X)

    results = []
    for tx, score, pred in zip(transactions, scores, preds):
        results.append(
            {
                "borrowRequestId": tx.borrow_request_id,
                "score": score,
                "status": "anomaly" if pred == -1 else "normal",
            }
        )

    return {"results": results}


# ====================================
# Run Command
# ====================================
# uvicorn app:app --reload --port 8000
