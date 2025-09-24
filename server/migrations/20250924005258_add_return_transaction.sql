-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS return_transaction (
    return_transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    borrow_transaction_id UUID NOT NULL,
    return_request_id UUID NOT NULL,

    FOREIGN KEY(borrow_transaction_id) REFERENCES borrow_transaction(borrow_transaction_id),
    FOREIGN KEY(return_request_id) REFERENCES return_request(return_request_id)

);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE return_transaction;
-- +goose StatementEnd
