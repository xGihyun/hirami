-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS equipment_status (
    equipment_status_id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    code TEXT UNIQUE NOT NULL, 
    label TEXT NOT NULL
);

INSERT INTO equipment_status (code, label)
VALUES ('available', 'Available'),
    ('reserved', 'Reserved'),
    ('borrowed', 'Borrowed'),
    ('damaged', 'Damaged'),
    ('lost', 'Lost'),
    ('maintenance', 'Maintenance'),
    ('disposed', 'Disposed');

ALTER TABLE equipment 
ADD COLUMN equipment_status_id SMALLINT NOT NULL REFERENCES equipment_status(equipment_status_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE equipment 
DROP COLUMN equipment_status_id;

DROP TABLE IF EXISTS equipment_status;
-- +goose StatementEnd
