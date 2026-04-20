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
	"google.golang.org/api/gmail/v1"
)

type Server struct {
	repository   Repository
	gmailService *gmail.Service
}

func NewServer(repo Repository, svc *gmail.Service) *Server {
	return &Server{
		repository:   repo,
		gmailService: svc,
	}
}

func (s *Server) SetupRoutes(mux *http.ServeMux) {
	mux.Handle("POST /register", api.Handler(s.Register))
	mux.Handle("POST /login", api.Handler(s.Login))
	mux.Handle("POST /logout", api.Handler(s.Logout))
	mux.Handle("GET /users", api.Handler(s.getAll))
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
		if errors.Is(err, pgx.ErrNoRows) || errors.Is(err, errInvalidPassword) {
			return api.Response{
				Error:   fmt.Errorf("sign in: %w", err),
				Code:    http.StatusUnauthorized,
				Message: "Invalid credentials.",
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

func (s *Server) getAll(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	search := r.URL.Query().Get("search")
	params := getParams{
		search: &search,
	}
	users, err := s.repository.getAll(ctx, params)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get users: %s", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get users.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched users.",
		Data:    users,
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

	var role *Role
	if roleStr := r.FormValue("role"); roleStr != "" {
		roleStr = strings.TrimSpace(strings.ToLower(roleStr))

		r, ok := stringToRole[roleStr]
		if !ok {
			return api.Response{
				Error:   fmt.Errorf("update user: invalid role %s", roleStr),
				Code:    http.StatusBadRequest,
				Message: "Invalid role. Must be 'borrower' or 'equipment_manager'.",
			}
		}

		role = &r
	}

	data := UpdateRequest{
		PersonID:   r.FormValue("id"),
		Email:      toOptionalString(r.FormValue("email")),
		FirstName:  toOptionalString(r.FormValue("firstName")),
		MiddleName: toOptionalString(r.FormValue("middleName")),
		LastName:   toOptionalString(r.FormValue("lastName")),
		Role:       role,
		AvatarURL:  avatarURL,
	}

	user, err := s.repository.Update(ctx, data)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("update user: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to update user.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully updated user.",
		Data:    user,
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

	user, err := s.repository.GetByEmail(ctx, data.Email)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("password reset: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to reset password.",
		}
	}
	fullName := fmt.Sprintf("%s %s", user.FirstName, user.LastName)

	// TODO: Use environment variable for client URL
	// NOTE: Hardcoded client URL
	// resetLink := fmt.Sprintf("hirami://password-reset/%s", rawToken) // Mobile URL
	resetLink := fmt.Sprintf("http://localhost:3000/password-reset/%s", rawToken) // Web URL
	subject := "Password Reset Request"
	bodyHTML := fmt.Sprintf(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Password Reset Request</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:oklch(0.9746 0.009 78.28);">
  <table width="100%%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="380" cellpadding="0" cellspacing="0" style="background-color:oklch(0.9746 0.009 78.28);border-radius:16px;overflow:hidden;padding:40px 32px;max-width:380px;">

          <!-- Title -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
                Password Reset Request
              </h1>
            </td>
          </tr>

          <!-- Body text -->
          <tr>
            <td style="padding-bottom:28px;color:#333333;font-size:14px;line-height:1.6;text-align:justify;">
              <p style="margin:0 0 8px 0;">
                Hello <strong>%s</strong>,
              </p>
              <p style="margin:0;">
                We received a request to reset the password for your account.
                To securely change your password, please click the button below.
                This is an important security step, and your password will not be
                changed unless you click the link and create a new one. For your
                security, this link will expire in 24 hours. If you did not request
                this change, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
            <a
                href="%s"
                target="_blank"
                rel="noreferrer"
                style="display:block;width:100%%;padding:16px 0;background-color:oklch(0.5701 0.1162 60.64);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;text-align:center;box-sizing:border-box;"
              >
                Change Password
              </a>
            </td>
          </tr>

          <!-- Sign-off -->
          <tr>
            <td style="font-size:14px;color:#333333;line-height:1.6;">
              Sincerely,<br/>
              The Hirami Team
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
	`, fullName, resetLink)

	if err := api.SendGmail(s.gmailService, data.Email, subject, bodyHTML); err != nil {
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
