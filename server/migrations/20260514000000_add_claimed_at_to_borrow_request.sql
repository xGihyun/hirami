-- +goose Up
ALTER TABLE borrow_request ADD COLUMN claimed_at TIMESTAMPTZ;

-- +goose Down
ALTER TABLE borrow_request DROP COLUMN claimed_at;
