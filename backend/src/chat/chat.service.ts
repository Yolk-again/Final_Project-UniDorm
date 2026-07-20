/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ChatThreadStatus, ChatThreadType, Role } from "@prisma/client";

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async ensureGroupChats() {
    const existing = await this.prisma.chatThread.findMany({
      where: {
        type: "GROUP",
        chatKey: { in: ["group-male", "group-female"] },
      },
      select: { chatKey: true },
    });

    const existingKeys = new Set(existing.map((thread) => thread.chatKey));
    const firstAdmin = await this.prisma.user.findFirst({
      where: { role: "admin" },
      orderBy: { createdAt: "asc" },
      select: { adminId: true },
    });
    const adminId = firstAdmin?.adminId ?? null;
    const operations: Array<Promise<any>> = [];

    if (!existingKeys.has("group-male")) {
      operations.push(
        this.prisma.chatThread.create({
          data: {
            chatKey: "group-male",
            type: "GROUP",
            audienceGender: "Male",
            adminId,
            status: "ACCEPTED",
          },
        }),
      );
    }

    if (!existingKeys.has("group-female")) {
      operations.push(
        this.prisma.chatThread.create({
          data: {
            chatKey: "group-female",
            type: "GROUP",
            audienceGender: "Female",
            adminId,
            status: "ACCEPTED",
          },
        }),
      );
    }

    if (operations.length > 0) {
      await Promise.all(operations);
    }
  }

  async getThreads() {
    await this.ensureGroupChats();

    const threads = await this.prisma.chatThread.findMany({
      orderBy: { updatedAt: "desc" },
    });

    const lastMessages = await Promise.all(
      threads.map((thread) =>
        this.prisma.chatMessage.findFirst({
          where: { chatKey: thread.chatKey },
          orderBy: { createdAt: "desc" },
          select: {
            senderRole: true,
            senderId: true,
            createdAt: true,
          },
        }),
      ),
    );

    return threads.map((thread, index) => ({
      ...thread,
      lastMessage: lastMessages[index] || null,
    }));
  }

  async createThread(data: any) {
    if (!data?.adminId) {
      throw new BadRequestException("Admin ID is required");
    }

    if (!data?.type || !["GROUP", "DIRECT"].includes(data.type)) {
      throw new BadRequestException("Chat type is required");
    }

    if (data.type === "GROUP") {
      if (!data?.audienceGender || !["Male", "Female"].includes(data.audienceGender)) {
        throw new BadRequestException("Audience gender is required for group chat");
      }

      const chatKey = `group-${data.audienceGender.toLowerCase()}`;
      const existing = await this.prisma.chatThread.findUnique({
        where: { chatKey },
      });
      if (existing) {
        return existing;
      }

      return this.prisma.chatThread.create({
        data: {
          chatKey,
          type: "GROUP",
          audienceGender: data.audienceGender,
          adminId: data.adminId,
          status: "ACCEPTED",
        },
      });
    }

    if (!data?.studentId) {
      throw new BadRequestException("Student ID is required for direct chat");
    }

    const student = await this.prisma.user.findFirst({
      where: { role: "student", studentId: data.studentId },
    });

    if (!student) {
      throw new BadRequestException("Student not found");
    }

    const chatKey = `direct-${data.adminId}-${data.studentId}`;
    const existing = await this.prisma.chatThread.findUnique({
      where: { chatKey },
    });

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
        studentId: data.studentId,
        adminId: data.adminId,
        status: "PENDING",
      },
    });
  }

  getMessages(chatKey: string) {
    return this.prisma.chatMessage.findMany({
      where: { chatKey },
      orderBy: { createdAt: "asc" },
    });
  }

  async sendMessage(data: any) {
    if (!data?.chatKey || !data?.content || !data?.senderRole || !data?.senderId) {
      throw new BadRequestException("chatKey, content, senderRole and senderId are required");
    }

    const thread = await this.prisma.chatThread.findUnique({
      where: { chatKey: data.chatKey },
    });

    if (!thread) {
      throw new BadRequestException("Chat thread not found");
    }

    if (thread.type === "DIRECT" && thread.status === "PENDING" && data.senderRole === "admin") {
      const chat = await this.prisma.chatMessage.create({
        data: {
          chatKey: data.chatKey,
          senderRole: "admin",
          senderId: data.senderId,
          content: data.content,
        },
      });
      return chat;
    }

    if (thread.type === "DIRECT" && thread.status === "PENDING" && data.senderRole === "student") {
      throw new BadRequestException("Student cannot send message until the admin request is accepted");
    }

    if (thread.type === "DIRECT" && thread.status === "DENIED") {
      throw new BadRequestException("Chat request was denied");
    }

    return this.prisma.chatMessage.create({
      data: {
        chatKey: data.chatKey,
        senderRole: data.senderRole,
        senderId: data.senderId,
        content: data.content,
      },
    });
  }

  async respondToRequest(chatKey: string, action: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { chatKey },
    });

    if (!thread) {
      throw new BadRequestException("Chat thread not found");
    }

    if (thread.type !== "DIRECT") {
      throw new BadRequestException("Only direct chat requests can be responded to");
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

  deleteThread(chatKey: string) {
    return this.prisma.chatThread.delete({ where: { chatKey } });
  }
}
