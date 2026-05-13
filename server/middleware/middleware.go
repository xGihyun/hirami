package middleware

import (
	"context"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/valkey-io/valkey-go"
	"github.com/xGihyun/hirami/user"
)

type UserClaims struct {
	UserID string
	Role   user.Role
}

const UserContextKey = "user"

type Middleware struct {
	userRepo     user.Repository
	valkeyClient valkey.Client
}

func NewMiddleware(repo user.Repository, valkeyClient valkey.Client) *Middleware {
	return &Middleware{
		userRepo:     repo,
		valkeyClient: valkeyClient,
	}
}

// RequireRole returns a middleware that checks if the user has the required role
func (m *Middleware) RequireRole(allowedRoles ...user.Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value(UserContextKey).(*UserClaims)
			if !ok || claims == nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			hasRole := slices.Contains(allowedRoles, claims.Role)

			if !hasRole {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// AuthMiddleware extracts and validates the user from the request
func (m *Middleware) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Invalid authorization header", http.StatusUnauthorized)
			return
		}

		token := parts[1]

		result, err := m.userRepo.ValidateSessionToken(r.Context(), token)
		if err != nil {
			http.Error(w, "Invalid or expired session", http.StatusUnauthorized)
			return
		}

		// Convert user.RoleDetail to user.Role
		var role user.Role
		switch result.User.Role.Code {
		case "borrower":
			role = user.Borrower
		case "equipment_manager":
			role = user.EquipmentManager
		default:
			http.Error(w, "Unknown user role", http.StatusInternalServerError)
			return
		}

		claims := &UserClaims{
			UserID: result.User.UserID,
			Role:   role,
		}

		// Add claims to request context
		ctx := context.WithValue(r.Context(), UserContextKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m *Middleware) RateLimit(limit int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get IP address
			ip := r.RemoteAddr
			if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
				ip = strings.Split(xff, ",")[0]
			}

			key := fmt.Sprintf("ratelimit:%s:%s", r.URL.Path, ip)
			ctx := r.Context()

			// Use Valkey to increment and check limit
			// We use a simple fixed-window rate limiter
			val, err := m.valkeyClient.Do(ctx, m.valkeyClient.B().Incr().Key(key).Build()).AsInt64()
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			if val == 1 {
				m.valkeyClient.Do(ctx, m.valkeyClient.B().Pexpire().Key(key).Milliseconds(window.Milliseconds()).Build())
			}

			if val > int64(limit) {
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// Example middleware chain helper
func Chain(h http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}
