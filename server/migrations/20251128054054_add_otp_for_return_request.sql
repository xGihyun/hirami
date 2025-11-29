-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS return_request_otp (
    return_request_otp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    code TEXT UNIQUE NOT NULL,
    return_request_id UUID UNIQUE NOT NULL REFERENCES return_request(return_request_id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE return_request_otp;
-- +goose StatementEnd
