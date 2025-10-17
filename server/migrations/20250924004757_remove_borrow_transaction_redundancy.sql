-- +goose Up
-- +goose StatementBegin
ALTER TABLE borrow_transaction
RENAME COLUMN borrowed_at TO created_at;

ALTER TABLE borrow_transaction
DROP COLUMN due_at,
DROP COLUMN returned_at;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE borrow_transaction
RENAME COLUMN created_at TO borrowed_at;

ALTER TABLE borrow_transaction
ADD COLUMN due_at TIMESTAMPTZ NOT NULL,
ADD COLUMN returned_at TIMESTAMPTZ;
-- +goose StatementEnd
