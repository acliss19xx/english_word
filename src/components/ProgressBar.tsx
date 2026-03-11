import React from "react";
import { BookOpen } from "lucide-react";

const TOTAL_WORDS = 600;

interface ProgressBarProps {
  masteredCount: number;
  totalWords?: number;
}

export default function ProgressBar({ masteredCount, totalWords = TOTAL_WORDS }: ProgressBarProps) {
  const percentage = Math.min(100, Math.round((masteredCount / totalWords) * 100));

  return (
    <div className="w-full px-4 py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <BookOpen size={13} />
          <span>習得済み</span>
        </div>
        <span className="text-xs font-bold text-indigo-600">
          {masteredCount} / {totalWords}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-right mt-0.5">
        <span className="text-xs text-gray-400">{percentage}%</span>
      </div>
    </div>
  );
}
