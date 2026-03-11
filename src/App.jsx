import React, { useState, useEffect, useCallback, useRef } from "react";
import { checkAnswer } from "./gemini";
import { loadMasteryFromStorage, saveMultipleToStorage } from "./storage";
import wordList from "./wordList";
import WordCard from "./components/WordCard";
import AnswerFeedback from "./components/AnswerFeedback";
import ProgressBar from "./components/ProgressBar";
import TrophyScreen from "./components/TrophyScreen";
import { RefreshCw, AlertCircle, BookOpen, Trophy, Loader2 } from "lucide-react";

const SESSION_SIZE = 20;
const WRONG_REQUEUE_OFFSET = 3;
const MAX_WRONG_LOADED = 10;

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildSessionQueue(wrongWords, masteredSet) {
  const wrongPool = wrongWords
    .filter((w) => !masteredSet.has(w))
    .slice(0, MAX_WRONG_LOADED);

  const remainingPool = wordList.filter(
    (w) => !masteredSet.has(w) && !wrongPool.includes(w)
  );

  const shuffledRemaining = shuffle(remainingPool);
  const fillCount = Math.max(0, SESSION_SIZE - wrongPool.length);
  return [...shuffle(wrongPool), ...shuffledRemaining.slice(0, fillCount)];
}

