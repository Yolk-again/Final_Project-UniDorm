import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { AuthenticatedUser, Roles } from "../auth/auth.guard";
import { PaymentService } from "./payment.service";

type RequestWithUser = { user: AuthenticatedUser };

@Controller("payments")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @Roles("admin")
  getAllBills() {
    return this.paymentService.getAllBills();
  }

  @Get(":studentId")
  @Roles("student", "admin")
  getBills(@Req() request: RequestWithUser, @Param("studentId") studentId: string) {
    if (request.user.role === "student" && request.user.studentId !== studentId) {
      return this.paymentService.rejectForeignAccount();
    }
    return this.paymentService.getBills(studentId);
  }

  @Post()
  @Roles("admin")
  createBill(@Body() body: any) {
    return this.paymentService.createBill(body);
  }

  @Patch(":id/pay")
  @Roles("student")
  payBill(@Req() request: RequestWithUser, @Param("id") id: string) {
    return this.paymentService.payBill(Number(id), request.user.studentId ?? "");
  }
}
