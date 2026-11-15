import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BookingStatus, NotificationType, Prisma } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

const ACTIVE_BOOKING_STATUSES = ["Pending", "Approved"] as const;

function normalizeGender(value?: string | null) {
  const gender = String(value ?? "").trim().toLowerCase();
  if (gender === "male" || gender === "boy") return "Male";
  if (gender === "female" || gender === "girl") return "Female";
  return "";
}

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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
      const booking = await this.prisma.$transaction(
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
      await this.notifications.notifyAdmins({
        type: NotificationType.BOOKING_REQUESTED,
        title: "New room booking request",
        message: `Student ${studentId} requested room ${roomNumber}.`,
        link: "admin:requests",
        entityId: booking.id,
      });
      return booking;
    } catch (error) {
      if (["P2034", "P2002"].includes((error as { code?: string })?.code ?? "")) {
        throw new BadRequestException("This room or student already has an active booking. Refresh availability and try again");
      }
      throw error;
    }
  }

  async updateStatus(id: number, status: string) {
    if (!["Approved", "Rejected"].includes(status)) {
      throw new BadRequestException("Status must be Approved or Rejected");
    }

    try {
      const updatedBooking = await this.prisma.$transaction(
        async (tx) => {
          const booking = await tx.booking.findUnique({ where: { id } });
          if (!booking) throw new NotFoundException("Booking not found");
          if (booking.status !== "Pending") {
            throw new BadRequestException("Only pending booking requests can be reviewed");
          }

          if (status === "Approved") {
            const occupied = await tx.booking.findFirst({
              where: {
                roomNumber: booking.roomNumber,
                status: { in: [...ACTIVE_BOOKING_STATUSES] },
                NOT: { id },
              },
            });

            if (occupied) {
              throw new BadRequestException("This room already has an active booking");
            }
          }

          return tx.booking.update({
            where: { id },
            data: { status: status as BookingStatus },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      await this.notifications.notifyStudent(updatedBooking.studentId, {
        type: updatedBooking.status === "Approved" ? NotificationType.BOOKING_APPROVED : NotificationType.BOOKING_REJECTED,
        title: updatedBooking.status === "Approved" ? "Your room booking was approved" : "Your room booking was declined",
        message: updatedBooking.status === "Approved"
          ? `Your booking for room ${updatedBooking.roomNumber} has been approved. View your stay for the next steps.`
          : `Your booking request for room ${updatedBooking.roomNumber} was not approved. You can review the booking status and choose another room.`,
        link: "student:booking",
        entityId: updatedBooking.id,
      });
      return updatedBooking;
    } catch (error) {
      if (["P2034", "P2002"].includes((error as { code?: string })?.code ?? "")) {
        throw new BadRequestException("Another active booking was recorded for this student or room. Refresh and review the booking again");
      }
      throw error;
    }
  }

  async deleteBooking(id: number, user: AuthenticatedUser) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const booking = await tx.booking.findUnique({ where: { id } });
          if (!booking) throw new NotFoundException("Booking not found");

          if (user.role === "student" && (!user.studentId || booking.studentId !== user.studentId)) {
            throw new ForbiddenException("You can only manage your own booking");
          }

          if (booking.status === "Approved") {
            throw new BadRequestException("Approved bookings cannot be deleted. Contact the dormitory administrator to arrange a cancellation");
          }

          const result = await tx.booking.deleteMany({
            where: {
              id,
              status: booking.status,
              ...(user.role === "student" ? { studentId: user.studentId ?? "" } : {}),
            },
          });
          if (result.count !== 1) {
            throw new BadRequestException("The booking changed while it was being removed. Refresh and try again");
          }

          return { id, removed: true };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if ((error as { code?: string })?.code === "P2034") {
        throw new BadRequestException("The booking status changed while it was being removed. Refresh and try again");
      }
      throw error;
    }
  }
}
