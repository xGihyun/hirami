package equipment

import (
	"context"
	"fmt"
	"log/slog"
	"math/rand"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

const charset = "0123456789"

func generateRandomOTP(length int) string {
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

func (s *Server) StartExpirationWorker(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for range ticker.C {
			if err := s.repository.processExpiredBorrowRequests(ctx); err != nil {
				slog.Error("Error processing expired borrow requests: " + err.Error())
			}

			if err := s.repository.renewExpiredReturnRequests(ctx); err != nil {
				slog.Error("Error renewing expired return requests: " + err.Error())
			}
		}
	}()
	slog.Info("Started expiration worker.")
}

// OTP for Borrow Requests

func (r *repository) createBorrowRequestWithOTP(ctx context.Context, borrowRequestID string) error {
	maxRetries := 5

	query := `
	INSERT INTO borrow_request_otp (borrow_request_id, code, expires_at)
	VALUES ($1, $2, $3)
	`

	for range maxRetries {
		otp := generateRandomOTP(6)

		_, err := r.querier.Exec(
			ctx,
			query,
			borrowRequestID,
			otp,
			time.Now().Add(30*time.Minute),
		)
		if err != nil {
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
				slog.Debug("Borrow OTP collision detected, retrying generation.")
				continue
			}
			return err
		}

		return nil
	}

	return fmt.Errorf("failed to generate unique OTP after retries")
}

func (r *repository) processExpiredBorrowRequests(ctx context.Context) error {
	tx, err := r.querier.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// We sum up the quantity for each equipment type belonging to all currently expired requests.
	itemsToReleaseQuery := `
    SELECT bri.equipment_type_id, SUM(bri.quantity)
    FROM borrow_request_item bri
    JOIN borrow_request br ON bri.borrow_request_id = br.borrow_request_id
    JOIN borrow_request_otp otp ON br.borrow_request_id = otp.borrow_request_id
    WHERE br.borrow_request_status_id = $1 AND otp.expires_at < NOW()
    GROUP BY bri.equipment_type_id
    `

	rows, err := tx.Query(ctx, itemsToReleaseQuery, approved)
	if err != nil {
		return err
	}
	defer rows.Close()

	type releaseItem struct {
		equipmentTypeID string
		quantity        int
	}

	var items []releaseItem
	for rows.Next() {
		var item releaseItem
		if err := rows.Scan(&item.equipmentTypeID, &item.quantity); err != nil {
			return err
		}
		items = append(items, item)
	}
	rows.Close()

	releaseEquipmentQuery := `
    UPDATE equipment
    SET equipment_status_id = $1
    WHERE equipment_id IN (
        SELECT equipment_id
        FROM equipment
        WHERE equipment_type_id = $2 AND equipment_status_id = $3
        ORDER BY equipment_id
        LIMIT $4
    )
    `

	for _, item := range items {
		_, err := tx.Exec(ctx, releaseEquipmentQuery, available, item.equipmentTypeID, reserved, item.quantity)
		if err != nil {
			return err
		}
	}

	updateRequestQuery := `
    WITH expired_ids AS (
        SELECT borrow_request.borrow_request_id
        FROM borrow_request
        JOIN borrow_request_otp USING (borrow_request_id)
        WHERE borrow_request_status_id = $1 AND borrow_request_otp.expires_at < NOW()
    )
    UPDATE borrow_request
    SET borrow_request_status_id = $2
    WHERE borrow_request_id IN (SELECT borrow_request_id FROM expired_ids)
    `

	if _, err := tx.Exec(ctx, updateRequestQuery, approved, unclaimed); err != nil {
		return err
	}

	deleteOTPQuery := `
    DELETE FROM borrow_request_otp
    WHERE expires_at < NOW()
      AND borrow_request_id IN (
          SELECT borrow_request_id 
          FROM borrow_request 
          WHERE borrow_request_status_id = $1
      )
    `

	if _, err := tx.Exec(ctx, deleteOTPQuery, unclaimed); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	slog.Debug("Processed expired requests and released reserved equipments.")

	return nil
}

// OTP for Return Requests

func (r *repository) createReturnRequestWithOTP(ctx context.Context, returnRequestID string) error {
	maxRetries := 5

	query := `
	INSERT INTO return_request_otp (return_request_id, code, expires_at)
	VALUES ($1, $2, $3)
	`

	for range maxRetries {
		otp := generateRandomOTP(6)

		_, err := r.querier.Exec(
			ctx,
			query,
			returnRequestID,
			otp,
			time.Now().Add(30*time.Minute),
		)
		if err != nil {
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
				slog.Debug("Return OTP collision detected, retrying generation.")
				continue
			}
			return err
		}

		return nil
	}

	return fmt.Errorf("failed to generate unique OTP after retries")
}

func (r *repository) renewExpiredReturnRequests(ctx context.Context) error {
	tx, err := r.querier.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	selectExpiredQuery := `
    SELECT return_request_id
    FROM return_request_otp
    WHERE expires_at < NOW()
    `

	rows, err := tx.Query(ctx, selectExpiredQuery)
	if err != nil {
		return err
	}
	defer rows.Close()

	var expiredReturnRequestIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return err
		}
		expiredReturnRequestIDs = append(expiredReturnRequestIDs, id)
	}
	rows.Close()

	if len(expiredReturnRequestIDs) == 0 {
		return tx.Commit(ctx)
	}

	updateQuery := `
    UPDATE return_request_otp 
    SET code = $1, expires_at = $2
    WHERE return_request_id = $3
    `

	maxRetries := 5
	for _, id := range expiredReturnRequestIDs {
		for range maxRetries {
			otp := generateRandomOTP(6)
			newExpiry := time.Now().Add(30 * time.Minute)

			_, err := tx.Exec(
				ctx,
				updateQuery,
				otp,
				newExpiry,
				id,
			)

			if err == nil {
				break
			}

			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
				slog.Debug("Return OTP collision detected during renewal, retrying generation.")
				continue
			}

			return err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	slog.Debug(fmt.Sprintf("Processed and renewed %d expired return request OTPs.", len(expiredReturnRequestIDs)))
	return nil
}
