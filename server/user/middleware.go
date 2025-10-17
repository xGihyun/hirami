package user

import (
	"context"
	"net/http"
	"slices"
	"strings"
)

const UserContextKey = "user"

func RequireRole(allowedRoles ...Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			session, ok := r.Context().Value(UserContextKey).(*sessionValidationResponse)
			if !ok || session == nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			hasRole := slices.Contains(allowedRoles, session.User.Role)

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
func (repo *repository) AuthMiddleware(next http.Handler) http.Handler {
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
		ctx := r.Context()

		// TODO: Validate token and extract claims
		// This depends on your authentication method (JWT, sessions, etc.)
		session, err := repo.validateSessionToken(ctx, token)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Add claims to request context
		sessionCtx := context.WithValue(ctx, UserContextKey, session)
		next.ServeHTTP(w, r.WithContext(sessionCtx))
	})
}
