-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS password_reset_token (
    password_reset_token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    person_id UUID NOT NULL UNIQUE REFERENCES person(person_id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS password_reset_token;
-- +goose StatementEnd
