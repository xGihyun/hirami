package testhelpers

import (
	"context"
	"net/url"

	"github.com/testcontainers/testcontainers-go"
	valkeyModule "github.com/testcontainers/testcontainers-go/modules/valkey"
	"github.com/valkey-io/valkey-go"
)

type ValkeyContainer struct {
	testcontainers.Container
	ConnectionString string
	Client           valkey.Client
}

func CreateValkeyContainer(ctx context.Context) (*ValkeyContainer, error) {
	valkeyContainer, err := valkeyModule.Run(ctx, "docker.io/valkey/valkey-bundle:latest")
	if err != nil {
		return nil, err
	}

	connStr, err := valkeyContainer.ConnectionString(ctx)
	if err != nil {
		return nil, err
	}

	parsedURL, err := url.Parse(connStr)
	if err != nil {
		return nil, err
	}

	client, err := valkey.NewClient(valkey.ClientOption{InitAddress: []string{parsedURL.Host}})
	if err != nil {
		return nil, err
	}

	return &ValkeyContainer{
		Container:        valkeyContainer,
		ConnectionString: connStr,
		Client:           client,
	}, nil
}
