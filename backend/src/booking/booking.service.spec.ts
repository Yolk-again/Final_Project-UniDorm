import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { BookingService } from "./booking.service";
import { NotificationsService } from "../notifications/notifications.service";

describe("BookingService", () => {
  let service: BookingService;
  const prisma = {
    booking: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: { notifyAdmins: jest.fn(), notifyStudent: jest.fn() } },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("only returns full booking details to the owning student", async () => {
    prisma.booking.findMany.mockResolvedValue([
      {
        id: 1,
        studentId: "6830613001",
        roomNumber: "A01",
        type: "Single Room",
        furniture: "Fully Furnished",
        price: 5500,
        status: "Pending",
        createdAt: new Date(),
      },
      {
        id: 2,
        studentId: "6830613002",
        roomNumber: "A02",
        type: "Studio Room",
        furniture: "Basic",
        price: 4000,
        status: "Approved",
        createdAt: new Date(),
      },
    ]);

    const result = await service.getBookings({
      id: 1,
      role: "student",
      studentId: "6830613001",
      adminId: null,
      gender: "Male",
    });

    expect(result[0]).toHaveProperty("studentId", "6830613001");
    expect(result[1]).not.toHaveProperty("studentId");
    expect(result[1]).not.toHaveProperty("price");
  });


  it("does not delete an approved booking or remove its audit history", async () => {
    const tx = {
      booking: {
        findUnique: jest.fn().mockResolvedValue({ id: 8, studentId: "6830613001", status: "Approved" }),
        deleteMany: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    await expect(service.deleteBooking(8, {
      id: 1, role: "student", studentId: "6830613001", adminId: null, gender: "Male",
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.booking.deleteMany).not.toHaveBeenCalled();
  });

  it("does not allow a student to remove another student's booking", async () => {
    const tx = {
      booking: {
        findUnique: jest.fn().mockResolvedValue({ id: 8, studentId: "6830613002", status: "Rejected" }),
        deleteMany: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    await expect(service.deleteBooking(8, {
      id: 1, role: "student", studentId: "6830613001", adminId: null, gender: "Male",
    })).rejects.toBeInstanceOf(ForbiddenException);

    expect(tx.booking.deleteMany).not.toHaveBeenCalled();
  });

  it("removes only the same pending/rejected booking version inside a transaction", async () => {
    const tx = {
      booking: {
        findUnique: jest.fn().mockResolvedValue({ id: 8, studentId: "6830613001", status: "Rejected" }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    const result = await service.deleteBooking(8, {
      id: 1, role: "student", studentId: "6830613001", adminId: null, gender: "Male",
    });

    expect(tx.booking.deleteMany).toHaveBeenCalledWith({
      where: { id: 8, status: "Rejected", studentId: "6830613001" },
    });
    expect(result).toEqual({ id: 8, removed: true });
  });

  it("does not allow admins to review a booking twice after it leaves Pending", async () => {
    const tx = {
      booking: {
        findUnique: jest.fn().mockResolvedValue({ id: 7, status: "Approved", roomNumber: "A01" }),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    await expect(service.updateStatus(7, "Rejected")).rejects.toThrow("Only pending booking requests can be reviewed");
    expect(tx.booking.update).not.toHaveBeenCalled();
  });
});
