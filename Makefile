BIN := bin/omnictx
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
LDFLAGS := -s -w -X main.Version=$(VERSION)

build:
	go build -ldflags "$(LDFLAGS)" -o $(BIN) ./cmd/omnictx

test:
	go test ./... -race -count=1

bench:
	go test ./internal/render -bench=BenchmarkRender -benchmem -run=^$$

lint:
	golangci-lint run

vet:
	go vet ./...

golden:
	go test ./internal/render -update

install: build
	install -Dm755 $(BIN) $(HOME)/.local/bin/omnictx

clean:
	rm -rf bin

.PHONY: build test bench lint vet golden install clean
