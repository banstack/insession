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
    await prisma.label.delete({
      where: {
        userId_color: { userId, color },
      },
    });
  }
}
