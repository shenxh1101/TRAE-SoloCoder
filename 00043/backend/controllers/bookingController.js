import db from '../config/db.js';
import { generateId, toJSON, parseJSON } from '../utils/helpers.js';

export const getBookings = async (req, res) => {
  try {
    let bookings;
    if (req.user.role === 'admin') {
      bookings = db.prepare('SELECT * FROM bookings ORDER BY createdAt DESC').all();
    } else if (req.user.role === 'caregiver') {
      bookings = db.prepare('SELECT * FROM bookings WHERE caregiverId = ? ORDER BY createdAt DESC').all(req.user.id);
    } else {
      bookings = db.prepare('SELECT * FROM bookings WHERE userId = ? ORDER BY createdAt DESC').all(req.user.id);
    }

    const bookingsWithDetails = bookings.map(booking => {
      const updates = db.prepare('SELECT * FROM booking_updates WHERE bookingId = ? ORDER BY createdAt DESC').all(booking.id);
      const messages = db.prepare('SELECT * FROM messages WHERE bookingId = ? ORDER BY createdAt DESC').all(booking.id);
      const reviews = db.prepare('SELECT * FROM reviews WHERE bookingId = ?').all(booking.id);

      return {
        ...booking,
        specialRequests: parseJSON(booking.specialRequests, []),
        updates: updates.map(u => ({
          ...u,
          mediaUrls: parseJSON(u.mediaUrls, []),
        })),
        messages,
        reviews,
      };
    });

    res.json(bookingsWithDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const getBooking = async (req, res) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: '订单不存在' });
    }

    if (req.user.role !== 'admin' && booking.userId !== req.user.id && booking.caregiverId !== req.user.id) {
      return res.status(403).json({ message: '无权访问此订单' });
    }

    const updates = db.prepare('SELECT * FROM booking_updates WHERE bookingId = ? ORDER BY createdAt DESC').all(booking.id);
    const messages = db.prepare('SELECT * FROM messages WHERE bookingId = ? ORDER BY createdAt DESC').all(booking.id);
    const reviews = db.prepare('SELECT * FROM reviews WHERE bookingId = ?').all(booking.id);

    res.json({
      ...booking,
      specialRequests: parseJSON(booking.specialRequests, []),
      updates: updates.map(u => ({
        ...u,
        mediaUrls: parseJSON(u.mediaUrls, []),
      })),
      messages,
      reviews,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const createBooking = async (req, res) => {
  const { petId, packageId, roomId, caregiverId, startDate, endDate, totalPrice, deposit, specialRequests } = req.body;

  try {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ? AND status = ?').get(roomId, 'available');
    if (!room) {
      return res.status(400).json({ message: '房间不可用' });
    }

    const id = generateId();
    db.prepare(`
      INSERT INTO bookings (id, userId, petId, packageId, roomId, caregiverId, startDate, endDate, totalPrice, deposit, status, specialRequests)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.user.id,
      petId,
      packageId,
      roomId,
      caregiverId || null,
      startDate,
      endDate,
      totalPrice,
      deposit,
      'pending',
      toJSON(specialRequests || [])
    );

    db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run('locked', roomId);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);

    res.status(201).json({
      ...booking,
      specialRequests: parseJSON(booking.specialRequests, []),
      updates: [],
      messages: [],
      reviews: [],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const updateBookingStatus = async (req, res) => {
  const { status } = req.body;

  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: '订单不存在' });
    }

    if (booking.status === 'pending' && status === 'confirmed') {
      db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run('occupied', booking.roomId);
    } else if ((booking.status === 'pending' || booking.status === 'confirmed') && status === 'cancelled') {
      db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run('available', booking.roomId);
    } else if ((booking.status === 'confirmed' || booking.status === 'in_progress') && status === 'completed') {
      db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run('available', booking.roomId);
    }

    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);

    const updatedBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    res.json({
      ...updatedBooking,
      specialRequests: parseJSON(updatedBooking.specialRequests, []),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const payDeposit = async (req, res) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: '订单不存在' });
    }

    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权操作此订单' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: '订单状态不正确' });
    }

    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('confirmed', req.params.id);
    db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run('occupied', booking.roomId);

    const updatedBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    res.json({
      ...updatedBooking,
      specialRequests: parseJSON(updatedBooking.specialRequests, []),
      paymentStatus: 'success',
      transactionId: `TXN_${Date.now()}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const addBookingUpdate = async (req, res) => {
  const { type, note } = req.body;

  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: '订单不存在' });
    }

    if (req.user.role !== 'caregiver' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '只有护理员和管理员可以上传更新' });
    }

    const mediaUrls = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        mediaUrls.push(`/uploads/${file.filename}`);
      });
    }

    const id = generateId();
    db.prepare(`
      INSERT INTO booking_updates (id, bookingId, caregiverId, type, note, mediaUrls)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.params.id,
      booking.caregiverId || req.user.id,
      type,
      note || '',
      toJSON(mediaUrls)
    );

    const update = db.prepare('SELECT * FROM booking_updates WHERE id = ?').get(id);

    res.status(201).json({
      ...update,
      mediaUrls: parseJSON(update.mediaUrls, []),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const addMessage = async (req, res) => {
  const { content } = req.body;

  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: '订单不存在' });
    }

    if (booking.userId !== req.user.id && booking.caregiverId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权发送消息' });
    }

    const id = generateId();
    db.prepare(`
      INSERT INTO messages (id, bookingId, senderId, senderName, senderRole, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.params.id,
      req.user.id,
      req.user.name,
      req.user.role,
      content
    );

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const addReview = async (req, res) => {
  const { rating, content } = req.body;

  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: '订单不存在' });
    }

    if (booking.userId !== req.user.id) {
      return res.status(403).json({ message: '只有寄养用户可以评价' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: '只有已完成的订单可以评价' });
    }

    const existingReview = db.prepare('SELECT * FROM reviews WHERE bookingId = ?').get(req.params.id);
    if (existingReview) {
      return res.status(400).json({ message: '已经评价过了' });
    }

    const id = generateId();
    db.prepare(`
      INSERT INTO reviews (id, bookingId, caregiverId, rating, content)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.params.id, booking.caregiverId, rating, content || '');

    const caregiver = db.prepare('SELECT * FROM caregivers WHERE id = ?').get(booking.caregiverId);
    if (caregiver) {
      const newReviewCount = caregiver.reviewCount + 1;
      const newRating = ((caregiver.rating * caregiver.reviewCount) + rating) / newReviewCount;

      let newWeight = caregiver.recommendationWeight;
      if (rating > 3) {
        newWeight = Math.min(newWeight + 0.1, 2);
      } else if (rating < 3) {
        newWeight = Math.max(newWeight - 0.2, 0.1);
      }

      db.prepare(`
        UPDATE caregivers
        SET rating = ?, reviewCount = ?, recommendationWeight = ?
        WHERE id = ?
      `).run(newRating, newReviewCount, newWeight, booking.caregiverId);
    }

    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
    res.status(201).json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const getReminders = async (req, res) => {
  try {
    const reminders = db.prepare('SELECT * FROM reminders WHERE isRead = 0 ORDER BY createdAt DESC').all();
    res.json(reminders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

export const dismissReminder = async (req, res) => {
  try {
    db.prepare('UPDATE reminders SET isRead = 1 WHERE id = ?').run(req.params.id);
    res.json({ message: '提醒已忽略' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};
