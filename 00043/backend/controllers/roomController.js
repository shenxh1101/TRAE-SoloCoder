import db from '../config/db.js';
import { generateId, toJSON, parseJSON } from '../utils/helpers.js';

export const getRooms = async (req, res) => {
  try {
    const rooms = db.prepare('SELECT * FROM rooms').all();
    const formatted = rooms.map(room => ({
      ...room,
      features: parseJSON(room.features, []),
    }));
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const getAvailableRooms = async (req, res) => {
  const { startDate, endDate, packageId } = req.query;

  try {
    let query = 'SELECT * FROM rooms WHERE status = ?';
    let params = ['available'];

    if (packageId) {
      const pkg = db.prepare('SELECT roomIds FROM packages WHERE id = ?').get(packageId);
      if (pkg) {
        const roomIds = parseJSON(pkg.roomIds, []);
        if (roomIds.length > 0) {
          const placeholders = roomIds.map(() => '?').join(',');
          query = `SELECT * FROM rooms WHERE status = ? AND id IN (${placeholders})`;
          params = ['available', ...roomIds];
        }
      }
    }

    const rooms = db.prepare(query).all(...params);
    const formatted = rooms.map(room => ({
      ...room,
      features: parseJSON(room.features, []),
    }));

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const getRoom = async (req, res) => {
  try {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);

    if (!room) {
      return res.status(404).json({ message: '房间不存在' });
    }

    res.json({
      ...room,
      features: parseJSON(room.features, []),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const createRoom = async (req, res) => {
  const { name, type, status, capacity, features } = req.body;

  try {
    const id = generateId();
    db.prepare(`
      INSERT INTO rooms (id, name, type, status, capacity, features)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      type,
      status || 'available',
      capacity || 1,
      toJSON(features || [])
    );

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);

    res.status(201).json({
      ...room,
      features: parseJSON(room.features, []),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const updateRoom = async (req, res) => {
  const { name, type, status, capacity, features } = req.body;

  try {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);

    if (!room) {
      return res.status(404).json({ message: '房间不存在' });
    }

    db.prepare(`
      UPDATE rooms
      SET name = ?, type = ?, status = ?, capacity = ?, features = ?
      WHERE id = ?
    `).run(
      name || room.name,
      type || room.type,
      status || room.status,
      capacity !== undefined ? capacity : room.capacity,
      toJSON(features || parseJSON(room.features, [])),
      req.params.id
    );

    const updatedRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);

    res.json({
      ...updatedRoom,
      features: parseJSON(updatedRoom.features, []),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);

    if (!room) {
      return res.status(404).json({ message: '房间不存在' });
    }

    db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};
