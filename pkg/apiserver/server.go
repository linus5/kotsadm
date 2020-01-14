package apiserver

import (
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/gorilla/mux"
	"github.com/replicatedhq/kotsadm/pkg/handlers"
)

func Start() {
	u, err := url.Parse("http://kotsadm-api-node:3000")
	if err != nil {
		panic(err)
	}
	upstream := httputil.NewSingleHostReverseProxy(u)

	r := mux.NewRouter()
	r.Use(mux.CORSMethodMiddleware(r))

	r.HandleFunc("/healthz", handlers.Healthz)

	// proxy all graphql requests
	r.Path("/graphql").Methods("OPTIONS").HandlerFunc(handlers.CORS)
	r.Path("/graphql").Methods("POST").HandlerFunc(handlers.NodeProxy(upstream))

	r.HandleFunc("/v1/login", handlers.Login)
	r.HandleFunc("/v1/logout", handlers.NotImplemented)

	r.Path("/v1/metadata").Methods("OPTIONS", "GET").HandlerFunc(handlers.Metadata)

	// KURL
	r.HandleFunc("/v1/kurl", handlers.NotImplemented)

	// Prom
	r.HandleFunc("/v1/prometheus", handlers.NotImplemented)

	// GitOps
	r.HandleFunc("/v1/gitops", handlers.NotImplemented)

	// License
	r.HandleFunc("/v1/license", handlers.NotImplemented)

	// to avoid confusion, we don't serve this in the dev env...
	if os.Getenv("DISABLE_SPA_SERVING") != "1" {
		spa := handlers.SPAHandler{StaticPath: filepath.Join("web", "dist"), IndexPath: "index.html"}
		r.PathPrefix("/").Handler(spa)
	}

	srv := &http.Server{
		Handler:      r,
		Addr:         ":3000",
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	fmt.Printf("Starting kotsadm API on port %d...\n", 3000)

	log.Fatal(srv.ListenAndServe())
}
