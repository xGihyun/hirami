-- +goose Up
-- +goose StatementBegin
ALTER TABLE return_request_item
ADD COLUMN remarks TEXT;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE return_request_item
DROP COLUMN remarks;
-- +goose StatementEnd
