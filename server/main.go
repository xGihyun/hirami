package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
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
	if err := json.NewEncoder(w).Encode("Hello, World!"); err != nil {
		slog.Error(err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
