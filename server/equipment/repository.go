package equipment

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	createEquipment(ctx context.Context, arg createRequest) error
	getAll(ctx context.Context) ([]equipment, error)
	update(ctx context.Context, arg updateRequest) error
	createBorrowRequest(ctx context.Context, arg createBorrowRequest) (createBorrowResponse, error)
}

type repository struct {
	querier *pgxpool.Pool
}

func NewRepository(querier *pgxpool.Pool) Repository {
	return &repository{
		querier: querier,
	}
}

type status string

const (
	available status = "available"
	borrowed  status = "borrowed"
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
	EquipmentTypeID string  `json:"id"`
	Name            string  `json:"name"`
	Brand           *string `json:"brand"`
	Model           *string `json:"model"`
	Quantity        uint    `json:"quantity"`
	Status          status  `json:"status,omitzero"`
}

func (r *repository) getAll(ctx context.Context) ([]equipment, error) {
	query := `
	SELECT 
		equipment_type.equipment_type_id,
		equipment_type.name,
		equipment_type.brand,
		equipment_type.model,
		equipment.status,
		COUNT(equipment.equipment_id) AS quantity
	FROM equipment_type
	JOIN equipment ON equipment.equipment_type_id = equipment_type.equipment_type_id
	GROUP BY 
		equipment.status, 
		equipment_type.name, 
		equipment_type.brand,
		equipment_type.model,
		equipment_type.equipment_type_id
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
