package main

import (
	"context"
	"log"
	"log/slog"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/xGihyun/hirami/user"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Failed to load .env")
	}

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

	repo := user.NewRepository(pool)

	registerReq := user.RegisterRequest{
		Email:     "manager@test.com",
		Password:  "password",
		FirstName: "Equipment",
		LastName:  "Manager",
	}
	userID, err := repo.Register(ctx, registerReq)
	if err != nil {
		// if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code != "23505" {
		// 	slog.Error("Failed to register default Equipment Manager.")
		// }
		//
		// if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
		// 	slog.Debug("Equipment Manager already exists.")
		// }

		userRes, _ := repo.GetByEmail(ctx, registerReq.Email)
		// if err != nil {
		// 	slog.Error(err.Error())
		// }

		userID = userRes.UserID
	}

	if userID == "" {
		slog.Error("Equipment Manager ID not found.")
		return
	}

	role := user.EquipmentManager
	updateReq := user.UpdateRequest{
		PersonID: userID,
		Role:     &role,
	}

	if err := repo.Update(ctx, updateReq); err != nil {
		slog.Error("Failed to update Equipment Manager role.")
		return
	}

	slog.Debug("Successfully setup equipment manager.")
}
