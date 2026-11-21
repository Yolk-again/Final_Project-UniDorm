import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";

const STUDENT_PREFIX = "68306130";
const ADMIN_ID_REGEX = /^(0[1-9]|10)$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
const GMAIL_REGEX = /^[^\s@]+@gmail\.com$/i;

const PUBLIC_USER_FIELDS = {
  id: true,
  name: true,
  email: true,
  studentId: true,
  adminId: true,
  gender: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

function isValidStudentId(id: string) {
  return new RegExp(`^${STUDENT_PREFIX}\\d{2}$`).test(id);
}

function isValidAdminId(id: string) {
  return ADMIN_ID_REGEX.test(id);
}

function isGmail(value: string) {
  return GMAIL_REGEX.test(String(value ?? "").trim());
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: any) {
    if (!data?.role || !["student", "admin"].includes(data.role)) {
      throw new BadRequestException("Role must be student or admin");
    }

    const role = data.role as "student" | "admin";
    const name = String(data.name ?? "").trim();
    const email = String(data.email ?? "").trim().toLowerCase();
    const password = String(data.password ?? "");

    if (!name) {
      throw new BadRequestException("Name is required");
    }

    if (!email) {
      throw new BadRequestException("Email is required");
    }

    if (!isGmail(email)) {
      throw new BadRequestException("Email must be a valid @gmail.com address");
    }

    if (!password) {
      throw new BadRequestException("Password is required");
    }

    if (!PASSWORD_REGEX.test(password)) {
      throw new BadRequestException(
        "Password must be at least 8 characters and include 1 lowercase letter, 1 uppercase letter, and 1 symbol",
      );
    }

    let studentId: string | null = null;
    let gender: string | null = null;
    let adminId: string | null = null;

    if (role === "student") {
      studentId = String(data.studentId ?? "").trim();
      gender = String(data.gender ?? "").trim();

      if (!studentId) {
        throw new BadRequestException("Student ID is required");
      }

      if (!isValidStudentId(studentId)) {
        throw new BadRequestException(
          `Student ID must start with ${STUDENT_PREFIX} and end with exactly 2 digits`,
        );
      }

      if (!["Male", "Female"].includes(gender)) {
        throw new BadRequestException("Gender is required");
      }
    }

    const [existingEmail, existingStudent] = await Promise.all([
      this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      }),
      role === "student"
        ? this.prisma.user.findUnique({
            where: { studentId: studentId as string },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (existingEmail) {
      throw new BadRequestException("This email is already registered");
    }

    if (existingStudent) {
      throw new BadRequestException("This student ID is already registered");
    }

    if (role === "admin") {
      const existingAdmins = await this.prisma.user.findMany({
        where: { role: "admin" },
        select: { adminId: true },
      });

      const usedAdminIds = new Set(
        existingAdmins.map((admin) => admin.adminId).filter(Boolean),
      );

      adminId = Array.from({ length: 10 }, (_, index) =>
        String(index + 1).padStart(2, "0"),
      ).find((id) => !usedAdminIds.has(id)) ?? null;

      if (!adminId) {
        throw new BadRequestException("Maximum 10 admins allowed");
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      await this.prisma.user.create({
        data: {
          role,
          name,
          email,
          studentId,
          adminId,
          gender,
          password: hashedPassword,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException(
          "This email, student ID, or admin ID is already registered",
        );
      }
      throw error;
    }

    return {
      message: role === "student"
        ? "Student registered successfully"
        : "Admin registered successfully",
      ...(role === "admin" ? { adminId } : {}),
      nextPath: `/login?role=${role}`,
    };
  }

  async login(data: any) {
    if (!data?.role || !["student", "admin"].includes(data.role)) {
      throw new BadRequestException("Role must be student or admin");
    }

    if (!data?.password) {
      throw new BadRequestException("Password is required");
    }

    let user;

    if (data.role === "student") {
      const studentId = String(data.studentId ?? "").trim();

      if (!studentId) {
        throw new BadRequestException("Student ID is required");
      }

      if (!isValidStudentId(studentId)) {
        throw new BadRequestException(
          `Student ID must start with ${STUDENT_PREFIX} and end with exactly 2 digits`,
        );
      }

      user = await this.prisma.user.findFirst({
        where: { role: "student", studentId },
      });
    } else {
      const adminId = String(data.adminId ?? "").trim();

      if (!adminId) {
        throw new BadRequestException("Admin ID is required");
      }

      if (!isValidAdminId(adminId)) {
        throw new BadRequestException("Admin ID must be between 01 and 10");
      }

      user = await this.prisma.user.findFirst({
        where: { role: "admin", adminId },
      });
    }

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const isMatch = await bcrypt.compare(String(data.password), user.password);

    if (!isMatch) {
      throw new UnauthorizedException("Invalid password");
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
    });

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      studentId: user.studentId,
      adminId: user.adminId,
      gender: user.gender,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      message: "Login success",
      accessToken,
      user: publicUser,
      redirectTo: user.role === "admin" ? "/admin/dashboard" : "/rooms",
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_USER_FIELDS,
    });

    if (!user) {
      throw new UnauthorizedException("Account not found");
    }

    return user;
  }

  async updateProfile(userId: number, data: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new UnauthorizedException("Account not found");
    }

    const name =
      data?.name === undefined
        ? existingUser.name
        : String(data.name).trim();
    const email =
      data?.email === undefined
        ? existingUser.email
        : String(data.email).trim().toLowerCase();

    if (!name) {
      throw new BadRequestException("Name is required");
    }

    if (!email || !isGmail(email)) {
      throw new BadRequestException("Email must be a valid @gmail.com address");
    }

    const updateData: {
      name: string;
      email: string;
      gender?: string;
      password?: string;
    } = {
      name,
      email,
    };

    if (existingUser.role === "student" && data?.gender !== undefined) {
      const gender = String(data.gender).trim();

      if (!["Male", "Female"].includes(gender)) {
        throw new BadRequestException("Gender must be Male or Female");
      }

      updateData.gender = gender;
    }

    if (data?.password) {
      const password = String(data.password);

      if (!PASSWORD_REGEX.test(password)) {
        throw new BadRequestException(
          "Password must be at least 8 characters and include 1 lowercase letter, 1 uppercase letter, and 1 symbol",
        );
      }

      updateData.password = await bcrypt.hash(password, 10);
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: PUBLIC_USER_FIELDS,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException("This email is already registered");
      }
      throw error;
    }
  }
}
