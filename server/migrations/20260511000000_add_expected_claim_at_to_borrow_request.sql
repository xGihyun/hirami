-- +goose Up
-- +goose StatementBegin
ALTER TABLE borrow_request
ADD COLUMN expected_claim_at TIMESTAMPTZ;

UPDATE borrow_request
SET expected_claim_at = created_at + INTERVAL '1 hour'
WHERE expected_claim_at IS NULL;

ALTER TABLE borrow_request
ALTER COLUMN expected_claim_at SET NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE borrow_request
DROP COLUMN expected_claim_at;
-- +goose StatementEnd
