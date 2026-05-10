-- +goose Up
-- +goose StatementBegin
ALTER TABLE category RENAME COLUMN color TO background_color;
ALTER TABLE category ADD COLUMN foreground_color TEXT;

UPDATE category SET foreground_color = '#FFFFFF';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE category DROP COLUMN foreground_color;
ALTER TABLE category RENAME COLUMN background_color TO color;
-- +goose StatementEnd
