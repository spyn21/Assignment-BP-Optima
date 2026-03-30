# Async Document Processing API

This project provides an Express backend where users submit a document (uploaded file or `fileUrl`) and receive a `jobId`. Document processing runs asynchronously in background worker loops, while job status can be tracked via APIs.

## Requirements

- Node.js 18+ (Node.js 20/22 recommended)
- npm

## Project Setup

1. Open this folder in VS Code.
2. Open the integrated terminal (Terminal -> New Terminal).
3. Install dependencies:

```bash
npm install
```

4. (Optional) Create `.env` from `.env.example`:

```bash
copy .env.example .env
```

## Run the server (VS Code)

From the project folder:

```bash
npm start
```

Server runs on `http://localhost:8000` by default.

## API

### 1) Submit a document job

Endpoint:
`POST /api/document-jobs`

#### JSON body (submit by URL)

```json
{
  "fileUrl": "https://example.com/report.pdf",
  "callbackUrl": "https://example.com/webhook"
}
```

#### multipart/form-data (submit by upload)

- field `file` (required)
- optional field `callbackUrl`
- optional field `fileUrl`

Response (`202`):
- `jobId`
- `status` (starts as `queued`)
- `timestamps`, `attempts`, and (currently null) `result`

### 2) Get job status (with timestamps + mock result)

Endpoint:
`GET /api/document-jobs/:jobId`

Job `status` values:
- `queued`
- `processing`
- `completed`
- `failed`

On success, `result` contains a mock JSON payload.

### 3) List jobs (bonus)

Endpoint:
`GET /api/document-jobs`

## Configuration

Optional environment variables:
- `PORT` (default `8000`)
- `DOC_WORKER_CONCURRENCY` (default `3`)
- `DOC_WORKER_POLL_MS` (default `400`)

## Notes

- This implementation uses an in-memory store. Jobs reset when the server restarts.
- Processing is simulated with a random delay of `10–20 seconds`, and failures are simulated to exercise retry/failed states.

