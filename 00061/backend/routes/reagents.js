const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');

const router = express.Router();

const LOW_STOCK_THRESHOLD = 20;

function checkReagentStatus(reagent) {
  const percentage = (reagent.remaining / reagent.capacity) * 100;
  return percentage <= LOW_STOCK_THRESHOLD ? 'warning' : 'normal';
}

function calculateSuggestedAmount(reagent) {
  const deficit = reagent.capacity - reagent.remaining;
  const unit = reagent.unit === '%' ? 'ml' : reagent.unit;
  return Math.ceil(deficit) + unit;
}

router.get('/', (req, res) => {
  const db = getDB();
  const reagents = db.prepare('SELECT * FROM reagents ORDER BY id').all();
  res.json(reagents);
});

router.get('/low-stock', (req, res) => {
  const db = getDB();
  const lowStock = db.prepare(`
    SELECT * FROM reagents 
    WHERE (remaining / capacity) * 100 <= ?
    ORDER BY remaining ASC
  `).all(LOW_STOCK_THRESHOLD);
  res.json(lowStock);
});

router.get('/purchase-orders', (req, res) => {
  const db = getDB();
  const orders = db.prepare('SELECT * FROM purchase_orders ORDER BY created_at DESC').all();
  res.json(orders);
});

router.post('/purchase-orders', (req, res) => {
  const db = getDB();
  const { reagent_id, amount, applicant, remark } = req.body;

  const reagent = db.prepare('SELECT * FROM reagents WHERE id = ?').get(reagent_id);
  if (!reagent) {
    return res.status(404).json({ error: '试剂不存在' });
  }

  const orderId = 'PO-' + Date.now().toString().slice(-8);
  const suggestedAmount = calculateSuggestedAmount(reagent);

  db.prepare(`
    INSERT INTO purchase_orders (id, reagent_id, reagent_name, current_remaining, suggested_amount, amount, applicant, remark, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderId,
    reagent_id,
    reagent.name,
    reagent.remaining,
    suggestedAmount,
    amount || suggestedAmount,
    applicant || '系统自动生成',
    remark || `试剂库存低于${LOW_STOCK_THRESHOLD}%阈值，系统自动生成采购申请`,
    'pending'
  );

  const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(orderId);
  
  const alertId = uuidv4();
  db.prepare(`
    INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    alertId,
    'purchase',
    '采购申请已创建',
    `已创建${reagent.name}的采购申请单`,
    'info',
    orderId,
    'purchase_order'
  );

  res.status(201).json(order);
});

router.put('/purchase-orders/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { status } = req.body;

  const existing = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '采购单不存在' });
  }

  db.prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').run(status, id);
  const updated = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
  res.json(updated);
});

router.post('/auto-generate-purchase', (req, res) => {
  const db = getDB();
  const lowStockReagents = db.prepare(`
    SELECT * FROM reagents 
    WHERE (remaining / capacity) * 100 <= ? AND status = 'warning'
  `).all(LOW_STOCK_THRESHOLD);

  const createdOrders = [];

  lowStockReagents.forEach(reagent => {
    const existingOrder = db.prepare(`
      SELECT * FROM purchase_orders 
      WHERE reagent_id = ? AND status = 'pending'
    `).get(reagent.id);

    if (!existingOrder) {
      const orderId = 'PO-' + Date.now().toString().slice(-8) + '-' + Math.random().toString(36).slice(2, 4);
      const suggestedAmount = calculateSuggestedAmount(reagent);

      db.prepare(`
        INSERT INTO purchase_orders (id, reagent_id, reagent_name, current_remaining, suggested_amount, amount, applicant, remark, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        reagent.id,
        reagent.name,
        reagent.remaining,
        suggestedAmount,
        suggestedAmount,
        '系统自动生成',
        `试剂库存低于${LOW_STOCK_THRESHOLD}%阈值，系统自动生成采购申请`,
        'pending'
      );

      createdOrders.push(db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(orderId));
    }
  });

  res.json({
    message: `自动生成${createdOrders.length}份采购申请单`,
    orders: createdOrders
  });
});

router.post('/:id/purchase-order', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { amount, applicant, remark } = req.body;

  const reagent = db.prepare('SELECT * FROM reagents WHERE id = ?').get(id);
  if (!reagent) {
    return res.status(404).json({ error: '试剂不存在' });
  }

  const existingOrder = db.prepare(`
    SELECT * FROM purchase_orders 
    WHERE reagent_id = ? AND status = 'pending'
  `).get(id);

  if (existingOrder) {
    return res.status(400).json({ error: '该试剂已有待处理的采购申请', order: existingOrder });
  }

  const orderId = 'PO-' + Date.now().toString().slice(-8);
  const suggestedAmount = calculateSuggestedAmount(reagent);

  db.prepare(`
    INSERT INTO purchase_orders (id, reagent_id, reagent_name, current_remaining, suggested_amount, amount, applicant, remark, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderId,
    id,
    reagent.name,
    reagent.remaining,
    suggestedAmount,
    amount || suggestedAmount,
    applicant || '系统自动生成',
    remark || `试剂库存低于${LOW_STOCK_THRESHOLD}%阈值，系统自动生成采购申请`,
    'pending'
  );

  const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(orderId);
  
  const alertId = uuidv4();
  db.prepare(`
    INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    alertId,
    'purchase',
    '采购申请已创建',
    `已创建${reagent.name}的采购申请单`,
    'info',
    orderId,
    'purchase_order'
  );

  res.status(201).json(order);
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const reagent = db.prepare('SELECT * FROM reagents WHERE id = ?').get(req.params.id);
  
  if (!reagent) {
    return res.status(404).json({ error: '试剂不存在' });
  }
  
  res.json(reagent);
});

router.put('/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { remaining, name, expiry } = req.body;

  const existing = db.prepare('SELECT * FROM reagents WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '试剂不存在' });
  }

  const newRemaining = remaining !== undefined ? remaining : existing.remaining;
  const status = checkReagentStatus({ ...existing, remaining: newRemaining });

  db.prepare(`
    UPDATE reagents 
    SET remaining = ?, name = ?, expiry = ?, status = ?, last_updated = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    newRemaining,
    name || existing.name,
    expiry || existing.expiry,
    status,
    id
  );

  const updated = db.prepare('SELECT * FROM reagents WHERE id = ?').get(id);
  
  if (status === 'warning' && existing.status !== 'warning') {
    const alertId = uuidv4();
    db.prepare(`
      INSERT INTO alerts (id, type, title, description, level, related_id, related_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      alertId,
      'reagent',
      '试剂库存不足',
      `${updated.name}剩余量${newRemaining}%，低于${LOW_STOCK_THRESHOLD}%阈值`,
      'warning',
      id,
      'reagent'
    );
  }

  res.json(updated);
});

module.exports = { reagentsRouter: router };
