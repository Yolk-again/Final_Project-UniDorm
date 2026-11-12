import {
  BadRequestException,
  ForbiddenException,
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

function isValidStudentId(id: string) {
  return new RegExp(`^${STUDENT_PREFIX}\\d{2}$`).test(id);
}

function isValidAdminId(id: string) {
  return ADMIN_ID_REGEX.test(id);
}

function isGmail(value: string) {
  return GMAIL_REGEX.test(String(value ?? "").trim());
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

    if (!data?.name?.trim()) {
      throw new BadRequestException("Name is required");
    }

    if (!data?.email?.trim() || !isGmail(data.email)) {
      throw new BadRequestException("Email must be a valid @gmail.com address");
    }

    if (!data?.password || !PASSWORD_REGEX.test(data.password)) {
      throw new BadRequestException(
        "Password must be at least 8 characters and include 1 lowercase letter, 1 uppercase letter, and 1 symbol",
      );
    }

    if (data.role === "admin") {
      const registrationKey = process.env.ADMIN_REGISTRATION_KEY;
      if (!registrationKey || data.registrationKey !== registrationKey) {
        throw new ForbiddenException("Admin registration requires a valid registration key");
      }
    }

    const email = data.email.trim().toLowerCase();
    const existingEmail = await this.prisma.user.findUnique({ where: { email } });

    if (existingEmail) {
      throw new BadRequestException("This email is already registered");
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    if (data.role === "student") {
      const studentId = String(data.studentId ?? "").trim();

      if (!isValidStudentId(studentId)) {
        throw new BadRequestException(
          `Student ID must start with ${STUDENT_PREFIX} and end with exactly 2 digits`,
        );
      }

      if (!data.gender || !["Male", "Female"].includes(data.gender)) {
        throw new BadRequestException("Gender is required");
      }

      const existingStudent = await this.prisma.user.findUnique({
        where: { studentId },
      });

      if (existingStudent) {
        throw new BadRequestException("This student ID is already registered");
      }

      await this.prisma.user.create({
        data: {
          role: "student",
          name: data.name.trim(),
          email,
          studentId,
          adminId: null,
          gender: data.gender,
          password: hashedPassword,
        },
      });

      return {
        message: "Student registered successfully",
        nextPath: "/login?role=student",
      };
    }

    const existingAdmins = await this.prisma.user.findMany({
      where: { role: "admin" },
      select: { adminId: true },
    });

    const usedAdminIds = new Set(
      existingAdmins.map((admin) => admin.adminId).filter(Boolean) as string[],
    );

    const nextAdminId = Array.from({ length: 10 }, (_, index) =>
      String(index + 1).padStart(2, "0"),
    ).find((id) => !usedAdminIds.has(id));

    if (!nextAdminId) {
      throw new BadRequestException("Maximum 10 admins allowed");
    }

    await this.prisma.user.create({
      data: {
        role: "admin",
        name: data.name.trim(),
        email,
        studentId: null,
        adminId: nextAdminId,
        gender: null,
        password: hashedPassword,
      },
    });

    return {
      message: "Admin registered successfully",
      adminId: nextAdminId,
      nextPath: "/login?role=admin",
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

      if (!isValidAdminId(adminId)) {
        throw new BadRequestException("Admin ID must be between 01 and 10");
      }

      user = await this.prisma.user.findFirst({
        where: { role: "admin", adminId },
      });
    }

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      throw new UnauthorizedException("Invalid login credentials");
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      studentId: user.studentId,
      adminId: user.adminId,
      gender: user.gender,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      studentId: user.studentId,
      adminId: user.adminId,
      gender: user.gender,
    });

    return {
      message: "Login success",
      user: safeUser,
      accessToken,
      expiresIn: "8h",
      redirectTo: user.role === "admin" ? "/admin/dashboard" : "/rooms",
    };
  }
}
