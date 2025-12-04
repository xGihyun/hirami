-- +goose Up
-- +goose StatementBegin
ALTER TYPE borrow_request_status ADD VALUE 'received';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
CREATE TYPE borrow_request_status_new AS ENUM ('pending', 'approved', 'rejected', 'fulfilled');

ALTER TABLE borrow_request 
ALTER COLUMN status TYPE borrow_request_status_new 
USING status::text::borrow_request_status_new;

DROP TYPE borrow_request_status;
ALTER TYPE borrow_request_status_new RENAME TO borrow_request_status;
-- +goose StatementEnd
