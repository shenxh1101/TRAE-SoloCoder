# 智能停车场综合管理系统 API 文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

## 认证模块 (Auth)

### 注册
```
POST /api/auth/register
Content-Type: application/json

{
  "phone": "13900139000",
  "password": "user123",
  "name": "张三",
  "licensePlate": "京A12345"
}
```

### 登录
```
POST /api/auth/login
Content-Type: application/json

{
  "phone": "13900139000",
  "password": "user123"
}
```

### 获取当前用户信息
```
GET /api/auth/me
Authorization: Bearer <token>
```

### 更新个人信息
```
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "新名字",
  "defaultPlate": "京A12345",
  "licensePlates": ["京A12345", "京B67890"]
}
```

## 车位管理模块 (Parking Spaces)

### 获取车位列表
```
GET /api/parking-spaces?zone=A&type=standard&status=available
Authorization: Bearer <token>
```

### 获取车位统计
```
GET /api/parking-spaces/stats
Authorization: Bearer <token>
```

### 查询车位可用性
```
GET /api/parking-spaces/availability?startTime=2024-01-01T09:00:00&endTime=2024-01-01T18:00:00&zone=A
Authorization: Bearer <token>
```

### 获取单个车位信息
```
GET /api/parking-spaces/:id
Authorization: Bearer <token>
```

### 获取车位空闲时段
```
GET /api/parking-spaces/:id/available-slots?date=2024-01-01&durationHours=2
Authorization: Bearer <token>
```

### 创建车位 (管理员)
```
POST /api/parking-spaces
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "spaceNumber": "F001",
  "zone": "F",
  "type": "standard",
  "floor": 2
}
```

## 预约管理模块 (Reservations)

### 计算预约费用
```
POST /api/reservations/calculate-fee
Authorization: Bearer <token>
Content-Type: application/json

{
  "vehicleType": "standard",
  "startTime": "2024-01-01T09:00:00",
  "endTime": "2024-01-01T18:00:00"
}
```

### 创建预约
```
POST /api/reservations
Authorization: Bearer <token>
Content-Type: application/json

{
  "spaceId": "60abc...",
  "licensePlate": "京A12345",
  "vehicleType": "standard",
  "startTime": "2024-01-01T09:00:00",
  "endTime": "2024-01-01T18:00:00"
}
```

### 确认预约 (15分钟内)
```
PUT /api/reservations/:id/confirm
Authorization: Bearer <token>
```

### 取消预约
```
PUT /api/reservations/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "行程变更"
}
```

### 获取我的预约
```
GET /api/reservations/my?status=confirmed&page=1&limit=20
Authorization: Bearer <token>
```

### 获取预约详情
```
GET /api/reservations/:id
Authorization: Bearer <token>
```

## 停车管理模块 (Parking)

### 车辆入场
```
POST /api/parking/entry
Content-Type: application/json

{
  "licensePlate": "京A12345",
  "entryGate": "东门入口",
  "entryImage": "https://..."
}
```

### 车辆出场
```
POST /api/parking/exit
Content-Type: application/json

{
  "licensePlate": "京A12345",
  "exitGate": "西门出口",
  "exitImage": "https://..."
}
```

### 支付停车费
```
PUT /api/parking/:id/pay
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentMethod": "wechat"
}
```

### 获取停车历史
```
GET /api/parking/history?page=1&limit=20
Authorization: Bearer <token>
```

### 获取当前停车状态
```
GET /api/parking/current
Authorization: Bearer <token>
```

## 月卡管理模块 (Monthly Cards)

### 获取月卡套餐列表
```
GET /api/monthly-cards/plans
Authorization: Bearer <token>
```

### 获取推荐套餐
```
GET /api/monthly-cards/recommend
Authorization: Bearer <token>
```

### 申请月卡
```
POST /api/monthly-cards/apply
Authorization: Bearer <token>
Content-Type: application/json

{
  "planType": "standard",
  "autoRenew": true
}
```

### 获取我的月卡
```
GET /api/monthly-cards/my?status=active
Authorization: Bearer <token>
```

