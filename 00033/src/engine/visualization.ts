import { mechanismToMT } from './inversion';

export function renderBeachBall(
  canvas: HTMLCanvasElement,
  strike: number, dip: number, rake: number,
  options?: { projection?: 'equal-area' | 'conformal'; darkColor?: string; lightColor?: string }
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  const r = Math.min(cx, cy) - 10;
  const projection = options?.projection || 'equal-area';
  const darkColor = options?.darkColor || '#1a1f35';
  const lightColor = options?.lightColor || '#e2e8f0';

  const mtArray = mechanismToMT(strike, dip, rake);
  const mrr = mtArray[0], mtt = mtArray[1], mpp = mtArray[2];
  const mrt = mtArray[3], mrp = mtArray[4], mtp = mtArray[5];

  const M: number[][] = [
    [mrr, mrt, mrp],
    [mrt, mtt, mtp],
    [mrp, mtp, mpp]
  ];

  const tr = M[0][0] + M[1][1] + M[2][2];
  const q = (M[0][0]*M[1][1] + M[1][1]*M[2][2] + M[2][2]*M[0][0] - M[0][1]*M[0][1] - M[1][2]*M[1][2] - M[2][0]*M[2][0]);
  const det = M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[1][2]) - M[0][1]*(M[0][1]*M[2][2]-M[1][2]*M[2][0]) + M[0][2]*(M[0][1]*M[1][2]-M[1][1]*M[2][0]);
  const p = tr/3, q2 = tr*tr/3 - q;
  const phi = Math.acos((tr*q/3 - tr*tr*tr/27 - det/2) / Math.pow(q2/3, 1.5));
  const s2 = 2 * Math.sqrt(q2/3);
  const ev = [
    p + s2*Math.cos(phi/3),
    p + s2*Math.cos((phi + 2*Math.PI)/3),
    p + s2*Math.cos((phi + 4*Math.PI)/3)
  ];
  const evi = ev.map((v,i) => ({v,i})).sort((a,b) => b.v - a.v);
  const Taxis = [evi[0].v, evi[1].v, evi[2].v];
  const Paxis = [evi[2].v, evi[1].v, evi[0].v];

  const eigVec = (idx: number) => {
    const lam = ev[idx];
    const A: number[][] = [
      [M[0][0]-lam, M[0][1], M[0][2]],
      [M[1][0], M[1][1]-lam, M[1][2]],
      [M[2][0], M[2][1], M[2][2]-lam]
    ];
    const b = A[0], c = A[1];
    let x = b[1]*c[2] - b[2]*c[1];
    let y = b[2]*c[0] - b[0]*c[2];
    let z = b[0]*c[1] - b[1]*c[0];
    const n = Math.sqrt(x*x + y*y + z*z);
    if (n < 1e-10) return [0,0,1];
    return [x/n, y/n, z/n];
  };
  const Tvec = eigVec(evi[0].i);
  const Pvec = eigVec(evi[2].i);

  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;
  const darkRgb = hexToRgb(darkColor);
  const lightRgb = hexToRgb(lightColor);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const dx = (px - cx) / r;
      const dy = (cy - py) / r;
      const dist2 = dx*dx + dy*dy;
      if (dist2 > 1) continue;
      let theta, phi;
      if (projection === 'equal-area') {
        theta = Math.acos(1 - Math.min(dist2, 1));
        phi = Math.atan2(dy, dx);
      } else {
        theta = 2 * Math.atan(Math.sqrt(dist2));
        phi = Math.atan2(dy, dx);
      }
      const st = Math.sin(theta), ct = Math.cos(theta);
      const sp = Math.sin(phi), cp = Math.cos(phi);
      const xr = st*cp, yr = ct, zr = st*sp;
      const R = xr*xr*mrr + yr*yr*mtt + zr*zr*mpp + 2*xr*yr*mrt + 2*xr*zr*mrp + 2*yr*zr*mtp;
      const idx = (py*w + px) * 4;
      if (R > 0) {
        data[idx] = darkRgb.r; data[idx+1] = darkRgb.g; data[idx+2] = darkRgb.b;
      } else {
        data[idx] = lightRgb.r; data[idx+1] = lightRgb.g; data[idx+2] = lightRgb.b;
      }
      data[idx+3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2*Math.PI);
  ctx.strokeStyle = '#2a3050'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = 'rgba(42,48,80,0.4)'; ctx.lineWidth = 0.5;
  for (let a = 0; a < Math.PI*2; a += Math.PI/4) {
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r*Math.cos(a), cy - r*Math.sin(a)); ctx.stroke();
  }
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.arc(cx, cy, r*i/4, 0, 2*Math.PI); ctx.stroke();
  }

  const projectVec = (v: number[]) => {
    const [x, y, z] = v;
    const hr = Math.atan2(Math.sqrt(x*x + z*z), Math.abs(y));
    const hp = Math.atan2(z, x);
    const rf = projection === 'equal-area' ? Math.sqrt(2) * Math.sin(hr/2) : Math.tan(hr);
    return { x: cx + rf*r*Math.cos(hp), y: cy - rf*r*Math.sin(hp) };
  };
  const Pproj = projectVec(Pvec);
  const Tproj = projectVec(Tvec);

  ctx.beginPath(); ctx.arc(Pproj.x, Pproj.y, 5, 0, 2*Math.PI);
  ctx.fillStyle = '#ef4444'; ctx.fill();
  ctx.font = 'bold 12px JetBrains Mono'; ctx.fillStyle = '#ef4444';
  ctx.fillText('P', Pproj.x + 8, Pproj.y + 4);

  ctx.strokeStyle = '#00e5c7'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(Tproj.x-5, Tproj.y-5); ctx.lineTo(Tproj.x+5, Tproj.y+5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(Tproj.x+5, Tproj.y-5); ctx.lineTo(Tproj.x-5, Tproj.y+5); ctx.stroke();
  ctx.fillStyle = '#00e5c7';
  ctx.fillText('T', Tproj.x + 8, Tproj.y + 4);
}

