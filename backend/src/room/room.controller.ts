/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { RoomService } from './room.service';

@Controller('rooms')
export class RoomController {
  constructor(private roomService: RoomService) {}

  @Get()
  getRooms() {
    return this.roomService.getRooms();
  }

  @Post()
  createRoom(@Body() data: any) {
    return this.roomService.createRoom(data);
  }

  @Put(':id')
  updateRoom(@Param('id') id: string, @Body() data: any) {
    return this.roomService.updateRoom(Number(id), data);
  }

  @Delete(':id')
  deleteRoom(@Param('id') id: string) {
    return this.roomService.deleteRoom(Number(id));
  }
}