# 高校图书馆管理系统 - 后端API

## 技术栈
- **框架**: Express.js
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **实时推送**: Socket.IO
- **定时任务**: node-cron
- **Excel处理**: xlsx + multer

## 快速开始

### 1. 环境要求
- Node.js >= 18.x
- PostgreSQL >= 13.x

### 2. 安装依赖
```bash
cd backend
npm install
```

### 3. 配置环境变量
复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
DATABASE_URL="postgresql://username:password@localhost:5432/library_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=3000
NODE_ENV="development"
```

### 4. 初始化数据库

#### 创建数据库
```sql
CREATE DATABASE library_db;
```

#### 运行数据库迁移
```bash
npm run prisma:migrate
```

#### 生成Prisma Client
```bash
npm run prisma:generate
```

#### 填充初始数据
```bash
npm run prisma:seed
```

### 5. 启动开发服务器
```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动

## API接口文档

### 认证接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/auth/login | 用户登录 | 公开 |
| GET | /api/auth/me | 获取当前用户信息 | 所有用户 |

### 用户接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/users | 获取用户列表 | 管理员 |
| GET | /api/users/:id | 获取用户详情 | 所有用户 |
| POST | /api/users | 创建用户 | 管理员 |
| PUT | /api/users/:id | 更新用户 | 管理员 |
| DELETE | /api/users/:id | 删除用户 | 管理员 |

### 图书接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/books | 获取图书列表 | 所有用户 |
| GET | /api/books/:id | 获取图书详情 | 所有用户 |
| POST | /api/books | 创建图书 | 管理员 |
| PUT | /api/books/:id | 更新图书 | 管理员 |
| DELETE | /api/books/:id | 删除图书 | 管理员 |
| POST | /api/books/import | Excel导入图书 | 管理员 |
| GET | /api/books/export | Excel导出图书 | 管理员 |

### 借阅接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/borrows | 获取借阅列表 | 管理员 |
| GET | /api/borrows/my | 获取我的借阅 | 所有用户 |
| GET | /api/borrows/eligibility/:userId | 检查借阅资格 | 所有用户 |
| POST | /api/borrows | 借书 | 管理员 |
| POST | /api/borrows/:id/return | 还书 | 管理员 |
| POST | /api/borrows/:id/renew | 续借 | 所有用户 |

### 预约接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/reservations | 获取预约列表 | 管理员 |
| GET | /api/reservations/my | 获取我的预约 | 所有用户 |
| POST | /api/reservations | 创建预约 | 所有用户 |
| POST | /api/reservations/:id/cancel | 取消预约 | 所有用户 |
| POST | /api/reservations/:id/complete | 完成预约 | 管理员 |

### 罚款接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/fines | 获取罚款列表 | 管理员 |
| GET | /api/fines/my | 获取我的罚款 | 所有用户 |
| POST | /api/fines/:id/pay | 缴纳罚款 | 所有用户 |

### 消息接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/messages | 获取消息列表 | 所有用户 |
| POST | /api/messages/:id/read | 标记已读 | 所有用户 |
| POST | /api/messages/read-all | 全部已读 | 所有用户 |
| DELETE | /api/messages/:id | 删除消息 | 所有用户 |

### 统计接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/stats/dashboard | 仪表盘统计 | 管理员 |
| GET | /api/stats/popular-books | 热门图书 | 所有用户 |
| GET | /api/stats/reader-types | 读者类型统计 | 所有用户 |
| GET | /api/stats/overdue-rate | 逾期率 | 所有用户 |
| GET | /api/stats/daily-borrows | 每日借阅趋势 | 所有用户 |
| GET | /api/stats/monthly | 月度统计 | 管理员 |

## WebSocket实时推送

### 连接方式
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// 注册用户
socket.emit('register', userId);

// 监听消息
socket.on('message', (message) => {
  console.log('收到新消息:', message);
});
```

### 消息类型
- `borrow`: 借阅通知
- `renew`: 续借通知
- `reserve`: 预约通知
- `fine`: 罚款通知
- `reminder`: 到期提醒
- `system`: 系统通知

## 定时任务

### 每日任务 (每天 09:00 执行)
1. 发送图书到期前3天提醒
2. 更新逾期图书状态
3. 处理过期预约

### 月度任务 (每月1号 00:00 执行)
1. 生成上月统计报表
2. 推送给所有管理员

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 学生 | student001 | 123456 |
| 学生 | student002 | 123456 |
| 教师 | teacher001 | 123456 |

## 生产部署

### 构建
```bash
npm run build
```

### 启动生产服务器
```bash
npm start
```

### 使用PM2
```bash
npm install -g pm2
pm2 start dist/server.js --name library-api
```

## 项目结构
```
backend/
├── src/
│   ├── config/          # 配置文件
│   │   ├── prisma.ts    # Prisma客户端
│   │   └── jwt.ts       # JWT配置
│   ├── controllers/     # 控制器
│   ├── middleware/      # 中间件
│   ├── routes/          # 路由
│   ├── services/        # 服务
│   │   ├── websocket.ts # WebSocket服务
│   │   └── cron.ts      # 定时任务
│   ├── utils/           # 工具函数
│   ├── server.ts        # 服务器入口
│   └── seed.ts          # 种子数据
├── prisma/
│   └── schema.prisma    # 数据模型
├── package.json
├── tsconfig.json
└── .env
```
