# Git Batch Tool - 多仓库Git批量操作工具

一个基于Python的命令行多仓库Git批量操作工具，支持批量执行常见的Git操作。

## 功能特性

- 📋 **配置管理**: 支持JSON配置文件，可添加、删除、列出仓库
- 🚀 **批量操作**: 批量拉取代码、查看状态、切换分支、打标签
- ⚡ **并行执行**: 支持多线程并发，可设置并发数
- 🔧 **自定义命令**: 执行任意Git命令
- 📊 **彩色报告**: 不同颜色标记成功/失败，输出汇总统计
- 👻 **干运行模式**: 预览操作影响的仓库
- 📄 **CSV导入导出**: 从CSV导入或导出仓库列表
- 🏷️ **标签过滤**: 按标签包含/排除仓库
- ⏰ **定时任务**: 支持cron表达式定时拉取代码

## 安装

```bash
pip install -e .
```

或

```bash
pip install -r requirements.txt
```

## 快速开始

### 1. 添加仓库

```bash
# 添加单个仓库
git-batch add my-project ~/projects/my-project

# 添加带标签的仓库
git-batch add my-project ~/projects/my-project --tags frontend --tags web

# 从CSV导入
git-batch import-csv examples/repos.csv
```

### 2. 查看仓库列表

```bash
# 查看所有仓库
git-batch list

# 按标签过滤
git-batch --include-tags frontend list
git-batch --exclude-tags legacy list
```

### 3. 批量操作

```bash
# 批量拉取代码
git-batch pull

# 批量拉取（使用rebase）
git-batch pull --rebase

# 批量查看状态
git-batch status

# 批量切换分支
git-batch checkout main

# 批量创建并切换分支
git-batch checkout feature/new -b

# 批量打标签
git-batch tag v1.0.0 -m "Release 1.0.0" --push

# 批量执行自定义命令
git-batch exec "log --oneline -5"
```

### 4. 干运行模式

```bash
# 预览操作影响的仓库
git-batch pull --dry-run
git-batch checkout develop --dry-run
```

### 5. 并行执行

```bash
# 设置并发数
git-batch pull --workers 8
```

### 6. 定时任务

```bash
# 每小时执行一次
git-batch schedule "0 * * * *"

# 每天凌晨2点执行
git-batch schedule "0 2 * * *"

# 每30分钟执行，指定日志目录
git-batch schedule "*/30 * * * *" --log-dir ./git-logs
```

### 7. 导出配置

```bash
# 导出到CSV
git-batch export-csv my-repos.csv
```

## 配置文件格式

### JSON (repos.json)

```json
{
  "repos": [
    {
      "name": "project-name",
      "path": "/path/to/project",
      "tags": ["tag1", "tag2"],
      "enabled": true
    }
  ]
}
```

### CSV

```csv
name,path,tags,enabled
project-name,/path/to/project,"tag1;tag2",true
```

## 常用命令参考

| 命令 | 说明 |
|------|------|
| `git-batch add <name> <path>` | 添加仓库 |
| `git-batch remove <name>` | 移除仓库 |
| `git-batch list` | 列出所有仓库 |
| `git-batch pull` | 批量拉取 |
| `git-batch status` | 批量查看状态 |
| `git-batch checkout <branch>` | 批量切换分支 |
| `git-batch tag <name>` | 批量打标签 |
| `git-batch fetch` | 批量fetch |
| `git-batch exec "<command>"` | 执行自定义命令 |
| `git-batch schedule <cron>` | 定时任务模式 |

## 全局选项

- `--config, -c`: 指定配置文件路径 (默认: repos.json)
- `--exclude-tags, -e`: 排除指定标签的仓库
- `--include-tags, -i`: 只包含指定标签的仓库

## 操作选项

- `--workers, -w`: 并发数 (默认: 4)
- `--dry-run, -n`: 干运行模式
- `--show-output`: 显示命令输出

## 项目结构

```
git_batch_tool/
├── __init__.py
├── cli.py              # 命令行接口
├── config.py           # 配置管理
├── executor.py         # 并行执行器
├── git_operations.py   # Git操作封装
├── reporter.py         # 输出报告
└── scheduler.py        # 定时任务调度
```
