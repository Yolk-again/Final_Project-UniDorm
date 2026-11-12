import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { Roles } from "../auth/auth.guard";
import { RoomService } from "./room.service";

@Controller("rooms")
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  @Roles("student", "admin")
  getRooms() {
    return this.roomService.getRooms();
  }

  @Post()
  @Roles("admin")
  createRoom(@Body() data: any) {
    return this.roomService.createRoom(data);
  }

  @Put(":id")
  @Roles("admin")
  updateRoom(@Param("id") id: string, @Body() data: any) {
    return this.roomService.updateRoom(Number(id), data);
  }

  @Delete(":id")
  @Roles("admin")
  deleteRoom(@Param("id") id: string) {
    return this.roomService.deleteRoom(Number(id));
  }
}
