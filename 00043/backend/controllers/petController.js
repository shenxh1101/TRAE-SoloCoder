import db from '../config/db.js';
import { generateId, toJSON, parseJSON, formatRow, formatRows } from '../utils/helpers.js';

export const getPets = async (req, res) => {
  try {
    const pets = db.prepare('SELECT * FROM pets WHERE userId = ?').all(req.user.id);

    const petsWithVaccines = pets.map(pet => {
      const vaccines = db.prepare('SELECT * FROM vaccines WHERE petId = ?').all(pet.id);
      return {
        ...pet,
        allergies: parseJSON(pet.allergies, []),
        vaccines,
      };
    });

    res.json(petsWithVaccines);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const getPet = async (req, res) => {
  try {
    const pet = db.prepare('SELECT * FROM pets WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);

    if (!pet) {
      return res.status(404).json({ message: '宠物不存在' });
    }

    const vaccines = db.prepare('SELECT * FROM vaccines WHERE petId = ?').all(pet.id);

    res.json({
      ...pet,
      allergies: parseJSON(pet.allergies, []),
      vaccines,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const createPet = async (req, res) => {
  const { name, breed, age, weight, gender, avatar, allergies, vaccines = [], vaccineRecords = [] } = req.body;
  const vaccineList = vaccines.length > 0 ? vaccines : vaccineRecords;

  try {
    const id = generateId();
    db.prepare(`
      INSERT INTO pets (id, userId, name, breed, age, weight, gender, avatar, allergies)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.user.id,
      name,
      breed,
      age,
      weight,
      gender,
      avatar || `https://loremflickr.com/200/200/pet,${breed}`,
      toJSON(allergies || [])
    );

    vaccineList.forEach(vaccine => {
      const vaccineId = generateId();
      db.prepare(`
        INSERT INTO vaccines (id, petId, name, date, status, nextDate)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(vaccineId, id, vaccine.name, vaccine.date, vaccine.status || 'completed', vaccine.nextDate || null);
    });

    const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(id);
    const petVaccines = db.prepare('SELECT * FROM vaccines WHERE petId = ?').all(id);

    res.status(201).json({
      ...pet,
      allergies: parseJSON(pet.allergies, []),
      vaccines: petVaccines,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const updatePet = async (req, res) => {
  const { name, breed, age, weight, gender, avatar, allergies, vaccines = [], vaccineRecords = [] } = req.body;
  const vaccineList = vaccines.length > 0 ? vaccines : vaccineRecords;

  try {
    const pet = db.prepare('SELECT * FROM pets WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);

    if (!pet) {
      return res.status(404).json({ message: '宠物不存在' });
    }

    db.prepare(`
      UPDATE pets
      SET name = ?, breed = ?, age = ?, weight = ?, gender = ?, avatar = ?, allergies = ?
      WHERE id = ?
    `).run(
      name || pet.name,
      breed || pet.breed,
      age !== undefined ? age : pet.age,
      weight !== undefined ? weight : pet.weight,
      gender || pet.gender,
      avatar || pet.avatar,
      toJSON(allergies || parseJSON(pet.allergies, [])),
      req.params.id
    );

    db.prepare('DELETE FROM vaccines WHERE petId = ?').run(req.params.id);
    vaccineList.forEach(vaccine => {
      const vaccineId = generateId();
      db.prepare(`
        INSERT INTO vaccines (id, petId, name, date, status, nextDate)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(vaccineId, req.params.id, vaccine.name, vaccine.date, vaccine.status || 'completed', vaccine.nextDate || null);
    });

    const updatedPet = db.prepare('SELECT * FROM pets WHERE id = ?').get(req.params.id);
    const petVaccines = db.prepare('SELECT * FROM vaccines WHERE petId = ?').all(req.params.id);

    res.json({
      ...updatedPet,
      allergies: parseJSON(updatedPet.allergies, []),
      vaccines: petVaccines,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const deletePet = async (req, res) => {
  try {
    const pet = db.prepare('SELECT * FROM pets WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);

    if (!pet) {
      return res.status(404).json({ message: '宠物不存在' });
    }

    db.prepare('DELETE FROM pets WHERE id = ?').run(req.params.id);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const getAllPets = async (req, res) => {
  try {
    const pets = db.prepare(`
      SELECT p.*, u.name as ownerName, u.email as ownerEmail
      FROM pets p
      LEFT JOIN users u ON p.userId = u.id
    `).all();

    const petsWithDetails = pets.map(pet => {
      const vaccines = db.prepare('SELECT * FROM vaccines WHERE petId = ?').all(pet.id);
      return {
        ...pet,
        allergies: parseJSON(pet.allergies, []),
        vaccines,
      };
    });

    res.json(petsWithDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};
