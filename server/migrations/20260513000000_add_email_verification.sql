-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS email_verification_token (
    email_verification_token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    person_id UUID NOT NULL UNIQUE REFERENCES person(person_id) ON DELETE CASCADE
);

ALTER TABLE person ALTER COLUMN is_active SET DEFAULT FALSE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE person ALTER COLUMN is_active SET DEFAULT TRUE;
DROP TABLE IF EXISTS email_verification_token;
-- +goose StatementEnd
