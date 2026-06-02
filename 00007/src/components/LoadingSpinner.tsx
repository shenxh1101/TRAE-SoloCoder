export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative">
        <div className="cooking-loader text-6xl">🍳</div>
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="steam inline-block text-2xl opacity-0" style={{ animationDelay: '0s' }}>💨</span>
          <span className="steam inline-block text-2xl opacity-0 ml-2" style={{ animationDelay: '0.5s' }}>💨</span>
          <span className="steam inline-block text-2xl opacity-0 ml-1" style={{ animationDelay: '1s' }}>💨</span>
        </div>
      </div>
      <p className="mt-6 text-gray-600 font-medium animate-pulse">
        AI 厨师正在精心烹饪中...
      </p>
      <div className="mt-4 flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}