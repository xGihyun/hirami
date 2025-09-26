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

func (r *repository) createEquipment(ctx context.Context, arg createEquipmentRequest) error {
	query := `
	INSERT INTO equipment_type (name, brand, model)
	VALUES ($1, $2, $3)
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
	Name        string    `json:"name"`
	Brand       *string   `json:"brand"`
	Model       *string   `json:"model"`
	AcquiredAt  time.Time `json:"acquiredAt"`
	Quantity    uint      `json:"quantity"`
	Status      status    `json:"status"`
}

func (r *repository) getAll(ctx context.Context) ([]equipment, error) {
	query := `
	SELECT 
		equipment_type.name,
		equipment_type.brand,
		equipment_type.model,
		equipment.status,
		equipment.acquired_at,
		COUNT(equipment.equipment_id) AS quantity
	FROM equipment_type
	JOIN equipment ON equipment.equipment_type_id = equipment_type.equipment_type_id
	GROUP BY 
		equipment.status, 
		equipment.acquired_at, 
		equipment_type.name, 
		equipment_type.brand,
		equipment_type.model,
		equipment.equipment_type_id
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
