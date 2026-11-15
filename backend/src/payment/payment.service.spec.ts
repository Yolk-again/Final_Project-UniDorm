import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { PaymentService } from "./payment.service";

function createPrismaMock() {
  const transaction = {
    paymentBill: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    paymentSubmission: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const prisma = {
    paymentBill: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    paymentSubmission: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    room: { findUnique: jest.fn() },
    booking: { findFirst: jest.fn() },
    $transaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };

  return { prisma, transaction };
}

describe("PaymentService manual verification", () => {
  let service: PaymentService;
  let prisma: ReturnType<typeof createPrismaMock>["prisma"];
  let transaction: ReturnType<typeof createPrismaMock>["transaction"];
  let notifications: { notifyStudent: jest.Mock; notifyAdmins: jest.Mock };

  beforeEach(() => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;
    transaction = mocks.transaction;
    notifications = { notifyStudent: jest.fn(), notifyAdmins: jest.fn() };
    service = new PaymentService(prisma as any, notifications as any);
  });

  it("does not allow a student to submit proof for another student's bill", async () => {
    prisma.paymentBill.findUnique.mockResolvedValue({ id: 12, studentId: "S001", status: "PENDING" });

    await expect(
      service.submitPayment(12, "S002", { paymentReference: "REF-123" }, {
        filename: "proof.jpg",
        originalname: "proof.jpg",
        mimetype: "image/jpeg",
        size: 1000,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("requires a receipt file before changing a bill to submitted", async () => {
    prisma.paymentBill.findUnique.mockResolvedValue({ id: 12, studentId: "S001", status: "PENDING" });

    await expect(
      service.submitPayment(12, "S001", { paymentReference: "REF-123" }, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("moves a pending bill to submitted and appends a receipt history row", async () => {
    const bill = { id: 12, studentId: "S001", status: "SUBMITTED" };
    prisma.paymentBill.findUnique.mockResolvedValue({ id: 12, studentId: "S001", status: "PENDING" });
    transaction.paymentBill.updateMany.mockResolvedValue({ count: 1 });
    transaction.paymentBill.findUnique.mockResolvedValue(bill);
    transaction.paymentSubmission.create.mockResolvedValue({ id: 90 });

    const result = await service.submitPayment(12, "S001", {
      paymentReference: "REF-12345",
      paymentNote: "Paid at the office",
    }, {
      filename: "safe-random-name.jpg",
      originalname: "receipt.jpg",
      mimetype: "image/jpeg",
      size: 2048,
    });

    expect(transaction.paymentBill.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 12, studentId: "S001", status: { in: ["PENDING", "REJECTED"] } },
      data: expect.objectContaining({ status: "SUBMITTED", paymentReference: "REF-12345" }),
    }));
    expect(transaction.paymentSubmission.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ billId: 12, paymentReference: "REF-12345", status: "SUBMITTED" }),
    }));
    expect(result).toEqual(bill);
    expect(notifications.notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({
      type: "PAYMENT_SUBMITTED",
      entityId: 12,
    }));
  });

  it("prevents students from retrieving historical proof for another student's bill", async () => {
    prisma.paymentBill.findUnique.mockResolvedValue({ id: 12, studentId: "S001" });

    await expect(service.getSubmissionProof(12, 90, {
      id: 2,
      role: "student",
      studentId: "S002",
      adminId: null,
      gender: "Male",
    })).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.paymentSubmission.findFirst).not.toHaveBeenCalled();
  });

  it("requires a rejection reason", async () => {
    await expect(service.verifyPayment(12, 7, "REJECT", " ")).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("only marks a submitted bill paid after an admin verification action", async () => {
    const bill = { id: 12, studentId: "S001", status: "PAID", verifiedById: 7 };
    transaction.paymentBill.findUnique
      .mockResolvedValueOnce({ id: 12, status: "SUBMITTED" })
      .mockResolvedValueOnce(bill);
    transaction.paymentSubmission.findFirst.mockResolvedValue({ id: 90, status: "SUBMITTED" });
    transaction.paymentBill.updateMany.mockResolvedValue({ count: 1 });
    transaction.paymentSubmission.update.mockResolvedValue({ id: 90, status: "APPROVED" });

    const result = await service.verifyPayment(12, 7, "APPROVE");

    expect(transaction.paymentBill.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 12, status: "SUBMITTED" },
      data: expect.objectContaining({ status: "PAID", verifiedById: 7 }),
    }));
    expect(transaction.paymentSubmission.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 90 },
      data: expect.objectContaining({ status: "APPROVED", reviewerId: 7 }),
    }));
    expect(result).toEqual(bill);
    expect(notifications.notifyStudent).toHaveBeenCalledWith("S001", expect.objectContaining({
      type: "PAYMENT_APPROVED",
      entityId: 12,
    }));
  });
});
