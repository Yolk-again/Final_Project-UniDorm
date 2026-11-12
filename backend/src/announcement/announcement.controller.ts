import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { AuthenticatedUser, Roles } from "../auth/auth.guard";
import { AnnouncementService } from "./announcement.service";

type RequestWithUser = { user: AuthenticatedUser };

@Controller("announcements")
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get()
  @Roles("student", "admin")
  getAnnouncements(@Req() request: RequestWithUser) {
    return this.announcementService.getAnnouncements(request.user);
  }

  @Post()
  @Roles("admin")
  createAnnouncement(@Req() request: RequestWithUser, @Body() body: any) {
    return this.announcementService.createAnnouncement({
      ...body,
      createdBy: request.user.adminId ?? "admin",
    });
  }
}
