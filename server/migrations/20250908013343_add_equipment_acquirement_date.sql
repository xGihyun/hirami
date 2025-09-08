-- +goose Up
-- +goose StatementBegin
ALTER TABLE equipment
ADD COLUMN acquired_at TIMESTAMPTZ NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE equipment
DROP COLUMN acquired_at;
-- +goose StatementEnd
