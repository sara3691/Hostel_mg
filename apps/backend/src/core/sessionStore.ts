import crypto from 'node:crypto';

export interface SessionData {
  id: string;
  email: string;
  role: string;
  hostelId: string | null;
}

// In-memory store mapping sessionId to user session data
const sessions = new Map<string, SessionData>();

export const sessionStore = {
  createSession(data: SessionData): string {
    const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
    sessions.set(sessionId, data);
    return sessionId;
  },

  getSession(sessionId: string): SessionData | undefined {
    return sessions.get(sessionId);
  },

  deleteSession(sessionId: string): boolean {
    return sessions.delete(sessionId);
  },

  clearAll(): void {
    sessions.clear();
  }
};
