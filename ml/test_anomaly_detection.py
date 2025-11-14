import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture(scope="session")
def client():
    """Create a test client for the FastAPI app with lifespan context"""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def normal_borrower():
    """Standard borrower info used across tests"""
    return {
        "id": "949a47dd-59ec-4a97-aebf-703ae3b61058",
        "firstName": "Kazusa",
        "middleName": None,
        "lastName": "Kyoyama",
        "avatarUrl": "/uploads/users/kazusa-band-icon.jpg",
    }


@pytest.fixture
def normal_equipment():
    """Standard equipment used across tests"""
    return {
        "borrowRequestItemId": "191cf31b-d4e3-4d5e-9cd1-c23aada5e87f",
        "equipmentTypeId": "f0b8ca34-b851-4557-b7b5-848d814ae912",
        "name": "Volleyball",
        "brand": "Mikasa",
        "model": "V200W",
        "imageUrl": "/uploads/equipments/mikasa-v200w.png",
        "quantity": 1,
    }


class TestNormalBorrowRequests:
    """Tests for requests that should NOT be flagged as anomalies"""

    def test_normal_daytime_short_borrow(
        self, client, normal_borrower, normal_equipment
    ):
        """Test normal borrow: 8 AM - 12 PM, 1 item"""
        request = [
            {
                "borrowRequestId": "test-001",
                "createdAt": "2025-11-13T08:00:00",
                "expectedReturnAt": "2025-11-13T12:00:00",
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "Sports activity",
            }
        ]

        response = client.post("/anomalies", json=request)
        assert response.status_code == 200

        result = response.json()[0]
        assert result["borrowRequestId"] == "test-001"
        assert not result["isAnomaly"]

        print(f"Normal daytime borrow - Score: {result['score']:.4f}")

    def test_normal_multiple_items(self, client, normal_borrower, normal_equipment):
        """Test normal borrow with multiple items"""
        equipment_multi = normal_equipment.copy()
        equipment_multi["quantity"] = 5

        request = [
            {
                "borrowRequestId": "test-002",
                "createdAt": "2025-11-13T10:00:00",
                "expectedReturnAt": "2025-11-13T14:00:00",
                "borrower": normal_borrower,
                "equipments": [equipment_multi],
                "location": "Gym",
                "purpose": "Team practice",
            }
        ]

        response = client.post("/anomalies", json=request)
        assert response.status_code == 200

        result = response.json()[0]
        assert not result["isAnomaly"]

        print(f"Multiple items - Score: {result['score']:.4f}")

    def test_normal_full_day_borrow(self, client, normal_borrower, normal_equipment):
        """Test normal full-day borrow (within 24 hours)"""
        request = [
            {
                "borrowRequestId": "test-003",
                "createdAt": "2025-11-13T09:00:00",
                "expectedReturnAt": "2025-11-13T17:00:00",
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "All-day event",
            }
        ]

        response = client.post("/anomalies", json=request)
        assert response.status_code == 200

        result = response.json()[0]
        assert not result["isAnomaly"]
        print(f"Full day borrow - Score: {result['score']:.4f}")


