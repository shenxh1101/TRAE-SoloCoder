import { RecipeVariant, VARIANT_CONFIG } from '../types';
import { VoteButton } from './VoteButton';
import { ImageGenerator } from './ImageGenerator';
import { VoteData } from '../types';

interface RecipeCardProps {
  variant: RecipeVariant;
  index: number;
  voteData: VoteData;
  onVote: (variantId: string, direction: 'up' | 'down') => void;
}

export function RecipeCard({ variant, index, voteData, onVote }: RecipeCardProps) {
  const config = VARIANT_CONFIG[variant.type];

  return (
    <div
      className={`card-hover animate-fade-in-up stagger-${index + 1} bg-white rounded-2xl shadow-lg overflow-hidden border-t-4 ${config.borderColor}`}
    >
      <div className={`p-5 bg-gradient-to-r ${config.gradient}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{config.emoji}</span>
            <div>
              <span className="inline-block px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-full mb-1">
                {config.label}
              </span>
              <h3 className="font-serif text-xl font-bold text-white">
                {variant.name}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
          {variant.description}
        </p>

        <div className="mb-4">
          <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>🔄</span>
            <span>创意改动</span>
          </h4>
          <div className="space-y-3">
            {variant.ingredientChanges.map((change, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-500 text-sm">❌</span>
                  <span className="text-gray-500 text-sm line-through">{change.original}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-500 text-sm">✅</span>
                  <span className="text-green-600 font-medium text-sm">{change.replacement}</span>
                </div>
                <p className="text-xs text-gray-500 ml-6">
                  💡 {change.reason}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>🥗</span>
            <span>完整食材</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {variant.fullIngredients.slice(0, 8).map((ing, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
              >
                {ing}
              </span>
            ))}
            {variant.fullIngredients.length > 8 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-400 text-xs rounded-md">
                +{variant.fullIngredients.length - 8}
              </span>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <VoteButton
            variantId={variant.id}
            upvotes={voteData.upvotes}
            downvotes={voteData.downvotes}
            userVote={voteData.userVote}
            onVote={onVote}
          />
          <ImageGenerator variant={variant} />
        </div>
      </div>
    </div>
  );
}