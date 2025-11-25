-- +goose Up
-- +goose StatementBegin
INSERT INTO person_role (code, label)
VALUES ('borrower', 'Borrower'),
    ('equipment_manager', 'Equipment Manager');
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM person_role;
-- +goose StatementEnd
