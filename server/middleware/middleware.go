package middleware

import (
	"context"
	"errors"
	"net/http"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/xGihyun/hirami/user"
)

type UserClaims struct {
	UserID string
	Role   user.Role
}

const UserContextKey = "user"

type repository struct {
	querier *pgxpool.Pool
}

func NewRepository(querier *pgxpool.Pool) *repository {
	return &repository{
		querier: querier,
	}
}

// RequireRole returns a middleware that checks if the user has the required role
func RequireRole(allowedRoles ...user.Role) func(http.Handler) http.Handler {
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
// This should parse your JWT token or session and extract user info
func AuthMiddleware(next http.Handler) http.Handler {
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

		// TODO: Validate token and extract claims
		// This depends on your authentication method (JWT, sessions, etc.)
		claims, err := validateToken(token)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Add claims to request context
		ctx := context.WithValue(r.Context(), UserContextKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// validateToken is a placeholder - implement based on your auth method
func validateToken(_ string) (*UserClaims, error) {
	// Example: parse JWT, validate signature, extract claims
	// Return &UserClaims{UserID: "...", Role: "..."}, nil
	return nil, errors.New("not implemented")
}

// Example middleware chain helper
func Chain(h http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}
