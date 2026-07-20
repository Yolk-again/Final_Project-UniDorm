/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentCycle, PaymentStatus } from "@prisma/client";

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

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

  createBill(data: any) {
    if (!data?.studentId) {
      throw new BadRequestException("Student ID is required");
    }

    if (!data?.category || !["ELECTRIC", "WATER", "ROOM"].includes(data.category)) {
      throw new BadRequestException("Payment category is required");
    }

    if (!data?.cycle || !["MONTHLY", "SEMESTER"].includes(data.cycle)) {
      throw new BadRequestException("Payment cycle is required");
    }

    if (!data?.billingLabel) {
      throw new BadRequestException("Billing label is required");
    }

    if (!data?.amount || Number(data.amount) <= 0) {
      throw new BadRequestException("Amount must be greater than 0");
    }

    if (!data?.dueDate) {
      throw new BadRequestException("Due date is required");
    }

    return this.prisma.paymentBill.create({
      data: {
        studentId: data.studentId,
        category: data.category,
        cycle: data.cycle,
        billingLabel: data.billingLabel,
        roomNumber: data.roomNumber || null,
        amount: Number(data.amount),
        status: "PENDING",
        dueDate: new Date(data.dueDate),
      },
    });
  }

  payBill(id: number) {
    return this.prisma.paymentBill.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
    });
  }
}
