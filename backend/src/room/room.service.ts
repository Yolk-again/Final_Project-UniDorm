/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const ROOM_NUMBER_REGEX = /^[A-Z]\d{2}$/;
const ACTIVE_BOOKING_STATUSES: Array<"Pending" | "Approved"> = [
  "Pending",
  "Approved",
];

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  getRooms() {
    return this.prisma.room.findMany();
  }

  private validateRoomData(data: any) {
    if (!data?.roomNumber || !ROOM_NUMBER_REGEX.test(data.roomNumber)) {
      throw new BadRequestException(
        'Room number must start with one capital letter followed by 3 digits, like "A101"',
      );
    }

    if (!data?.gender || !["Male", "Female"].includes(data.gender)) {
      throw new BadRequestException("Room gender must be Male or Female");
    }

    if (!data?.type) {
      throw new BadRequestException("Room type is required");
    }

    if (!data?.furniture) {
      throw new BadRequestException("Furniture is required");
    }

    if (data.price === undefined || data.price === null || data.price === "") {
      throw new BadRequestException("Price is required");
    }
  }

  async createRoom(data: any) {
    this.validateRoomData(data);

    return this.prisma.room.create({
      data: {
        roomNumber: String(data.roomNumber).toUpperCase(),
        gender: data.gender,
        type: data.type,
        furniture: data.furniture,
        price: Number(data.price),
      },
    });
  }

  async updateRoom(id: number, data: any) {
    this.validateRoomData(data);

    const existingRoom = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!existingRoom) {
      throw new BadRequestException("Room not found");
    }

    const occupied = await this.prisma.booking.findFirst({
      where: {
        roomNumber: existingRoom.roomNumber,
        status: {
          in: ACTIVE_BOOKING_STATUSES,
        },
      },
    });

    if (occupied) {
      throw new BadRequestException("Room is occupied");
    }

    return this.prisma.room.update({
      where: { id },
      data: {
        roomNumber: String(data.roomNumber).toUpperCase(),
        gender: data.gender,
        type: data.type,
        furniture: data.furniture,
        price: Number(data.price),
      },
    });
  }

  async deleteRoom(id: number) {
    const existingRoom = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!existingRoom) {
      throw new BadRequestException("Room not found");
    }

    const occupied = await this.prisma.booking.findFirst({
      where: {
        roomNumber: existingRoom.roomNumber,
        status: {
          in: ACTIVE_BOOKING_STATUSES,
        },
      },
    });

    if (occupied) {
      throw new BadRequestException("Room is occupied");
    }

    return this.prisma.room.delete({
      where: { id },
    });
  }
}