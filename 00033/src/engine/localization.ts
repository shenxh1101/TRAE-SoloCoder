export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeTravelTime1D(
  velocityModel: Array<{ depth: number; vp: number }>,
  sourceDepth: number,
  distanceKm: number
): { pTime: number; sTime: number; takeoffAngle: number } {
  const sorted = [...velocityModel].sort((a, b) => a.depth - b.depth);
  if (sorted.length < 2 || distanceKm < 0.01) {
    let tt = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].depth >= sourceDepth) { tt += (sourceDepth - sorted[i - 1].depth) / sorted[i - 1].vp; break; }
      tt += (sorted[i].depth - sorted[i - 1].depth) / sorted[i - 1].vp;
    }
    return { pTime: tt, sTime: tt * 1.732, takeoffAngle: 0 };
  }

  function computeForAngle(angleDeg: number, vsRatio: number): { X: number; T: number } {
    const angleRad = (angleDeg * Math.PI) / 180;
    if (angleRad <= 0 || angleRad >= Math.PI / 2) return { X: 0, T: 0 };
    let vpSource = sorted[0].vp;
    let X = 0, T = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].depth >= sourceDepth) { vpSource = sorted[Math.max(0, i)].vp; break; }
      vpSource = sorted[i].vp;
    }
    const p = Math.sin(angleRad) / vpSource;
    let prevDepth = 0, prevVel = sorted[0].vp / vsRatio;
    for (let i = 0; i < sorted.length; i++) {
      const layerBottom = sorted[i].depth;
      const layerThick = layerBottom - prevDepth;
      const layerVel = sorted[i].vp / vsRatio;
      const vel = prevVel;
      const pv = p * vel;
      if (pv >= 1) { prevDepth = layerBottom; prevVel = layerVel; continue; }
      const cosEta = Math.sqrt(1 - pv * pv);
      const useThick = layerBottom >= sourceDepth ? sourceDepth - prevDepth : layerThick;
      if (useThick > 0) {
        X += useThick * pv / cosEta;
        T += useThick / (vel * cosEta);
      }
      if (layerBottom >= sourceDepth) break;
      prevDepth = layerBottom;
      prevVel = layerVel;
    }
    return { X, T };
  }

  function bisect(vsRatio: number): { angle: number; time: number } {
    let lo = 0.1, hi = 89.9;
    for (let iter = 0; iter < 60; iter++) {
      const mid = (lo + hi) / 2;
      const { X } = computeForAngle(mid, vsRatio);
      if (X < distanceKm) lo = mid; else hi = mid;
    }
    const result = computeForAngle((lo + hi) / 2, vsRatio);
    return { angle: (lo + hi) / 2, time: result.T };
  }

  const pResult = bisect(1);
  const sResult = bisect(1.732);
  return { pTime: pResult.time, sTime: sResult.time, takeoffAngle: pResult.angle };
}

function solve4x4(A: number[][], b: number[]): number[] {
  const n = 4;
  const aug: number[][] = [];
  for (let i = 0; i < n; i++) aug.push([...A[i], b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col, maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) { maxVal = Math.abs(aug[row][col]); maxRow = row; }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-20) continue;
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
    x[i] /= Math.abs(aug[i][i]) < 1e-20 ? 1e-20 : aug[i][i];
  }
  return x;
}

function eigenvalues2x2(m: number[][]): { values: number[]; vectors: number[][] } {
  const a = m[0][0], b = m[0][1], d = m[1][1];
  const trace = a + d;
  const det = a * d - b * b;
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det));
  const l1 = trace / 2 + disc;
  const l2 = trace / 2 - disc;
  let v1: number[], v2: number[];
  if (Math.abs(b) > 1e-14) {
    v1 = [b, l1 - a];
    v2 = [b, l2 - a];
  } else {
    v1 = [1, 0];
    v2 = [0, 1];
  }
  const n1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]) || 1;
  v1 = [v1[0] / n1, v1[1] / n1];
  const n2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]) || 1;
  v2 = [v2[0] / n2, v2[1] / n2];
  return { values: [l1, l2], vectors: [v1, v2] };
}

function gaussRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function geigerLocalization(params: {
  stations: Array<{ id: string; lat: number; lon: number; elevation: number; pArrivalTime: number }>;
  velocityModel: Array<{ depth: number; vp: number }>;
  initialGuess: { lat: number; lon: number; depth: number; originTime: number };
  maxIterations?: number;
  convergenceThreshold?: number;
}): {
  location: { lat: number; lon: number; depth: number; originTime: number };
  errorEllipse: { semiMajor: number; semiMinor: number; azimuth: number };
  residuals: number[];
  iterations: number;
  converged: boolean;
} {
  const { stations, velocityModel, initialGuess } = params;
  const maxIter = params.maxIterations ?? 50;
  const threshold = params.convergenceThreshold ?? 0.001;
  let lat = initialGuess.lat, lon = initialGuess.lon, depth = initialGuess.depth, originTime = initialGuess.originTime;
  const n = stations.length;
  let converged = false;
  let iter = 0;

  for (iter = 0; iter < maxIter; iter++) {
    const J: number[][] = [];
    const r: number[] = [];
    for (let i = 0; i < n; i++) {
      const dist = haversineDistance(lat, lon, stations[i].lat, stations[i].lon);
      const { pTime } = computeTravelTime1D(velocityModel, depth, dist);
      r.push(stations[i].pArrivalTime - (originTime + pTime));

      const dLat = 0.001;
      const distLat = haversineDistance(lat + dLat, lon, stations[i].lat, stations[i].lon);
      const ttLat = computeTravelTime1D(velocityModel, depth, distLat).pTime;
      const dtDlat = (ttLat - pTime) / dLat;

      const dLon = 0.001;
      const distLon = haversineDistance(lat, lon + dLon, stations[i].lat, stations[i].lon);
      const ttLon = computeTravelTime1D(velocityModel, depth, distLon).pTime;
      const dtDlon = (ttLon - pTime) / dLon;

      const dDepth = 0.1;
      const ttDepth = computeTravelTime1D(velocityModel, depth + dDepth, dist).pTime;
      const dtDdepth = (ttDepth - pTime) / dDepth;

      J.push([dtDlat, dtDlon, dtDdepth, 1.0]);
    }

    const JtJ: number[][] = Array.from({ length: 4 }, () => new Array(4).fill(0));
    const Jtr = new Array(4).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 4; j++) {
        Jtr[j] += J[i][j] * r[i];
        for (let k = 0; k < 4; k++) JtJ[j][k] += J[i][j] * J[i][k];
      }
    }

    const dx = solve4x4(JtJ, Jtr);
    lat += dx[0];
    lon += dx[1];
    depth += dx[2];
    originTime += dx[3];
    if (depth < 0) depth = 0.1;

    if (Math.max(...dx.map(Math.abs)) < threshold) { converged = true; iter++; break; }
  }

  const residuals: number[] = [];
  let sumRes2 = 0;
  for (let i = 0; i < n; i++) {
    const dist = haversineDistance(lat, lon, stations[i].lat, stations[i].lon);
    const { pTime } = computeTravelTime1D(velocityModel, depth, dist);
    const res = stations[i].pArrivalTime - (originTime + pTime);
    residuals.push(res);
    sumRes2 += res * res;
  }

  const J: number[][] = [];
  for (let i = 0; i < n; i++) {
    const dist = haversineDistance(lat, lon, stations[i].lat, stations[i].lon);
    const { pTime } = computeTravelTime1D(velocityModel, depth, dist);
    const dLat = 0.001;
    const distLat = haversineDistance(lat + dLat, lon, stations[i].lat, stations[i].lon);
    const dtDlat = (computeTravelTime1D(velocityModel, depth, distLat).pTime - pTime) / dLat;
    const dLon = 0.001;
    const distLon = haversineDistance(lat, lon + dLon, stations[i].lat, stations[i].lon);
    const dtDlon = (computeTravelTime1D(velocityModel, depth, distLon).pTime - pTime) / dLon;
    J.push([dtDlat, dtDlon]);
  }

  const JtJ2: number[][] = [[0, 0], [0, 0]];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) JtJ2[j][k] += J[i][j] * J[i][k];
  }

  const s2 = n > 4 ? sumRes2 / (n - 4) : sumRes2 / n;
  const cov2: number[][] = [[0, 0], [0, 0]];
  const det2 = JtJ2[0][0] * JtJ2[1][1] - JtJ2[0][1] * JtJ2[1][0];
  if (Math.abs(det2) > 1e-30) {
    cov2[0][0] = JtJ2[1][1] / det2;
    cov2[0][1] = -JtJ2[0][1] / det2;
    cov2[1][0] = -JtJ2[1][0] / det2;
    cov2[1][1] = JtJ2[0][0] / det2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) cov2[i][j] *= s2;
  }

  const eig = eigenvalues2x2(cov2);
  const chiSq = 5.991;
  const semiMajor = Math.sqrt(Math.max(0, eig.values[0]) * chiSq) * 111;
  const semiMinor = Math.sqrt(Math.max(0, eig.values[1]) * chiSq) * 111;
  const azimuth = (Math.atan2(eig.vectors[0][0], eig.vectors[0][1]) * 180) / Math.PI;

  return {
    location: { lat, lon, depth, originTime },
    errorEllipse: { semiMajor, semiMinor, azimuth },
    residuals,
    iterations: iter,
    converged,
  };
}

