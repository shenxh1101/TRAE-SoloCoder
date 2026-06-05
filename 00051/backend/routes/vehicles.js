const express = require('express');
const { getOne, getAll, runQuery } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const generateId = () => Math.random().toString(36).substring(2, 11);

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT *, created_at as createdAt FROM vehicles';
    let params = [];
    
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const vehicles = await getAll(sql, params);
    
    const formattedVehicles = vehicles.map(v => ({
      ...v,
      plateNumber: v.plate_number,
      currentMileage: v.current_mileage,
      fuelLevel: v.fuel_level,
      createdAt: v.createdAt
    }));
    
    res.json(formattedVehicles);
  } catch (error) {
    console.error('获取车辆列表错误:', error);
    res.status(500).json({ error: '获取车辆列表失败' });
  }
});

router.get('/available', authenticateToken, async (req, res) => {
  try {
    const { startTime, endTime, seats } = req.query;
    
    if (!startTime || !endTime) {
      return res.status(400).json({ error: '请提供开始和结束时间' });
    }

    const vehicles = await getAll(`
      SELECT v.*, v.created_at as createdAt 
      FROM vehicles v 
      WHERE v.status = 'idle' 
      AND v.id NOT IN (
        SELECT a.vehicle_id FROM applications a 
        WHERE a.status IN ('approved', 'in_progress')
        AND (
          (a.start_time <= ? AND a.end_time >= ?)
          OR (a.start_time >= ? AND a.start_time <= ?)
          OR (a.end_time >= ? AND a.end_time <= ?)
        )
      )
      ORDER BY v.seats
    `, [endTime, startTime, startTime, endTime, startTime, endTime]);

    const formattedVehicles = vehicles.map(v => ({
      ...v,
      plateNumber: v.plate_number,
      currentMileage: v.current_mileage,
      fuelLevel: v.fuel_level,
      createdAt: v.created_at
    }));

    const result = formattedVehicles.map(vehicle => {
      let matchScore = 0;
      if (seats) {
        const seatDiff = Math.abs(vehicle.seats - parseInt(seats));
        matchScore = Math.max(0, 100 - seatDiff * 10);
        if (vehicle.seats >= parseInt(seats)) {
          matchScore += 20;
        }
      }
      return { vehicle, matchScore };
    });

    res.json(result);
  } catch (error) {
    console.error('获取可用车辆错误:', error);
    res.status(500).json({ error: '获取可用车辆失败' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const vehicle = await getOne('SELECT *, created_at as createdAt FROM vehicles WHERE id = ?', [req.params.id]);
    
    if (!vehicle) {
      return res.status(404).json({ error: '车辆不存在' });
    }

    const formattedVehicle = {
      ...vehicle,
      plateNumber: vehicle.plate_number,
      currentMileage: vehicle.current_mileage,
      fuelLevel: vehicle.fuel_level,
      createdAt: vehicle.created_at
    };
    
    res.json(formattedVehicle);
  } catch (error) {
    console.error('获取车辆详情错误:', error);
    res.status(500).json({ error: '获取车辆详情失败' });
  }
});

router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { plateNumber, model, seats, status = 'idle', currentMileage = 0, fuelLevel = 100 } = req.body;

    if (!plateNumber || !model || !seats) {
      return res.status(400).json({ error: '请填写完整信息' });
    }

    const existing = await getOne('SELECT id FROM vehicles WHERE plate_number = ?', [plateNumber]);
    if (existing) {
      return res.status(400).json({ error: '车牌号已存在' });
    }

    const id = 'v' + generateId();
    await runQuery(
      'INSERT INTO vehicles (id, plate_number, model, seats, status, current_mileage, fuel_level) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, plateNumber, model, seats, status, currentMileage, fuelLevel]
    );

    const vehicle = await getOne('SELECT *, created_at as createdAt FROM vehicles WHERE id = ?', [id]);
    const formattedVehicle = {
      ...vehicle,
      plateNumber: vehicle.plate_number,
      currentMileage: vehicle.current_mileage,
      fuelLevel: vehicle.fuel_level,
      createdAt: vehicle.created_at
    };
    
    res.status(201).json(formattedVehicle);
  } catch (error) {
    console.error('添加车辆错误:', error);
    res.status(500).json({ error: '添加车辆失败' });
  }
});

router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { plateNumber, model, seats, status, currentMileage, fuelLevel } = req.body;

    const vehicle = await getOne('SELECT id FROM vehicles WHERE id = ?', [req.params.id]);
    if (!vehicle) {
      return res.status(404).json({ error: '车辆不存在' });
    }

    if (plateNumber) {
      const existing = await getOne('SELECT id FROM vehicles WHERE plate_number = ? AND id != ?', [plateNumber, req.params.id]);
      if (existing) {
        return res.status(400).json({ error: '车牌号已存在' });
      }
    }

    const updates = [];
    const params = [];
    
    if (plateNumber !== undefined) { updates.push('plate_number = ?'); params.push(plateNumber); }
    if (model !== undefined) { updates.push('model = ?'); params.push(model); }
    if (seats !== undefined) { updates.push('seats = ?'); params.push(seats); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (currentMileage !== undefined) { updates.push('current_mileage = ?'); params.push(currentMileage); }
    if (fuelLevel !== undefined) { updates.push('fuel_level = ?'); params.push(fuelLevel); }
    
    params.push(req.params.id);
    
    await runQuery(`UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`, params);

    const updatedVehicle = await getOne('SELECT *, created_at as createdAt FROM vehicles WHERE id = ?', [req.params.id]);
    const formattedVehicle = {
      ...updatedVehicle,
      plateNumber: updatedVehicle.plate_number,
      currentMileage: updatedVehicle.current_mileage,
      fuelLevel: updatedVehicle.fuel_level,
      createdAt: updatedVehicle.created_at
    };
    
    res.json(formattedVehicle);
  } catch (error) {
    console.error('更新车辆错误:', error);
    res.status(500).json({ error: '更新车辆失败' });
  }
});

router.patch('/:id/toggle-status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const vehicle = await getOne('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    if (!vehicle) {
      return res.status(404).json({ error: '车辆不存在' });
    }

    const newStatus = vehicle.status === 'disabled' ? 'idle' : 'disabled';
    await runQuery('UPDATE vehicles SET status = ? WHERE id = ?', [newStatus, req.params.id]);

    const updatedVehicle = await getOne('SELECT *, created_at as createdAt FROM vehicles WHERE id = ?', [req.params.id]);
    const formattedVehicle = {
      ...updatedVehicle,
      plateNumber: updatedVehicle.plate_number,
      currentMileage: updatedVehicle.current_mileage,
      fuelLevel: updatedVehicle.fuel_level,
      createdAt: updatedVehicle.created_at
    };
    
    res.json(formattedVehicle);
  } catch (error) {
    console.error('切换车辆状态错误:', error);
    res.status(500).json({ error: '切换车辆状态失败' });
  }
});

module.exports = router;
