/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param } from "@nestjs/common";
import { PaymentService } from "./payment.service";

@Controller("payments")
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Get()
  getAllBills() {
    return this.paymentService.getAllBills();
  }

  @Get(":studentId")
  getBills(@Param("studentId") studentId: string) {
    return this.paymentService.getBills(studentId);
  }

  @Post()
  createBill(@Body() body: any) {
    return this.paymentService.createBill(body);
  }

  @Patch(":id/pay")
  payBill(@Param("id") id: string) {
    return this.paymentService.payBill(Number(id));
  }
}
