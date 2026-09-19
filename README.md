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

To run the backend tests, run `npm test`.

## Arrival predictions

Both v3 and v4 serve up to four vehicle-backed predictions for a stop or bus.
Magic Bus also returns scheduled departures with an empty vehicle ID (`vid: ""`),
including trips that may never run. The shared BusTime client excludes these
entries. It requests predictions without an upstream `top` limit, then filters
and takes the first four in upstream order so scheduled departures cannot hide
later live predictions. The remaining prediction fields and response metadata
retain their original wire format for v3 clients.

This follows the live-versus-scheduled distinction in the
[official Magic Bus web client](https://mbus.ltp.umich.edu/) and addresses the
[reported phantom arrivals](https://www.reddit.com/r/uofm/comments/1w5hfkk/a_psa_on_navigating_unreliable_buses_plus_long/).
A bus with broken tracking can therefore be absent even if it is operating;
these endpoints do not provide the full timetable or guarantee a trip will run.

## Configuration

Environment variables:

- `MBUS_API_KEY` (required) — Magic Bus API key.
- `PORT` — port to listen on. Defaults to 3000.
- `FEEDBACK_FILE` — path of the JSONL file user feedback is appended to. Defaults to `feedback.jsonl` in the working directory.

User-facing content (startup message, update notes, and the active bus icon variant) lives in `src/config/content.json`.
