import { useMemo, useRef, useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStoryStore, useCurrentPath } from '../store/useStoryStore';
import { buildStoryTree, getTreeLayout } from '../utils/tree';
import type { TreeNode } from '../engine/types';

export function StoryTree() {
  const { story, nodes, actions } = useStoryStore();
  const currentPath = useCurrentPath();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const { tree, layout } = useMemo(() => {
    if (!story || Object.keys(nodes).length === 0) {
      return { tree: null, layout: null };
    }

    const rootNodeId = story.nodeIds[0];
    const tree = buildStoryTree(nodes, rootNodeId, currentPath);
    if (!tree) return { tree: null, layout: null };

    const layout = getTreeLayout(tree, { width: 100, height: 50 }, 70, 30);
    return { tree, layout };
  }, [story, nodes, currentPath]);

  useEffect(() => {
    if (containerRef.current && layout) {
      const currentNodeId = story?.currentNodeId;
      if (currentNodeId) {
        const pos = layout.positions.get(currentNodeId);
        if (pos) {
          containerRef.current.scrollLeft = Math.max(0, pos.x - 300);
        }
      }
    }
  }, [layout, story?.currentNodeId]);

  if (!story || !tree || !layout) return null;

  const handleNodeClick = (nodeId: string) => {
    if (nodeId !== story.currentNodeId) {
      actions.jumpToNode(nodeId);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const amount = 200;
      const newOffset =
        direction === 'left'
          ? Math.max(0, scrollOffset - amount)
          : scrollOffset + amount;
      containerRef.current.scrollTo({ left: newOffset, behavior: 'smooth' });
      setScrollOffset(newOffset);
    }
  };

  const renderTree = (node: TreeNode) => {
    const pos = layout.positions.get(node.node.id);
    if (!pos) return null;

    const isCurrent = node.node.id === story.currentNodeId;

    return (
      <g key={node.node.id}>
        {node.children.map((child) => {
          const childPos = layout.positions.get(child.node.id);
          if (!childPos) return null;

          const midY = (pos.y + childPos.y) / 2;

          return (
            <path
              key={`line-${node.node.id}-${child.node.id}`}
              d={`M ${pos.x} ${pos.y + 25} C ${pos.x} ${midY}, ${childPos.x} ${midY}, ${childPos.x} ${childPos.y - 25}`}
              fill="none"
              stroke={child.isOnCurrentPath ? '#d4a84b' : 'rgba(212, 168, 75, 0.3)'}
              strokeWidth={child.isOnCurrentPath ? 2 : 1}
              className="tree-line"
            />
          );
        })}

        <g
          className={`tree-node cursor-pointer ${isCurrent ? 'current' : ''}`}
          onClick={() => handleNodeClick(node.node.id)}
          transform={`translate(${pos.x - 50}, ${pos.y - 25})`}
        >
          <rect
            x="0"
            y="0"
            width="100"
            height="50"
            rx="8"
            fill={
              isCurrent
                ? '#d4a84b'
                : node.isOnCurrentPath
                ? 'rgba(212, 168, 75, 0.3)'
                : 'rgba(26, 27, 61, 0.8)'
            }
            stroke={isCurrent ? '#d4a84b' : 'rgba(212, 168, 75, 0.4)'}
            strokeWidth={isCurrent ? 2 : 1}
            className="transition-all duration-300"
          />
          <text
            x="50"
            y="22"
            textAnchor="middle"
            fill={isCurrent ? '#1a1b3d' : node.isOnCurrentPath ? '#f5e6c8' : '#f5e6c880'}
            fontSize="11"
            fontWeight={isCurrent ? 'bold' : 'normal'}
            className="font-display pointer-events-none select-none"
          >
            第 {node.node.depth + 1} 章
          </text>
          <text
            x="50"
            y="38"
            textAnchor="middle"
            fill={isCurrent ? '#1a1b3d' : node.isOnCurrentPath ? '#d4a84b' : '#d4a84b80'}
            fontSize="9"
            className="font-body pointer-events-none select-none"
          >
            {node.node.content.slice(0, 12) +
              (node.node.content.length > 12 ? '...' : '')}
          </text>
          {node.children.length > 0 && (
            <circle
              cx="85"
              cy="15"
              r="8"
              fill="#8b2635"
              className="pointer-events-none"
            />
          )}
        </g>

        {node.children.map((child) => renderTree(child))}
      </g>
    );
  };

  return (
    <div className="fixed inset-0 z-30 bg-deep-indigo/95 backdrop-blur-md flex flex-col">
      <div className="glass-toolbar px-4 py-3 flex items-center justify-between">
        <h2 className="font-display text-xl text-amber-gold font-bold">
          上帝视角 · 故事树
        </h2>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 text-sm text-parchment/60">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-gold" />
              当前节点
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-gold/40" />
              已探索路径
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-deep-indigo/80 border border-amber-gold/40" />
              其他分支
            </span>
          </div>
          <button
            onClick={actions.toggleGodMode}
            className="p-2 rounded-lg text-parchment/70 hover:text-amber-gold hover:bg-amber-gold/10 transition-colors"
            title="关闭上帝视角"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <button
          onClick={() => scroll('left')}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-deep-indigo/80 text-amber-gold hover:bg-amber-gold/20 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div
          ref={containerRef}
          className="w-full h-full overflow-auto scrollbar-thin"
          onScroll={(e) => setScrollOffset(e.currentTarget.scrollLeft)}
        >
          <div
            className="relative"
            style={{
              width: layout.width,
              height: layout.height,
              minWidth: '100%',
              minHeight: '100%',
            }}
          >
            <svg
              width={layout.width}
              height={layout.height}
              className="absolute inset-0"
            >
              {renderTree(tree)}
            </svg>
          </div>
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-deep-indigo/80 text-amber-gold hover:bg-amber-gold/20 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="glass-toolbar px-4 py-3 flex items-center justify-center gap-6 text-sm">
        <span className="text-parchment/60">
          总节点数: <span className="text-amber-gold font-bold">{story.nodeIds.length}</span>
        </span>
        <span className="text-parchment/60">
          当前深度: <span className="text-amber-gold font-bold">{currentPath.length}</span>
        </span>
        <span className="text-parchment/60">
          点击节点可以跳转
        </span>
      </div>
    </div>
  );
}
