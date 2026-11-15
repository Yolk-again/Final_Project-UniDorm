import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";

export type NotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  entityId?: number | null;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: AuthenticatedUser) {
    const where = { userId: user.id };
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return { items, unreadCount };
  }

  async markRead(id: number, user: AuthenticatedUser) {
    await this.prisma.notification.updateMany({
      where: { id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId: user.id },
    });
    if (!notification) throw new NotFoundException("Notification not found");
    return notification;
  }

  async markAllRead(user: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { updatedCount: result.count };
  }


  async unreadCountForType(typeValue: string, user: AuthenticatedUser) {
    const type = this.parseNotificationType(typeValue);
    const unreadCount = await this.prisma.notification.count({
      where: { userId: user.id, type, readAt: null },
    });
    return { type, unreadCount };
  }

  async markTypeRead(typeValue: string, user: AuthenticatedUser) {
    const type = this.parseNotificationType(typeValue);
    const result = await this.prisma.notification.updateMany({
      where: { userId: user.id, type, readAt: null },
      data: { readAt: new Date() },
    });
    return { type, updatedCount: result.count };
  }

  private parseNotificationType(value: string): NotificationType {
    const normalized = String(value ?? "").trim().toUpperCase();
    if (!Object.values(NotificationType).includes(normalized as NotificationType)) {
      throw new BadRequestException("Unknown notification type");
    }
    return normalized as NotificationType;
  }

  async notifyUser(userId: number, input: NotificationInput) {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type: input.type,
          title: input.title.slice(0, 140),
          message: input.message.slice(0, 500),
          link: input.link ?? null,
          entityId: input.entityId ?? null,
        },
      });
    } catch (error) {
      console.error("Could not persist UniDorm notification:", error);
    }
  }

  async notifyStudent(studentId: string, input: NotificationInput) {
    try {
      const student = await this.prisma.user.findFirst({
        where: { studentId, role: "student" },
        select: { id: true },
      });
      if (student) await this.notifyUser(student.id, input);
    } catch (error) {
      console.error("Could not notify UniDorm student:", error);
    }
  }

  async notifyAdmins(input: NotificationInput) {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: "admin" },
        select: { id: true },
      });
      if (!admins.length) return;
      await this.prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: input.type,
          title: input.title.slice(0, 140),
          message: input.message.slice(0, 500),
          link: input.link ?? null,
          entityId: input.entityId ?? null,
        })),
      });
    } catch (error) {
      console.error("Could not notify UniDorm admins:", error);
    }
  }

  async notifyStudentsByGender(gender: "ALL" | "MALE" | "FEMALE", input: NotificationInput, excludeUserId?: number) {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          role: "student",
          ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
          ...(gender === "ALL" ? {} : { gender: { equals: gender, mode: "insensitive" as const } }),
        },
        select: { id: true },
      });
      if (!users.length) return;
      await this.prisma.notification.createMany({
        data: users.map((user) => ({
          userId: user.id,
          type: input.type,
          title: input.title.slice(0, 140),
          message: input.message.slice(0, 500),
          link: input.link ?? null,
          entityId: input.entityId ?? null,
        })),
      });
    } catch (error) {
      console.error("Could not notify UniDorm residents:", error);
    }
  }
}
