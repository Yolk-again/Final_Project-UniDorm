import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitRule = {
  limit: number;
  windowMs: number;
};

const AUTH_RULES: Record<string, RateLimitRule> = {
  "/auth/login": { limit: 120, windowMs: 15 * 60 * 1000 },
  "/auth/register": { limit: 60, windowMs: 60 * 60 * 1000 },
};

const MAX_BUCKETS = 10000;

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private requestCount = 0;

  use(request: Request, response: Response, next: NextFunction) {
    const rule = AUTH_RULES[request.path];
    if (request.method !== "POST" || !rule) {
      next();
      return;
    }

    const now = Date.now();
    this.requestCount += 1;

    if (this.requestCount % 100 === 0 || this.buckets.size >= MAX_BUCKETS) {
      this.removeExpiredBuckets(now);
    }

    const clientIp = request.ip || request.socket.remoteAddress || "unknown";
    const key = `${request.path}:${clientIp}`;
    let bucket = this.buckets.get(key);

    if (!bucket) {
      if (this.buckets.size >= MAX_BUCKETS) {
        response.status(503).json({
          statusCode: 503,
          message: "Authentication protection is temporarily at capacity. Please retry shortly.",
        });
        return;
      }
      bucket = { count: 0, resetAt: now + rule.windowMs };
      this.buckets.set(key, bucket);
    } else if (bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + rule.windowMs };
      this.buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, rule.limit - bucket.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    response.setHeader("RateLimit-Policy", `${rule.limit};w=${Math.ceil(rule.windowMs / 1000)}`);
    response.setHeader("RateLimit-Limit", String(rule.limit));
    response.setHeader("RateLimit-Remaining", String(remaining));
    response.setHeader("RateLimit-Reset", String(retryAfterSeconds));

    if (bucket.count > rule.limit) {
      response.setHeader("Retry-After", String(retryAfterSeconds));
      response.status(429).json({
        statusCode: 429,
        message: "Too many authentication attempts. Please try again later.",
        retryAfterSeconds,
      });
      return;
    }

    next();
  }

  private removeExpiredBuckets(now: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
