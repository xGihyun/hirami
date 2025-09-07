-- +goose Up
-- +goose StatementBegin
CREATE TYPE person_role_type AS ENUM('borrower', 'manager', 'admin');

CREATE TABLE IF NOT EXISTS person (
    person_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    avatar_url TEXT
);

CREATE TABLE IF NOT EXISTS person_role (
    person_role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    role person_role_type NOT NULL DEFAULT 'borrower',
    person_id UUID NOT NULL,

    FOREIGN KEY(person_id) REFERENCES person(person_id),
    UNIQUE (person_id, role)
);

CREATE TABLE IF NOT EXISTS equipment_type (
    equipment_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    name TEXT NOT NULL,
    description TEXT,
    brand TEXT,
    model TEXT
);

CREATE TYPE equipment_status AS ENUM('available', 'borrowed', 'damaged');

CREATE TABLE IF NOT EXISTS equipment (
    equipment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    equipment_type_id UUID NOT NULL,
    serial_number TEXT,
    status equipment_status NOT NULL,

    FOREIGN KEY(equipment_type_id) REFERENCES equipment_type(equipment_type_id)
);

CREATE TYPE borrow_request_status AS ENUM('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS borrow_request (
    borrow_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    requested_quantity SMALLINT NOT NULL,
    actual_quantity SMALLINT,
    location TEXT,
    purpose TEXT,
    expected_return_at TIMESTAMPTZ NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status borrow_request_status NOT NULL DEFAULT 'pending',
    remarks TEXT,

    equipment_type_id UUID NOT NULL,
    requested_by UUID NOT NULL,
    reviewed_by UUID,

    FOREIGN KEY(equipment_type_id) REFERENCES equipment_type(equipment_type_id),
    FOREIGN KEY(requested_by) REFERENCES person(person_id),
    FOREIGN KEY(reviewed_by) REFERENCES person(person_id)
);

CREATE TABLE IF NOT EXISTS borrow_transaction (
    borrow_transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    borrowed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at TIMESTAMPTZ NOT NULL,
    returned_at TIMESTAMPTZ,

    borrow_request_id UUID,
    equipment_id UUID,

    FOREIGN KEY(borrow_request_id) REFERENCES borrow_request(borrow_request_id),
    FOREIGN KEY(equipment_id) REFERENCES equipment(equipment_id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE borrow_transaction;
DROP TABLE borrow_request;
DROP TYPE borrow_request_status;
DROP TABLE equipment;
DROP TYPE equipment_status;
DROP TABLE equipment_type;
DROP TABLE person_role;
DROP TABLE person;
DROP TYPE person_role_type;
-- +goose StatementEnd
