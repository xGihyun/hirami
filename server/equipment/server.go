package equipment

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jung-kurt/gofpdf/v2"
	"github.com/valkey-io/valkey-go"
	"github.com/xGihyun/hirami/api"
	"github.com/xGihyun/hirami/sse"
)

type Server struct {
	repository   Repository
	valkeyClient valkey.Client
}

func NewServer(repo Repository, valkeyClient valkey.Client) *Server {
	return &Server{
		repository:   repo,
		valkeyClient: valkeyClient,
	}
}

func (s *Server) SetupRoutes(mux *http.ServeMux) {
	mux.Handle("POST /equipments", api.Handler(s.createEquipment))
	mux.Handle("GET /equipments", api.Handler(s.getAll))
	mux.Handle("GET /equipments/{equipmentTypeId}", api.Handler(s.getEquipmentByID))
	mux.Handle("GET /equipments/{equipmentTypeId}/status", api.Handler(s.getEquipmentInventoryStatusByID))
	mux.Handle("GET /equipment-names", api.Handler(s.getEquipmentNames))
	mux.Handle("PATCH /equipments/{equipmentTypeId}", api.Handler(s.update))
	mux.Handle("POST /equipments/{equipmentTypeId}/reallocate", api.Handler(s.reallocate))
	mux.Handle("POST /equipments/{equipmentTypeId}/increase", api.Handler(s.increaseQuantity))
	mux.Handle("DELETE /equipments/{equipmentTypeId}", api.Handler(s.deleteEquipment))

	mux.Handle("POST /borrow-requests", api.Handler(s.createBorrowRequest))
	mux.Handle("PATCH /borrow-requests/{id}", api.Handler(s.updateBorrowRequest))
	mux.Handle("PATCH /review-borrow-requests", api.Handler(s.reviewBorrowRequest))
	mux.Handle("GET /borrow-requests", api.Handler(s.getBorrowRequests))
	mux.Handle("GET /borrow-requests/{id}", api.Handler(s.getBorrowRequestByID))
	mux.Handle("GET /borrow-requests/otp/{code}", api.Handler(s.getBorrowRequestByOTP))

	mux.Handle("POST /return-requests", api.Handler(s.createReturnRequest))
	mux.Handle("PATCH /return-requests/{id}", api.Handler(s.confirmReturnRequest))
	mux.Handle("GET /return-requests", api.Handler(s.getReturnRequests))
	mux.Handle("GET /return-requests/{id}", api.Handler(s.getReturnRequestByID))
	mux.Handle("GET /return-requests/otp/{code}", api.Handler(s.getReturnRequestByOTP))

	mux.Handle("GET /borrow-history", api.Handler(s.getBorrowHistory))
	mux.Handle("GET /borrow-history/pdf", api.Handler(s.getBorrowHistoryPDF))

	mux.Handle("GET /users/{userId}/borrowed-equipments", api.Handler(s.getBorrowedItems))

	mux.Handle("POST /categories", api.Handler(s.createCategory))
	mux.Handle("GET /categories", api.Handler(s.getCategories))
	mux.Handle("DELETE /categories/{id}", api.Handler(s.deleteCategory))
}

const (
	maxMemory    = 30 << 20 // 30 MB
	maxImageSize = 5 << 20  // 5 MB
)

