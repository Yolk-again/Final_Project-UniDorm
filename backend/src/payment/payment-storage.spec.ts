import { ServiceUnavailableException } from "@nestjs/common";
import {
  assertPaymentProofStorageDurable,
  isPaymentProofStorageDurable,
} from "./payment-storage";

describe("payment proof storage safety", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDurableFlag = process.env.PAYMENT_PROOF_STORAGE_DURABLE;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;

    if (originalDurableFlag === undefined) delete process.env.PAYMENT_PROOF_STORAGE_DURABLE;
    else process.env.PAYMENT_PROOF_STORAGE_DURABLE = originalDurableFlag;
  });

  it("allows local development and test storage", () => {
    process.env.NODE_ENV = "test";
    delete process.env.PAYMENT_PROOF_STORAGE_DURABLE;

    expect(isPaymentProofStorageDurable()).toBe(true);
    expect(() => assertPaymentProofStorageDurable()).not.toThrow();
  });

  it("disables receipt uploads in production when durability is not explicitly confirmed", () => {
    process.env.NODE_ENV = "production";
    delete process.env.PAYMENT_PROOF_STORAGE_DURABLE;

    expect(isPaymentProofStorageDurable()).toBe(false);
    expect(() => assertPaymentProofStorageDurable()).toThrow(ServiceUnavailableException);
  });

  it("allows production receipt uploads only after durable storage is explicitly enabled", () => {
    process.env.NODE_ENV = "production";
    process.env.PAYMENT_PROOF_STORAGE_DURABLE = "true";

    expect(isPaymentProofStorageDurable()).toBe(true);
    expect(() => assertPaymentProofStorageDurable()).not.toThrow();
  });
});
