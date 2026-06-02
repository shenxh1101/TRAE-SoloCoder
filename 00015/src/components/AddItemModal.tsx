import { useState } from 'react';
import { useGlassBallStore } from '@/store/useGlassBallStore';
import { X, Plus } from 'lucide-react';

export function AddItemModal() {
  const showAddItemModal = useGlassBallStore((s) => s.showAddItemModal);
  const setShowAddItemModal = useGlassBallStore((s) => s.setShowAddItemModal);
  const addCustomItem = useGlassBallStore((s) => s.addCustomItem);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!showAddItemModal) return null;

  const handleClose = () => {
    setShowAddItemModal(false);
    setName('');
    setDescription('');
  };

  const handleSubmit = () => {
    if (!name.trim() || !description.trim()) return;
    addCustomItem(name.trim(), description.trim());
    setShowAddItemModal(false);
    setName('');
    setDescription('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="bg-black/80 backdrop-blur-xl border rounded-xl p-6 w-96 max-w-[90vw]"
        style={{ borderColor: 'rgba(201,169,110,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: '#c9a96e' }}>
            添加自定义物品
          </h3>
          <button
            onClick={handleClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="物品名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-black/30 border border-[#c9a96e]/20 rounded-lg px-3 py-2 text-white w-full outline-none focus:border-[#c9a96e]/50 transition-colors"
          />
          <input
            type="text"
            placeholder="物品描述"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-black/30 border border-[#c9a96e]/20 rounded-lg px-3 py-2 text-white w-full outline-none focus:border-[#c9a96e]/50 transition-colors"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="mt-4 w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #c9a96e, #e8d5a3)',
            color: '#1a1a1a',
          }}
        >
          <Plus size={16} />
          添加物品
        </button>
      </div>
    </div>
  );
}
