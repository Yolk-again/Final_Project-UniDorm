import { UnauthorizedException } from "@nestjs/common";
import { JwtAuthGuard } from "./auth.guard";

describe("JwtAuthGuard live account validation", () => {
  const handler = jest.fn();
  const controller = class TestController {};
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  };
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };
  let guard: JwtAuthGuard;

  function createContext(request: { headers: { authorization?: string }; user?: unknown }) {
    return {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
    guard = new JwtAuthGuard(jwtService as any, reflector as any, prisma as any);
  });

  it("loads current account identity and role from the database", async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 7,
      role: "student",
      studentId: "6830613018",
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      role: "student",
      studentId: "6830613018",
      adminId: null,
      gender: "Female",
    });
    const request: any = { headers: { authorization: "Bearer valid-token" } };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 7,
      role: "student",
      studentId: "6830613018",
      adminId: null,
      gender: "Female",
    });
  });

  it("rejects a token when its account no longer exists", async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 7, role: "student", studentId: "6830613018" });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(createContext({ headers: { authorization: "Bearer deleted-user-token" } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a token after the account role changes", async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 7, role: "student", studentId: "6830613018" });
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      role: "admin",
      studentId: null,
      adminId: "01",
      gender: null,
    });

    await expect(
      guard.canActivate(createContext({ headers: { authorization: "Bearer stale-role-token" } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a token after the university student ID is changed", async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 7, role: "student", studentId: "6830613018" });
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      role: "student",
      studentId: "6830613019",
      adminId: null,
      gender: "Female",
    });

    await expect(
      guard.canActivate(createContext({ headers: { authorization: "Bearer stale-id-token" } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects malformed bearer authorization headers", async () => {
    await expect(
      guard.canActivate(createContext({ headers: { authorization: "Bearer token extra" } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });
});
