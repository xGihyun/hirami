package user

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	Register(ctx context.Context, arg RegisterRequest) (string, error)
	login(ctx context.Context, arg loginRequest) (signInResponse, error)
	get(ctx context.Context, userID string) (user, error)
	Update(ctx context.Context, arg UpdateRequest) error

	createPasswordResetToken(ctx context.Context, email, tokenHash string, expiresAt time.Time) error
	resetPasswordWithToken(ctx context.Context, tokenHash, newPassword string) error

	getByEmail(ctx context.Context, email string) (user, error)
	invalidateSession(ctx context.Context, token string) error
	createSession(ctx context.Context, token, userID string) (session, error)
	validateSessionToken(ctx context.Context, token string) (sessionValidationResponse, error)
}

type repository struct {
	querier *pgxpool.Pool
}

func NewRepository(querier *pgxpool.Pool) Repository {
	return &repository{
		querier: querier,
	}
}

type RegisterRequest struct {
	Email      string  `json:"email"`
	Password   string  `json:"password"`
	FirstName  string  `json:"firstName"`
	MiddleName *string `json:"middleName"`
	LastName   string  `json:"lastName"`
	AvatarURL  *string `json:"avatarUrl"`
}

func (r *repository) Register(ctx context.Context, arg RegisterRequest) (string, error) {
	passwordHash, err := hashPassword(arg.Password)
	if err != nil {
		return "", err
	}

	query := `
	INSERT INTO person (email, password_hash, first_name, middle_name, last_name, role, avatar_url)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	RETURNING person_id
	`

	var userID string

	row := r.querier.QueryRow(
		ctx,
		query,
		arg.Email,
		passwordHash,
		arg.FirstName,
		arg.MiddleName,
		arg.LastName,
		Borrower,
		arg.AvatarURL,
	)
	if err := row.Scan(&userID); err != nil {
		return "", err
	}

	return userID, nil
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type signInResponse struct {
	User  user   `json:"user"`
	Token string `json:"token"`
}

var errInvalidPassword = errors.New("invalid password")

func (r *repository) login(ctx context.Context, arg loginRequest) (signInResponse, error) {
	query := "SELECT password_hash FROM person WHERE email = ($1)"

	var passwordHash string

	row := r.querier.QueryRow(ctx, query, arg.Email)
	if err := row.Scan(&passwordHash); err != nil {
		return signInResponse{}, err
	}

	isMatch := checkPasswordHash(arg.Password, passwordHash)
	if !isMatch {
		return signInResponse{}, errInvalidPassword
	}

	person, err := r.getByEmail(ctx, arg.Email)
	if err != nil {
		return signInResponse{}, err
	}

	token, err := generateSessionToken()
	if err != nil {
		return signInResponse{}, err
	}

	_, err = r.createSession(ctx, token, person.UserID)
	if err != nil {
		return signInResponse{}, err
	}

	return signInResponse{
		User:  person,
		Token: token,
	}, nil
}

type user struct {
	UserID     string    `json:"id"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
	Email      string    `json:"email"`
	FirstName  string    `json:"firstName"`
	MiddleName *string   `json:"middleName"`
	LastName   string    `json:"lastName"`
	AvatarURL  *string   `json:"avatarUrl"`
	Role       Role      `json:"role"`
}

type BasicInfo struct {
	UserID     string  `json:"id"`
	FirstName  string  `json:"firstName"`
	MiddleName *string `json:"middleName"`
	LastName   string  `json:"lastName"`
	AvatarURL  *string `json:"avatarUrl"`
}

type Role string

const (
	Borrower         Role = "borrower"
	EquipmentManager Role = "equipment_manager"
)

func (r *repository) get(ctx context.Context, userID string) (user, error) {
	query := `
	SELECT 
		person_id, 
		created_at, 
		updated_at,
		email, 
		first_name,
		middle_name,
		last_name,
		avatar_url,
		role
	FROM person
	WHERE person_id = ($1)
	`
	row := r.querier.QueryRow(ctx, query, userID)

	var person user
	if err := row.Scan(
		&person.UserID,
		&person.CreatedAt,
		&person.UpdatedAt,
		&person.Email,
		&person.FirstName,
		&person.MiddleName,
		&person.LastName,
		&person.AvatarURL,
		&person.Role,
	); err != nil {
		return user{}, err
	}

	return person, nil
}

func (r *repository) getByEmail(ctx context.Context, email string) (user, error) {
	query := `
	SELECT 
		person_id, 
		created_at, 
		updated_at,
		email, 
		first_name,
		middle_name,
		last_name,
		avatar_url,
		role
	FROM person
	WHERE email = TRIM($1)
	`
	row := r.querier.QueryRow(ctx, query, email)

	var person user
	if err := row.Scan(
		&person.UserID,
		&person.CreatedAt,
		&person.UpdatedAt,
		&person.Email,
		&person.FirstName,
		&person.MiddleName,
		&person.LastName,
		&person.AvatarURL,
		&person.Role,
	); err != nil {
		return user{}, err
	}

	return person, nil
}

//
// User Management
//
// TODO: Add profile picture upload

type createRequest struct {
	Email      string  `json:"email"`
	Password   string  `json:"password"`
	FirstName  string  `json:"firstName"`
	MiddleName *string `json:"middleName"`
	LastName   string  `json:"lastName"`
	Role       Role    `json:"role"`
}

func (r *repository) create(ctx context.Context, arg createRequest) error {
	passwordHash, err := hashPassword(arg.Password)
	if err != nil {
		return err
	}

	query := `
	INSERT INTO person (email, password_hash, first_name, middle_name, last_name, role)
	VALUES ($1, $2, $3, $4, $5, $6)
	RETURNING person_id
	`

	var userID string

	row := r.querier.QueryRow(
		ctx,
		query,
		arg.Email,
		passwordHash,
		arg.FirstName,
		arg.MiddleName,
		arg.LastName,
		arg.Role,
	)
	if err := row.Scan(&userID); err != nil {
		return err
	}

	return nil
}

type UpdateRequest struct {
	PersonID   string  `json:"id"`
	Email      *string `json:"email"`
	FirstName  *string `json:"firstName"`
	MiddleName *string `json:"middleName"`
	LastName   *string `json:"lastName"`
	Role       *Role   `json:"role"`
	AvatarURL  *string `json:"avatarUrl"`
}

func (r *repository) Update(ctx context.Context, arg UpdateRequest) error {
	query := `
	UPDATE person
	SET email = COALESCE($1, email),
		first_name = COALESCE($2, first_name),
		middle_name = COALESCE($3, middle_name),
		last_name = COALESCE($4, last_name),
		role = COALESCE($5, role),
		avatar_url = COALESCE($6, avatar_url)
	WHERE person_id = $7
	`

	fmt.Println(*arg.Role)

	if _, err := r.querier.Exec(
		ctx,
		query,
		arg.Email,
		arg.FirstName,
		arg.MiddleName,
		arg.LastName,
		arg.Role,
		arg.AvatarURL,
		arg.PersonID,
	); err != nil {
		return err
	}

	return nil
}

func (r *repository) createPasswordResetToken(ctx context.Context, email, tokenHash string, expiresAt time.Time) error {
	var personID string

	query := "SELECT person_id FROM person WHERE email = $1"
	if err := r.querier.QueryRow(ctx, query, email).Scan(&personID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("no user with email: %s", email)
		}
		return err
	}

	query = `
		INSERT INTO password_reset_token (person_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (person_id)
		DO UPDATE SET 
			token_hash = EXCLUDED.token_hash, 
			expires_at = EXCLUDED.expires_at,
			created_at = NOW()
	`

	if _, err := r.querier.Exec(ctx, query, personID, tokenHash, expiresAt); err != nil {
		return err
	}

	return nil
}

func (r *repository) resetPasswordWithToken(ctx context.Context, tokenHash, newPassword string) error {
	var personID string

	query := `
		SELECT person_id FROM password_reset_token
		WHERE token_hash = $1 AND expires_at > NOW()
	`

	if err := r.querier.QueryRow(ctx, query, tokenHash).Scan(&personID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("invalid or expired token")
		}
		return err
	}

	// Update password
	hashedPassword, err := hashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	query = `UPDATE person SET password_hash = $1 WHERE person_id = $2`
	if _, err = r.querier.Exec(ctx, query, hashedPassword, personID); err != nil {
		return err
	}

	query = `DELETE FROM password_reset_token WHERE token_hash = $1`
	if _, err := r.querier.Exec(ctx, query, tokenHash); err != nil {
		return err
	}

	return nil
}
