/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const ACTIVE_BOOKING_STATUSES = ["Pending", "Approved"] as const;

function normalizeGender(value?: string | null) {
  const gender = String(value ?? "").trim().toLowerCase();

  if (gender === "male" || gender === "boy") return "Male";
  if (gender === "female" || gender === "girl") return "Female";

  return "";
}

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  getBookings() {
    return this.prisma.booking.findMany();
  }

  async createBooking(data: any) {
    if (!data?.studentId) {
      throw new BadRequestException("Student ID is required");
    }

    if (!data?.roomNumber) {
      throw new BadRequestException("Room number is required");
    }

    const student = await this.prisma.user.findFirst({
      where: {
        role: "student",
        studentId: data.studentId,
      },
    });

    if (!student) {
      throw new BadRequestException("Student not found");
    }

    const room = await this.prisma.room.findFirst({
      where: {
        roomNumber: data.roomNumber,
      },
    });

    if (!room) {
      throw new BadRequestException("Room not found");
    }

    const studentGender = normalizeGender(student.gender);
    const roomGender = normalizeGender(room.gender);

    if (studentGender && roomGender && studentGender !== roomGender) {
      throw new BadRequestException("This room is not for your gender");
    }

    const existingStudentBooking = await this.prisma.booking.findFirst({
      where: {
        studentId: data.studentId,
        status: {
          in: [...ACTIVE_BOOKING_STATUSES],
        },
      },
    });

    if (existingStudentBooking) {
      throw new BadRequestException("You can only book one room at a time");
    }

    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        roomNumber: data.roomNumber,
        status: {
          in: [...ACTIVE_BOOKING_STATUSES],
        },
      },
    });

    if (existingBooking) {
      throw new BadRequestException("Room already booked");
    }

    return this.prisma.booking.create({
      data: {
        studentId: data.studentId,
        roomNumber: data.roomNumber,
        type: data.type,
        furniture: data.furniture,
        price: data.price,
        status: "Pending",
      },
    });
  }

  updateStatus(id: number, status: string) {
    return this.prisma.booking.update({
      where: { id },
      data: { status },
    });
  }

  deleteBooking(id: number) {
    return this.prisma.booking.delete({
      where: { id },
    });
  }
}