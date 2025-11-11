package user

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/xGihyun/hirami/api"
)

type Server struct {
	repository Repository
}

func NewServer(repo Repository) *Server {
	return &Server{
		repository: repo,
	}
}

func (s *Server) SetupRoutes(mux *http.ServeMux) {
	mux.Handle("POST /register", api.Handler(s.Register))
	mux.Handle("POST /login", api.Handler(s.Login))
	mux.Handle("POST /logout", api.Handler(s.Logout))
	mux.Handle("GET /users/{id}", api.Handler(s.Get))
	mux.Handle("PATCH /users/{id}", api.Handler(s.Update))

	mux.Handle("POST /password-reset-request", api.Handler(s.RequestPasswordReset))
	mux.Handle("POST /password-reset", api.Handler(s.ResetPassword))

	mux.Handle("GET /sessions", api.Handler(s.GetSession))
}

const (
	maxMemory    = 30 << 20 // 30 MB
	maxImageSize = 5 << 20  // 5 MB
)

func (s *Server) Register(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	if err := r.ParseMultipartForm(maxMemory); err != nil {
		return api.Response{
			Error:   fmt.Errorf("sign up: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid sign up request.",
		}
	}

	var avatarURL *string
	file, header, err := r.FormFile("avatar")
	if err == nil {
		defer file.Close()

		if header.Size > maxImageSize {
			return api.Response{
				Error:   fmt.Errorf("sign up: image size exceeds 5MB limit"),
				Code:    http.StatusBadRequest,
				Message: "Image size must not exceed 5MB.",
			}
		}

		contentType := header.Header.Get("Content-Type")
		if contentType != "image/jpeg" && contentType != "image/jpg" && contentType != "image/png" {
			return api.Response{
				Error:   fmt.Errorf("sign up: invalid image type %s", contentType),
				Code:    http.StatusBadRequest,
				Message: "Image must be in JPG or PNG format.",
			}
		}

		uploadedURL, err := api.UploadFile(file, header, "users")
		if err != nil {
			return api.Response{
				Error:   fmt.Errorf("sign up: %w", err),
				Code:    http.StatusInternalServerError,
				Message: "Failed to upload avatar.",
			}
		}
		avatarURL = &uploadedURL
	} else if err != http.ErrMissingFile {
		return api.Response{
			Error:   fmt.Errorf("sign up: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid image upload.",
		}
	}

	var middleName *string
	if middleNameValue := strings.TrimSpace(r.FormValue("middleName")); middleNameValue != "" {
		middleName = &middleNameValue
	}

	data := RegisterRequest{
		Email:      r.FormValue("email"),
		Password:   r.FormValue("password"),
		FirstName:  r.FormValue("firstName"),
		MiddleName: middleName,
		LastName:   r.FormValue("lastName"),
		AvatarURL:  avatarURL,
	}

	userID, err := s.repository.Register(ctx, data)
	if err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
			return api.Response{
				Error:   fmt.Errorf("sign up: %w", err),
				Code:    http.StatusConflict,
				Message: "User " + data.Email + " already exists.",
			}
		}

		return api.Response{
			Error:   fmt.Errorf("sign up: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to sign up.",
		}
	}

	return api.Response{
		Code:    http.StatusCreated,
		Message: "Successfully signed up.",
		Data:    userID,
	}
}

func (s *Server) Login(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	var data loginRequest

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&data); err != nil {
		return api.Response{
			Error:   fmt.Errorf("sign in: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid sign in request.",
		}
	}

	res, err := s.repository.login(ctx, data)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return api.Response{
				Error:   fmt.Errorf("sign in: %w", err),
				Code:    http.StatusNotFound,
				Message: "Invalid credentials.",
			}
		}

		if errors.Is(err, errInvalidPassword) {
			return api.Response{
				Error:   fmt.Errorf("sign in: %w", err),
				Code:    http.StatusUnauthorized,
				Message: "Invalid password.",
			}
		}

		return api.Response{
			Error:   fmt.Errorf("sign in: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to sign in.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully signed in.",
		Data:    res,
	}
}

func (s *Server) Logout(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	token := r.URL.Query().Get("token")

	if err := s.repository.invalidateSession(ctx, token); err != nil {
		return api.Response{
			Error:   fmt.Errorf("sign out: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to sign out.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully signed out.",
	}
}

func (s *Server) Get(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	userID := r.PathValue("id")
	user, err := s.repository.get(ctx, userID)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get user: %s", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get user account.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched user account.",
		Data:    user,
	}
}

func (s *Server) GetSession(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	token := r.URL.Query().Get("token")

	result, err := s.repository.validateSessionToken(ctx, token)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get session: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get user session.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched user session.",
		Data:    result,
	}
}

func (s *Server) Update(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()
	if err := r.ParseMultipartForm(maxMemory); err != nil {
		return api.Response{
			Error:   fmt.Errorf("update user: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid update user request.",
		}
	}

	var avatarURL *string
	file, header, err := r.FormFile("avatar")
	if err == nil {
		defer file.Close()
		if header.Size > maxImageSize {
			return api.Response{
				Error:   fmt.Errorf("update user: image size exceeds 5MB limit"),
				Code:    http.StatusBadRequest,
				Message: "Image size must not exceed 5MB.",
			}
		}
		contentType := header.Header.Get("Content-Type")
		if contentType != "image/jpeg" && contentType != "image/jpg" && contentType != "image/png" {
			return api.Response{
				Error:   fmt.Errorf("update user: invalid image type %s", contentType),
				Code:    http.StatusBadRequest,
				Message: "Image must be in JPG or PNG format.",
			}
		}
		uploadedURL, err := api.UploadFile(file, header, "users")
		if err != nil {
			return api.Response{
				Error:   fmt.Errorf("update user: %w", err),
				Code:    http.StatusInternalServerError,
				Message: "Failed to upload user image.",
			}
		}
		avatarURL = &uploadedURL
	} else if err != http.ErrMissingFile {
		return api.Response{
			Error:   fmt.Errorf("update user: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid image upload.",
		}
	}

	toOptionalString := func(s string) *string {
		trimmed := strings.TrimSpace(s)
		if trimmed == "" {
			return nil
		}
		return &trimmed
	}

	role := Role(r.FormValue("role"))
	data := UpdateRequest{
		PersonID:   r.FormValue("id"),
		Email:      toOptionalString(r.FormValue("email")),
		FirstName:  toOptionalString(r.FormValue("firstName")),
		MiddleName: toOptionalString(r.FormValue("middleName")),
		LastName:   toOptionalString(r.FormValue("lastName")),
		Role:       &role,
		AvatarURL:  avatarURL,
	}

	fmt.Println(*data.Role)

	if err := s.repository.Update(ctx, data); err != nil {
		return api.Response{
			Error:   fmt.Errorf("update user: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to update user.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully updated user.",
	}
}

func (s *Server) RequestPasswordReset(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	type requestBody struct {
		Email string `json:"email"`
	}

	var data requestBody

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&data); err != nil {
		return api.Response{
			Error:   fmt.Errorf("request password reset: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid request.",
		}
	}

	rawToken := generateResetToken(32)
	tokenHash := hashToken(rawToken)

	expiry := time.Now().Add(15 * time.Minute)

	if err := s.repository.createPasswordResetToken(ctx, data.Email, tokenHash, expiry); err != nil {
		return api.Response{
			Error:   fmt.Errorf("password reset: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to reset password.",
		}
	}

	// NOTE: Hardcoded client URL
	resetLink := fmt.Sprintf("hirami://password-reset/%s", rawToken) // Mobile URL
	// resetLink := fmt.Sprintf("http://localhost:3000/password-reset/%s", rawToken) // Web URL
	subject := "Password Reset Request"
	bodyHTML := fmt.Sprintf(`
	  <p>Click the button below to reset your password:</p>
	  <p><a href="%s" style="display:inline-block;padding:10px 20px;background-color:#4CAF50;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a></p>
	  <p>If the button doesn’t work, copy and paste this link into your browser:<br><code>%s</code></p>
	  <p>This link will expire in 15 minutes.</p>
	`, resetLink, resetLink)

	if err := api.SendEmail(data.Email, subject, bodyHTML); err != nil {
		return api.Response{
			Error:   fmt.Errorf("password reset email: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to send reset email.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Password reset email sent successfully.",
	}
}

func (s *Server) ResetPassword(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	type resetBody struct {
		Token           string `json:"token"`
		NewPassword     string `json:"newPassword"`
		ConfirmPassword string `json:"confirmPassword"`
	}

	var body resetBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Token == "" || body.NewPassword == "" {
		return api.Response{
			Error:   fmt.Errorf("password reset: invalid body"),
			Code:    http.StatusBadRequest,
			Message: "Invalid request.",
		}
	}

	hashedToken := hashToken(body.Token)

	if err := s.repository.resetPasswordWithToken(ctx, hashedToken, body.NewPassword); err != nil {
		return api.Response{
			Error:   fmt.Errorf("password reset: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid or expired reset token.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Password has been successfully reset.",
	}
}
