const http = require('http');
const BASE = 'localhost';
const PORT = 3000;

const req = (method, path, data) => new Promise((resolve, reject) => {
  const opts = {hostname: BASE, port: PORT, path, method, headers: {'Content-Type': 'application/json'}};
  const r = http.request(opts, res => {let b='';res.on('data',c=>b+=c);res.on('end',()=>{try{resolve({s:res.statusCode,d:JSON.parse(b)})}catch(e){resolve({s:res.statusCode,d:b})}})});
  r.on('error',reject);if(data)r.write(JSON.stringify(data));r.end();
});

(async () => {
  let failed = 0;
  const check = (name, condition, detail) => {
    if (condition) { console.log('   ✅ ' + name + ' ' + (detail || '')); }
    else { console.log('   ❌ ' + name + ' ' + (detail || '')); failed++; }
  };

  const ts = Date.now();
  console.log('=== 定时任务功能验证 ===\n');

  console.log('1. 准备测试数据');
  const u1 = await req('POST', '/api/users', { username: 'inactive_' + ts, phone: '1' + ts, memberLevel: 'normal' });
  const u2 = await req('POST', '/api/users', { username: 'active_' + ts, phone: '2' + ts, memberLevel: 'gold' });
  const id1 = u1.d._id, id2 = u2.d._id;
  check('inactive user created', u1.s === 201, u1.d.username);
  check('active user created', u2.s === 201, u2.d.username);

  console.log('\n2. 模拟30天未登录用户');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 35);
  await req('PUT', '/api/users/' + id1, { lastLoginAt: thirtyDaysAgo.toISOString() });
  const updatedUser = await req('GET', '/api/users/' + id1);
  const loginDate = new Date(updatedUser.d.lastLoginAt);
  const daysSinceLogin = (Date.now() - loginDate.getTime()) / (1000 * 60 * 60 * 24);
  check('lastLoginAt 35 days ago', daysSinceLogin > 30, 'days: ' + Math.round(daysSinceLogin));

  console.log('\n3. 模拟高活跃用户');
  await req('PUT', '/api/users/' + id2, { totalOrders: 15, totalSpent: 8000 });
  const activeUser = await req('GET', '/api/users/' + id2);
  check('totalOrders=15', activeUser.d.totalOrders === 15);
  check('totalSpent=8000', activeUser.d.totalSpent === 8000);

  console.log('\n4. 触发行为定向发券');
  const ic = await req('POST', '/api/coupons/issue/inactive-users');
  check('inactive coupons issued', ic.d.issuedCount >= 1, 'count=' + ic.d.issuedCount);
  const hc = await req('POST', '/api/coupons/issue/high-activity');
  check('active coupons issued', hc.d.issuedCount >= 1, 'count=' + hc.d.issuedCount);

  console.log('\n5. 验证休眠用户收到回归券');
  const coupons1 = await req('GET', '/api/coupons/user/' + id1);
  const couponList1 = Array.isArray(coupons1.d) ? coupons1.d : [];
  const returnCoupons = couponList1.filter(c => c.issuedReason && c.issuedReason.includes('30'));
  check('return coupon found', returnCoupons.length >= 1, 'count=' + returnCoupons.length);
  if (returnCoupons.length > 0) {
    check('return coupon minPurchase=200', returnCoupons[0].minPurchase === 200);
    check('return coupon type=fixed', returnCoupons[0].type === 'fixed');
    check('return coupon value=50', returnCoupons[0].value === 50);
    check('return coupon status=available', returnCoupons[0].status === 'available');
  }

  console.log('\n6. 验证高活跃用户收到专属券');
  const coupons2 = await req('GET', '/api/coupons/user/' + id2);
  const couponList2 = Array.isArray(coupons2.d) ? coupons2.d : [];
  const vipCoupons = couponList2.filter(c => c.issuedReason && c.issuedReason.includes('活跃'));
  check('vip coupon found', vipCoupons.length >= 1, 'count=' + vipCoupons.length);
  if (vipCoupons.length > 0) {
    check('vip coupon type=discount', vipCoupons[0].type === 'discount');
    check('vip coupon minPurchase=500', vipCoupons[0].minPurchase === 500);
  }

  console.log('\n7. 积分过期提醒验证');
  const order = await req('POST', '/api/orders', { userId: id1, items: [{ name: 'item', price: 500, quantity: 1 }] });
  await req('PUT', '/api/orders/' + order.d._id + '/pay');
  const expiring = await req('GET', '/api/points/expiring/' + id1);
  check('expiring points > 0', expiring.d.expiringPoints > 0, 'pts=' + expiring.d.expiringPoints);
  const expireDate = new Date(expiring.d.expireDate);
  check('expire date is Dec 31', expireDate.getMonth() === 11 && expireDate.getDate() === 31, expireDate.toLocaleDateString());

  console.log('\n8. 验证积分记录中包含过期时间');
  const records = await req('GET', '/api/points/user/' + id1 + '?page=1&limit=10');
  const earnRecords = records.d.records.filter(r => r.type === 'earn');
  check('earn records have expireAt', earnRecords.some(r => r.expireAt), 'with expireAt: ' + earnRecords.filter(r => r.expireAt).length);

  console.log('\n9. 验证优惠券有效期设置');
  if (returnCoupons.length > 0) {
    const validFrom = new Date(returnCoupons[0].validFrom);
    const validUntil = new Date(returnCoupons[0].validUntil);
    const validDays = Math.round((validUntil - validFrom) / (1000 * 60 * 60 * 24));
    check('valid period ~15 days', validDays === 15, 'days=' + validDays);
  }

  console.log('\n========================================');
  if (failed === 0) {
    console.log('  ✅ ALL SCHEDULER TESTS PASSED');
  } else {
    console.log('  ❌ ' + failed + ' TESTS FAILED');
  }
  console.log('========================================');
})();
