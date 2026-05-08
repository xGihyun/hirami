package api

import (
	"encoding/json"
	"net/http"
)

type Response struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data"`

	Error error `json:"-"`
	Raw   bool  `json:"-"`
}

func (r Response) Encode(w http.ResponseWriter) error {
	if r.Raw {
		return nil
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(r.Code)

	return json.NewEncoder(w).Encode(r)
}
