const axios = require('axios');
require('dotenv').config();

const AMAP_KEY = process.env.AMAP_KEY;

const BASE_URL = 'https://restapi.amap.com/v3';

async function reverseGeocode(latitude, longitude) {
  try {
    const res = await axios.get(`${BASE_URL}/geocode/regeo`, {
      params: { key: AMAP_KEY, location: `${longitude},${latitude}`, extensions: 'base' }
    });
    if (res.data.status === '1') {
      return {
        formattedAddress: res.data.regeocode.formatted_address,
        province: res.data.regeocode.addressComponent.province,
        city: res.data.regeocode.addressComponent.city,
        district: res.data.regeocode.addressComponent.district,
        adcode: res.data.regeocode.addressComponent.adcode
      };
    }
    return { formattedAddress: '', province: '', city: '', district: '', adcode: '' };
  } catch {
    return { formattedAddress: '', province: '', city: '', district: '', adcode: '' };
  }
}

async function geocode(address, city) {
  try {
    const res = await axios.get(`${BASE_URL}/geocode/geo`, {
      params: { key: AMAP_KEY, address, city: city || '' }
    });
    if (res.data.status === '1' && res.data.geocodes.length > 0) {
      const geo = res.data.geocodes[0];
      const [longitude, latitude] = geo.location.split(',');
      return {
        formattedAddress: geo.formatted_address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        adcode: geo.adcode
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function searchNearbyPOI(keyword, location, radius = 3000) {
  try {
    const res = await axios.get(`${BASE_URL}/place/around`, {
      params: {
        key: AMAP_KEY,
        keywords: keyword,
        location: location ? `${location.longitude},${location.latitude}` : '',
        radius
      }
    });
    if (res.data.status === '1') {
      return (res.data.pois || []).map(poi => {
        const [lng, lat] = (poi.location || '').split(',').map(Number);
        return {
          name: poi.name,
          address: poi.address,
          latitude: lat,
          longitude: lng,
          distance: parseFloat(poi.distance) || 0,
          tel: poi.tel
        };
      });
    }
    return [];
  } catch {
    return [];
  }
}

async function calculateDistance(from, to) {
  try {
    const origins = `${from.longitude},${from.latitude}`;
    const destination = `${to.longitude},${to.latitude}`;
    const res = await axios.get(`${BASE_URL}/distance`, {
      params: { key: AMAP_KEY, origins, destination, type: 1 }
    });
    if (res.data.status === '1' && res.data.results.length > 0) {
      return parseFloat(res.data.results[0].distance) || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

async function getDrivingRoute(origin, destination) {
  try {
    const origins = `${origin.longitude},${origin.latitude}`;
    const dest = `${destination.longitude},${destination.latitude}`;
    const res = await axios.get(`${BASE_URL}/direction/driving`, {
      params: { key: AMAP_KEY, origin: origins, destination: dest }
    });
    if (res.data.status === '1' && res.data.route) {
      const route = res.data.route;
      return {
        distance: parseFloat(route.paths[0]?.distance) || 0,
        duration: parseFloat(route.paths[0]?.duration) || 0,
        steps: (route.paths[0]?.steps || []).map(step => ({
          instruction: step.instruction,
          distance: parseFloat(step.distance) || 0,
          duration: parseFloat(step.duration) || 0
        }))
      };
    }
    return { distance: 0, duration: 0, steps: [] };
  } catch {
    return { distance: 0, duration: 0, steps: [] };
  }
}

module.exports = { reverseGeocode, geocode, searchNearbyPOI, calculateDistance, getDrivingRoute };
