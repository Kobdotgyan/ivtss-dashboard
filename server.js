const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  generateTelemetryPayload,
  evaluateTelemetryAlert,
  calculateDriverSafetyScore,
  summarizeDriverBehavior,
  summarizeTripAnalytics,
  summarizeFleetTrends,
  rankDriversBySafety,
  summarizeRouteRisk,
  buildVehicleSnapshot
} = require('./mock_sensor_data.js');
const {
  createDatabase,
  getVehicles,
  addTelemetryRecord,
  addAlert,
  getLatestTelemetryByVehicle,
  getRecentAlerts,
  getTelemetryHistory
} = require('./database.js');

const DEFAULT_PORT = 3000;
const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const db = createDatabase();

function readFileSafe(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function getVehicleSnapshot(vehicle) {
  const latestTelemetry = getLatestTelemetryByVehicle(db, vehicle.id) || {
    speed_kmh: 0,
    engine_rpm: 0,
    cabin_temp_c: 0,
    humidity_pct: 0,
    acceleration_g: 0
  };

  const history = getTelemetryHistory(db, vehicle.id, 6);
  const alert = evaluateTelemetryAlert(latestTelemetry, vehicle.moduleType);
  const driverBehavior = summarizeDriverBehavior(history);
  const tripAnalytics = summarizeTripAnalytics(history);
  const routeRisk = summarizeRouteRisk(history, '30m');

  return {
    vehicleId: vehicle.id,
    name: vehicle.name,
    moduleType: vehicle.moduleType,
    speedKmh: latestTelemetry.speed_kmh,
    engineRpm: latestTelemetry.engine_rpm,
    cabinTempC: latestTelemetry.cabin_temp_c,
    humidityPct: latestTelemetry.humidity_pct,
    accelerationG: latestTelemetry.acceleration_g,
    status: alert ? (alert.severity === 'High' ? 'Alert' : 'Warning') : 'Normal',
    alert: alert ? { type: alert.type, severity: alert.severity, message: alert.message } : null,
    timestamp: latestTelemetry.timestamp || new Date().toISOString(),
    driverSafetyScore: calculateDriverSafetyScore(history),
    driverBehavior,
    tripAnalytics,
    routeRisk,
    history: history.map((entry) => ({
      timestamp: entry.timestamp,
      speedKmh: entry.speed_kmh,
      engineRpm: entry.engine_rpm,
      cabinTempC: entry.cabin_temp_c,
      humidityPct: entry.humidity_pct,
      accelerationG: entry.acceleration_g
    }))
  };
}

function getDashboardPayload(filterModule = null) {
  const vehicles = getVehicles(db).filter((vehicle) => !filterModule || vehicle.moduleType === filterModule);

  vehicles.forEach((vehicle) => {
    const newPayload = generateTelemetryPayload(vehicle.id, vehicle.moduleType);
    addTelemetryRecord(db, vehicle.id, vehicle.moduleType, newPayload.telemetry);

    const alert = evaluateTelemetryAlert(newPayload.telemetry, vehicle.moduleType);
    if (alert) {
      addAlert(db, vehicle.id, alert.type, alert.severity, alert.message);
    }
  });

  const snapshots = vehicles.map(getVehicleSnapshot);
  const alerts = getRecentAlerts(db, 10);
  const fleetTrends = summarizeFleetTrends(snapshots);
  const driverRanking = rankDriversBySafety(snapshots);

  return {
    vehicles: snapshots,
    alerts: alerts.map((alert) => ({
      vehicleId: alert.vehicle_id,
      type: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp
    })).reverse(),
    fleetTrends,
    driverRanking
  };
}

function seedTelemetry() {
  const vehicles = getVehicles(db);
  vehicles.forEach((vehicle) => {
    const payload = generateTelemetryPayload(vehicle.id, vehicle.moduleType);
    addTelemetryRecord(db, vehicle.id, vehicle.moduleType, payload.telemetry);

    const alert = evaluateTelemetryAlert(payload.telemetry);
    if (alert) {
      addAlert(db, vehicle.id, alert.type, alert.severity, alert.message);
    }
  });
}

function startServer(port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/vehicles') {
      const moduleFilter = url.searchParams.get('module');
      const payload = getDashboardPayload(moduleFilter);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload, null, 2));
      return;
    }

    if (url.pathname === '/api/telemetry') {
      const vehicleId = Number(url.searchParams.get('vehicleId')) || 101;
      const vehicle = getVehicles(db).find((item) => item.id === vehicleId) || getVehicles(db)[0];
      const payload = generateTelemetryPayload(vehicle.id, vehicle.moduleType);
      addTelemetryRecord(db, vehicle.id, vehicle.moduleType, payload.telemetry);
      const alert = evaluateTelemetryAlert(payload.telemetry, vehicle.moduleType);
      if (alert) {
        addAlert(db, vehicle.id, alert.type, alert.severity, alert.message);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload, null, 2));
      return;
    }

    if (url.pathname === '/api/health') {
      const payload = {
        status: 'ok',
        vehicles: getVehicles(db).length,
        telemetryCount: db.prepare('SELECT COUNT(*) AS count FROM telemetry_logs').get().count,
        alertsCount: db.prepare('SELECT COUNT(*) AS count FROM alerts').get().count
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload, null, 2));
      return;
    }

    const indexPath = path.join(__dirname, 'public', 'index.html');

    if (fs.existsSync(indexPath) && url.pathname === '/') {
      const html = readFileSafe(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const fallbackPort = port === DEFAULT_PORT ? DEFAULT_PORT + 1 : DEFAULT_PORT;
      console.log(`Port ${port} is busy. Retrying on http://localhost:${fallbackPort}`);
      startServer(fallbackPort);
      return;
    }
    throw error;
  });

  server.listen(port, () => {
    seedTelemetry();
    console.log(`IVTSS Phase 1 dashboard running at http://localhost:${port}`);
  });
}

startServer(PORT);

module.exports = {
  generateTelemetryPayload,
  evaluateTelemetryAlert,
  calculateDriverSafetyScore,
  buildVehicleSnapshot,
  createDatabase,
  getVehicles,
  addTelemetryRecord,
  addAlert,
  getLatestTelemetryByVehicle,
  getRecentAlerts,
  getTelemetryHistory
};
