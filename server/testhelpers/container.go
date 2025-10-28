package testhelpers

import (
	"context"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

type PostgresContainer struct {
	*postgres.PostgresContainer
	ConnectionString string
	Pool             *pgxpool.Pool
}

func CreatePostgresContainer(ctx context.Context) (*PostgresContainer, error) {
	pgContainer, err := postgres.Run(ctx,
		"postgres:latest",
		postgres.WithDatabase("hirami-test"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("postgres"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).WithStartupTimeout(5*time.Second)),
	)
	if err != nil {
		return nil, err
	}

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		return nil, err
	}

	runMigrations(connStr)

	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		return nil, err
	}

	return &PostgresContainer{
		PostgresContainer: pgContainer,
		ConnectionString:  connStr,
		Pool:              pool,
	}, nil
}

func runMigrations(dbURL string) error {
	migrationsPath, err := filepath.Abs("../migrations")
	if err != nil {
		return err
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return err
	}

	db := stdlib.OpenDB(*config.ConnConfig)
	defer db.Close()

	goose.SetDialect("postgres")

	err = goose.Up(db, migrationsPath)
	if err != nil {
		return err
	}

	return nil
}
