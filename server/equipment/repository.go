package equipment

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/xGihyun/hirami/user"
)

type Repository interface {
	createEquipment(ctx context.Context, arg createRequest) error
	getAll(ctx context.Context) ([]equipmentWithBorrower, error)
	update(ctx context.Context, arg updateRequest) error

	createBorrowRequest(ctx context.Context, arg createBorrowRequest) (createBorrowResponse, error)
	reviewBorrowRequest(ctx context.Context, arg reviewBorrowRequest) (reviewBorrowResponse, error)
	getBorrowRequests(ctx context.Context) ([]borrowRequest, error)

	createReturnRequest(ctx context.Context, arg createReturnRequest) (createReturnResponse, error)
	confirmReturnRequest(ctx context.Context, arg confirmReturnRequest) (confirmReturnRequest, error)
	getReturnRequests(ctx context.Context) ([]returnRequest, error)

	getBorrowHistory(ctx context.Context, params borrowHistoryParams) ([]borrowTransaction, error)
}

type repository struct {
	querier *pgxpool.Pool
}

func NewRepository(querier *pgxpool.Pool) Repository {
	return &repository{
		querier: querier,
	}
}

type equipmentStatus string

const (
	available equipmentStatus = "available"
	borrowed  equipmentStatus = "borrowed"
)

// TODO: Remove serial number on database schema

type createRequest struct {
	Name            string    `json:"name"`
	Brand           *string   `json:"brand"`
	Model           *string   `json:"model"`
	ImageURL        *string   `json:"imageUrl"`
	AcquisitionDate time.Time `json:"acquisitionDate"`
	Quantity        uint      `json:"quantity"`
}

func (r *repository) createEquipment(ctx context.Context, arg createRequest) error {
	query := `
	INSERT INTO equipment_type (name, brand, model, image_url)
	VALUES ($1, $2, $3, $4)
	ON CONFLICT (name, brand, COALESCE(model, ''))
	DO UPDATE SET equipment_type_id = equipment_type.equipment_type_id
	RETURNING equipment_type_id
	`

	var equipmentTypeID string
	row := r.querier.QueryRow(ctx, query, arg.Name, arg.Brand, arg.Model, arg.ImageURL)
	if err := row.Scan(&equipmentTypeID); err != nil {
		return err
	}

	query = `
	INSERT INTO equipment (equipment_type_id, acquired_at)
	SELECT $1, $2
	FROM generate_series(1, $3)
	`
	if _, err := r.querier.Exec(
		ctx,
		query,
		equipmentTypeID,
		arg.AcquisitionDate,
		arg.Quantity,
	); err != nil {
		return err
	}

	return nil
}

type equipment struct {
	EquipmentTypeID string          `json:"id"`
	Name            string          `json:"name"`
	Brand           *string         `json:"brand"`
	Model           *string         `json:"model"`
	ImageURL        *string         `json:"imageUrl"`
	Quantity        uint            `json:"quantity"`
	Status          equipmentStatus `json:"status,omitzero"`
}

type equipmentWithBorrower struct {
	equipment

	Borrower *user.BasicInfo `json:"borrower"`
}

