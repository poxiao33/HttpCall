package main

import (
	"context"
	"encoding/json"
	"os"

	"jiemian/internal/httpclient"
	"jiemian/internal/models"
	"jiemian/internal/storage"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx     context.Context
	store   *storage.Storage
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.store, _ = storage.New()
}

func (a *App) SendRequest(reqJSON string, tlsJSON string) string {
	var reqConfig models.RequestConfig
	if err := json.Unmarshal([]byte(reqJSON), &reqConfig); err != nil {
		return errorResponse(err)
	}

	var tlsConfig models.TlsConfig
	if err := json.Unmarshal([]byte(tlsJSON), &tlsConfig); err != nil {
		return errorResponse(err)
	}

	client, err := httpclient.New(&tlsConfig, reqConfig.Proxy)
	if err != nil {
		return errorResponse(err)
	}

	resp, err := client.Send(a.ctx, &reqConfig)
	if err != nil {
		return errorResponse(err)
	}

	data, _ := json.Marshal(resp)
	return string(data)
}

func (a *App) SendRequestRepeat(reqJSON string, tlsJSON string, count int) string {
	var reqConfig models.RequestConfig
	if err := json.Unmarshal([]byte(reqJSON), &reqConfig); err != nil {
		return errorResponse(err)
	}

	var tlsConfig models.TlsConfig
	if err := json.Unmarshal([]byte(tlsJSON), &tlsConfig); err != nil {
		return errorResponse(err)
	}

	results := make([]models.ResponseData, 0, count)
	for i := 0; i < count; i++ {
		client, err := httpclient.New(&tlsConfig, reqConfig.Proxy)
		if err != nil {
			continue
		}
		resp, err := client.Send(a.ctx, &reqConfig)
		if err != nil {
			continue
		}
		results = append(results, *resp)
	}

	data, _ := json.Marshal(results)
	return string(data)
}

func (a *App) GetTlsFingerprint(tlsJSON string, targetURL string) string {
	var tlsConfig models.TlsConfig
	if err := json.Unmarshal([]byte(tlsJSON), &tlsConfig); err != nil {
		return errorResponse(err)
	}

	reqConfig := &models.RequestConfig{
		Method: "GET",
		URL:    targetURL,
	}

	client, err := httpclient.New(&tlsConfig, nil)
	if err != nil {
		return errorResponse(err)
	}

	resp, err := client.Send(a.ctx, reqConfig)
	if err != nil {
		return errorResponse(err)
	}

	data, _ := json.Marshal(resp)
	return string(data)
}

// Storage methods

func (a *App) SaveCollection(jsonData string) error {
	return a.store.WriteFile("collections.json", []byte(jsonData))
}

func (a *App) LoadCollections() string {
	data, err := a.store.ReadFile("collections.json")
	if err != nil {
		return "[]"
	}
	return string(data)
}

func (a *App) SaveHistory(jsonData string) error {
	return a.store.WriteFile("history.json", []byte(jsonData))
}

func (a *App) LoadHistory() string {
	data, err := a.store.ReadFile("history.json")
	if err != nil {
		return "[]"
	}
	return string(data)
}

func (a *App) SaveTlsTemplates(jsonData string) error {
	return a.store.WriteFile("tls_templates.json", []byte(jsonData))
}

func (a *App) LoadTlsTemplates() string {
	data, err := a.store.ReadFile("tls_templates.json")
	if err != nil {
		return "[]"
	}
	return string(data)
}

func (a *App) ExportToFile(data string, defaultFilename string) error {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files", Pattern: "*.json"},
		},
	})
	if err != nil {
		return err
	}
	if path == "" {
		return nil
	}
	return os.WriteFile(path, []byte(data), 0644)
}

type errorResult struct {
	Error string `json:"error"`
}

func errorResponse(err error) string {
	data, _ := json.Marshal(errorResult{Error: err.Error()})
	return string(data)
}
