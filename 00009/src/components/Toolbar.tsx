import { useState } from 'react';
import {
  Undo2,
  RotateCcw,
  Download,
  Eye,
  EyeOff,
  BookOpen,
  Menu,
  X,
} from 'lucide-react';
import { useStoryStore, useCurrentNode, useCurrentPath } from '../store/useStoryStore';

export function Toolbar() {
  const { story, isGenerating, godMode, actions } = useStoryStore();
  const currentNode = useCurrentNode();
  const currentPath = useCurrentPath();
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  if (!story) return null;

  const canRollback = currentNode && currentNode.parentId;

  const handleReset = () => {
    actions.reset();
    setShowConfirmReset(false);
  };

  const ToolbarButton = ({
    onClick,
    disabled,
    title,
    children,
  }: {
    onClick: () => void;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-2 md:px-4 md:py-2 rounded-lg text-parchment/70 hover:text-amber-gold hover:bg-amber-gold/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
    >
      {children}
    </button>
  );

  return (
    <>
      <header className="glass-toolbar sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-gold/30 to-amber-gold/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-gold" />
            </div>
            <div className="hidden md:block">
              <h1 className="font-display text-amber-gold text-lg font-bold truncate max-w-[200px]">
                {story.title}
              </h1>
              <p className="text-parchment/50 text-xs">
                第 {currentPath.length} 章 · 共 {story.nodeIds.length} 个节点
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1">
            <ToolbarButton
              onClick={actions.rollback}
              disabled={!canRollback || isGenerating}
              title="回退到上一步"
            >
              <Undo2 className="w-5 h-5" />
              <span className="text-sm">回退</span>
            </ToolbarButton>

            <ToolbarButton
              onClick={actions.exportMarkdown}
              disabled={isGenerating}
              title="导出故事为Markdown"
            >
              <Download className="w-5 h-5" />
              <span className="text-sm">导出</span>
            </ToolbarButton>

            <ToolbarButton
              onClick={actions.toggleGodMode}
              disabled={isGenerating}
              title={godMode ? '关闭上帝视角' : '开启上帝视角'}
            >
              {godMode ? (
                <>
                  <EyeOff className="w-5 h-5" />
                  <span className="text-sm">关闭视角</span>
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  <span className="text-sm">上帝视角</span>
                </>
              )}
            </ToolbarButton>

            <div className="w-px h-6 bg-amber-gold/20 mx-2" />

            <ToolbarButton
              onClick={() => setShowConfirmReset(true)}
              disabled={isGenerating}
              title="重置故事"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="text-sm">重置</span>
            </ToolbarButton>
          </div>

          <button
            onClick={() => setShowMenu(!showMenu)}
            className="md:hidden p-2 text-parchment/70 hover:text-amber-gold transition-colors"
          >
            {showMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {showMenu && (
        <div className="md:hidden glass-toolbar border-b border-amber-gold/20">
          <div className="px-4 py-2 space-y-1">
            <button
              onClick={() => {
                actions.rollback();
                setShowMenu(false);
              }}
              disabled={!canRollback || isGenerating}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-parchment/70 hover:text-amber-gold hover:bg-amber-gold/10 disabled:opacity-30 transition-colors"
            >
              <Undo2 className="w-5 h-5" />
              <span>回退到上一步</span>
            </button>
            <button
              onClick={() => {
                actions.exportMarkdown();
                setShowMenu(false);
              }}
              disabled={isGenerating}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-parchment/70 hover:text-amber-gold hover:bg-amber-gold/10 disabled:opacity-30 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>导出为Markdown</span>
            </button>
            <button
              onClick={() => {
                actions.toggleGodMode();
                setShowMenu(false);
              }}
              disabled={isGenerating}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-parchment/70 hover:text-amber-gold hover:bg-amber-gold/10 disabled:opacity-30 transition-colors"
            >
              {godMode ? (
                <>
                  <EyeOff className="w-5 h-5" />
                  <span>关闭上帝视角</span>
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  <span>开启上帝视角</span>
                </>
              )}
            </button>
            <div className="border-t border-amber-gold/20 my-2" />
            <button
              onClick={() => {
                setShowConfirmReset(true);
                setShowMenu(false);
              }}
              disabled={isGenerating}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-crimson hover:text-crimson hover:bg-crimson/10 disabled:opacity-30 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              <span>重置故事</span>
            </button>
          </div>
        </div>
      )}

      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-indigo/80 backdrop-blur-sm">
          <div className="parchment-bg vintage-border rounded-2xl p-6 max-w-sm w-full animate-fade-in-up">
            <h3 className="font-display text-xl text-ink font-bold mb-4">
              确认重置？
            </h3>
            <p className="text-ink/70 mb-6 font-body">
              这将删除当前故事的所有进度，你确定要重新开始吗？此操作无法撤销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 py-3 px-4 border-2 border-amber-gold/30 text-ink/70 hover:bg-amber-gold/10 rounded-xl font-display transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-3 px-4 bg-crimson text-parchment hover:bg-crimson/90 rounded-xl font-display transition-colors"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
