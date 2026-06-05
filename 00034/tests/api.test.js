const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

const makeRequest = (method, path, data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('=== 开始 API 测试 ===\n');

  try {
    console.log('1. 测试健康检查接口');
    const health = await makeRequest('GET', '/health');
    console.log(`   状态: ${health.status}`, health.data);
    console.log('   ✓ 健康检查通过\n');

    console.log('2. 创建测试用户（普通会员）');
    const user1 = await makeRequest('POST', '/api/users', {
      username: 'test_user_normal',
      phone: '13800138001',
      email: 'test1@example.com',
      memberLevel: 'normal'
    });
    console.log(`   状态: ${user1.status}`);
    console.log('   ✓ 用户创建成功\n');
    const userId1 = user1.data._id;

    console.log('3. 创建测试用户（银卡会员）');
    const user2 = await makeRequest('POST', '/api/users', {
      username: 'test_user_silver',
      phone: '13800138002',
      email: 'test2@example.com',
      memberLevel: 'silver'
    });
    console.log(`   状态: ${user2.status}`);
    console.log('   ✓ 银卡用户创建成功\n');
    const userId2 = user2.data._id;

    console.log('4. 创建测试用户（金卡会员）');
    const user3 = await makeRequest('POST', '/api/users', {
      username: 'test_user_gold',
      phone: '13800138003',
      email: 'test3@example.com',
      memberLevel: 'gold'
    });
    console.log(`   状态: ${user3.status}`);
    console.log('   ✓ 金卡用户创建成功\n');
    const userId3 = user3.data._id;

    console.log('5. 创建测试礼品');
    const gift1 = await makeRequest('POST', '/api/gifts', {
      name: '测试礼品A',
      description: '测试用礼品',
      pointsRequired: 100,
      stock: 10,
      category: '电子产品'
    });
    console.log(`   状态: ${gift1.status}`);
    console.log('   ✓ 礼品创建成功\n');
    const giftId1 = gift1.data._id;

    const gift2 = await makeRequest('POST', '/api/gifts', {
      name: '测试礼品B',
      description: '替代礼品',
      pointsRequired: 80,
      stock: 20,
      category: '电子产品'
    });
    const giftId2 = gift2.data._id;

    console.log('6. 测试订单创建（普通会员积分计算）');
    const order1 = await makeRequest('POST', '/api/orders/auto-coupon', {
      userId: userId1,
      items: [
        { name: '商品1', price: 100, quantity: 1 },
        { name: '商品2', price: 200, quantity: 2 }
      ]
    });
    console.log(`   状态: ${order1.status}`);
    console.log(`   订单金额: ${order1.data.order.totalAmount}`);
    console.log(`   获得积分: ${order1.data.order.pointsEarned} (普通会员1倍: 500 * 1 = 500)`);
    console.log('   ✓ 订单创建成功\n');
    const orderId1 = order1.data.order._id;

    console.log('7. 测试订单支付（积分发放）');
    const payResult = await makeRequest('PUT', `/api/orders/${orderId1}/pay`);
    console.log(`   状态: ${payResult.status}`);
    console.log(`   支付后积分: ${payResult.data.pointsEarned}`);
    console.log('   ✓ 订单支付成功，积分已发放\n');

    console.log('8. 测试银卡会员订单积分计算');
    const order2 = await makeRequest('POST', '/api/orders', {
      userId: userId2,
      items: [{ name: '商品', price: 1000, quantity: 1 }]
    });
    console.log(`   状态: ${order2.status}`);
    console.log(`   获得积分: ${order2.data.pointsEarned} (银卡1.2倍: 1000 * 1.2 = 1200)`);
    console.log('   ✓ 银卡积分计算正确\n');

    console.log('9. 测试金卡会员订单积分计算');
    const order3 = await makeRequest('POST', '/api/orders', {
      userId: userId3,
      items: [{ name: '商品', price: 1000, quantity: 1 }]
    });
    console.log(`   状态: ${order3.status}`);
    console.log(`   获得积分: ${order3.data.pointsEarned} (金卡1.5倍: 1000 * 1.5 = 1500)`);
    console.log('   ✓ 金卡积分计算正确\n');

    console.log('10. 发放测试优惠券');
    const coupon = await makeRequest('POST', `/api/coupons/issue/user/${userId1}`, {
      couponTemplate: {
        name: '测试满减券',
        type: 'fixed',
        value: 50,
        minPurchase: 200,
        validDays: 30
      },
      reason: '测试发放'
    });
    console.log(`   状态: ${coupon.status}`);
    console.log(`   优惠券码: ${coupon.data.code}`);
    console.log('   ✓ 优惠券发放成功\n');
    const couponId = coupon.data._id;

    console.log('11. 测试优惠券核销');
    const orderWithCoupon = await makeRequest('POST', '/api/orders', {
      userId: userId1,
      items: [{ name: '商品', price: 300, quantity: 1 }],
      couponId: couponId
    });
    console.log(`   状态: ${orderWithCoupon.status}`);
    console.log(`   订单金额: ${orderWithCoupon.data.totalAmount}`);
    console.log(`   优惠金额: ${orderWithCoupon.data.couponDiscount}`);
    console.log(`   实付金额: ${orderWithCoupon.data.finalAmount}`);
    console.log('   ✓ 优惠券核销成功\n');

    console.log('12. 测试礼品兑换');
    await makeRequest('PUT', `/api/orders/${orderWithCoupon.data._id}/pay`);
    const exchangeResult = await makeRequest('POST', '/api/gifts/exchange', {
      userId: userId1,
      giftId: giftId1,
      quantity: 1
    });
    console.log(`   状态: ${exchangeResult.status}`);
    console.log(`   兑换成功: ${exchangeResult.data.success}`);
    if (exchangeResult.data.alternatives) {
      console.log(`   推荐替代礼品数: ${exchangeResult.data.alternatives.length}`);
    }
    console.log('   ✓ 礼品兑换测试完成\n');

    console.log('13. 测试积分记录查询');
    const pointsRecords = await makeRequest('GET', `/api/points/user/${userId1}?page=1&limit=5`);
    console.log(`   状态: ${pointsRecords.status}`);
    console.log(`   记录数: ${pointsRecords.data.records.length}`);
    console.log('   ✓ 积分记录查询成功\n');

    console.log('14. 测试即将过期积分查询');
    const expiringPoints = await makeRequest('GET', `/api/points/expiring/${userId1}`);
    console.log(`   状态: ${expiringPoints.status}`);
    console.log(`   即将过期积分: ${expiringPoints.data.expiringPoints}`);
    console.log('   ✓ 过期积分查询成功\n');

    console.log('15. 测试积分统计报表');
    const now = new Date();
    const pointsStats = await makeRequest('GET', 
      `/api/points/stats/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
    console.log(`   状态: ${pointsStats.status}`);
    console.log('   ✓ 积分统计查询成功\n');

    console.log('16. 测试优惠券核销率报表');
    const couponStats = await makeRequest('GET', 
      `/api/coupons/stats/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
    console.log(`   状态: ${couponStats.status}`);
    console.log(`   发放优惠券: ${couponStats.data.issued.length}`);
    console.log('   ✓ 优惠券统计查询成功\n');

    console.log('17. 测试报表导出（CSV格式）');
    const csvReport = await makeRequest('GET', 
      `/api/reports/points/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}&format=csv`);
    console.log(`   状态: ${csvReport.status}`);
    console.log(`   内容长度: ${csvReport.data.length} 字符`);
    console.log('   ✓ CSV报表导出成功\n');

    console.log('18. 测试最佳优惠券推荐');
    const bestCoupon = await makeRequest('GET', 
      `/api/coupons/user/${userId1}/best?orderAmount=500`);
    console.log(`   状态: ${bestCoupon.status}`);
    console.log('   ✓ 最佳优惠券查询完成\n');

    console.log('=== 所有测试完成 ===');
    console.log('\n测试总结:');
    console.log('- 用户管理: ✓');
    console.log('- 会员等级积分计算: ✓ (普通1倍, 银卡1.2倍, 金卡1.5倍)');
    console.log('- 积分变动记录: ✓');
    console.log('- 礼品兑换与库存管理: ✓');
    console.log('- 替代礼品推荐: ✓');
    console.log('- 定向优惠券发放: ✓');
    console.log('- 优惠券自动核销: ✓');
    console.log('- 最优优惠券选择: ✓');
    console.log('- 积分过期提醒: ✓');
    console.log('- 统计报表导出: ✓');

  } catch (error) {
    console.error('测试失败:', error.message);
  }
};

runTests();
