package equipment

import (
	"context"
	"fmt"
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
