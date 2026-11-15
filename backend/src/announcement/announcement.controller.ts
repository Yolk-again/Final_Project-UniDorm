import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import { AuthenticatedUser, Roles } from "../auth/auth.guard";
import { AnnouncementService } from "./announcement.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";

type RequestWithUser = { user: AuthenticatedUser };

@Controller("announcements")
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get()
  @Roles("student", "admin")
  getAnnouncements(@Req() request: RequestWithUser) {
    return this.announcementService.getAnnouncements(request.user);
  }

  @Patch(":id/read")
  @Roles("student")
  markAnnouncementRead(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: RequestWithUser,
  ) {
    return this.announcementService.markAnnouncementRead(id, request.user);
  }

  @Post()
  @Roles("admin")
  createAnnouncement(@Req() request: RequestWithUser, @Body() body: CreateAnnouncementDto) {
    return this.announcementService.createAnnouncement({
      ...body,
      createdBy: request.user.adminId ?? "admin",
    });
  }
}
