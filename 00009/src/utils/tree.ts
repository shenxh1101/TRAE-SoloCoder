import type { StoryNode, TreeNode } from '../engine/types';

export function buildStoryTree(
  nodes: Record<string, StoryNode>,
  rootNodeId: string,
  currentPath: string[]
): TreeNode | null {
  const rootNode = nodes[rootNodeId];
  if (!rootNode) return null;

  const buildTree = (nodeId: string): TreeNode => {
    const node = nodes[nodeId];
    const children: TreeNode[] = [];

    Object.values(nodes).forEach((n) => {
      if (n.parentId === nodeId) {
        children.push(buildTree(n.id));
      }
    });

    return {
      node,
      children,
      isOnCurrentPath: currentPath.includes(nodeId),
    };
  };

  return buildTree(rootNodeId);
}

export function getCurrentPath(
  nodes: Record<string, StoryNode>,
  currentNodeId: string
): string[] {
  const path: string[] = [];
  let nodeId: string | null = currentNodeId;

  while (nodeId) {
    const node = nodes[nodeId];
    if (!node) break;
    path.unshift(nodeId);
    nodeId = node.parentId;
  }

  return path;
}

export function getNodeAtDepth(
  nodes: Record<string, StoryNode>,
  currentNodeId: string,
  targetDepth: number
): StoryNode | null {
  const path = getCurrentPath(nodes, currentNodeId);
  const nodeId = path[targetDepth];
  return nodeId ? nodes[nodeId] : null;
}

export function getPathNodeIds(
  nodes: Record<string, StoryNode>,
  currentNodeId: string
): string[] {
  return getCurrentPath(nodes, currentNodeId);
}

export function getTreeLayout(
  tree: TreeNode,
  nodeSize = { width: 120, height: 60 },
  levelGap = 80,
  nodeGap = 20
) {
  const positions: Map<string, { x: number; y: number }> = new Map();
  const links: Array<{ from: string; to: string }> = [];

  const calculateSubtreeWidth = (node: TreeNode): number => {
    if (node.children.length === 0) {
      return nodeSize.width;
    }
    let totalWidth = 0;
    node.children.forEach((child, index) => {
      totalWidth += calculateSubtreeWidth(child);
      if (index > 0) totalWidth += nodeGap;
    });
    return Math.max(totalWidth, nodeSize.width);
  };

  const layout = (
    node: TreeNode,
    x: number,
    y: number,
    availableWidth: number
  ): number => {
    positions.set(node.node.id, { x, y });

    if (node.children.length === 0) {
      return x;
    }

    const childWidths = node.children.map((child) => calculateSubtreeWidth(child));
    const totalChildWidth = childWidths.reduce((a, b) => a + b, 0) + nodeGap * (node.children.length - 1);

    let childX = x - totalChildWidth / 2 + childWidths[0] / 2;
    const centerX = x;

    node.children.forEach((child, index) => {
      links.push({ from: node.node.id, to: child.node.id });
      const childCenterX = layout(
        child,
        childX,
        y + nodeSize.height + levelGap,
        childWidths[index]
      );
      if (index < node.children.length - 1) {
        childX += childWidths[index] / 2 + nodeGap + childWidths[index + 1] / 2;
      }
    });

    return centerX;
  };

  const rootWidth = calculateSubtreeWidth(tree);
  layout(tree, rootWidth / 2, nodeSize.height / 2 + 20, rootWidth);

  const totalWidth = rootWidth + 40;
  const maxY = Math.max(...Array.from(positions.values()).map((p) => p.y)) + nodeSize.height + 40;

  return { positions, links, width: totalWidth, height: maxY };
}
