package equipment

import (
	"encoding/json"
	"fmt"
)

type equipmentStatus int

const (
	available equipmentStatus = iota + 1
	reserved
	borrowed
	damaged
	lost
	maintenance
	disposed
)

type equipmentStatusDetail struct {
	ID    int    `json:"id"`
	Code  string `json:"code"`
	Label string `json:"label"`
}

var stringToEquipmentStatus = map[string]equipmentStatus{
	"available":   available,
	"reserved":    reserved,
	"borrowed":    borrowed,
	"damaged":     damaged,
	"lost":        lost,
	"maintenance": maintenance,
	"disposed":    disposed,
}

func (r equipmentStatus) MarshalJSON() ([]byte, error) {
	status := map[equipmentStatus]string{
		available:   "available",
		reserved:    "reserved",
		borrowed:    "borrowed",
		damaged:     "damaged",
		lost:        "lost",
		maintenance: "maintenance",
		disposed:    "disposed",
	}
	if s, ok := status[r]; ok {
		return json.Marshal(s)
	}
	return nil, fmt.Errorf("invalid status: %d", r)
}

func (r *equipmentStatus) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}

	if status, ok := stringToEquipmentStatus[s]; ok {
		*r = status
		return nil
	}
	return fmt.Errorf("invalid status: %s", s)
}

type borrowRequestStatus int

const (
	pending borrowRequestStatus = iota + 1
	approved
	claimed
	returned
	unclaimed
	rejected
)

type borrowRequestStatusDetail struct {
	ID    int    `json:"id"`
	Code  string `json:"code"`
	Label string `json:"label"`
}

var stringToBorrowRequestStatus = map[string]borrowRequestStatus{
	"pending":   pending,
	"approved":  approved,
	"claimed":   claimed,
	"returned":  returned,
	"unclaimed": unclaimed,
	"rejected":  rejected,
}

func (r borrowRequestStatus) MarshalJSON() ([]byte, error) {
	status := map[borrowRequestStatus]string{
		pending:   "pending",
		approved:  "approved",
		claimed:   "claimed",
		returned:  "returned",
		unclaimed: "unclaimed",
		rejected:  "rejected",
	}
	if s, ok := status[r]; ok {
		return json.Marshal(s)
	}
	return nil, fmt.Errorf("invalid status: %d", r)
}

func (r *borrowRequestStatus) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}

	if status, ok := stringToBorrowRequestStatus[s]; ok {
		*r = status
		return nil
	}
	return fmt.Errorf("invalid status: %s", s)
}
