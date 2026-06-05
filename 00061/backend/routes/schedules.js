const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');

const router = express.Router();

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function detectConflicts(schedules) {
  const conflicts = [];
  const resourceGroups = {};

  schedules.forEach(s => {
    if (!resourceGroups[s.resource_name]) {
      resourceGroups[s.resource_name] = [];
    }
    resourceGroups[s.resource_name].push(s);
  });

  for (const resource in resourceGroups) {
    const bookings = resourceGroups[resource];
    for (let i = 0; i < bookings.length; i++) {
      for (let j = i + 1; j < bookings.length; j++) {
        const a = bookings[i];
        const b = bookings[j];
        const aStart = timeToMinutes(a.start_time);
        const aEnd = timeToMinutes(a.end_time);
        const bStart = timeToMinutes(b.start_time);
        const bEnd = timeToMinutes(b.end_time);

        if (aStart < bEnd && bStart < aEnd) {
          const suggestion = generateConflictSuggestion(a, b, bookings);
          conflicts.push({
            resource,
            booking1: a,
            booking2: b,
            suggestion
          });
        }
      }
    }
  }

  return conflicts;
}

function generateConflictSuggestion(a, b, allBookings) {
  const highPriority = a.priority <= b.priority ? a : b;
  const lowPriority = a.priority > b.priority ? a : b;

  const usedSlots = allBookings
    .filter(b => b.id !== lowPriority.id)
    .map(b => [timeToMinutes(b.start_time), timeToMinutes(b.end_time)]);

  const duration = timeToMinutes(lowPriority.end_time) - timeToMinutes(lowPriority.start_time);
  const dayStart = 8 * 60;
  const dayEnd = 18 * 60;

  for (let t = dayStart; t + duration <= dayEnd; t += 30) {
    let conflict = false;
    for (const [start, end] of usedSlots) {
      if (t < end && t + duration > start) {
        conflict = true;
        break;
      }
    }
    if (!conflict) {
      const newStart = `${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`;
      const newEnd = `${Math.floor((t + duration) / 60).toString().padStart(2, '0')}:${((t + duration) % 60).toString().padStart(2, '0')}`;
      return `建议将「${lowPriority.project}」调整至 ${newStart}-${newEnd}`;
    }
  }

  return `建议优先安排「${highPriority.project}」，「${lowPriority.project}」请另选时间`;
}

router.get('/', (req, res) => {
  const db = getDB();
  const { date } = req.query;
  let schedules;
  
  if (date) {
    schedules = db.prepare(`
      SELECT * FROM schedules 
      WHERE DATE(created_at) = DATE(?)
      ORDER BY resource_name, start_time
    `).all(date);
  } else {
    schedules = db.prepare(`
      SELECT * FROM schedules 
      ORDER BY resource_name, start_time
    `).all();
  }
  
  const conflicts = detectConflicts(schedules);
  
  schedules.forEach(s => {
    const hasConflict = conflicts.some(c => 
      (c.booking1.id === s.id || c.booking2.id === s.id)
    );
    s.conflict = hasConflict ? 1 : 0;
    if (hasConflict) {
      const conflict = conflicts.find(c => 
        c.booking1.id === s.id || c.booking2.id === s.id
      );
      s.conflict_suggestion = conflict.suggestion;
    }
  });

  res.json({ schedules, conflicts });
});

router.get('/conflicts', (req, res) => {
  const db = getDB();
  const schedules = db.prepare('SELECT * FROM schedules').all();
  const conflicts = detectConflicts(schedules);
  res.json(conflicts);
});

