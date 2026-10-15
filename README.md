# SignalCatcher Frontend

The React 19 interface for the SignalCatcher ecosystem, built with **Vite 6**, **TailwindCSS v4**, **shadcn/ui**, and **Lucide React**.

## Features & Apps

- **SignalCatcher (Ingestion & Tracking):** Live channel monitoring, automated video capture schedules, error retry controls, and real-time worker telemetry.
- **Diarization (WhisperX Intelligence):** Speaker-assigned transcripts, word-level audio synchronization, interactive speaker renaming, and TXT transcript exports.
- **Semantic Search (Vector Intelligence):** Natural language concept search across video transcripts and documents, similarity score filtering, TEI cluster health monitoring, and one-click **Jump to Timestamp** playback buttons.

## Configuration

Set `VITE_API_BASE_URL` before starting/building the frontend. All API consumers share one base URL; the default is `http://127.0.0.1:8000`.

Configure `ADMIN_API_KEY` on the backend if required. In the interface, open **Settings** and enter that same administrative key. It is kept in `sessionStorage` for the current browser tab and sent through `X-API-Key` for administrative writes and metrics. Never put the key in `VITE_*` variables, which are embedded into the public browser bundle.

## Navigation & Workspaces

- Use the top navigation tabs or open the Command Palette with `Ctrl+K` to quickly switch between the **Ingestor**, **Diarization**, and **Semantic Search** apps.
- Tab workspaces persist automatically in `localStorage`.

## Development Server

`npm run dev` runs the local Express/Vite server. It includes in-memory mock endpoints for:
- Video ingestion, channel monitoring, and pipeline telemetry.
- Diarization retry, start-now, and cancel workflows.
- Vectorization batch jobs and semantic search queries.

To connect the frontend to the real backend in development:
```sh
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

## Static Checks & Build

```sh
# TypeScript check
npm run lint

# Production build (Vite bundle + Express backend)
npm run build
```
