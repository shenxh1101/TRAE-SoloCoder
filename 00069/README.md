# Flask API Gateway 模拟服务

一个功能完整的API网关模拟服务，基于Flask框架开发，支持路由转发、鉴权、限流、请求/响应转换等功能。

## 功能特性

### 🔀 路由管理
- 支持配置多个后端服务，每个服务绑定一个路由前缀
- 例如：`/api/user` 转发到 `http://user-svc:8080`
- 支持动态添加、修改、删除路由规则
- 配置热加载，无需重启服务

### 🔐 多种鉴权方式
- **API Key**：支持从请求头或查询参数读取
- **JWT验证**：支持RS256算法，可配置公钥
- **Basic Auth**：用户名密码验证
- 可按路由配置启用/禁用鉴权及鉴权方法

### ⚡ 限流功能
- 基于客户端IP的限流
- 支持**令牌桶**和**漏桶**两种算法
- 支持按路由分别配置限流阈值
- 可配置桶容量和请求速率

### 🔄 请求/响应转换
- **请求转换**：
  - 添加/删除/重命名请求头
  - 添加查询参数
  - 添加/删除/重命名请求体字段
  - 路径重写（正则表达式）
  - 方法重写

- **响应转换**：
  - 添加/删除响应头
  - 隐藏敏感字段（自动脱敏）
  - 添加/删除响应体字段

### 📝 日志记录
- 记录每个请求的详细信息
- 包括：请求耗时、状态码、限流信息、鉴权信息
- 日志按天滚动保存，保留30天
- 支持按路径、状态码、IP查询日志

### 🎭 Mock模式
- 对某些路由不转发，直接返回预设响应
- 可配置状态码、响应头、响应体、延迟
- 适用于测试和开发环境

### 🎛️ 管理功能
- **管理API**：完整的RESTful API接口
- **Web管理界面**：可视化管理控制台
- 实时查看限流统计
- 热加载配置文件

## 快速开始

### 安装依赖

```bash
pip install -r requirements.txt
```

### 启动服务

```bash
# 使用默认配置启动
python app.py

# 或者使用示例配置
cp config.example.json config.json
python app.py
```

服务启动后：
- 网关服务：`http://localhost:5000`
- 管理界面：`http://localhost:5000/_admin`

## 配置说明

### 全局配置

```json
{
  "global": {
    "port": 5000,
    "host": "0.0.0.0",
    "log_level": "INFO",
    "log_dir": "logs",
    "admin_enabled": true,
    "admin_prefix": "/_admin",
    "hot_reload_interval": 5
  }
}
```

### 路由配置

```json
{
  "routes": [
    {
      "path_prefix": "/api/user",
      "backend_url": "http://user-svc:8080",
      "timeout": 30,
      "auth": {
        "enabled": true,
        "methods": ["api_key", "jwt"]
      },
      "transform": {
        "request": {
          "add_headers": {
            "X-Gateway-Forwarded": "true"
          }
        },
        "response": {
          "hide_sensitive_fields": ["password", "token"]
        }
      }
    }
  ]
}
```

### 鉴权配置

#### API Key
```json
{
  "auth": {
    "api_keys": [
      {
        "name": "X-API-Key",
        "location": "header",
        "keys": ["your-api-key-1", "your-api-key-2"]
      }
    ]
  }
}
```

#### JWT
```json
{
  "auth": {
    "jwt": {
      "enabled": true,
      "public_key": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
      "algorithm": "RS256",
      "header": "Authorization",
      "prefix": "Bearer "
    }
  }
}
```

#### Basic Auth
```json
{
  "auth": {
    "basic_auth": {
      "enabled": true,
      "users": [
        {
          "username": "admin",
          "password": "admin123",
          "roles": ["admin"]
        }
      ]
    }
  }
}
```

### 限流配置

```json
{
  "rate_limit": {
    "default": {
      "enabled": true,
      "algorithm": "token_bucket",
      "capacity": 100,
      "rate": 10,
      "per_route": {
        "/api/user": {
          "enabled": true,
          "algorithm": "token_bucket",
          "capacity": 50,
          "rate": 5
        }
      }
    }
  }
}
```

### Mock路由配置

```json
{
  "mock_routes": [
    {
      "path": "/api/mock/health",
      "status_code": 200,
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "status": "ok",
        "version": "1.0.0"
      },
      "delay_ms": 0
    }
  ]
}
```

## API 接口

### 路由管理
- `GET /_admin/api/routes` - 获取所有路由
- `POST /_admin/api/routes` - 添加路由
- `GET /_admin/api/routes/{prefix}` - 获取指定路由
- `PUT /_admin/api/routes/{prefix}` - 更新路由
- `DELETE /_admin/api/routes/{prefix}` - 删除路由

