export interface ThreadTurn {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

// In-memory store to bypass Firebase configuration on Render
const memoryStore: Record<string, ThreadTurn[]> = {};

export async function saveTurnToThread(userId: string, threadId: string, turn: ThreadTurn): Promise<void> {
  const key = `${userId}_${threadId}`;
  if (!memoryStore[key]) {
    memoryStore[key] = [];
  }
  memoryStore[key].push(turn);
}

export async function retrieveThreadHistory(userId: string, threadId: string): Promise<ThreadTurn[]> {
  const key = `${userId}_${threadId}`;
  return memoryStore[key] || [];
}
