import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";

const ADMIN_ID_REGEX = /^(0[1-9]|10)$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
const GMAIL_REGEX = /^[^\s@]+@gmail\.com$/i;

function isValidStudentIdPrefix(prefix: string) {
  return /^[0-9]{8}$/.test(prefix);
}

function isValidStudentId(id: string) {
  return /^[0-9]{10}$/.test(id);
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

    if (typeof data?.password !== "string" || !PASSWORD_REGEX.test(data.password)) {
      throw new BadRequestException(
        "Password must be at least 8 characters and include 1 lowercase letter, 1 uppercase letter, and 1 symbol",
      );
    }
    if (Buffer.byteLength(data.password, "utf8") > 72) {
      throw new BadRequestException("Password must not exceed 72 UTF-8 bytes");
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
      const studentIdPrefix = String(data.studentIdPrefix ?? "").trim();

      if (!isValidStudentIdPrefix(studentIdPrefix)) {
        throw new BadRequestException("Enter exactly 8 digits from the beginning of your PSU student ID");
      }

      if (!data.gender || !["Male", "Female"].includes(data.gender)) {
        throw new BadRequestException("Gender is required");
      }

      try {
        const studentId = await this.prisma.$transaction(async (tx) => {
          const sequences = await tx.$queryRaw<Array<{ sequence: number }>>`
            INSERT INTO "StudentIdSequence" ("prefix", "nextSequence", "createdAt", "updatedAt")
            VALUES (${studentIdPrefix}, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT ("prefix")
            DO UPDATE SET
              "nextSequence" = "StudentIdSequence"."nextSequence" + 1,
              "updatedAt" = CURRENT_TIMESTAMP
            WHERE "StudentIdSequence"."nextSequence" < 100
            RETURNING ("nextSequence" - 1) AS sequence
          `;

          if (sequences.length === 0 || sequences[0].sequence > 99) {
            throw new ConflictException("This 8-digit student group has reached its 99 UniDorm registrations");
          }

          const generatedStudentId = `${studentIdPrefix}${String(sequences[0].sequence).padStart(2, "0")}`;

          await tx.user.create({
            data: {
              role: "student",
              name: data.name.trim(),
              email,
              studentId: generatedStudentId,
              adminId: null,
              gender: data.gender,
              password: hashedPassword,
            },
          });

          return generatedStudentId;
        });

        return {
          message: "Student registered successfully",
          studentId,
          nextPath: "/login?role=student",
        };
      } catch (error) {
        if ((error as { code?: string })?.code === "P2002") {
          throw new ConflictException("This email address or student ID is already registered");
        }
        throw error;
      }
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

    try {
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
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") {
        throw new ConflictException("This email address or administrator ID is already registered. Please retry registration.");
      }
      throw error;
    }

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
    if (typeof data.password !== "string" || Buffer.byteLength(data.password, "utf8") > 72) {
      throw new BadRequestException("Password must not exceed 72 UTF-8 bytes");
    }

    let user;

    if (data.role === "student") {
      const studentId = String(data.studentId ?? "").trim();

      if (!isValidStudentId(studentId)) {
        throw new BadRequestException("Student ID must contain exactly 10 digits");
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
