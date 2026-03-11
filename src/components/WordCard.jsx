import React, { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, Loader2, HelpCircle } from "lucide-react";
import { speakWord } from "../gemini";

export default function WordCard({
  word,
  onSubmit,
  onGiveUp,
  isChecking,
  questionNumber,
  totalQuestions,
  shake,
}) {
  const [answer, setAnswer] = useState("");
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState(false);
  const inputRef = useRef(null);
  const hasAutoPlayed = useRef(false);

  const handleTTS = useCallback(async () => {
    if (ttsLoading) return;
    setTtsLoading(true);
    setTtsError(false);
    try {
      await speakWord(word);
    } catch (err) {
      console.error("TTS error:", err);
      setTtsError(true);
    } finally {
      setTtsLoading(false);
    }
  }, [word, ttsLoading]);

  // Auto-play TTS when word changes
  useEffect(() => {
    setAnswer("");
    setTtsError(false);
    hasAutoPlayed.current = false;

    // Small delay to avoid issues with rapid word changes
    const timer = setTimeout(() => {
      if (!hasAutoPlayed.current) {
        hasAutoPlayed.current = true;
        handleTTS();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [word]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus input when word changes
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [word]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim() || isChecking) return;
    onSubmit(answer.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full">
      {/* Question counter */}
      <div className="flex justify-between items-center mb-3 px-1">
        <span className="text-xs text-gray-400 font-medium">
          問題 {questionNumber} / {totalQuestions}
        </span>
        {ttsError && (
          <span className="text-xs text-red-400">音声エラー</span>
        )}
      </div>

      {/* Word display */}
      <div
        className={`bg-white rounded-2xl shadow-md border border-gray-100 p-5 mb-4 ${
          shake ? "animate-shake" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">英単語</p>
            <h2 className="text-3xl font-bold text-gray-800 tracking-wide">{word}</h2>
          </div>
          <button
            onClick={handleTTS}
            disabled={ttsLoading}
            className="p-3 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-3 flex-shrink-0"
            title="発音を聞く"
            aria-label="発音を聞く"
          >
            {ttsLoading ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <Volume2 size={22} />
            )}
          </button>
        </div>
      </div>

      {/* Answer input */}
      <form onSubmit={handleSubmit} className="mb-3">
        <label className="block text-xs font-medium text-gray-500 mb-1.5 px-1">
          日本語の意味を入力してください
        </label>
        <input
          ref={inputRef}
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="意味を入力..."
          disabled={isChecking}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all text-base disabled:bg-gray-50 disabled:text-gray-400"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </form>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!answer.trim() || isChecking}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isChecking ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              確認中...
            </>
          ) : (
            "答える"
          )}
        </button>

        <button
          onClick={onGiveUp}
          disabled={isChecking}
          className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 font-medium py-3 px-4 rounded-xl transition-colors text-sm"
          title="わからない"
        >
          <HelpCircle size={16} />
          わからない
        </button>
      </div>
    </div>
  );
}
