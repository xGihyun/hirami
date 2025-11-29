package equipment

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

type TestSuite struct {
	suite.Suite

	ctx             context.Context
	pgContainer     *testhelpers.PostgresContainer
	valkeyContainer *testhelpers.ValkeyContainer
	httpServer      *httptest.Server
}

func Test(t *testing.T) {
	suite.Run(t, new(TestSuite))
}

func (suite *TestSuite) SetupSuite() {
	suite.ctx = context.Background()
	pgContainer, err := testhelpers.CreatePostgresContainer(suite.ctx)
	valkeyContainer, err := testhelpers.CreateValkeyContainer(suite.ctx)
	if err != nil {
		log.Fatal(err)
	}
	suite.pgContainer = pgContainer
	suite.valkeyContainer = valkeyContainer

	server := *NewServer(NewRepository(pgContainer.Pool), valkeyContainer.Client)

	mux := http.NewServeMux()
	mux.Handle("/equipments", api.Handler(server.createEquipment))

	suite.httpServer = httptest.NewServer(mux)
}

func (suite *TestSuite) TearDownSuite() {
	suite.pgContainer.Pool.Close()

	if err := suite.pgContainer.Terminate(suite.ctx); err != nil {
		log.Fatalf("error terminating postgres container: %s", err)
	}
}

func (suite *TestSuite) TestCreateEquipment() {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("name", "Volleyball")
	writer.WriteField("brand", "Mikasa")
	writer.WriteField("model", "V200W")
	writer.WriteField("quantity", "4")
	writer.WriteField("acquisitionDate", "2025-11-26T01:42:59.367Z")
	writer.Close()

	resp, err := http.Post(suite.httpServer.URL+"/equipments", writer.FormDataContentType(), body)
	suite.Require().NoError(err)
	defer resp.Body.Close()

	var result api.Response
	err = json.NewDecoder(resp.Body).Decode(&result)
	suite.Require().NoError(err)

	suite.Equal(http.StatusCreated, resp.StatusCode)
	suite.NotEmpty(result.Data)
	suite.Equal("Successfully created equipment.", result.Message)
}

func CreateEquipment(serverURL string, data createRequest) error {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.WriteField("name", data.Name)
	if data.Brand != nil {
		writer.WriteField("brand", *data.Brand)
	}
	if data.Model != nil {
		writer.WriteField("model", *data.Model)
	}
	writer.WriteField("quantity", "1")
	writer.WriteField("acquisitionDate", "2025-11-26T01:42:59.367Z")
	writer.Close()

	resp, err := http.Post(serverURL+"/equipments", writer.FormDataContentType(), body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}
