import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = new Set(
    [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      ...(process.env.FRONTEND_URL || "").split(","),
      ...(process.env.FRONTEND_URLS || "").split(","),
    ]
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ""))) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by UniDorm CORS"), false);
    },
    methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.listen(process.env.PORT ?? 3001, "0.0.0.0");
}

bootstrap();
