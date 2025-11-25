-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS person_role (
    person_role_id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    code TEXT UNIQUE NOT NULL, 
    label TEXT NOT NULL
);

ALTER TABLE person DROP COLUMN role;

DROP TYPE person_role_type;

ALTER TABLE person 
ADD COLUMN person_role_id SMALLINT NOT NULL REFERENCES person_role(person_role_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE person DROP COLUMN person_role_id;

CREATE TYPE person_role_type AS ENUM('borrower', 'equipment_manager');

ALTER TABLE person ADD COLUMN role person_role_type NOT NULL;

DROP TABLE IF EXISTS person_role;
-- +goose StatementEnd
