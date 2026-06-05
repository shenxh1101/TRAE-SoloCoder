import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { getDb } from '../db.js';
import { broadcastScheduleUpdate } from '../websocket.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/schedules', (req, res) => {
  try {
    const db = getDb();
    const { departmentId, doctorId, date, startDate, endDate } = req.query;

    let sql = 'SELECT * FROM schedules WHERE 1=1';
    const params = [];

    if (departmentId) {
      sql += ' AND departmentId = ?';
      params.push(departmentId);
    }

    if (doctorId) {
      sql += ' AND doctorId = ?';
      params.push(doctorId);
    }

    if (date) {
      sql += ' AND date = ?';
      params.push(date);
    }

    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY date DESC, startTime';
    const schedules = db.prepare(sql).all(...params);
    res.json({ code: 200, message: 'success', data: schedules });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.post('/schedules', (req, res) => {
  try {
    const db = getDb();
    const schedules = Array.isArray(req.body) ? req.body : [req.body];

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO schedules (id, doctorId, doctorName, departmentId, departmentName, date, startTime, endTime, shiftType, expectedPatients)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items) => {
      const results = [];
      for (const s of items) {
        const id = s.id || `sch-${s.date}-${s.doctorId}`;
        insertStmt.run(id, s.doctorId, s.doctorName, s.departmentId, s.departmentName,
          s.date, s.startTime, s.endTime, s.shiftType, s.expectedPatients || 25);
        results.push({ ...s, id });
      }
      return results;
    });

    const results = insertMany(schedules);

    for (const schedule of results) {
      broadcastScheduleUpdate(schedule);
    }

    res.json({ code: 200, message: 'success', data: results });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.post('/schedules/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: 'No file uploaded', data: null });
    }

    const db = getDb();
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO schedules (id, doctorId, doctorName, departmentId, departmentName, date, startTime, endTime, shiftType, expectedPatients)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const results = [];
    const errors = [];
    const warnings = [];

    const insertMany = db.transaction((items) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const doctorId = row['doctorId'] || row['医生ID'] || row['工号'];
          const doctorName = row['doctorName'] || row['医生姓名'] || row['姓名'];
          const departmentId = row['departmentId'] || row['科室ID'];
          const departmentName = row['departmentName'] || row['科室'];
          const date = row['date'] || row['日期'];
          const startTime = row['startTime'] || row['开始时间'] || '08:00';
          const endTime = row['endTime'] || row['结束时间'] || '12:00';
          const shiftType = row['shiftType'] || row['班次'] || 'morning';
          const expectedPatients = parseInt(row['expectedPatients'] || row['预计接诊量'] || 25);

          if (!doctorId || !date) {
            errors.push(`Row ${i + 2}: Missing required fields (doctorId, date)`);
            continue;
          }

          const id = `sch-${date}-${doctorId}`;
          insertStmt.run(id, doctorId, doctorName, departmentId, departmentName,
            date, startTime, endTime, shiftType, expectedPatients);
          results.push({ id, doctorId, doctorName, departmentId, departmentName, date, startTime, endTime, shiftType, expectedPatients });
        } catch (rowErr) {
          errors.push(`Row ${i + 2}: ${rowErr.message}`);
        }
      }
    });

    insertMany(rows);

    for (const schedule of results) {
      broadcastScheduleUpdate(schedule);
    }

    res.json({
      code: 200,
      message: 'success',
      data: { success: true, data: results, errors, warnings },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

router.get('/schedules/analysis', (req, res) => {
  try {
    const db = getDb();
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const schedules = db.prepare(`
      SELECT * FROM schedules WHERE date = ?
    `).all(targetDate);

    const analysis = schedules.map(schedule => {
      const actualReg = db.prepare(`
        SELECT COUNT(*) as cnt FROM registrations
        WHERE doctorId = ? AND DATE(registerTime) = ?
      `).get(schedule.doctorId, targetDate);

      const actual = actualReg.cnt;
      const expected = schedule.expectedPatients;
      const completionRate = expected > 0 ? Math.round((actual / expected) * 100) : 0;
      const variance = expected > 0 ? ((actual - expected) / expected) * 100 : 0;
      const isAbnormal = actual < expected * 0.5 && actual > 0;

      return {
        schedule,
        actualPatients: actual,
        expectedPatients: expected,
        completionRate,
        variance: Math.round(variance * 10) / 10,
        isAbnormal,
      };
    });

    res.json({ code: 200, message: 'success', data: analysis });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message, data: null });
  }
});

export default router;
