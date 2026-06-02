## 1. 架构设计

```mermaid
graph TD
    A["浏览器层"] --> B["React 18 UI 层"]
    B --> C["Zustand 状态管理"]
    B --> D["Three.js / R3F 3D 渲染层"]
    D --> E["@react-three/postprocessing 后期处理"]
    D --> F["@react-three/drei 工具组件"]
    B --> G["Web Audio API 音效层"]
    C --> H["场景配置数据"]
    C --> I["用户上传图片 (Base64)"]
    H --> J["localStorage 持久化"]
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript + Vite@5
- **3D 引擎**：three@0.160, @react-three/fiber@8, @react-three/drei@9, @react-three/postprocessing@2
- **状态管理**：zustand@4
- **样式方案**：tailwindcss@3
- **图标库**：lucide-react@0.300
- **音效**：Web Audio API 合成水滴声（无需外部音频文件）
- **数据持久化**：localStorage 存储配置，图片以 Base64 嵌入 JSON

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页，3D 梦境碎片场景 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    SCENE_CONFIG {
        float lucidity "清醒程度 0-1"
        int fragmentCount "碎片数量 5-8"
        FRAGMENT[] fragments "碎片数组"
    }
    FRAGMENT {
        string id "唯一标识"
        string geometryType "几何类型: sphere/octahedron/icosahedron/torus"
        float size "几何体大小"
        float orbitRadius "轨道半径"
        float orbitEllipticity "轨道扁率"
        float orbitTilt "轨道倾角"
        float orbitPhase "初始相位"
        float rotationSpeed "自转速度"
        string imageData "Base64 图片数据"
        string imageName "原始文件名"
    }
```

### 4.2 类型定义

```typescript
type GeometryType = 'sphere' | 'octahedron' | 'icosahedron' | 'torus';

interface Fragment {
  id: string;
  geometryType: GeometryType;
  size: number;
  orbitRadius: number;
  orbitEllipticity: number;
  orbitTilt: number;
  orbitPhase: number;
  rotationSpeed: number;
  imageData: string;
  imageName: string;
}

interface SceneConfig {
  lucidity: number;
  fragmentCount: number;
  fragments: Fragment[];
}
```

## 5. 项目结构

```
src/
├── components/
│   ├── Scene.tsx          # 3D 场景主组件
│   ├── Fragment.tsx       # 单个碎片几何体组件
│   ├── Toolbar.tsx        # 顶部工具栏
│   ├── ImageViewer.tsx    # 放大图片查看器
│   └── Particles.tsx      # 星尘粒子背景
├── hooks/
│   ├── useAudio.ts        # 水滴音效 hook
│   └── useScreenshot.ts   # 截图功能 hook
├── store/
│   └── useSceneStore.ts   # Zustand 状态管理
├── utils/
│   ├── config.ts          # 配置生成与序列化
│   └── geometry.ts        # 几何相关工具函数
├── types/
│   └── index.ts           # TypeScript 类型定义
├── App.tsx
├── main.tsx
└── index.css
```
