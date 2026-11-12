import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const ROOM_NUMBER_REGEX = /^[A-Z]\d{2}$/;
const ACTIVE_BOOKING_STATUSES = ["Pending", "Approved"] as const;

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      roomNumber,
      gender: data.gender,
      type: String(data.type).trim(),
      furniture: String(data.furniture).trim(),
      price,
    };
  }

  async createRoom(data: any) {
    return this.prisma.room.create({ data: this.validateRoomData(data) });
  }

  async updateRoom(id: number, data: any) {
    const update = this.validateRoomData(data);
    const existingRoom = await this.prisma.room.findUnique({ where: { id } });

    if (!existingRoom) throw new NotFoundException("Room not found");

    const occupied = await this.prisma.booking.findFirst({
      where: {
        roomNumber: existingRoom.roomNumber,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
    });

    if (occupied) throw new BadRequestException("Room has an active booking");

    return this.prisma.room.update({ where: { id }, data: update });
  }

  async deleteRoom(id: number) {
    const existingRoom = await this.prisma.room.findUnique({ where: { id } });

    if (!existingRoom) throw new NotFoundException("Room not found");

    const occupied = await this.prisma.booking.findFirst({
      where: {
        roomNumber: existingRoom.roomNumber,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
    });

    if (occupied) throw new BadRequestException("Room has an active booking");

    return this.prisma.room.delete({ where: { id } });
  }
}