function hexToRgb(hex: string): {r: number; g: number; b: number} {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : {r: 100, g: 100, b: 100};
}

export function computeAftershockProbability(params: {
  mainMagnitude: number; elapsedTimeHours: number;
  timeWindowHours: number; minMagnitude: number;
  bValue?: number; pValue?: number; cValue?: number;
}): number {
  const { mainMagnitude, elapsedTimeHours, timeWindowHours, minMagnitude } = params;
  const b = params.bValue ?? 1.0;
  const p = params.pValue ?? 1.1;
  const c = params.cValue ?? 0.1;
  const a = -1.5 + 0.5 * mainMagnitude;
  const K = Math.pow(10, a + b * (mainMagnitude - minMagnitude));
  const t = elapsedTimeHours / 24;
  const dt = timeWindowHours / 24;
  const N = K * (Math.pow(t + c, -p) - Math.pow(t + dt + c, -p));
  return 1 - Math.exp(-N);
}

export function computeOmoriDecay(
  K: number, c: number, p: number, days: number
): Array<{day: number; rate: number}> {
  const result: Array<{day: number; rate: number}> = [];
  for (let d = 1; d <= days; d++) {
    result.push({ day: d, rate: K / Math.pow(d + c, p) });
  }
  return result;
}

export function traceRays(params: {
  velocityModel: Array<{depth: number; vp: number}>;
  sourceDepth: number;
  stationDistances: number[];
  vsRatio?: number;
}): Array<{points: Array<{x: number; z: number}>; phase: string; stationDist: number}> {
  const { velocityModel, sourceDepth, stationDistances } = params;
  const vsRatio = params.vsRatio ?? 1.732;
  const layers = velocityModel.slice().sort((a,b) => a.depth - b.depth);
  const results: Array<{points: Array<{x: number; z: number}>; phase: string; stationDist: number}> = [];

  const findTakeoff = (targetDist: number, isS: boolean): number => {
    let lo = 0.1 * Math.PI/180;
    let hi = 89.9 * Math.PI/180;
    for (let iter = 0; iter < 60; iter++) {
      const mid = (lo + hi) / 2;
      const dist = computeX(mid, isS);
      if (dist < targetDist) lo = mid; else hi = mid;
      if (hi - lo < 0.0001) break;
    }
    return (lo + hi) / 2;
  };

  const computeX = (theta0: number, isS: boolean): number => {
    const vs = isS ? (layers[0].vp / vsRatio) : layers[0].vp;
    const p = Math.sin(theta0) / vs;
    let X = 0;
    for (let i = 0; i < layers.length; i++) {
      const v = isS ? (layers[i].vp / vsRatio) : layers[i].vp;
      const pv = p * v;
      if (Math.abs(pv) >= 1) break;
      const zTop = i === 0 ? sourceDepth : layers[i].depth;
      const zBot = i < layers.length - 1 ? layers[i+1].depth : zTop + 100;
      const dz = zBot - zTop;
      X += dz * pv / Math.sqrt(1 - pv*pv);
    }
    return X;
  };

  const buildPath = (theta0: number, isS: boolean): Array<{x: number; z: number}> => {
    const path: Array<{x: number; z: number}> = [{ x: 0, z: sourceDepth }];
    const vs = isS ? (layers[0].vp / vsRatio) : layers[0].vp;
    const p = Math.sin(theta0) / vs;
    let X = 0;
    for (let i = 0; i < layers.length; i++) {
      const v = isS ? (layers[i].vp / vsRatio) : layers[i].vp;
      const pv = p * v;
      if (Math.abs(pv) >= 1) break;
      const zTop = i === 0 ? sourceDepth : layers[i].depth;
      const zBot = i < layers.length - 1 ? layers[i+1].depth : zTop + 100;
      const dz = zBot - zTop;
      const dX = dz * pv / Math.sqrt(1 - pv*pv);
      X += dX;
      path.push({ x: X, z: zBot });
    }
    return path;
  };

  stationDistances.forEach((dist) => {
    const thetaP = findTakeoff(dist, false);
    results.push({ points: buildPath(thetaP, false), phase: 'P', stationDist: dist });
    const thetaS = findTakeoff(dist, true);
    results.push({ points: buildPath(thetaS, true), phase: 'S', stationDist: dist });
  });

  return results;
}

export function computeCumulativeEnergy(
  momentRate: number[], sampleRate: number
): number[] {
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < momentRate.length; i++) {
    sum += momentRate[i] / sampleRate;
    result.push(sum);
  }
  const max = Math.max(...result);
  if (max === 0) return result.map(() => 0);
  return result.map(v => v / max);
}
