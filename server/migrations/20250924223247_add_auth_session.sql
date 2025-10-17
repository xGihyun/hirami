-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS session (
    session_id TEXT PRIMARY KEY,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    person_id UUID NOT NULL,

    FOREIGN KEY(person_id) REFERENCES person(person_id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE session;
-- +goose StatementEnd
