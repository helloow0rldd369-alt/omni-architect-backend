import * as admin from 'firebase-admin';

const rtdb = admin.database();

export interface ThreadTurn {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export async function saveTurnToThread(userId: string, threadId: string, turn: ThreadTurn): Promise<void> {
  const threadRef = rtdb.ref(`threads/${userId}/${threadId}/turns`);
  await threadRef.push(turn);
}

export async function retrieveThreadHistory(userId: string, threadId: string): Promise<ThreadTurn[]> {
  const threadRef = rtdb.ref(`threads/${userId}/${threadId}/turns`);
  const snapshot = await threadRef.once('value');
  const turns: ThreadTurn[] = [];
  
  snapshot.forEach((childSnapshot) => {
    const val = childSnapshot.val();
    turns.push({
      role: val.role,
      content: val.content,
      timestamp: val.timestamp
    });
  });
  
  return turns;
}
