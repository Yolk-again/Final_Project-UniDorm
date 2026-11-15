import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NotificationType, Role } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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
          update: { status: "ACCEPTED" },
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

    // Older direct conversations may still carry request states. All direct
    // conversations are now open immediately for both participants.
    await this.prisma.chatThread.updateMany({
      where: { type: "DIRECT", status: { not: "ACCEPTED" } },
      data: { status: "ACCEPTED" },
    });
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

    const userId = user.role === "admin" ? user.adminId : user.studentId;
    type ChatReadReceiptSummary = {
      chatKey: string;
      lastReadAt: Date;
      lastReadMessageId: number | null;
    };
    const [lastMessages, receipts] = await Promise.all([
      Promise.all(
        threads.map((thread) =>
          this.prisma.chatMessage.findFirst({
            where: { chatKey: thread.chatKey },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: { id: true, senderRole: true, senderId: true, createdAt: true, content: true },
          }),
        ),
      ),
      userId
        ? this.prisma.chatReadReceipt.findMany({
            where: {
              chatKey: { in: threads.map((thread) => thread.chatKey) },
              userRole: user.role as Role,
              userId,
            },
            select: { chatKey: true, lastReadAt: true, lastReadMessageId: true },
          })
        : Promise.resolve<ChatReadReceiptSummary[]>([]),
    ]);

    const readMap = new Map<string, ChatReadReceiptSummary>(
      receipts.map(
        (receipt): [string, ChatReadReceiptSummary] => [receipt.chatKey, receipt],
      ),
    );
    return threads.map((thread, index) => ({
      ...thread,
      status: "ACCEPTED",
      lastMessage: lastMessages[index] || null,
      lastReadAt: readMap.get(thread.chatKey)?.lastReadAt ?? null,
      lastReadMessageId: readMap.get(thread.chatKey)?.lastReadMessageId ?? null,
    }));
  }

  async markThreadRead(chatKey: string, user: AuthenticatedUser) {
    await this.assertThreadAccess(chatKey, user);
    const userId = user.role === "admin" ? user.adminId : user.studentId;
    if (!userId) throw new ForbiddenException("Account identity is incomplete");

    const latestMessage = await this.prisma.chatMessage.findFirst({
      where: { chatKey },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, createdAt: true },
    });
    const latestMessageAt = latestMessage?.createdAt.getTime() ?? 0;
    const readAt = new Date(Math.max(Date.now(), latestMessageAt + 2));

    return this.prisma.chatReadReceipt.upsert({
      where: {
        chatKey_userRole_userId: {
          chatKey,
          userRole: user.role as Role,
          userId,
        },
      },
      update: { lastReadAt: readAt, lastReadMessageId: latestMessage?.id ?? 0 },
      create: {
        chatKey,
        userRole: user.role as Role,
        userId,
        lastReadAt: readAt,
        lastReadMessageId: latestMessage?.id ?? 0,
      },
      select: { chatKey: true, userRole: true, userId: true, lastReadAt: true, lastReadMessageId: true },
    });
  }

  private async assertThreadAccess(chatKey: string, user: AuthenticatedUser) {
    const thread = await this.prisma.chatThread.findUnique({ where: { chatKey } });
    if (!thread) throw new NotFoundException("Chat thread not found");

    if (user.role === "admin") return thread;

    if (thread.type === "DIRECT" && thread.studentId !== user.studentId) {
      throw new ForbiddenException("You cannot access this chat");
    }

    if (thread.type === "GROUP" && String(thread.audienceGender).toLowerCase() !== String(user.gender).toLowerCase()) {
      throw new ForbiddenException("This group is not available to your account");
    }

    return thread;
  }

  async createThread(data: any, user: AuthenticatedUser) {
    if (!data?.type || !["GROUP", "DIRECT"].includes(data.type)) {
      throw new BadRequestException("Chat type is required");
    }

    if (user.role === "student") {
      if (data.type !== "DIRECT") {
        throw new ForbiddenException("Students can only start direct chats with the dormitory admin");
      }
      const studentId = user.studentId;
      if (!studentId) throw new ForbiddenException("Student account is incomplete");
      const admin = await this.prisma.user.findFirst({
        where: { role: "admin" },
        orderBy: { createdAt: "asc" },
        select: { adminId: true },
      });
      if (!admin?.adminId) throw new NotFoundException("No administrator account is available yet");

      const existing = await this.prisma.chatThread.findFirst({
        where: { type: "DIRECT", studentId },
        orderBy: { createdAt: "asc" },
      });
      if (existing) {
        return this.prisma.chatThread.update({
          where: { chatKey: existing.chatKey },
          data: { status: "ACCEPTED", adminId: admin.adminId },
        });
      }
      return this.prisma.chatThread.create({
        data: {
          chatKey: `student-admin-${studentId}`,
          type: "DIRECT",
          studentId,
          adminId: admin.adminId,
          status: "ACCEPTED",
        },
      });
    }

    const adminId = user.adminId;
    if (!adminId) throw new ForbiddenException("Admin account is incomplete");

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

    const existing = await this.prisma.chatThread.findFirst({
      where: { type: "DIRECT", studentId },
      orderBy: { createdAt: "asc" },
    });
    if (existing) {
      return this.prisma.chatThread.update({
        where: { chatKey: existing.chatKey },
        data: { status: "ACCEPTED", adminId },
      });
    }
    return this.prisma.chatThread.create({
      data: {
        chatKey: `student-admin-${studentId}`,
        type: "DIRECT",
        studentId,
        adminId,
        status: "ACCEPTED",
      },
    });
  }

  async getMessages(chatKey: string, user: AuthenticatedUser) {
    await this.assertThreadAccess(chatKey, user);
    return this.prisma.chatMessage.findMany({
      where: { chatKey },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  }

  async sendMessage(data: any, user: AuthenticatedUser) {
    const chatKey = String(data?.chatKey ?? "").trim();
    const content = String(data?.content ?? "").trim();
    if (!chatKey || !content) throw new BadRequestException("A chat and message are required");
    if (content.length > 2000) throw new BadRequestException("Messages cannot exceed 2,000 characters");

    const thread = await this.assertThreadAccess(chatKey, user);
    const senderId = user.role === "admin" ? user.adminId : user.studentId;
    if (!senderId) throw new ForbiddenException("Account identity is incomplete");

    const message = await this.prisma.chatMessage.create({
      data: { chatKey, senderRole: user.role as Role, senderId, content },
    });

    await this.prisma.chatThread.update({
      where: { chatKey: thread.chatKey },
      data: { updatedAt: new Date() },
    });

    const notification = {
      type: NotificationType.CHAT_MESSAGE,
      title: "New chat message",
      message: content.length > 120 ? `${content.slice(0, 117)}…` : content,
      link: user.role === "admin" ? "student:chat" : "admin:chat",
      entityId: message.id,
    };

    if (thread.type === "GROUP") {
      if (user.role === "admin") {
        const gender = String(thread.audienceGender).toUpperCase() === "FEMALE" ? "FEMALE" : "MALE";
        await this.notifications.notifyStudentsByGender(gender, notification, user.id);
      } else {
        await this.notifications.notifyAdmins({ ...notification, link: "admin:chat" });
      }
    } else if (user.role === "admin" && thread.studentId) {
      await this.notifications.notifyStudent(thread.studentId, { ...notification, link: "student:chat" });
    } else if (thread.adminId) {
      const admin = await this.prisma.user.findFirst({
        where: { role: "admin", adminId: thread.adminId },
        select: { id: true },
      });
      if (admin) await this.notifications.notifyUser(admin.id, { ...notification, link: "admin:chat" });
    }
    return message;
  }

  async deleteThread(chatKey: string) {
    await this.prisma.chatMessage.deleteMany({ where: { chatKey } });
    return this.prisma.chatThread.delete({ where: { chatKey } });
  }
}
