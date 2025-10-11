package equipment

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/xGihyun/hirami/user"
)

type Repository interface {
	createEquipment(ctx context.Context, arg createRequest) (createResponse, error)
	getAll(ctx context.Context, params getEquipmentParams) ([]equipmentWithBorrower, error)
	getEquipmentNames(ctx context.Context) ([]string, error)
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

type createRequest struct {
	Name            string    `json:"name"`
	Brand           *string   `json:"brand"`
	Model           *string   `json:"model"`
	ImageURL        *string   `json:"imageUrl"`
	AcquisitionDate time.Time `json:"acquisitionDate"`
	Quantity        uint      `json:"quantity"`
}

type createResponse struct {
	EquipmentTypeID string    `json:"id"`
	Name            string    `json:"name"`
	Brand           *string   `json:"brand"`
	Model           *string   `json:"model"`
	ImageURL        *string   `json:"imageUrl"`
	AcquisitionDate time.Time `json:"acquisitionDate"`
	Quantity        uint      `json:"quantity"`
}

func (r *repository) createEquipment(ctx context.Context, arg createRequest) (createResponse, error) {
	query := `
	INSERT INTO equipment_type (name, brand, model, image_url)
	VALUES ($1, $2, $3, $4)
	ON CONFLICT (name, brand, COALESCE(model, ''))
	DO UPDATE SET 
		equipment_type_id = equipment_type.equipment_type_id,
		image_url = $4
	RETURNING equipment_type_id, name, brand, model, image_url
	`

	var equipment createResponse
	row := r.querier.QueryRow(ctx, query, arg.Name, arg.Brand, arg.Model, arg.ImageURL)
	if err := row.Scan(
		&equipment.EquipmentTypeID,
		&equipment.Name,
		&equipment.Brand,
		&equipment.Model,
		&equipment.ImageURL,
	); err != nil {
		return createResponse{}, err
	}
	equipment.Quantity = arg.Quantity
	equipment.AcquisitionDate = arg.AcquisitionDate

	query = `
	INSERT INTO equipment (equipment_type_id, acquired_at)
	SELECT $1, $2
	FROM generate_series(1, $3)
	`
	if _, err := r.querier.Exec(
		ctx,
		query,
		equipment.EquipmentTypeID,
		arg.AcquisitionDate,
		arg.Quantity,
	); err != nil {
		return createResponse{}, err
	}

	return equipment, nil
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

type getEquipmentParams struct {
	name   *string
	status *equipmentStatus
}

func (r *repository) getAll(ctx context.Context, params getEquipmentParams) ([]equipmentWithBorrower, error) {
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
	WHERE TRUE
	`

	var args []any
	if params.name != nil && *params.name != "" {
		names := strings.Split(*params.name, ",")
		query += " AND name IN (SELECT unnest($1::text[]))"
		args = append(args, names)
	}

	if params.status != nil && *params.status != "" {
		query += " AND status = $2"
		args = append(args, *params.status)
	}

	query += " GROUP BY equipment_type_id, name, brand, model, image_url, status, borrower ORDER BY status"

	rows, err := r.querier.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	equipments, err := pgx.CollectRows(rows, pgx.RowToStructByName[equipmentWithBorrower])
	if err != nil {
		return nil, err
	}
	return equipments, nil
}

func (r *repository) getEquipmentNames(ctx context.Context) ([]string, error) {
	query := `
	SELECT DISTINCT ON(equipment_type.name) equipment_type.name
	FROM equipment_type
	JOIN equipment ON equipment.equipment_type_id = equipment_type.equipment_type_id
	`
	rows, err := r.querier.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var equipments []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		equipments = append(equipments, name)
	}

	if err := rows.Err(); err != nil {
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
	BorrowRequestItemID string  `json:"borrowRequestItemId"`
	EquipmentTypeID     string  `json:"equipmentTypeId"`
	Name                string  `json:"name"`
	Brand               *string `json:"brand"`
	Model               *string `json:"model"`
	ImageURL            *string `json:"imageUrl"`
	Quantity            uint    `json:"quantity"`
}

type createBorrowResponse struct {
	BorrowRequestID  string              `json:"borrowRequestId"`
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
	WITH inserted_request AS (
		INSERT INTO borrow_request (location, purpose, expected_return_at, requested_by)
		VALUES ($1, $2, $3, $4)
		RETURNING borrow_request_id, location, purpose, expected_return_at, requested_by
	),
	inserted_items AS (
		INSERT INTO borrow_request_item 
			(borrow_request_id, equipment_type_id, quantity)
		SELECT 
			inserted_request.borrow_request_id,
			unnest($5::uuid[]),
			unnest($6::smallint[])
		FROM inserted_request
		RETURNING borrow_request_item_id, borrow_request_id, equipment_type_id, quantity
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
				'borrowRequestItemId', inserted_items.borrow_request_item_id,
				'equipmentTypeId', equipment_type.equipment_type_id,
				'name', equipment_type.name,
				'brand', equipment_type.brand,
				'model', equipment_type.model,
				'imageUrl', equipment_type.image_url,
				'quantity', inserted_items.quantity
			)
		) AS equipments,
		inserted_request.borrow_request_id,
		inserted_request.location,
		inserted_request.purpose,
		inserted_request.expected_return_at
	FROM inserted_request
	JOIN person ON person.person_id = inserted_request.requested_by
	JOIN inserted_items ON inserted_items.borrow_request_id = inserted_request.borrow_request_id
	JOIN equipment_type ON equipment_type.equipment_type_id = inserted_items.equipment_type_id
	GROUP BY 
		inserted_request.borrow_request_id,
		person.person_id,
		person.first_name,
		person.middle_name,
		person.last_name,
		person.avatar_url,
		inserted_request.location,
		inserted_request.purpose,
		inserted_request.expected_return_at
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
		arg.Location,
		arg.Purpose,
		arg.ExpectedReturnAt,
		arg.RequestedBy,
		equipmentTypeIDs,
		quantities,
	)
	var res createBorrowResponse
	if err := row.Scan(
		&res.Borrower,
		&res.Equipments,
		&res.BorrowRequestID,
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
	BorrowRequestID string              `json:"id"`
	ReviewedBy      string              `json:"reviewedBy"`
	Remarks         *string             `json:"remarks"`
	Status          borrowRequestStatus `json:"status"`
}

type reviewedBorrowRequest struct {
	BorrowRequestID string              `json:"id"`
	Status          borrowRequestStatus `json:"status"`
}

type reviewBorrowResponse struct {
	BorrowRequestID string              `json:"id"`
	Status          borrowRequestStatus `json:"status"`
	ReviewedBy      user.BasicInfo      `json:"reviewedBy"`
	Remarks         *string             `json:"remarks"`
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
		WHERE borrow_request_id = $4
		RETURNING borrow_request_id, status 
	)
	SELECT 
		reviewed_request.borrow_request_id,
		reviewed_request.status,
		jsonb_build_object(
			'id', person.person_id,
			'firstName', person.first_name,
			'middleName', person.middle_name,
			'lastName', person.last_name,
			'avatarUrl', person.avatar_url
		) AS reviewed_by
	FROM reviewed_request
	CROSS JOIN person
	WHERE person.person_id = $2
	`

	row := tx.QueryRow(
		ctx,
		query,
		arg.Status,
		arg.ReviewedBy,
		arg.Remarks,
		arg.BorrowRequestID,
	)

	var res reviewBorrowResponse

	if err := row.Scan(
		&res.BorrowRequestID,
		&res.Status,
		&res.ReviewedBy,
	); err != nil {
		return reviewBorrowResponse{}, err
	}

	res.Remarks = arg.Remarks

	if arg.Status == approved {
		// Get all items in this borrow request
		itemsQuery := `
		SELECT borrow_request_item_id, equipment_type_id, quantity
		FROM borrow_request_item
		WHERE borrow_request_id = $1
		`

		itemRows, err := tx.Query(ctx, itemsQuery, arg.BorrowRequestID)
		if err != nil {
			return reviewBorrowResponse{}, err
		}

		type requestItem struct {
			itemID          string
			equipmentTypeID string
			quantity        int16
		}

		var items []requestItem
		for itemRows.Next() {
			var item requestItem
			if err := itemRows.Scan(&item.itemID, &item.equipmentTypeID, &item.quantity); err != nil {
				return reviewBorrowResponse{}, err
			}
			items = append(items, item)
		}

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
		INSERT INTO borrow_transaction (borrow_request_item_id, equipment_id)
		VALUES ($1, $2)
		`

		for _, item := range items {
			quantity := int(item.quantity)

			equipmentRows, err := tx.Query(ctx, equipmentQuery, item.equipmentTypeID, available, quantity)
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
				return reviewBorrowResponse{}, fmt.Errorf("insufficient available equipment for request %s: requested %d, available %d", item.itemID, quantity, len(equipmentIDs))
			}

			for _, equipmentID := range equipmentIDs {
				if _, err := tx.Exec(ctx, transactionQuery, item.itemID, equipmentID); err != nil {
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

type returnEquipmentItem struct {
	BorrowRequestItemID string `json:"borrowRequestItemId"`
	Quantity            uint   `json:"quantity"`
}

type createReturnRequest struct {
	Items []returnEquipmentItem `json:"items"`
}

type returnedEquipmentItem struct {
	ReturnRequestItemID string `json:"returnRequestItemId"`
	BorrowRequestItemID string `json:"borrowRequestItemId"`
	BorrowRequestID     string `json:"borrowRequestId"`
	Quantity            uint   `json:"quantity"`
}

type createReturnResponse struct {
	ReturnRequests []returnRequestGroup `json:"returnRequests"`
}

type returnRequestGroup struct {
	ReturnRequestID string                  `json:"id"`
	BorrowRequestID string                  `json:"borrowRequestId"`
	Items           []returnedEquipmentItem `json:"items"`
}

var (
	errBorrowRequestNotApproved         = fmt.Errorf("borrow request is not approved")
	errExceedsRemainingBorrowedQuantity = fmt.Errorf("return quantity exceeds remaining borrowed quantity")
	errInvalidReturnQuantity            = fmt.Errorf("return quantity must be greater than zero")
	errEmptyReturnItemList              = fmt.Errorf("return items list cannot be empty")
	errBorrowRequestItemNotFound        = fmt.Errorf("borrow request item not found")
)

func (r *repository) createReturnRequest(ctx context.Context, arg createReturnRequest) (createReturnResponse, error) {
	if len(arg.Items) == 0 {
		return createReturnResponse{}, errEmptyReturnItemList
	}

	for _, item := range arg.Items {
		if item.Quantity <= 0 {
			return createReturnResponse{}, errInvalidReturnQuantity
		}
	}

	tx, err := r.querier.Begin(ctx)
	if err != nil {
		return createReturnResponse{}, err
	}
	defer tx.Rollback(ctx)

	borrowRequestItemIDs := make([]string, len(arg.Items))
	for i, item := range arg.Items {
		borrowRequestItemIDs[i] = item.BorrowRequestItemID
	}

	borrowRequestQuery := `
	SELECT DISTINCT borrow_request_id
	FROM borrow_request_item 
	WHERE borrow_request_item_id = ANY($1)
	`

	rows, err := tx.Query(ctx, borrowRequestQuery, borrowRequestItemIDs)
	if err != nil {
		return createReturnResponse{}, err
	}
	defer rows.Close()

	borrowRequestIDs := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return createReturnResponse{}, err
		}
		borrowRequestIDs = append(borrowRequestIDs, id)
	}
	if err = rows.Err(); err != nil {
		return createReturnResponse{}, err
	}

	statusQuery := `
	SELECT borrow_request_id, status
	FROM borrow_request
	WHERE borrow_request_id = ANY($1)
	`

	statusRows, err := tx.Query(ctx, statusQuery, borrowRequestIDs)
	if err != nil {
		return createReturnResponse{}, err
	}
	defer statusRows.Close()

	for statusRows.Next() {
		var id string
		var status borrowRequestStatus
		if err := statusRows.Scan(&id, &status); err != nil {
			return createReturnResponse{}, err
		}
		if status != approved {
			return createReturnResponse{}, errBorrowRequestNotApproved
		}
	}
	if err = statusRows.Err(); err != nil {
		return createReturnResponse{}, err
	}

	// Check that the total quantity being returned doesn't exceed what was borrowed
	returnedQuantityQuery := `
	SELECT 
		bri.borrow_request_item_id,
		bri.quantity as borrowed_quantity,
		COALESCE(SUM(rri.quantity), 0) as total_returned_quantity
	FROM borrow_request_item bri
	LEFT JOIN return_request_item rri ON rri.borrow_request_item_id = bri.borrow_request_item_id
	WHERE bri.borrow_request_item_id = ANY($1)
	GROUP BY bri.borrow_request_item_id, bri.quantity
	`

	returnedRows, err := tx.Query(ctx, returnedQuantityQuery, borrowRequestItemIDs)
	if err != nil {
		return createReturnResponse{}, err
	}
	defer returnedRows.Close()

	itemInfo := make(map[string]struct {
		borrowedQty uint
		returnedQty uint
	})
	for returnedRows.Next() {
		var itemID string
		var borrowedQty, returnedQty uint
		if err := returnedRows.Scan(&itemID, &borrowedQty, &returnedQty); err != nil {
			return createReturnResponse{}, err
		}
		itemInfo[itemID] = struct {
			borrowedQty uint
			returnedQty uint
		}{borrowedQty, returnedQty}
	}
	if err = returnedRows.Err(); err != nil {
		return createReturnResponse{}, err
	}

	for _, item := range arg.Items {
		info := itemInfo[item.BorrowRequestItemID]
		totalWillBeReturned := info.returnedQty + item.Quantity
		if totalWillBeReturned > info.borrowedQty {
			return createReturnResponse{}, errExceedsRemainingBorrowedQuantity
		}
	}

	// Validate each item's remaining quantity based on actual borrow_transaction records
	validationQuery := `
	SELECT 
		COUNT(borrow_transaction.borrow_transaction_id) - COALESCE(
			(
				SELECT COUNT(return_transaction.return_transaction_id)
				FROM return_transaction
				JOIN return_request_item ON return_request_item.return_request_item_id = return_transaction.return_request_item_id
				WHERE return_request_item.borrow_request_item_id = $1
			), 0
		) as remaining_quantity
	FROM borrow_transaction
	WHERE borrow_transaction.borrow_request_item_id = $1
	`

	for _, item := range arg.Items {
		var remainingQuantity uint
		if err := tx.QueryRow(ctx, validationQuery, item.BorrowRequestItemID).Scan(&remainingQuantity); err != nil {
			return createReturnResponse{}, err
		}

		if remainingQuantity == 0 {
			return createReturnResponse{}, errBorrowRequestItemNotFound
		}

		if item.Quantity > remainingQuantity {
			return createReturnResponse{}, errExceedsRemainingBorrowedQuantity
		}
	}

	itemsByBorrowRequest := make(map[string][]returnEquipmentItem)
	for _, item := range arg.Items {
		var borrowRequestID string
		if err := tx.QueryRow(
			ctx,
			"SELECT borrow_request_id FROM borrow_request_item WHERE borrow_request_item_id = $1",
			item.BorrowRequestItemID,
		).Scan(&borrowRequestID); err != nil {
			return createReturnResponse{}, err
		}
		itemsByBorrowRequest[borrowRequestID] = append(itemsByBorrowRequest[borrowRequestID], item)
	}

	returnRequestGroups := make([]returnRequestGroup, 0, len(itemsByBorrowRequest))

	insertRequestQuery := `
	INSERT INTO return_request (borrow_request_id)
	VALUES ($1)
	RETURNING return_request_id
	`

	insertItemQuery := `
	WITH inserted_items AS (
		INSERT INTO return_request_item (return_request_id, borrow_request_item_id, quantity)
		SELECT 
			$1,
			unnest($2::uuid[]),
			unnest($3::integer[])
		RETURNING return_request_item_id, borrow_request_item_id, quantity
	)
	SELECT 
		jsonb_agg(
			jsonb_build_object(
				'returnRequestItemId', inserted_items.return_request_item_id,
				'borrowRequestItemId', inserted_items.borrow_request_item_id,
				'quantity', inserted_items.quantity
			)
		) AS items
	FROM inserted_items
	`

	for borrowRequestID, items := range itemsByBorrowRequest {
		var returnRequestID string
		if err := tx.QueryRow(ctx, insertRequestQuery, borrowRequestID).Scan(&returnRequestID); err != nil {
			return createReturnResponse{}, err
		}

		borrowRequestItemIDsArray := make([]string, len(items))
		quantities := make([]int, len(items))
		for i, item := range items {
			borrowRequestItemIDsArray[i] = item.BorrowRequestItemID
			quantities[i] = int(item.Quantity)
		}

		var itemsJSON []returnedEquipmentItem
		if err := tx.QueryRow(ctx, insertItemQuery, returnRequestID, borrowRequestItemIDsArray, quantities).Scan(&itemsJSON); err != nil {
			return createReturnResponse{}, err
		}

		for i := range itemsJSON {
			itemsJSON[i].BorrowRequestID = borrowRequestID
		}

		returnRequestGroups = append(returnRequestGroups, returnRequestGroup{
			ReturnRequestID: returnRequestID,
			BorrowRequestID: borrowRequestID,
			Items:           itemsJSON,
		})
	}

	if err := tx.Commit(ctx); err != nil {
		return createReturnResponse{}, err
	}

	res := createReturnResponse{
		ReturnRequests: returnRequestGroups,
	}

	return res, nil
}

type borrowRequest struct {
	BorrowRequestID  string              `json:"id"`
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
		borrow_request.borrow_request_id,
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
				'borrowRequestItemId', borrow_request_item.borrow_request_item_id,
				'equipmentTypeId', equipment_type.equipment_type_id,
				'name', equipment_type.name,
				'brand', equipment_type.brand,
				'model', equipment_type.model,
				'imageUrl', equipment_type.image_url,
				'quantity', borrow_request_item.quantity
			)
		) AS equipments,
		borrow_request.location,
		borrow_request.purpose,
		borrow_request.expected_return_at
	FROM borrow_request
	JOIN person ON person.person_id = borrow_request.requested_by
	JOIN borrow_request_item ON borrow_request_item.borrow_request_id = borrow_request.borrow_request_id
	JOIN equipment_type ON equipment_type.equipment_type_id = borrow_request_item.equipment_type_id
	WHERE NOT EXISTS (
		SELECT 1 FROM borrow_transaction
		WHERE borrow_transaction.borrow_request_item_id = borrow_request_item.borrow_request_item_id
	)
	GROUP BY 
		borrow_request.borrow_request_id,
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

	// Check if any return_transaction already exists for this return_request's items
	checkQuery := `
	SELECT EXISTS(
		SELECT 1 FROM return_transaction
		JOIN return_request_item ON return_transaction.return_request_item_id = return_request_item.return_request_item_id
		WHERE return_request_item.return_request_id = $1
	)
	`
	var exists bool
	if err := tx.QueryRow(ctx, checkQuery, arg.ReturnRequestID).Scan(&exists); err != nil {
		return confirmReturnRequest{}, err
	}
	if exists {
		return confirmReturnRequest{}, errReturnRequestAlreadyConfirmed
	}

	updateQuery := `
	UPDATE return_request
	SET reviewed_by = $1
	WHERE return_request_id = $2
	RETURNING borrow_request_id
	`
	var borrowRequestID string
	if err := tx.QueryRow(ctx, updateQuery, arg.ReviewedBy, arg.ReturnRequestID).Scan(&borrowRequestID); err != nil {
		return confirmReturnRequest{}, err
	}

	itemsQuery := `
	SELECT 
		return_request_item.return_request_item_id,
		return_request_item.borrow_request_item_id,
		return_request_item.quantity
	FROM return_request_item
	WHERE return_request_item.return_request_id = $1
	`
	itemRows, err := tx.Query(ctx, itemsQuery, arg.ReturnRequestID)
	if err != nil {
		return confirmReturnRequest{}, err
	}

	type returnItem struct {
		returnRequestItemID string
		borrowRequestItemID string
		quantity            int
	}

	var items []returnItem
	for itemRows.Next() {
		var item returnItem
		if err := itemRows.Scan(&item.returnRequestItemID, &item.borrowRequestItemID, &item.quantity); err != nil {
			return confirmReturnRequest{}, err
		}
		items = append(items, item)
	}

	// For each item, validate and create return_transactions
	for _, item := range items {
		remainingQuery := `
		SELECT 
			COUNT(borrow_transaction.borrow_transaction_id) - COALESCE(
				(
					SELECT COUNT(return_transaction.return_transaction_id)
					FROM return_transaction
					JOIN return_request_item ON return_request_item.return_request_item_id = return_transaction.return_request_item_id
					WHERE return_request_item.borrow_request_item_id = $1
				), 0
			) as remaining_quantity
		FROM borrow_transaction
		WHERE borrow_transaction.borrow_request_item_id = $1
		`
		var remainingQuantity int
		if err := tx.QueryRow(ctx, remainingQuery, item.borrowRequestItemID).Scan(&remainingQuantity); err != nil {
			return confirmReturnRequest{}, err
		}

		if item.quantity > remainingQuantity {
			return confirmReturnRequest{}, fmt.Errorf("return quantity (%d) exceeds remaining borrowed quantity (%d) for item %s",
				item.quantity, remainingQuantity, item.borrowRequestItemID)
		}

		transactionQuery := `
		INSERT INTO return_transaction (borrow_transaction_id, return_request_item_id)
		SELECT 
			borrow_transaction.borrow_transaction_id,
			$1
		FROM borrow_transaction
		WHERE borrow_transaction.borrow_request_item_id = $2
		AND borrow_transaction.borrow_transaction_id NOT IN (
			-- Exclude already returned items
			SELECT borrow_transaction_id FROM return_transaction
		)
		LIMIT $3
		`
		if _, err := tx.Exec(ctx, transactionQuery, item.returnRequestItemID, item.borrowRequestItemID, item.quantity); err != nil {
			return confirmReturnRequest{}, err
		}
	}

	// Check if all items in the borrow_request are fully returned
	allReturnedQuery := `
	SELECT 
		COUNT(borrow_transaction.borrow_transaction_id) = COALESCE(
			(
				SELECT COUNT(return_transaction.return_transaction_id)
				FROM return_transaction
				JOIN return_request_item ON return_request_item.return_request_item_id = return_transaction.return_request_item_id
				JOIN borrow_request_item ON borrow_request_item.borrow_request_item_id = return_request_item.borrow_request_item_id
				WHERE borrow_request_item.borrow_request_id = $1
			), 0
		) AS is_all_returned
	FROM borrow_transaction
	JOIN borrow_request_item ON borrow_request_item.borrow_request_item_id = borrow_transaction.borrow_request_item_id
	WHERE borrow_request_item.borrow_request_id = $1
	`
	var isAllReturned bool
	if err := tx.QueryRow(ctx, allReturnedQuery, borrowRequestID).Scan(&isAllReturned); err != nil {
		return confirmReturnRequest{}, err
	}

	if isAllReturned {
		updateStatusQuery := `
		UPDATE borrow_request
		SET status = $1
		WHERE borrow_request_id = $2
		`
		if _, err := tx.Exec(ctx, updateStatusQuery, fulfilled, borrowRequestID); err != nil {
			return confirmReturnRequest{}, err
		}
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
	Equipments       []equipment    `json:"equipments"`
	ExpectedReturnAt time.Time      `json:"expectedReturnAt"`
}

func (r *repository) getReturnRequests(ctx context.Context) ([]returnRequest, error) {
	query := `
	SELECT 
		return_request.return_request_id,
		return_request.created_at,
		jsonb_build_object(
			'id', person.person_id,
			'firstName', person.first_name,
			'middleName', person.middle_name,
			'lastName', person.last_name,
			'avatarUrl', person.avatar_url
		) AS borrower,
		jsonb_agg(
			jsonb_build_object(
				'returnRequestItemId', return_request_item.return_request_item_id,
				'id', equipment_type.equipment_type_id,
				'name', equipment_type.name,
				'brand', equipment_type.brand,
				'model', equipment_type.model,
				'imageUrl', equipment_type.image_url,
				'quantity', return_request_item.quantity
			)
		) AS equipments,
		borrow_request.expected_return_at
	FROM return_request
	JOIN borrow_request ON borrow_request.borrow_request_id = return_request.borrow_request_id
	JOIN person ON person.person_id = borrow_request.requested_by
	JOIN return_request_item ON return_request_item.return_request_id = return_request.return_request_id
	JOIN borrow_request_item ON borrow_request_item.borrow_request_item_id = return_request_item.borrow_request_item_id
	JOIN equipment_type ON equipment_type.equipment_type_id = borrow_request_item.equipment_type_id
	WHERE NOT EXISTS (
		SELECT 1 
		FROM return_transaction
		WHERE return_transaction.return_request_item_id = return_request_item.return_request_item_id
	)
	GROUP BY 
		return_request.return_request_id,
		return_request.created_at,
		person.person_id,
		person.first_name,
		person.middle_name,
		person.last_name,
		person.avatar_url,
		borrow_request.expected_return_at
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
	BorrowRequestID string              `json:"borrowRequestId"`
	BorrowedAt      time.Time           `json:"borrowedAt"`
	Borrower        user.BasicInfo      `json:"borrower"`
	Equipments      []borrowedEquipment `json:"equipments"`
	Location        string              `json:"location"`
	Purpose         string              `json:"purpose"`

	ExpectedReturnAt  time.Time           `json:"expectedReturnAt"`
	ActualReturnAt    *time.Time          `json:"actualReturnAt"`
	Status            borrowRequestStatus `json:"status"`
	BorrowReviewedBy  user.BasicInfo      `json:"borrowReviewedBy"`
	ReturnConfirmedBy *user.BasicInfo     `json:"returnConfirmedBy"`
	Remarks           *string             `json:"remarks"`
}

type borrowHistoryParams struct {
	userID *string
}

func (r *repository) getBorrowHistory(ctx context.Context, params borrowHistoryParams) ([]borrowTransaction, error) {
	query := `
	WITH latest_return_data AS (
		SELECT 
			borrow_request_id,
			return_request_id,
			created_at,
			reviewed_by
		FROM return_request
		WHERE (borrow_request_id, created_at) IN (
			SELECT borrow_request_id, MAX(created_at)
			FROM return_request
			GROUP BY borrow_request_id
		)
	)
	SELECT 
		jsonb_build_object(
			'id', person.person_id,
			'firstName', person.first_name,
			'middleName', person.middle_name,
			'lastName', person.last_name,
			'avatarUrl', person.avatar_url
		) AS borrower,
		jsonb_build_object(
			'id', person_borrow_reviewer.person_id,
			'firstName', person_borrow_reviewer.first_name,
			'middleName', person_borrow_reviewer.middle_name,
			'lastName', person_borrow_reviewer.last_name,
			'avatarUrl', person_borrow_reviewer.avatar_url
		) AS borrow_reviewed_by,
		CASE
		  WHEN person_return_reviewer.person_id IS NULL THEN NULL
		  ELSE jsonb_build_object(
			'id', person_return_reviewer.person_id,
			'firstName', person_return_reviewer.first_name,
			'middleName', person_return_reviewer.middle_name,
			'lastName', person_return_reviewer.last_name,
			'avatarUrl', person_return_reviewer.avatar_url
		  )
		END AS return_confirmed_by,
		jsonb_agg(
			jsonb_build_object(
				'equipmentTypeId', equipment_type.equipment_type_id,
				'borrowRequestItemId', borrow_request_item.borrow_request_item_id,
				'name', equipment_type.name,
				'brand', equipment_type.brand,
				'model', equipment_type.model,
				'imageUrl', equipment_type.image_url,
				'quantity', borrow_request_item.quantity
			)
		) AS equipments,
		borrow_request.borrow_request_id,
		borrow_request.created_at AS borrowed_at,
		borrow_request.location,
		borrow_request.purpose,
		borrow_request.expected_return_at,
		latest_return_data.created_at AS actual_return_at,
		borrow_request.status,
		borrow_request.remarks
	FROM borrow_request
	LEFT JOIN latest_return_data ON latest_return_data.borrow_request_id = borrow_request.borrow_request_id
	JOIN person ON person.person_id = borrow_request.requested_by
	JOIN person person_borrow_reviewer ON person_borrow_reviewer.person_id = borrow_request.reviewed_by
	LEFT JOIN person person_return_reviewer ON person_return_reviewer.person_id = latest_return_data.reviewed_by
	JOIN borrow_request_item ON borrow_request_item.borrow_request_id = borrow_request.borrow_request_id
	JOIN equipment_type ON equipment_type.equipment_type_id = borrow_request_item.equipment_type_id
	WHERE borrow_request.status IN ('approved', 'fulfilled')
	GROUP BY 
		person.person_id,
		person.first_name,
		person.middle_name,
		person.last_name,
		person.avatar_url,
		person_borrow_reviewer.person_id,
		person_borrow_reviewer.first_name,
		person_borrow_reviewer.middle_name,
		person_borrow_reviewer.last_name,
		person_borrow_reviewer.avatar_url,
		person_return_reviewer.person_id,
		person_return_reviewer.first_name,
		person_return_reviewer.middle_name,
		person_return_reviewer.last_name,
		person_return_reviewer.avatar_url,
		borrow_request.borrow_request_id,
		latest_return_data.created_at,
		latest_return_data.reviewed_by
	`

	var args []any
	argIndex := 1

	if params.userID != nil && *params.userID != "" {
		query += fmt.Sprintf(" AND borrow_request.requested_by = $%d", argIndex)
		args = append(args, *params.userID)
		argIndex++
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
