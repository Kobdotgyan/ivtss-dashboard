// ==========================================
// IVTSS Mock Sensor Data Generator
// ==========================================

// This function simulates the ESP32 microcontroller reading physical sensors 
// and packaging the data into a JSON payload for cloud transmission.

function generateTelemetryPayload(vehicleId, moduleType, overrides = {}) {
    const speed = overrides.speed_kmh ?? Math.floor(Math.random() * 120);
    const engineRpm = overrides.engine_rpm ?? (Math.floor(Math.random() * 5200) + 800);

    const cabinTemp = overrides.cabin_temp_c ?? Number((Math.random() * (35 - 18) + 18).toFixed(1));
    const humidity = overrides.humidity_pct ?? Number((Math.random() * (80 - 30) + 30).toFixed(1));

    let accelerationG = overrides.acceleration_g ?? Number((Math.random() * 0.4 - 0.2).toFixed(2));
    if (overrides.acceleration_g === undefined && Math.random() < 0.10) {
        accelerationG = Number((Math.random() > 0.5 ? 0.8 : -0.9).toFixed(2));
    }

    return {
        vehicle_id: vehicleId,
        module_type: moduleType,
        timestamp: new Date().toISOString(),
        telemetry: {
            speed_kmh: speed,
            engine_rpm: engineRpm,
            cabin_temp_c: cabinTemp,
            humidity_pct: humidity,
            acceleration_g: accelerationG
        }
    };
}

function evaluateTelemetryAlert(telemetry, moduleType = 'Fleet') {
    const normalizedModule = (moduleType || 'Fleet').toLowerCase();

    if (normalizedModule === 'medical') {
        if (telemetry.cabin_temp_c < 2 || telemetry.cabin_temp_c > 8 || telemetry.humidity_pct > 65) {
            return {
                type: 'Temperature Alert',
                severity: 'High',
                message: 'Medical cold-chain threshold exceeded.'
            };
        }

        if (telemetry.speed_kmh > 80 || Math.abs(telemetry.acceleration_g) > 0.8) {
            return {
                type: 'Safety Warning',
                severity: 'Medium',
                message: 'Medical shipment is experiencing unstable movement.'
            };
        }

        return null;
    }

    if (normalizedModule === 'safety') {
        if (telemetry.speed_kmh > 95 || Math.abs(telemetry.acceleration_g) > 0.7) {
            return {
                type: 'Harsh Driving',
                severity: 'High',
                message: 'Unsafe driving pattern detected.'
            };
        }

        if (telemetry.speed_kmh > 75 && telemetry.engine_rpm > 4000) {
            return {
                type: 'Safety Warning',
                severity: 'Medium',
                message: 'High speed with elevated engine revs detected.'
            };
        }

        return null;
    }

    if (telemetry.speed_kmh > 90 || Math.abs(telemetry.acceleration_g) > 0.7) {
        return {
            type: 'Harsh Driving',
            severity: 'High',
            message: 'Unsafe driving pattern detected.'
        };
    }

    if (telemetry.cabin_temp_c > 30 || telemetry.humidity_pct > 70) {
        return {
            type: 'Temperature Alert',
            severity: 'High',
            message: 'Cabin environment exceeds safe operating range.'
        };
    }

    if (telemetry.speed_kmh > 70 && telemetry.engine_rpm > 4000) {
        return {
            type: 'Safety Warning',
            severity: 'Medium',
            message: 'High speed with elevated engine revs detected.'
        };
    }

    return null;
}

function calculateDriverSafetyScore(history = []) {
    if (!Array.isArray(history) || history.length === 0) {
        return 100;
    }

    let score = 100;

    history.forEach((reading) => {
        const speed = Number(reading.speed_kmh || 0);
        const rpm = Number(reading.engine_rpm || 0);
        const acceleration = Math.abs(Number(reading.acceleration_g || 0));

        if (speed > 80) score -= 15;
        if (speed > 100) score -= 20;
        if (rpm > 4000) score -= 12;
        if (acceleration > 0.5) score -= 20;
        if (acceleration > 0.8) score -= 25;
        if (speed > 70 && rpm > 3500) score -= 10;
    });

    if (score < 0) score = 0;
    if (score > 100) score = 100;

    return Math.round(score / Math.max(history.length, 1));
}

