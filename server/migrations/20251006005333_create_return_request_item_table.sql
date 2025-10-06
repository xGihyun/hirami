-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS return_request_item (
    return_request_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    borrow_request_item_id UUID NOT NULL,

    FOREIGN KEY(borrow_request_item_id) REFERENCES borrow_request_item(borrow_request_item_id)
);

ALTER TABLE return_request
DROP COLUMN quantity;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE return_request_item;
-- +goose StatementEnd
