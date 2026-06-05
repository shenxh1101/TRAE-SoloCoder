class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(v) {
        return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    sub(v) {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    mul(s) {
        return new Vector3(this.x * s, this.y * s, this.z * s);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v) {
        return new Vector3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize() {
        const len = this.length();
        if (len === 0) return new Vector3(0, 0, 1);
        return new Vector3(this.x / len, this.y / len, this.z / len);
    }

    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    toArray() {
        return [this.x, this.y, this.z];
    }
}

class Ray {
    constructor(origin, direction, wavelength = 0.5876) {
        this.origin = origin.clone();
        this.direction = direction.normalize();
        this.wavelength = wavelength;
        this.path = [];
        this.intensity = 1.0;
    }

    addPoint(point, normal = null) {
        this.path.push({
            point: point.clone(),
            normal: normal ? normal.clone() : null,
            intensity: this.intensity
        });
    }

    clone() {
        const ray = new Ray(this.origin, this.direction, this.wavelength);
        ray.path = JSON.parse(JSON.stringify(this.path));
        ray.intensity = this.intensity;
        return ray;
    }
}

class OpticalSurface {
    constructor(config) {
        this.radius = config.radius || Infinity;
        this.thickness = config.thickness || 0;
        this.refractiveIndex = config.refractiveIndex || 1.0;
        this.diameter = config.diameter || 25.4;
        this.conic = config.conic || 0;
        this.asphericCoeffs = config.asphericCoeffs || [0, 0, 0, 0];
        this.type = config.type || 'spherical';
        this.surfaceNumber = config.surfaceNumber || 0;
    }

    getSagitta(x, y) {
        const r2 = x * x + y * y;
        if (Math.abs(this.radius) < 1e-10 || !isFinite(this.radius)) {
            let sag = 0;
            for (let i = 0; i < this.asphericCoeffs.length; i++) {
                sag += this.asphericCoeffs[i] * Math.pow(r2, i + 1);
            }
            return sag;
        }
        
        const R = Math.abs(this.radius);
        const sign = this.radius > 0 ? 1 : -1;
        const root = Math.sqrt(1 - r2 / (R * R));
        let sag = sign * r2 / (R * (1 + root));
        
        if (this.type === 'aspheric') {
            for (let i = 0; i < this.asphericCoeffs.length; i++) {
                sag += this.asphericCoeffs[i] * Math.pow(r2, i + 1);
            }
        }
        
        return sag;
    }

    getNormal(x, y) {
        const r2 = x * x + y * y;
        let dx = 0, dy = 0;
        
        if (Math.abs(this.radius) > 1e-10 && isFinite(this.radius)) {
            const R = Math.abs(this.radius);
            const denom = Math.sqrt(1 - r2 / (R * R));
            dx = x / (R * denom);
            dy = y / (R * denom);
            
            if (this.radius < 0) {
                dx = -dx;
                dy = -dy;
            }
        }
        
        if (this.type === 'aspheric') {
            for (let i = 0; i < this.asphericCoeffs.length; i++) {
                const coeff = 2 * (i + 1) * this.asphericCoeffs[i];
                const power = Math.pow(r2, i);
                dx += coeff * x * power;
                dy += coeff * y * power;
            }
        }
        
        return new Vector3(-dx, -dy, 1).normalize();
    }

    intersect(ray, zPosition) {
        const ox = ray.origin.x;
        const oy = ray.origin.y;
        const oz = ray.origin.z - zPosition;
        const dx = ray.direction.x;
        const dy = ray.direction.y;
        const dz = ray.direction.z;
        
        if (!isFinite(this.radius) || Math.abs(this.radius) > 1e10) {
            const t = -oz / dz;
            if (t < 1e-6) return null;
            
            const x = ox + dx * t;
            const y = oy + dy * t;
            
            if (x * x + y * y > (this.diameter / 2) ** 2) return null;
            
            return {
                point: new Vector3(x, y, zPosition),
                distance: t,
                normal: new Vector3(0, 0, this.radius > 0 ? -1 : 1)
            };
        }
        
        const R = this.radius;
        const a = dx * dx + dy * dy + dz * dz;
        const b = 2 * (ox * dx + oy * dy + (oz - R) * dz);
        const c = ox * ox + oy * oy + (oz - R) * (oz - R) - R * R;
        
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return null;
        
        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
        
        let t = t1 > 1e-6 ? t1 : (t2 > 1e-6 ? t2 : null);
        if (!t) return null;
        
        const x = ox + dx * t;
        const y = oy + dy * t;
        
        if (x * x + y * y > (this.diameter / 2) ** 2) return null;
        
        const normal = this.getNormal(x, y);
        return {
            point: new Vector3(x, y, zPosition + this.getSagitta(x, y)),
            distance: t,
            normal: normal
        };
    }
}

class OpticalSystem {
    constructor() {
        this.surfaces = [];
        this.wavelengths = [0.4861, 0.5876, 0.6563];
        this.fieldAngles = [0, 0.7, 1.0];
        this.apertureRadius = 12.7;
        this.imagePlaneDistance = 0;
    }

    addSurface(config) {
        const surface = new OpticalSurface(config);
        surface.surfaceNumber = this.surfaces.length;
        this.surfaces.push(surface);
        return surface;
    }

    loadFromData(data) {
        this.surfaces = [];
        
        if (data.surfaces && Array.isArray(data.surfaces)) {
            data.surfaces.forEach(s => this.addSurface(s));
        }
        
        if (data.wavelengths) {
            this.wavelengths = data.wavelengths;
        }
        
        if (data.fieldAngles) {
            this.fieldAngles = data.fieldAngles;
        }
        
        if (data.apertureRadius) {
            this.apertureRadius = data.apertureRadius;
        }
        
        return this;
    }

    getSurfacePositions() {
        const positions = [0];
        let z = 0;
        for (const surface of this.surfaces) {
            z += surface.thickness;
            positions.push(z);
        }
        return positions;
    }

    traceRay(ray) {
        const positions = this.getSurfacePositions();
        const tracedRay = ray.clone();
        tracedRay.addPoint(ray.origin);
        
        let currentMaterial = 1.0;
        
        for (let i = 0; i < this.surfaces.length; i++) {
            const surface = this.surfaces[i];
            const zPos = positions[i];
            
            const intersection = surface.intersect(tracedRay, zPos);
            if (!intersection) {
                tracedRay.intensity = 0;
                return tracedRay;
            }
            
            tracedRay.addPoint(intersection.point, intersection.normal);
            tracedRay.origin = intersection.point.clone();
            
            const n1 = currentMaterial;
            const n2 = surface.refractiveIndex;
            const normal = intersection.normal;
            
            const cosI = Math.abs(tracedRay.direction.dot(normal));
            const sinI2 = 1 - cosI * cosI;
            const sinT2 = (n1 / n2) ** 2 * sinI2;
            
            if (sinT2 > 1) {
                tracedRay.intensity = 0;
                return tracedRay;
            }
            
            const cosT = Math.sqrt(1 - sinT2);
            const factor = n1 / n2;
            
            const newDir = tracedRay.direction.mul(factor).add(
                normal.mul(factor * cosI - cosT)
            ).normalize();
            
            tracedRay.direction = newDir;
            currentMaterial = n2;
        }
        
        const imageZ = positions[this.surfaces.length];
        const t = (imageZ - tracedRay.origin.z) / tracedRay.direction.z;
        
        if (t > 0) {
            const finalPoint = tracedRay.origin.add(tracedRay.direction.mul(t));
            tracedRay.addPoint(finalPoint, new Vector3(0, 0, 1));
            tracedRay.origin = finalPoint;
        }
        
        return tracedRay;
    }

    generatePupilRays(fieldAngle = 0, wavelength = 0.5876, numRays = 20) {
        const rays = [];
        const angleRad = fieldAngle * Math.PI / 180;
        const dirX = Math.sin(angleRad);
        const dirZ = Math.cos(angleRad);
        
        for (let i = 0; i < numRays; i++) {
            for (let j = 0; j < numRays; j++) {
                const x = (i / (numRays - 1) - 0.5) * 2 * this.apertureRadius;
                const y = (j / (numRays - 1) - 0.5) * 2 * this.apertureRadius;
                
                if (x * x + y * y <= this.apertureRadius * this.apertureRadius) {
                    const origin = new Vector3(x, y, -10);
                    const direction = new Vector3(dirX, 0, dirZ).normalize();
                    rays.push(new Ray(origin, direction, wavelength));
                }
            }
        }
        
        return rays;
    }

    traceField(fieldAngle = 0, wavelength = 0.5876) {
        const rays = this.generatePupilRays(fieldAngle, wavelength);
        return rays.map(ray => this.traceRay(ray)).filter(ray => ray.intensity > 0);
    }

    calculateSpotSize(fieldAngle = 0, wavelength = 0.5876) {
        const rays = this.traceField(fieldAngle, wavelength);
        if (rays.length === 0) return { rms: 0, peakToValley: 0, centroid: { x: 0, y: 0 } };
        
        let sumX = 0, sumY = 0;
        rays.forEach(ray => {
            sumX += ray.origin.x;
            sumY += ray.origin.y;
        });
        
        const centroidX = sumX / rays.length;
        const centroidY = sumY / rays.length;
        
        let sumR2 = 0;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        rays.forEach(ray => {
            const dx = ray.origin.x - centroidX;
            const dy = ray.origin.y - centroidY;
            sumR2 += dx * dx + dy * dy;
            minX = Math.min(minX, ray.origin.x);
            maxX = Math.max(maxX, ray.origin.x);
            minY = Math.min(minY, ray.origin.y);
            maxY = Math.max(maxY, ray.origin.y);
        });
        
        const rms = Math.sqrt(sumR2 / rays.length);
        const peakToValley = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2) / 2;
        
        return {
            rms,
            peakToValley,
            centroid: { x: centroidX, y: centroidY },
            rays: rays.map(r => ({ x: r.origin.x, y: r.origin.y }))
        };
    }

    calculateWavefront(fieldAngle = 0, wavelength = 0.5876) {
        const chiefRay = this.traceRay(new Ray(
            new Vector3(0, 0, -10),
            new Vector3(Math.sin(fieldAngle * Math.PI / 180), 0, Math.cos(fieldAngle * Math.PI / 180)),
            wavelength
        ));
        
        const chiefOpticalPath = this.calculateOpticalPathLength(chiefRay);
        const rays = this.generatePupilRays(fieldAngle, wavelength, 32);
        
        const wavefront = [];
        
        rays.forEach(ray => {
            const traced = this.traceRay(ray);
            const opl = this.calculateOpticalPathLength(traced);
            const opd = (opl - chiefOpticalPath) / wavelength;
            
            const pupilX = ray.origin.x / this.apertureRadius;
            const pupilY = ray.origin.y / this.apertureRadius;
            
            wavefront.push({
                x: pupilX,
                y: pupilY,
                opd: opd,
                valid: traced.intensity > 0
            });
        });
        
        const validValues = wavefront.filter(w => w.valid).map(w => w.opd);
        const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length;
        const rms = Math.sqrt(validValues.reduce((a, b) => a + (b - mean) ** 2, 0) / validValues.length);
        const peakToValley = Math.max(...validValues) - Math.min(...validValues);
        
        return {
            data: wavefront,
            rms,
            peakToValley,
            mean
        };
    }

    calculateOpticalPathLength(ray) {
        if (ray.path.length < 2) return 0;
        
        let opl = 0;
        let currentN = 1.0;
        
        for (let i = 0; i < ray.path.length - 1; i++) {
            const p1 = ray.path[i].point;
            const p2 = ray.path[i + 1].point;
            const distance = p2.sub(p1).length();
            opl += currentN * distance;
            
            if (i < this.surfaces.length) {
                currentN = this.surfaces[i].refractiveIndex;
            }
        }
        
        return opl;
    }

    calculateAberrations(fieldAngle = 0) {
        const aberrations = {
            spherical: 0,
            coma: 0,
            astigmatism: 0,
            fieldCurvature: 0,
            distortion: 0
        };
        
        const wavefront = this.calculateWavefront(fieldAngle, 0.5876);
        const data = wavefront.data.filter(d => d.valid);
        
        data.forEach(d => {
            const r2 = d.x * d.x + d.y * d.y;
            aberrations.spherical += Math.abs(d.opd * r2);
            aberrations.coma += Math.abs(d.opd * d.x * Math.sqrt(r2));
            aberrations.astigmatism += Math.abs(d.opd * (d.x * d.x - d.y * d.y));
            aberrations.fieldCurvature += Math.abs(d.opd * r2);
            aberrations.distortion += Math.abs(d.opd * d.x);
        });
        
        const n = data.length;
        Object.keys(aberrations).forEach(key => {
            aberrations[key] = aberrations[key] / n * 100;
        });
        
        return aberrations;
    }

    calculateMTF(fieldAngle = 0) {
        const spot = this.calculateSpotSize(fieldAngle, 0.5876);
        const cutoff = 1 / (2.44 * spot.rms * 1e-3);
        
        const mtfData = [];
        const maxFreq = Math.min(cutoff * 1.5, 200);
        
        for (let f = 0; f <= maxFreq; f += 5) {
            const normalized = f / cutoff;
            const mtf = normalized < 1 ? (2 / Math.PI) * (Math.acos(normalized) - normalized * Math.sqrt(1 - normalized * normalized)) : 0;
            mtfData.push({ frequency: f, mtf: Math.max(0, mtf) });
        }
        
        return {
            cutoff: cutoff,
            data: mtfData,
            mtfAt30: this.getMTFAtFrequency(mtfData, 30),
            mtfAt50: this.getMTFAtFrequency(mtfData, 50)
        };
    }

    getMTFAtFrequency(mtfData, freq) {
        for (let i = 0; i < mtfData.length - 1; i++) {
            if (mtfData[i].frequency <= freq && mtfData[i + 1].frequency >= freq) {
                const t = (freq - mtfData[i].frequency) / (mtfData[i + 1].frequency - mtfData[i].frequency);
                return mtfData[i].mtf * (1 - t) + mtfData[i + 1].mtf * t;
            }
        }
        return 0;
    }

    calculateFullAnalysis() {
        const results = {
            spots: {},
            wavefront: {},
            aberrations: {},
            mtf: {}
        };
        
        this.fieldAngles.forEach(angle => {
            results.spots[angle] = this.calculateSpotSize(angle);
            results.wavefront[angle] = this.calculateWavefront(angle);
            results.aberrations[angle] = this.calculateAberrations(angle);
            results.mtf[angle] = this.calculateMTF(angle);
        });
        
        results.overall = {
            avgRmsWavefront: Object.values(results.wavefront).reduce((a, b) => a + b.rms, 0) / this.fieldAngles.length,
            avgRmsSpot: Object.values(results.spots).reduce((a, b) => a + b.rms, 0) / this.fieldAngles.length,
            avgMTFCutoff: Object.values(results.mtf).reduce((a, b) => a + b.cutoff, 0) / this.fieldAngles.length,
            onAxisRms: results.wavefront[0]?.rms || 0,
            fullFieldRms: results.wavefront[this.fieldAngles[this.fieldAngles.length - 1]]?.rms || 0
        };
        
        return results;
    }
}

class LensParser {
    static parse(text, filename) {
        const ext = filename.split('.').pop().toLowerCase();
        
        switch (ext) {
            case 'json':
                return this.parseJSON(text);
            case 'csv':
                return this.parseCSV(text);
            default:
                return this.parseText(text);
        }
    }

    static parseJSON(text) {
        try {
            const data = JSON.parse(text);
            return {
                success: true,
                data: data
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    static parseCSV(text) {
        const lines = text.trim().split('\n');
        const surfaces = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(/[,;]/).map(v => v.trim());
            if (values.length >= 3) {
                surfaces.push({
                    radius: parseFloat(values[0]) || Infinity,
                    thickness: parseFloat(values[1]) || 0,
                    refractiveIndex: parseFloat(values[2]) || 1.0,
                    diameter: parseFloat(values[3]) || 25.4
                });
            }
        }
        
        return {
            success: true,
            data: { surfaces }
        };
    }

    static parseText(text) {
        const lines = text.trim().split('\n');
        const surfaces = [];
        let inSurfaces = false;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.toLowerCase().includes('surface') || trimmed.match(/^\d+\s/)) {
                inSurfaces = true;
            }
            
            if (inSurfaces) {
                const values = trimmed.split(/\s+/);
                if (values.length >= 3 && !isNaN(parseFloat(values[0]))) {
                    const nums = values.map(parseFloat).filter(n => !isNaN(n));
                    if (nums.length >= 3) {
                        surfaces.push({
                            radius: Math.abs(nums[1]) < 1e-10 ? Infinity : nums[1],
                            thickness: nums[2] || 0,
                            refractiveIndex: nums[3] || 1.0,
                            diameter: nums[4] || 25.4
                        });
                    }
                }
            }
        }
        
        if (surfaces.length === 0) {
            return { success: false, error: '无法解析透镜参数' };
        }
        
        return {
            success: true,
            data: { surfaces }
        };
    }
}

function generateSampleLensData() {
    return {
        name: '双高斯摄影物镜',
        description: '经典双高斯结构，50mm f/2.0',
        surfaces: [
            { radius: 35.2, thickness: 5.0, refractiveIndex: 1.67, diameter: 30 },
            { radius: 80.5, thickness: 0.5, refractiveIndex: 1.0, diameter: 30 },
            { radius: 28.3, thickness: 4.5, refractiveIndex: 1.62, diameter: 25 },
            { radius: 0, thickness: 12.0, refractiveIndex: 1.0, diameter: 25 },
            { radius: 0, thickness: 3.0, refractiveIndex: 1.58, diameter: 20 },
            { radius: -35.0, thickness: 0.5, refractiveIndex: 1.0, diameter: 20 },
            { radius: 25.0, thickness: 4.0, refractiveIndex: 1.65, diameter: 25 },
            { radius: -45.0, thickness: 40.0, refractiveIndex: 1.0, diameter: 25 }
        ],
        wavelengths: [0.4861, 0.5876, 0.6563],
        fieldAngles: [0, 10, 20],
        apertureRadius: 12.5
    };
}