function summarizeDriverBehavior(history = []) {
    if (!Array.isArray(history) || history.length === 0) {
        return {
            riskLevel: 'Low Risk',
            summary: 'No recent driving events available for evaluation.',
            recommendations: ['Continue safe operating practices.']
        };
    }

    const highSpeedEvents = history.filter((entry) => Number(entry.speed_kmh || 0) > 85).length;
    const harshAccelerationEvents = history.filter((entry) => Math.abs(Number(entry.acceleration_g || 0)) > 0.6).length;
    const highRpmEvents = history.filter((entry) => Number(entry.engine_rpm || 0) > 4000).length;
    const score = calculateDriverSafetyScore(history);

    let riskLevel = 'Low Risk';
    if (score < 45) riskLevel = 'High Risk';
    else if (score < 70) riskLevel = 'Moderate Risk';

    const recommendations = [];
    if (highSpeedEvents > 0) {
        recommendations.push('Reduce highway speeding by maintaining a more conservative speed profile.');
    }
    if (harshAccelerationEvents > 0) {
        recommendations.push('Smooth acceleration and braking to avoid aggressive driving events.');
    }
    if (highRpmEvents > 0) {
        recommendations.push('Shift earlier and reduce engine load during acceleration to lower RPM stress.');
    }
    if (recommendations.length === 0) {
        recommendations.push('Excellent control. Continue current driving habits and routine maintenance checks.');
    }

    const summary = `Driver safety score is ${score}% with ${highSpeedEvents} speeding event(s), ${harshAccelerationEvents} harsh acceleration event(s), and ${highRpmEvents} high-RPM event(s).`;

    return {
        riskLevel,
        summary,
        recommendations
    };
}

function summarizeTripAnalytics(history = []) {
    if (!Array.isArray(history) || history.length === 0) {
        return {
            totalDistanceKm: 0,
            averageSpeedKmh: 0,
            maxSpeedKmh: 0,
            riskLevel: 'Low Risk',
            highlights: ['No trip data available.']
        };
    }

    const speeds = history.map((entry) => Number(entry.speed_kmh || 0));
    const maxSpeedKmh = Math.max(...speeds, 0);
    const averageSpeedKmh = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    const harshAccelerationEvents = history.filter((entry) => Math.abs(Number(entry.acceleration_g || 0)) > 0.6).length;
    const highSpeedEvents = history.filter((entry) => Number(entry.speed_kmh || 0) > 85).length;
    const highRpmEvents = history.filter((entry) => Number(entry.engine_rpm || 0) > 4000).length;

    const riskScore = Math.min(100, Math.max(0, 100 - Math.round((averageSpeedKmh / 2) + (harshAccelerationEvents * 12) + (highSpeedEvents * 8) + (highRpmEvents * 6))));
    let riskLevel = 'Low Risk';
    if (riskScore < 45) riskLevel = 'High Risk';
    else if (riskScore < 70) riskLevel = 'Moderate Risk';

    const highlights = [];
    if (maxSpeedKmh > 80) highlights.push(`Peak speed reached ${maxSpeedKmh} km/h.`);
    if (harshAccelerationEvents > 0) highlights.push(`${harshAccelerationEvents} harsh acceleration event(s) observed.`);
    if (highSpeedEvents > 0) highlights.push(`${highSpeedEvents} speeding event(s) detected.`);
    if (highRpmEvents > 0) highlights.push(`${highRpmEvents} high-RPM event(s) recorded.`);
    if (highlights.length === 0) highlights.push('Trip remained within normal operating limits.');

    const estimatedDistanceKm = Number((averageSpeedKmh * (history.length / 12)).toFixed(1));

    return {
        totalDistanceKm: estimatedDistanceKm,
        averageSpeedKmh: Number(averageSpeedKmh.toFixed(1)),
        maxSpeedKmh: Number(maxSpeedKmh.toFixed(1)),
        riskLevel,
        highlights,
        riskScore
    };
}

function summarizeFleetTrends(vehicles = []) {
    if (!Array.isArray(vehicles) || vehicles.length === 0) {
        return {
            averageSafetyScore: 0,
            highRiskVehicles: [],
            trendSummary: ['No fleet activity available.']
        };
    }

    const safetyScores = vehicles.map((vehicle) => Number(vehicle.driverSafetyScore ?? vehicle.score ?? 100));
    const averageSafetyScore = Math.round(safetyScores.reduce((sum, score) => sum + score, 0) / safetyScores.length);

    const highRiskVehicles = vehicles
        .filter((vehicle) => Number(vehicle.driverSafetyScore ?? 100) < 70 || (vehicle.alert && ['Medium', 'High'].includes(vehicle.alert.severity)))
        .map((vehicle) => ({
            vehicleId: vehicle.vehicleId ?? vehicle.id,
            name: vehicle.name,
            score: Number(vehicle.driverSafetyScore ?? 100),
            status: vehicle.status || 'Normal'
        }));

    const trendSummary = [];
    const riskCount = highRiskVehicles.length;
    if (riskCount > 0) {
        trendSummary.push(`${riskCount} vehicle(s) are below the desired safety threshold.`);
    }
    if (averageSafetyScore >= 85) {
        trendSummary.push('Fleet safety remains in a strong operating range.');
    } else if (averageSafetyScore >= 70) {
        trendSummary.push('Fleet performance is acceptable, with moderate risk concentration in a few vehicles.');
    } else {
        trendSummary.push('Fleet requires focused intervention and a review of high-risk driving patterns.');
    }

    return {
        averageSafetyScore,
        highRiskVehicles,
        trendSummary
    };
}

