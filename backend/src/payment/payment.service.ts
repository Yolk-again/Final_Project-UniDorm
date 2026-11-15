import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NotificationType, PaymentCategory, PaymentCycle, PaymentStatus, PaymentSubmissionStatus } from "@prisma/client";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { AuthenticatedUser } from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

function getPaymentProofDirectory() {
  return resolve(process.env.PAYMENT_PROOF_DIR || join(process.cwd(), "uploads", "payment-proofs"));
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  getBills(studentId: string) {
    return this.prisma.paymentBill.findMany({
      where: { studentId },
      orderBy: { dueDate: "asc" },
      include: {
        submissions: {
          orderBy: { submittedAt: "desc" },
          take: 10,
          include: { reviewer: { select: { name: true } } },
        },
      },
    });
  }

  getAllBills() {
    return this.prisma.paymentBill.findMany({
      orderBy: [{ status: "asc" }, { submittedAt: "desc" }, { createdAt: "desc" }],
      include: {
        submissions: {
          orderBy: { submittedAt: "desc" },
          take: 10,
          include: { reviewer: { select: { name: true } } },
        },
      },
    });
  }

  rejectForeignAccount(): never {
    throw new ForbiddenException("You can only view your own bills");
  }

  async createBill(data: any) {
    const studentId = String(data?.studentId ?? "").trim();
    const billingLabel = String(data?.billingLabel ?? "").trim();
    const roomNumber = String(data?.roomNumber ?? "").trim().toUpperCase();
    const category = String(data?.category ?? "").trim().toUpperCase();
    const cycle = String(data?.cycle ?? "").trim().toUpperCase();
    const amount = Number(data?.amount);
    const dueDate = new Date(data?.dueDate);

    if (!studentId) throw new BadRequestException("Student ID is required");
    if (!Object.values(PaymentCategory).includes(category as PaymentCategory)) {
      throw new BadRequestException("Select a valid payment category");
    }
    if (!Object.values(PaymentCycle).includes(cycle as PaymentCycle)) {
      throw new BadRequestException("Select a valid payment cycle");
    }
    if (!billingLabel) throw new BadRequestException("Billing label is required");
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      throw new BadRequestException("Amount must be greater than 0 and no more than 10,000,000");
    }
    if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) {
      throw new BadRequestException("Amount can contain no more than 2 decimal places");
    }
    if (!data?.dueDate || Number.isNaN(dueDate.getTime())) {
      throw new BadRequestException("A valid due date is required");
    }
    if (!roomNumber) throw new BadRequestException("Room number is required");

    const student = await this.prisma.user.findFirst({
      where: { studentId, role: "student" },
      select: { studentId: true },
    });
    if (!student) throw new NotFoundException("Student ID was not found");

    const room = await this.prisma.room.findUnique({
      where: { roomNumber },
      select: { roomNumber: true },
    });
    if (!room) throw new NotFoundException(`Room ${roomNumber} does not exist`);

    const approvedBooking = await this.prisma.booking.findFirst({
      where: { studentId, roomNumber, status: "Approved" },
      select: { id: true },
    });
    if (!approvedBooking) {
      throw new BadRequestException(
        `Student ${studentId} does not have an approved booking for room ${roomNumber}`,
      );
    }

    const bill = await this.prisma.paymentBill.create({
      data: {
        studentId,
        category: category as PaymentCategory,
        cycle: cycle as PaymentCycle,
        billingLabel,
        roomNumber: room.roomNumber,
        amount: amount.toFixed(2),
        status: PaymentStatus.PENDING,
        dueDate,
      },
    });
    await this.notifications.notifyStudent(studentId, {
      type: NotificationType.BILL_CREATED,
      title: "A new bill is available",
      message: `${billingLabel} · ${amount.toFixed(2)} THB · due ${dueDate.toLocaleDateString()}.`,
      link: "student:payments",
      entityId: bill.id,
    });
    return bill;
  }

  async submitPayment(
    id: number,
    studentId: string,
    data: { paymentReference?: string; paymentNote?: string },
    file: { filename: string; originalname: string; mimetype: string; size: number } | undefined,
  ) {
    const bill = await this.prisma.paymentBill.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException("Bill not found");
    if (bill.studentId !== studentId) {
      throw new ForbiddenException("You can only submit payment proof for your own bills");
    }
    const resubmittableStatuses: PaymentStatus[] = [
      PaymentStatus.PENDING,
      PaymentStatus.REJECTED,
    ];
    if (!resubmittableStatuses.includes(bill.status)) {
      throw new BadRequestException("This bill cannot accept another payment submission in its current status");
    }

    const paymentReference = String(data?.paymentReference ?? "").trim();
    const paymentNote = String(data?.paymentNote ?? "").trim();
    if (paymentReference.length < 3 || paymentReference.length > 120) {
      throw new BadRequestException("Enter a payment reference between 3 and 120 characters");
    }
    if (paymentNote.length > 500) {
      throw new BadRequestException("Payment note must not exceed 500 characters");
    }
    if (!file?.filename) throw new BadRequestException("Upload a payment slip or receipt before submitting");
    if (!Number.isInteger(file.size) || file.size < 1 || file.size > 5 * 1024 * 1024) {
      throw new BadRequestException("Payment proof must be a non-empty file no larger than 5 MB");
    }
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype)) {
      throw new BadRequestException("Payment proof must be a JPG, PNG, or PDF file");
    }

    const submittedBill = await this.prisma.$transaction(async (tx) => {
      const updatedCount = await tx.paymentBill.updateMany({
        where: { id, studentId, status: { in: [PaymentStatus.PENDING, PaymentStatus.REJECTED] } },
        data: {
          status: PaymentStatus.SUBMITTED,
          paymentReference,
          paymentNote: paymentNote || null,
          proofOriginalName: String(file.originalname).slice(0, 180),
          proofStorageName: file.filename,
          proofMimeType: file.mimetype,
          proofSize: file.size,
          submittedAt: new Date(),
          rejectionReason: null,
          verifiedAt: null,
          verifiedById: null,
          paidAt: null,
        },
      });
      if (updatedCount.count !== 1) {
        throw new BadRequestException("This bill has changed. Refresh the bill and try again");
      }

      await tx.paymentSubmission.create({
        data: {
          billId: id,
          paymentReference,
          paymentNote: paymentNote || null,
          proofOriginalName: String(file.originalname).slice(0, 180),
          proofStorageName: file.filename,
          proofMimeType: file.mimetype,
          proofSize: file.size,
          status: PaymentSubmissionStatus.SUBMITTED,
        },
      });

      return tx.paymentBill.findUnique({ where: { id } });
    });
    await this.notifications.notifyAdmins({
      type: NotificationType.PAYMENT_SUBMITTED,
      title: "Payment proof needs verification",
      message: `Student ${studentId} submitted payment proof for bill #${id}.`,
      link: "admin:payments",
      entityId: id,
    });
    return submittedBill;
  }

  async verifyPayment(
    id: number,
    adminUserId: number,
    decision: "APPROVE" | "REJECT",
    rejectionReason?: string,
  ) {
    const reason = String(rejectionReason ?? "").trim();
    if (decision === "REJECT" && !reason) {
      throw new BadRequestException("A reason is required when rejecting payment proof");
    }

    const verifiedBill = await this.prisma.$transaction(async (tx) => {
      const bill = await tx.paymentBill.findUnique({ where: { id } });
      if (!bill) throw new NotFoundException("Bill not found");
      if (bill.status !== PaymentStatus.SUBMITTED) {
        throw new BadRequestException("Only submitted payments can be verified");
      }

      const submission = await tx.paymentSubmission.findFirst({
        where: { billId: id, status: PaymentSubmissionStatus.SUBMITTED },
        orderBy: { submittedAt: "desc" },
      });
      if (!submission) {
        throw new BadRequestException("The current payment receipt history is missing. Contact support before changing this bill");
      }

      const now = new Date();
      const result = await tx.paymentBill.updateMany({
        where: { id, status: PaymentStatus.SUBMITTED },
        data: decision === "APPROVE"
          ? {
              status: PaymentStatus.PAID,
              paidAt: now,
              verifiedAt: now,
              verifiedById: adminUserId,
              rejectionReason: null,
            }
          : {
              status: PaymentStatus.REJECTED,
              paidAt: null,
              verifiedAt: now,
              verifiedById: adminUserId,
              rejectionReason: reason,
            },
      });

      if (result.count !== 1) {
        throw new BadRequestException("This payment was already reviewed. Refresh the ledger");
      }

      await tx.paymentSubmission.update({
        where: { id: submission.id },
        data: {
          status: decision === "APPROVE" ? PaymentSubmissionStatus.APPROVED : PaymentSubmissionStatus.REJECTED,
          reviewedAt: now,
          reviewerId: adminUserId,
          rejectionReason: decision === "REJECT" ? reason : null,
        },
      });

      return tx.paymentBill.findUnique({ where: { id } });
    });
    const studentId = verifiedBill?.studentId;
    if (studentId) {
      await this.notifications.notifyStudent(studentId, {
        type: decision === "APPROVE" ? NotificationType.PAYMENT_APPROVED : NotificationType.PAYMENT_REJECTED,
        title: decision === "APPROVE" ? "Your payment was verified" : "Your payment needs attention",
        message: decision === "APPROVE"
          ? `Your payment for bill #${id} has been verified and marked as paid.`
          : `Your payment for bill #${id} was rejected. Reason: ${reason}`,
        link: "student:payments",
        entityId: id,
      });
    }
    return verifiedBill;
  }

  async getPaymentProof(id: number, user: AuthenticatedUser) {
    const bill = await this.prisma.paymentBill.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException("Bill not found");
    if (user.role === "student" && bill.studentId !== user.studentId) {
      throw new ForbiddenException("You can only view your own payment proof");
    }
    if (!bill.proofStorageName) throw new NotFoundException("No payment proof has been uploaded");

    return this.resolveProofFile(
      bill.proofStorageName,
      bill.proofMimeType || "application/octet-stream",
      bill.proofOriginalName || "payment-proof",
    );
  }

  async getSubmissionProof(id: number, submissionId: number, user: AuthenticatedUser) {
    const bill = await this.prisma.paymentBill.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException("Bill not found");
    if (user.role === "student" && bill.studentId !== user.studentId) {
      throw new ForbiddenException("You can only view your own payment proof");
    }

    const submission = await this.prisma.paymentSubmission.findFirst({
      where: { id: submissionId, billId: id },
      select: { proofStorageName: true, proofMimeType: true, proofOriginalName: true },
    });
    if (!submission) throw new NotFoundException("Payment submission was not found");
    return this.resolveProofFile(submission.proofStorageName, submission.proofMimeType, submission.proofOriginalName);
  }

  private resolveProofFile(storageName: string, mimeType: string, originalName: string) {
    if (!/^[0-9a-f-]{36}\.(jpg|png|pdf)$/i.test(storageName)) {
      throw new ForbiddenException("Invalid payment proof reference");
    }
    const filePath = join(getPaymentProofDirectory(), storageName);
    if (!existsSync(filePath)) {
      throw new NotFoundException("Payment proof file is unavailable on this server");
    }
    return { filePath, mimeType: mimeType || "application/octet-stream", originalName: originalName || "payment-proof" };
  }

}
