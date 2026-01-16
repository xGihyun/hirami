export enum EquipmentServerEvent {
	EquipmentCreate = "equipment:create",
	EquipmentAnomaly = "equipment:anomaly",
	EquipmentReallocate = "equipment:reallocate",

	BorrowRequestCreate = "borrow-request:create",
	BorrowRequestUpdate = "borrow-request:update",
	BorrowRequestReview = "borrow-request:review",

	ReturnRequestConfirm = "return-request:confirm",
}
