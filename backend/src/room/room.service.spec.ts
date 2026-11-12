import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { RoomService } from "./room.service";

describe("RoomService", () => {
  let service: RoomService;
  const prisma = {
    room: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
