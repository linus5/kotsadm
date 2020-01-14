package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/websocket"
	kotsscheme "github.com/replicatedhq/kots/kotskinds/client/kotsclientset/scheme"
	"github.com/replicatedhq/kotsadm/pkg/logger"
	"k8s.io/client-go/kubernetes/scheme"
)

type Handlers struct {
}

func init() {
	kotsscheme.AddToScheme(scheme.Scheme)
}

func JSON(w http.ResponseWriter, code int, payload interface{}) {
	response, err := json.Marshal(payload)
	if err != nil {
		logger.Error(err)
		w.WriteHeader(500)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

func StreamJSON(c *websocket.Conn, payload interface{}) {
	response, err := json.Marshal(payload)
	if err != nil {
		logger.Error(err)
		return
	}

	err = c.WriteMessage(websocket.TextMessage, response)
	if err != nil {
		logger.Error(err)
		return
	}
}