function rankDriversBySafety(vehicles = []) {
    if (!Array.isArray(vehicles) || vehicles.length === 0) {
        return [];
    }

    const severityWeight = { High: 3, Medium: 2, Low: 1, null: 0 };

    return [...vehicles]
        .map((vehicle) => ({
            vehicleId: vehicle.vehicleId ?? vehicle.id,
            name: vehicle.name,
            driverSafetyScore: Number(vehicle.driverSafetyScore ?? 100),
            status: vehicle.status || 'Normal',
            alertSeverity: vehicle.alert && vehicle.alert.severity ? vehicle.alert.severity : null,
            severityPenalty: severityWeight[vehicle.alert && vehicle.alert.severity ? vehicle.alert.severity : null] ?? 0
        }))
        .sort((left, right) => {
            const leftTotal = left.driverSafetyScore - (left.severityPenalty * 10);
            const rightTotal = right.driverSafetyScore - (right.severityPenalty * 10);
            return rightTotal - leftTotal;
        })
        .map((entry, index) => ({
            ...entry,
            rank: index + 1
        }));
}

function summarizeRouteRisk(history = [], windowLabel = '30m') {
    if (!Array.isArray(history) || history.length === 0) {
        return {
            riskScore: 0,
            windowLabel: String(windowLabel || '30m'),
            hotspots: ['No route activity available.'],
            summary: 'No route activity to evaluate.'
        };
    }

    const speeds = history.map((entry) => Number(entry.speed_kmh || 0));
    const maxSpeed = Math.max(...speeds, 0);
    const avgSpeed = speeds.reduce((sum, value) => sum + value, 0) / speeds.length;
    const harshAcceleration = history.filter((entry) => Math.abs(Number(entry.acceleration_g || 0)) > 0.6).length;
    const highSpeedEvents = history.filter((entry) => Number(entry.speed_kmh || 0) > 85).length;
    const highRpmEvents = history.filter((entry) => Number(entry.engine_rpm || 0) > 4000).length;

    const riskScore = Math.min(100, Math.max(0, Math.round(
        (avgSpeed / 2) +
        (harshAcceleration * 12) +
        (highSpeedEvents * 10) +
        (highRpmEvents * 8)
    )));

    const hotspots = [];
    if (maxSpeed > 80) hotspots.push(`Peak speed reached ${maxSpeed} km/h.`);
    if (harshAcceleration > 0) hotspots.push(`${harshAcceleration} harsh acceleration event(s) detected.`);
    if (highSpeedEvents > 0) hotspots.push(`${highSpeedEvents} speeding event(s) captured.`);
    if (highRpmEvents > 0) hotspots.push(`${highRpmEvents} elevated RPM event(s) observed.`);
    if (hotspots.length === 0) hotspots.push('No route hotspots recorded during this period.');

    const summary = `Route risk for the ${windowLabel} window is ${riskScore}/100 with an average speed of ${avgSpeed.toFixed(1)} km/h and ${hotspots.length} risk note(s).`;

    return {
        riskScore,
        windowLabel: String(windowLabel || '30m'),
        hotspots,
        summary
    };
}

function buildVehicleSnapshot(vehicle, telemetryOverride = null) {
    const telemetry = telemetryOverride
        ? generateTelemetryPayload(vehicle.id, vehicle.moduleType, telemetryOverride)
        : generateTelemetryPayload(vehicle.id, vehicle.moduleType);
    const alert = evaluateTelemetryAlert(telemetry.telemetry, vehicle.moduleType);

    let status = 'Normal';
    if (alert) {
        status = alert.severity === 'High' ? 'Alert' : 'Warning';
    }

    return {
        vehicleId: vehicle.id,
        name: vehicle.name,
        moduleType: vehicle.moduleType,
        speedKmh: telemetry.telemetry.speed_kmh,
        engineRpm: telemetry.telemetry.engine_rpm,
        cabinTempC: telemetry.telemetry.cabin_temp_c,
        humidityPct: telemetry.telemetry.humidity_pct,
        accelerationG: telemetry.telemetry.acceleration_g,
        status,
        alert: alert ? { type: alert.type, severity: alert.severity, message: alert.message } : null,
        timestamp: telemetry.timestamp
    };
}

if (require.main === module) {
    console.log('--- Starting IVTSS Mock Data Simulation ---');

    const fleetPayload = generateTelemetryPayload(101, 'Fleet');
    console.log('Fleet Module Payload:', JSON.stringify(fleetPayload, null, 2));

    const safetyPayload = generateTelemetryPayload(202, 'Safety');
    console.log('Safety Module Payload:', JSON.stringify(safetyPayload, null, 2));

    const medicalPayload = generateTelemetryPayload(303, 'Medical');
    console.log('Medical Module Payload:', JSON.stringify(medicalPayload, null, 2));

    console.log('--- Simulation Complete ---');
}

module.exports = {
    generateTelemetryPayload,
    evaluateTelemetryAlert,
    calculateDriverSafetyScore,
    summarizeDriverBehavior,
    summarizeTripAnalytics,
    summarizeFleetTrends,
    rankDriversBySafety,
    summarizeRouteRisk,
    buildVehicleSnapshot
};