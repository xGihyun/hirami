package api

import (
	"log/slog"
	"net/http"
)

type Handler func(w http.ResponseWriter, r *http.Request) Response

func (fn Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	res := fn(w, r)

	if res.Error != nil {
		slog.Error(res.Error.Error())
	}

	if err := res.Encode(w); err != nil {
		slog.Error(err.Error())
	}
}
