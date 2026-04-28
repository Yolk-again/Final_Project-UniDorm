/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { BookingService } from './booking.service';

@Controller('bookings')
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Get()
  getBookings() {
    return this.bookingService.getBookings();
  }

  @Post()
  createBooking(@Body() data: any) {
    return this.bookingService.createBooking(data);
  }

  @Put(':id')
  updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.bookingService.updateStatus(Number(id), body.status);
  }

  @Delete(':id')
  deleteBooking(@Param('id') id: string) {
    return this.bookingService.deleteBooking(Number(id));
  }
}