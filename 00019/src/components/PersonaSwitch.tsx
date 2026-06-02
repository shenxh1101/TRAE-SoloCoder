import { PERSONAS } from '@/utils/aiEngine';
import { PersonaId } from '@/utils/types';
import { useDebateStore } from '@/store/debateStore';

export default function PersonaSwitch() {
  const { setPersona, currentSession } = useDebateStore();

  if (!currentSession) return null;

  const activePersona = currentSession.persona;

  return (
    <div className="flex gap-2">
      {PERSONAS.map((persona) => {
        const isActive = activePersona === persona.id;
        return (
          <button
            key={persona.id}
            onClick={() => setPersona(persona.id as PersonaId)}
            className={`
              group relative flex flex-col items-center rounded-lg px-5 py-3 transition-all duration-200
              ${isActive
                ? 'bg-[#2A0A0E] scale-105'
                : 'bg-[#1A1A1A] hover:bg-[#222]'
              }
            `}
          >
            <span className={`flex items-center gap-1.5 transition-all duration-200 ${isActive ? 'text-lg' : 'text-base'}`}>
              <span>{persona.icon}</span>
              <span className={isActive ? 'text-[#E63946] font-bold' : 'text-gray-400 font-medium'}>
                {persona.name}
              </span>
            </span>
            <span className="mt-1 max-h-0 overflow-hidden text-xs text-gray-500 transition-all duration-200 group-hover:max-h-8 group-hover:opacity-100 opacity-0">
              {persona.description}
            </span>
            {isActive && (
              <span className="absolute bottom-0 left-1/2 h-[2px] w-3/4 -translate-x-1/2 rounded-full bg-[#E63946] shadow-[0_0_8px_2px_rgba(230,57,70,0.6)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