### 月卡续费
```
PUT /api/monthly-cards/:id/renew
Authorization: Bearer <token>
```

### 审批月卡 (管理员)
```
PUT /api/monthly-cards/:id/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "approved": true,
  "notes": "审批通过"
}
```

## 违约管理模块 (Violations)

### 获取我的违约记录
```
GET /api/violations/my?status=pending&page=1&limit=20
Authorization: Bearer <token>
```

### 违约申诉
```
PUT /api/violations/:id/appeal
Authorization: Bearer <token>
Content-Type: application/json

{
  "appeal": "特殊情况说明..."
}
```

### 缴纳罚款
```
PUT /api/violations/:id/pay
Authorization: Bearer <token>
```

### 处理违约 (管理员)
```
PUT /api/violations/:id/handle
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "action": "dismiss",
  "notes": "情况属实，予以撤销"
}
```

### 清除用户违约记录 (管理员)
```
POST /api/violations/clear-user
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "60abc...",
  "reason": "表现良好，提前解除限制"
}
```

## 报表模块 (Reports)

### 获取仪表盘统计
```
GET /api/reports/dashboard
Authorization: Bearer <admin_token>
```

### 生成日报表
```
POST /api/reports/generate-daily?date=2024-01-01&force=true
Authorization: Bearer <admin_token>
```

### 生成周报表
```
POST /api/reports/generate-weekly?date=2024-01-01
Authorization: Bearer <admin_token>
```

### 获取报表列表
```
GET /api/reports?type=daily&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <admin_token>
```

### 导出报表
```
GET /api/reports/export?type=daily&format=csv&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <admin_token>
```

## 通知模块 (Notifications)

### 获取我的通知
```
GET /api/notifications/my?unreadOnly=true&page=1&limit=50
Authorization: Bearer <token>
```

### 获取未读数量
```
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

### 标记已读
```
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

### 全部标记已读
```
PUT /api/notifications/read-all
Authorization: Bearer <token>
```

### 发送通知 (管理员)
```
POST /api/notifications/send
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "60abc...",
  "title": "系统通知",
  "message": "通知内容",
  "type": "system"
}
```

### 广播通知 (管理员)
```
POST /api/notifications/broadcast
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "全站通知",
  "message": "系统维护通知...",
  "type": "system"
}
```

## WebSocket 实时推送

### 连接方式
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your_jwt_token' }
});
```

### 监听事件
```javascript
// 接收个人通知
socket.on('notification', (data) => {
  console.log('New notification:', data);
});

// 车位状态变更
socket.on('space-status-changed', (data) => {
  console.log('Space updated:', data);
});

// 全站广播
socket.on('broadcast', (data) => {
  console.log('Broadcast:', data);
});
```

### 发送事件
```javascript
// 请求实时车位状态
socket.emit('parking-status-request');
socket.on('parking-status-update', (stats) => {
  console.log('Parking stats:', stats);
});
```

## 费率标准

### 预约费率
| 车型 | 起步价 | 每小时 | 日封顶 |
|------|--------|--------|--------|
| 紧凑型 | ¥5 | ¥3 | ¥50 |
| 标准型 | ¥8 | ¥5 | ¥80 |
| 大型车 | ¥12 | ¥8 | ¥120 |

### 月卡套餐
| 套餐 | 价格 | 区域 | 说明 |
|------|------|------|------|
| 基础月卡 | ¥300/月 | C/D/E区 | 适合偶尔停车用户 |
| 标准月卡 | ¥500/月 | B/C/D/E区 | 适合日常通勤用户 |
| 尊享月卡 | ¥800/月 | 全部区域 | 全区域通行 |
| 商务月卡 | ¥1500/月 | 全部区域 | 多车辆绑定 |

## 违约规则

1. **超时占位**：超出预约结束时间30分钟以上，记违约1次
2. **违规停放**：停错区域、无预约占用等，记违约1次
3. **违约累计3次**：自动限制预约权限
4. **违约清除**：需管理员手动解除限制
