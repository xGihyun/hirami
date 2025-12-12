package equipment

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/xGihyun/hirami/sse"
)

func (s *Server) detectAnomaly(ctx context.Context, arg createBorrowResponse) error {
	phTime, err := time.LoadLocation("Asia/Manila")
	if err != nil {
		return err
	}

	// Convert timestamps to PH time since it also sensitive on the hour of the day
	arg.CreatedAt = arg.CreatedAt.In(phTime)
	arg.ExpectedReturnAt = arg.ExpectedReturnAt.In(phTime)

	payload := []createBorrowResponse{arg}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	// DEBUG: Print the actual JSON being sent
	fmt.Printf("Sending to ML service: %s\n", string(jsonData))

	anomalyServiceURL := "http://ml:8000/anomalies"
	req, err := http.NewRequestWithContext(ctx, "POST", anomalyServiceURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var anomalyRes []anomaly
	if err := json.NewDecoder(resp.Body).Decode(&anomalyRes); err != nil {
		return err
	}

	if err := s.repository.createAnomalyResult(ctx, anomalyRes[0]); err != nil {
		return err
	}

	// Send to SSE
	eventRes := sse.EventResponse{
		Event: "equipment:anomaly",
		Data:  anomalyRes[0],
	}
	jsonData, err = json.Marshal(eventRes)
	if err != nil {
		return err
	}

	pubCmd := s.valkeyClient.B().Publish().Channel("equipment").Message(string(jsonData)).Build()
	if res := s.valkeyClient.Do(ctx, pubCmd); res.Error() != nil {
		return err
	}
	return nil
}
