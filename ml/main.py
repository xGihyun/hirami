from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Optional, Tuple
from datetime import datetime
import numpy as np
from sklearn.ensemble import IsolationForest
from contextlib import asynccontextmanager
from sklearn.preprocessing import RobustScaler
import math

# ====================================
# Pydantic Models (camelCase aliases)
# ====================================


class Equipment(BaseModel):
    id: str
    name: str
    brand: Optional[str]
    model: Optional[str]
    image_url: Optional[str] = Field(alias="imageUrl")
    quantity: int


class UserBasicInfo(BaseModel):
    user_id: str = Field(alias="id")
    first_name: str = Field(alias="firstName")
    middle_name: Optional[str] = Field(alias="middleName")
    last_name: str = Field(alias="lastName")
    avatar_url: Optional[str] = Field(alias="avatarUrl")


class BorrowTransaction(BaseModel):
    borrow_request_id: str = Field(alias="borrowRequestId")
    created_at: str = Field(alias="createdAt")
    expected_return_at: str = Field(alias="expectedReturnAt")
    borrower: UserBasicInfo
    equipments: List[Equipment]
    location: str
    purpose: str


class AnomalyResult(BaseModel):
    borrow_request_id: str = Field(alias="borrowRequestId")
    score: float
    is_anomaly: bool = Field(alias="isAnomaly")
    is_false_positive: Optional[bool] = Field(alias="isFalsePositive")


# ====================================
# Feature Representation
# ====================================


class BorrowRecord(BaseModel):
    num_items: int
    num_item_types: int
    borrow_duration_hours: float
    borrow_hour_sin: float
    borrow_hour_cos: float
    borrow_day_sin: float
    borrow_day_cos: float
    is_unusual_hour: int


def transaction_to_record(tx: BorrowTransaction) -> BorrowRecord:
    """Convert a BorrowTransaction into numeric features for anomaly detection."""
    created_at = datetime.fromisoformat(tx.created_at)
    expected_return_at = datetime.fromisoformat(tx.expected_return_at)

    borrow_duration_hours = (expected_return_at - created_at).total_seconds() / 3600.0
    num_items = sum(eq.quantity for eq in tx.equipments)
    num_item_types = len(tx.equipments)

    borrow_hour_norm = created_at.hour / 24
    borrow_hour_sin = math.sin(borrow_hour_norm * 2 * math.pi)
    borrow_hour_cos = math.cos(borrow_hour_norm * 2 * math.pi)

    borrow_day_norm = created_at.weekday() / 7
    borrow_day_sin = math.sin(borrow_day_norm * 2 * math.pi)
    borrow_day_cos = math.cos(borrow_day_norm * 2 * math.pi)

    is_unusual_hour = 1 if (created_at.hour < 7 or created_at.hour >= 20) else 0

    return BorrowRecord(
        num_items=num_items,
        num_item_types=num_item_types,
        borrow_duration_hours=borrow_duration_hours,
        borrow_hour_sin=borrow_hour_sin,
        borrow_hour_cos=borrow_hour_cos,
        borrow_day_sin=borrow_day_sin,
        borrow_day_cos=borrow_day_cos,
        is_unusual_hour=is_unusual_hour,
    )


# ====================================
# Model Utilities
# ====================================

borrow_scalers: dict[int, RobustScaler] = {}
borrow_models: dict[int, IsolationForest] = {}
threshold_detectors: dict[int, dict] = {}  # For one-sided thresholds
feature_names = [
    "num_items",
    "num_item_types",
    "borrow_duration_hours",
    "borrow_hour_sin",
    "borrow_hour_cos",
    "borrow_day_sin",
    "borrow_day_cos",
    "is_unusual_hour",
]


def train_model(data: np.ndarray, contamination: float = 0.1) -> IsolationForest:
    """Train with higher contamination to be more sensitive"""
    model = IsolationForest(
        contamination=contamination, random_state=42, n_estimators=100
    )
    model.fit(data)
    return model


def detect_borrow_anomalies(
    model: IsolationForest, x: np.ndarray
) -> Tuple[np.ndarray, np.ndarray]:
    predictions = model.predict(x)
    scores = model.decision_function(x)
    return scores, predictions


