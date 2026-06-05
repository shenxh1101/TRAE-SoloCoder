import { mechanismToMT } from './inversion';

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function mechanismToRotationMatrix(
  strike: number,
  dip: number,
  rake: number
): number[][] {
  const s = (strike * Math.PI) / 180;
  const d = (dip * Math.PI) / 180;
  const r = (rake * Math.PI) / 180;

  const ss = Math.sin(s);
  const cs = Math.cos(s);
  const sd = Math.sin(d);
  const cd = Math.cos(d);
  const sr = Math.sin(r);
  const cr = Math.cos(r);

  const n1 = [-sd * cs, -sd * ss, -cd];
  const d1 = [cr * ss + sr * cd * cs, -cr * cs + sr * cd * ss, -sr * sd];

  const s1 = [
    d1[1] * n1[2] - d1[2] * n1[1],
    d1[2] * n1[0] - d1[0] * n1[2],
    d1[0] * n1[1] - d1[1] * n1[0],
  ];

  return [d1, s1, n1];
}

export function kaganAngle(
  mech1: { strike: number; dip: number; rake: number },
  mech2: { strike: number; dip: number; rake: number }
): number {
  const R1 = mechanismToRotationMatrix(mech1.strike, mech1.dip, mech1.rake);
  const R2 = mechanismToRotationMatrix(mech2.strike, mech2.dip, mech2.rake);

  let minAngle = 180;

  const signs = [
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, 1, 1],
    [-1, 1, -1],
    [-1, -1, 1],
    [-1, -1, -1],
  ];

  for (const sign of signs) {
    const R2f = [
      [R2[0][0] * sign[0], R2[0][1] * sign[1], R2[0][2] * sign[2]],
      [R2[1][0] * sign[0], R2[1][1] * sign[1], R2[1][2] * sign[2]],
      [R2[2][0] * sign[0], R2[2][1] * sign[1], R2[2][2] * sign[2]],
    ];

    let trace = 0;
    for (let i = 0; i < 3; i++) {
      trace += R1[i][0] * R2f[i][0] + R1[i][1] * R2f[i][1] + R1[i][2] * R2f[i][2];
    }

    const cosAngle = Math.max(-1, Math.min(1, (trace - 1) / 2));
    const angle = (Math.acos(cosAngle) * 180) / Math.PI;
    if (angle < minAngle) {
      minAngle = angle;
    }
  }

  return Math.min(minAngle, 120);
}

export function computeSimilarity(
  query: {
    lat: number;
    lon: number;
    depth: number;
    magnitude: number;
    mechanism: { strike: number; dip: number; rake: number } | null;
  },
  event: {
    lat: number;
    lon: number;
    depth: number;
    magnitude: number;
    mechanism: { strike: number; dip: number; rake: number } | null;
  }
): number {
  const distKm = haversineDistance(query.lat, query.lon, event.lat, event.lon);
  const spatialScore = Math.exp(-distKm / 100);

  const depthDiff = Math.abs(query.depth - event.depth);
  const depthScore = Math.exp(-depthDiff / 50);

  const magDiff = Math.abs(query.magnitude - event.magnitude);
  const magnitudeScore = Math.exp(-magDiff / 0.5);

  let mechanismScore = 0.5;
  if (query.mechanism && event.mechanism) {
    const angle = kaganAngle(query.mechanism, event.mechanism);
    mechanismScore = 1 - angle / 120;
  }

  const wSpatial = 0.3;
  const wDepth = 0.2;
  const wMagnitude = 0.25;
  const wMechanism = 0.25;

  const rawScore =
    wSpatial * spatialScore +
    wDepth * depthScore +
    wMagnitude * magnitudeScore +
    wMechanism * mechanismScore;

  return Math.max(0, Math.min(100, rawScore * 100));
}

