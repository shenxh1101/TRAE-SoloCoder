import db from '../config/db.js';
import { Parser } from 'json2csv';

export const getDashboardStats = async (req, res) => {
  try {
    const totalBookings = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
    const activeBookings = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE status IN (?, ?, ?)').get('pending', 'confirmed', 'in_progress').count;
    const completedBookings = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE status = ?').get('completed').count;

    const totalRevenue = db.prepare('SELECT SUM(totalPrice) as total FROM bookings WHERE status = ?').get('completed').total || 0;

    const totalRooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
    const occupiedRooms = db.prepare('SELECT COUNT(*) as count FROM rooms WHERE status = ? OR status = ?').get('occupied', 'locked').count;
    const availableRooms = totalRooms - occupiedRooms;

    const totalPets = db.prepare('SELECT COUNT(*) as count FROM pets').get().count;
    const totalCaregivers = db.prepare('SELECT COUNT(*) as count FROM caregivers').get().count;

    const pendingReminders = db.prepare('SELECT COUNT(*) as count FROM reminders WHERE isRead = 0').get().count;

    const rooms = db.prepare('SELECT * FROM rooms').all();

    res.json({
      stats: {
        totalBookings,
        activeBookings,
        completedBookings,
        totalRevenue,
        totalRooms,
        occupiedRooms,
        availableRooms,
        totalPets,
        totalCaregivers,
        pendingReminders,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      },
      rooms,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const getRevenueReport = async (req, res) => {
  const { startDate, endDate, caregiverId, packageId } = req.query;

  try {
    let query = 'SELECT * FROM bookings WHERE status = ?';
    let params = ['completed'];

    if (startDate) {
      query += ' AND createdAt >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND createdAt <= ?';
      params.push(endDate);
    }
    if (caregiverId) {
      query += ' AND caregiverId = ?';
      params.push(caregiverId);
    }
    if (packageId) {
      query += ' AND packageId = ?';
      params.push(packageId);
    }

    query += ' ORDER BY createdAt DESC';

    const bookings = db.prepare(query).all(...params);

    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const avgBookingValue = bookings.length > 0 ? totalRevenue / bookings.length : 0;

    const caregivers = db.prepare('SELECT id, name FROM caregivers').all();
    const caregiverMap = new Map(caregivers.map(c => [c.id, c.name]));

    const packages = db.prepare('SELECT id, name FROM packages').all();
    const packageMap = new Map(packages.map(p => [p.id, p.name]));

    const bookingsWithDetails = bookings.map(b => ({
      ...b,
      caregiverName: caregiverMap.get(b.caregiverId) || '未分配',
      packageName: packageMap.get(b.packageId) || '未知套餐',
    }));

    res.json({
      totalRevenue,
      avgBookingValue,
      totalBookings: bookings.length,
      bookings: bookingsWithDetails,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const exportRevenueCSV = async (req, res) => {
  const { startDate, endDate, caregiverId, packageId } = req.query;

  try {
    let query = 'SELECT * FROM bookings WHERE status = ?';
    let params = ['completed'];

    if (startDate) {
      query += ' AND createdAt >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND createdAt <= ?';
      params.push(endDate);
    }
    if (caregiverId) {
      query += ' AND caregiverId = ?';
      params.push(caregiverId);
    }
    if (packageId) {
      query += ' AND packageId = ?';
      params.push(packageId);
    }

    query += ' ORDER BY createdAt DESC';

    const bookings = db.prepare(query).all(...params);

    const caregivers = db.prepare('SELECT id, name FROM caregivers').all();
    const caregiverMap = new Map(caregivers.map(c => [c.id, c.name]));

    const packages = db.prepare('SELECT id, name FROM packages').all();
    const packageMap = new Map(packages.map(p => [p.id, p.name]));

    const csvData = bookings.map(b => ({
      '订单ID': b.id,
      '创建时间': b.createdAt,
      '开始日期': b.startDate,
      '结束日期': b.endDate,
      '护理员': caregiverMap.get(b.caregiverId) || '未分配',
      '套餐': packageMap.get(b.packageId) || '未知套餐',
      '总价': b.totalPrice,
      '定金': b.deposit,
      '状态': b.status,
    }));

    const fields = ['订单ID', '创建时间', '开始日期', '结束日期', '护理员', '套餐', '总价', '定金', '状态'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    const filename = `revenue_report_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const exportCaregiverReportCSV = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    let query = `
      SELECT 
        c.id as caregiverId,
        c.name as caregiverName,
        c.specialties,
        c.experienceYears,
        c.rating,
        c.reviewCount,
        COUNT(b.id) as totalBookings
      FROM caregivers c
      LEFT JOIN bookings b ON c.id = b.caregiverId AND b.status = 'completed'
    `;
    let params = [];
    let whereAdded = false;

    if (startDate) {
      query += ` WHERE b.createdAt >= ?`;
      params.push(startDate);
      whereAdded = true;
    }
    if (endDate) {
      query += whereAdded ? ` AND b.createdAt <= ?` : ` WHERE b.createdAt <= ?`;
      params.push(endDate);
    }

    query += ` GROUP BY c.id ORDER BY totalBookings DESC`;

    const caregivers = db.prepare(query).all(...params);

    const csvData = caregivers.map(c => ({
      '护理员ID': c.caregiverId,
      '护理员姓名': c.caregiverName,
      '专长': JSON.parse(c.specialties || '[]').join(', '),
      '经验年数': c.experienceYears,
      '平均评分': c.rating,
      '评价次数': c.reviewCount,
      '完成订单数': c.totalBookings,
    }));

    const fields = ['护理员ID', '护理员姓名', '专长', '经验年数', '平均评分', '评价次数', '完成订单数'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    const filename = `caregiver_report_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};
