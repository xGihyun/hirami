package equipment

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

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
	mux.Handle("PATCH /review-borrow-requests", api.Handler(s.reviewBorrowRequest))
	mux.Handle("GET /borrow-requests", api.Handler(s.getBorrowRequests))

	mux.Handle("POST /return-requests", api.Handler(s.createReturnRequest))
	mux.Handle("PATCH /return-requests/{id}", api.Handler(s.confirmReturnRequest))
	mux.Handle("GET /return-requests", api.Handler(s.getReturnRequests))

	mux.Handle("GET /borrow-history", api.Handler(s.getBorrowHistory))
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

	data.Name = strings.TrimSpace(data.Name)

	if data.Brand != nil {
		trimmedBrand := strings.TrimSpace(*data.Brand)
		data.Brand = &trimmedBrand
	}

	if data.Model != nil {
		trimmedModel := strings.TrimSpace(*data.Model)
		data.Model = &trimmedModel
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
		if errors.Is(err, errInvalidBorrowQuantity) {
			return api.Response{
				Error:   fmt.Errorf("create borrow request: %w", err),
				Code:    http.StatusBadRequest,
				Message: "Borrow quantity must be greater than zero.",
			}
		}

		if errors.Is(err, errInsufficientEquipmentQuantity) {
			return api.Response{
				Error:   fmt.Errorf("create borrow request: %w", err),
				Code:    http.StatusBadRequest,
				Message: "Requested quantity exceeds available equipment.",
			}
		}

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

	// borrowRequestID := r.PathValue("id")
	// if data.BorrowRequestID != borrowRequestID {
	// 	return api.Response{
	// 		Error:   fmt.Errorf("borrow request ID mismatch: path=%s, body=%s", borrowRequestID, data.BorrowRequestID),
	// 		Code:    http.StatusBadRequest,
	// 		Message: "Borrow request ID in URL does not match ID in request body.",
	// 	}
	// }

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
		if errors.Is(err, errInvalidReturnQuantity) {
			return api.Response{
				Error:   fmt.Errorf("create return request: %w", err),
				Code:    http.StatusBadRequest,
				Message: "Return quantity must be greater than zero.",
			}
		}

		if errors.Is(err, errBorrowRequestNotApproved) {
			return api.Response{
				Error:   fmt.Errorf("create return request: %w", err),
				Code:    http.StatusBadRequest,
				Message: "Cannot create return request for unapproved borrow request.",
			}
		}

		if errors.Is(err, errExceedsRemainingBorrowedQuantity) {
			return api.Response{
				Error:   fmt.Errorf("create return request: %w", err),
				Code:    http.StatusBadRequest,
				Message: "Return quantity exceeds remaining borrowed equipment.",
			}
		}

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

func (s *Server) getBorrowRequests(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	borrowRequests, err := s.repository.getBorrowRequests(ctx)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get borrow requests: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get borrow requests.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched borrow requests.",
		Data:    borrowRequests,
	}
}

func (s *Server) confirmReturnRequest(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	var data confirmReturnRequest

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&data); err != nil {
		return api.Response{
			Error:   fmt.Errorf("confirm return request: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid confirm return request.",
		}
	}

	returnRequestID := r.PathValue("id")
	if data.ReturnRequestID != returnRequestID {
		return api.Response{
			Error:   fmt.Errorf("return request ID mismatch: path=%s, body=%s", returnRequestID, data.ReturnRequestID),
			Code:    http.StatusBadRequest,
			Message: "Return request ID in URL does not match ID in request body.",
		}
	}

	res, err := s.repository.confirmReturnRequest(ctx, data)
	if err != nil {
		if errors.Is(err, errReturnRequestAlreadyConfirmed) {
			return api.Response{
				Error:   fmt.Errorf("confirm return request: %w", err),
				Code:    http.StatusConflict,
				Message: "Return request has already been confirmed.",
			}
		}

		return api.Response{
			Error:   fmt.Errorf("confirm return request: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to confirm return request.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully confirmed return request.",
		Data:    res,
	}
}

func (s *Server) getReturnRequests(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	returnRequests, err := s.repository.getReturnRequests(ctx)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get return requests: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get return requests.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched return requests.",
		Data:    returnRequests,
	}
}

func (s *Server) getBorrowHistory(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	userID := r.PathValue("userId")
	params := borrowHistoryParams{
		userID: &userID,
	}
	history, err := s.repository.getBorrowHistory(ctx, params)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get borrow history: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get borrow history.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched borrow history.",
		Data:    history,
	}
}
