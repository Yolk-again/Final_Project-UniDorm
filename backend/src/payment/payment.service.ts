import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PaymentCycle, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  getBills(studentId: string) {
    return this.prisma.paymentBill.findMany({
      where: { studentId },
      orderBy: { dueDate: "asc" },
    });
  }

  getAllBills() {
    return this.prisma.paymentBill.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  rejectForeignAccount(): never {
    throw new ForbiddenException("You can only view your own bills");
  }

  async createBill(data: any) {
    const studentId = String(data?.studentId ?? "").trim();
    const billingLabel = String(data?.billingLabel ?? "").trim();
    const amount = Number(data?.amount);
    const dueDate = new Date(data?.dueDate);

    if (!studentId) throw new BadRequestException("Student ID is required");
    if (!data?.category || !["ELECTRIC", "WATER", "ROOM"].includes(data.category)) {
      throw new BadRequestException("Payment category is required");
    }
    if (!data?.cycle || !["MONTHLY", "SEMESTER"].includes(data.cycle)) {
      throw new BadRequestException("Payment cycle is required");
    }
    if (!billingLabel) throw new BadRequestException("Billing label is required");
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("Amount must be greater than 0");
    }
    if (!data?.dueDate || Number.isNaN(dueDate.getTime())) {
      throw new BadRequestException("A valid due date is required");
    }

    const student = await this.prisma.user.findFirst({
      where: { studentId, role: "student" },
      select: { studentId: true },
    });
    if (!student) throw new NotFoundException("Student not found");

    return this.prisma.paymentBill.create({
      data: {
        studentId,
        category: data.category,
        cycle: data.cycle as PaymentCycle,
        billingLabel,
        roomNumber: data.roomNumber ? String(data.roomNumber).trim() : null,
        amount,
        status: "PENDING",
        dueDate,
      },
    });
  }

  async payBill(id: number, studentId: string) {
    const bill = await this.prisma.paymentBill.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException("Bill not found");
    if (bill.studentId !== studentId) {
      throw new ForbiddenException("You can only pay your own bills");
    }
    if (bill.status === "PAID") {
      throw new BadRequestException("This bill has already been marked as paid");
    }

    return this.prisma.paymentBill.update({
      where: { id },
      data: { status: "PAID" as PaymentStatus, paidAt: new Date() },
    });
  }
}
