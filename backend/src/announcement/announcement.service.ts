import { BadRequestException, Injectable } from "@nestjs/common";
import { AnnouncementAudience } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma: PrismaService) {}

  getAnnouncements(user: AuthenticatedUser) {
    const where =
      user.role === "admin"
        ? {}
        : {
            audience: {
              in: [
                AnnouncementAudience.ALL,
                user.gender?.toUpperCase() === "MALE"
                  ? AnnouncementAudience.MALE
                  : AnnouncementAudience.FEMALE,
              ],
            },
          };

    return this.prisma.announcement.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  createAnnouncement(data: any) {
    const title = String(data?.title ?? "").trim();
    const content = String(data?.content ?? "").trim();
    const audience = String(data?.audience || "ALL").toUpperCase();

    if (!title) throw new BadRequestException("Announcement title is required");
    if (!content) throw new BadRequestException("Announcement content is required");
    if (!["ALL", "MALE", "FEMALE"].includes(audience)) {
      throw new BadRequestException("Invalid announcement audience");
    }

    return this.prisma.announcement.create({
      data: {
        title,
        content,
        audience: audience as AnnouncementAudience,
        createdBy: String(data.createdBy || "admin"),
      },
    });
  }
}
