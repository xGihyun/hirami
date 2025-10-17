-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS borrow_request_item (
    borrow_request_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    borrow_request_id UUID NOT NULL,
    equipment_type_id UUID NOT NULL,
    quantity SMALLINT NOT NULL,

    FOREIGN KEY(borrow_request_id) REFERENCES borrow_request(borrow_request_id),
    FOREIGN KEY(equipment_type_id) REFERENCES equipment_type(equipment_type_id)
);

ALTER TABLE borrow_request
DROP COLUMN equipment_type_id,
DROP COLUMN quantity;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE borrow_request_item;
-- +goose StatementEnd
