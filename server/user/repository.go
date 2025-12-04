package user

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	Register(ctx context.Context, arg RegisterRequest) (string, error)
	login(ctx context.Context, arg loginRequest) (signInResponse, error)
	get(ctx context.Context, userID string) (user, error)
	getAll(ctx context.Context, params getParams) ([]user, error)
	Update(ctx context.Context, arg UpdateRequest) (user, error)

	createPasswordResetToken(ctx context.Context, email, tokenHash string, expiresAt time.Time) error
	resetPasswordWithToken(ctx context.Context, tokenHash, newPassword string) error

	GetByEmail(ctx context.Context, email string) (user, error)
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
	INSERT INTO person (email, password_hash, first_name, middle_name, last_name, person_role_id, avatar_url)
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

	person, err := r.GetByEmail(ctx, arg.Email)
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
	UserID     string     `json:"id" db:"person_id"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
	Email      string     `json:"email"`
	FirstName  string     `json:"firstName"`
	MiddleName *string    `json:"middleName"`
	LastName   string     `json:"lastName"`
	AvatarURL  *string    `json:"avatarUrl"`
	Role       RoleDetail `json:"role"`
}

type BasicInfo struct {
	UserID     string  `json:"id"`
	FirstName  string  `json:"firstName"`
	MiddleName *string `json:"middleName"`
	LastName   string  `json:"lastName"`
	AvatarURL  *string `json:"avatarUrl"`
}

func (r *repository) get(ctx context.Context, userID string) (user, error) {
	query := `
	SELECT 
		person.person_id, 
		person.created_at, 
		person.updated_at,
		person.email, 
		person.first_name,
		person.middle_name,
		person.last_name,
		person.avatar_url,
		jsonb_build_object(
			'id', person_role.person_role_id,
			'code', person_role.code,
			'label', person_role.label
		) AS role
	FROM person
	JOIN person_role USING (person_role_id)
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

func (r *repository) GetByEmail(ctx context.Context, email string) (user, error) {
	query := `
	SELECT 
		person.person_id, 
		person.created_at, 
		person.updated_at,
		person.email, 
		person.first_name,
		person.middle_name,
		person.last_name,
		person.avatar_url,
		jsonb_build_object(
			'id', person_role.person_role_id,
			'code', person_role.code,
			'label', person_role.label
		) AS role
	FROM person
	JOIN person_role USING (person_role_id)
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

type getParams struct {
	search *string
}

func (r *repository) getAll(ctx context.Context, params getParams) ([]user, error) {
	query := `
	SELECT 
		person.person_id, 
		person.created_at, 
		person.updated_at,
		person.email, 
		person.first_name,
		person.middle_name,
		person.last_name,
		person.avatar_url,
		jsonb_build_object(
			'id', person_role.person_role_id,
			'code', person_role.code,
			'label', person_role.label
		) AS role
	FROM person
	JOIN person_role USING (person_role_id)
	WHERE TRUE
	`

	var args []any
	argIdx := 1

	if params.search != nil && *params.search != "" {
		searchTerm := "%" + strings.ToLower(*params.search) + "%"
		query += fmt.Sprintf(` 
		AND (
			LOWER(person.email) LIKE $%d
			OR LOWER(person.first_name) LIKE $%d
			OR LOWER(person.middle_name) LIKE $%d
			OR LOWER(person.last_name) LIKE $%d
		)
		`,
			argIdx,
			argIdx,
			argIdx,
			argIdx,
		)
		args = append(args, searchTerm)
		argIdx++
	}

	query += " ORDER BY person_role.person_role_id"

	rows, err := r.querier.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	users, err := pgx.CollectRows(rows, pgx.RowToStructByName[user])
	if err != nil {
		return nil, err
	}

	return users, nil
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
	INSERT INTO person (email, password_hash, first_name, middle_name, last_name, person_role_id)
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
	PersonID   string
	Email      *string
	FirstName  *string
	MiddleName *string
	LastName   *string
	Role       *Role
	AvatarURL  *string
}

func (r *repository) Update(ctx context.Context, arg UpdateRequest) (user, error) {
	query := `
	WITH updated_user AS (
		UPDATE person
		SET email = COALESCE($1, email),
			first_name = COALESCE($2, first_name),
			middle_name = COALESCE($3, middle_name),
			last_name = COALESCE($4, last_name),
			person_role_id = COALESCE($5, person_role_id),
			avatar_url = COALESCE($6, avatar_url)
		WHERE person_id = $7
		RETURNING 
			person_id,
			email,
			first_name,
			middle_name,
			last_name,
			person_role_id,
			avatar_url,
			created_at,
			updated_at
	)
	SELECT 
		updated_user.person_id, 
		updated_user.created_at, 
		updated_user.updated_at,
		updated_user.email, 
		updated_user.first_name,
		updated_user.middle_name,
		updated_user.last_name,
		updated_user.avatar_url,
		jsonb_build_object(
			'id', person_role.person_role_id,
			'code', person_role.code,
			'label', person_role.label
		) AS role
	FROM updated_user
	JOIN person_role USING (person_role_id)
	WHERE person_id = $7
	`

	row := r.querier.QueryRow(
		ctx,
		query,
		arg.Email,
		arg.FirstName,
		arg.MiddleName,
		arg.LastName,
		arg.Role,
		arg.AvatarURL,
		arg.PersonID,
	)

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
