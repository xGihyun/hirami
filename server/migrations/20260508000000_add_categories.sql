-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS category (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name TEXT NOT NULL UNIQUE,
    color TEXT
);

CREATE TABLE IF NOT EXISTS equipment_type_category (
    equipment_type_id UUID NOT NULL,
    category_id UUID NOT NULL,
    PRIMARY KEY (equipment_type_id, category_id),
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_type(equipment_type_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES category(category_id) ON DELETE CASCADE
);

-- Insert initial categories
INSERT INTO category (name, color) VALUES 
('Ball', '#FF5733'),
('Nets', '#33FF57'),
('Rackets', '#3357FF'),
('Others', '#888888');

-- Migration: existing equipment_type.name as category? 
-- The requirement says "the categories are incorrect, it should be 'Ball', 'Nets', 'Rackets', etc."
-- We can't easily map old names to new categories automatically.
-- We will let the manager do it manually.

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE equipment_type_category;
DROP TABLE category;
-- +goose StatementEnd
