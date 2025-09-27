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
	getAll(ctx context.Context) ([]equipment, error)
	update(ctx context.Context, arg updateRequest) error

	createBorrowRequest(ctx context.Context, arg createBorrowRequest) (createBorrowResponse, error)
	reviewBorrowRequest(ctx context.Context, arg reviewBorrowRequest) (reviewBorrowResponse, error)
	createReturnRequest(ctx context.Context, arg createReturnRequest) (createReturnRequest, error)
	getBorrowRequests(ctx context.Context) ([]borrowRequest, error)
	confirmReturnRequest(ctx context.Context, arg confirmReturnRequest) (confirmReturnRequest, error)
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
	AcquisitionDate time.Time `json:"acquisitionDate"`
	Quantity        uint      `json:"quantity"`
}

func (r *repository) createEquipment(ctx context.Context, arg createRequest) error {
	query := `
	INSERT INTO equipment_type (name, brand, model)
	VALUES ($1, $2, $3)
	ON CONFLICT (name, brand, COALESCE(model, ''))
	DO UPDATE SET equipment_type_id = equipment_type.equipment_type_id
	RETURNING equipment_type_id
	`

	var equipmentTypeID string
	row := r.querier.QueryRow(ctx, query, arg.Name, arg.Brand, arg.Model)
	if err := row.Scan(&equipmentTypeID); err != nil {
		return err
	}

	query = `
	INSERT INTO equipment (equipment_type_id, status, acquired_at)
	SELECT $1, $2, $3
	FROM generate_series(1, $4)
	`
	if _, err := r.querier.Exec(
		ctx,
		query,
		equipmentTypeID,
		available,
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
	Quantity        uint            `json:"quantity"`
	Status          equipmentStatus `json:"status,omitzero"`
}

func (r *repository) getAll(ctx context.Context) ([]equipment, error) {
	query := `
	WITH equipment_with_status AS (
		SELECT 
			equipment_type.equipment_type_id,
			equipment_type.name,
			equipment_type.brand,
			equipment_type.model,
			equipment.equipment_id,
			CASE 
				WHEN borrow_transaction.borrow_transaction_id IS NOT NULL 
					AND return_transaction.return_transaction_id IS NULL THEN 'borrowed'
				ELSE 'available'
			END AS status
		FROM equipment_type
		JOIN equipment ON equipment.equipment_type_id = equipment_type.equipment_type_id
		LEFT JOIN borrow_transaction ON equipment.equipment_id = borrow_transaction.equipment_id
		LEFT JOIN return_transaction 
			ON return_transaction.borrow_transaction_id = borrow_transaction.borrow_transaction_id
	)
	SELECT
		equipment_type_id,
		name,
		brand,
		model,
		status,
		COUNT(equipment_id) AS quantity
	FROM equipment_with_status
	GROUP BY 
		equipment_type_id,
		name, 
		brand,
		model,
		status
	`
	rows, err := r.querier.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	equipments, err := pgx.CollectRows(rows, pgx.RowToStructByName[equipment])
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
}

func (r *repository) update(ctx context.Context, arg updateRequest) error {
	query := `
	UPDATE equipment_type
	SET name = $1,
		brand = $2,
		model = $3
	WHERE equipment_type_id = $4
	`

	if _, err := r.querier.Exec(
		ctx,
		query,
		arg.Name,
		arg.Brand,
		arg.Model,
		arg.EquipmentTypeID,
	); err != nil {
		return err
	}

	return nil
}

type createBorrowRequest struct {
	EquipmentTypeID  string    `json:"equipmentTypeId"`
	Quantity         uint      `json:"quantity"`
	Location         string    `json:"location"`
	Purpose          string    `json:"purpose"`
	ExpectedReturnAt time.Time `json:"expectedReturnAt"`
	RequestedBy      string    `json:"requestedBy"`
}

type createBorrowResponse struct {
	BorrowRequestID  string         `json:"id"`
	Borrower         user.BasicInfo `json:"borrower"`
	Equipment        equipment      `json:"equipment"`
	Location         string         `json:"location"`
	Purpose          string         `json:"purpose"`
	ExpectedReturnAt time.Time      `json:"expectedReturnAt"`
}

func (r *repository) createBorrowRequest(ctx context.Context, arg createBorrowRequest) (createBorrowResponse, error) {
	query := `
	WITH inserted_request AS (
		INSERT INTO borrow_request 
			(equipment_type_id, quantity, location, purpose, expected_return_at, requested_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING *
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
			'id', equipment_type.equipment_type_id,
			'name', equipment_type.name,
			'brand', equipment_type.brand,
			'model', equipment_type.model,
			'quantity', inserted_request.quantity
		) AS equipment,
		inserted_request.borrow_request_id,
		inserted_request.location,
		inserted_request.purpose,
		inserted_request.expected_return_at
	FROM inserted_request
	JOIN person ON person.person_id = inserted_request.requested_by
	JOIN equipment_type ON equipment_type.equipment_type_id = inserted_request.equipment_type_id
	`

	row := r.querier.QueryRow(
		ctx,
		query,
		arg.EquipmentTypeID,
		arg.Quantity,
		arg.Location,
		arg.Purpose,
		arg.ExpectedReturnAt,
		arg.RequestedBy,
	)

	var res createBorrowResponse
	if err := row.Scan(
		&res.Borrower,
		&res.Equipment,
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

type reviewBorrowResponse struct {
	BorrowRequestID string              `json:"id"`
	ReviewedBy      user.BasicInfo      `json:"reviewedBy"`
	Remarks         *string             `json:"remarks"`
	Status          borrowRequestStatus `json:"status"`
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
		RETURNING *
	)
	SELECT 
		jsonb_build_object(
			'id', person.person_id,
			'firstName', person.first_name,
			'middleName', person.middle_name,
			'lastName', person.last_name,
			'avatarUrl', person.avatar_url
		) AS reviewedBy,
		reviewed_request.borrow_request_id,
		reviewed_request.remarks,
		reviewed_request.status,
		reviewed_request.quantity,
		reviewed_request.equipment_type_id
	FROM reviewed_request
	JOIN person ON person.person_id = reviewed_request.reviewed_by
	`

	row := tx.QueryRow(
		ctx,
		query,
		arg.Status,
		arg.ReviewedBy,
		arg.Remarks,
		arg.BorrowRequestID,
	)

	var (
		res             reviewBorrowResponse
		quantity        int
		equipmentTypeID string
	)

	if err := row.Scan(
		&res.ReviewedBy,
		&res.BorrowRequestID,
		&res.Remarks,
		&res.Status,
		&quantity,
		&equipmentTypeID,
	); err != nil {
		return reviewBorrowResponse{}, err
	}

	if arg.Status == approved {
		equipmentQuery := `
		WITH equipment_with_status AS (
			SELECT 
				equipment_type.equipment_type_id,
				equipment_type.name,
				equipment_type.brand,
				equipment_type.model,
				equipment.equipment_id,
				CASE 
					WHEN borrow_transaction.borrow_transaction_id IS NOT NULL 
						AND return_transaction.return_transaction_id IS NULL THEN 'borrowed'
					ELSE 'available'
				END AS status
			FROM equipment_type
			JOIN equipment ON equipment.equipment_type_id = equipment_type.equipment_type_id
			LEFT JOIN borrow_transaction ON equipment.equipment_id = borrow_transaction.equipment_id
			LEFT JOIN return_transaction 
				ON return_transaction.borrow_transaction_id = borrow_transaction.borrow_transaction_id
		)
		SELECT equipment_id 
		FROM equipment_with_status
		WHERE equipment_type_id = $1 AND status = $2
		LIMIT $3
		`

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
			return reviewBorrowResponse{}, fmt.Errorf("insufficient available equipment: requested %d, available %d", quantity, len(equipmentIDs))
		}

		transactionQuery := `
		INSERT INTO borrow_transaction (borrow_request_id, equipment_id)
		VALUES ($1, $2)
		`

		for _, equipmentID := range equipmentIDs {
			if _, err := tx.Exec(ctx, transactionQuery, arg.BorrowRequestID, equipmentID); err != nil {
				return reviewBorrowResponse{}, err
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

func (r *repository) createReturnRequest(ctx context.Context, arg createReturnRequest) (createReturnRequest, error) {
	query := `
	INSERT INTO return_request (borrow_request_id, quantity)
	VALUES ($1, $2)
	`

	if _, err := r.querier.Exec(ctx, query, arg.BorrowRequestID, arg.Quantity); err != nil {
		return createReturnRequest{}, err
	}

	return arg, nil
}

type borrowRequest struct {
	BorrowRequestID  string         `json:"id"`
	CreatedAt        time.Time      `json:"createdAt"`
	Borrower         user.BasicInfo `json:"borrower"`
	Equipment        equipment      `json:"equipment"`
	Location         string         `json:"location"`
	Purpose          string         `json:"purpose"`
	ExpectedReturnAt time.Time      `json:"expectedReturnAt"`
}

func (r *repository) getBorrowRequests(ctx context.Context) ([]borrowRequest, error) {
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
			'quantity', borrow_request.quantity
		) AS equipment,
		borrow_request.borrow_request_id,
		borrow_request.location,
		borrow_request.purpose,
		borrow_request.expected_return_at,
		borrow_request.created_at
	FROM borrow_request
	JOIN person ON person.person_id = borrow_request.requested_by
	JOIN equipment_type ON equipment_type.equipment_type_id = borrow_request.equipment_type_id
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
	RETURNING borrow_request_id
	`

	row := tx.QueryRow(ctx, query, arg.ReviewedBy, arg.ReturnRequestID)

	var borrowRequestID string
	if err := row.Scan(&borrowRequestID); err != nil {
		return confirmReturnRequest{}, err
	}

	query = `
	UPDATE borrow_request
	SET status = $1
	WHERE borrow_request_id = $2
	`
	if _, err := tx.Exec(ctx, query, fulfilled, borrowRequestID); err != nil {
		return confirmReturnRequest{}, err
	}

	query = `
	INSERT INTO return_transaction (borrow_transaction_id, return_request_id)
	SELECT 
		borrow_transaction.borrow_transaction_id,
		$1
	FROM borrow_transaction
	JOIN borrow_request ON borrow_transaction.borrow_request_id = borrow_request.borrow_request_id
	WHERE borrow_request.borrow_request_id = $2
	`
	if _, err := tx.Exec(ctx, query, arg.ReturnRequestID, borrowRequestID); err != nil {
		return confirmReturnRequest{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return confirmReturnRequest{}, err
	}

	return arg, nil
}
