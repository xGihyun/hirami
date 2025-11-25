package user

import (
	"encoding/json"
	"fmt"
)

type Role int

const (
	Borrower Role = iota + 1
	EquipmentManager
)

var stringToRole = map[string]Role{
	"borrower":          Borrower,
	"equipment_manager": EquipmentManager,
}

func (r Role) MarshalJSON() ([]byte, error) {
	roles := map[Role]string{
		Borrower:         "borrower",
		EquipmentManager: "equipment_manager",
	}
	if s, ok := roles[r]; ok {
		return json.Marshal(s)
	}
	return nil, fmt.Errorf("invalid role: %d", r)
}

func (r *Role) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}

	if role, ok := stringToRole[s]; ok {
		*r = role
		return nil
	}
	return fmt.Errorf("invalid role: %s", s)
}
