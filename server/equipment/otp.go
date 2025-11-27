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

func (r *repository) createRequestWithOTP(ctx context.Context, borrowRequestID string) error {
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
				continue
			}
			return err
		}

		return nil
	}

	return fmt.Errorf("failed to generate unique OTP after retries")
}

func (s *Server) StartExpirationWorker(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for range ticker.C {
			if err := s.repository.processExpiredRequests(ctx); err != nil {
				slog.Error(err.Error())
			}
		}
	}()
	slog.Info("Started expiration worker.")
}

func (r *repository) processExpiredRequests(ctx context.Context) error {
	tx, err := r.querier.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	updateQuery := `
    WITH expired_ids AS (
        SELECT borrow_request.borrow_request_id
        FROM borrow_request
        JOIN borrow_request_otp USING (borrow_request_id)
        WHERE borrow_request_status_id = $1
			AND borrow_request_otp.expires_at < NOW()
    )
    UPDATE borrow_request
    SET borrow_request_status_id = $2
    WHERE borrow_request_id IN (SELECT borrow_request_id FROM expired_ids)
    `

	if _, err := tx.Exec(ctx, updateQuery, approved, returned); err != nil {
		return err
	}

	deleteOTPQuery := `
    DELETE FROM borrow_request_otp
    WHERE EXISTS (
        SELECT 1
        FROM borrow_request
        WHERE borrow_request.borrow_request_id = borrow_request_otp.borrow_request_id
			AND borrow_request_otp.expires_at < NOW()
    )
    `

	if _, err := tx.Exec(ctx, deleteOTPQuery); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	slog.Debug("PROCESSED EXPIRED REQUESTS")

	return nil
}
