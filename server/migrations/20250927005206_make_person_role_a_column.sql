-- +goose Up
-- +goose StatementBegin
DROP TABLE person_role;

ALTER TABLE person
ADD COLUMN role person_role_type NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE person
DROp COLUMN person_role_type;

CREATE TABLE IF NOT EXISTS person_role (
    person_role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    role person_role_type NOT NULL DEFAULT 'borrower',
    person_id UUID NOT NULL,

    FOREIGN KEY(person_id) REFERENCES person(person_id),
    UNIQUE (person_id, role)
);
-- +goose StatementEnd
