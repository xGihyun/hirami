package sse

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/valkey-io/valkey-go"
)

type Server struct {
	valkeyClient valkey.Client
}

func NewServer(valkeyClient valkey.Client) *Server {
	return &Server{
		valkeyClient: valkeyClient,
	}
}

type EventResponse struct {
	Event string `json:"event"`
	Data  any    `json:"data"`
}

func (s *Server) EventsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	rc := http.NewResponseController(w)

	_, err := fmt.Fprintf(w, ": ping\n\n")
	if err != nil {
		slog.Error("write ping", "err", err)
		return
	}
	if err := rc.Flush(); err != nil {
		slog.Error("flush ping", "err", err)
		return
	}

	subCmd := s.valkeyClient.B().Subscribe().Channel("equipment").Build()
	msgChan := make(chan valkey.PubSubMessage)

	go func() {
		s.valkeyClient.Receive(ctx, subCmd, func(msg valkey.PubSubMessage) {
			msgChan <- msg
		})
	}()

	for {
		select {
		case <-ctx.Done():
			slog.Info("client disconnected")
			return
		case msg := <-msgChan:
			var eventRes EventResponse
			if err := json.Unmarshal([]byte(msg.Message), &eventRes); err != nil {
				slog.Error("unmarshal", "err", err)
				continue
			}

			dataJSON, _ := json.Marshal(eventRes.Data)
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", eventRes.Event, dataJSON)
			if err := rc.Flush(); err != nil {
				slog.Error("flush", "err", err)
				return
			}
		}
	}
}
