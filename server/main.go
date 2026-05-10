package main

import (
	"context"
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/pressly/goose/v3"
	"github.com/rs/cors"
	"github.com/valkey-io/valkey-go"
	"github.com/xGihyun/hirami/equipment"
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
}

//go:embed migrations/*.sql
var embedMigrations embed.FS

func migrate(dbURL string) {
	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		panic(err)
	}
	defer db.Close()

	goose.SetBaseFS(embedMigrations)

	if err := goose.SetDialect("postgres"); err != nil {
		panic(err)
	}

	// Run migrations from the embedded FS
	if err := goose.Up(db, "migrations"); err != nil {
		panic(err)
	}

	slog.Info("Database migrations applied successfully.")
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

	migrate(dbURL)

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

	router := http.NewServeMux()

	router.HandleFunc("GET /", health)

	app := app{
		user:      *user.NewServer(user.NewRepository(pool), gmailService),
		equipment: *equipment.NewServer(equipment.NewRepository(pool), valkeyClient),
		sse:       *sse.NewServer(valkeyClient),
	}

	fs := http.FileServer(http.Dir("_uploads"))
	router.Handle("GET /uploads/", http.StripPrefix("/uploads", fs))

	router.HandleFunc("GET /events", app.sse.EventsHandler)
	app.user.SetupRoutes(router)
	app.equipment.SetupRoutes(router)

	app.equipment.StartExpirationWorker(ctx)

	host, ok := os.LookupEnv("HOST")
	if !ok {
		panic("HOST not found.")
	}

	port, ok := os.LookupEnv("PORT")
	if !ok {
		panic("PORT not found.")
	}

	handler := cors.AllowAll().Handler(router)
	server := http.Server{
		Addr:    host + ":" + port,
		Handler: handler,
	}

	slog.Info(fmt.Sprintf("Starting server on port: %s", port))

	if err := server.ListenAndServe(); err != nil {
		slog.Error(err.Error())
	}
}

func health(w http.ResponseWriter, r *http.Request) {
	if err := json.NewEncoder(w).Encode("Hello, World!"); err != nil {
		slog.Error(err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