func (s *Server) createEquipment(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	if err := r.ParseMultipartForm(maxMemory); err != nil {
		return api.Response{
			Error:   fmt.Errorf("create equipment: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid create equipment request.",
		}
	}

	var imageURL *string
	file, header, err := r.FormFile("image")
	if err == nil {
		defer file.Close()

		if header.Size > maxImageSize {
			return api.Response{
				Error:   fmt.Errorf("create equipment: image size exceeds 5MB limit"),
				Code:    http.StatusBadRequest,
				Message: "Image size must not exceed 5MB.",
			}
		}

		contentType := header.Header.Get("Content-Type")
		if contentType != "image/jpeg" && contentType != "image/jpg" && contentType != "image/png" {
			return api.Response{
				Error:   fmt.Errorf("create equipment: invalid image type %s", contentType),
				Code:    http.StatusBadRequest,
				Message: "Image must be in JPG or PNG format.",
			}
		}

		uploadedURL, err := api.UploadFile(file, header, "equipments")
		if err != nil {
			return api.Response{
				Error:   fmt.Errorf("create equipment: %w", err),
				Code:    http.StatusInternalServerError,
				Message: "Failed to upload equipment image.",
			}
		}
		imageURL = &uploadedURL
	} else if err != http.ErrMissingFile {
		return api.Response{
			Error:   fmt.Errorf("create equipment: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid image upload.",
		}
	}

	quantityStr := r.FormValue("quantity")
	quantity, err := strconv.ParseUint(quantityStr, 10, 32)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("create equipment: invalid quantity %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid quantity value.",
		}
	}
	acquisitionDateStr := r.FormValue("acquisitionDate")
	acquisitionDate, err := time.Parse(time.RFC3339, acquisitionDateStr)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("create equipment: invalid acquisition date %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid acquisition date format.",
		}
	}

	var (
		brand       *string
		model       *string
		categoryIDs []string
	)
	if brandValue := strings.TrimSpace(r.FormValue("brand")); brandValue != "" {
		brand = &brandValue
	}
	if modelValue := strings.TrimSpace(r.FormValue("model")); modelValue != "" {
		model = &modelValue
	}
	if cats := r.FormValue("categoryIds"); cats != "" {
		categoryIDs = strings.Split(cats, ",")
	}

	data := createRequest{
		Name:            strings.TrimSpace(r.FormValue("name")),
		Brand:           brand,
		Model:           model,
		ImageURL:        imageURL,
		AcquisitionDate: acquisitionDate,
		Quantity:        uint(quantity),
		CategoryIDs:     categoryIDs,
	}

	equipment, err := s.repository.createEquipment(ctx, data)
	if err != nil {
		if errors.Is(err, ErrEquipmentAlreadyExists) {
			return api.Response{
				Error:   fmt.Errorf("create equipment: %w", err),
				Code:    http.StatusConflict,
				Message: "Equipment with the same details already exists.",
			}
		}

		return api.Response{
			Error:   fmt.Errorf("create equipment: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to create equipment.",
		}
	}

	eventRes := sse.EventResponse{
		Event: eventEquipmentCreate,
		Data:  equipment,
	}
	jsonData, err := json.Marshal(eventRes)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("create equipment: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to create equipment.",
		}
	}

	pubCmd := s.valkeyClient.B().Publish().Channel("equipment").Message(string(jsonData)).Build()
	if res := s.valkeyClient.Do(ctx, pubCmd); res.Error() != nil {
		return api.Response{
			Error:   fmt.Errorf("create equipment: %w", res.Error()),
			Code:    http.StatusInternalServerError,
			Message: "Failed to create equipment.",
		}
	}

	return api.Response{
		Code:    http.StatusCreated,
		Message: "Successfully created equipment.",
		Data:    equipment,
	}
}

func (s *Server) getAll(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	name := r.URL.Query().Get("name")
	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")
	params := getEquipmentParams{
		name:   &name,
		status: &status,
		search: &search,
	}
	equipments, err := s.repository.getAll(ctx, params)
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

func (s *Server) getEquipmentByID(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	equipmentTypeID := r.PathValue("equipmentTypeId")
	equipment, err := s.repository.getByID(ctx, equipmentTypeID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return api.Response{
				Error:   fmt.Errorf("get equipment: %w", err),
				Code:    http.StatusNotFound,
				Message: "Equipment not found.",
			}
		}

		return api.Response{
			Error:   fmt.Errorf("get equipment: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get equipments.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched equipment.",
		Data:    equipment,
	}
}

func (s *Server) getEquipmentInventoryStatusByID(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	equipmentTypeID := r.PathValue("equipmentTypeId")
	equipment, err := s.repository.getEquipmentTypeByID(ctx, equipmentTypeID)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get equipment: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get equipments.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched equipment.",
		Data:    equipment,
	}
}

func (s *Server) getEquipmentNames(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	equipments, err := s.repository.getEquipmentNames(ctx)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get equipment names: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get equipment names.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched equipment names.",
		Data:    equipments,
	}
}

