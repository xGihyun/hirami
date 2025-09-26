package equipment

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/xGihyun/hirami/api"
)

type Server struct {
	repository Repository
}

func NewServer(repo Repository) *Server {
	return &Server{
		repository: repo,
	}
}

func (s *Server) SetupRoutes(mux *http.ServeMux) {
	mux.Handle("POST /equipments", api.Handler(s.createEquipment))
	mux.Handle("GET /equipments", api.Handler(s.getAll))
}

func (s *Server) createEquipment(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	var data createEquipmentRequest

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&data); err != nil {
		return api.Response{
			Error:   fmt.Errorf("create equipment: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid create equipment request.",
		}
	}

	if err := s.repository.createEquipment(ctx, data); err != nil {
		return api.Response{
			Error:   fmt.Errorf("create equipment: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to create equipment.",
		}
	}

	return api.Response{
		Code:    http.StatusCreated,
		Message: "Successfully created equipment.",
	}
}

func (s *Server) getAll(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	equipments, err := s.repository.getAll(ctx)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get equipments: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get equipments.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched equipments.",
		Data:    equipments,
	}
}
