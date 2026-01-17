export interface User {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
}

export interface Activity {
  id: string;
  sessionId: string;
  name: string;
  durationMinutes: number;
  durationSeconds: number;
  elapsedSeconds: number;
  completed: boolean;
  color: string;
  orderIndex: number;
}

export interface Session {
  id: string;
  userId: string;
  currentActivityIndex: number;
  elapsedSeconds: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  activities: Activity[];
}

export interface CreateActivityInput {
  name: string;
  durationMinutes: number;
  color: string;
}

export interface ActivityProgress {
  id: string;
  elapsedSeconds: number;
  completed?: boolean;
}

export interface AuthResponse {
  user: User;
}

export interface SessionsResponse {
  sessions: Session[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Label {
  id: string;
  color: string;
  name: string;
}

export interface LabelsResponse {
  labels: Label[];
}
