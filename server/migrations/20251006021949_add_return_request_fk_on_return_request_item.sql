-- +goose Up
-- +goose StatementBegin
ALTER TABLE return_request_item
ADD COLUMN return_request_id UUID NOT NULL REFERENCES return_request(return_request_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE return_request_item
DROP COLUMN return_request_id;
-- +goose StatementEnd
