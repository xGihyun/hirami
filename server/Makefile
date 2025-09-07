DB_STRING = user=hirami dbname=hirami password=password host=localhost sslmode=disable
GOOSE_CMD = GOOSE_DRIVER=postgres GOOSE_DBSTRING="$(DB_STRING)" GOOSE_MIGRATION_DIR="./migrations/" goose

db-up:
	@$(GOOSE_CMD) up

db-down:
	@$(GOOSE_CMD) down

db-create:
ifeq ($(name),)
	$(error `name` is not set. Usage: `make db-create name="migration name"`)
endif
	@$(GOOSE_CMD) create "$(name)" sql
