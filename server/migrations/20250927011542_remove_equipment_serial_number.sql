-- +goose Up
-- +goose StatementBegin
ALTER TABLE equipment
DROP COLUMN serial_number;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE equipment
ADD COLUMN serial_number TEXT;
-- +goose StatementEnd
