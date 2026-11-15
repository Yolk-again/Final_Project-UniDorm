import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from "@nestjs/common";
import { Roles } from "../auth/auth.guard";
import { RoomService } from "./room.service";
import { RoomDto } from "./dto/room.dto";

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
  createRoom(@Body() data: RoomDto) {
    return this.roomService.createRoom(data);
  }

  @Put(":id")
  @Roles("admin")
  updateRoom(@Param("id", ParseIntPipe) id: number, @Body() data: RoomDto) {
    return this.roomService.updateRoom(id, data);
  }

  @Delete(":id")
  @Roles("admin")
  deleteRoom(@Param("id", ParseIntPipe) id: number) {
    return this.roomService.deleteRoom(id);
  }
}
