-- +goose Up
-- +goose StatementBegin
UPDATE equipment_status
SET label = 'For Repair'
WHERE code = 'maintenance';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
UPDATE equipment_status
SET label = 'Maintenance'
WHERE code = 'maintenance';
-- +goose StatementEnd
