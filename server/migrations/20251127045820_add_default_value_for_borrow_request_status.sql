-- +goose Up
-- +goose StatementBegin
ALTER TABLE borrow_request
ALTER COLUMN borrow_request_status_id SET DEFAULT 1;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE borrow_request
ALTER COLUMN borrow_request_status_id DROP DEFAULT;
-- +goose StatementEnd
