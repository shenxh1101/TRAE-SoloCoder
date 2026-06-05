# 智能停车场综合管理系统

基于 Node.js + Express + MongoDB 的智能停车场后端管理系统，支持车位预约、自动结算、月卡管理、违规处理和运营报表等功能。

## 功能特性

### 1. 车位预约管理 ✅
- 根据车型和时段自动计算费用
- 校验同一时段车位占用冲突
- 冲突时推荐空闲时段
- 15分钟预约锁定机制

### 2. 车辆入场管理 ✅
- 摄像头识别车牌（API接口支持）
- 自动匹配预约或分配空闲车位
- 月卡余额检测
- 月卡到期提醒 / 无月卡临时锁车

### 3. 车辆出场结算 ✅
- 按实际停车时长自动计费
- 支持月卡余额抵扣
- 超时费用计算（1.5倍费率）
- 线上支付后放行

### 4. 月卡管理系统 ✅
- 4档月卡套餐（基础/标准/尊享/商务）
- 基于近30天停车数据智能推荐套餐
- 管理员审批流程
- 自动续费功能

### 5. 违约管理机制 ✅
- 超时占位自动记录
- 违规停放类型管理
- 累计3次限制预约权限
- 管理员手动解除限制

### 6. 运营报表系统 ✅
- 每日凌晨自动生成日报表
- 周报表汇总统计
- 各区域车位利用率分析
- 高峰时段统计
- 违约事件统计
- 支持 CSV 格式导出

### 7. 实时推送系统 ✅
- WebSocket 实时通知
- 车位状态变更推送
- 预约确认通知
- 违约警告推送
- 管理员实时告警

## 技术栈

- **后端框架**: Express.js 4.18
- **数据库**: MongoDB 7.0 + Mongoose 7.5
- **实时通信**: Socket.IO 4.7
- **认证**: JWT (jsonwebtoken 9.0)
- **密码加密**: bcryptjs 2.4
- **定时任务**: node-cron 3.0
- **日期处理**: moment 2.29
- **数据验证**: Joi 17.10
- **安全**: helmet + cors + express-rate-limit

## 项目结构

```
smart-parking-system/
├── src/
│   ├── config/
│   │   └── database.js          # 数据库连接配置
│   ├── controllers/             # 业务逻辑控制器
│   │   ├── authController.js
│   │   ├── parkingSpaceController.js
│   │   ├── reservationController.js
│   │   ├── parkingController.js
│   │   ├── monthlyCardController.js
│   │   ├── violationController.js
│   │   ├── reportController.js
│   │   └── notificationController.js
│   ├── middleware/              # 中间件
│   │   ├── auth.js              # 认证中间件
│   │   └── errorHandler.js      # 错误处理
│   ├── models/                  # 数据模型
│   │   ├── User.js
│   │   ├── ParkingSpace.js
│   │   ├── Reservation.js
│   │   ├── ParkingRecord.js
│   │   ├── MonthlyCard.js
│   │   ├── ViolationRecord.js
│   │   ├── OperationReport.js
│   │   └── Notification.js
│   ├── routes/                  # API路由
│   │   ├── auth.js
│   │   ├── parkingSpaces.js
│   │   ├── reservations.js
│   │   ├── parking.js
│   │   ├── monthlyCards.js
│   │   ├── violations.js
│   │   ├── reports.js
│   │   └── notifications.js
│   ├── socket/                  # WebSocket
│   │   └── index.js
│   ├── tasks/                   # 定时任务
│   │   └── scheduledTasks.js
│   ├── scripts/                 # 脚本工具
│   │   └── initData.js          # 初始化数据
│   └── server.js                # 应用入口
├── .env                         # 环境变量
├── .env.example
├── package.json
├── API_DOCUMENTATION.md         # API详细文档
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 16.0
- MongoDB >= 4.4

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/smart_parking
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
```

### 初始化数据

创建管理员账户和测试车位：

```bash
node src/scripts/initData.js
```

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将运行在 `http://localhost:3000`

### 默认测试账号

| 角色 | 手机号 | 密码 |
|------|--------|------|
| 管理员 | 13800138000 | admin123 |
| 普通用户 | 13900139000 | user123 |

## API 概览

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取个人信息
- `PUT /api/auth/profile` - 更新个人信息

