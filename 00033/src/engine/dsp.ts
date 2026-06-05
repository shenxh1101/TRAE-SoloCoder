function convolve(a: number[], b: number[]): number[] {
  const result = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      result[i + j] += a[i] * b[j];
    }
  }
  return result;
}

export function butterworthLowpass(
  cutoffFreq: number,
  sampleRate: number,
  order: number = 4
): { b: number[]; a: number[] } {
  const c = 2 * sampleRate;
  const w = c * Math.tan(Math.PI * cutoffFreq / sampleRate);

  let bCombined: number[] = [1];
  let aCombined: number[] = [1];

  const nPairs = Math.floor(order / 2);
  for (let k = 0; k < nPairs; k++) {
    const theta = Math.PI * (2 * k + 1) / (2 * order);
    const a1 = 2 * Math.cos(theta);

    const D0 = c * c + a1 * w * c + w * w;
    const D1 = -2 * c * c + 2 * w * w;
    const D2 = c * c - a1 * w * c + w * w;

    const bSection = [w * w / D0, 2 * w * w / D0, w * w / D0];
    const aSection = [1, D1 / D0, D2 / D0];

    bCombined = convolve(bCombined, bSection);
    aCombined = convolve(aCombined, aSection);
  }

  if (order % 2 === 1) {
    const D0 = c + w;
    const bSection = [w / D0, w / D0];
    const aSection = [1, (w - c) / D0];

    bCombined = convolve(bCombined, bSection);
    aCombined = convolve(aCombined, aSection);
  }

  return { b: bCombined, a: aCombined };
}

export function butterworthHighpass(
  cutoffFreq: number,
  sampleRate: number,
  order: number = 4
): { b: number[]; a: number[] } {
  const c = 2 * sampleRate;
  const w = c * Math.tan(Math.PI * cutoffFreq / sampleRate);

  let bCombined: number[] = [1];
  let aCombined: number[] = [1];

  const nPairs = Math.floor(order / 2);
  for (let k = 0; k < nPairs; k++) {
    const theta = Math.PI * (2 * k + 1) / (2 * order);
    const a1 = 2 * Math.cos(theta);

    const D0 = c * c + a1 * w * c + w * w;
    const D1 = -2 * c * c + 2 * w * w;
    const D2 = c * c - a1 * w * c + w * w;

    const bSection = [c * c / D0, -2 * c * c / D0, c * c / D0];
    const aSection = [1, D1 / D0, D2 / D0];

    bCombined = convolve(bCombined, bSection);
    aCombined = convolve(aCombined, aSection);
  }

  if (order % 2 === 1) {
    const D0 = c + w;
    const bSection = [c / D0, -c / D0];
    const aSection = [1, (w - c) / D0];

    bCombined = convolve(bCombined, bSection);
    aCombined = convolve(aCombined, aSection);
  }

  return { b: bCombined, a: aCombined };
}

export function butterworthBandpass(
  lowFreq: number,
  highFreq: number,
  sampleRate: number,
  order: number = 4
): { b: number[]; a: number[] } {
  const hp = butterworthHighpass(lowFreq, sampleRate, order);
  const lp = butterworthLowpass(highFreq, sampleRate, order);
  return {
    b: convolve(hp.b, lp.b),
    a: convolve(hp.a, lp.a),
  };
}

export function applyFilter(
  data: number[],
  b: number[],
  a: number[]
): number[] {
  const len = data.length;
  const ord = a.length - 1;
  const output = new Array(len);
  const d = new Array(ord).fill(0);

  const bNorm = b.map(v => v / a[0]);
  const aNorm = a.map(v => v / a[0]);

  for (let n = 0; n < len; n++) {
    output[n] = bNorm[0] * data[n] + (ord > 0 ? d[0] : 0);
    for (let k = 0; k < ord; k++) {
      const bk = k + 1 < bNorm.length ? bNorm[k + 1] : 0;
      d[k] = bk * data[n] - aNorm[k + 1] * output[n] + (k + 1 < ord ? d[k + 1] : 0);
    }
  }

  return output;
}

