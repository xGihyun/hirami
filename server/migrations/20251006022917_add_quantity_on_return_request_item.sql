-- +goose Up
-- +goose StatementBegin
ALTER TABLE return_request_item
ADD COLUMN quantity SMALLINT NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE return_request_item
DROP COLUMN quantity;
-- +goose StatementEnd
