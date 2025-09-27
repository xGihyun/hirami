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
	mux.Handle("PATCH /equipments/{equipmentTypeId}", api.Handler(s.update))

	mux.Handle("POST /borrow-requests", api.Handler(s.createBorrowRequest))
	mux.Handle("PATCH /borrow-requests/{id}", api.Handler(s.reviewBorrowRequest))
	mux.Handle("POST /return-requests", api.Handler(s.createReturnRequest))
}

func (s *Server) createEquipment(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	var data createRequest

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

func (s *Server) update(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	var data updateRequest

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&data); err != nil {
		return api.Response{
			Error:   fmt.Errorf("update equipment: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid update equipment request.",
		}
	}

	data.EquipmentTypeID = r.PathValue("equipmentTypeId")
	if err := s.repository.update(ctx, data); err != nil {
		return api.Response{
			Error:   fmt.Errorf("update equipments: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to update equipments.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully updated equipments.",
	}
}

func (s *Server) createBorrowRequest(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	var data createBorrowRequest

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&data); err != nil {
		return api.Response{
			Error:   fmt.Errorf("create borrow request: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid create borrow request.",
		}
	}

	res, err := s.repository.createBorrowRequest(ctx, data)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("create borrow request: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to create borrow request.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully created borrow request.",
		Data:    res,
	}
}

func (s *Server) reviewBorrowRequest(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	var data reviewBorrowRequest

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&data); err != nil {
		return api.Response{
			Error:   fmt.Errorf("review borrow request: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid review borrow request.",
		}
	}

	borrowRequestID := r.PathValue("id")
	if data.BorrowRequestID != borrowRequestID {
		return api.Response{
			Error:   fmt.Errorf("borrow request ID mismatch: path=%s, body=%s", borrowRequestID, data.BorrowRequestID),
			Code:    http.StatusBadRequest,
			Message: "Borrow request ID in URL does not match ID in request body.",
		}
	}

	res, err := s.repository.reviewBorrowRequest(ctx, data)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("review borrow request: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to review borrow request.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully reviewed borrow request.",
		Data:    res,
	}
}

func (s *Server) createReturnRequest(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	var data createReturnRequest

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&data); err != nil {
		return api.Response{
			Error:   fmt.Errorf("create return request: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid create return request.",
		}
	}

	res, err := s.repository.createReturnRequest(ctx, data)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("create return request: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to create return request.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully created return request.",
		Data:    res,
	}
}
