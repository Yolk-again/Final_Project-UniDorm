import { ServiceUnavailableException } from "@nestjs/common";

export function isPaymentProofStorageDurable(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.PAYMENT_PROOF_STORAGE_DURABLE === "true";
}

export function assertPaymentProofStorageDurable(): void {
  if (!isPaymentProofStorageDurable()) {
    throw new ServiceUnavailableException(
      "Payment receipt uploads are disabled on this demo because durable private file storage is not configured. Do not submit payment evidence until the dormitory operator enables persistent storage.",
    );
  }
}
