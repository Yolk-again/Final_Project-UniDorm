import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { Public } from "./auth/auth.guard";
import { PrismaService } from "./prisma/prisma.service";
import { isPaymentProofStorageDurable } from "./payment/payment-storage";

@Public()
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("health")
  getHealth() {
    return {
      status: "ok",
      service: "unidorm-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("health/ready")
  async getReadiness() {
    await this.prisma.$queryRaw`SELECT 1`;
    const paymentProofStorageEnabled = isPaymentProofStorageDurable();

    return {
      status: "ready",
      service: "unidorm-api",
      database: "connected",
      paymentProofStorage: paymentProofStorageEnabled ? "durable" : "not-configured",
      paymentSubmissionEnabled: paymentProofStorageEnabled,
      timestamp: new Date().toISOString(),
    };
  }
}
