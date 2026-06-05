export type CongestionHistoryPoint = {
  timestamp: number;
  congestionIndex: number;
  flowRate: number;
  avgSpeed: number;
};

export function predictCongestion(
  history: CongestionHistoryPoint[],
  horizonMinutes: number = 60
): { timestamp: number; congestionIndex: number; confidence: number }[] {
  if (history.length < 2) {
    const now = Date.now();
    const points: { timestamp: number; congestionIndex: number; confidence: number }[] = [];
    const base = history.length === 1 ? history[0].congestionIndex : 0.5;
    const steps = Math.floor(horizonMinutes / 5);
    for (let i = 1; i <= steps; i++) {
      points.push({
        timestamp: now + i * 5 * 60 * 1000,
        congestionIndex: base,
        confidence: 0.2,
      });
    }
    return points;
  }

  const alpha = 0.3;
  const beta = 0.1;

  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const values = sorted.map(p => p.congestionIndex);

  let level = values[0];
  let trend = values[1] - values[0];

  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const steps = Math.floor(horizonMinutes / 5);
  const lastTimestamp = sorted[sorted.length - 1].timestamp;
  const intervalMs = 5 * 60 * 1000;

  const predictions: { timestamp: number; congestionIndex: number; confidence: number }[] = [];

  for (let m = 1; m <= steps; m++) {
    const rawPrediction = level + trend * m;
    const congestionIndex = Math.max(0, Math.min(1, rawPrediction));
    const confidence = Math.max(0.1, 0.95 * Math.exp(-0.03 * m));

    predictions.push({
      timestamp: lastTimestamp + m * intervalMs,
      congestionIndex,
      confidence,
    });
  }

  return predictions;
}

export function updateRoadCongestion(
  road: { congestionIndex: number; avgSpeed: number; lanes: number },
  deltaTime: number,
  nearbyEvents: number
): { congestionIndex: number; avgSpeed: number } {
  const momentum = 0.85;
  const speedMax = 60;
  const speedMin = 5;

  const speedFromCongestion = speedMax * (1 - road.congestionIndex * 0.8);
  const targetSpeed = Math.max(speedMin, Math.min(speedMax, speedFromCongestion));
  const dtSeconds = deltaTime / 1000;
  const speedBlend = Math.min(1, dtSeconds / 30);
  const newSpeed = road.avgSpeed + (targetSpeed - road.avgSpeed) * speedBlend;

  const congestionFromSpeed = 1 - (newSpeed - speedMin) / (speedMax - speedMin);

  const eventImpact = nearbyEvents * 0.08;

  const congestionMomentum = road.congestionIndex * momentum;

  const fluctuation = (Math.random() - 0.5) * 0.04;

  let newCongestion = congestionMomentum * 0.4 + congestionFromSpeed * 0.35 + eventImpact + fluctuation;

  const laneRelief = road.lanes > 2 ? (road.lanes - 2) * 0.02 : 0;
  newCongestion = Math.max(0, Math.min(1, newCongestion - laneRelief));

  const finalSpeed = Math.max(speedMin, Math.min(speedMax, speedMax * (1 - newCongestion * 0.8)));

  return {
    congestionIndex: newCongestion,
    avgSpeed: finalSpeed,
  };
}

export function generateHistoricalData(
  baseCongestion: number,
  hours: number = 2
): CongestionHistoryPoint[] {
  const now = Date.now();
  const intervalMs = 5 * 60 * 1000;
  const totalPoints = Math.floor((hours * 60) / 5);
  const data: CongestionHistoryPoint[] = [];

  for (let i = 0; i < totalPoints; i++) {
    const timestamp = now - (totalPoints - i) * intervalMs;
    const date = new Date(timestamp);
    const hour = date.getHours();

    let rushMultiplier = 1.0;
    if (hour >= 8 && hour < 9) {
      rushMultiplier = 1.6;
    } else if (hour >= 9 && hour < 10) {
      rushMultiplier = 1.3;
    } else if (hour >= 17 && hour < 18) {
      rushMultiplier = 1.7;
    } else if (hour >= 18 && hour < 19) {
      rushMultiplier = 1.4;
    } else if (hour >= 7 && hour < 8) {
      rushMultiplier = 1.2;
    } else if (hour >= 12 && hour < 13) {
      rushMultiplier = 1.15;
    } else if (hour >= 22 || hour < 6) {
      rushMultiplier = 0.5;
    }

    const noise = (Math.random() - 0.5) * 0.1;
    const congestionIndex = Math.max(0, Math.min(1, baseCongestion * rushMultiplier + noise));

    const speedMax = 60;
    const speedMin = 5;
    const avgSpeed = speedMin + (1 - congestionIndex) * (speedMax - speedMin);

    const flowMax = 2000;
    const flowRate = congestionIndex * flowMax * (0.8 + Math.random() * 0.4);

    data.push({
      timestamp,
      congestionIndex,
      flowRate: Math.round(flowRate),
      avgSpeed: Math.round(avgSpeed * 10) / 10,
    });
  }

  return data;
}

export function calculateHeatmapIntensity(
  predictions: { congestionIndex: number; confidence: number }[],
  currentCongestion: number
): number {
  const currentWeight = 0.5;

  if (predictions.length === 0) {
    return Math.max(0, Math.min(1, currentCongestion));
  }

  const weightedSum = predictions.reduce((sum, p) => sum + p.congestionIndex * p.confidence, 0);
  const totalConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0);

  const predictedAverage = totalConfidence > 0 ? weightedSum / totalConfidence : 0;

  const intensity = currentCongestion * currentWeight + predictedAverage * (1 - currentWeight);

  return Math.max(0, Math.min(1, intensity));
}
