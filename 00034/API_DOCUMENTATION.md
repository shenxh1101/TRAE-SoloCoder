# 会员积分与优惠券管理系统 - API文档

## 项目概述

基于 Node.js + Express + MongoDB 构建的会员积分与优惠券管理系统后端API。

### 技术栈
- Node.js
- Express.js
- MongoDB
- node-cron (定时任务)
- json2csv (报表导出)

---

## 目录结构

```
├── src/
│   ├── app.js                 # 应用入口
│   ├── config/
│   │   └── database.js        # 数据库配置
│   ├── models/                # 数据模型
│   │   ├── User.js
│   │   ├── PointsRecord.js
│   │   ├── Gift.js
│   │   ├── Coupon.js
│   │   ├── Order.js
│   │   └── ExchangeRecord.js
│   ├── services/              # 业务服务
│   │   ├── pointsService.js
│   │   ├── giftService.js
│   │   ├── couponService.js
│   │   ├── orderService.js
│   │   └── reportService.js
│   ├── routes/                # API路由
│   │   ├── userRoutes.js
│   │   ├── pointsRoutes.js
│   │   ├── giftRoutes.js
│   │   ├── couponRoutes.js
│   │   ├── orderRoutes.js
│   │   └── reportRoutes.js
│   └── tasks/
│       └── scheduler.js       # 定时任务
├── tests/
│   └── api.test.js            # API测试脚本
├── .env                       # 环境配置
└── package.json
```

---

## 会员等级与积分规则

| 会员等级 | 积分倍率 | 说明 |
|---------|---------|------|
| normal  | 1倍     | 普通会员 |
| silver  | 1.2倍   | 银卡会员 |
| gold    | 1.5倍   | 金卡会员 |

---

## API接口文档

### 1. 用户管理

#### 创建用户
- **POST** `/api/users`
- **Body**:
```json
{
  "username": "string",
  "phone": "string",
  "email": "string",
  "memberLevel": "normal|silver|gold"
}
```

#### 获取用户信息
- **GET** `/api/users/:userId`

#### 更新用户信息
- **PUT** `/api/users/:userId`

#### 更新登录时间
- **PUT** `/api/users/:userId/login`

#### 获取用户列表
- **GET** `/api/users?page=1&limit=20&memberLevel=normal`

---

### 2. 积分管理

#### 获取用户积分记录
- **GET** `/api/points/user/:userId?page=1&limit=20`

#### 获取即将过期积分
- **GET** `/api/points/expiring/:userId`

#### 获取月度积分统计
- **GET** `/api/points/stats/monthly?year=2024&month=6`

---

### 3. 礼品管理

#### 创建礼品
- **POST** `/api/gifts`
- **Body**:
```json
{
  "name": "string",
  "description": "string",
  "pointsRequired": 100,
  "stock": 50,
  "category": "string"
}
```

#### 获取礼品列表
- **GET** `/api/gifts?page=1&limit=20&category=electronics`

#### 获取礼品详情
- **GET** `/api/gifts/:giftId`

#### 兑换礼品
- **POST** `/api/gifts/exchange`
- **Body**:
```json
{
  "userId": "string",
  "giftId": "string",
  "quantity": 1
}
```
- **说明**: 库存不足或积分不足时返回替代礼品推荐

#### 获取用户兑换记录
- **GET** `/api/gifts/exchange/user/:userId?page=1&limit=20`

---

### 4. 优惠券管理

#### 创建优惠券
- **POST** `/api/coupons`

#### 给单个用户发券
- **POST** `/api/coupons/issue/user/:userId`
- **Body**:
```json
{
  "couponTemplate": {
    "name": "string",
    "type": "fixed|discount",
    "value": 50,
    "minPurchase": 200,
    "validDays": 30
  },
  "reason": "string"
}
```

#### 给30天未登录用户发券
- **POST** `/api/coupons/issue/inactive-users`

