package equipment

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	createEquipment(ctx context.Context, arg createEquipmentRequest) error
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

type createEquipmentRequest struct {
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
