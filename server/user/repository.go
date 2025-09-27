package user

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	signUp(ctx context.Context, arg signUpRequest) error
	signIn(ctx context.Context, arg signInRequest) (signInResponse, error)
	get(ctx context.Context, userID string) (user, error)

	getByEmail(ctx context.Context, email string) (user, error)
	invalidateSession(ctx context.Context, token string) error
}

type repository struct {
	querier *pgxpool.Pool
}

func NewRepository(querier *pgxpool.Pool) Repository {
	return &repository{
		querier: querier,
	}
}

type signUpRequest struct {
	Email      string  `json:"email"`
	Password   string  `json:"password"`
	FirstName  string  `json:"firstName"`
	MiddleName *string `json:"middleName"`
	LastName   string  `json:"lastName"`
}

func (r *repository) signUp(ctx context.Context, arg signUpRequest) error {
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
		borrower,
	)
	if err := row.Scan(&userID); err != nil {
		return err
	}

	return nil
}

type signInRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type signInResponse struct {
	User  user   `json:"user"`
	Token string `json:"token"`
}

var errInvalidPassword = errors.New("invalid password")

func (r *repository) signIn(ctx context.Context, arg signInRequest) (signInResponse, error) {
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
	Role       role      `json:"role"`
}

type BasicInfo struct {
	UserID     string  `json:"id"`
	FirstName  string  `json:"firstName"`
	MiddleName *string `json:"middleName"`
	LastName   string  `json:"lastName"`
	AvatarURL  *string `json:"avatarUrl"`
}

type role string

const (
	borrower         role = "borrower"
	equipmentManager role = "equipment_manager"
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
