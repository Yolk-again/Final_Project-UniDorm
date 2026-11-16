import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
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
    prisma.user.create.mockResolvedValue({});
    prisma.user.findUnique.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

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

  it.each(["6900123401", "6805432102", "6723456789"])(
    "stores the exact 10-digit university-issued student ID: %s",
    async (studentId) => {
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
        studentId,
        nextPath: "/login?role=student",
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: "student",
          studentId,
          name: "Student User",
        }),
      });
    },
  );

  it.each(["1234567", "123456789", "12345678901", "ABCDEFGHIJ"])(
    "rejects a student ID that is not exactly 10 digits: %s",
    async (studentId) => {
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

  it("rejects a university-issued ID that is already registered", async () => {
    prisma.user.create.mockRejectedValue({ code: "P2002" });

    await expect(
      service.register({
        role: "student",
        name: "Duplicate Student",
        email: "duplicate@gmail.com",
        studentId: "6900123401",
        gender: "Female",
        password: "ValidPass!1",
      }),
    ).rejects.toThrow(ConflictException);
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