export default function App() {
  const [masteryData, setMasteryData] = useState(null);

  // Session state
  const [appPhase, setAppPhase] = useState("init"); // init | session | summary | trophy
  const [sessionQueue, setSessionQueue] = useState([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(new Set());
  const [sessionMastered, setSessionMastered] = useState(new Set());

  // UI state
  const [currentWord, setCurrentWord] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState(null);
  const [shake, setShake] = useState(false);
  const [questionNum, setQuestionNum] = useState(1);

  // refs for session state in async callbacks
  const sessionWrongRef = useRef(new Set());
  const sessionMasteredRef = useRef(new Set());
  const sessionCorrectRef = useRef(0);
  const masteryDataRef = useRef(null);

  useEffect(() => { sessionWrongRef.current = sessionWrong; }, [sessionWrong]);
  useEffect(() => { sessionMasteredRef.current = sessionMastered; }, [sessionMastered]);
  useEffect(() => { sessionCorrectRef.current = sessionCorrect; }, [sessionCorrect]);
  useEffect(() => { masteryDataRef.current = masteryData; }, [masteryData]);

  // Load from localStorage on mount
  useEffect(() => {
    const data = loadMasteryFromStorage();
    setMasteryData(data);
  }, []);

  // ----- Start session -----
  const startSession = useCallback((mastData) => {
    const data = mastData || masteryDataRef.current;
    if (!data) return;

    const masteredSet = new Set(
      [...data.entries()]
        .filter(([, status]) => status === "mastered")
        .map(([word]) => word)
    );

    if (masteredSet.size >= wordList.length) {
      setAppPhase("trophy");
      return;
    }

    const wrongWords = [...data.entries()]
      .filter(([, status]) => status === "wrong")
      .map(([word]) => word);

    const queue = buildSessionQueue(wrongWords, masteredSet);

    if (queue.length === 0) {
      setAppPhase("trophy");
      return;
    }

    setSessionQueue(queue);
    setSessionTotal(queue.length);
    setSessionCorrect(0);
    setSessionWrong(new Set());
    setSessionMastered(new Set());
    setCurrentWord(queue[0]);
    setFeedback(null);
    setCheckError(null);
    setQuestionNum(1);
    setShake(false);
    setAppPhase("session");
  }, []);

  // Auto-start session once mastery data is loaded
  useEffect(() => {
    if (masteryData && appPhase === "init") {
      startSession(masteryData);
    }
  }, [masteryData, appPhase, startSession]);

  // ----- Handle answer submission -----
  const handleSubmit = useCallback(async (userAnswer) => {
    if (!currentWord || isChecking) return;
    setIsChecking(true);
    setCheckError(null);

    try {
      const result = await checkAnswer(currentWord, userAnswer);
      setFeedback({ isCorrect: result.correct, explanation: result.explanation });
      if (!result.correct) {
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch (err) {
      console.error("Answer check error:", err);
      setCheckError(err.message);
    } finally {
      setIsChecking(false);
    }
  }, [currentWord, isChecking]);

  // ----- Handle give up -----
  const handleGiveUp = useCallback(() => {
    if (!currentWord || isChecking) return;
    setFeedback({
      isCorrect: false,
      explanation: "わからない を選択しました。次回また挑戦しましょう！",
      wasGiveUp: true,
    });
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }, [currentWord, isChecking]);

  // ----- End session: save to localStorage -----
  const endSession = useCallback((finalWrong, finalMastered) => {
    const updatedMastery = new Map(masteryDataRef.current || new Map());
    const entries = [];

    for (const w of finalMastered) {
      updatedMastery.set(w, "mastered");
      entries.push([w, "mastered"]);
    }
    for (const w of finalWrong) {
      if (!finalMastered.has(w)) {
        updatedMastery.set(w, "wrong");
        entries.push([w, "wrong"]);
      }
    }

    saveMultipleToStorage(entries);
    setMasteryData(updatedMastery);

    const masteredCount = [...updatedMastery.values()].filter((s) => s === "mastered").length;
    setAppPhase(masteredCount >= wordList.length ? "trophy" : "summary");
  }, []);

  // ----- Handle next word -----
  const handleNext = useCallback(() => {
    if (!feedback || !currentWord) return;

    const word = currentWord;
    const isCorrect = feedback.isCorrect;

    setSessionQueue((prevQueue) => {
      const newQueue = [...prevQueue];
      newQueue.shift();

      const newWrong = new Set(sessionWrongRef.current);
      const newMastered = new Set(sessionMasteredRef.current);

      if (!isCorrect) {
        newWrong.add(word);
        newMastered.delete(word);
        const insertAt = Math.min(WRONG_REQUEUE_OFFSET, newQueue.length);
        newQueue.splice(insertAt, 0, word);
      } else {
        newWrong.delete(word);
        newMastered.add(word);
        setSessionCorrect((c) => c + 1);
      }

      setSessionWrong(newWrong);
      setSessionMastered(newMastered);

      if (newQueue.length === 0) {
        endSession(newWrong, newMastered);
        return newQueue;
      }

      setCurrentWord(newQueue[0]);
      setFeedback(null);
      setCheckError(null);
      setQuestionNum((prev) => prev + 1);

      return newQueue;
    });
  }, [feedback, currentWord, endSession]);

  // ----- Loading -----
  if (!masteryData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-indigo-50 to-white">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  // ----- Trophy -----
  if (appPhase === "trophy") {
    const masteredCount = [...masteryData.values()].filter((s) => s === "mastered").length;
    return (
      <TrophyScreen
        masteredCount={masteredCount}
        onRestart={() => {
          setAppPhase("init");
          setMasteryData(null);
        }}
      />
    );
  }

  // ----- Summary -----
  if (appPhase === "summary") {
    const masteredCount = [...masteryData.values()].filter((s) => s === "mastered").length;

    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">
                {sessionCorrect >= sessionTotal * 0.8 ? "🎉" : "💪"}
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">セッション終了！</h2>
              <p className="text-sm text-gray-500">結果を保存しました</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 mb-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">正解数</span>
                <span className="font-bold text-green-600 text-lg">{sessionCorrect}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">習得単語数</span>
                <span className="font-bold text-indigo-600 text-lg">{sessionMastered.size} 語</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">次回要復習</span>
                <span className="font-bold text-red-500 text-lg">
                  {[...sessionWrong].filter((w) => !sessionMastered.has(w)).length} 語
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={16} className="text-yellow-500" />
                <span className="text-sm font-medium text-gray-700">全体の進捗</span>
              </div>
              <ProgressBar masteredCount={masteredCount} totalWords={wordList.length} />
            </div>

            <button
              onClick={() => startSession(masteryData)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <RefreshCw size={18} />
              次のセッションへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----- Session -----
  const masteredCount = [...masteryData.values()].filter((s) => s === "mastered").length;
  const isLastWord = sessionQueue.length === 1 && feedback !== null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-sm mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BookOpen size={18} className="text-indigo-600" />
            <span className="font-bold text-gray-800 text-sm">英検3級 単語学習</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Trophy size={13} className="text-yellow-500" />
            <span>{masteredCount} 習得</span>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-sm mx-auto">
          <ProgressBar masteredCount={masteredCount} totalWords={wordList.length} />
        </div>
      </div>

      <main className="flex-1 flex flex-col max-w-sm mx-auto w-full px-4 py-4">
        {currentWord && appPhase === "session" && (
          <>
            <WordCard
              word={currentWord}
              onSubmit={handleSubmit}
              onGiveUp={handleGiveUp}
              isChecking={isChecking}
              questionNumber={questionNum}
              totalQuestions={sessionTotal}
              shake={shake}
            />

            {checkError && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-red-600 mb-2">
                    エラーが発生しました。もう一度試してください。
                  </p>
                  <p className="text-xs text-red-400 mb-2">{checkError}</p>
                  <button
                    onClick={() => setCheckError(null)}
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    もう一度入力する
                  </button>
                </div>
              </div>
            )}

            {feedback && !checkError && (
              <div className="mt-3">
                <AnswerFeedback
                  isCorrect={feedback.isCorrect}
                  explanation={feedback.explanation}
                  onNext={handleNext}
                  isLastWord={isLastWord}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
