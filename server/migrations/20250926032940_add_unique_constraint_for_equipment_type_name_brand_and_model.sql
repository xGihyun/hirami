-- +goose Up
-- +goose StatementBegin
CREATE UNIQUE INDEX equipment_type_name_brand_model_unique 
ON equipment_type (name, brand, COALESCE(model, ''));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE equipment_type
DROP CONSTRAINT equipment_type_name_brand_model_unique;
-- +goose StatementEnd
