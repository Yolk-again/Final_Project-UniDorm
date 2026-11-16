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
  const transaction = {
    $queryRaw: jest.fn(),
    user: {
      create: jest.fn(),
    },
  };
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const jwt = {
    signAsync: jest.fn().mockResolvedValue("signed-token"),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    transaction.$queryRaw.mockResolvedValue([{ sequence: 1 }]);
    transaction.user.create.mockResolvedValue({});
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction),
    );

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

  it.each(["69001234", "68054321", "67234567"])(
    "generates a 10-digit UniDorm ID from an 8-digit PSU prefix: %s",
    async (studentIdPrefix) => {
      prisma.user.findUnique.mockResolvedValue(null);
      transaction.$queryRaw.mockResolvedValue([{ sequence: 1 }]);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      const result = await service.register({ role: "student", name: "Student User", email: "student@gmail.com", studentIdPrefix, gender: "Male", password: "ValidPass!1" });
      expect(result).toEqual({ message: "Student registered successfully", studentId: `${studentIdPrefix}01`, nextPath: "/login?role=student" });
      expect(transaction.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: "student", studentId: `${studentIdPrefix}01` }) }));
    },
  );

  it("increments the final two digits in registration order for the same prefix", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    transaction.$queryRaw.mockResolvedValueOnce([{ sequence: 1 }]).mockResolvedValueOnce([{ sequence: 2 }]);
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
    const first = await service.register({ role: "student", name: "First Student", email: "first@gmail.com", studentIdPrefix: "69001234", gender: "Male", password: "ValidPass!1" });
    const second = await service.register({ role: "student", name: "Second Student", email: "second@gmail.com", studentIdPrefix: "69001234", gender: "Female", password: "ValidPass!1" });
    expect(first.studentId).toBe("6900123401");
    expect(second.studentId).toBe("6900123402");
  });

  it("allocates independent sequences for different programme prefixes", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    transaction.$queryRaw.mockResolvedValueOnce([{ sequence: 1 }]).mockResolvedValueOnce([{ sequence: 1 }]);
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
    const first = await service.register({ role: "student", name: "First Programme Student", email: "first-programme@gmail.com", studentIdPrefix: "69001234", gender: "Male", password: "ValidPass!1" });
    const second = await service.register({ role: "student", name: "Second Programme Student", email: "second-programme@gmail.com", studentIdPrefix: "69005678", gender: "Female", password: "ValidPass!1" });
    expect(first.studentId).toBe("6900123401");
    expect(second.studentId).toBe("6900567801");
  });

  it.each(["1234567", "123456789", "ABCDEFGH"])("rejects a prefix that is not exactly 8 digits: %s", async (studentIdPrefix) => {
    prisma.user.findUnique.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
    await expect(service.register({ role: "student", name: "Student User", email: "student@gmail.com", studentIdPrefix, gender: "Male", password: "ValidPass!1" })).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(transaction.user.create).not.toHaveBeenCalled();
  });

  it("stops when all 99 registration sequence numbers are used", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    transaction.$queryRaw.mockResolvedValue([]);
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
    await expect(service.register({ role: "student", name: "Full Group", email: "full@gmail.com", studentIdPrefix: "69001234", gender: "Male", password: "ValidPass!1" })).rejects.toThrow(ConflictException);
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