def create_one_sided_threshold(
    data: np.ndarray, percentile: float = 95, direction: str = "upper"
) -> dict:
    """
    Create a one-sided threshold detector.

    Args:
        data: Training data (1D array)
        percentile: Percentile to use as threshold (default 95 = top 5% are anomalies)
        direction: 'upper' for high values, 'lower' for low values

    Returns:
        Dictionary with threshold and direction
    """
    if direction == "upper":
        threshold = np.percentile(data, percentile)
    else:
        threshold = np.percentile(data, 100 - percentile)

    return {
        "threshold": threshold,
        "direction": direction,
        "mean": np.mean(data),
        "std": np.std(data),
    }


def detect_one_sided_anomalies(
    x: np.ndarray, detector: dict
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Detect anomalies using one-sided threshold.

    Returns:
        scores: Normalized distance from threshold (negative = more anomalous)
        predictions: 1 for normal, -1 for anomaly
    """
    threshold = detector["threshold"]
    direction = detector["direction"]
    std = detector["std"]

    if direction == "upper":
        # Flag values above threshold as anomalies
        predictions = np.where(x.flatten() > threshold, -1, 1)
        # Score: negative distance from threshold (normalized by std)
        scores = -(x.flatten() - threshold) / (std if std > 0 else 1)
    else:  # lower
        # Flag values below threshold as anomalies
        predictions = np.where(x.flatten() < threshold, -1, 1)
        # Score: negative distance from threshold
        scores = (x.flatten() - threshold) / (std if std > 0 else 1)

    # Clip scores to reasonable range for normal values
    scores = np.clip(scores, -5, 1)

    return scores, predictions


# ====================================
# Lifespan Event for App Startup
# ====================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    global borrow_scalers, borrow_models, threshold_detectors

    np.random.seed(42)

    normal_samples = []

    # Generate diverse but realistic normal patterns
    # Ideally, this should slowly be replaced by the borrow transactions stored in the database
    # as it gets more records over time.
    for _ in range(800):
        num_items = np.random.randint(1, 21)
        num_types = np.random.randint(1, 4)

        if np.random.random() < 0.85:
            duration = np.random.randint(1, 8)
        elif np.random.random() < 0.95:
            duration = np.random.randint(8, 25)
        else:
            duration = np.random.randint(25, 73)

        borrow_hour = np.random.randint(7, 20)  # 7AM - 7PM
        borrow_day = np.random.randint(0, 7)

        # Cyclic Feature Encoding (Sine/Cosine) for Hour and Day.
        # Purpose: Time is inherently cyclical (23:00 is close to 00:00; Monday is close to Sunday).
        # Treating these as linear numbers (0 to 23) would make models incorrectly see
        # the wrap-around points (e.g., 0 and 23) as extreme anomalies because the distance
        # between them is large (23). The sin/cos pair maps the time to a 2D circle,
        # ensuring that the start and end of the cycle are mathematically close.
        borrow_hour_norm = borrow_hour / 24
        borrow_hour_sin = math.sin(borrow_hour_norm * 2 * math.pi)
        borrow_hour_cos = math.cos(borrow_hour_norm * 2 * math.pi)

        borrow_day_norm = borrow_day / 7
        borrow_day_sin = math.sin(borrow_day_norm * 2 * math.pi)
        borrow_day_cos = math.cos(borrow_day_norm * 2 * math.pi)

        is_unusual_hour = 1 if np.random.random() < 0.05 else 0

        normal_samples.append(
            [
                num_items,
                num_types,
                duration,
                borrow_hour_sin,
                borrow_hour_cos,
                borrow_day_sin,
                borrow_day_cos,
                is_unusual_hour,
            ]
        )

    X = np.array(normal_samples)
    num_features = X.shape[1]

    # Define which features should use one-sided detection
    one_sided_features = {
        0: {"percentile": 95, "direction": "upper"},
        1: {
            "percentile": 95,
            "direction": "upper",
        },
        2: {
            "percentile": 90,
            "direction": "upper",
        },
    }

    contamination_levels = {
        3: 0.05,  # borrow_hour_sin
        4: 0.05,  # borrow_hour_cos
        5: 0.05,  # borrow_day_sin
        6: 0.05,  # borrow_day_cos
        7: 0.20,  # is_unusual_hour
    }

    for i in range(num_features):
        X_feature_col = X[:, i].reshape(-1, 1)

        if i in one_sided_features:
            # Use one-sided threshold detection
            config = one_sided_features[i]
            detector = create_one_sided_threshold(
                X_feature_col.flatten(),
                percentile=config["percentile"],
                direction=config["direction"],
            )
            threshold_detectors[i] = detector
            print(
                f"Feature {feature_names[i]}: One-sided threshold = {detector['threshold']:.2f}"
            )
        else:
            # Use traditional two-sided Isolation Forest
            scaler = RobustScaler()
            X_feature_scaled = scaler.fit_transform(X_feature_col)

            contamination = contamination_levels.get(i, 0.1)
            model = train_model(X_feature_scaled, contamination=contamination)

            borrow_scalers[i] = scaler
            borrow_models[i] = model
            print(
                f"Feature {feature_names[i]}: Isolation Forest (contamination={contamination})"
            )

    print(f"\nModel trained on {num_features} features.")
    print("Training data ranges:")
    print(f"  num_items: {X[:, 0].min():.0f} - {X[:, 0].max():.0f}")
    print(f"  duration: {X[:, 2].min():.1f} - {X[:, 2].max():.1f} hours")

    yield
    print("Shutting down models...")


# ====================================
# FastAPI App
# ====================================

app = FastAPI(title="Borrow Anomaly Detection Service", lifespan=lifespan)


@app.post("/anomalies")
def detect_anomalies(transactions: List[BorrowTransaction]):
    global borrow_scalers, borrow_models, threshold_detectors

    if not borrow_scalers and not threshold_detectors:
        print("No models or detectors found")
        return []

    records = [transaction_to_record(tx) for tx in transactions]
    X = np.array(
        [
            [
                r.num_items,
                r.num_item_types,
                r.borrow_duration_hours,
                r.borrow_hour_sin,
                r.borrow_hour_cos,
                r.borrow_day_sin,
                r.borrow_day_cos,
                r.is_unusual_hour,
            ]
            for r in records
        ]
    )

    all_scores = []
    all_preds = []
    feature_anomalies = []

    num_features = X.shape[1]

    for i in range(num_features):
        X_feature_col = X[:, i].reshape(-1, 1)

        if i in threshold_detectors:
            # Use one-sided threshold detection
            detector = threshold_detectors[i]
            scores, preds = detect_one_sided_anomalies(X_feature_col, detector)
        else:
            # Use Isolation Forest
            scaler = borrow_scalers[i]
            model = borrow_models[i]
            X_feature_scaled = scaler.transform(X_feature_col)
            scores, preds = detect_borrow_anomalies(model, X_feature_scaled)

        all_scores.append(scores)
        all_preds.append(preds)
        feature_anomalies.append(preds == -1)

    all_scores_array = np.array(all_scores)
    feature_anomalies_array = np.array(feature_anomalies)

    # Strategy: If any feature is anomalous, flag the transaction
    any_feature_anomalous = np.any(feature_anomalies_array, axis=0)
    final_preds = np.where(any_feature_anomalous, -1, 1)
    final_scores = np.min(all_scores_array, axis=0)

    results: List[AnomalyResult] = []
    for idx, (tx, score, pred) in enumerate(
        zip(transactions, final_scores, final_preds)
    ):
        # Debug logging
        if pred == -1:
            anomalous_features = [
                feature_names[i]
                for i in range(num_features)
                if feature_anomalies_array[i, idx]
            ]
            print(f"Anomaly detected in {tx.borrow_request_id}")
            print(f"  Anomalous features: {anomalous_features}")
            print(f"  Duration: {records[idx].borrow_duration_hours:.1f} hours")
            print(
                f"  Items: {records[idx].num_items}, Types: {records[idx].num_item_types}"
            )

        results.append(
            AnomalyResult(
                borrowRequestId=tx.borrow_request_id,
                score=float(score),
                isAnomaly=pred == -1,
                isFalsePositive=None,
            )
        )

    return results


# ====================================
# Run Command
# ====================================
# uvicorn app:app --reload --port 8000
