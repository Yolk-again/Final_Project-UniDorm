import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnnouncementAudience, NotificationType } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class AnnouncementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getAnnouncements(user: AuthenticatedUser) {
    const where =
      user.role === "admin"
        ? {}
        : {
            audience: {
              in: [
                AnnouncementAudience.ALL,
                ...(user.gender?.toUpperCase() === "MALE"
                  ? [AnnouncementAudience.MALE]
                  : user.gender?.toUpperCase() === "FEMALE"
                    ? [AnnouncementAudience.FEMALE]
                    : []),
              ],
            },
          };

    const announcements = await this.prisma.announcement.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (user.role !== "student" || announcements.length === 0) {
      return announcements;
    }

    const receipts = await this.prisma.announcementReadReceipt.findMany({
      where: {
        userId: user.id,
        announcementId: {
          in: announcements.map((announcement) => announcement.id),
        },
      },
      select: { announcementId: true, readAt: true },
    });
    const readByAnnouncementId = new Map<number, Date>(
      receipts.map(
        (receipt): [number, Date] => [receipt.announcementId, receipt.readAt],
      ),
    );

    return announcements.map((announcement) => {
      const readAt = readByAnnouncementId.get(announcement.id) ?? null;
      return { ...announcement, isRead: Boolean(readAt), readAt };
    });
  }

  async markAnnouncementRead(announcementId: number, user: AuthenticatedUser) {
    if (user.role !== "student") {
      throw new ForbiddenException("Only students can mark announcements as read");
    }

    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { id: true, audience: true },
    });
    if (!announcement) throw new NotFoundException("Announcement not found");

    const gender = String(user.gender ?? "").toUpperCase();
    if (
      (announcement.audience === AnnouncementAudience.MALE && gender !== "MALE") ||
      (announcement.audience === AnnouncementAudience.FEMALE && gender !== "FEMALE")
    ) {
      throw new ForbiddenException("This announcement is not available to your account");
    }

    const receipt = await this.prisma.announcementReadReceipt.upsert({
      where: {
        announcementId_userId: { announcementId, userId: user.id },
      },
      update: { readAt: new Date() },
      create: { announcementId, userId: user.id },
      select: { announcementId: true, readAt: true },
    });

    return { ...receipt, isRead: true };
  }

  async createAnnouncement(data: any) {
    const title = String(data?.title ?? "").trim();
    const content = String(data?.content ?? "").trim();
    const audience = String(data?.audience || "ALL").toUpperCase();

    if (!title) throw new BadRequestException("Announcement title is required");
    if (!content) throw new BadRequestException("Announcement content is required");
    if (!["ALL", "MALE", "FEMALE"].includes(audience)) {
      throw new BadRequestException("Invalid announcement audience");
    }

    const announcement = await this.prisma.announcement.create({
      data: {
        title,
        content,
        audience: audience as AnnouncementAudience,
        createdBy: String(data.createdBy || "admin"),
      },
    });
    await this.notifications.notifyStudentsByGender(audience as "ALL" | "MALE" | "FEMALE", {
      type: NotificationType.ANNOUNCEMENT_PUBLISHED,
      title: "New dorm announcement",
      message: title,
      link: "student:announcements",
      entityId: announcement.id,
    });
    return announcement;
  }
}
