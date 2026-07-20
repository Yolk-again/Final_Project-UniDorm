/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnnouncementService {
  constructor(private prisma: PrismaService) {}

  getAnnouncements() {
    return this.prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  createAnnouncement(data: any) {
    if (!data?.title?.trim()) {
      throw new BadRequestException("Announcement title is required");
    }

    if (!data?.content?.trim()) {
      throw new BadRequestException("Announcement content is required");
    }

    const audience = String(data.audience || "ALL").toUpperCase();
    const validAudiences = ["ALL", "MALE", "FEMALE"];

    if (!validAudiences.includes(audience)) {
      throw new BadRequestException("Invalid announcement audience");
    }

    return this.prisma.announcement.create({
      data: {
        title: data.title.trim(),
        content: data.content.trim(),
        audience: audience as any,
        createdBy: data.createdBy || "admin",
      },
    });
  }
}
