-- +goose Up
-- +goose StatementBegin
CREATE TYPE person_role_type_new AS ENUM ('borrower', 'equipment_manager');

ALTER TABLE person_role 
ALTER COLUMN role TYPE person_role_type_new 
USING role::text::person_role_type_new;

DROP TYPE person_role_type;
ALTER TYPE person_role_type_new RENAME TO person_role_type;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
CREATE TYPE person_role_type_old AS ENUM ('borrower', 'manager', 'admin');

ALTER TABLE person_role 
ALTER COLUMN role TYPE person_role_type_old 
USING role::text::person_role_type_old;

DROP TYPE person_role_type;
ALTER TYPE person_role_type_old RENAME TO person_role_type;
-- +goose StatementEnd
