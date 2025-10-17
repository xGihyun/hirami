-- +goose Up
-- +goose StatementBegin
ALTER TABLE equipment_type
ADD COLUMN image_url TEXT;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE equipment_type
DROP COLUMN image_url;
-- +goose StatementEnd
