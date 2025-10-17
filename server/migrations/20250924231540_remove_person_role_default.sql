-- +goose Up
-- +goose StatementBegin
ALTER TABLE person_role 
ALTER COLUMN role DROP DEFAULT;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE person_role 
ALTER COLUMN role SET DEFAULT 'borrower';
-- +goose StatementEnd
