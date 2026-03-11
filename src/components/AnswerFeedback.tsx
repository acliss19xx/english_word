import React from "react";
import { CheckCircle, XCircle, ChevronRight } from "lucide-react";

interface AnswerFeedbackProps {
  isCorrect: boolean;
  explanation: string;
  onNext: () => void;
  isLastWord: boolean;
}

export default function AnswerFeedback({ isCorrect, explanation, onNext, isLastWord }: AnswerFeedbackProps) {
  return (
    <div className={`animate-fadeIn rounded-xl p-4 mb-3 ${
      isCorrect
        ? "bg-green-50 border-2 border-green-400"
        : "bg-red-50 border-2 border-red-400"
    }`}>
      <div className="flex items-start gap-2 mb-3">
        {isCorrect ? (
          <CheckCircle size={22} className="text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <XCircle size={22} className="text-red-600 flex-shrink-0 mt-0.5" />
        )}
        <div>
          <p className={`font-bold text-sm ${isCorrect ? "text-green-700" : "text-red-700"}`}>
            {isCorrect ? "正解！" : "不正解"}
          </p>
          {explanation && (
            <p className={`text-sm mt-1 ${isCorrect ? "text-green-600" : "text-red-600"}`}>
              {explanation}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={onNext}
        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-white transition-colors ${
          isCorrect
            ? "bg-green-600 hover:bg-green-700"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {isLastWord ? "セッション終了" : "次へ"}
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
