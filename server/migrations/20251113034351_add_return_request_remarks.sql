-- +goose Up
-- +goose StatementBegin
ALTER TABLE return_request
ADD COLUMN remarks NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE return_request
DROP COLUMN remarks;
-- +goose StatementEnd
