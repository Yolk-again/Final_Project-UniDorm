import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { BookingService } from "./booking.service";

describe("BookingService", () => {
  let service: BookingService;
  const prisma = {
    booking: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
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
});