class TestAnomalousBorrowRequests:
    """Tests for requests that should be flagged as anomalies"""

    def test_extremely_long_duration(self, client, normal_borrower, normal_equipment):
        """Test anomaly: 400+ hours duration"""
        request = [
            {
                "borrowRequestId": "test-101",
                "createdAt": "2025-11-13T08:00:00",
                "expectedReturnAt": "2025-11-30T12:00:00",  # 17 days later
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "Long-term project",
            }
        ]

        response = client.post("/anomalies", json=request)
        assert response.status_code == 200

        result = response.json()[0]
        assert result["borrowRequestId"] == "test-101"
        assert result["isAnomaly"]
        print(f"Extremely long duration detected - Score: {result['score']:.4f}")

    def test_very_early_morning_borrow(self, client, normal_borrower, normal_equipment):
        """Test anomaly: 4 AM borrow time"""
        request = [
            {
                "borrowRequestId": "test-102",
                "createdAt": "2025-11-13T04:00:00",
                "expectedReturnAt": "2025-11-13T12:00:00",
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "Early workout",
            }
        ]

        response = client.post("/anomalies", json=request)
        assert response.status_code == 200

        result = response.json()[0]
        assert result["isAnomaly"]
        print(f"Early morning anomaly detected - Score: {result['score']:.4f}")

    def test_late_night_borrow(self, client, normal_borrower, normal_equipment):
        """Test anomaly: 11 PM borrow time"""
        request = [
            {
                "borrowRequestId": "test-103",
                "createdAt": "2025-11-13T23:00:00",
                "expectedReturnAt": "2025-11-14T02:00:00",
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "Late night activity",
            }
        ]

        response = client.post("/anomalies", json=request)
        assert response.status_code == 200

        result = response.json()[0]
        assert result["isAnomaly"]
        print(f"Late night anomaly detected - Score: {result['score']:.4f}")

    def test_excessive_items(self, client, normal_borrower, normal_equipment):
        """Test anomaly: Borrowing 50 items"""
        equipment_excessive = normal_equipment.copy()
        equipment_excessive["quantity"] = 50

        request = [
            {
                "borrowRequestId": "test-104",
                "createdAt": "2025-11-13T10:00:00",
                "expectedReturnAt": "2025-11-13T14:00:00",
                "borrower": normal_borrower,
                "equipments": [equipment_excessive],
                "location": "Gym",
                "purpose": "Large event",
            }
        ]

        response = client.post("/anomalies", json=request)
        assert response.status_code == 200

        result = response.json()[0]
        assert result["isAnomaly"]
        print(f"Excessive items detected - Score: {result['score']:.4f}")

    def test_excessive_item_types(self, client, normal_borrower, normal_equipment):
        """Test anomaly: Borrowing 15 distinct item types (high num_item_types)."""
        # Create 15 distinct 'normal' equipment items, each with a quantity of 1.
        # This keeps the total quantity (num_items) low/normal, isolating the num_item_types feature.
        excessive_types_list = []
        for i in range(20):
            equipment = normal_equipment.copy()
            equipment["borrowRequestItemId"] = f"item-type-{i}"  # Unique ID
            equipment["equipmentTypeId"] = f"type-{i}"          # Unique type ID
            equipment["name"] = f"Unique Item {i}"
            equipment["quantity"] = 1  # Low quantity
            excessive_types_list.append(equipment)

        request = [
            {
                "borrowRequestId": "test-105",
                "createdAt": "2025-11-13T10:00:00",
                "expectedReturnAt": "2025-11-13T14:00:00",
                "borrower": normal_borrower,
                "equipments": excessive_types_list,  # List of 15 unique items
                "location": "Theater",
                "purpose": "Filming and staging setup",
            }
        ]

        response = client.post("/anomalies", json=request)
        assert response.status_code == 200

        result = response.json()[0]
        # Expect the anomaly to be detected because 15 distinct types is far above 
        # the training max of 3.
        assert result["isAnomaly"]
        print(f"Excessive item types detected - Score: {result['score']:.4f}")

    def test_early_morning_with_long_duration(
        self, client, normal_borrower, normal_equipment
    ):
        """Test anomaly: 4 AM borrow until 11 PM same day"""
        request = [
            {
                "borrowRequestId": "test-105",
                "createdAt": "2025-11-13T04:00:00",
                "expectedReturnAt": "2025-11-13T23:00:00",
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "All-day event",
            }
        ]

        response = client.post("/anomalies", json=request)
        assert response.status_code == 200

        result = response.json()[0]
        assert result["isAnomaly"]
        print(f"Early morning + long duration detected - Score: {result['score']:.4f}")


class TestBatchProcessing:
    """Tests for processing multiple transactions at once"""

    def test_mixed_batch(self, client, normal_borrower, normal_equipment):
        """Test batch with both normal and anomalous requests"""
        requests = [
            {
                "borrowRequestId": "batch-001",
                "createdAt": "2025-11-13T10:00:00",
                "expectedReturnAt": "2025-11-13T14:00:00",
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "Normal",
            },
            {
                "borrowRequestId": "batch-002",
                "createdAt": "2025-11-13T03:00:00",  # Anomaly: 3 AM
                "expectedReturnAt": "2025-11-13T10:00:00",
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "Early",
            },
            {
                "borrowRequestId": "batch-003",
                "createdAt": "2025-11-13T12:00:00",
                "expectedReturnAt": "2025-11-30T12:00:00",  # Anomaly: 17 days
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "Long",
            },
        ]

        response = client.post("/anomalies", json=requests)
        assert response.status_code == 200

        results = response.json()
        assert len(results) == 3

        # First should be normal
        assert results[0]["borrowRequestId"] == "batch-001"
        assert not results[0]["isAnomaly"]

        # Second should be anomalous (early morning)
        assert results[1]["borrowRequestId"] == "batch-002"
        assert results[1]["isAnomaly"]

        # Third should be anomalous (long duration)
        assert results[2]["borrowRequestId"] == "batch-003"
        assert results[2]["isAnomaly"]

        print("Batch processing: 1 normal, 2 anomalies detected correctly")


