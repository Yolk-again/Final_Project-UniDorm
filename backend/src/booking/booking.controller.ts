import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
} from "@nestjs/common";
import { AuthenticatedUser, Roles } from "../auth/auth.guard";
import { BookingService } from "./booking.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { UpdateBookingStatusDto } from "./dto/update-booking-status.dto";

type RequestWithUser = { user: AuthenticatedUser };

@Controller("bookings")
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @Roles("student", "admin")
  getBookings(@Req() request: RequestWithUser) {
    return this.bookingService.getBookings(request.user);
  }

  @Post()
  @Roles("student")
  createBooking(@Req() request: RequestWithUser, @Body() data: CreateBookingDto) {
    return this.bookingService.createBooking({
      ...data,
      studentId: request.user.studentId,
    });
  }

  @Put(":id")
  @Roles("admin")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateBookingStatusDto) {
    return this.bookingService.updateStatus(id, body.status);
  }

  @Delete(":id")
  @Roles("student", "admin")
  deleteBooking(@Req() request: RequestWithUser, @Param("id", ParseIntPipe) id: number) {
    return this.bookingService.deleteBooking(id, request.user);
  }
}
