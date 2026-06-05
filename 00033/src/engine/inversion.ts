export function mechanismToMT(strike: number, dip: number, rake: number): number[] {
  const s = (strike * Math.PI) / 180, d = (dip * Math.PI) / 180, r = (rake * Math.PI) / 180;
  const sd = Math.sin(d), cd = Math.cos(d), ss = Math.sin(s), cs = Math.cos(s);
  const sr = Math.sin(r), cr = Math.cos(r);
  const s2d = Math.sin(2 * d), s2s = Math.sin(2 * s), c2s = Math.cos(2 * s);
  const mrr = s2d * sr;
  const mtt = -sd * cr * s2s - s2d * sr * ss * ss;
  const mpp = sd * cr * s2s - s2d * sr * cs * cs;
  const mrt = cd * cr * cs + cd * sr * ss;
  const mrp = -cd * cr * ss + cd * sr * cs;
  const mtp = -sd * cr * c2s - 0.5 * s2d * sr * s2s;
  return [mrr, mtt, mpp, mrt, mrp, mtp];
}

function constructMTMatrix(mrr: number, mtt: number, mpp: number, mrt: number, mrp: number, mtp: number): number[][] {
  return [[mrr, mrt, mrp], [mrt, mtt, mtp], [mrp, mtp, mpp]];
}

function eigenvalues3x3Symmetric(m: number[][]): number[] {
  const a = m[0][0], b = m[1][1], c = m[2][2], d = m[0][1], e = m[0][2], f = m[1][2];
  const p2 = d * d + e * e + f * f;
  if (p2 < 1e-20) return [a, b, c].sort((x, y) => y - x);
  const q = (a + b + c) / 3, p = Math.sqrt(p2);
  const invP = 1 / p;
  const B = (a - q) * invP, C = (b - q) * invP, D = (c - q) * invP;
  const det = B * (C * D - 1) - C - D;
  const phi = Math.acos(Math.max(-1, Math.min(1, det / 2))) / 3;
  const eig1 = q + 2 * p * Math.cos(phi);
  const eig3 = q + 2 * p * Math.cos(phi + (2 * Math.PI) / 3);
  const eig2 = 3 * q - eig1 - eig3;
  return [eig1, eig2, eig3].sort((x, y) => y - x);
}

function eigenvectorForEigenvalue(m: number[][], eigenvalue: number): number[] {
  const rows: number[][] = [
    [m[0][0] - eigenvalue, m[0][1], m[0][2]],
    [m[0][1], m[1][1] - eigenvalue, m[1][2]],
    [m[0][2], m[1][2], m[2][2] - eigenvalue],
  ];
  let bestVec: number[] = [1, 0, 0], bestNorm = 0;
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3, k = (i + 2) % 3;
    const v = [
      rows[j][1] * rows[k][2] - rows[j][2] * rows[k][1],
      rows[j][2] * rows[k][0] - rows[j][0] * rows[k][2],
      rows[j][0] * rows[k][1] - rows[j][1] * rows[k][0],
    ];
    const norm = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (norm > bestNorm) { bestNorm = norm; bestVec = [v[0] / norm, v[1] / norm, v[2] / norm]; }
  }
  return bestNorm < 1e-14 ? [1, 0, 0] : bestVec;
}

function nodalPlaneFromNormal(ne: number, nn: number, nz: number): { strike: number; dip: number; rake: number } {
  const norm = Math.sqrt(ne * ne + nn * nn + nz * nz);
  const neN = ne / norm, nnN = nn / norm, nzN = nz / norm;
  let dip = Math.acos(Math.max(-1, Math.min(1, -nzN)));
  let strike: number;
  if (Math.abs(nnN) < 1e-10 && Math.abs(neN) < 1e-10) { strike = 0; }
  else { strike = Math.atan2(-neN, -nnN); if (strike < 0) strike += 2 * Math.PI; }
  if (dip > Math.PI / 2) { dip = Math.PI - dip; strike += Math.PI; }
  if (strike >= 2 * Math.PI) strike -= 2 * Math.PI;
  if (strike < 0) strike += 2 * Math.PI;
  const sinD = Math.sin(dip), sinS = Math.sin(strike), cosS = Math.cos(strike);
  let rake: number;
  if (Math.abs(sinD) < 1e-10) { rake = 0; }
  else { const sR = -(nzN * cosS - nnN * sinS) / sinD; const cR = neN * cosS + nnN * sinS; rake = Math.atan2(sR, cR); }
  return { strike: (strike * 180) / Math.PI, dip: (dip * 180) / Math.PI, rake: (rake * 180) / Math.PI };
}

