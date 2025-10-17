# Hirami

Hirami is a cross-platform sports equipment management system designed to digitalize and simplify the process of borrowing, returning, and tracking sports equipment.

## Tech Stack

- [Tauri](https://tauri.app/)
- [React](https://react.dev/)
- [TanStack](https://tanstack.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Go](https://go.dev/)
- [Postgres](https://www.postgresql.org/)
- [Valkey](https://valkey.io/)

## Development

### Prerequisites

- [Bun](https://bun.com/)
- [Rust](https://rust-lang.org/)
- [Docker](https://www.docker.com/)
- [Android Studio](https://developer.android.com/studio)

### Getting Started

1. Install the [prerequisites](#prerequisites).
2. Clone the repository.

#### Server

1. Navigate to the server directory (`/server`).

```bash
cd server
```

2. Run Docker Compose to start the server:

```bash
# If it is your first time running the server:
docker compose up

# Otherwise:
docker compose start
```

3. The server shall start on port `3002`. You can check this by opening `http://localhost:3002` on any browser and see `"Hello, World!"` to confirm that it works.
4. You can also verify that other Docker Containers work by checking via [Docker Desktop](https://www.docker.com/products/docker-desktop/) or the Docker CLI:

```bash
docker container list
```

#### Client

1. Connect your Android phone via USB.
2. Set up port forwarding:

```bash
adb reverse tcp:3002 tcp:3002
```

3. Navigate to the client directory (`/client`).

```bash
cd client
```

4. Install the dependencies:

```bash
bun install
```

5. Start the client's development mode, this will automatically start a development server on port `3000` and open Android Studio:

```bash
bun tauri android dev -vo
```

6. Run the app on Android Studio.
7. The app shall open on your Android Phone.
8. Optionally, you can also open the app on the browser at `http://localhost:3000`
