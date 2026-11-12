import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BookingStatus, Prisma } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth.guard";
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
  constructor(private readonly prisma: PrismaService) {}

  async getBookings(user: AuthenticatedUser) {
    const bookings = await this.prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
    });

    if (user.role === "admin") return bookings;

    return bookings.map((booking) => {
      if (booking.studentId === user.studentId) return booking;

      return {
        id: booking.id,
        roomNumber: booking.roomNumber,
        status: booking.status,
        createdAt: booking.createdAt,
      };
    });
  }

  async createBooking(data: any) {
    const studentId = String(data?.studentId ?? "").trim();
    const roomNumber = String(data?.roomNumber ?? "").trim().toUpperCase();

    if (!studentId) throw new BadRequestException("Student account is missing");
    if (!roomNumber) throw new BadRequestException("Room number is required");

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const student = await tx.user.findFirst({
            where: { role: "student", studentId },
          });

          if (!student) throw new BadRequestException("Student not found");

          const room = await tx.room.findUnique({ where: { roomNumber } });
          if (!room) throw new NotFoundException("Room not found");

          const studentGender = normalizeGender(student.gender);
          const roomGender = normalizeGender(room.gender);

          if (studentGender && roomGender && studentGender !== roomGender) {
            throw new BadRequestException("This room is not for your gender");
          }

          const existingStudentBooking = await tx.booking.findFirst({
            where: {
              studentId,
              status: { in: [...ACTIVE_BOOKING_STATUSES] },
            },
          });

          if (existingStudentBooking) {
            throw new BadRequestException("You can only have one active room booking at a time");
          }

          const existingRoomBooking = await tx.booking.findFirst({
            where: {
              roomNumber,
              status: { in: [...ACTIVE_BOOKING_STATUSES] },
            },
          });

          if (existingRoomBooking) throw new BadRequestException("Room is already reserved");

          return tx.booking.create({
            data: {
              studentId,
              roomNumber,
              type: room.type,
              furniture: room.furniture,
              price: room.price,
              status: "Pending",
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if ((error as { code?: string })?.code === "P2034") {
        throw new BadRequestException("Another booking was processed at the same time. Please try again");
      }
      throw error;
    }
  }

  async updateStatus(id: number, status: string) {
    if (!["Approved", "Rejected"].includes(status)) {
      throw new BadRequestException("Status must be Approved or Rejected");
    }

    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException("Booking not found");

    if (status === "Approved") {
      const occupied = await this.prisma.booking.findFirst({
        where: {
          roomNumber: booking.roomNumber,
          status: { in: [...ACTIVE_BOOKING_STATUSES] },
          NOT: { id },
        },
      });

      if (occupied) throw new BadRequestException("This room is already occupied");
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: status as BookingStatus },
    });
  }

  async deleteBooking(id: number, user: AuthenticatedUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException("Booking not found");

    if (user.role === "student") {
      if (!user.studentId || booking.studentId !== user.studentId) {
        throw new ForbiddenException("You can only manage your own booking");
      }

      if (booking.status === "Approved") {
        throw new BadRequestException("Contact the dormitory administrator to cancel an approved booking");
      }
    }

    return this.prisma.booking.delete({ where: { id } });
  }
}
