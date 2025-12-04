-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS anomaly_result (
    anomaly_result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    score REAL NOT NULL,
    is_anomaly BOOLEAN NOT NULL,
    is_false_positive BOOLEAN,
    borrow_request_id UUID NOT NULL REFERENCES borrow_request(borrow_request_id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS anomaly_result;
-- +goose StatementEnd
