import {
  Controller,
  Get,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHealth() {
    return {
      status: "ok",
      service: "unidorm-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ready")
  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "ready",
        service: "unidorm-api",
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "not_ready",
        service: "unidorm-api",
        database: "unavailable",
        message: "The API is running but cannot connect to PostgreSQL.",
      });
    }
  }
}
