# 自动化员工培训与考核管理系统

一个功能完整的员工培训管理自动化系统，涵盖从课件上传到证书颁发的全流程管理。

## 功能特性

### 1. 课件解析与智能匹配
- 支持PDF、Word、TXT等多种格式课件上传
- 自动解析课件内容，提取关键词和技能标签
- 根据岗位胜任力模型智能匹配推荐受训员工
- 自动生成培训计划

### 2. 报名管理与时间冲突检测
- 员工报名时自动校验时间冲突
- 冲突时推荐替代时段
- 名额满时自动加入等待队列
- 有人取消时按优先级自动递补

### 3. 学习时长监控与预警
- 每30分钟自动采集学习时长
- 连续两次采样不达标（<15分钟）自动标记为"不积极"
- 自动推送预警通知给主管
- 支持查看学习状态和预警历史

### 4. 在线考试与补考管理
- 培训结束后自动生成在线考试
- 从题库随机抽题组卷
- 自动评分和成绩统计
- 不及格触发补考流程（等待3天，最多2次）

### 5. 证书颁发与技能更新
- 考试通过后自动颁发电子证书（PDF格式）
- 自动更新员工技能标签
- 智能推荐进阶课程

### 6. 月度效能报告
- 每月初自动生成培训效能报告
- 包含：完成率、平均成绩、学时分布、参与率等
- 与上月数据对比分析
- 导出带图表的PDF和Excel格式

### 7. 数据查询与批量导出
- 支持按课程名称、讲师、部门、时间段组合查询
- 培训记录和考试成绩批量导出
- 操作日志完整记录所有操作

## 项目结构

```
├── src/
│   ├── models/              # 数据模型
│   │   ├── database.py      # 数据库配置
│   │   └── models.py        # 数据模型定义
│   ├── modules/             # 功能模块
│   │   ├── course_processor.py    # 课件处理与匹配
│   │   ├── enrollment_manager.py  # 报名管理
│   │   ├── learning_monitor.py    # 学习监控
│   │   ├── exam_manager.py        # 考试管理
│   │   ├── certificate_manager.py # 证书管理
│   │   ├── report_generator.py    # 报告生成
│   │   └── data_query.py          # 查询与导出
│   └── utils/               # 工具模块
│       ├── logger.py        # 日志系统
│       └── common.py        # 通用工具
├── main.py                  # 主程序入口
├── requirements.txt         # 依赖包
├── data/                    # 数据库文件
├── uploads/                 # 上传课件
├── exports/                 # 导出文件
│   ├── certificates/        # 证书PDF
│   └── reports/             # 报告文件
└── logs/                    # 日志文件
```

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 运行完整演示

```bash
python main.py --demo
```

这将：
- 初始化示例数据（30名员工、5门课程、岗位胜任力模型）
- 模拟完整的培训流程
- 生成培训计划、监控学习过程、组织考试
- 颁发电子证书
- 生成月度效能报告
- 导出培训记录、考试成绩和操作日志

### 3. 其他命令

初始化示例数据：
```bash
python main.py --init
```

生成月度报告：
```bash
python main.py --report --year 2024 --month 5
```

导出数据：
```bash
python main.py --export training --department 技术部
python main.py --export exam --course Python
python main.py --export logs
```

## 核心模块说明

### CourseProcessor (课件处理器)
- `upload_courseware()`: 上传并解析课件
- `match_employees_for_course()`: 智能匹配员工
- `generate_training_plan()`: 生成培训计划
- `recommend_advanced_courses()`: 推荐进阶课程

### EnrollmentManager (报名管理器)
- `enroll_employee()`: 员工报名（含冲突检测）
- `cancel_enrollment()`: 取消报名（自动递补）
- `check_time_conflicts()`: 检查时间冲突
- `find_alternative_slots()`: 查找替代时段

### LearningMonitor (学习监控器)
- `start_monitoring()`: 启动培训监控
- `record_study_time()`: 记录学习时长
- `batch_collect_study_time()`: 批量采集学习数据
- `get_inactive_employees()`: 获取不积极员工列表

### ExamManager (考试管理器)
- `generate_exam()`: 生成随机试卷
- `start_exam()`: 开始考试
- `submit_exam()`: 提交并自动评分
- `get_exam_statistics()`: 获取考试统计

### CertificateManager (证书管理器)
- `generate_certificate()`: 颁发电子证书
- `auto_issue_certificates()`: 自动批量颁发
- `verify_certificate()`: 验证证书有效性
- `update_employee_skills()`: 更新员工技能标签

### ReportGenerator (报告生成器)
- `generate_monthly_report()`: 生成月度报告
- `_generate_pdf_report()`: 生成PDF报告（含图表）
- `_generate_excel_report()`: 生成Excel报告（含图表）
- `auto_generate_monthly_report()`: 自动生成上月报告

### DataQueryManager (数据查询器)
- `query_training_records()`: 查询培训记录
- `query_exam_scores()`: 查询考试成绩
- `query_operation_logs()`: 查询操作日志
- `export_*()`: 批量导出各种数据

## 数据模型

### 主要实体
- **Employee**: 员工信息
- **CompetencyModel**: 岗位胜任力模型
- **Course**: 课程信息
- **Question**: 考试题库
- **TrainingPlan**: 培训计划
- **Enrollment**: 报名记录
- **Waitlist**: 等待队列
- **LearningRecord**: 学习记录
- **Exam**: 考试
- **ExamRecord**: 考试记录
- **Certificate**: 证书
- **WarningNotification**: 预警通知
- **OperationLog**: 操作日志
- **Report**: 报告记录

## 日志系统

所有操作都会记录到：
1. **文件日志**: `logs/training_system_YYYYMM.log`
2. **数据库日志**: `operation_logs` 表

日志级别：
- INFO: 正常操作记录
- WARNING: 警告信息
- ERROR: 错误信息

## 注意事项

1. 首次运行会自动创建SQLite数据库
2. 证书和报告均保存在 `exports/` 目录下
3. 上传的课件保存在 `uploads/` 目录下
4. 学习时长采样间隔为30分钟，阈值为15分钟
5. 补考等待期为3天，最多2次补考机会
6. 证书有效期默认3年

## 扩展建议

- 可以集成邮件系统发送预警和证书通知
- 可以添加定时任务自动运行月度报告
- 可以集成企业微信/钉钉进行消息推送
- 可以添加Web界面便于操作
- 可以支持更多文件格式的课件解析
