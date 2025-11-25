-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS borrow_request_otp (
    borrow_request_otp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    code TEXT UNIQUE NOT NULL,
    borrow_request_id UUID UNIQUE NOT NULL REFERENCES borrow_request(borrow_request_id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE borrow_request_otp;
-- +goose StatementEnd
