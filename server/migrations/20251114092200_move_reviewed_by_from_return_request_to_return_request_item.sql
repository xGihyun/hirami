-- +goose Up
-- +goose StatementBegin
ALTER TABLE return_request
DROP COLUMN reviewed_by,
DROP COLUMN remarks;

ALTER TABLE return_request_item
ADD COLUMN reviewed_by UUID REFERENCES person(person_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE return_request
ADD COLUMN reviewed_by UUID REFERENCES person(person_id),
ADD COLUMN remarks TEXT;

ALTER TABLE return_request_item
DROP COLUMN reviewed_by;
-- +goose StatementEnd
