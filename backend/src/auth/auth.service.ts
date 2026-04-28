/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";

const STUDENT_PREFIX = "68306130";
const ADMIN_ID_REGEX = /^(0[1-9]|10)$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

function isValidStudentId(id: string) {
  return new RegExp(`^${STUDENT_PREFIX}\\d{2}$`).test(id);
}

function isValidAdminId(id: string) {
  return ADMIN_ID_REGEX.test(id);
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(data: any) {
    if (!data?.role || !["student", "admin"].includes(data.role)) {
      throw new BadRequestException("Role must be student or admin");
    }

    if (!data?.name?.trim()) {
      throw new BadRequestException("Name is required");
    }

    if (!data?.password) {
      throw new BadRequestException("Password is required");
    }

    if (!PASSWORD_REGEX.test(data.password)) {
      throw new BadRequestException(
        "Password must be at least 8 characters and include 1 lowercase letter, 1 uppercase letter, and 1 symbol",
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    if (data.role === "student") {
      if (!data.studentId) {
        throw new BadRequestException("Student ID is required");
      }

      if (!isValidStudentId(data.studentId)) {
        throw new BadRequestException(
          `Student ID must start with ${STUDENT_PREFIX} and end with exactly 2 digits`,
        );
      }

      const existingStudent = await this.prisma.user.findFirst({
        where: { role: "student", studentId: data.studentId },
      });

      if (existingStudent) {
        throw new BadRequestException("This student ID is already registered");
      }

      const user = await this.prisma.user.create({
        data: {
          role: "student",
          name: data.name,
          email: data.email || null,
          studentId: data.studentId,
          adminId: null,
          gender: data.gender || null,
          password: hashedPassword,
        },
      });

      return { message: "Student registered", user };
    }

    const existingAdmins = await this.prisma.user.findMany({
      where: { role: "admin" },
      select: { adminId: true },
    });

    const usedAdminIds = new Set(
      existingAdmins.map((admin) => admin.adminId).filter(Boolean),
    );

    const nextAdminId = Array.from({ length: 10 }, (_, i) =>
      String(i + 1).padStart(2, "0"),
    ).find((id) => !usedAdminIds.has(id));

    if (!nextAdminId) {
      throw new BadRequestException("Maximum 10 admins allowed");
    }

    const user = await this.prisma.user.create({
      data: {
        role: "admin",
        name: data.name,
        email: data.email || null,
        studentId: null,
        adminId: nextAdminId,
        gender: null,
        password: hashedPassword,
      },
    });

    return {
      message: "Admin registered",
      adminId: nextAdminId,
      user,
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
      if (!data.studentId) {
        throw new BadRequestException("Student ID is required");
      }

      if (!isValidStudentId(data.studentId)) {
        throw new BadRequestException(
          `Student ID must start with ${STUDENT_PREFIX} and end with exactly 2 digits`,
        );
      }

      user = await this.prisma.user.findFirst({
        where: { role: "student", studentId: data.studentId },
      });
    } else {
      if (!data.adminId) {
        throw new BadRequestException("Admin ID is required");
      }

      if (!isValidAdminId(data.adminId)) {
        throw new BadRequestException(
          "Admin ID must be between 01 and 10",
        );
      }

      user = await this.prisma.user.findFirst({
        where: { role: "admin", adminId: data.adminId },
      });
    }

    if (!user) {
      return { message: "User not found" };
    }

    const isMatch = await bcrypt.compare(data.password, user.password);

    if (!isMatch) {
      return { message: "Invalid password" };
    }

    return { message: "Login success", user };
  }
}