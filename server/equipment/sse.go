package equipment

type event = string

const (
	eventEquipmentCreate     event = "equipment:create"
	eventEquipmentAnomaly    event = "equipment:anomaly"
	eventEquipmentReallocate event = "equipment:reallocate"
)

const (
	eventBorrowRequestCreate event = "borrow-request:create"
	eventBorrowRequestUpdate event = "borrow-request:update"
	eventBorrowRequestReview event = "borrow-request:review"
)

const (
	eventReturnRequestConfirm event = "return-request:confirm"
)
