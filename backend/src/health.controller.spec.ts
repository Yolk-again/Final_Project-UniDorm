import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma/prisma.service";

describe("HealthController", () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]) };
    controller = new HealthController(prisma as unknown as PrismaService);
  });

  it("returns a live API status without requiring the database", () => {
    const result = controller.getHealth();

    expect(result.status).toBe("ok");
    expect(result.service).toBe("unidorm-api");
    expect(result.timestamp).toBeTruthy();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("reports database readiness when PostgreSQL responds", async () => {
    const result = await controller.getReadiness();

    expect(result.status).toBe("ready");
    expect(result.database).toBe("connected");
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("returns a service-unavailable error when PostgreSQL is unavailable", async () => {
    prisma.$queryRaw.mockRejectedValue(new Error("Database unavailable"));

    await expect(controller.getReadiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
