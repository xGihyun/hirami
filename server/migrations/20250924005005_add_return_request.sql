-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS return_request (
    return_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    quantity SMALLINT NOT NULL,

    borrow_request_id UUID NOT NULL,
    reviewed_by UUID,

    FOREIGN KEY(borrow_request_id) REFERENCES borrow_request(borrow_request_id),
    FOREIGN KEY(reviewed_by) REFERENCES person(person_id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE return_request;
-- +goose StatementEnd
