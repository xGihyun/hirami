package user

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/suite"
	"github.com/xGihyun/hirami/api"
	"github.com/xGihyun/hirami/testhelpers"
)

type UserRepoTestSuite struct {
	suite.Suite

	ctx         context.Context
	pgContainer *testhelpers.PostgresContainer
	httpServer  *httptest.Server
}

func TestUserRepoTestSuite(t *testing.T) {
	suite.Run(t, new(UserRepoTestSuite))
}

func (suite *UserRepoTestSuite) SetupSuite() {
	suite.ctx = context.Background()
	pgContainer, err := testhelpers.CreatePostgresContainer(suite.ctx)
	if err != nil {
		log.Fatal(err)
	}
	suite.pgContainer = pgContainer

	server := *NewServer(NewRepository(pgContainer.Pool), nil)

	mux := http.NewServeMux()
	mux.Handle("/register", api.Handler(server.Register))
	mux.Handle("/login", api.Handler(server.Login))
	mux.Handle("/sessions", api.Handler(server.GetSession))

	suite.httpServer = httptest.NewServer(mux)
}

func (suite *UserRepoTestSuite) TearDownSuite() {
	suite.pgContainer.Pool.Close()

	if err := suite.pgContainer.Terminate(suite.ctx); err != nil {
		log.Fatalf("error terminating postgres container: %s", err)
	}
}

func (suite *UserRepoTestSuite) TestRegister() {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("email", "newuser@test.com")
	writer.WriteField("password", "SecurePass123!")
	writer.WriteField("firstName", "Test")
	writer.WriteField("lastName", "User")
	writer.Close()

	resp, err := http.Post(suite.httpServer.URL+"/register", writer.FormDataContentType(), body)
	suite.Require().NoError(err)
	defer resp.Body.Close()

	var result api.Response
	err = json.NewDecoder(resp.Body).Decode(&result)
	suite.Require().NoError(err)

	suite.Equal(http.StatusCreated, resp.StatusCode)
	suite.NotEmpty(result.Data)
	suite.Equal("Successfully signed up.", result.Message)
}

func (suite *UserRepoTestSuite) TestLogin() {
	payload := loginRequest{
		Email:    "testuser@test.com",
		Password: "SecurePass123!",
	}

	RegisterTestUser(suite.httpServer.URL, RegisterRequest{
		Email:     payload.Email,
		Password:  payload.Password,
		FirstName: "Test",
		LastName:  "User",
	})

	jsonPayload, err := json.Marshal(payload)
	suite.Require().NoError(err)

	resp, err := http.Post(
		suite.httpServer.URL+"/login",
		"application/json",
		bytes.NewBuffer(jsonPayload),
	)
	suite.Require().NoError(err)
	defer resp.Body.Close()

	var result api.Response
	err = json.NewDecoder(resp.Body).Decode(&result)
	suite.Require().NoError(err)

	suite.Equal(http.StatusOK, resp.StatusCode)
	suite.NotEmpty(result.Data)
	suite.Equal("Successfully signed in.", result.Message)
}

func (suite *UserRepoTestSuite) TestLoginInvalidCredentials() {
	err := RegisterTestUser(suite.httpServer.URL,
		RegisterRequest{
			Email:     "testinvalidcredential@test.com",
			Password:  "SecurePass123!",
			FirstName: "Test",
			LastName:  "User",
		},
	)
	suite.NoError(err)

	payload := loginRequest{
		Email:    "wrongemail@test.com",
		Password: "WrongPassword!",
	}

	jsonPayload, err := json.Marshal(payload)
	suite.Require().NoError(err)

	resp, err := http.Post(
		suite.httpServer.URL+"/login",
		"application/json",
		bytes.NewBuffer(jsonPayload),
	)
	suite.Require().NoError(err)
	defer resp.Body.Close()

	var result api.Response
	err = json.NewDecoder(resp.Body).Decode(&result)
	suite.Require().NoError(err)

	suite.Equal(http.StatusUnauthorized, resp.StatusCode)
	suite.Equal("Invalid credentials.", result.Message)
}

func (suite *UserRepoTestSuite) TestLoginDeactivatedUser() {
	email := "deactivated@test.com"
	password := "SecurePass123!"

	err := RegisterTestUser(suite.httpServer.URL,
		RegisterRequest{
			Email:     email,
			Password:  password,
			FirstName: "Deactivated",
			LastName:  "User",
		},
	)
	suite.NoError(err)

	// Deactivate the user
	_, err = suite.pgContainer.Pool.Exec(suite.ctx, "UPDATE person SET is_active = false WHERE email = $1", email)
	suite.NoError(err)

	payload := loginRequest{
		Email:    email,
		Password: password,
	}

	jsonPayload, err := json.Marshal(payload)
	suite.Require().NoError(err)

	resp, err := http.Post(
		suite.httpServer.URL+"/login",
		"application/json",
		bytes.NewBuffer(jsonPayload),
	)
	suite.Require().NoError(err)
	defer resp.Body.Close()

	var result api.Response
	err = json.NewDecoder(resp.Body).Decode(&result)
	suite.Require().NoError(err)

	suite.Equal(http.StatusUnauthorized, resp.StatusCode)
	suite.Equal("Invalid credentials.", result.Message)
}

func (suite *UserRepoTestSuite) TestSessionValidationDeactivatedUser() {
	email := "session_deactivated@test.com"
	password := "SecurePass123!"

	err := RegisterTestUser(suite.httpServer.URL,
		RegisterRequest{
			Email:     email,
			Password:  password,
			FirstName: "Session",
			LastName:  "Deactivated",
		},
	)
	suite.NoError(err)

	// Login to get a token
	payload := loginRequest{
		Email:    email,
		Password: password,
	}
	jsonPayload, _ := json.Marshal(payload)
	resp, _ := http.Post(suite.httpServer.URL+"/login", "application/json", bytes.NewBuffer(jsonPayload))
	var loginResult api.Response
	json.NewDecoder(resp.Body).Decode(&loginResult)
	resp.Body.Close()

	token := loginResult.Data.(map[string]any)["token"].(string)

	// Verify session is valid initially
	resp, _ = http.Get(suite.httpServer.URL + "/sessions?token=" + token)
	suite.Equal(http.StatusOK, resp.StatusCode)
	resp.Body.Close()

	// Deactivate the user
	_, err = suite.pgContainer.Pool.Exec(suite.ctx, "UPDATE person SET is_active = false WHERE email = $1", email)
	suite.NoError(err)

	// Verify session is now invalid
	resp, err = http.Get(suite.httpServer.URL + "/sessions?token=" + token)
	suite.Require().NoError(err)
	defer resp.Body.Close()

	var result api.Response
	err = json.NewDecoder(resp.Body).Decode(&result)
	suite.Require().NoError(err)

	suite.Equal(http.StatusInternalServerError, resp.StatusCode)
	suite.Equal("Failed to get user session.", result.Message)
}

func RegisterTestUser(serverURL string, data RegisterRequest) error {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("email", data.Email)
	writer.WriteField("password", data.Password)
	writer.WriteField("firstName", data.FirstName)
	writer.WriteField("lastName", data.LastName)
	writer.Close()

	resp, err := http.Post(serverURL+"/register", writer.FormDataContentType(), body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}
