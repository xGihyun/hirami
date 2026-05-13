package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"github.com/valkey-io/valkey-go"
	"github.com/xGihyun/hirami/equipment"
	"github.com/xGihyun/hirami/middleware"
	"github.com/xGihyun/hirami/migrations"
	"github.com/xGihyun/hirami/sse"
	"github.com/xGihyun/hirami/user"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

type app struct {
	user      user.Server
	equipment equipment.Server
	sse       sse.Server
	mw        *middleware.Middleware
}

func main() {
	_ = godotenv.Load()

	valkeyURL, ok := os.LookupEnv("VALKEY_URL")
	if !ok {
		valkeyAddr, ok := os.LookupEnv("VALKEY_ADDRESS")
		if !ok {
			panic("VALKEY_URL or VALKEY_ADDRESS not found.")
		}
		valkeyURL = "valkey://" + valkeyAddr
	}

	opt, err := valkey.ParseURL(valkeyURL)
	if err != nil {
		panic(err)
	}

	valkeyClient, err := valkey.NewClient(opt)
	if err != nil {
		panic(err)
	}
	defer valkeyClient.Close()

	dbURL, ok := os.LookupEnv("DATABASE_URL")
	if !ok {
		panic("DATABASE_URL not found.")
	}

	if err := migrations.Migrate(dbURL); err != nil {
		panic(err)
	}
	slog.Info("Database migrations applied successfully.")

	// Initiate GMail client
	googleClientId, ok := os.LookupEnv("GOOGLE_CLIENT_ID")
	if !ok {
		panic("GOOGLE_CLIENT_ID not found.")
	}

	googleClientSecret, ok := os.LookupEnv("GOOGLE_CLIENT_SECRET")
	if !ok {
		panic("GOOGLE_CLIENT_SECRET not found.")
	}

	googleRefreshToken, ok := os.LookupEnv("GOOGLE_REFRESH_TOKEN")
	if !ok {
		panic("GOOGLE_REFRESH_TOKEN not found.")
	}

	ctx := context.Background()

	cfg := &oauth2.Config{
		ClientID:     googleClientId,
		ClientSecret: googleClientSecret,
		Endpoint:     google.Endpoint,
		Scopes:       []string{gmail.GmailSendScope},
	}

	token := &oauth2.Token{
		RefreshToken: googleRefreshToken,
	}

	httpClient := cfg.Client(ctx, token)

	gmailService, err := gmail.NewService(ctx, option.WithHTTPClient(httpClient))
	if err != nil {
		slog.Error(err.Error())
		panic("Failed to create gmail service")
	}

	// Run server

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		panic(err)
	}
	defer pool.Close()

	userRepo := user.NewRepository(pool)
	mw := middleware.NewMiddleware(userRepo, valkeyClient)

	router := http.NewServeMux()

	router.HandleFunc("GET /", health)

	testMode := os.Getenv("APP_ENV") == "test"

	rateLimitFn := mw.RateLimit
	if testMode {
		rateLimitFn = func(limit int, window time.Duration) func(http.Handler) http.Handler {
			return func(next http.Handler) http.Handler { return next }
		}
	}

	app := app{
		user:      *user.NewServer(userRepo, gmailService, testMode),
		equipment: *equipment.NewServer(equipment.NewRepository(pool), valkeyClient),
		sse:       *sse.NewServer(valkeyClient),
		mw:        mw,
	}

	fs := http.FileServer(http.Dir("_uploads"))
	router.Handle("GET /uploads/", http.StripPrefix("/uploads", fs))

	router.HandleFunc("GET /events", app.sse.EventsHandler)
	app.user.SetupRoutes(router, app.mw.AuthMiddleware, rateLimitFn)
	app.equipment.SetupRoutes(router, app.mw.AuthMiddleware, app.mw.RequireRole)

	app.equipment.StartExpirationWorker(ctx)

	host, ok := os.LookupEnv("HOST")
	if !ok {
		panic("HOST not found.")
	}

	port, ok := os.LookupEnv("PORT")
	if !ok {
		panic("PORT not found.")
	}

	webClientURL := os.Getenv("WEB_CLIENT_URL")
	if webClientURL == "" {
		webClientURL = "http://localhost:3000"
	}

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{webClientURL, "tauri://localhost", "http://tauri.localhost"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	})

	handler := securityHeadersMiddleware(middleware.LoggingMiddleware(c.Handler(router)))
	server := http.Server{
		Addr:    host + ":" + port,
		Handler: handler,
	}

	slog.Info(fmt.Sprintf("Starting server on port: %s", port))

	if err := server.ListenAndServe(); err != nil {
		slog.Error(err.Error())
	}
}

func securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; object-src 'none';")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		next.ServeHTTP(w, r)
	})
}

func health(w http.ResponseWriter, r *http.Request) {
	if err := json.NewEncoder(w).Encode("Hello, World!"); err != nil {
		slog.Error(err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
