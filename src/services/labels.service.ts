import prisma from '../config/database.js';

export class LabelService {
  async getLabels(userId: string) {
    const labels = await prisma.label.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return labels;
  }

  async upsertLabel(userId: string, color: string, name: string) {
    const label = await prisma.label.upsert({
      where: {
        userId_color: { userId, color },
      },
      update: { name },
      create: { userId, color, name },
    });

    return label;
  }

  async deleteLabel(userId: string, color: string) {
    // First unlink any activities from this label
    const label = await prisma.label.findUnique({
      where: { userId_color: { userId, color } },
    });

    if (label) {
      await prisma.activity.updateMany({
        where: { labelId: label.id },
        data: { labelId: null },
      });
    }

    await prisma.label.delete({
      where: {
        userId_color: { userId, color },
      },
    });
  }

  /**
   * Count activities with a specific color that are not linked to any label.
   * This is used to prompt the user for backfilling when creating/updating a label.
   */
  async countUnlinkedActivitiesByColor(userId: string, color: string): Promise<number> {
    // Get all session IDs for this user
    const userSessions = await prisma.session.findMany({
      where: { userId },
      select: { id: true },
    });
    const sessionIds = userSessions.map(s => s.id);

    if (sessionIds.length === 0) return 0;

    // Count activities with matching color and no labelId
    const count = await prisma.activity.count({
      where: {
        sessionId: { in: sessionIds },
        color,
        labelId: null,
      },
    });

    return count;
  }

  /**
   * Backfill: Link all activities with a specific color to a label.
   * Returns the number of activities updated.
   */
  async backfillActivitiesByColor(userId: string, color: string): Promise<number> {
    // Get the label for this color
    const label = await prisma.label.findUnique({
      where: { userId_color: { userId, color } },
    });

    if (!label) {
      throw new Error('Label not found');
    }

    // Get all session IDs for this user
    const userSessions = await prisma.session.findMany({
      where: { userId },
      select: { id: true },
    });
    const sessionIds = userSessions.map(s => s.id);

    if (sessionIds.length === 0) return 0;

    // Update all activities with matching color and no labelId
    const result = await prisma.activity.updateMany({
      where: {
        sessionId: { in: sessionIds },
        color,
        labelId: null,
      },
      data: {
        labelId: label.id,
      },
    });

    return result.count;
  }
}
