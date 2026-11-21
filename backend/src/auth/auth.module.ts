import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;

        if (process.env.NODE_ENV === "production" && !secret) {
          throw new Error("JWT_SECRET must be configured in production");
        }

        return {
          secret: secret || "unidorm-local-development-secret-change-before-deploying",
          signOptions: { expiresIn: "8h" },
        };
      },
    }),
  ],
  providers: [AuthService, JwtAuthGuard, PrismaService],
  controllers: [AuthController],
})
export class AuthModule {}
