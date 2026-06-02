## 1. 架构设计

```mermaid
flowchart TD
    "UI层" --> "3D场景层"
    "UI层" --> "状态管理层"
    "3D场景层" --> "物品模型工厂"
    "3D场景层" --> "玻璃球组件"
    "3D场景层" --> "后处理管线"
    "状态管理层" --> "年代物品映射表"
    "状态管理层" --> "配置导出模块"
    "状态管理层" --> "截图模块"
```

纯前端应用，无后端服务。所有数据（年代-物品映射、用户自定义物品、配置保存）均在客户端处理。

## 2. 技术说明

- 前端框架：React@18 + TypeScript
- 3D渲染：three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- 样式：tailwindcss@3
- 构建工具：Vite
- 状态管理：React useState/useReducer（轻量级，无需引入外部状态库）
- 无后端、无数据库

## 3. 路由定义

单页应用，无路由切换。

| 路由 | 用途 |
|------|------|
| / | 主场景页，包含所有功能 |

## 4. API定义

无后端API。所有数据通过本地模块提供。

### 4.1 年代-物品映射表数据结构

```typescript
interface EraItem {
  id: string
  name: string
  yearRanges: [number, number]
  modelType: 'phone' | 'tape' | 'tv' | 'camera' | 'computer' | 'radio' | 'walkman' | 'floppy' | 'gameboy' | 'cd' | 'pager' | 'vhs' | 'newspaper' | 'typewriter' | 'custom'
  description: string
  color: string
}

interface EraMapping {
  items: EraItem[]
}
```

### 4.2 玻璃球配置数据结构

```typescript
interface GlassBallConfig {
  year: number
  color: string
  items: {
    id: string
    name: string
    type: string
    description: string
    position: [number, number, number]
    isCustom: boolean
  }[]
  createdAt: string
}
```

## 5. 核心模块设计

### 5.1 物品模型工厂

根据 `modelType` 创建对应的简易3D模型（使用基础几何体组合）：
- `phone`：长方体 + 屏幕平面 + 天线圆柱
- `tape`：扁平方体 + 两个小圆柱（磁带轮）
- `tv`：大方体 + 屏幕平面 + 天线
- `camera`：方体 + 镜头圆柱
- `computer`：显示器方体 + 底座 + 键盘
- `radio`：方体 + 旋钮球体 + 天线
- `walkman`：扁平方体 + 耳机线
- `floppy`：薄方体 + 标签区域
- `gameboy`：长方体 + 屏幕 + 十字键
- `cd`：薄圆柱 + 彩虹纹理
- `pager`：小方体 + 屏幕区
- `vhs`：方体 + 标签
- `newspaper`：薄方体 + 折痕
- `typewriter`：方体 + 滚筒圆柱 + 按键
- `custom`：发光的多面体（占位符）

### 5.2 玻璃球组件

- 外壳：SphereGeometry + MeshPhysicalMaterial（半透明、折射、粗糙度低）
- 内部物品：根据映射表生成，使用 Float 动画在球内漂浮
- 物品位置：随机分布在球内（距中心不超过球半径的70%）

### 5.3 后处理管线

- Bloom：UnrealBloomPass，让玻璃球和物品有柔和发光
- 可选 Vignette：暗角效果增加氛围感

### 5.4 截图模块

使用 `gl.domElement.toDataURL()` 或 Three.js 的 `preserveDrawingBuffer` 配合 Canvas API 导出PNG。

### 5.5 配置导出

将当前状态序列化为 GlassBallConfig JSON，通过 `Blob` + `URL.createObjectURL` 触发下载。

## 6. 数据模型

### 6.1 年代物品映射表（本地JSON）

涵盖 1950-2025 年间的经典物品，每个物品标注适用年份范围。示例数据：

| 年代范围 | 物品 |
|----------|------|
| 1950-1970 | 收音机、打字机、报纸 |
| 1970-1985 | 磁带、VHS录像带、随身听 |
| 1985-1995 | 寻呼机、软盘、GameBoy |
| 1995-2005 | 老式手机、CD、拨号上网调制解调器 |
| 2005-2015 | 数码相机、MP3播放器、翻盖手机 |
| 2015-2025 | 智能手机、平板电脑、无线耳机 |
