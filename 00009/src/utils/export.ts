import type { Story, StoryNode } from '../engine/types';
import { getCurrentPath } from './tree';

export function exportToMarkdown(
  story: Story,
  nodes: Record<string, StoryNode>
): string {
  const path = getCurrentPath(nodes, story.currentNodeId);
  const pathNodes = path.map((id) => nodes[id]).filter(Boolean);

  let markdown = `# ${story.title}\n\n`;
  markdown += `> **故事背景**: ${story.premise.background}\n`;
  markdown += `> **主角**: ${story.premise.character}\n`;
  markdown += `> **初始场景**: ${story.premise.scene}\n\n`;
  markdown += `> **故事长度**: ${pathNodes.length} 个节点\n`;
  markdown += `> **创建时间**: ${new Date(story.createdAt).toLocaleString('zh-CN')}\n`;
  markdown += `> **最后更新**: ${new Date(story.updatedAt).toLocaleString('zh-CN')}\n\n`;
  markdown += `---\n\n`;

  pathNodes.forEach((node, index) => {
    if (index === 0) {
      markdown += `## 序章\n\n`;
    } else {
      markdown += `## 第 ${index} 章\n\n`;
    }

    if (node.choiceText) {
      markdown += `> **选择**: ${node.choiceText}\n\n`;
    }

    markdown += `${node.content}\n\n`;

    if (index < pathNodes.length - 1) {
      const nextNode = pathNodes[index + 1];
      const chosenChoice = node.choices.find(
        (c) => c.nextNodeId === nextNode.id
      );
      if (chosenChoice) {
        markdown += `---\n\n`;
      }
    }
  });

  const lastNode = pathNodes[pathNodes.length - 1];
  if (lastNode && lastNode.choices.length > 0) {
    markdown += `## 当前选择\n\n`;
    lastNode.choices.forEach((choice, index) => {
      markdown += `${index + 1}. ${choice.text}\n`;
    });
  }

  return markdown;
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateFilename(story: Story): string {
  const sanitizedTitle = story.title.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').slice(0, 30);
  const date = new Date().toISOString().slice(0, 10);
  return `${sanitizedTitle}_${date}.md`;
}