export function demean(data: number[]): number[] {
  const mean = data.reduce((s, v) => s + v, 0) / data.length;
  return data.map(v => v - mean);
}

export function detrend(data: number[]): number[] {
  const n = data.length;
  if (n < 2) return data.slice();

  const xMean = (n - 1) / 2;
  const yMean = data.reduce((s, v) => s + v, 0) / n;

  let ssXX = 0;
  let ssXY = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - xMean;
    const dy = data[i] - yMean;
    ssXX += dx * dx;
    ssXY += dx * dy;
  }

  if (ssXX === 0) return data.slice();

  const slope = ssXY / ssXX;
  const intercept = yMean - slope * xMean;

  return data.map((v, i) => v - (intercept + slope * i));
}

export function removeInstrumentResponse(
  data: number[],
  sampleRate: number,
  naturalPeriod: number = 1.0,
  damping: number = 0.707
): number[] {
  const w0 = 2 * Math.PI / naturalPeriod;
  const c = 2 * sampleRate;
  const c2 = c * c;
  const w02 = w0 * w0;
  const hw0c = 2 * damping * w0 * c;

  const b0 = (c2 + hw0c + w02) / c2;
  const b1 = (-2 * c2 + 2 * w02) / c2;
  const b2 = (c2 - hw0c + w02) / c2;

  return applyFilter(data, [b0, b1, b2], [1, -2, 1]);
}

export function computeSNR(
  data: number[],
  sampleRate: number,
  signalStartSec: number
): number {
  const signalStart = Math.floor(signalStartSec * sampleRate);
  if (signalStart <= 0 || signalStart >= data.length) return 0;

  const noise = data.slice(0, signalStart);
  const signal = data.slice(signalStart);

  const noisePower = noise.reduce((s, v) => s + v * v, 0) / noise.length;
  const signalPower = signal.reduce((s, v) => s + v * v, 0) / signal.length;

  if (noisePower === 0) return signalPower === 0 ? 0 : Infinity;
  return 10 * Math.log10(signalPower / noisePower);
}

export function generateSyntheticWaveform(
  n: number,
  sampleRate: number,
  pFreq: number,
  sFreq: number,
  noiseLevel: number
): number[] {
  const raw = new Array(n).fill(0);

  const pArrival = Math.floor(n * 0.25);
  const sArrival = Math.floor(n * 0.4);

  for (let i = 0; i < n; i++) {
    if (i >= pArrival) {
      const dt = (i - pArrival) / sampleRate;
      const envelope = 0.3 * Math.exp(-3 * dt) * (1 - Math.exp(-20 * dt));
      raw[i] += envelope * Math.sin(2 * Math.PI * pFreq * dt);
    }

    if (i >= sArrival) {
      const dt = (i - sArrival) / sampleRate;
      const envelope = 0.8 * Math.exp(-1.5 * dt) * (1 - Math.exp(-15 * dt));
      raw[i] += envelope * Math.sin(2 * Math.PI * sFreq * dt);
    }
  }

  const white = new Array(n);
  for (let i = 0; i < n; i++) {
    white[i] = noiseLevel * (2 * Math.random() - 1);
  }

  const smoothingWindow = Math.max(3, Math.round(sampleRate * 0.01));
  const filtered = new Array(n).fill(0);
  const halfW = Math.floor(smoothingWindow / 2);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    for (let j = -halfW; j <= halfW; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < n) {
        sum += white[idx];
        count++;
      }
    }
    filtered[i] = sum / count;
  }

  return raw.map((v, i) => v + filtered[i]);
}

export function fftMagnitude(data: number[]): number[] {
  const N = data.length;
  const half = Math.floor(N / 2);
  const mag = new Array(half);

  for (let k = 0; k < half; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const angle = -2 * Math.PI * k * n / N;
      re += data[n] * Math.cos(angle);
      im += data[n] * Math.sin(angle);
    }
    mag[k] = Math.sqrt(re * re + im * im);
  }

  return mag;
}