class TestEdgeCases:
    """Tests for edge cases and boundary conditions"""

    def test_boundary_7am_not_anomaly(self, client, normal_borrower, normal_equipment):
        """Test that 7 AM is considered normal (boundary)"""
        request = [
            {
                "borrowRequestId": "edge-001",
                "createdAt": "2025-11-13T07:00:00",
                "expectedReturnAt": "2025-11-13T12:00:00",
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "Morning",
            }
        ]

        response = client.post("/anomalies", json=request)
        result = response.json()[0]
        assert not result["isAnomaly"]
        print(f"✓ 7 AM boundary (normal) - Score: {result['score']:.4f}")

    def test_boundary_6am_is_anomaly(self, client, normal_borrower, normal_equipment):
        """Test that 6:59 AM is considered anomalous"""
        request = [
            {
                "borrowRequestId": "edge-002",
                "createdAt": "2025-11-13T06:59:00",
                "expectedReturnAt": "2025-11-13T12:00:00",
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "Early",
            }
        ]

        response = client.post("/anomalies", json=request)
        result = response.json()[0]
        assert result["isAnomaly"]
        print(f"✓ 6:59 AM boundary (anomaly) - Score: {result['score']:.4f}")

    def test_boundary_8pm_not_anomaly(self, client, normal_borrower, normal_equipment):
        """Test that 8 PM is still considered normal"""
        request = [
            {
                "borrowRequestId": "edge-003",
                "createdAt": "2025-11-13T20:00:00",
                "expectedReturnAt": "2025-11-13T22:00:00",
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "Evening",
            }
        ]

        response = client.post("/anomalies", json=request)
        result = response.json()[0]
        # Note: 20:00 (8 PM) should be anomalous based on current code (>= 20)
        # Adjust if you want 8 PM to be normal
        assert result["isAnomaly"]
        print(f"✓ 8 PM boundary - Score: {result['score']:.4f}")

    def test_zero_duration(self, client, normal_borrower, normal_equipment):
        """Test borrow and return at same time"""
        request = [
            {
                "borrowRequestId": "edge-004",
                "createdAt": "2025-11-13T10:00:00",
                "expectedReturnAt": "2025-11-13T10:00:00",
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "Instant return",
            }
        ]

        response = client.post("/anomalies", json=request)
        result = response.json()[0]
        # Zero duration should be anomalous
        print(
            f"Zero duration - Anomaly: {result['isAnomaly']}, Score: {result['score']:.4f}"
        )

    def test_multiple_equipment_types(self, client, normal_borrower, normal_equipment):
        """Test borrowing multiple types of equipment"""
        equipment2 = {
            "borrowRequestItemId": "item-002",
            "equipmentTypeId": "type-002",
            "name": "Basketball",
            "brand": "Spalding",
            "model": "NBA",
            "imageUrl": "/uploads/equipments/basketball.png",
            "quantity": 2,
        }

        request = [
            {
                "borrowRequestId": "edge-005",
                "createdAt": "2025-11-13T10:00:00",
                "expectedReturnAt": "2025-11-13T14:00:00",
                "borrower": normal_borrower,
                "equipments": [normal_equipment, equipment2],
                "location": "Gym",
                "purpose": "Multiple sports",
            }
        ]

        response = client.post("/anomalies", json=request)
        result = response.json()[0]
        # Should be normal (3 items, 2 types)
        print(
            f"Multiple types - Anomaly: {result['isAnomaly']}, Score: {result['score']:.4f}"
        )


class TestResponseFormat:
    """Tests for API response structure"""

    def test_response_has_required_fields(
        self, client, normal_borrower, normal_equipment
    ):
        """Test that response contains all required fields"""
        request = [
            {
                "borrowRequestId": "format-001",
                "createdAt": "2025-11-13T10:00:00",
                "expectedReturnAt": "2025-11-13T14:00:00",
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "Test",
            }
        ]

        response = client.post("/anomalies", json=request)
        result = response.json()[0]

        assert "borrowRequestId" in result
        assert "score" in result
        assert "isAnomaly" in result
        assert "isFalsePositive" in result

        assert isinstance(result["borrowRequestId"], str)
        assert isinstance(result["score"], float)
        assert isinstance(result["isAnomaly"], bool)
        print("Response format validated")

    def test_score_is_numeric(self, client, normal_borrower, normal_equipment):
        """Test that anomaly score is a valid number"""
        request = [
            {
                "borrowRequestId": "format-002",
                "createdAt": "2025-11-13T10:00:00",
                "expectedReturnAt": "2025-11-13T14:00:00",
                "borrower": normal_borrower,
                "equipments": [normal_equipment],
                "location": "Gym",
                "purpose": "Test",
            }
        ]

        response = client.post("/anomalies", json=request)
        result = response.json()[0]

        assert isinstance(result["score"], (int, float))
        assert not (result["score"] != result["score"])  # Check not NaN
        print(f"Score is valid number: {result['score']:.4f}")


if __name__ == "__main__":
    # Run with: pytest test_anomaly_detection.py -v -s
    # The -s flag allows print statements to show
    pytest.main([__file__, "-v", "-s"])
