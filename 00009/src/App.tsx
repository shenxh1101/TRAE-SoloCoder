import { useEffect } from 'react';
import { SetupForm } from './components/SetupForm';
import { StoryCard } from './components/StoryCard';
import { Toolbar } from './components/Toolbar';
import { StoryTree } from './components/StoryTree';
import { useStoryStore } from './store/useStoryStore';

export default function App() {
  const { story, godMode, actions } = useStoryStore();

  useEffect(() => {
    actions.loadSavedState();
  }, [actions]);

  if (!story) {
    return <SetupForm />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Toolbar />

      {godMode && <StoryTree />}

      <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <StoryCard />
      </main>

      <footer className="py-4 text-center text-parchment/40 text-sm">
        命运编织者 · 每一个选择都在书写独一无二的故事
      </footer>
    </div>
  );
}