function generateReason(
  query: {
    lat: number;
    lon: number;
    depth: number;
    magnitude: number;
    mechanism: { strike: number; dip: number; rake: number } | null;
  },
  event: {
    lat: number;
    lon: number;
    depth: number;
    magnitude: number;
    mechanism: { strike: number; dip: number; rake: number } | null;
  },
  similarity: number
): string {
  const parts: string[] = [];

  const distKm = haversineDistance(query.lat, query.lon, event.lat, event.lon);
  if (distKm < 50) {
    parts.push(`very close spatially (${distKm.toFixed(0)} km)`);
  } else if (distKm < 200) {
    parts.push(`nearby (${distKm.toFixed(0)} km)`);
  } else {
    parts.push(`${distKm.toFixed(0)} km away`);
  }

  const depthDiff = Math.abs(query.depth - event.depth);
  if (depthDiff < 5) {
    parts.push('similar depth');
  } else if (depthDiff < 20) {
    parts.push(`comparable depth (Δ${depthDiff.toFixed(0)} km)`);
  } else {
    parts.push(`depth difference ${depthDiff.toFixed(0)} km`);
  }

  const magDiff = Math.abs(query.magnitude - event.magnitude);
  if (magDiff < 0.3) {
    parts.push('similar magnitude');
  } else {
    parts.push(`M${magDiff.toFixed(1)} magnitude difference`);
  }

  if (query.mechanism && event.mechanism) {
    const angle = kaganAngle(query.mechanism, event.mechanism);
    if (angle < 15) {
      parts.push('nearly identical focal mechanism');
    } else if (angle < 40) {
      parts.push(`similar mechanism (Kagan angle ${angle.toFixed(0)}°)`);
    } else {
      parts.push(`different mechanism (Kagan angle ${angle.toFixed(0)}°)`);
    }
  }

  if (similarity >= 80) {
    return `Excellent match: ${parts.join(', ')}`;
  } else if (similarity >= 60) {
    return `Good match: ${parts.join(', ')}`;
  } else if (similarity >= 40) {
    return `Moderate match: ${parts.join(', ')}`;
  } else {
    return `Weak match: ${parts.join(', ')}`;
  }
}

export function recommend(
  query: {
    lat: number;
    lon: number;
    depth: number;
    magnitude: number;
    mechanism?: { strike: number; dip: number; rake: number } | null;
  },
  catalog: Array<{
    id: string;
    lat: number;
    lon: number;
    depth: number;
    magnitude: number;
    mechanism: { strike: number; dip: number; rake: number } | null;
    mt: number[] | null;
    velocityModelId: string;
  }>,
  topN: number
): Array<{
  eventId: string;
  similarity: number;
  reason: string;
  initialModel: { mt: number[]; velocityModelId: string };
}> {
  const scored = catalog.map((event) => {
    const similarity = computeSimilarity(
      {
        lat: query.lat,
        lon: query.lon,
        depth: query.depth,
        magnitude: query.magnitude,
        mechanism: query.mechanism ?? null,
      },
      {
        lat: event.lat,
        lon: event.lon,
        depth: event.depth,
        magnitude: event.magnitude,
        mechanism: event.mechanism,
      }
    );

    let mt: number[];
    if (event.mt && event.mt.length === 6) {
      mt = event.mt;
    } else if (event.mechanism) {
      mt = mechanismToMT(
        event.mechanism.strike,
        event.mechanism.dip,
        event.mechanism.rake
      );
    } else {
      mt = [0, 0, 0, 0, 0, 0];
    }

    const reason = generateReason(
      {
        lat: query.lat,
        lon: query.lon,
        depth: query.depth,
        magnitude: query.magnitude,
        mechanism: query.mechanism ?? null,
      },
      {
        lat: event.lat,
        lon: event.lon,
        depth: event.depth,
        magnitude: event.magnitude,
        mechanism: event.mechanism,
      },
      similarity
    );

    return {
      eventId: event.id,
      similarity,
      reason,
      initialModel: {
        mt,
        velocityModelId: event.velocityModelId,
      },
    };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topN);
}
