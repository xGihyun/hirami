-- +goose Up
-- +goose StatementBegin
ALTER TABLE borrow_transaction
ALTER COLUMN equipment_id SET NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd
