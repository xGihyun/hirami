-- +goose Up
-- +goose StatementBegin
ALTER TABLE equipment_type
DROP COLUMN description;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE equipment_type
ADD COLUMN description TEXT;
-- +goose StatementEnd
