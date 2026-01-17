import prisma from '../config/database.js';
import { SessionStatus } from '@prisma/client';

export interface CreateSessionInput {
  userId: string;
  activities: Array<{
    name: string;
    durationMinutes: number;
    color: string;
  }>;
}

export interface ActivityProgress {
  id: string;
  elapsedSeconds: number;
  completed?: boolean;
}

export interface UpdateSessionInput {
  currentActivityIndex?: number;
  elapsedSeconds?: number;
  status?: SessionStatus;
  activityProgress?: ActivityProgress[];
}

export interface UpdateActivitiesInput {
  activities: Array<{
    id?: string;
    name: string;
    durationMinutes: number;
    color: string;
    completed?: boolean;
    elapsedSeconds?: number;
  }>;
}

export interface AddActivitiesInput {
  activities: Array<{
    name: string;
    durationMinutes: number;
    color: string;
  }>;
}

export class SessionService {
  async createSession(data: CreateSessionInput) {
    // Validate unique activity names (case-insensitive)
    const activityNames = data.activities.map(a => a.name.trim().toLowerCase());
    const uniqueNames = new Set(activityNames);

    if (activityNames.length !== uniqueNames.size) {
      throw new Error('Activity names must be unique');
    }

    // Create session with activities
    const session = await prisma.session.create({
      data: {
        userId: data.userId,
        activities: {
          create: data.activities.map((activity, index) => ({
            name: activity.name.trim(),
            durationMinutes: activity.durationMinutes,
            durationSeconds: activity.durationMinutes * 60,
            color: activity.color,
            orderIndex: index,
          })),
        },
      },
      include: {
        activities: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return session;
  }

  async getSession(sessionId: string, userId: string) {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: {
        activities: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    return session;
  }

  async listSessions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: { userId },
        include: {
          activities: {
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.session.count({ where: { userId } }),
    ]);

    return {
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateSession(sessionId: string, userId: string, data: UpdateSessionInput) {
    // Verify ownership
    const currentSession = await this.getSession(sessionId, userId);

    // Extract activity progress for separate update
    const { activityProgress, ...sessionData } = data;

    // Handle completedAt timestamp based on status change
    const updateData: typeof sessionData & { completedAt?: Date | null } = { ...sessionData };
    if (data.status === SessionStatus.COMPLETED && currentSession.status !== SessionStatus.COMPLETED) {
      updateData.completedAt = new Date();
    } else if (data.status && data.status !== SessionStatus.COMPLETED && currentSession.status === SessionStatus.COMPLETED) {
      updateData.completedAt = null;
    }

    // Update session and activities in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update activity progress if provided
      if (activityProgress && activityProgress.length > 0) {
        for (const progress of activityProgress) {
          await tx.activity.update({
            where: { id: progress.id },
            data: {
              elapsedSeconds: progress.elapsedSeconds,
              completed: progress.completed,
            },
          });
        }
      }

      // Update session
      return tx.session.update({
        where: { id: sessionId },
        data: updateData,
        include: {
          activities: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
    });

    return updated;
  }

  async updateActivities(sessionId: string, userId: string, data: UpdateActivitiesInput) {
    // Verify ownership
    await this.getSession(sessionId, userId);

    // Validate unique names
    const activityNames = data.activities.map(a => a.name.trim().toLowerCase());
    const uniqueNames = new Set(activityNames);

    if (activityNames.length !== uniqueNames.size) {
      throw new Error('Activity names must be unique');
    }

    // Delete all existing activities and create new ones (simplest approach)
    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing activities
      await tx.activity.deleteMany({
        where: { sessionId },
      });

      // Create new activities
      await tx.activity.createMany({
        data: data.activities.map((activity, index) => ({
          sessionId,
          name: activity.name.trim(),
          durationMinutes: activity.durationMinutes,
          durationSeconds: activity.durationMinutes * 60,
          color: activity.color,
          completed: activity.completed ?? false,
          elapsedSeconds: activity.elapsedSeconds ?? 0,
          orderIndex: index,
        })),
      });

      // Return updated session
      return tx.session.findUnique({
        where: { id: sessionId },
        include: {
          activities: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
    });

    return updated;
  }

  async deleteSession(sessionId: string, userId: string) {
    // Verify ownership
    await this.getSession(sessionId, userId);

    await prisma.session.delete({
      where: { id: sessionId },
    });
  }

  async addActivities(sessionId: string, userId: string, data: AddActivitiesInput) {
    // Verify ownership and get current session
    const session = await this.getSession(sessionId, userId);

    // Check if session allows adding activities
    const allActivitiesDone = session.activities.every(a => a.completed);

    if (session.status === SessionStatus.COMPLETED && allActivitiesDone) {
      throw new Error('Cannot add activities to a fully completed session');
    }

    // Validate new activity names are unique (case-insensitive)
    const newNames = data.activities.map(a => a.name.trim().toLowerCase());
    const uniqueNewNames = new Set(newNames);
    if (newNames.length !== uniqueNewNames.size) {
      throw new Error('Activity names must be unique');
    }

    // Check for conflicts with existing activity names
    const existingNames = new Set(session.activities.map(a => a.name.trim().toLowerCase()));
    for (const name of newNames) {
      if (existingNames.has(name)) {
        throw new Error('Activity names must be unique');
      }
    }

    // Get max orderIndex from existing activities
    const maxOrderIndex = session.activities.reduce((max, a) => Math.max(max, a.orderIndex), -1);

    // Determine if session was INCOMPLETE (COMPLETED but not all activities done)
    const wasIncomplete = session.status === SessionStatus.COMPLETED && !allActivitiesDone;

    // Create new activities and update session status if needed
    const updated = await prisma.$transaction(async (tx) => {
      // Create new activities
      await tx.activity.createMany({
        data: data.activities.map((activity, index) => ({
          sessionId,
          name: activity.name.trim(),
          durationMinutes: activity.durationMinutes,
          durationSeconds: activity.durationMinutes * 60,
          color: activity.color,
          completed: false,
          elapsedSeconds: 0,
          orderIndex: maxOrderIndex + 1 + index,
        })),
      });

      // If session was INCOMPLETE, reset to PAUSED and clear completedAt
      if (wasIncomplete) {
        await tx.session.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.PAUSED,
            completedAt: null,
          },
        });
      }

      // Return updated session
      return tx.session.findUnique({
        where: { id: sessionId },
        include: {
          activities: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
    });

    return updated;
  }
}
