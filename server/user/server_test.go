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

	server := *NewServer(NewRepository(pgContainer.Pool))

	mux := http.NewServeMux()
	mux.Handle("/register", api.Handler(server.Register))
	mux.Handle("/login", api.Handler(server.Login))

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

	suite.Equal(http.StatusNotFound, resp.StatusCode)
	suite.Equal("Invalid credentials.", result.Message)
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
