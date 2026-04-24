-- +goose Up
-- +goose StatementBegin
ALTER TABLE person
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE person
DROP COLUMN is_active;
-- +goose StatementEnd