### Mock路由管理
- `GET /_admin/api/mock-routes` - 获取所有Mock路由
- `POST /_admin/api/mock-routes` - 添加Mock路由
- `PUT /_admin/api/mock-routes/{path}` - 更新Mock路由
- `DELETE /_admin/api/mock-routes/{path}` - 删除Mock路由

### 鉴权配置
- `GET /_admin/api/auth` - 获取鉴权配置
- `PUT /_admin/api/auth` - 更新鉴权配置

### 限流管理
- `GET /_admin/api/rate-limit` - 获取限流配置
- `PUT /_admin/api/rate-limit` - 更新限流配置
- `GET /_admin/api/rate-limit/stats` - 获取限流统计
- `POST /_admin/api/rate-limit/reset` - 重置限流计数器

### 日志查询
- `GET /_admin/api/logs` - 查询日志（支持path, status_code, client_ip, limit参数）
- `GET /_admin/api/logs/files` - 获取日志文件列表
- `GET /_admin/api/logs/files/{filename}` - 读取日志文件内容

### 配置管理
- `GET /_admin/api/config` - 获取完整配置
- `PUT /_admin/api/config` - 更新完整配置
- `POST /_admin/api/config/reload` - 热加载配置

### 健康检查
- `GET /_admin/api/health` - 健康检查

## 使用示例

### 1. 测试Mock路由

```bash
# 测试Mock健康检查
curl http://localhost:5000/api/mock/health

# 测试Mock用户信息（会自动脱敏email字段）
curl http://localhost:5000/api/mock/user/1

# 测试Mock错误响应
curl http://localhost:5000/api/mock/error
```

### 2. 测试API Key鉴权

```bash
# 使用Header传递API Key
curl -H "X-API-Key: test-api-key-123" http://localhost:5000/api/user/profile

# 使用查询参数传递API Key
curl "http://localhost:5000/api/user/profile?api_key=query-key-789"
```

### 3. 测试限流

```bash
# 快速发送多个请求触发限流
for i in {1..20}; do
  curl -H "X-API-Key: test-api-key-123" http://localhost:5000/api/user/test
done
```

### 4. 管理API使用

```bash
# 获取所有路由
curl http://localhost:5000/_admin/api/routes

# 添加新路由
curl -X POST http://localhost:5000/_admin/api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "path_prefix": "/api/new",
    "backend_url": "http://new-svc:8080",
    "timeout": 30,
    "auth": {
      "enabled": true,
      "methods": ["api_key"]
    }
  }'

# 查看日志
curl "http://localhost:5000/_admin/api/logs?path=/api/user&limit=10"
```

## 项目结构

```
.
├── app.py                      # 主入口文件
├── config.json                 # 配置文件（自动生成）
├── config.example.json         # 示例配置文件
├── requirements.txt            # 依赖列表
├── README.md                   # 文档
├── app/                        # 核心模块
│   ├── __init__.py             # Flask应用初始化
│   ├── config_manager.py       # 配置管理
│   ├── auth.py                 # 鉴权模块
│   ├── rate_limit.py           # 限流模块
│   ├── transformer.py          # 请求/响应转换
│   ├── logger.py               # 日志模块
│   ├── gateway.py              # 网关核心逻辑
│   └── admin_api.py            # 管理API
├── static/                     # 静态资源
│   ├── admin.css               # 管理界面样式
│   └── admin.js                # 管理界面脚本
├── templates/                  # 模板
│   └── admin.html              # 管理界面HTML
└── logs/                       # 日志目录（自动生成）
    ├── gateway.log             # 系统日志
    └── access.log              # 访问日志
```

## 限流算法说明

### 令牌桶算法 (Token Bucket)
- 以固定速率向桶中添加令牌
- 每个请求消耗一个令牌
- 桶满时新令牌被丢弃
- 适合处理突发流量

### 漏桶算法 (Leaky Bucket)
- 请求进入队列，以固定速率处理
- 队列满时新请求被拒绝
- 流量输出平稳，适合需要平滑处理的场景

## 热加载说明

配置文件 `config.json` 支持热加载：
1. 直接修改 `config.json` 文件
2. 系统会自动检测文件修改（默认5秒间隔）
3. 新配置立即生效，无需重启服务
4. 也可通过API手动触发：`POST /_admin/api/config/reload`

## 注意事项

1. **生产环境**：建议使用WSGI服务器（如Gunicorn）部署
2. **安全性**：生产环境请修改默认的API Key和密码
3. **JWT公钥**：请妥善保管私钥，公钥可安全分发
4. **日志权限**：确保程序对logs目录有写入权限
5. **CORS**：已默认启用CORS，可根据需要调整

## 许可证

MIT License
