import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { ALLERGENS } from '../types';

interface AllergenSelectorProps {
  selectedAllergens: string[];
  onChange: (allergens: string[]) => void;
}

export function AllergenSelector({ selectedAllergens, onChange }: AllergenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleAllergen = (allergen: string) => {
    if (selectedAllergens.includes(allergen)) {
      onChange(selectedAllergens.filter(a => a !== allergen));
    } else {
      onChange([...selectedAllergens, allergen]);
    }
  };

  const removeAllergen = (allergen: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedAllergens.filter(a => a !== allergen));
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 mt-4">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-5 py-3 bg-white/80 hover:bg-white rounded-xl border border-gray-200 transition-all duration-200"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="text-gray-700 font-medium">过敏原/忌口设置</span>
            {selectedAllergens.length > 0 && (
              <span className="px-2 py-0.5 bg-primary-100 text-primary-600 text-xs rounded-full">
                {selectedAllergens.length} 项
              </span>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {selectedAllergens.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedAllergens.map(allergen => (
              <span
                key={allergen}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
              >
                {allergen}
                <button
                  onClick={(e) => removeAllergen(allergen, e)}
                  className="hover:bg-primary-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {isOpen && (
          <div className="absolute z-10 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 p-4 animate-fade-in-up">
            <p className="text-sm text-gray-500 mb-3">选择需要避开的食材或饮食偏好</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ALLERGENS.map(allergen => (
                <button
                  key={allergen}
                  type="button"
                  onClick={() => toggleAllergen(allergen)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedAllergens.includes(allergen)
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {allergen}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}