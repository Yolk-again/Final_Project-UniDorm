import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureGroupChats() {
    const firstAdmin = await this.prisma.user.findFirst({
      where: { role: "admin" },
      orderBy: { createdAt: "asc" },
      select: { adminId: true },
    });
    const adminId = firstAdmin?.adminId ?? null;

    await Promise.all(
      [
        { chatKey: "group-male", audienceGender: "Male" },
        { chatKey: "group-female", audienceGender: "Female" },
      ].map((group) =>
        this.prisma.chatThread.upsert({
          where: { chatKey: group.chatKey },
          update: {},
          create: {
            chatKey: group.chatKey,
            type: "GROUP",
            audienceGender: group.audienceGender,
            adminId,
            status: "ACCEPTED",
          },
        }),
      ),
    );
  }

  async getThreads(user: AuthenticatedUser) {
    await this.ensureGroupChats();

    const where =
      user.role === "admin"
        ? {}
        : {
            OR: [
              ...(user.gender ? [{ type: "GROUP" as const, audienceGender: user.gender }] : []),
              ...(user.studentId ? [{ type: "DIRECT" as const, studentId: user.studentId }] : []),
            ],
          };

    const threads = await this.prisma.chatThread.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    const lastMessages = await Promise.all(
      threads.map((thread) =>
        this.prisma.chatMessage.findFirst({
          where: { chatKey: thread.chatKey },
          orderBy: { createdAt: "desc" },
          select: { senderRole: true, senderId: true, createdAt: true },
        }),
      ),
    );

    return threads.map((thread, index) => ({
      ...thread,
      lastMessage: lastMessages[index] || null,
    }));
  }

  private async assertThreadAccess(chatKey: string, user: AuthenticatedUser) {
    const thread = await this.prisma.chatThread.findUnique({ where: { chatKey } });
    if (!thread) throw new NotFoundException("Chat thread not found");

    if (user.role === "admin") return thread;

    if (thread.type === "DIRECT" && thread.studentId !== user.studentId) {
      throw new ForbiddenException("You cannot access this chat");
    }

    if (thread.type === "GROUP" && thread.audienceGender !== user.gender) {
      throw new ForbiddenException("This group is not available to your account");
    }

    return thread;
  }

  async createThread(data: any, user: AuthenticatedUser) {
    const adminId = user.adminId;
    if (!adminId) throw new ForbiddenException("Admin account is incomplete");

    if (!data?.type || !["GROUP", "DIRECT"].includes(data.type)) {
      throw new BadRequestException("Chat type is required");
    }

    if (data.type === "GROUP") {
      if (!data?.audienceGender || !["Male", "Female"].includes(data.audienceGender)) {
        throw new BadRequestException("Audience gender is required for group chat");
      }

      const chatKey = `group-${data.audienceGender.toLowerCase()}`;
      return this.prisma.chatThread.upsert({
        where: { chatKey },
        update: { adminId, status: "ACCEPTED" },
        create: {
          chatKey,
          type: "GROUP",
          audienceGender: data.audienceGender,
          adminId,
          status: "ACCEPTED",
        },
      });
    }

    const studentId = String(data?.studentId ?? "").trim();
    if (!studentId) throw new BadRequestException("Student ID is required for direct chat");

    const student = await this.prisma.user.findFirst({
      where: { role: "student", studentId },
      select: { studentId: true },
    });
    if (!student) throw new NotFoundException("Student not found");

    const chatKey = `direct-${adminId}-${studentId}`;
    const existing = await this.prisma.chatThread.findUnique({ where: { chatKey } });

    if (existing) {
      if (existing.status === "DENIED") {
        return this.prisma.chatThread.update({
          where: { chatKey },
          data: { status: "PENDING" },
        });
      }
      return existing;
    }

    return this.prisma.chatThread.create({
      data: {
        chatKey,
        type: "DIRECT",
        studentId,
        adminId,
        status: "PENDING",
      },
    });
  }

  async getMessages(chatKey: string, user: AuthenticatedUser) {
    await this.assertThreadAccess(chatKey, user);
    return this.prisma.chatMessage.findMany({
      where: { chatKey },
      orderBy: { createdAt: "asc" },
    });
  }

  async sendMessage(data: any, user: AuthenticatedUser) {
    const chatKey = String(data?.chatKey ?? "").trim();
    const content = String(data?.content ?? "").trim();

    if (!chatKey || !content) {
      throw new BadRequestException("A chat and message are required");
    }
    if (content.length > 2000) {
      throw new BadRequestException("Messages cannot exceed 2,000 characters");
    }

    const thread = await this.assertThreadAccess(chatKey, user);

    if (thread.type === "DIRECT") {
      if (thread.status === "DENIED") {
        throw new ForbiddenException("Chat request was denied");
      }
      if (user.role === "student" && thread.status !== "ACCEPTED") {
        throw new ForbiddenException("Accept the chat request before sending messages");
      }
    }

    const senderId = user.role === "admin" ? user.adminId : user.studentId;
    if (!senderId) throw new ForbiddenException("Account identity is incomplete");

    return this.prisma.chatMessage.create({
      data: {
        chatKey,
        senderRole: user.role as Role,
        senderId,
        content,
      },
    });
  }

  async respondToRequest(chatKey: string, action: string, user: AuthenticatedUser) {
    const thread = await this.assertThreadAccess(chatKey, user);

    if (thread.type !== "DIRECT" || thread.studentId !== user.studentId) {
      throw new ForbiddenException("You cannot respond to this request");
    }
    if (thread.status !== "PENDING") {
      throw new BadRequestException("This chat request has already been handled");
    }

    if (action === "accept") {
      return this.prisma.chatThread.update({
        where: { chatKey },
        data: { status: "ACCEPTED" },
      });
    }

    if (action === "deny") {
      return this.prisma.chatThread.update({
        where: { chatKey },
        data: { status: "DENIED" },
      });
    }

    throw new BadRequestException("Invalid action");
  }

  async deleteThread(chatKey: string) {
    await this.prisma.chatMessage.deleteMany({ where: { chatKey } });
    return this.prisma.chatThread.delete({ where: { chatKey } });
  }
}
