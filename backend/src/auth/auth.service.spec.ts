import { ForbiddenException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };
  const jwt = {
    signAsync: jest.fn().mockResolvedValue("signed-token"),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("does not allow admin registration without the configured registration key", async () => {
    await expect(
      service.register({
        role: "admin",
        name: "New Admin",
        email: "admin@gmail.com",
        password: "ValidPass!1",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("returns a signed token without returning the stored password hash", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 7,
      name: "Student User",
      email: "student@gmail.com",
      studentId: "6830613001",
      adminId: null,
      gender: "Male",
      role: "student",
      password: "stored-hash",
    });
    jest.spyOn(bcrypt, "compare").mockResolvedValue(true);

    const result = await service.login({
      role: "student",
      studentId: "6830613001",
      password: "ValidPass!1",
    });

    expect(result.accessToken).toBe("signed-token");
    expect(result.user).not.toHaveProperty("password");
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 7, role: "student" }),
    );
  });
});
