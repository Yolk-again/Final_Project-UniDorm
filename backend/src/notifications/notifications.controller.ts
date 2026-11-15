import { Controller, Get, Param, ParseIntPipe, Patch, Req } from "@nestjs/common";
import { AuthenticatedUser, Roles } from "../auth/auth.guard";
import { NotificationsService } from "./notifications.service";

type RequestWithUser = { user: AuthenticatedUser };

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles("student", "admin")
  list(@Req() request: RequestWithUser) {
    return this.notificationsService.listForUser(request.user);
  }

  @Get("unread-count/:type")
  @Roles("student", "admin")
  unreadCountForType(@Param("type") type: string, @Req() request: RequestWithUser) {
    return this.notificationsService.unreadCountForType(type, request.user);
  }

  @Patch("read-all")
  @Roles("student", "admin")
  markAllRead(@Req() request: RequestWithUser) {
    return this.notificationsService.markAllRead(request.user);
  }

  @Patch("type/:type/read")
  @Roles("student", "admin")
  markTypeRead(@Param("type") type: string, @Req() request: RequestWithUser) {
    return this.notificationsService.markTypeRead(type, request.user);
  }

  @Patch(":id/read")
  @Roles("student", "admin")
  markRead(@Param("id", ParseIntPipe) id: number, @Req() request: RequestWithUser) {
    return this.notificationsService.markRead(id, request.user);
  }
}
