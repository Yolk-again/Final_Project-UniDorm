import { Test, TestingModule } from "@nestjs/testing";
import { RoomService } from "./room.service";
import { PrismaService } from "../prisma/prisma.service";

describe("RoomService", () => {
  let service: RoomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        {
          provide: PrismaService,
          useValue: {
            room: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            booking: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
