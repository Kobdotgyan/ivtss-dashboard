const fs = require('fs');
const Database = require('better-sqlite3');

const db = new Database('data/ivtss.db');
db.exec(fs.readFileSync('database_schema.sql', 'utf8'));

const query = `
SELECT
    v.vehicle_id,
    v.license_plate,
    v.vehicle_type,
    d.first_name || ' ' || d.last_name AS driver_name,
    tl.timestamp,
    tl.speed_kmh,
    tl.engine_rpm,
    tl.cabin_temp_c,
    tl.humidity_pct,
    tl.acceleration_g,
    sa.alert_type,
    sa.severity_level
FROM Vehicles v
JOIN Vehicle_Assignments va ON va.vehicle_id = v.vehicle_id
JOIN Drivers d ON d.driver_id = va.driver_id
JOIN Telemetry_Logs tl ON tl.vehicle_id = v.vehicle_id
LEFT JOIN System_Alerts sa ON sa.log_id = tl.log_id AND sa.vehicle_id = v.vehicle_id
WHERE va.end_date IS NULL
ORDER BY v.vehicle_id;
`;

const rows = db.prepare(query).all();
console.log(JSON.stringify(rows));
console.log('ROW_COUNT=' + rows.length);