func (r *repository) getAll(ctx context.Context) ([]equipmentWithBorrower, error) {
	query := `
	WITH equipment_with_status AS (
		SELECT
			equipment_type.equipment_type_id,
			equipment_type.name,
			equipment_type.brand,
			equipment_type.model,
			equipment_type.image_url,
			equipment.equipment_id,
			CASE
				WHEN EXISTS (
					SELECT 1 FROM borrow_transaction
					WHERE borrow_transaction.equipment_id = equipment.equipment_id
					AND NOT EXISTS (
						SELECT 1 
						FROM return_transaction 
						WHERE return_transaction.borrow_transaction_id = borrow_transaction.borrow_transaction_id
					)
				) THEN 'borrowed'
				ELSE 'available'
			END AS status,
			CASE
				WHEN EXISTS (
					SELECT 1 FROM borrow_transaction
					WHERE borrow_transaction.equipment_id = equipment.equipment_id
					AND NOT EXISTS (
						SELECT 1 
						FROM return_transaction 
						WHERE return_transaction.borrow_transaction_id 
							= borrow_transaction.borrow_transaction_id
					)
				) THEN (
					SELECT jsonb_build_object(
						'id', person.person_id,
						'firstName', person.first_name,
						'middleName', person.middle_name,
						'lastName', person.last_name,
						'avatarUrl', person.avatar_url
					)
					FROM borrow_transaction
					JOIN borrow_request_item 
						ON borrow_request_item.borrow_request_item_id 
							= borrow_transaction.borrow_request_item_id
					JOIN borrow_request ON borrow_request.borrow_request_id 
						= borrow_request_item.borrow_request_id
					JOIN person ON person.person_id = borrow_request.requested_by
					WHERE borrow_transaction.equipment_id = equipment.equipment_id
					AND NOT EXISTS (
						SELECT 1 FROM return_transaction 
						WHERE return_transaction.borrow_transaction_id 
							= borrow_transaction.borrow_transaction_id
					)
					ORDER BY borrow_transaction.created_at DESC
					LIMIT 1
				)
				ELSE NULL
			END AS borrower
		FROM equipment_type
		JOIN equipment ON equipment.equipment_type_id = equipment_type.equipment_type_id
	)
	SELECT
		equipment_type_id,
		name,
		brand,
		model,
		image_url,
		status,
		COUNT(equipment_id) AS quantity,
		borrower
	FROM equipment_with_status
	GROUP BY equipment_type_id, name, brand, model, image_url, status, borrower
	`
	rows, err := r.querier.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	equipments, err := pgx.CollectRows(rows, pgx.RowToStructByName[equipmentWithBorrower])
	if err != nil {
		return nil, err
	}
	return equipments, nil
}

type updateRequest struct {
	EquipmentTypeID string  `json:"equipmentTypeId"`
	Name            string  `json:"name"`
	Brand           *string `json:"brand"`
	Model           *string `json:"model"`
	ImageURL        *string `json:"imageUrl"`
}

func (r *repository) update(ctx context.Context, arg updateRequest) error {
	query := `
	UPDATE equipment_type
	SET name = $1,
		brand = $2,
		model = $3,
		image_url = $4
	WHERE equipment_type_id = $5
	`

	if _, err := r.querier.Exec(
		ctx,
		query,
		arg.Name,
		arg.Brand,
		arg.Model,
		arg.ImageURL,
		arg.EquipmentTypeID,
	); err != nil {
		return err
	}

	return nil
}

type borrowEquipmentItem struct {
	EquipmentTypeID string `json:"equipmentTypeId"`
	Quantity        uint   `json:"quantity"`
}

type createBorrowRequest struct {
	Equipments       []borrowEquipmentItem `json:"equipments"`
	Location         string                `json:"location"`
	Purpose          string                `json:"purpose"`
	ExpectedReturnAt time.Time             `json:"expectedReturnAt"`
	RequestedBy      string                `json:"requestedBy"`
}

type borrowedEquipment struct {
	BorrowRequestID string  `json:"borrowRequestId"`
	EquipmentTypeID string  `json:"equipmentTypeId"`
	Name            string  `json:"name"`
	Brand           *string `json:"brand"`
	Model           *string `json:"model"`
	ImageURL        *string `json:"imageUrl"`
	Quantity        uint    `json:"quantity"`
}

type createBorrowResponse struct {
	Borrower         user.BasicInfo      `json:"borrower"`
	Equipments       []borrowedEquipment `json:"equipments"`
	Location         string              `json:"location"`
	Purpose          string              `json:"purpose"`
	ExpectedReturnAt time.Time           `json:"expectedReturnAt"`
}

var (
	errInsufficientEquipmentQuantity = fmt.Errorf("requested quantity exceeds available equipment")
	errInvalidBorrowQuantity         = fmt.Errorf("borrow quantity must be greater than zero")
	errEmptyEquipmentList            = fmt.Errorf("equipments list cannot be empty")
)

