const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data', 'ivtss.db');

function ensureDatabaseDirectory() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createDatabase(filePath = DB_PATH) {
  ensureDatabaseDirectory();
  const db = new Database(filePath);

  const tableNames = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all();
  const normalizedNames = tableNames.map((row) => row.name.toLowerCase());

  const legacyTables = [
    'vehicles',
    'telemetry_logs',
    'alerts',
    'vehicles',
    'system_alerts',
    'telemetry_logs',
    'vehicle_assignments',
    'drivers',
    'vehicles'
  ];

  const shouldResetSchema = !normalizedNames.includes('vehicles') ||
    !normalizedNames.includes('telemetry_logs') ||
    !normalizedNames.includes('alerts') ||
    !db.prepare('PRAGMA table_info(vehicles)').all().some((col) => col.name === 'id') ||
    !db.prepare('PRAGMA table_info(telemetry_logs)').all().some((col) => col.name === 'id') ||
    !db.prepare('PRAGMA table_info(alerts)').all().some((col) => col.name === 'id');

  if (shouldResetSchema) {
    db.exec(`
      DROP TABLE IF EXISTS System_Alerts;
      DROP TABLE IF EXISTS Telemetry_Logs;
      DROP TABLE IF EXISTS Vehicle_Assignments;
      DROP TABLE IF EXISTS Drivers;
      DROP TABLE IF EXISTS Vehicles;
      DROP TABLE IF EXISTS vehicles;
      DROP TABLE IF EXISTS telemetry_logs;
      DROP TABLE IF EXISTS alerts;
    `);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      moduleType TEXT NOT NULL,
      status TEXT DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS telemetry_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      module_type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      speed_kmh INTEGER,
      engine_rpm INTEGER,
      cabin_temp_c REAL,
      humidity_pct REAL,
      acceleration_g REAL,
      FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
    );
  `);

  const seedVehicles = [
    { id: 101, name: 'Fleet Vehicle 101', moduleType: 'Fleet', status: 'Active' },
    { id: 202, name: 'Safety Vehicle 202', moduleType: 'Safety', status: 'Active' },
    { id: 303, name: 'Medical Vehicle 303', moduleType: 'Medical', status: 'Active' }
  ];

  for (const vehicle of seedVehicles) {
    db.prepare(
      `INSERT OR IGNORE INTO vehicles (id, name, moduleType, status)
       VALUES (@id, @name, @moduleType, @status)`
    ).run(vehicle);
  }

  return db;
}

function getVehicles(db) {
  return db.prepare(`SELECT * FROM vehicles ORDER BY id ASC`).all();
}

function addTelemetryRecord(db, vehicleId, moduleType, telemetry) {
  const timestamp = new Date().toISOString();
  db.prepare(`
    INSERT INTO telemetry_logs (
      vehicle_id,
      module_type,
      timestamp,
      speed_kmh,
      engine_rpm,
      cabin_temp_c,
      humidity_pct,
      acceleration_g
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    vehicleId,
    moduleType,
    timestamp,
    telemetry.speed_kmh,
    telemetry.engine_rpm,
    telemetry.cabin_temp_c,
    telemetry.humidity_pct,
    telemetry.acceleration_g
  );
}

function addAlert(db, vehicleId, alertType, severity, message) {
  db.prepare(`
    INSERT INTO alerts (vehicle_id, alert_type, severity, message, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(vehicleId, alertType, severity, message, new Date().toISOString());
}

function getLatestTelemetryByVehicle(db, vehicleId) {
  return db.prepare(`
    SELECT *
    FROM telemetry_logs
    WHERE vehicle_id = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(vehicleId);
}

function getRecentAlerts(db, limit = 10) {
  return db.prepare(`
    SELECT *
    FROM alerts
    ORDER BY id DESC
    LIMIT ?
  `).all(limit);
}

function getTelemetryHistory(db, vehicleId, limit = 20) {
  return db.prepare(`
    SELECT *
    FROM telemetry_logs
    WHERE vehicle_id = ?
    ORDER BY id DESC
    LIMIT ?
  `).all(vehicleId, limit);
}

module.exports = {
  createDatabase,
  getVehicles,
  addTelemetryRecord,
  addAlert,
  getLatestTelemetryByVehicle,
  getRecentAlerts,
  getTelemetryHistory
};
