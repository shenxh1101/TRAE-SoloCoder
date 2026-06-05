import db from '../config/db.js';
import { generateId, toJSON, parseJSON } from '../utils/helpers.js';

export const getCaregivers = async (req, res) => {
  try {
    const caregivers = db.prepare('SELECT * FROM caregivers').all();
    const formatted = caregivers.map(c => ({
      ...c,
      specialties: parseJSON(c.specialties, []),
    }));
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const getCaregiver = async (req, res) => {
  try {
    const caregiver = db.prepare('SELECT * FROM caregivers WHERE id = ?').get(req.params.id);

    if (!caregiver) {
      return res.status(404).json({ message: '护理员不存在' });
    }

    res.json({
      ...caregiver,
      specialties: parseJSON(caregiver.specialties, []),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const createCaregiver = async (req, res) => {
  const { name, avatar, specialties, experienceYears, rating, recommendationWeight } = req.body;

  try {
    const id = generateId();
    db.prepare(`
      INSERT INTO caregivers (id, name, avatar, specialties, experienceYears, rating, recommendationWeight)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
      toJSON(specialties || []),
      experienceYears || 0,
      rating || 5,
      recommendationWeight || 1
    );

    const caregiver = db.prepare('SELECT * FROM caregivers WHERE id = ?').get(id);

    res.status(201).json({
      ...caregiver,
      specialties: parseJSON(caregiver.specialties, []),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const updateCaregiver = async (req, res) => {
  const { name, avatar, specialties, experienceYears, rating, recommendationWeight } = req.body;

  try {
    const caregiver = db.prepare('SELECT * FROM caregivers WHERE id = ?').get(req.params.id);

    if (!caregiver) {
      return res.status(404).json({ message: '护理员不存在' });
    }

    db.prepare(`
      UPDATE caregivers
      SET name = ?, avatar = ?, specialties = ?, experienceYears = ?, rating = ?, recommendationWeight = ?
      WHERE id = ?
    `).run(
      name || caregiver.name,
      avatar || caregiver.avatar,
      toJSON(specialties || parseJSON(caregiver.specialties, [])),
      experienceYears !== undefined ? experienceYears : caregiver.experienceYears,
      rating !== undefined ? rating : caregiver.rating,
      recommendationWeight !== undefined ? recommendationWeight : caregiver.recommendationWeight,
      req.params.id
    );

    const updatedCaregiver = db.prepare('SELECT * FROM caregivers WHERE id = ?').get(req.params.id);

    res.json({
      ...updatedCaregiver,
      specialties: parseJSON(updatedCaregiver.specialties, []),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const deleteCaregiver = async (req, res) => {
  try {
    const caregiver = db.prepare('SELECT * FROM caregivers WHERE id = ?').get(req.params.id);

    if (!caregiver) {
      return res.status(404).json({ message: '护理员不存在' });
    }

    db.prepare('DELETE FROM caregivers WHERE id = ?').run(req.params.id);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const assignCaregiver = async (req, res) => {
  const { petId, startDate, endDate } = req.query;

  try {
    const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(petId);
    if (!pet) {
      return res.status(404).json({ message: '宠物不存在' });
    }

    const caregivers = db.prepare('SELECT * FROM caregivers').all();
    const schedules = db.prepare('SELECT * FROM schedules WHERE date >= ? AND date <= ?').all(startDate, endDate);

    const petAllergies = parseJSON(pet.allergies, []);
    const hasAllergies = petAllergies.length > 0;

    const scoredCaregivers = caregivers.map(caregiver => {
      let score = caregiver.recommendationWeight * 10;
      const specialties = parseJSON(caregiver.specialties, []);
      const reasons = [];

      const hasScheduleConflict = schedules.some(s => s.caregiverId === caregiver.id);
      if (hasScheduleConflict) {
        score -= 100;
        reasons.push('排班冲突');
      } else {
        reasons.push('档期空闲');
      }

      if (hasAllergies && specialties.includes('过敏护理')) {
        score += 5;
        reasons.push('擅长过敏护理');
      }

      if (pet.age > 8 && specialties.includes('老年护理')) {
        score += 3;
        reasons.push('擅长老年护理');
      }

      if (caregiver.experienceYears >= 5) {
        score += 3;
        reasons.push(`${caregiver.experienceYears}年丰富经验`);
      } else if (caregiver.experienceYears >= 2) {
        score += 1;
        reasons.push(`${caregiver.experienceYears}年经验`);
      }

      if (caregiver.rating >= 4.5) {
        score += 2;
        reasons.push(`高评分 ${caregiver.rating}`);
      }

      return {
        ...caregiver,
        specialties,
        score,
        reasons,
      };
    });

    scoredCaregivers.sort((a, b) => b.score - a.score);

    const recommended = scoredCaregivers[0];

    res.json({
      recommended: recommended ? {
        ...recommended,
        specialties: parseJSON(recommended.specialties, []),
      } : null,
      alternatives: scoredCaregivers.slice(1, 3).map(c => ({
        ...c,
        specialties: parseJSON(c.specialties, []),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const getSchedules = async (req, res) => {
  try {
    const schedules = db.prepare('SELECT * FROM schedules').all();
    res.json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const addSchedule = async (req, res) => {
  const { caregiverId, date, shift } = req.body;

  try {
    const id = generateId();
    db.prepare(`
      INSERT INTO schedules (id, caregiverId, date, shift)
      VALUES (?, ?, ?, ?)
    `).run(id, caregiverId, date, shift);

    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
    res.status(201).json(schedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const updateSchedule = async (req, res) => {
  const { date, shift } = req.body;

  try {
    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: '排班不存在' });
    }

    db.prepare(`
      UPDATE schedules
      SET date = ?, shift = ?
      WHERE id = ?
    `).run(date || schedule.date, shift || schedule.shift, req.params.id);

    const updatedSchedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
    res.json(updatedSchedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const deleteSchedule = async (req, res) => {
  try {
    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: '排班不存在' });
    }

    db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const updateCaregiverWeight = async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  try {
    const caregiver = db.prepare('SELECT * FROM caregivers WHERE id = ?').get(id);

    if (!caregiver) {
      return res.status(404).json({ message: '护理员不存在' });
    }

    let newWeight = caregiver.recommendationWeight;
    if (rating > 3) {
      newWeight = Math.min(newWeight + 0.1, 2);
    } else if (rating < 3) {
      newWeight = Math.max(newWeight - 0.2, 0.1);
    }

    db.prepare(`
      UPDATE caregivers
      SET recommendationWeight = ?
      WHERE id = ?
    `).run(newWeight, id);

    res.json({ success: true, newWeight });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};
