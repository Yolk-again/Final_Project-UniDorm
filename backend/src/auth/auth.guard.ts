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
import { PrismaService } from "../prisma/prisma.service";

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
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const [scheme, token, extra] = String(request.headers.authorization ?? "").split(" ");

    if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
      throw new UnauthorizedException("Please log in to continue");
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      const id = Number(payload.sub);

      if (!Number.isInteger(id) || id < 1 || !["student", "admin"].includes(payload.role)) {
        throw new Error("Invalid token payload");
      }

      const account = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
          studentId: true,
          adminId: true,
          gender: true,
        },
      });

      if (!account || account.role !== payload.role) {
        throw new Error("Account is no longer valid");
      }

      if (
        (account.role === "student" && account.studentId !== (payload.studentId ?? null)) ||
        (account.role === "admin" && account.adminId !== (payload.adminId ?? null))
      ) {
        throw new Error("Account identity has changed");
      }

      request.user = {
        id: account.id,
        role: account.role,
        studentId: account.studentId,
        adminId: account.adminId,
        gender: account.gender,
      };

      return true;
    } catch {
      throw new UnauthorizedException("Your session is invalid or has expired. Please log in again");
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
