package sse

import (
	"encoding/json"
	"fmt"
	"log"
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

	rc := http.NewResponseController(w)

	for {
		subCmd := s.valkeyClient.B().Subscribe().Channel("equipment").Build()

		s.valkeyClient.Receive(ctx, subCmd, func(msg valkey.PubSubMessage) {
			var eventRes EventResponse
			if err := json.Unmarshal([]byte(msg.Message), &eventRes); err != nil {
				slog.Error(err.Error())
				return
			}

			dataJSON, err := json.Marshal(eventRes.Data)
			if err != nil {
				slog.Error(err.Error())
				return
			}

			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", eventRes.Event, dataJSON)
			if err := rc.Flush(); err != nil {
				slog.Error(err.Error())
				return
			}
		})

		if r.Context().Err() != nil {
			log.Println("client disconnected")
			return
		}
	}
}
