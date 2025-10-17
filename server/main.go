package main

import (
	"context"
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/smtp"
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
	if err := godotenv.Load(); err != nil {
		panic("Failed to load .env file.")
	}

	valkeyAddr, ok := os.LookupEnv("VALKEY_ADDRESS")
	if !ok {
		panic("VALKEY_ADDRESS not found.")
	}

	valkeyClient, err := valkey.NewClient(valkey.ClientOption{InitAddress: []string{valkeyAddr}})
	if err != nil {
		panic(err)
	}
	defer valkeyClient.Close()

	dbURL, ok := os.LookupEnv("DATABASE_URL")
	if !ok {
		panic("DATABASE_URL not found.")
	}

	migrate(dbURL)

	// Run server

	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		panic(err)
	}
	defer pool.Close()

	router := http.NewServeMux()

	router.HandleFunc("GET /", health)

	app := app{
		user:      *user.NewServer(user.NewRepository(pool)),
		equipment: *equipment.NewServer(equipment.NewRepository(pool), valkeyClient),
		sse:       *sse.NewServer(valkeyClient),
	}

	fs := http.FileServer(http.Dir("_uploads"))
	router.Handle("GET /uploads/", http.StripPrefix("/uploads", fs))

	router.HandleFunc("GET /events", app.sse.EventsHandler)
	app.user.SetupRoutes(router)
	app.equipment.SetupRoutes(router)

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
	// resetLink := "https://github.com"
	// if err := SendEmail(
	// 	"testuser@hirami.test",
	// 	"Password Reset Request",
	// 	"Click here to reset: "+resetLink,
	// ); err != nil {
	// 	slog.Error(err.Error())
	// }

	if err := json.NewEncoder(w).Encode("Hello, World!"); err != nil {
		slog.Error(err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// SendEmail sends email via Mailpit
// NOTE: Remove this later, to be used for Password Reset feature
func SendEmail(to, subject, body string) error {
	from := "noreply@hirami.test"
	smtpHost := "localhost"
	smtpPort := "1025"

	message := fmt.Sprintf(
		"From: %s\r\n"+
			"To: %s\r\n"+
			"Subject: %s\r\n"+
			"\r\n"+
			"%s\r\n",
		from, to, subject, body,
	)

	if err := smtp.SendMail(
		smtpHost+":"+smtpPort,
		nil, // No auth for Mailpit
		from,
		[]string{to},
		[]byte(message),
	); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}
