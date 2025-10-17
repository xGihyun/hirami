package user

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base32"
	"encoding/hex"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type session struct {
	SessionID string    `json:"id"`
	ExpiresAt time.Time `json:"expiresAt"`
	UserID    string    `json:"userId"`
}

func generateSessionToken() (string, error) {
	bytes := make([]byte, 20)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	encoder := base32.StdEncoding.WithPadding(base32.NoPadding)
	token := encoder.EncodeToString(bytes)

	return token, nil
}

func (r *repository) createSession(
	ctx context.Context,
	token,
	userID string,
) (session, error) {
	hash := sha256.Sum256([]byte(token))
	sessionID := hex.EncodeToString(hash[:])

	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	ses := session{
		SessionID: sessionID,
		UserID:    userID,
		ExpiresAt: expiresAt,
	}

	query := `
	INSERT INTO session (session_id, person_id, expires_at)
	VALUES ($1, $2, $3)
	`

	if _, err := r.querier.Exec(ctx, query, ses.SessionID, ses.UserID, ses.ExpiresAt); err != nil {
		return session{}, err
	}

	return ses, nil
}

type sessionValidationResponse struct {
	User    user    `json:"user"`
	Session session `json:"session"`
}

func (r *repository) validateSessionToken(
	ctx context.Context,
	token string,
) (sessionValidationResponse, error) {
	hash := sha256.Sum256([]byte(token))
	sessionID := hex.EncodeToString(hash[:])

	query := `
	SELECT session.session_id, session.person_id, session.expires_at 
	FROM session 
	JOIN person ON person.person_id = session.person_id
	WHERE session.session_id = ($1)
	`

	var session session

	row := r.querier.QueryRow(ctx, query, sessionID)
	if err := row.Scan(&session.SessionID, &session.UserID, &session.ExpiresAt); err != nil {
		return sessionValidationResponse{}, err
	}

	now := time.Now()
	if now.After(session.ExpiresAt) || now.Equal(session.ExpiresAt) {
		deleteQuery := "DELETE FROM session WHERE session_id = ($1)"
		if _, err := r.querier.Exec(ctx, deleteQuery, sessionID); err != nil {
			return sessionValidationResponse{}, err
		}
	}

	// If session is close to expiration (3 days), extend it
	beforeExpiry := session.ExpiresAt.Add(-3 * 24 * time.Hour)
	if now.After(beforeExpiry) || now.Equal(beforeExpiry) {
		session.ExpiresAt = now.Add(7 * 24 * time.Hour)

		updateQuery := `UPDATE session SET expires_at = ($1) WHERE session_id = ($2)`
		if _, err := r.querier.Exec(ctx, updateQuery, session.ExpiresAt); err != nil {
			return sessionValidationResponse{}, err
		}
	}

	user, err := r.get(ctx, session.UserID)
	if err != nil {
		return sessionValidationResponse{}, err
	}

	res := sessionValidationResponse{
		Session: session,
		User:    user,
	}

	return res, nil
}

func (r *repository) invalidateSession(ctx context.Context, token string) error {
	hash := sha256.Sum256([]byte(token))
	sessionID := hex.EncodeToString(hash[:])

	query := "DELETE FROM session WHERE session_id = ($1)"
	if _, err := r.querier.Exec(ctx, query, sessionID); err != nil {
		return err
	}

	return nil
}

func hashPassword(password string) (string, error) {
	result, err := bcrypt.GenerateFromPassword([]byte(password), 8)
	return string(result), err
}

func checkPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
