import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";

export type UserRole = "student" | "admin";

export interface AuthenticatedUser {
  id: number;
  role: UserRole;
  studentId: string | null;
  adminId: string | null;
  gender: string | null;
}

type RequestWithUser = {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
};

const PUBLIC_ROUTE_KEY = "unidorm:isPublic";
const ROLES_KEY = "unidorm:roles";

export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const [scheme, token] = String(request.headers.authorization ?? "").split(" ");

    if (scheme?.toLowerCase() !== "bearer" || !token) {
      throw new UnauthorizedException("Please log in to continue");
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      const id = Number(payload.sub);

      if (!Number.isInteger(id) || id < 1 || !["student", "admin"].includes(payload.role)) {
        throw new Error("Invalid token payload");
      }

      request.user = {
        id,
        role: payload.role,
        studentId: payload.studentId ?? null,
        adminId: payload.adminId ?? null,
        gender: payload.gender ?? null,
      };

      return true;
    } catch {
      throw new UnauthorizedException("Your session has expired. Please log in again");
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user || !requiredRoles.includes(request.user.role)) {
      throw new ForbiddenException("You do not have permission to perform this action");
    }

    return true;
  }
}