### 车位接口
- `GET /api/parking-spaces` - 获取车位列表
- `GET /api/parking-spaces/stats` - 车位统计
- `GET /api/parking-spaces/availability` - 查询可用性

### 预约接口
- `POST /api/reservations/calculate-fee` - 计算预约费用
- `POST /api/reservations` - 创建预约
- `PUT /api/reservations/:id/confirm` - 确认预约
- `PUT /api/reservations/:id/cancel` - 取消预约
- `GET /api/reservations/my` - 我的预约

### 停车接口
- `POST /api/parking/entry` - 车辆入场
- `POST /api/parking/exit` - 车辆出场
- `PUT /api/parking/:id/pay` - 支付停车费
- `GET /api/parking/history` - 停车历史

### 月卡接口
- `GET /api/monthly-cards/plans` - 获取套餐列表
- `GET /api/monthly-cards/recommend` - 获取推荐套餐
- `POST /api/monthly-cards/apply` - 申请月卡
- `PUT /api/monthly-cards/:id/renew` - 月卡续费

### 违约接口
- `GET /api/violations/my` - 我的违约记录
- `PUT /api/violations/:id/appeal` - 违约申诉
- `PUT /api/violations/:id/pay` - 缴纳罚款

### 报表接口 (管理员)
- `GET /api/reports/dashboard` - 仪表盘统计
- `POST /api/reports/generate-daily` - 生成日报表
- `POST /api/reports/generate-weekly` - 生成周报表
- `GET /api/reports/export` - 导出报表

### 通知接口
- `GET /api/notifications/my` - 获取通知列表
- `GET /api/notifications/unread-count` - 未读数量
- `PUT /api/notifications/:id/read` - 标记已读

详细API文档请参考 [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 核心业务流程

### 预约流程
```
用户选择车位 → 计算费用 → 检测冲突 → 锁定车位(15分钟) 
    → 用户确认 → 预约生效 → 发送通知
              ↓
         超时未确认 → 自动释放
```

### 入场流程
```
车牌识别 → 查询预约 → 匹配成功/分配车位
    → 更新车位状态 → 检查月卡 → 发送入场通知
              ↓
         无月卡高频用户 → 临时锁车
```

### 出场流程
```
车牌识别 → 查询停车记录 → 计算费用
    → 月卡抵扣/生成账单 → 用户支付 → 更新车位状态
    → 检查超时 → 违约记录(超时30分钟+) → 发送结算通知
```

### 违约处理
```
违规检测 → 记录违约 → 累计次数
    → 满3次 → 限制预约权限
    → 管理员审批 → 解除限制
```

## 定时任务

- **每日00:00** - 生成前一日运营报表
- **每周一01:00** - 生成上周周报表
- **每分钟** - 处理过期预约锁定
- **每小时** - 发送预约开始提醒

## 费率标准

### 临时停车费率
| 车型 | 首小时 | 每小时 | 日封顶 | 免费时长 |
|------|--------|--------|--------|----------|
| 紧凑型 | ¥5 | ¥3 | ¥50 | 30分钟 |
| 标准型 | ¥8 | ¥5 | ¥80 | 30分钟 |
| 大型车 | ¥12 | ¥8 | ¥120 | 30分钟 |

### 超时费率
超出预约结束时间部分按正常费率的 1.5 倍计算。

### 月卡套餐
| 套餐 | 价格 | 适用区域 | 每日限额 |
|------|------|----------|----------|
| 基础月卡 | ¥300/月 | C/D/E区 | 12小时 |
| 标准月卡 | ¥500/月 | B/C/D/E区 | 24小时 |
| 尊享月卡 | ¥800/月 | 全区域 | 24小时 |
| 商务月卡 | ¥1500/月 | 全区域 | 24小时 |

## 开发说明

### 代码规范

- 使用 ES6+ 语法
- 统一使用 async/await 处理异步
- 错误统一由 errorHandler 中间件处理
- 控制器逻辑保持简洁，复杂逻辑封装到 Model

### 扩展建议

1. **接入支付**: 集成微信支付/支付宝 API
2. **短信通知**: 接入阿里云/腾讯云短信服务
3. **车牌识别**: 对接摄像头识别系统
4. **监控大屏**: 添加实时监控看板
5. **数据分析**: 增加停车行为分析

## 许可证

MIT License
