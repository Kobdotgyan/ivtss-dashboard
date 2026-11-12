# Intelligent Vehicle Telematics and Safety System (IVTSS)

A Phase 1 proof-of-concept dashboard for monitoring vehicle telemetry, driver safety, route risk, and fleet alerts. The project simulates telemetry data, stores it in SQLite, and exposes a simple API and web dashboard.

## Features

- Vehicle telemetry simulation for fleet and medical vehicle modules
- Safety alert detection for harsh driving, temperature, humidity, and speed anomalies
- Driver safety score calculation
- Fleet trend summaries and ranking by safety
- Route risk analysis over time windows
- SQLite-backed storage for telemetry and alerts
- Lightweight Node.js HTTP dashboard and API

## Tech Stack

- Node.js
- SQLite via `better-sqlite3`
- Vanilla HTML/CSS/JavaScript for the frontend
- Node test runner for validation

## Project Structure

- `server.js` - HTTP server and API routes
- `database.js` - SQLite schema and data access helpers
- `mock_sensor_data.js` - telemetry generation and safety analytics logic
- `database_schema.sql` - SQL database schema
- `public/index.html` - dashboard UI
- `tests/` - automated tests

## Installation

1. Open a terminal in the project folder.
2. Install dependencies:

```bash
npm install
```

## Run the Application

Start the server:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

## API Endpoints

### GET /api/health

Returns database and app status.

### GET /api/vehicles

Returns the fleet dashboard payload, including vehicle snapshots, alerts, fleet trends, and driver ranking.

### GET /api/telemetry?vehicleId=101

Generates and stores a telemetry update for a vehicle.

## Testing

Run the test suite:

```bash
npm test
```

Current status: all tests pass.

## Notes

This is a Phase 1 proof-of-concept designed to demonstrate telemetry monitoring and safety analytics. It is intended as a foundation for future enhancements such as real-time streaming, analytics dashboards, and expanded fleet management features.
