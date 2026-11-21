import { Test, TestingModule } from "@nestjs/testing";
import { BookingService } from "./booking.service";
import { PrismaService } from "../prisma/prisma.service";

describe("BookingService", () => {
  let service: BookingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: PrismaService,
          useValue: {
            booking: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            room: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
