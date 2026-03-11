import React from "react";
import { Trophy, RotateCcw } from "lucide-react";

interface TrophyScreenProps {
  masteredCount: number;
  onRestart: () => void;
}

export default function TrophyScreen({ masteredCount, onRestart }: TrophyScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-yellow-50 to-orange-50 px-6">
      <div className="text-center">
        <div className="text-8xl mb-4 animate-bounce">🏆</div>
        <div className="flex justify-center mb-4">
          <Trophy size={48} className="text-yellow-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          おめでとうございます！
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          英検3級の全単語を習得しました！
        </p>
        <p className="text-4xl font-bold text-yellow-600 mb-6">
          {masteredCount} 語
        </p>
        <p className="text-sm text-gray-500 mb-8">
          素晴らしい！英検3級合格へ大きく前進しました。
        </p>
        <button
          onClick={onRestart}
          className="flex items-center gap-2 mx-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full transition-colors shadow-lg"
        >
          <RotateCcw size={18} />
          もう一度練習する
        </button>
      </div>

      {/* Stars decoration */}
      <div className="mt-12 text-4xl space-x-4">
        <span>⭐</span>
        <span>⭐</span>
        <span>⭐</span>
      </div>
    </div>
  );
}
