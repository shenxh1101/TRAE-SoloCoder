# Network Topology Discovery Tool

基于Python的命令行网络拓扑发现工具，支持ICMP设备发现和SNMP信息收集。

## 功能特性

- ✅ **ICMP设备发现**：通过发送ICMP Echo请求（ping）扫描IP范围，发现活跃设备
- ✅ **SNMP信息收集**：
  - 系统信息（sysDescr, sysName）
  - 网络接口列表
  - ARP表
  - LLDP邻居信息
  - CDP邻居信息
- ✅ **多轮深度发现**：从已知设备解析邻居设备继续扫描，直到无新设备或达到深度限制
- ✅ **种子文件导入**：支持CSV格式的设备清单作为种子
- ✅ **设备类型识别**：根据sysDescr自动识别设备类型（路由器/交换机/防火墙/服务器/主机）
- ✅ **多种输出格式**：
  - JSON：完整的拓扑数据
  - DOT：Graphviz格式，可用于生成拓扑图
  - HTML：基于D3.js的交互式可视化
  - TXT：详细的文本报告
- ✅ **SNMP团体字符串列表**：支持配置多个SNMP团体字符串自动尝试

## 安装依赖

```bash
pip install -r requirements.txt
```

## 使用方法

### 基本用法

```bash
# 扫描单个IP范围
python net_topology.py -r 192.168.1.0/24

# 扫描多个IP范围
python net_topology.py -r 192.168.1.0/24 10.0.0.0/8

# 使用种子IP开始发现
python net_topology.py --seed 192.168.1.1 -r 192.168.1.0/24

# 从种子文件导入
python net_topology.py -s examples/seed_example.csv -r 192.168.1.0/24
```

### 高级选项

```bash
# 指定SNMP团体字符串
python net_topology.py -r 192.168.1.0/24 --communities public admin cisco

# 设置发现深度
python net_topology.py -r 192.168.1.0/24 --depth 5

# 设置ping线程数
python net_topology.py -r 192.168.1.0/24 --threads 100

# 指定输出目录
python net_topology.py -r 192.168.1.0/24 -o output/

# 禁用某些输出格式
python net_topology.py -r 192.168.1.0/24 --no-dot --no-report
```

### 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-r, --range` | IP范围（可多个） | - |
| `--seed` | 种子IP地址（可多个） | - |
| `-s, --seed-file` | CSV种子文件路径 | - |
| `-o, --output-dir` | 输出目录 | 当前目录 |
| `--communities` | SNMP团体字符串列表 | public, private, admin, ... |
| `--depth` | 最大发现深度 | 3 |
| `--threads` | ping扫描线程数 | 50 |
| `--no-json` | 不输出JSON | - |
| `--no-dot` | 不输出DOT | - |
| `--no-html` | 不输出HTML | - |
| `--no-report` | 不输出文本报告 | - |

### 种子文件格式

CSV格式，包含以下列：
- `ip`: 设备IP地址（必需）
- `sys_name`: 设备名称（可选）
- `device_type`: 设备类型（可选：router/switch/firewall/server/host）

示例：
```csv
ip,sys_name,device_type
192.168.1.1,MainRouter,router
192.168.1.2,CoreSwitch,switch
192.168.1.3,Firewall,firewall
```

## 输出文件

运行后将生成以下文件（默认）：

1. **network_topology.json** - 完整的拓扑数据JSON
2. **network_topology.dot** - Graphviz DOT格式，可转换为图片：
   ```bash
   dot -Tpng network_topology.dot -o topology.png
   ```
3. **network_topology.html** - 交互式HTML可视化，用浏览器打开即可
4. **network_topology_report.txt** - 详细的文本报告

## 项目结构

```
.
├── netdiscover/
│   ├── __init__.py          # 包初始化
│   ├── config.py            # 配置和常量
│   ├── icmp_scanner.py      # ICMP扫描模块
│   ├── snmp_client.py       # SNMP客户端模块
│   ├── topology_engine.py   # 拓扑发现引擎
│   ├── output_exporter.py   # 输出导出模块
│   └── main.py              # 主程序逻辑
├── net_topology.py          # 命令行入口
├── examples/
│   └── seed_example.csv     # 种子文件示例
├── test_output.py           # 输出测试脚本
├── requirements.txt         # 依赖列表
└── README.md                # 本文件
```

## 核心模块说明

### ICMP Scanner ([icmp_scanner.py](netdiscover/icmp_scanner.py))
- 多线程ping扫描
- 支持Windows/Linux/macOS
- 可配置超时和重试次数

### SNMP Client ([snmp_client.py](netdiscover/snmp_client.py))
- 支持SNMPv2c GET和WALK操作
- 自动尝试多个团体字符串
- 获取系统信息、接口、ARP表、LLDP/CDP邻居

### Topology Engine ([topology_engine.py](netdiscover/topology_engine.py))
- 多轮深度发现算法
- 设备关系推断（基于LLDP/CDP高可信度，基于ARP中可信度）
- MAC-IP映射管理

### Output Exporter ([output_exporter.py](netdiscover/output_exporter.py))
- JSON格式导出
- Graphviz DOT格式（支持不同设备类型的颜色和形状）
- D3.js交互式HTML（支持拖拽、缩放、点击查看详情）
- 详细的文本报告

## 设备类型识别

工具根据sysDescr自动识别以下设备类型：

| 设备类型 | 关键词 |
|---------|--------|
| router | router, cisco, juniper, huawei, ne40, ar22, srx |
| switch | switch, catalyst, nexus, 2960, 3560, 3750, s5700, s5735 |
| firewall | firewall, asa, paloalto, fortinet, srx, checkpoint |
| printer | printer, hp, xerox, canon, epson |
| server | server, windows, linux, ubuntu, centos, debian |
| host | pc, desktop, laptop, workstation |

## 注意事项

1. **权限**：在Linux/macOS上，ICMP ping可能需要root权限
2. **SNMP配置**：确保目标设备已启用SNMP，且团体字符串正确
3. **LLDP/CDP**：设备需启用LLDP或CDP才能获取高可信度邻居信息
4. **网络访问**：确保运行工具的主机可以访问目标网络

## 示例

```bash
# 快速开始
pip install -r requirements.txt
python net_topology.py -r 192.168.1.0/24 -o output/

# 查看生成的HTML
open output/network_topology.html
```

## License

MIT
