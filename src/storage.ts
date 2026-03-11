type MasteryStatus = "mastered" | "wrong";

const STORAGE_KEY = "english-test3:mastery";

export function loadMasteryFromStorage(): Map<string, MasteryStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, { status: MasteryStatus }>;
    return new Map(Object.entries(obj).map(([word, data]) => [word, data.status]));
  } catch {
    return new Map();
  }
}

export function saveMasteryToStorage(word: string, status: MasteryStatus): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const obj = raw ? (JSON.parse(raw) as Record<string, { status: MasteryStatus; updatedAt: number }>) : {};
    obj[word] = { status, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (err) {
    console.error("localStorage save error:", err);
  }
}

export function saveMultipleToStorage(entries: [string, MasteryStatus][]): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const obj = raw ? (JSON.parse(raw) as Record<string, { status: MasteryStatus; updatedAt: number }>) : {};
    const now = Date.now();
    for (const [word, status] of entries) {
      obj[word] = { status, updatedAt: now };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (err) {
    console.error("localStorage save error:", err);
  }
}
