-- +goose Up
-- +goose StatementBegin
ALTER TABLE equipment
DROP CONSTRAINT IF EXISTS equipment_equipment_type_id_fkey,
ADD CONSTRAINT equipment_equipment_type_id_fkey
    FOREIGN KEY (equipment_type_id)
    REFERENCES equipment_type(equipment_type_id)
    ON DELETE CASCADE;

ALTER TABLE borrow_request_item
DROP CONSTRAINT IF EXISTS borrow_request_item_equipment_type_id_fkey,
ADD CONSTRAINT borrow_request_item_equipment_type_id_fkey
    FOREIGN KEY (equipment_type_id)
    REFERENCES equipment_type(equipment_type_id)
    ON DELETE CASCADE;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Reverting to default (NO ACTION) might be tricky without knowing original constraint name exactly,
-- but usually it's table_column_fkey.
ALTER TABLE equipment
DROP CONSTRAINT IF EXISTS equipment_equipment_type_id_fkey,
ADD CONSTRAINT equipment_equipment_type_id_fkey
    FOREIGN KEY (equipment_type_id)
    REFERENCES equipment_type(equipment_type_id);

ALTER TABLE borrow_request_item
DROP CONSTRAINT IF EXISTS borrow_request_item_equipment_type_id_fkey,
ADD CONSTRAINT borrow_request_item_equipment_type_id_fkey
    FOREIGN KEY (equipment_type_id)
    REFERENCES equipment_type(equipment_type_id);
-- +goose StatementEnd
