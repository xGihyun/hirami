-- +goose Up
-- +goose StatementBegin
DROP INDEX equipment_type_name_brand_model_unique;

CREATE UNIQUE INDEX equipment_type_name_brand_model_unique 
ON equipment_type (name, COALESCE(LOWER(TRIM(brand)), ''), COALESCE(LOWER(TRIM(model)), ''));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX equipment_type_name_brand_model_unique;

CREATE UNIQUE INDEX equipment_type_name_brand_model_unique 
ON equipment_type (name, COALESCE(brand, ''), COALESCE(model, ''));
-- +goose StatementEnd
