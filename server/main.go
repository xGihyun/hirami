package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/smtp"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/valkey-io/valkey-go"
)

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

	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		panic(err)
	}
	defer pool.Close()

	router := http.NewServeMux()

	router.HandleFunc("GET /", health)

	host, ok := os.LookupEnv("HOST")
	if !ok {
		panic("HOST not found.")
	}

	port, ok := os.LookupEnv("PORT")
	if !ok {
		panic("PORT not found.")
	}

	server := http.Server{
		Addr:    host + ":" + port,
		Handler: router,
	}

	slog.Info(fmt.Sprintf("Starting server on port: %s", port))

	server.ListenAndServe()
}

func health(w http.ResponseWriter, r *http.Request) {
	resetLink := "https://github.com"
	if err := SendEmail(
		"testuser@hirami.test",
		"Password Reset Request",
		"Click here to reset: "+resetLink,
	); err != nil {
		slog.Error(err.Error())
	}

	if err := json.NewEncoder(w).Encode("Hello, World!"); err != nil {
		slog.Error(err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// SendEmail sends email via Mailpit
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
