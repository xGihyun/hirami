-- +goose Up
-- +goose StatementBegin

ALTER TABLE borrow_request DROP COLUMN status;
DROP TYPE borrow_request_status;

CREATE TABLE IF NOT EXISTS borrow_request_status (
    borrow_request_status_id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    code TEXT UNIQUE NOT NULL, 
    label TEXT NOT NULL
);

ALTER TABLE borrow_request 
ADD COLUMN borrow_request_status_id SMALLINT NOT NULL REFERENCES borrow_request_status(borrow_request_status_id);

INSERT INTO borrow_request_status (code, label)
VALUES ('pending', 'Pending'),
    ('approved', 'Approved'),
    ('claimed', 'Claimed'),
    ('returned', 'Returned'),
    ('unclaimed', 'Unclaimed'),
    ('rejected', 'Rejected');
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE borrow_request DROP COLUMN borrow_request_status_id;

DROP TABLE IF EXISTS borrow_request_status;

CREATE TYPE borrow_request_status AS ENUM('pending', 'approved', 'received', 'fulfilled', 'rejected');

ALTER TABLE borrow_request ADD COLUMN status borrow_request_status NOT NULL;
-- +goose StatementEnd
