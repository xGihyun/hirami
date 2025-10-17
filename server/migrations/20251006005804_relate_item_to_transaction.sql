-- +goose Up
-- +goose StatementBegin
ALTER TABLE borrow_transaction
DROP COLUMN borrow_request_id;

ALTER TABLE borrow_transaction
ADD COLUMN borrow_request_item_id UUID NOT NULL 
    REFERENCES borrow_request_item(borrow_request_item_id);

ALTER TABLE return_transaction
DROP COLUMN return_request_id;

ALTER TABLE return_transaction
ADD COLUMN return_request_item_id UUID NOT NULL 
    REFERENCES return_request_item(return_request_item_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE borrow_transaction
DROP COLUMN borrow_request_item_id;

ALTER TABLE borrow_transaction
ADD COLUMN borrow_request_id UUID REFERENCES borrow_request(borrow_request_id);

ALTER TABLE return_transaction
DROP COLUMN return_request_item_id;

ALTER TABLE return_transaction
ADD COLUMN return_request_id UUID REFERENCES return_request(return_request_id);
-- +goose StatementEnd
