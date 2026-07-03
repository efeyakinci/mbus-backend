# M-Bus Backend

## Requirements

Node.js 24 or newer — the server runs TypeScript directly via Node's native type stripping.

## Setup

First, obtain an API key for the Magic Bus backend from [the official Magic Bus Website](https://mbus.ltp.umich.edu/dev-account).

Then, define the `MBUS_API_KEY` environment variable with your API key, either in your shell or in a `.env` file at the repository root.

To install dependencies, run `npm i`

## Running the Backend

To run the backend, run `npm start`.

To type-check, run `npm run typecheck`.

Environment variables:

- `MBUS_API_KEY` (required) — Magic Bus API key.
- `PORT` — port to listen on. Defaults to 3000.
- `FEEDBACK_FILE` — path of the JSONL file user feedback is appended to. Defaults to `feedback.jsonl` in the working directory.

User-facing content (startup message, update notes, and the active bus icon variant) lives in `src/config/content.json`.
