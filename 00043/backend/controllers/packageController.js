import db from '../config/db.js';
import { generateId, toJSON, parseJSON, formatRows } from '../utils/helpers.js';

export const getPackages = async (req, res) => {
  try {
    const packages = db.prepare('SELECT * FROM packages').all();
    const formatted = packages.map(pkg => ({
      ...pkg,
      features: parseJSON(pkg.features, []),
      roomIds: parseJSON(pkg.roomIds, []),
    }));
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const getPackage = async (req, res) => {
  try {
    const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);

    if (!pkg) {
      return res.status(404).json({ message: '套餐不存在' });
    }

    res.json({
      ...pkg,
      features: parseJSON(pkg.features, []),
      roomIds: parseJSON(pkg.roomIds, []),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const createPackage = async (req, res) => {
  const { name, description, pricePerDay, features, roomIds, minAge, maxAge, minWeight, maxWeight, requiresAllergyFriendly } = req.body;

  try {
    const id = generateId();
    db.prepare(`
      INSERT INTO packages (id, name, description, pricePerDay, features, roomIds, minAge, maxAge, minWeight, maxWeight, requiresAllergyFriendly)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      description || '',
      pricePerDay,
      toJSON(features || []),
      toJSON(roomIds || []),
      minAge || null,
      maxAge || null,
      minWeight || null,
      maxWeight || null,
      requiresAllergyFriendly ? 1 : 0
    );

    const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(id);

    res.status(201).json({
      ...pkg,
      features: parseJSON(pkg.features, []),
      roomIds: parseJSON(pkg.roomIds, []),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const updatePackage = async (req, res) => {
  const { name, description, pricePerDay, features, roomIds, minAge, maxAge, minWeight, maxWeight, requiresAllergyFriendly } = req.body;

  try {
    const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);

    if (!pkg) {
      return res.status(404).json({ message: '套餐不存在' });
    }

    db.prepare(`
      UPDATE packages
      SET name = ?, description = ?, pricePerDay = ?, features = ?, roomIds = ?, minAge = ?, maxAge = ?, minWeight = ?, maxWeight = ?, requiresAllergyFriendly = ?
      WHERE id = ?
    `).run(
      name || pkg.name,
      description !== undefined ? description : pkg.description,
      pricePerDay !== undefined ? pricePerDay : pkg.pricePerDay,
      toJSON(features || parseJSON(pkg.features, [])),
      toJSON(roomIds || parseJSON(pkg.roomIds, [])),
      minAge !== undefined ? minAge : pkg.minAge,
      maxAge !== undefined ? maxAge : pkg.maxAge,
      minWeight !== undefined ? minWeight : pkg.minWeight,
      maxWeight !== undefined ? maxWeight : pkg.maxWeight,
      requiresAllergyFriendly !== undefined ? (requiresAllergyFriendly ? 1 : 0) : pkg.requiresAllergyFriendly,
      req.params.id
    );

    const updatedPkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);

    res.json({
      ...updatedPkg,
      features: parseJSON(updatedPkg.features, []),
      roomIds: parseJSON(updatedPkg.roomIds, []),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const deletePackage = async (req, res) => {
  try {
    const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);

    if (!pkg) {
      return res.status(404).json({ message: '套餐不存在' });
    }

    db.prepare('DELETE FROM packages WHERE id = ?').run(req.params.id);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const recommendPackages = async (req, res) => {
  const { petId } = req.params;

  try {
    const pet = db.prepare('SELECT * FROM pets WHERE id = ? AND userId = ?').get(petId, req.user.id);

    if (!pet) {
      return res.status(404).json({ message: '宠物不存在' });
    }

    const allergies = parseJSON(pet.allergies, []);
    const hasAllergies = allergies.length > 0;

    let packages = db.prepare('SELECT * FROM packages').all();
    const allRooms = db.prepare('SELECT * FROM rooms').all();

    const scoredPackages = packages.map(pkg => {
      let score = 0;
      const reasons = [];
      const roomIds = parseJSON(pkg.roomIds, []);
      const availableRooms = allRooms.filter(r => roomIds.includes(r.id) && r.status === 'available');

      if (pkg.requiresAllergyFriendly && hasAllergies) {
        score += 3;
        reasons.push('适合过敏体质宠物');
      }

      if (!pkg.requiresAllergyFriendly && !hasAllergies) {
        score += 1;
      }

      if (pkg.minAge && pet.age >= pkg.minAge) {
        score += 1;
        reasons.push(`适合${pkg.minAge}岁以上宠物`);
      }

      if (pkg.maxAge && pet.age <= pkg.maxAge) {
        score += 1;
        reasons.push(`适合${pkg.maxAge}岁以下宠物`);
      }

      if (pkg.minWeight && pet.weight >= pkg.minWeight) {
        score += 1;
        reasons.push(`适合${pkg.minWeight}kg以上宠物`);
      }

      if (pkg.maxWeight && pet.weight <= pkg.maxWeight) {
        score += 1;
        reasons.push(`适合${pkg.maxWeight}kg以下宠物`);
      }

      return {
        ...pkg,
        features: parseJSON(pkg.features, []),
        roomIds,
        score,
        reasons,
        availableRooms: availableRooms.length,
        rooms: availableRooms,
      };
    });

    scoredPackages.sort((a, b) => b.score - a.score);

    res.json({
      data: scoredPackages,
      recommended: scoredPackages[0]?.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};
