export function interpolateVelocity(
  layers: Array<{ depth: number; vp: number; vs: number; density: number }>,
  nz: number,
  dz: number
): Float64Array {
  const profile = new Float64Array(nz);
  const sorted = [...layers].sort((a, b) => a.depth - b.depth);
  for (let iz = 0; iz < nz; iz++) {
    const z = iz * dz;
    let li = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (z >= sorted[i].depth && z < sorted[i + 1].depth) {
        li = i;
        break;
      }
      if (i === sorted.length - 2) li = i;
    }
    if (z <= sorted[0].depth || sorted.length === 1) {
      profile[iz] = sorted[0].vp;
    } else if (z >= sorted[sorted.length - 1].depth) {
      profile[iz] = sorted[sorted.length - 1].vp;
    } else {
      const z0 = sorted[li].depth;
      const z1 = sorted[li + 1].depth;
      const t = (z - z0) / (z1 - z0);
      profile[iz] = sorted[li].vp + t * (sorted[li + 1].vp - sorted[li].vp);
    }
  }
  return profile;
}

export class WaveSimulation {
  nx: number;
  nz: number;
  dx: number;
  dz: number;
  dt: number;
  sourceX: number;
  sourceZ: number;
  sourceFreq: number;
  prev: Float64Array;
  curr: Float64Array;
  velocity2d: Float64Array;
  timeStep: number;
  cfl: number;

  constructor(config: {
    nx: number;
    nz: number;
    dx: number;
    dz: number;
    velocity: Float64Array;
    dt: number;
    sourceX: number;
    sourceZ: number;
    sourceFreq: number;
  }) {
    this.nx = config.nx;
    this.nz = config.nz;
    this.dx = config.dx;
    this.dz = config.dz;
    this.dt = config.dt;
    this.sourceX = config.sourceX;
    this.sourceZ = config.sourceZ;
    this.sourceFreq = config.sourceFreq;

    const size = config.nx * config.nz;
    this.prev = new Float64Array(size);
    this.curr = new Float64Array(size);

    this.velocity2d = new Float64Array(size);
    for (let iz = 0; iz < config.nz; iz++) {
      const vp = config.velocity[iz];
      for (let ix = 0; ix < config.nx; ix++) {
        this.velocity2d[iz * config.nx + ix] = vp;
      }
    }

    let maxV = 0;
    for (let i = 0; i < config.velocity.length; i++) {
      if (config.velocity[i] > maxV) maxV = config.velocity[i];
    }
    const minDx = Math.min(config.dx, config.dz);
    this.cfl = (maxV * config.dt) / minDx;

    this.timeStep = 0;
  }

