-- ==========================================
-- IVTSS Database Schema Creation
-- SQLite-compatible version
-- ==========================================

DROP TABLE IF EXISTS System_Alerts;
DROP TABLE IF EXISTS Telemetry_Logs;
DROP TABLE IF EXISTS Vehicle_Assignments;
DROP TABLE IF EXISTS Drivers;
DROP TABLE IF EXISTS Vehicles;

-- 1. Create Vehicles Table
CREATE TABLE Vehicles (
    vehicle_id INTEGER PRIMARY KEY,
    license_plate TEXT UNIQUE NOT NULL,
    vehicle_type TEXT NOT NULL,
    module_type TEXT NOT NULL CHECK (module_type IN ('Fleet', 'Safety', 'Medical'))
);

-- 2. Create Drivers Table
CREATE TABLE Drivers (
    driver_id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    contact_phone TEXT
);

-- 3. Create Vehicle_Assignments Table
CREATE TABLE Vehicle_Assignments (
    assignment_id INTEGER PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    start_date TEXT DEFAULT CURRENT_TIMESTAMP,
    end_date TEXT,
    FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id),
    FOREIGN KEY (driver_id) REFERENCES Drivers(driver_id)
);

-- 4. Create Telemetry_Logs Table
CREATE TABLE Telemetry_Logs (
    log_id INTEGER PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    speed_kmh REAL,
    engine_rpm INTEGER,
    cabin_temp_c REAL,
    humidity_pct REAL,
    acceleration_g REAL,
    FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id)
);

-- 5. Create System_Alerts Table
CREATE TABLE System_Alerts (
    alert_id INTEGER PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    log_id INTEGER NOT NULL,
    alert_type TEXT NOT NULL,
    severity_level TEXT NOT NULL CHECK (severity_level IN ('Low', 'Medium', 'Critical')),
    is_resolved INTEGER DEFAULT 0,
    FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id),
    FOREIGN KEY (log_id) REFERENCES Telemetry_Logs(log_id)
);

-- ==========================================
-- Insert Sample Data
-- ==========================================

INSERT INTO Vehicles (vehicle_id, license_plate, vehicle_type, module_type)
VALUES
(101, 'GR-1234-22', 'Sedan', 'Fleet'),
(202, 'MT-5678-23', 'Bus', 'Safety'),
(303, 'MD-9012-24', 'Refrigerated Van', 'Medical');

INSERT INTO Drivers (driver_id, first_name, last_name, license_number, contact_phone)
VALUES
(1, 'Kwame', 'Mensah', 'DL-1001', '+233200000001'),
(2, 'Ama', 'Boateng', 'DL-1002', '+233200000002'),
(3, 'Kofi', 'Owusu', 'DL-1003', '+233200000003');

INSERT INTO Vehicle_Assignments (assignment_id, vehicle_id, driver_id, start_date, end_date)
VALUES
(1, 101, 1, '2026-11-01 08:00:00', NULL),
(2, 202, 2, '2026-11-01 08:00:00', NULL),
(3, 303, 3, '2026-11-01 08:00:00', NULL);

INSERT INTO Telemetry_Logs (log_id, vehicle_id, timestamp, speed_kmh, engine_rpm, cabin_temp_c, humidity_pct, acceleration_g)
VALUES
(1, 101, '2026-11-09 10:00:00', 65.5, 2500, 24.5, 55.0, 0.12),
(2, 202, '2026-11-09 10:00:05', 80.0, 3200, 28.0, 60.0, -0.85),
(3, 303, '2026-11-09 10:00:10', 45.0, 1800, 8.5, 40.0, 0.05);

INSERT INTO System_Alerts (alert_id, vehicle_id, log_id, alert_type, severity_level, is_resolved)
VALUES
(1, 202, 2, 'Harsh Braking', 'Medium', 0),
(2, 303, 3, 'Temperature Exceeded', 'Critical', 0);

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
