# SignalCatcher frontend

The React interface uses the SignalCatcher API and its dedicated worker.

## Configuration

Set `VITE_API_BASE_URL` before starting/building the frontend. All API consumers now share
one base URL; the default is `http://127.0.0.1:8000`.

Configure `ADMIN_API_KEY` on the backend. In the interface, open **Settings** and enter
that same administrative key. It is kept in `sessionStorage` for the current browser tab
and sent through `X-API-Key` for administrative writes and metrics. Never put the key in
`VITE_*` variables, which are embedded into the public browser bundle.

The **Tracking** tab combines pipeline stage counts with real worker readiness, pending
requests, completed job runs, failures, queue age and exhausted processing/deletion retries.
Manual job controls appear once in the jobs table below the pipeline. Its Run buttons
queue work in PostgreSQL; they do not imply that a job has completed.

Ingested videos load in batches of 24 as you scroll. Search and filter changes restart
the list; background refreshes preserve the loaded window. A Load more button is
available alongside automatic scrolling, and failed requests can be retried.

Deletion is asynchronous: the UI shows **Deletion pending** until the worker confirms
file removal and persists `DELETED`. Active processing returns a conflict instead of
allowing an overlapping delete or retry.

## Development server

`npm run dev` runs the Express/Vite server. To use its in-memory mock administrative
endpoints, configure `ADMIN_API_KEY` in the server's environment and set
`VITE_API_BASE_URL=http://localhost:3000`. Mock readiness/metrics do not measure a real
PostgreSQL database or worker, and queued mock requests do not process real files.

## Static checks

`npm run lint` runs TypeScript with `--noEmit`. It does not execute a test suite.
