import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";

jest.mock("bcrypt", () => ({
  __esModule: true,
  hash: jest.fn(),
  compare: jest.fn(),
}));

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

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it.each(["1234567", "202612345", "6830613018", "1234567890123456"])(
    "accepts a numeric student ID of varying length: %s",
    async (studentId) => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

      const result = await service.register({
        role: "student",
        name: "Student User",
        email: "student@gmail.com",
        studentId,
        gender: "Male",
        password: "ValidPass!1",
      });

      expect(result).toEqual({
        message: "Student registered successfully",
        nextPath: "/login?role=student",
      });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: "student", studentId }),
        }),
      );
    },
  );

  it.each(["ABC12345", "12345678901234567"])(
    "rejects an invalid student ID format: %s",
    async (studentId) => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

      await expect(
        service.register({
          role: "student",
          name: "Student User",
          email: "student@gmail.com",
          studentId,
          gender: "Male",
          password: "ValidPass!1",
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    },
  );

  it("allows login with a student ID that does not use the old fixed prefix", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 8,
      name: "New Student",
      email: "newstudent@gmail.com",
      studentId: "202612345",
      adminId: null,
      gender: "Female",
      role: "student",
      password: "stored-hash",
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      role: "student",
      studentId: "202612345",
      password: "ValidPass!1",
    });

    expect(result.accessToken).toBe("signed-token");
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { role: "student", studentId: "202612345" },
    });
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

  it("rejects passwords longer than bcrypt's 72-byte input limit before comparison", async () => {
    const longUtf8Password = "é".repeat(37);

    await expect(service.login({
      role: "student",
      studentId: "6830613001",
      password: longUtf8Password,
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(bcrypt.compare).not.toHaveBeenCalled();
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

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

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
