-- +goose Up
-- +goose StatementBegin
ALTER TABLE return_request
ALTER COLUMN remarks DROP NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE return_request
ALTER COLUMN remarks SET NOT NULL;
-- +goose StatementEnd
