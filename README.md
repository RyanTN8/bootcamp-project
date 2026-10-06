# Pokémon Team Builder — Weeks 1–3

A plain React + Express project using PokéAPI. It implements search and detail modals, a six-slot team, defensive type analysis, random original-151 teams, browser persistence, and read-only share links.

## Run locally

1. Install Node.js 18 or later.
2. Copy `.env.example` to `.env` (the defaults work locally).
3. Run `npm install`.
4. For development, use two terminals: `npm run server` and `npm run dev`. Open `http://localhost:5173`.
5. To run the complete production-style app from one URL, run `npm start`. Open `http://localhost:3001`.

During development, Vite runs on port 5173 and proxies API requests to Express on port 3001. In production, Express serves the built React app and API together on one port.

## Deploy as one service

Deploy this repository as one Node/Express web service (for example, on Render): set the build command to `npm ci && npm run build` and the start command to `npm run server`. No separate frontend host or API URL is needed.

## Persistence behavior

Your editable team is stored in this browser's `localStorage` as a versioned object. Shared links are intentionally held in the Express server's memory, so they work only until the API restarts. That is the Week 3 limitation; database-backed storage belongs in Week 4.

## API

- `POST /api/analyze-team` — body: `{ "pokemonIds": [25, 94] }`
- `GET /api/random-team` — six distinct Pokémon selected from IDs 1–151
- `POST /api/shared-teams` — body: `{ "name": "My Team", "pokemonIds": [25] }`
- `GET /api/shared-teams/:shareId` — a read-only snapshot

Errors use `{ "error": { "code": "…", "message": "…" } }`.