func (r *repository) createBorrowRequest(ctx context.Context, arg createBorrowRequest) (createBorrowResponse, error) {
	if len(arg.Equipments) == 0 {
		return createBorrowResponse{}, errEmptyEquipmentList
	}

	// Validate quantities
	for _, item := range arg.Equipments {
		if item.Quantity <= 0 {
			return createBorrowResponse{}, errInvalidBorrowQuantity
		}
	}

	// Check availability for all equipment types
	availabilityQuery := `
	SELECT COUNT(equipment.equipment_id) AS available_quantity
	FROM equipment
	WHERE equipment.equipment_type_id = $1
	AND NOT EXISTS (
		SELECT 1 FROM borrow_transaction
		WHERE borrow_transaction.equipment_id = equipment.equipment_id
		AND NOT EXISTS (
			SELECT 1 FROM return_transaction 
			WHERE return_transaction.borrow_transaction_id = borrow_transaction.borrow_transaction_id
		)
	)
	`

	for _, item := range arg.Equipments {
		var availableQuantity uint
		if err := r.querier.QueryRow(ctx, availabilityQuery, item.EquipmentTypeID).Scan(&availableQuantity); err != nil {
			return createBorrowResponse{}, err
		}

		if item.Quantity > availableQuantity {
			return createBorrowResponse{}, errInsufficientEquipmentQuantity
		}
	}

	// Insert multiple borrow requests (one per equipment type)
	query := `
	WITH inserted_requests AS (
		INSERT INTO borrow_request 
			(equipment_type_id, quantity, location, purpose, expected_return_at, requested_by)
		SELECT 
			unnest($1::uuid[]),
			unnest($2::smallint[]),
			$3,
			$4,
			$5,
			$6
		RETURNING borrow_request_id, equipment_type_id, quantity, location, purpose, expected_return_at, requested_by
	)
	SELECT 
		jsonb_build_object(
			'id', person.person_id,
			'firstName', person.first_name,
			'middleName', person.middle_name,
			'lastName', person.last_name,
			'avatarUrl', person.avatar_url
		) AS borrower,
		jsonb_agg(
			jsonb_build_object(
				'borrowRequestId', inserted_requests.borrow_request_id,
				'id', equipment_type.equipment_type_id,
				'name', equipment_type.name,
				'brand', equipment_type.brand,
				'model', equipment_type.model,
				'imageUrl', equipment_type.image_url,
				'quantity', inserted_requests.quantity
			)
		) AS equipments,
		MAX(inserted_requests.location) AS location,
		MAX(inserted_requests.purpose) AS purpose,
		MAX(inserted_requests.expected_return_at) AS expected_return_at
	FROM inserted_requests
	JOIN person ON person.person_id = inserted_requests.requested_by
	JOIN equipment_type ON equipment_type.equipment_type_id = inserted_requests.equipment_type_id
	GROUP BY person.person_id, person.first_name, person.middle_name, person.last_name, person.avatar_url
	`

	// Prepare arrays for PostgreSQL
	equipmentTypeIDs := make([]string, len(arg.Equipments))
	quantities := make([]int16, len(arg.Equipments))
	for i, item := range arg.Equipments {
		equipmentTypeIDs[i] = item.EquipmentTypeID
		quantities[i] = int16(item.Quantity)
	}

	row := r.querier.QueryRow(
		ctx,
		query,
		equipmentTypeIDs,
		quantities,
		arg.Location,
		arg.Purpose,
		arg.ExpectedReturnAt,
		arg.RequestedBy,
	)

	var res createBorrowResponse
	if err := row.Scan(
		&res.Borrower,
		&res.Equipments,
		&res.Location,
		&res.Purpose,
		&res.ExpectedReturnAt,
	); err != nil {
		return createBorrowResponse{}, err
	}

	return res, nil
}

type borrowRequestStatus string

const (
	pending   borrowRequestStatus = "pending"
	approved  borrowRequestStatus = "approved"
	rejected  borrowRequestStatus = "rejected"
	fulfilled borrowRequestStatus = "fulfilled"
)

type reviewBorrowRequest struct {
	BorrowRequestIDs []string            `json:"ids"`
	ReviewedBy       string              `json:"reviewedBy"`
	Remarks          *string             `json:"remarks"`
	Status           borrowRequestStatus `json:"status"`
}

type reviewedBorrowRequest struct {
	BorrowRequestID string              `json:"id"`
	Status          borrowRequestStatus `json:"status"`
}

type reviewBorrowResponse struct {
	ReviewedRequests []reviewedBorrowRequest `json:"reviewedRequests"`
	ReviewedBy       user.BasicInfo          `json:"reviewedBy"`
	Remarks          *string                 `json:"remarks"`
}

