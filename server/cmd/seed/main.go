package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/xGihyun/hirami/migrations"
	"github.com/xGihyun/hirami/user"
)

func main() {
	_ = godotenv.Load()

	dbURL, ok := os.LookupEnv("DATABASE_URL")
	if !ok {
		panic("DATABASE_URL not found.")
	}

	// Ensure migrations have run before seeding
	if err := migrations.Migrate(dbURL); err != nil {
		slog.Error("Failed to run migrations before seeding", "error", err)
		panic(err)
	}
	slog.Info("Migrations applied successfully before seeding.")

	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		panic(err)
	}
	defer pool.Close()

	repo := user.NewRepository(pool)

	registerReq := user.RegisterRequest{
		Email:     "manager@test.com",
		Password:  "Password123!",
		FirstName: "Equipment",
		LastName:  "Manager",
	}
	userID, err := repo.Register(ctx, registerReq)
	if err != nil {
		slog.Warn("Register failed, trying to find existing user", "error", err)
		userRes, err := repo.GetByEmail(ctx, registerReq.Email)
		if err != nil {
			slog.Error("Failed to find existing user by email", "error", err)
			return
		}
		userID = userRes.UserID
	}

	if userID == "" {
		slog.Error("Equipment Manager ID not found after registration and lookup.")
		return
	}

	role := user.EquipmentManager
	updateReq := user.UpdateRequest{
		PersonID: userID,
		Role:     &role,
	}

	if _, err := repo.Update(ctx, updateReq); err != nil {
		slog.Error("Failed to update Equipment Manager role.", "error", err)
		return
	}

	slog.Info("Successfully setup equipment manager.")
}