export function mtToMechanism(mt: { mrr: number; mtt: number; mpp: number; mrt: number; mrp: number; mtp: number }): {
  strike1: number; dip1: number; rake1: number; strike2: number; dip2: number; rake2: number;
} {
  const matrix = constructMTMatrix(mt.mrr, mt.mtt, mt.mpp, mt.mrt, mt.mrp, mt.mtp);
  const eigenvals = eigenvalues3x3Symmetric(matrix);
  const tAxis = eigenvectorForEigenvalue(matrix, eigenvals[0]);
  const pAxis = eigenvectorForEigenvalue(matrix, eigenvals[2]);
  function rtpToEnz(r: number, theta: number, phi: number): [number, number, number] {
    return [theta * Math.cos(phi) - phi * Math.sin(phi), theta * Math.sin(phi) + phi * Math.cos(phi), -r];
  }
  const [tE, tN, tZ] = rtpToEnz(tAxis[0], tAxis[1], tAxis[2]);
  const [pE, pN, pZ] = rtpToEnz(pAxis[0], pAxis[1], pAxis[2]);
  const np1 = nodalPlaneFromNormal(pE, pN, pZ);
  const np2 = nodalPlaneFromNormal(tE, tN, tZ);
  return { strike1: np1.strike, dip1: np1.dip, rake1: np1.rake, strike2: np2.strike, dip2: np2.dip, rake2: np2.rake };
}

function rickerWavelet(t: number, f0: number): number {
  const u = (Math.PI * f0 * t) ** 2;
  return (1 - 2 * u) * Math.exp(-u);
}

export function computeSyntheticSeismogram(
  mt: number[], velocityModel: Array<{ depth: number; vp: number }>,
  sourceDepth: number, stationDistance: number, sampleRate: number, duration: number
): number[] {
  const [mrr, mtt, mpp, mrt, mrp, mtp] = mt;
  const nSamples = Math.floor(duration * sampleRate);
  const result = new Array(nSamples).fill(0);
  if (velocityModel.length < 2 || stationDistance < 0.01) return result;
  const sortedModel = [...velocityModel].sort((a, b) => a.depth - b.depth);

  function computeTravelTimeAndTakeoff(depth: number, vsRatio: number): { travelTime: number; takeoffAngle: number } {
    let totalTT = 0, prevDepth = 0, prevVel = sortedModel[0].vp / vsRatio;
    for (let i = 0; i < sortedModel.length; i++) {
      const layerDepth = sortedModel[i].depth, layerThick = layerDepth - prevDepth;
      if (layerThick > 0 && prevVel > 0) totalTT += layerThick / prevVel;
      if (layerDepth >= depth) {
        const rem = depth - (i > 0 ? sortedModel[i - 1].depth : 0);
        if (prevVel > 0 && rem > 0) totalTT += rem / prevVel;
        break;
      }
      prevDepth = layerDepth; prevVel = sortedModel[i].vp / vsRatio;
    }
    const takeoffAngle = stationDistance > 0 ? Math.atan2(depth, stationDistance) : 0;
    return { travelTime: totalTT, takeoffAngle };
  }

  const pResult = computeTravelTimeAndTakeoff(sourceDepth, 1);
  const sResult = computeTravelTimeAndTakeoff(sourceDepth, 1.732);
  const vp0 = sortedModel[0].vp || 1;
  const pTravelTime = Math.sqrt(pResult.travelTime ** 2 + (stationDistance / vp0) ** 2);
  const sTravelTime = Math.sqrt(sResult.travelTime ** 2 + (stationDistance / (vp0 / 1.732)) ** 2);

  const theta = pResult.takeoffAngle, phi = 0;
  const sT = Math.sin(theta), cT = Math.cos(theta), sP = Math.sin(phi), cP = Math.cos(phi);
  const st2 = sT * sT;
  const pRad = mrr * (1 - 3 * st2) + (mtt + mpp) * (3 * st2 - 1) * 0.5
    + 3 * mrt * sT * cT * cP + 3 * mrp * sT * cT * sP + 3 * mtp * st2 * sP * cP;
  const sRad = 2 * mrt * cT * cP + 2 * mrp * cT * sP + 2 * (mtt - mpp) * sT * sP * cP;
  const r = stationDistance > 1 ? stationDistance : 1;
  const pAmp = pRad / (r * 0.5), sAmp = sRad / (r * 0.5) * 0.7;
  const f0 = sampleRate / 20, dt = 1 / sampleRate;
  for (let i = 0; i < nSamples; i++) {
    const t = i * dt;
    result[i] = pAmp * rickerWavelet(t - pTravelTime, f0) + sAmp * rickerWavelet(t - sTravelTime, f0 * 0.577);
  }
  return result;
}

export function computeResidual(observed: number[], synthetic: number[]): number {
  const n = Math.min(observed.length, synthetic.length);
  if (n === 0) return Infinity;
  let sumDiff2 = 0, sumObs2 = 0;
  for (let i = 0; i < n; i++) { const d = observed[i] - synthetic[i]; sumDiff2 += d * d; sumObs2 += observed[i] * observed[i]; }
  return sumObs2 < 1e-20 ? Infinity : Math.sqrt(sumDiff2) / Math.sqrt(sumObs2);
}

