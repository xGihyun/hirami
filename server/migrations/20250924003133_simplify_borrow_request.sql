-- +goose Up
-- +goose StatementBegin
ALTER TABLE borrow_request
RENAME COLUMN requested_quantity TO quantity;

ALTER TABLE borrow_request
DROP COLUMN actual_quantity,
DROP COLUMN requested_at,
ADD COLUMN reviewed_at TIMESTAMPTZ;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE borrow_request
RENAME COLUMN quantity TO requested_quantity;

ALTER TABLE borrow_request
ADD COLUMN actual_quantity SMALLINT,
ADD COLUMN requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
DROP COLUMN reviewed_at;
-- +goose StatementEnd
