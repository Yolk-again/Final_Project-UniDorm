import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
} from "@nestjs/common";
import { AuthenticatedUser, Roles } from "../auth/auth.guard";
import { BookingService } from "./booking.service";

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
  createBooking(@Req() request: RequestWithUser, @Body() data: any) {
    return this.bookingService.createBooking({
      ...data,
      studentId: request.user.studentId,
    });
  }

  @Put(":id")
  @Roles("admin")
  updateStatus(@Param("id") id: string, @Body() body: any) {
    return this.bookingService.updateStatus(Number(id), body.status);
  }

  @Delete(":id")
  @Roles("student", "admin")
  deleteBooking(@Req() request: RequestWithUser, @Param("id") id: string) {
    return this.bookingService.deleteBooking(Number(id), request.user);
  }
}
