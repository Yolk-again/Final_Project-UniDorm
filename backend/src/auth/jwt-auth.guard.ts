import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

type JwtPayload = {
  sub: number;
  role: "student" | "admin";
};

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Please log in to continue");
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      throw new UnauthorizedException("Please log in to continue");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      if (
        !Number.isInteger(payload.sub) ||
        !["student", "admin"].includes(payload.role)
      ) {
        throw new Error("Invalid token payload");
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Your session has expired. Please log in again.");
    }
  }
}
