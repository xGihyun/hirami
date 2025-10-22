package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/xGihyun/hirami/api"
)

func main() {
	if err := godotenv.Load(); err != nil {
		panic("Failed to load .env file.")
	}

	host, ok := os.LookupEnv("HOST")
	if !ok {
		panic("HOST not found.")
	}

	port, ok := os.LookupEnv("PORT")
	if !ok {
		panic("PORT not found.")
	}

	baseURL := fmt.Sprintf("http://%s:%s", host, port)

	// Create multipart form data for registration
	var registerBuf bytes.Buffer
	writer := multipart.NewWriter(&registerBuf)

	writer.WriteField("email", "manager@test.com")
	writer.WriteField("password", "password")
	writer.WriteField("firstName", "Equipment")
	writer.WriteField("lastName", "Manager")

	writer.Close()

	// Make POST request to /register
	resp, err := http.Post(
		baseURL+"/register",
		writer.FormDataContentType(),
		&registerBuf,
	)
	if err != nil {
		slog.Error("Failed to register", "error", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusConflict {
		slog.Info("Default manager already exists.")
		return
	}

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		slog.Error("Register failed", "status", resp.StatusCode, "body", string(body))
		return
	}

	// Parse response to get user ID
	var registerResp api.Response
	if err := json.NewDecoder(resp.Body).Decode(&registerResp); err != nil {
		slog.Error("Failed to decode response", "error", err)
		return
	}

	slog.Info("User created", "userId", registerResp.Data)

	// Create multipart form data for update
	var updateBuf bytes.Buffer
	updateWriter := multipart.NewWriter(&updateBuf)

	updateWriter.WriteField("role", "manager")

	updateWriter.Close()

	// Make PATCH request
	updateURL := fmt.Sprintf("%s/users/%s", baseURL, registerResp.Data)
	req, err := http.NewRequest(http.MethodPatch, updateURL, &updateBuf)
	if err != nil {
		slog.Error("Failed to create update request", "error", err)
		return
	}
	req.Header.Set("Content-Type", updateWriter.FormDataContentType())

	client := &http.Client{}
	updateResp, err := client.Do(req)
	if err != nil {
		slog.Error("Failed to update user", "error", err)
		return
	}
	defer updateResp.Body.Close()

	if updateResp.StatusCode != http.StatusOK && updateResp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(updateResp.Body)
		slog.Error("Update failed", "status", updateResp.StatusCode, "body", string(body))
		return
	}

	slog.Info("User role updated to manager")
}
