const COLLECTIONS = [
  'users', 'vehicles', 'stores', 'packages', 'bookings',
  'workOrders', 'orders', 'rescues', 'rescueVehicles',
  'violations', 'insurances', 'members', 'reminders', 'reports'
];

const idCounters = {};

class Store {
  constructor() {
    this.data = new Map();
    COLLECTIONS.forEach(name => this.data.set(name, new Map()));
  }

  generateId(prefix) {
    if (!idCounters[prefix]) {
      idCounters[prefix] = 0;
    }
    idCounters[prefix]++;
    const seq = String(idCounters[prefix]).padStart(4, '0');
    return `${prefix}${seq}`;
  }

  findById(collection, id) {
    return this.data.get(collection)?.get(id) || null;
  }

  findAll(collection) {
    const col = this.data.get(collection);
    if (!col) return [];
    return Array.from(col.values());
  }

  create(collection, item) {
    const col = this.data.get(collection);
    if (!col) throw new Error(`集合 ${collection} 不存在`);
    if (!item.id) {
      throw new Error('创建项目必须提供 id');
    }
    const now = new Date().toISOString();
    item.createdAt = item.createdAt || now;
    item.updatedAt = now;
    col.set(item.id, item);
    return item;
  }

  update(collection, id, updates) {
    const col = this.data.get(collection);
    if (!col) throw new Error(`集合 ${collection} 不存在`);
    const item = col.get(id);
    if (!item) return null;
    Object.assign(item, updates, { updatedAt: new Date().toISOString() });
    return item;
  }

  delete(collection, id) {
    const col = this.data.get(collection);
    if (!col) return false;
    return col.delete(id);
  }

  count(collection) {
    const col = this.data.get(collection);
    if (!col) return 0;
    return col.size;
  }

  query(collection, filterFn) {
    const col = this.data.get(collection);
    if (!col) return [];
    return Array.from(col.values()).filter(filterFn);
  }

  async init() {
    try {
      const seedData = require('../data/seed');
      if (typeof seedData === 'function') {
        await seedData(this);
      } else if (typeof seedData === 'object' && seedData !== null) {
        Object.entries(seedData).forEach(([collection, items]) => {
          if (Array.isArray(items) && this.data.has(collection)) {
            items.forEach(item => this.create(collection, item));
          }
        });
      }
    } catch (err) {
      console.warn('种子数据加载失败:', err.message);
    }
  }
}

const instance = new Store();

module.exports = instance;
