import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { accessSync, constants, mkdirSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

function isLocalFrontendOrigin(origin: string) {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    return ["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV === "production") {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must be configured with at least 32 characters in production");
    }
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be configured in production");
    }
    if (!process.env.FRONTEND_URL) {
      throw new Error("FRONTEND_URL must be configured in production");
    }
    if (!process.env.ADMIN_REGISTRATION_KEY || process.env.ADMIN_REGISTRATION_KEY.length < 32) {
      throw new Error("ADMIN_REGISTRATION_KEY must contain at least 32 characters in production");
    }
    const productionOrigins = process.env.FRONTEND_URL.split(",").map((origin) => origin.trim()).filter(Boolean);
    for (const origin of productionOrigins) {
      let parsed: URL;
      try {
        parsed = new URL(origin);
      } catch {
        throw new Error(`Invalid FRONTEND_URL origin: ${origin}`);
      }
      if (parsed.protocol !== "https:") {
        throw new Error("Every FRONTEND_URL origin must use HTTPS in production");
      }
    }
    if (!process.env.PAYMENT_PROOF_DIR || !isAbsolute(process.env.PAYMENT_PROOF_DIR)) {
      throw new Error("PAYMENT_PROOF_DIR must be an absolute persistent directory in production");
    }
    const proofDirectory = resolve(process.env.PAYMENT_PROOF_DIR);
    if (proofDirectory.split(/[\\/]/).some((segment) => segment.toLowerCase() === "public")) {
      throw new Error("PAYMENT_PROOF_DIR must be outside any public web directory");
    }
    mkdirSync(proofDirectory, { recursive: true, mode: 0o700 });
    accessSync(proofDirectory, constants.R_OK | constants.W_OK);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.use((_request: any, response: any, next: () => void) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    response.setHeader("Cross-Origin-Resource-Policy", "same-site");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
      response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  const allowedOrigins = new Set(
    (process.env.FRONTEND_URL || "http://localhost:3000,http://127.0.0.1:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.has(origin) ||
        (process.env.NODE_ENV !== "production" && isLocalFrontendOrigin(origin))
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by UniDorm CORS`), false);
    },
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });
  app.enableShutdownHooks();

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, "0.0.0.0");
  console.log(`UniDorm API listening on http://127.0.0.1:${port}`);
}

void bootstrap();
