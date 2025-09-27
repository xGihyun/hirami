-- +goose Up
-- +goose StatementBegin
ALTER TABLE equipment
DROP COLUMN status;

DROP TYPE equipment_status;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
CREATE TYPE equipment_status AS ENUM('available', 'borrowed');

ALTER TABLE equipment
ADD COLUMN status equipment_status NOT NULL;
-- +goose StatementEnd