func (s *Server) update(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	if err := r.ParseMultipartForm(maxMemory); err != nil {
		return api.Response{
			Error:   fmt.Errorf("create equipment: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid create equipment request.",
		}
	}

	var imageURL *string
	file, header, err := r.FormFile("image")
	if err == nil {
		defer file.Close()

		if header.Size > maxImageSize {
			return api.Response{
				Error:   fmt.Errorf("create equipment: image size exceeds 5MB limit"),
				Code:    http.StatusBadRequest,
				Message: "Image size must not exceed 5MB.",
			}
		}

		contentType := header.Header.Get("Content-Type")
		if contentType != "image/jpeg" && contentType != "image/jpg" && contentType != "image/png" {
			return api.Response{
				Error:   fmt.Errorf("create equipment: invalid image type %s", contentType),
				Code:    http.StatusBadRequest,
				Message: "Image must be in JPG or PNG format.",
			}
		}

		uploadedURL, err := api.UploadFile(file, header, "equipments")
		if err != nil {
			return api.Response{
				Error:   fmt.Errorf("create equipment: %w", err),
				Code:    http.StatusInternalServerError,
				Message: "Failed to upload equipment image.",
			}
		}
		imageURL = &uploadedURL
	} else if err != http.ErrMissingFile {
		return api.Response{
			Error:   fmt.Errorf("create equipment: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid image upload.",
		}
	}

	var (
		brand       string   = r.FormValue("brand")
		model       string   = r.FormValue("model")
		categoryIDs []string
	)

	if cats := r.FormValue("categoryIds"); cats != "" {
		categoryIDs = strings.Split(cats, ",")
	}

	data := updateRequest{
		EquipmentTypeID: r.PathValue("equipmentTypeId"),
		Name:            strings.TrimSpace(r.FormValue("name")),
		Brand:           &brand,
		Model:           &model,
		ImageURL:        imageURL,
		CategoryIDs:     categoryIDs,
	}

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

func (s *Server) reallocate(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	var data reallocateRequest

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&data); err != nil {
		return api.Response{
			Error:   fmt.Errorf("reallocate: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid reallocate request.",
		}
	}

	err := s.repository.reallocate(ctx, data)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("reallocate: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to rellocate.",
		}
	}

	eventRes := sse.EventResponse{
		Event: eventEquipmentReallocate,
	}
	jsonData, err := json.Marshal(eventRes)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("reallocate: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to reallocate.",
		}
	}

	pubCmd := s.valkeyClient.B().Publish().Channel("equipment").Message(string(jsonData)).Build()
	if res := s.valkeyClient.Do(ctx, pubCmd); res.Error() != nil {
		return api.Response{
			Error:   fmt.Errorf("reallocate: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to reallocate.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully reallocated equipments.",
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

	if data.ExpectedReturnAt.Before(time.Now().Add(2 * time.Hour)) {
		return api.Response{
			Error:   fmt.Errorf("create borrow request: expected return time must be at least 2 hours from now"),
			Code:    http.StatusBadRequest,
			Message: "Expected return time must be at least 2 hours from now to allow for preparation.",
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

	// NOTE: Ignore anomaly errors for now since it is not required
	s.detectAnomaly(context.Background(), res)
	// 	return api.Response{
	// 		Error:   fmt.Errorf("create borrow request: %w", err),
	// 		Code:    http.StatusInternalServerError,
	// 		Message: "Failed to create borrow request anomaly result.",
	// 	}
	// }

	eventRes := sse.EventResponse{
		Event: eventBorrowRequestCreate,
		Data:  res,
	}
	jsonData, err := json.Marshal(eventRes)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("create borrow request: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to create borrow request.",
		}
	}

	pubCmd := s.valkeyClient.B().Publish().Channel("equipment").Message(string(jsonData)).Build()
	if res := s.valkeyClient.Do(ctx, pubCmd); res.Error() != nil {
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

func (s *Server) updateBorrowRequest(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	var data updateBorrowRequest

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&data); err != nil {
		return api.Response{
			Error:   fmt.Errorf("update borrow request: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid update borrow request.",
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

	res, err := s.repository.updateBorrowRequest(ctx, data)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("update borrow request: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to update borrow request.",
		}
	}

	eventRes := sse.EventResponse{
		Event: eventBorrowRequestUpdate,
		Data:  res,
	}
	jsonData, err := json.Marshal(eventRes)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("update borrow request: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to update borrow request.",
		}
	}

	pubCmd := s.valkeyClient.B().Publish().Channel("equipment").Message(string(jsonData)).Build()
	if res := s.valkeyClient.Do(ctx, pubCmd); res.Error() != nil {
		return api.Response{
			Error:   fmt.Errorf("update borrow request: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to update borrow request.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully updated borrow request.",
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
		if errors.Is(err, errInsufficientEquipmentQuantity) {
			return api.Response{
				Error:   fmt.Errorf("review borrow request: %w", err),
				Code:    http.StatusBadRequest,
				Message: "Requested quantity exceeds available equipment.",
			}
		}

		return api.Response{
			Error:   fmt.Errorf("review borrow request: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to review borrow request.",
		}
	}

	eventRes := sse.EventResponse{
		Event: eventBorrowRequestReview,
		Data:  res,
	}
	jsonData, err := json.Marshal(eventRes)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("review borrow request: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to review borrow request.",
		}
	}

	pubCmd := s.valkeyClient.B().Publish().Channel("equipment").Message(string(jsonData)).Build()
	if res := s.valkeyClient.Do(ctx, pubCmd); res.Error() != nil {
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

		if errors.Is(err, errInvalidBorrowRequestStatus) {
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

	eventRes := sse.EventResponse{
		Event: eventEquipmentCreate,
		Data:  res,
	}
	jsonData, err := json.Marshal(eventRes)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("create return request: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to create return request.",
		}
	}

	pubCmd := s.valkeyClient.B().Publish().Channel("equipment").Message(string(jsonData)).Build()
	if res := s.valkeyClient.Do(ctx, pubCmd); res.Error() != nil {
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

func (s *Server) getBorrowRequestByID(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	borrowRequestID := r.PathValue("id")
	borrowRequests, err := s.repository.getBorrowRequestByID(ctx, borrowRequestID)
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

func (s *Server) getBorrowRequestByOTP(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	code := r.PathValue("code")
	req, err := s.repository.getBorrowRequestByOTP(ctx, code)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get borrow request by OTP: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get borrow request by OTP.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched borrow request.",
		Data:    req,
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

	eventRes := sse.EventResponse{
		Event: eventReturnRequestConfirm,
		Data:  res,
	}
	jsonData, err := json.Marshal(eventRes)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("confirm return request: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to confirm return request.",
		}
	}

	pubCmd := s.valkeyClient.B().Publish().Channel("equipment").Message(string(jsonData)).Build()
	if res := s.valkeyClient.Do(ctx, pubCmd); res.Error() != nil {
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

	userID := r.URL.Query().Get("userId")
	sort := api.Sort(r.URL.Query().Get("sort"))
	category := r.URL.Query().Get("category")
	params := getReturnRequestParams{
		userID:   &userID,
		sort:     &sort,
		category: &category,
	}
	returnRequests, err := s.repository.getReturnRequests(ctx, params)
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

func (s *Server) getReturnRequestByID(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	returnRequestID := r.PathValue("id")
	returnRequest, err := s.repository.getReturnRequestByID(ctx, returnRequestID)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get return request: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get return requests.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched return request.",
		Data:    returnRequest,
	}
}

func (s *Server) getReturnRequestByOTP(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	code := r.PathValue("code")
	req, err := s.repository.getReturnRequestByOTP(ctx, code)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get return request by OTP: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get return request by OTP.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched return request.",
		Data:    req,
	}
}

func (s *Server) getBorrowHistory(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	userID := r.URL.Query().Get("userId")
	status := r.URL.Query().Get("status")
	sort := api.Sort(r.URL.Query().Get("sort"))
	sortBy := r.URL.Query().Get("sortBy")
	category := r.URL.Query().Get("category")
	search := r.URL.Query().Get("search")

	var startDate, endDate *time.Time
	if s := r.URL.Query().Get("startDate"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			startDate = &t
		}
	}
	if e := r.URL.Query().Get("endDate"); e != "" {
		if t, err := time.Parse(time.RFC3339, e); err == nil {
			endDate = &t
		}
	}

	var equipmentIDs []string
	if ids := r.URL.Query().Get("equipmentIds"); ids != "" {
		equipmentIDs = strings.Split(ids, ",")
	}

	params := borrowHistoryParams{
		userID:       &userID,
		status:       &status,
		sort:         &sort,
		sortBy:       &sortBy,
		category:     &category,
		search:       &search,
		startDate:    startDate,
		endDate:      endDate,
		equipmentIDs: equipmentIDs,
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

func (s *Server) getBorrowedItems(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()

	userID := r.PathValue("userId")
	status := r.URL.Query().Get("status")
	sort := api.Sort(r.URL.Query().Get("sort"))
	category := r.URL.Query().Get("category")
	params := borrowedItemParams{
		userID:   userID,
		status:   &status,
		sort:     &sort,
		category: &category,
	}
	history, err := s.repository.getBorrowedItems(ctx, params)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get borrowed items: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get borrowed items.",
		}
	}

	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched borrowed items.",
		Data:    history,
	}
}

func (s *Server) deleteEquipment(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()
	id := r.PathValue("equipmentTypeId")

	var quantityPtr *uint
	if q := r.URL.Query().Get("quantity"); q != "" {
		quantity, err := strconv.ParseUint(q, 10, 64)
		if err != nil {
			return api.Response{
				Error:   fmt.Errorf("delete equipment: invalid quantity: %w", err),
				Code:    http.StatusBadRequest,
				Message: "Invalid quantity provided.",
			}
		}
		uQuantity := uint(quantity)
		quantityPtr = &uQuantity
	}

	if err := s.repository.deleteEquipment(ctx, id, quantityPtr); err != nil {
		if errors.Is(err, ErrEquipmentHasHistory) {
			return api.Response{
				Error:   err,
				Code:    http.StatusBadRequest,
				Message: "Cannot delete equipment that has borrow history.",
			}
		}
		return api.Response{
			Error:   fmt.Errorf("delete equipment: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to delete equipment.",
		}
	}
	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully deleted equipment.",
	}
}

func (s *Server) createCategory(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()
	var body struct {
		Name  string  `json:"name"`
		Color *string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		return api.Response{
			Error:   fmt.Errorf("create category: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid request body.",
		}
	}
	res, err := s.repository.createCategory(ctx, body.Name, body.Color)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("create category: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to create category.",
		}
	}
	return api.Response{
		Code:    http.StatusCreated,
		Message: "Successfully created category.",
		Data:    res,
	}
}

func (s *Server) getCategories(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()
	res, err := s.repository.getCategories(ctx)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get categories: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get categories.",
		}
	}
	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully fetched categories.",
		Data:    res,
	}
}

func (s *Server) deleteCategory(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()
	id := r.PathValue("id")
	if err := s.repository.deleteCategory(ctx, id); err != nil {
		return api.Response{
			Error:   fmt.Errorf("delete category: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to delete category.",
		}
	}
	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully deleted category.",
	}
}

func (s *Server) getBorrowHistoryPDF(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()
	userID := r.URL.Query().Get("userId")
	status := r.URL.Query().Get("status")
	sort := api.Sort(r.URL.Query().Get("sort"))
	sortBy := r.URL.Query().Get("sortBy")
	category := r.URL.Query().Get("category")
	search := r.URL.Query().Get("search")

	var startDate, endDate *time.Time
	if s := r.URL.Query().Get("startDate"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			startDate = &t
		}
	}
	if e := r.URL.Query().Get("endDate"); e != "" {
		if t, err := time.Parse(time.RFC3339, e); err == nil {
			endDate = &t
		}
	}

	var equipmentIDs []string
	if ids := r.URL.Query().Get("equipmentIds"); ids != "" {
		equipmentIDs = strings.Split(ids, ",")
	}

	params := borrowHistoryParams{
		userID:       &userID,
		status:       &status,
		sort:         &sort,
		sortBy:       &sortBy,
		category:     &category,
		search:       &search,
		startDate:    startDate,
		endDate:      endDate,
		equipmentIDs: equipmentIDs,
	}
	history, err := s.repository.getBorrowHistory(ctx, params)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("get borrow history: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to get borrow history for PDF.",
		}
	}

	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(40, 10, "Borrow History Report")
	pdf.Ln(12)

	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(30, 10, "Date", "1", 0, "C", false, 0, "")
	pdf.CellFormat(40, 10, "Borrower", "1", 0, "C", false, 0, "")
	pdf.CellFormat(80, 10, "Equipments", "1", 0, "C", false, 0, "")
	pdf.CellFormat(40, 10, "Purpose", "1", 0, "C", false, 0, "")
	pdf.CellFormat(30, 10, "Status", "1", 0, "C", false, 0, "")
	pdf.CellFormat(40, 10, "Return Date", "1", 0, "C", false, 0, "")
	pdf.Ln(-1)

	pdf.SetFont("Arial", "", 10)
	for _, req := range history {
		dateStr := req.RequestedAt.Format("2006-01-02")
		borrowerName := fmt.Sprintf("%s %s", req.Borrower.FirstName, req.Borrower.LastName)
		
		var equipmentNames []string
		for _, item := range req.RequestedItems {
			equipmentNames = append(equipmentNames, fmt.Sprintf("%s (x%d)", item.Equipment.Name, item.Equipment.Quantity))
		}
		equipStr := strings.Join(equipmentNames, ", ")
		
		returnDate := "N/A"
		if req.ActualReturnAt != nil {
			returnDate = req.ActualReturnAt.Format("2006-01-02")
		}

		pdf.CellFormat(30, 10, dateStr, "1", 0, "L", false, 0, "")
		pdf.CellFormat(40, 10, borrowerName, "1", 0, "L", false, 0, "")
		pdf.CellFormat(80, 10, equipStr, "1", 0, "L", false, 0, "")
		pdf.CellFormat(40, 10, req.Purpose, "1", 0, "L", false, 0, "")
		pdf.CellFormat(30, 10, req.Status.Label, "1", 0, "L", false, 0, "")
		pdf.CellFormat(40, 10, returnDate, "1", 0, "L", false, 0, "")
		pdf.Ln(-1)
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", "attachment; filename=borrow_history.pdf")
	err = pdf.Output(w)
	if err != nil {
		return api.Response{
			Error:   fmt.Errorf("pdf output: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to generate PDF.",
		}
	}

	return api.Response{Raw: true}
}

func (s *Server) increaseQuantity(w http.ResponseWriter, r *http.Request) api.Response {
	ctx := r.Context()
	id := r.PathValue("equipmentTypeId")
	var body struct {
		Quantity        uint      `json:"quantity"`
		AcquisitionDate time.Time `json:"acquisitionDate"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		return api.Response{
			Error:   fmt.Errorf("increase quantity: %w", err),
			Code:    http.StatusBadRequest,
			Message: "Invalid request body.",
		}
	}
	if err := s.repository.increaseQuantity(ctx, id, body.Quantity, body.AcquisitionDate); err != nil {
		return api.Response{
			Error:   fmt.Errorf("increase quantity: %w", err),
			Code:    http.StatusInternalServerError,
			Message: "Failed to increase quantity.",
		}
	}
	return api.Response{
		Code:    http.StatusOK,
		Message: "Successfully increased quantity.",
	}
}