  step(): void {
    const { nx, nz, dx, dz, dt } = this;
    const next = new Float64Array(nx * nz);

    const dt2 = dt * dt;
    const dx2 = dx * dx;
    const dz2 = dz * dz;
    const idx2_12 = 1.0 / (12.0 * dx2);
    const idz2_12 = 1.0 / (12.0 * dz2);

    for (let iz = 2; iz < nz - 2; iz++) {
      for (let ix = 2; ix < nx - 2; ix++) {
        const idx = iz * nx + ix;
        const v = this.velocity2d[idx];
        const v2dt2 = v * v * dt2;

        const d2x =
          (-this.curr[idx + 2] +
            16.0 * this.curr[idx + 1] -
            30.0 * this.curr[idx] +
            16.0 * this.curr[idx - 1] -
            this.curr[idx - 2]) *
          idx2_12;

        const above = idx - nx;
        const below = idx + nx;
        const d2z =
          (-this.curr[below + nx] +
            16.0 * this.curr[below] -
            30.0 * this.curr[idx] +
            16.0 * this.curr[above] -
            this.curr[above - nx]) *
          idz2_12;

        next[idx] =
          2.0 * this.curr[idx] -
          this.prev[idx] +
          v2dt2 * (d2x + d2z);
      }
    }

    for (let iz = 2; iz < nz - 2; iz++) {
      for (let ix = 2; ix < nx - 2; ix++) {
        const idx = iz * nx + ix;
        const v = this.velocity2d[idx];
        const dtDx = v * dt / dx;
        const dtDz = v * dt / dz;

        if (ix === 2) {
          const i0 = iz * nx;
          const i1 = i0 + 1;
          next[i0] = this.curr[i0 + 1] + (dtDx - 1) / (dtDx + 1) * (next[i0 + 1] - this.curr[i0]);
          next[i1] = this.curr[i1 + 1] + (dtDx - 1) / (dtDx + 1) * (next[i1 + 1] - this.curr[i1]);
        }
        if (ix === nx - 3) {
          const i0 = iz * nx + nx - 1;
          const i1 = i0 - 1;
          next[i0] = this.curr[i0 - 1] + (dtDx - 1) / (dtDx + 1) * (next[i0 - 1] - this.curr[i0]);
          next[i1] = this.curr[i1 - 1] + (dtDx - 1) / (dtDx + 1) * (next[i1 - 1] - this.curr[i1]);
        }
        if (iz === 2) {
          const i0 = ix;
          const i1 = nx + ix;
          next[i0] = this.curr[nx + ix] + (dtDz - 1) / (dtDz + 1) * (next[nx + ix] - this.curr[i0]);
          next[i1] = this.curr[2 * nx + ix] + (dtDz - 1) / (dtDz + 1) * (next[2 * nx + ix] - this.curr[i1]);
        }
        if (iz === nz - 3) {
          const i0 = (nz - 1) * nx + ix;
          const i1 = (nz - 2) * nx + ix;
          next[i0] = this.curr[i1] + (dtDz - 1) / (dtDz + 1) * (next[i1] - this.curr[i0]);
          next[i1] = this.curr[i1 - nx] + (dtDz - 1) / (dtDz + 1) * (next[i1 - nx] - this.curr[i1]);
        }
      }
    }

    const t = this.timeStep * dt;
    const fp = this.sourceFreq;
    const t0 = 1.2 / fp;
    const arg = Math.PI * fp * (t - t0);
    const ricker = (1.0 - 2.0 * arg * arg) * Math.exp(-arg * arg);

    const srcIdx = this.sourceZ * nx + this.sourceX;
    const v = this.velocity2d[srcIdx];
    const v2dt2 = v * v * dt * dt;
    next[srcIdx] += ricker * v2dt2;

    this.prev = this.curr;
    this.curr = next;
    this.timeStep++;
  }

  getField(): Float64Array {
    return this.curr;
  }

  getTime(): number {
    return this.timeStep * this.dt;
  }

  getCFL(): number {
    return this.cfl;
  }
}

export function createSnapshotManager() {
  const snapshots: Array<{ time: number; field: Float64Array; nx: number; nz: number }> = [];

  return {
    addSnapshot(field: Float64Array, nx: number, nz: number, time: number): void {
      snapshots.push({
        time,
        field: new Float64Array(field),
        nx,
        nz,
      });
    },
    getSnapshots(): Array<{ time: number; field: Float64Array; nx: number; nz: number }> {
      return snapshots;
    },
    clear(): void {
      snapshots.length = 0;
    },
  };
}

export function fieldToColor(
  field: Float64Array,
  nx: number,
  nz: number,
  canvasWidth: number,
  canvasHeight: number
): ImageData {
  const imageData = new ImageData(canvasWidth, canvasHeight);
  const pixels = imageData.data;

  let maxAmp = 0;
  for (let i = 0; i < field.length; i++) {
    const a = Math.abs(field[i]);
    if (a > maxAmp) maxAmp = a;
  }
  if (maxAmp === 0) maxAmp = 1;

  for (let py = 0; py < canvasHeight; py++) {
    for (let px = 0; px < canvasWidth; px++) {
      const fx = (px / canvasWidth) * nx;
      const fz = (py / canvasHeight) * nz;

      const ix = Math.min(Math.floor(fx), nx - 1);
      const iz = Math.min(Math.floor(fz), nz - 1);

      const val = field[iz * nx + ix] / maxAmp;

      let r: number, g: number, b: number;

      if (val >= 0) {
        r = 255;
        g = Math.round(255 * (1 - val));
        b = Math.round(255 * (1 - val));
      } else {
        r = Math.round(255 * (1 + val));
        g = Math.round(255 * (1 + val));
        b = 255;
      }

      const pidx = (py * canvasWidth + px) * 4;
      pixels[pidx] = r;
      pixels[pidx + 1] = g;
      pixels[pidx + 2] = b;
      pixels[pidx + 3] = 255;
    }
  }

  return imageData;
}