func (r *repository) reviewBorrowRequest(ctx context.Context, arg reviewBorrowRequest) (reviewBorrowResponse, error) {
	tx, err := r.querier.Begin(ctx)
	if err != nil {
		return reviewBorrowResponse{}, err
	}
	defer tx.Rollback(ctx)

	query := `
	WITH reviewed_request AS (
		UPDATE borrow_request
		SET status = $1, reviewed_by = $2, remarks = $3, reviewed_at = now()
		WHERE borrow_request_id = ANY($4::uuid[])
		RETURNING borrow_request_id, status, quantity, equipment_type_id
	)
	SELECT 
		jsonb_build_object(
			'id', person.person_id,
			'firstName', person.first_name,
			'middleName', person.middle_name,
			'lastName', person.last_name,
			'avatarUrl', person.avatar_url
		) AS reviewed_by,
		jsonb_agg(
			jsonb_build_object(
				'id', reviewed_request.borrow_request_id,
				'status', reviewed_request.status
			)
		) AS reviewed_requests,
		array_agg(reviewed_request.borrow_request_id) AS request_ids,
		array_agg(reviewed_request.quantity) AS quantities,
		array_agg(reviewed_request.equipment_type_id) AS equipment_type_ids
	FROM reviewed_request
	CROSS JOIN person
	WHERE person.person_id = $2
	GROUP BY person.person_id, person.first_name, person.middle_name, person.last_name, person.avatar_url
	`

	row := tx.QueryRow(
		ctx,
		query,
		arg.Status,
		arg.ReviewedBy,
		arg.Remarks,
		arg.BorrowRequestIDs,
	)

	var (
		res              reviewBorrowResponse
		requestIDs       []string
		quantities       []int16
		equipmentTypeIDs []string
	)

	if err := row.Scan(
		&res.ReviewedBy,
		&res.ReviewedRequests,
		&requestIDs,
		&quantities,
		&equipmentTypeIDs,
	); err != nil {
		return reviewBorrowResponse{}, err
	}

	res.Remarks = arg.Remarks

	if arg.Status == approved {
		equipmentQuery := `
		WITH equipment_with_status AS (
			SELECT DISTINCT
				equipment.equipment_id,
				equipment.equipment_type_id,
				CASE 
					WHEN EXISTS (
						SELECT 1 FROM borrow_transaction
						WHERE borrow_transaction.equipment_id = equipment.equipment_id
						AND NOT EXISTS (
							SELECT 1 FROM return_transaction
							WHERE return_transaction.borrow_transaction_id = borrow_transaction.borrow_transaction_id
						)
					) THEN 'borrowed'
					ELSE 'available'
				END AS status
			FROM equipment
			WHERE equipment.equipment_type_id = $1
		)
		SELECT equipment_id 
		FROM equipment_with_status
		WHERE status = $2
		ORDER BY equipment_id
		LIMIT $3
		`

		transactionQuery := `
		INSERT INTO borrow_transaction (borrow_request_id, equipment_id)
		VALUES ($1, $2)
		`

		for i, requestID := range requestIDs {
			equipmentTypeID := equipmentTypeIDs[i]
			quantity := int(quantities[i])

			equipmentRows, err := tx.Query(ctx, equipmentQuery, equipmentTypeID, available, quantity)
			if err != nil {
				return reviewBorrowResponse{}, err
			}

			var equipmentIDs []string
			for equipmentRows.Next() {
				var equipmentID string
				if err := equipmentRows.Scan(&equipmentID); err != nil {
					return reviewBorrowResponse{}, err
				}
				equipmentIDs = append(equipmentIDs, equipmentID)
			}

			if len(equipmentIDs) < quantity {
				return reviewBorrowResponse{}, fmt.Errorf("insufficient available equipment for request %s: requested %d, available %d", requestID, quantity, len(equipmentIDs))
			}

			for _, equipmentID := range equipmentIDs {
				if _, err := tx.Exec(ctx, transactionQuery, requestID, equipmentID); err != nil {
					return reviewBorrowResponse{}, err
				}
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return reviewBorrowResponse{}, err
	}

	return res, nil
}

type createReturnRequest struct {
	BorrowRequestID string `json:"borrowRequestId"`
	Quantity        uint   `json:"quantity"`
}

type createReturnResponse struct {
	ReturnRequestID string `json:"id"`
	BorrowRequestID string `json:"borrowRequestId"`
	Quantity        uint   `json:"quantity"`
}

var (
	errBorrowRequestNotApproved         = fmt.Errorf("borrow request is not approved")
	errExceedsRemainingBorrowedQuantity = fmt.Errorf("return quantity exceeds remaining borrowed quantity")
	errInvalidReturnQuantity            = fmt.Errorf("return quantity must be greater than zero")
)

func (r *repository) createReturnRequest(ctx context.Context, arg createReturnRequest) (createReturnResponse, error) {
	if arg.Quantity <= 0 {
		return createReturnResponse{}, errInvalidReturnQuantity
	}

	// Get the borrow request status and remaining borrowed quantity
	// We use `SUM()` since multiple return requests in the case of
	// partial returns is possible
	validationQuery := `
	SELECT 
		borrow_request.status,
		borrow_request.quantity - COALESCE(SUM(return_request.quantity), 0) as remaining_quantity
	FROM borrow_request
	LEFT JOIN return_request ON borrow_request.borrow_request_id = return_request.borrow_request_id
		AND EXISTS (SELECT 1 FROM return_transaction WHERE return_transaction.return_request_id = return_request.return_request_id)
	WHERE borrow_request.borrow_request_id = $1
	GROUP BY borrow_request.borrow_request_id, borrow_request.status, borrow_request.quantity
	`

	var (
		status            borrowRequestStatus
		remainingQuantity uint
	)
	if err := r.querier.QueryRow(ctx, validationQuery, arg.BorrowRequestID).Scan(&status, &remainingQuantity); err != nil {
		return createReturnResponse{}, err
	}

	if status != approved {
		return createReturnResponse{}, errBorrowRequestNotApproved
	}

	if arg.Quantity > remainingQuantity {
		return createReturnResponse{}, errExceedsRemainingBorrowedQuantity
	}

	query := `
	INSERT INTO return_request (borrow_request_id, quantity)
	VALUES ($1, $2)
	RETURNING return_request_id
	`

	var returnRequestID string

	row := r.querier.QueryRow(ctx, query, arg.BorrowRequestID, arg.Quantity)
	if err := row.Scan(&returnRequestID); err != nil {
		return createReturnResponse{}, err
	}

	res := createReturnResponse{
		ReturnRequestID: returnRequestID,
		BorrowRequestID: arg.BorrowRequestID,
		Quantity:        arg.Quantity,
	}

	return res, nil
}

type borrowRequest struct {
	CreatedAt        time.Time           `json:"createdAt"`
	Borrower         user.BasicInfo      `json:"borrower"`
	Equipments       []borrowedEquipment `json:"equipments"`
	Location         string              `json:"location"`
	Purpose          string              `json:"purpose"`
	ExpectedReturnAt time.Time           `json:"expectedReturnAt"`
}

func (r *repository) getBorrowRequests(ctx context.Context) ([]borrowRequest, error) {
	query := `
	SELECT 
		borrow_request.created_at,
		jsonb_build_object(
			'id', person.person_id,
			'firstName', person.first_name,
			'middleName', person.middle_name,
			'lastName', person.last_name,
			'avatarUrl', person.avatar_url
		) AS borrower,
		jsonb_agg(
			jsonb_build_object(
				'borrowRequestId', borrow_request.borrow_request_id,
				'id', equipment_type.equipment_type_id,
				'name', equipment_type.name,
				'brand', equipment_type.brand,
				'model', equipment_type.model,
				'imageUrl', equipment_type.image_url,
				'quantity', borrow_request.quantity
			)
		) AS equipments,
		borrow_request.location,
		borrow_request.purpose,
		borrow_request.expected_return_at
	FROM borrow_request
	JOIN person ON person.person_id = borrow_request.requested_by
	JOIN equipment_type ON equipment_type.equipment_type_id = borrow_request.equipment_type_id
	LEFT JOIN borrow_transaction ON borrow_transaction.borrow_request_id = borrow_request.borrow_request_id
	WHERE borrow_transaction.borrow_transaction_id IS NULL
	GROUP BY 
		borrow_request.created_at,
		person.person_id,
		person.first_name,
		person.middle_name,
		person.last_name,
		person.avatar_url,
		borrow_request.location,
		borrow_request.purpose,
		borrow_request.expected_return_at
	`

	rows, err := r.querier.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	borrowRequests, err := pgx.CollectRows(rows, pgx.RowToStructByName[borrowRequest])
	if err != nil {
		return nil, err
	}
	return borrowRequests, nil
}

type confirmReturnRequest struct {
	ReturnRequestID string `json:"returnRequestId"`
	ReviewedBy      string `json:"reviewedBy"`
}

var errReturnRequestAlreadyConfirmed = fmt.Errorf("return request is already confirmed")

func (r *repository) confirmReturnRequest(ctx context.Context, arg confirmReturnRequest) (confirmReturnRequest, error) {
	tx, err := r.querier.Begin(ctx)
	if err != nil {
		return confirmReturnRequest{}, err
	}
	defer tx.Rollback(ctx)

	checkQuery := `
	SELECT EXISTS(
		SELECT 1 FROM return_transaction 
		WHERE return_request_id = $1
	)
	`
	var exists bool
	if err := tx.QueryRow(ctx, checkQuery, arg.ReturnRequestID).Scan(&exists); err != nil {
		return confirmReturnRequest{}, err
	}

	if exists {
		return confirmReturnRequest{}, errReturnRequestAlreadyConfirmed
	}

	query := `
	UPDATE return_request
	SET reviewed_by = $1
	WHERE return_request_id = $2
	RETURNING borrow_request_id, quantity
	`

	row := tx.QueryRow(ctx, query, arg.ReviewedBy, arg.ReturnRequestID)

	var (
		borrowRequestID string
		returnQuantity  uint
	)
	if err := row.Scan(&borrowRequestID, &returnQuantity); err != nil {
		return confirmReturnRequest{}, err
	}

	quantityCheckQuery := `
	SELECT quantity FROM borrow_request WHERE borrow_request_id = $1
	`
	var totalBorrowedQuantity uint
	if err := tx.QueryRow(ctx, quantityCheckQuery, borrowRequestID).Scan(&totalBorrowedQuantity); err != nil {
		return confirmReturnRequest{}, err
	}

	// Validate remaining quantity to check how much is still outstanding
	// Use the same logic on `createReturnRequest`
	remainingQuery := `
	SELECT 
		borrow_request.quantity - COALESCE(SUM(return_request.quantity), 0) as remaining_quantity
	FROM borrow_request
	LEFT JOIN return_request ON borrow_request.borrow_request_id = return_request.borrow_request_id
		AND EXISTS (SELECT 1 FROM return_transaction WHERE return_transaction.return_request_id = return_request.return_request_id)
	WHERE borrow_request.borrow_request_id = $1
	GROUP BY borrow_request.quantity
	`

	var remainingQuantity uint
	if err := tx.QueryRow(ctx, remainingQuery, borrowRequestID).Scan(&remainingQuantity); err != nil {
		return confirmReturnRequest{}, err
	}

	if returnQuantity > remainingQuantity {
		return confirmReturnRequest{}, fmt.Errorf("return quantity (%d) exceeds remaining borrowed quantity (%d)", returnQuantity, remainingQuantity)
	}

	totalReturnedAfterThis := (totalBorrowedQuantity - remainingQuantity) + returnQuantity

	if totalReturnedAfterThis == totalBorrowedQuantity {
		query = `
		UPDATE borrow_request
		SET status = $1
		WHERE borrow_request_id = $2
		`
		if _, err := tx.Exec(ctx, query, fulfilled, borrowRequestID); err != nil {
			return confirmReturnRequest{}, err
		}
	}

	query = `
	INSERT INTO return_transaction (borrow_transaction_id, return_request_id)
	SELECT 
		borrow_transaction.borrow_transaction_id,
		$1
	FROM borrow_transaction
	JOIN borrow_request ON borrow_transaction.borrow_request_id = borrow_request.borrow_request_id
	WHERE borrow_request.borrow_request_id = $2
	AND borrow_transaction.borrow_transaction_id NOT IN (
		-- Exclude already returned items
		SELECT borrow_transaction_id FROM return_transaction
	)
	LIMIT $3
	`
	if _, err := tx.Exec(ctx, query, arg.ReturnRequestID, borrowRequestID, returnQuantity); err != nil {
		return confirmReturnRequest{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return confirmReturnRequest{}, err
	}

	return arg, nil
}

type returnRequest struct {
	ReturnRequestID  string         `json:"id"`
	CreatedAt        time.Time      `json:"createdAt"`
	Borrower         user.BasicInfo `json:"borrower"`
	Equipment        equipment      `json:"equipment"`
	ExpectedReturnAt time.Time      `json:"expectedReturnAt"`
}

func (r *repository) getReturnRequests(ctx context.Context) ([]returnRequest, error) {
	query := `
	SELECT 
		jsonb_build_object(
			'id', person.person_id,
			'firstName', person.first_name,
			'middleName', person.middle_name,
			'lastName', person.last_name,
			'avatarUrl', person.avatar_url
		) AS borrower,
		jsonb_build_object(
			'id', equipment_type.equipment_type_id,
			'name', equipment_type.name,
			'brand', equipment_type.brand,
			'model', equipment_type.model,
			'imageUrl', equipment_type.image_url,
			'quantity', return_request.quantity
		) AS equipment,
		return_request.return_request_id,
		borrow_request.expected_return_at,
		return_request.created_at
	FROM return_request
	JOIN borrow_request ON borrow_request.borrow_request_id = return_request.borrow_request_id
	JOIN person ON person.person_id = borrow_request.requested_by
	JOIN equipment_type ON equipment_type.equipment_type_id = borrow_request.equipment_type_id
	LEFT JOIN return_transaction 
		ON return_transaction.return_request_id = return_request.return_request_id
	WHERE return_transaction.return_transaction_id IS NULL
	`

	rows, err := r.querier.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	returnRequests, err := pgx.CollectRows(rows, pgx.RowToStructByName[returnRequest])
	if err != nil {
		return nil, err
	}
	return returnRequests, nil
}

type borrowTransaction struct {
	BorrowRequestID string         `json:"borrowRequestId"`
	BorrowedAt      time.Time      `json:"borrowedAt"`
	Borrower        user.BasicInfo `json:"borrower"`
	Equipment       equipment      `json:"equipment"`
	Location        string         `json:"location"`
	Purpose         string         `json:"purpose"`

	ExpectedReturnAt time.Time           `json:"expectedReturnAt"`
	ActualReturnAt   *time.Time          `json:"actualReturnAt"`
	Status           borrowRequestStatus `json:"status"`
	ReviewedBy       user.BasicInfo      `json:"reviewedBy"`
	Remarks          *string             `json:"remarks"`
}

type borrowHistoryParams struct {
	userID *string
}

func (r *repository) getBorrowHistory(ctx context.Context, params borrowHistoryParams) ([]borrowTransaction, error) {
	query := `
	SELECT 
		jsonb_build_object(
			'id', person.person_id,
			'firstName', person.first_name,
			'middleName', person.middle_name,
			'lastName', person.last_name,
			'avatarUrl', person.avatar_url
		) AS borrower,
		jsonb_build_object(
			'id', reviewed_person.person_id,
			'firstName', reviewed_person.first_name,
			'middleName', reviewed_person.middle_name,
			'lastName', reviewed_person.last_name,
			'avatarUrl', reviewed_person.avatar_url
		) AS reviewed_by,
		jsonb_build_object(
			'id', equipment_type.equipment_type_id,
			'name', equipment_type.name,
			'brand', equipment_type.brand,
			'model', equipment_type.model,
			'imageUrl', equipment_type.image_url,
			'quantity', borrow_request.quantity
		) AS equipment,
		borrow_request.borrow_request_id,
		borrow_request.created_at AS borrowed_at,
		borrow_request.location,
		borrow_request.purpose,
		borrow_request.expected_return_at,
		latest_return.created_at AS actual_return_at,
		borrow_request.status,
		borrow_request.remarks
	FROM borrow_request
	JOIN person ON person.person_id = borrow_request.requested_by
	JOIN person reviewed_person ON reviewed_person.person_id = borrow_request.reviewed_by
	JOIN equipment_type ON equipment_type.equipment_type_id = borrow_request.equipment_type_id
	LEFT JOIN LATERAL (
		SELECT created_at
		FROM return_request
		WHERE return_request.borrow_request_id = borrow_request.borrow_request_id
		ORDER BY created_at DESC
		LIMIT 1
	) latest_return ON true
	WHERE borrow_request.status IN ('approved', 'fulfilled')
	`

	var args []any
	if *params.userID != "" {
		query += " AND borrow_request.requested_by = $1"
		args = append(args, *params.userID)
	}

	query += " ORDER BY borrow_request.created_at DESC"

	rows, err := r.querier.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	history, err := pgx.CollectRows(rows, pgx.RowToStructByName[borrowTransaction])
	if err != nil {
		return nil, err
	}
	return history, nil
}
