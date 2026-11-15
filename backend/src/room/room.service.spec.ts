import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { RoomService } from "./room.service";
import { NotificationsService } from "../notifications/notifications.service";

function createPrismaMock() {
  const transaction = {
    room: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    booking: {
      findFirst: jest.fn(),
    },
    paymentBill: {
      findFirst: jest.fn(),
    },
  };

  const prisma = {
    room: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };

  return { prisma, transaction };
}

describe("RoomService", () => {
  let service: RoomService;
  let prisma: ReturnType<typeof createPrismaMock>["prisma"];
  let transaction: ReturnType<typeof createPrismaMock>["transaction"];

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;
    transaction = mocks.transaction;
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomService, { provide: PrismaService, useValue: prisma }, { provide: NotificationsService, useValue: { notifyStudentsByGender: jest.fn() } }],
    }).compile();
    service = module.get<RoomService>(RoomService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("prevents renumbering a room after booking history exists", async () => {
    transaction.room.findUnique.mockResolvedValue({ id: 1, roomNumber: "A01" });
    transaction.booking.findFirst.mockResolvedValue({ id: 10 });
    transaction.paymentBill.findFirst.mockResolvedValue(null);

    await expect(service.updateRoom(1, {
      roomNumber: "A02", gender: "Male", type: "Standard", furniture: "Basic", price: 4500,
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(transaction.room.update).not.toHaveBeenCalled();
  });

  it("prevents deleting a room with booking history", async () => {
    transaction.room.findUnique.mockResolvedValue({ id: 1, roomNumber: "A01" });
    transaction.booking.findFirst.mockResolvedValue({ id: 10 });
    transaction.paymentBill.findFirst.mockResolvedValue(null);

    await expect(service.deleteRoom(1)).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.room.delete).not.toHaveBeenCalled();
  });

  it("prevents deleting a room referenced by a bill", async () => {
    transaction.room.findUnique.mockResolvedValue({ id: 1, roomNumber: "A01" });
    transaction.booking.findFirst.mockResolvedValue(null);
    transaction.paymentBill.findFirst.mockResolvedValue({ id: 25 });

    await expect(service.deleteRoom(1)).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.room.delete).not.toHaveBeenCalled();
  });

  it("allows editing room details when no history or active booking exists", async () => {
    const room = { id: 1, roomNumber: "A01" };
    transaction.room.findUnique.mockResolvedValue(room);
    transaction.booking.findFirst.mockResolvedValue(null);
    transaction.paymentBill.findFirst.mockResolvedValue(null);
    transaction.room.update.mockResolvedValue({ ...room, type: "Deluxe", price: "5000.00" });

    const result = await service.updateRoom(1, {
      roomNumber: "A01", gender: "Male", type: "Deluxe", furniture: "Desk", price: 5000,
    });

    expect(transaction.room.update).toHaveBeenCalled();
    expect(result.type).toBe("Deluxe");
  });
});
