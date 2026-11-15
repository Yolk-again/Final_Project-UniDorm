import { BadRequestException, NotFoundException } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  const prisma = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(prisma as any);
  });

  it("returns only the authenticated user's notifications and unread count", async () => {
    const items = [{ id: 1, userId: 7, readAt: null }];
    prisma.notification.findMany.mockResolvedValue(items);
    prisma.notification.count.mockResolvedValue(1);

    const result = await service.listForUser({ id: 7, role: "student", studentId: "S007", adminId: null, gender: "Female" });

    expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 7 } }));
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { userId: 7, readAt: null } });
    expect(result).toEqual({ items, unreadCount: 1 });
  });


  it("counts only unread bill-created notifications for the authenticated student", async () => {
    prisma.notification.count.mockResolvedValue(2);

    const result = await service.unreadCountForType("BILL_CREATED", { id: 7, role: "student", studentId: "S007", adminId: null, gender: "Female" });

    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 7, type: "BILL_CREATED", readAt: null },
    });
    expect(result).toEqual({ type: "BILL_CREATED", unreadCount: 2 });
  });

  it("marks only bill-created notifications belonging to the authenticated student as read", async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 2 });

    const result = await service.markTypeRead("BILL_CREATED", { id: 7, role: "student", studentId: "S007", adminId: null, gender: "Female" });

    expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 7, type: "BILL_CREATED", readAt: null },
    }));
    expect(result).toEqual({ type: "BILL_CREATED", updatedCount: 2 });
  });

  it("rejects unknown notification types", async () => {
    await expect(service.markTypeRead("NOT_A_TYPE", { id: 7, role: "student", studentId: "S007", adminId: null, gender: "Female" }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });

  it("does not allow marking another user's notification as read", async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(service.markRead(15, { id: 7, role: "student", studentId: "S007", adminId: null, gender: "Female" }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 15, userId: 7, readAt: null } }));
  });

  it("marks only the current user's unread notifications as read", async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 3 });

    const result = await service.markAllRead({ id: 7, role: "admin", studentId: null, adminId: "A007", gender: null });

    expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 7, readAt: null } }));
    expect(result).toEqual({ updatedCount: 3 });
  });
});