export function gridSearchLocalization(params: {
  stations: Array<{ id: string; lat: number; lon: number; elevation: number; pArrivalTime: number }>;
  velocityModel: Array<{ depth: number; vp: number }>;
  searchBounds: { minLat: number; maxLat: number; minLon: number; maxLon: number; minDepth: number; maxDepth: number };
  gridStep: number;
}): { location: { lat: number; lon: number; depth: number; originTime: number }; rms: number } {
  const { stations, velocityModel, searchBounds, gridStep } = params;
  let bestLat = searchBounds.minLat, bestLon = searchBounds.minLon, bestDepth = searchBounds.minDepth;
  let bestOriginTime = 0, bestRMS = Infinity;

  for (let lat = searchBounds.minLat; lat <= searchBounds.maxLat; lat += gridStep) {
    for (let lon = searchBounds.minLon; lon <= searchBounds.maxLon; lon += gridStep) {
      for (let depth = searchBounds.minDepth; depth <= searchBounds.maxDepth; depth += gridStep) {
        const originEstimates: number[] = [];
        for (const st of stations) {
          const dist = haversineDistance(lat, lon, st.lat, st.lon);
          const { pTime } = computeTravelTime1D(velocityModel, depth, dist);
          originEstimates.push(st.pArrivalTime - pTime);
        }
        originEstimates.sort((a, b) => a - b);
        const originTime = originEstimates[Math.floor(originEstimates.length / 2)];

        let sumRes2 = 0;
        for (const st of stations) {
          const dist = haversineDistance(lat, lon, st.lat, st.lon);
          const { pTime } = computeTravelTime1D(velocityModel, depth, dist);
          const res = st.pArrivalTime - (originTime + pTime);
          sumRes2 += res * res;
        }
        const rms = Math.sqrt(sumRes2 / stations.length);
        if (rms < bestRMS) {
          bestRMS = rms;
          bestLat = lat; bestLon = lon; bestDepth = depth; bestOriginTime = originTime;
        }
      }
    }
  }

  return { location: { lat: bestLat, lon: bestLon, depth: bestDepth, originTime: bestOriginTime }, rms: bestRMS };
}

export function generateArrivalTimes(
  trueLocation: { lat: number; lon: number; depth: number; originTime: number },
  stations: Array<{ id: string; lat: number; lon: number; elevation: number }>,
  velocityModel: Array<{ depth: number; vp: number }>,
  noiseLevel?: number
): Array<{ stationId: string; pArrivalTime: number; sArrivalTime: number }> {
  const noise = noiseLevel ?? 0.1;
  return stations.map((st) => {
    const dist = haversineDistance(trueLocation.lat, trueLocation.lon, st.lat, st.lon);
    const { pTime, sTime } = computeTravelTime1D(velocityModel, trueLocation.depth, dist);
    return {
      stationId: st.id,
      pArrivalTime: trueLocation.originTime + pTime + gaussRandom() * noise,
      sArrivalTime: trueLocation.originTime + sTime + gaussRandom() * noise,
    };
  });
}
