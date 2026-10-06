# Pokémon Team Builder — Weeks 1–3

A plain React + Express project using PokéAPI. It implements search and detail modals, a six-slot team, defensive type analysis, random original-151 teams, browser persistence, and read-only share links.

## Run locally

1. Install Node.js 18 or later.
2. Copy `.env.example` to `.env` (the defaults work locally).
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:5173`.

The frontend runs on port 5173 and the Express API on port 3001. `VITE_API_URL` can point the frontend at a deployed API.

## Persistence behavior

Your editable team is stored in this browser's `localStorage` as a versioned object. Shared links are intentionally held in the Express server's memory, so they work only until the API restarts. That is the Week 3 limitation; database-backed storage belongs in Week 4.

## API

- `POST /api/analyze-team` — body: `{ "pokemonIds": [25, 94] }`
- `GET /api/random-team` — six distinct Pokémon selected from IDs 1–151
- `POST /api/shared-teams` — body: `{ "name": "My Team", "pokemonIds": [25] }`
- `GET /api/shared-teams/:shareId` — a read-only snapshot

Errors use `{ "error": { "code": "…", "message": "…" } }`.
