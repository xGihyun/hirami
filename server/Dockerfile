FROM golang:1.25.3

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

EXPOSE 3002

CMD ["go", "run", "."]