#### 给高活跃用户发券
- **POST** `/api/coupons/issue/high-activity`

#### 获取用户优惠券
- **GET** `/api/coupons/user/:userId?status=available`

#### 获取用户有效优惠券
- **GET** `/api/coupons/user/:userId/valid`

#### 获取最优优惠券
- **GET** `/api/coupons/user/:userId/best?orderAmount=500`

#### 使用优惠券
- **PUT** `/api/coupons/:couponId/use`
- **Body**:
```json
{
  "orderId": "string",
  "orderAmount": 500
}
```

#### 月度优惠券统计
- **GET** `/api/coupons/stats/monthly?year=2024&month=6`

---

### 5. 订单管理

#### 创建订单（指定优惠券）
- **POST** `/api/orders`
- **Body**:
```json
{
  "userId": "string",
  "items": [
    {"name": "string", "price": 100, "quantity": 1}
  ],
  "couponId": "string (可选)"
}
```

#### 创建订单（自动应用最优优惠券）
- **POST** `/api/orders/auto-coupon`
- **Body**:
```json
{
  "userId": "string",
  "items": [
    {"name": "string", "price": 100, "quantity": 1}
  ]
}
```

#### 订单预览计算
- **POST** `/api/orders/preview`

#### 订单支付（发放积分）
- **PUT** `/api/orders/:orderId/pay`

#### 取消订单（退回优惠券）
- **PUT** `/api/orders/:orderId/cancel`

#### 获取订单详情
- **GET** `/api/orders/:orderId`

#### 获取用户订单列表
- **GET** `/api/orders/user/:userId?page=1&limit=20`

---

### 6. 报表导出

#### 积分明细报表
- **GET** `/api/reports/points/details?year=2024&month=6&format=csv|json`

#### 积分汇总报表
- **GET** `/api/reports/points/summary?year=2024&month=6&format=csv|json`

#### 优惠券核销率报表
- **GET** `/api/reports/coupons/summary?year=2024&month=6&format=csv|json`

#### 优惠券明细报表
- **GET** `/api/reports/coupons/details?year=2024&month=6&format=csv|json`

#### 看板统计
- **GET** `/api/reports/dashboard`

---

## 定时任务

系统自动执行以下定时任务：

| 任务 | 执行时间 | 说明 |
|-----|---------|------|
| 积分过期提醒 | 每天09:00 | 12月1日起扫描并提醒即将过期积分 |
| 积分过期扣除 | 每年1月1日00:00 | 自动扣除上一年过期的积分 |
| 行为定向发券 | 每月1日00:00 | 给30天未登录用户和高活跃用户发券 |
| 优惠券过期检查 | 每天00:00 | 标记过期优惠券 |

---

## 快速开始

### 安装依赖
```bash
npm install
```

### 配置环境变量
编辑 `.env` 文件：
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/membership_system
NODE_ENV=development
```

### 启动服务
```bash
npm start
```

### 开发模式
```bash
npm run dev
```

### 运行测试
```bash
npm test
```

---

## 核心功能实现要点

### 1. 积分计算
- 根据会员等级自动计算积分倍率
- 支持普通1倍、银卡1.2倍、金卡1.5倍
- 积分自动计算并记录变动历史

### 2. 礼品兑换
- 实时库存校验
- 积分余额校验
- 库存不足时智能推荐同类别替代礼品

### 3. 优惠券系统
- 支持满减券和折扣券
- 自动校验有效期和使用门槛
- 下单时自动选择最优优惠券

### 4. 行为定向发券
- 30天未登录用户：回归专享券
- 高活跃度用户（10单+5000元）：专属折扣券

### 5. 积分过期管理
- 积分有效期至当年12月31日
- 12月1日起每日提醒即将过期积分
- 次年1月1日自动扣除过期积分

### 6. 报表功能
- 按月份导出积分发放/消耗统计
- 按会员等级和券类型汇总核销率
- 支持CSV格式导出