router.post('/auto-adjust', (req, res) => {
  const db = getDB();
  const adjustments = [];

  let schedules = db.prepare('SELECT * FROM schedules ORDER BY priority, start_time').all();
  let conflicts = detectConflicts(schedules);
  let maxIterations = 10;
  let iterations = 0;

  while (conflicts.length > 0 && iterations < maxIterations) {
    iterations++;
    const conflict = conflicts[0];
    const highPriority = conflict.booking1.priority <= conflict.booking2.priority ? conflict.booking1 : conflict.booking2;
    const lowPriority = conflict.booking1.priority > conflict.booking2.priority ? conflict.booking1 : conflict.booking2;

    const otherBookings = schedules.filter(s => s.id !== lowPriority.id && s.resource_name === lowPriority.resource_name);
    const usedSlots = otherBookings.map(b => [timeToMinutes(b.start_time), timeToMinutes(b.end_time)]);
    const duration = timeToMinutes(lowPriority.end_time) - timeToMinutes(lowPriority.start_time);
    const dayStart = 8 * 60;
    const dayEnd = 18 * 60;

    let newStartTime = null;
    let newEndTime = null;

    for (let t = dayStart; t + duration <= dayEnd; t += 30) {
      let slotConflict = false;
      for (const [start, end] of usedSlots) {
        if (t < end && t + duration > start) {
          slotConflict = true;
          break;
        }
      }
      if (!slotConflict) {
        newStartTime = `${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`;
        newEndTime = `${Math.floor((t + duration) / 60).toString().padStart(2, '0')}:${((t + duration) % 60).toString().padStart(2, '0')}`;
        break;
      }
    }

    if (newStartTime && newEndTime) {
      db.prepare(`
        UPDATE schedules 
        SET start_time = ?, end_time = ?, conflict = 0, conflict_suggestion = NULL
        WHERE id = ?
      `).run(newStartTime, newEndTime, lowPriority.id);

      adjustments.push({
        schedule_id: lowPriority.id,
        project: lowPriority.project,
        old_time: `${lowPriority.start_time}-${lowPriority.end_time}`,
        new_time: `${newStartTime}-${newEndTime}`,
        reason: `与「${highPriority.project}」冲突，按优先级自动调整`
      });

      const alertId = uuidv4();
      db.prepare(`
        INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        alertId,
        'schedule',
        '预约已自动调整',
        `「${lowPriority.project}」已调整至 ${newStartTime}-${newEndTime}`,
        'info',
        lowPriority.id,
        'schedule'
      );
    }

    schedules = db.prepare('SELECT * FROM schedules ORDER BY priority, start_time').all();
    conflicts = detectConflicts(schedules);
  }

  schedules = db.prepare(`
    SELECT * FROM schedules 
    ORDER BY resource_name, start_time
  `).all();

  const remainingConflicts = detectConflicts(schedules);
  schedules.forEach(s => {
    const hasConflict = remainingConflicts.some(c => 
      (c.booking1.id === s.id || c.booking2.id === s.id)
    );
    if (hasConflict) {
      const conflict = remainingConflicts.find(c => 
        c.booking1.id === s.id || c.booking2.id === s.id
      );
      db.prepare(`
        UPDATE schedules 
        SET conflict = 1, conflict_suggestion = ?
        WHERE id = ?
      `).run(conflict.suggestion, s.id);
    } else {
      db.prepare(`
        UPDATE schedules 
        SET conflict = 0, conflict_suggestion = NULL
        WHERE id = ?
      `).run(s.id);
    }
  });

  const finalSchedules = db.prepare(`
    SELECT * FROM schedules 
    ORDER BY resource_name, start_time
  `).all();

  res.json({
    message: `完成${adjustments.length}项预约调整`,
    adjustments,
    remaining_conflicts: remainingConflicts.length,
    schedules: finalSchedules
  });
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
  
  if (!schedule) {
    return res.status(404).json({ error: '预约不存在' });
  }
  
  res.json(schedule);
});

router.post('/', (req, res) => {
  const db = getDB();
  const { resource_name, start_time, end_time, project, person, priority = 2 } = req.body;

  if (!resource_name || !start_time || !end_time || !project || !person) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const id = 's' + Date.now().toString().slice(-6);
  
  db.prepare(`
    INSERT INTO schedules (id, resource_name, start_time, end_time, project, person, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, resource_name, start_time, end_time, project, person, priority);

  const allSchedules = db.prepare('SELECT * FROM schedules').all();
  const conflicts = detectConflicts(allSchedules);
  
  const hasConflict = conflicts.some(c => 
    c.booking1.id === id || c.booking2.id === id
  );

  if (hasConflict) {
    const conflict = conflicts.find(c => 
      c.booking1.id === id || c.booking2.id === id
    );
    db.prepare(`
      UPDATE schedules 
      SET conflict = 1, conflict_suggestion = ?
      WHERE id = ?
    `).run(conflict.suggestion, id);

    const alertId = uuidv4();
    db.prepare(`
      INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      alertId,
      'schedule',
      '预约冲突检测',
      `检测到「${project}」与现有预约冲突，${conflict.suggestion}`,
      'warning',
      id,
      'schedule'
    );
  }

  const created = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { resource_name, start_time, end_time, project, person, priority } = req.body;

  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '预约不存在' });
  }

  db.prepare(`
    UPDATE schedules 
    SET resource_name = ?, start_time = ?, end_time = ?, project = ?, person = ?, priority = ?, conflict = 0, conflict_suggestion = NULL
    WHERE id = ?
  `).run(
    resource_name || existing.resource_name,
    start_time || existing.start_time,
    end_time || existing.end_time,
    project || existing.project,
    person || existing.person,
    priority !== undefined ? priority : existing.priority,
    id
  );

  const allSchedules = db.prepare('SELECT * FROM schedules').all();
  const conflicts = detectConflicts(allSchedules);
  
  const hasConflict = conflicts.some(c => 
    c.booking1.id === id || c.booking2.id === id
  );

  if (hasConflict) {
    const conflict = conflicts.find(c => 
      c.booking1.id === id || c.booking2.id === id
    );
    db.prepare(`
      UPDATE schedules 
      SET conflict = 1, conflict_suggestion = ?
      WHERE id = ?
    `).run(conflict.suggestion, id);
  }

  const updated = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '预约不存在' });
  }

  db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
  res.json({ message: '预约已删除' });
});

router.post('/resolve-conflict', (req, res) => {
  const db = getDB();
  const { schedule_id, new_start_time, new_end_time } = req.body;

  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(schedule_id);
  if (!existing) {
    return res.status(404).json({ error: '预约不存在' });
  }

  db.prepare(`
    UPDATE schedules 
    SET start_time = ?, end_time = ?, conflict = 0, conflict_suggestion = NULL
    WHERE id = ?
  `).run(new_start_time, new_end_time, schedule_id);

  const alertId = uuidv4();
  db.prepare(`
    INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    alertId,
    'schedule',
    '预约冲突已解决',
    `「${existing.project}」已调整至 ${new_start_time}-${new_end_time}`,
    'info',
    schedule_id,
    'schedule'
  );

  const updated = db.prepare('SELECT * FROM schedules WHERE id = ?').get(schedule_id);
  res.json(updated);
});

router.get('/auto-assign/resources', (req, res) => {
  const db = getDB();
  const resources = [
    { name: '生物实验台-01', type: 'experiment_table' },
    { name: '生物实验台-02', type: 'experiment_table' },
    { name: '化学实验台-01', type: 'experiment_table' },
    { name: '化学实验台-02', type: 'experiment_table' },
    { name: '化学实验台-03', type: 'experiment_table' },
    { name: 'PCR仪-01', type: 'instrument' },
    { name: '高速离心机', type: 'instrument' },
    { name: '紫外分光光度计', type: 'instrument' }
  ];

  const assignments = resources.map(r => {
    const bookings = db.prepare(`
      SELECT * FROM schedules 
      WHERE resource_name = ?
      ORDER BY start_time
    `).all(r.name);

    return {
      ...r,
      bookings,
      utilization: Math.min(bookings.length * 25, 100)
    };
  });

  res.json(assignments);
});

module.exports = { schedulesRouter: router };
