const http = require('http');
const BASE = 'localhost';
const PORT = 3000;

const req = (method, path, data = null) => new Promise((resolve, reject) => {
  const opts = { hostname: BASE, port: PORT, path, method, headers: { 'Content-Type': 'application/json' } };
  const r = http.request(opts, res => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => {
      try { resolve({ s: res.statusCode, d: JSON.parse(b) }); }
      catch (e) { resolve({ s: res.statusCode, d: b }); }
    });
  });
  r.on('error', reject);
  if (data) r.write(JSON.stringify(data));
  r.end();
});

(async () => {
  let failed = 0;
  const check = (name, condition, detail) => {
    if (condition) {
      console.log(`   ✅ ${name} ${detail || ''}`);
    } else {
      console.log(`   ❌ ${name} ${detail || ''}`);
      failed++;
    }
  };

  console.log('=== 完整 API 验证 ===\n');

  console.log('1. 创建用户 (三种等级)');
  const u1 = await req('POST', '/api/users', { username: 'zhangsan', phone: '13800001111', memberLevel: 'normal' });
  const u2 = await req('POST', '/api/users', { username: 'lisi', phone: '13800002222', memberLevel: 'silver' });
  const u3 = await req('POST', '/api/users', { username: 'wangwu', phone: '13800003333', memberLevel: 'gold' });
  const id1 = u1.d._id, id2 = u2.d._id, id3 = u3.d._id;
  check('普通会员', u1.s === 201, u1.d.username);
  check('银卡会员', u2.s === 201, u2.d.username);
  check('金卡会员', u3.s === 201, u3.d.username);

  console.log('\n2. 创建礼品');
  const g1 = await req('POST', '/api/gifts', { name: 'earphone', pointsRequired: 100, stock: 5, category: 'digital' });
  const g2 = await req('POST', '/api/gifts', { name: 'bottle', pointsRequired: 50, stock: 20, category: 'life' });
  const g3 = await req('POST', '/api/gifts', { name: 'powerbank', pointsRequired: 80, stock: 10, category: 'digital' });
  const gid1 = g1.d._id, gid2 = g2.d._id, gid3 = g3.d._id;
  check('earphone(100pts)', g1.s === 201);
  check('bottle(50pts)', g2.s === 201);
  check('powerbank(80pts)', g3.s === 201);

  console.log('\n3. 订单支付 + 积分倍率验证');
  const o1 = await req('POST', '/api/orders', { userId: id1, items: [{ name: 'itemA', price: 100, quantity: 3 }] });
  await req('PUT', '/api/orders/' + o1.d._id + '/pay');
  check('normal 1x: 300->' + o1.d.pointsEarned, o1.d.pointsEarned === 300, 'pts=' + o1.d.pointsEarned);

  const o2 = await req('POST', '/api/orders', { userId: id2, items: [{ name: 'itemB', price: 100, quantity: 3 }] });
  await req('PUT', '/api/orders/' + o2.d._id + '/pay');
  check('silver 1.2x: 300->' + o2.d.pointsEarned, o2.d.pointsEarned === 360, 'pts=' + o2.d.pointsEarned);

  const o3 = await req('POST', '/api/orders', { userId: id3, items: [{ name: 'itemC', price: 100, quantity: 3 }] });
  await req('PUT', '/api/orders/' + o3.d._id + '/pay');
  check('gold 1.5x: 300->' + o3.d.pointsEarned, o3.d.pointsEarned === 450, 'pts=' + o3.d.pointsEarned);

  console.log('\n4. 发放优惠券');
  const c1 = await req('POST', '/api/coupons/issue/user/' + id1, {
    couponTemplate: { name: 'fixed50', type: 'fixed', value: 50, minPurchase: 200, validDays: 30 },
    reason: 'test'
  });
  const c2 = await req('POST', '/api/coupons/issue/user/' + id1, {
    couponTemplate: { name: 'discount10', type: 'discount', value: 10, minPurchase: 100, validDays: 30 },
    reason: 'test'
  });
  check('fixed coupon', c1.s === 200, c1.d.code);
  check('discount coupon', c2.s === 200, c2.d.code);

  console.log('\n5. 最优优惠券推荐');
  const best = await req('GET', '/api/coupons/user/' + id1 + '/best?orderAmount=500');
  check('best coupon found', best.d.coupon != null, best.d.coupon ? best.d.coupon.name + ' discount=' + best.d.discount : 'none');

  console.log('\n6. 自动应用最优优惠券下单');
  const o4 = await req('POST', '/api/orders/auto-coupon', {
    userId: id1, items: [{ name: 'itemD', price: 500, quantity: 1 }]
  });
  check('auto coupon applied', o4.s === 201, 'original=' + o4.d.order.totalAmount + ' discount=' + o4.d.couponDiscount + ' final=' + o4.d.order.finalAmount);
  await req('PUT', '/api/orders/' + o4.d.order._id + '/pay');

  console.log('\n7. 礼品兑换(成功)');
  const ex1 = await req('POST', '/api/gifts/exchange', { userId: id1, giftId: gid2, quantity: 1 });
  check('exchange bottle', ex1.d.success === true, 'spent=' + ex1.d.pointsSpent);

  console.log('\n8. 礼品兑换(库存不足+替代推荐)');
  const o5 = await req('POST', '/api/orders', { userId: id3, items: [{ name: 'more', price: 200, quantity: 1 }] });
  await req('PUT', '/api/orders/' + o5.d._id + '/pay');
  for (let i = 0; i < 5; i++) {
    await req('POST', '/api/gifts/exchange', { userId: id3, giftId: gid1, quantity: 1 });
  }
  const ex2 = await req('POST', '/api/gifts/exchange', { userId: id1, giftId: gid1, quantity: 1 });
  check('out of stock blocked', ex2.d.success === false, ex2.d.error);
  check('alternatives recommended', ex2.d.alternatives && ex2.d.alternatives.length > 0,
    ex2.d.alternatives ? ex2.d.alternatives.map(a => a.name).join(',') : 'none');

  console.log('\n9. 积分记录查询');
  const pr = await req('GET', '/api/points/user/' + id1 + '?page=1&limit=5');
  check('points records', pr.s === 200, 'count=' + pr.d.records.length + ' total=' + pr.d.pagination.total);

  console.log('\n10. 即将过期积分');
  const ep = await req('GET', '/api/points/expiring/' + id1);
  check('expiring points', ep.s === 200, 'pts=' + ep.d.expiringPoints);

  console.log('\n11. 行为定向发券');
  const ic = await req('POST', '/api/coupons/issue/inactive-users');
  const hc = await req('POST', '/api/coupons/issue/high-activity');
  check('inactive user coupons', ic.s === 200, 'issued=' + ic.d.issuedCount);
  check('high activity coupons', hc.s === 200, 'issued=' + hc.d.issuedCount);

  console.log('\n12. 月度积分统计');
  const now = new Date();
  const ps = await req('GET', '/api/points/stats/monthly?year=' + now.getFullYear() + '&month=' + (now.getMonth() + 1));
  check('points stats', ps.s === 200, 'earn_n=' + ps.d.earn.normal + ' earn_s=' + ps.d.earn.silver + ' earn_g=' + ps.d.earn.gold);

  console.log('\n13. 优惠券核销率报表');
  const cs = await req('GET', '/api/coupons/stats/monthly?year=' + now.getFullYear() + '&month=' + (now.getMonth() + 1));
  check('coupon stats', cs.s === 200, 'issued_groups=' + cs.d.issued.length);

  console.log('\n14. 积分明细报表(CSV)');
  const rp1 = await req('GET', '/api/reports/points/details?year=' + now.getFullYear() + '&month=' + (now.getMonth() + 1) + '&format=csv');
  check('points detail CSV', rp1.s === 200, 'length=' + (typeof rp1.d === 'string' ? rp1.d.length : 'json'));

  console.log('\n15. 积分汇总报表');
  const rp2 = await req('GET', '/api/reports/points/summary?year=' + now.getFullYear() + '&month=' + (now.getMonth() + 1));
  check('points summary', rp2.s === 200 && rp2.d.data, rp2.d.data ? 'rows=' + rp2.d.data.length : 'fail');
  if (rp2.d.data) {
    rp2.d.data.forEach(r => console.log('    ' + r['统计项目'] + ': normal=' + r['普通会员'] + ' silver=' + r['银卡会员'] + ' gold=' + r['金卡会员']));
  }

  console.log('\n16. 按等级汇总报表');
  const rp3 = await req('GET', '/api/reports/points/summary-by-level?year=' + now.getFullYear() + '&month=' + (now.getMonth() + 1));
  check('summary by level', rp3.s === 200 && rp3.d.data, rp3.d.data ? 'rows=' + rp3.d.data.length : 'fail');
  if (rp3.d.data) {
    rp3.d.data.forEach(r => console.log('    ' + r['会员等级'] + ': earn=' + r['积分发放'] + ' spend=' + r['积分消耗'] + ' net=' + r['净增积分']));
  }

  console.log('\n17. 优惠券明细报表');
  const rp4 = await req('GET', '/api/reports/coupons/details?year=' + now.getFullYear() + '&month=' + (now.getMonth() + 1));
  check('coupon details', rp4.s === 200 && rp4.d.data, 'rows=' + (rp4.d.data ? rp4.d.data.length : 0));

  console.log('\n18. Dashboard');
  const dash = await req('GET', '/api/reports/dashboard');
  check('dashboard', dash.s === 200, 'users=' + dash.d.totalUsers + ' pts=' + dash.d.totalPointsIssued + ' rate=' + dash.d.couponUsageRate);

  console.log('\n19. 积分明细报表(按等级筛选)');
  const rp5 = await req('GET', '/api/reports/points/details?year=' + now.getFullYear() + '&month=' + (now.getMonth() + 1) + '&memberLevel=gold');
  check('gold-only details', rp5.s === 200, rp5.d.data ? 'rows=' + rp5.d.data.length : 'ok');

  console.log('\n20. 订单预览计算');
  const preview = await req('POST', '/api/orders/preview', {
    userId: id1, items: [{ name: 'itemE', price: 300, quantity: 1 }]
  });
  check('order preview', preview.s === 200, 'total=' + preview.d.totalAmount + ' final=' + preview.d.finalAmount + ' pts=' + preview.d.pointsEarned);

  console.log('\n========================================');
  if (failed === 0) {
    console.log('  ✅ ALL ' + 20 + ' TESTS PASSED');
  } else {
    console.log('  ❌ ' + failed + ' TESTS FAILED');
  }
  console.log('========================================');
})();