function mtToMech6(mt: number[]): { strike: number; dip: number; rake: number } {
  const m = mtToMechanism({ mrr: mt[0], mtt: mt[1], mpp: mt[2], mrt: mt[3], mrp: mt[4], mtp: mt[5] });
  return { strike: m.strike1, dip: m.dip1, rake: m.rake1 };
}

type VModel = Array<{ depth: number; vp: number }>;
type ConvHist = Array<{ iteration: number; residual: number }>;
type Mech = { strike: number; dip: number; rake: number };

export function gridSearchInversion(params: {
  observedWaveform: number[]; sampleRate: number; velocityModel: VModel;
  sourceDepth: number; stationDistances: number[];
  searchRange: { strikeMin: number; strikeMax: number; dipMin: number; dipMax: number; rakeMin: number; rakeMax: number };
  searchStep: number; onIteration?: (iteration: number, bestResidual: number, currentMT: number[]) => void;
}): { bestMT: number[]; bestMechanism: Mech; bestResidual: number; convergenceHistory: ConvHist } {
  const { observedWaveform, sampleRate, velocityModel, sourceDepth, stationDistances, searchRange, searchStep, onIteration } = params;
  const duration = observedWaveform.length / sampleRate;
  let bestMT: number[] = [0, 0, 0, 0, 0, 0], bestResidual = Infinity;
  let bestStrike = 0, bestDip = 0, bestRake = 0;
  const convergenceHistory: ConvHist = [];
  let iteration = 0;
  for (let strike = searchRange.strikeMin; strike <= searchRange.strikeMax; strike += searchStep) {
    for (let dip = searchRange.dipMin; dip <= searchRange.dipMax; dip += searchStep) {
      for (let rake = searchRange.rakeMin; rake <= searchRange.rakeMax; rake += searchStep) {
        const mt = mechanismToMT(strike, dip, rake);
        let totalRes = 0;
        for (const dist of stationDistances) {
          totalRes += computeResidual(observedWaveform, computeSyntheticSeismogram(mt, velocityModel, sourceDepth, dist, sampleRate, duration));
        }
        const avgRes = totalRes / stationDistances.length;
        if (avgRes < bestResidual) { bestResidual = avgRes; bestMT = mt; bestStrike = strike; bestDip = dip; bestRake = rake; }
        iteration++;
        if (iteration % 10 === 0 || avgRes < bestResidual) {
          convergenceHistory.push({ iteration, residual: bestResidual });
          if (onIteration) onIteration(iteration, bestResidual, bestMT);
        }
      }
    }
  }
  return { bestMT, bestMechanism: { strike: bestStrike, dip: bestDip, rake: bestRake }, bestResidual, convergenceHistory };
}

export function gradientOptimization(params: {
  observedWaveform: number[]; sampleRate: number; initialMT: number[];
  velocityModel: VModel; sourceDepth: number; stationDistances: number[];
  maxIterations: number; convergenceThreshold: number; learningRate: number;
  onIteration?: (iteration: number, residual: number, mt: number[]) => void;
}): { bestMT: number[]; bestMechanism: Mech; bestResidual: number; convergenceHistory: ConvHist } {
  const { observedWaveform, sampleRate, initialMT, velocityModel, sourceDepth, stationDistances,
    maxIterations, convergenceThreshold, learningRate, onIteration } = params;
  const duration = observedWaveform.length / sampleRate;
  let mt = [...initialMT];
  const convergenceHistory: ConvHist = [];
  let prevResidual = Infinity;

  function evaluateMT(cmt: number[]): number {
    let total = 0;
    for (const dist of stationDistances)
      total += computeResidual(observedWaveform, computeSyntheticSeismogram(cmt, velocityModel, sourceDepth, dist, sampleRate, duration));
    return total / stationDistances.length;
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    const cur = evaluateMT(mt);
    convergenceHistory.push({ iteration: iter, residual: cur });
    if (onIteration) onIteration(iter, cur, mt);
    if (iter > 0 && Math.abs(prevResidual - cur) < convergenceThreshold) break;
    prevResidual = cur;
    const gradient: number[] = [];
    const eps = 1e-5;
    for (let j = 0; j < 6; j++) {
      const p = [...mt]; p[j] += eps;
      const m = [...mt]; m[j] -= eps;
      gradient.push((evaluateMT(p) - evaluateMT(m)) / (2 * eps));
    }
    for (let j = 0; j < 6; j++) mt[j] -= learningRate * gradient[j];
  }
  return { bestMT: mt, bestMechanism: mtToMech6(mt), bestResidual: evaluateMT(mt), convergenceHistory };
}
