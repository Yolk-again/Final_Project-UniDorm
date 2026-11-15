import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NotificationType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

const ROOM_NUMBER_REGEX = /^[A-Z]\d{2}$/;
const ACTIVE_BOOKING_STATUSES = ["Pending", "Approved"] as const;

@Injectable()
export class RoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  getRooms() {
    return this.prisma.room.findMany({ orderBy: { roomNumber: "asc" } });
  }

  private validateRoomData(data: any) {
    const roomNumber = String(data?.roomNumber ?? "").trim().toUpperCase();
    if (!ROOM_NUMBER_REGEX.test(roomNumber)) {
      throw new BadRequestException('Room number must be one capital letter followed by 2 digits, like "A01"');
    }

    if (!data?.gender || !["Male", "Female"].includes(data.gender)) {
      throw new BadRequestException("Room gender must be Male or Female");
    }

    if (!String(data?.type ?? "").trim()) {
      throw new BadRequestException("Room type is required");
    }

    if (!String(data?.furniture ?? "").trim()) {
      throw new BadRequestException("Furniture is required");
    }

    const price = Number(data?.price);
    if (!Number.isFinite(price) || price <= 0 || price > 1000000) {
      throw new BadRequestException("Room price must be a positive amount");
    }

    if (Math.abs(price * 100 - Math.round(price * 100)) > 0.000001) {
      throw new BadRequestException("Room price can contain no more than 2 decimal places");
    }

    return {
      roomNumber,
      gender: data.gender,
      type: String(data.type).trim(),
      furniture: String(data.furniture).trim(),
      price: price.toFixed(2),
    };
  }

  async createRoom(data: any) {
    try {
      const room = await this.prisma.room.create({ data: this.validateRoomData(data) });
      await this.notifications.notifyStudentsByGender(room.gender?.toUpperCase() === "FEMALE" ? "FEMALE" : "MALE", {
        type: NotificationType.ROOM_AVAILABLE,
        title: "A new room is available",
        message: `Room ${room.roomNumber} has been added to the available rooms.`,
        link: "student:rooms",
        entityId: room.id,
      });
      return room;
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") {
        throw new ConflictException("That room number is already in use");
      }
      throw error;
    }
  }

  async updateRoom(id: number, data: any) {
    const update = this.validateRoomData(data);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const existingRoom = await tx.room.findUnique({ where: { id } });
          if (!existingRoom) throw new NotFoundException("Room not found");

          if (update.roomNumber !== existingRoom.roomNumber) {
            const [bookingHistory, billHistory] = await Promise.all([
              tx.booking.findFirst({
                where: { roomNumber: existingRoom.roomNumber },
                select: { id: true },
              }),
              tx.paymentBill.findFirst({
                where: { roomNumber: existingRoom.roomNumber },
                select: { id: true },
              }),
            ]);

            if (bookingHistory || billHistory) {
              throw new BadRequestException("Room numbers cannot be changed after booking or billing records exist. Create a new room instead to preserve financial and booking history.");
            }
          }

          const occupied = await tx.booking.findFirst({
            where: {
              roomNumber: existingRoom.roomNumber,
              status: { in: [...ACTIVE_BOOKING_STATUSES] },
            },
            select: { id: true },
          });

          if (occupied) throw new BadRequestException("Room has an active booking");

          return tx.room.update({ where: { id }, data: update });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") {
        throw new ConflictException("That room number is already in use");
      }
      if ((error as { code?: string })?.code === "P2034") {
        throw new BadRequestException("Room availability changed while this update was being saved. Refresh and try again");
      }
      throw error;
    }
  }

  async deleteRoom(id: number) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const existingRoom = await tx.room.findUnique({ where: { id } });
          if (!existingRoom) throw new NotFoundException("Room not found");

          const [bookingHistory, billHistory] = await Promise.all([
            tx.booking.findFirst({
              where: { roomNumber: existingRoom.roomNumber },
              select: { id: true },
            }),
            tx.paymentBill.findFirst({
              where: { roomNumber: existingRoom.roomNumber },
              select: { id: true },
            }),
          ]);

          if (bookingHistory || billHistory) {
            throw new BadRequestException("Rooms with booking or billing history cannot be deleted. Mark the room unavailable instead to preserve records.");
          }

          return tx.room.delete({ where: { id } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if ((error as { code?: string })?.code === "P2034") {
        throw new BadRequestException("Room history changed while this deletion was being processed. Refresh and try again");
      }
      throw error;
    }
  }
}
