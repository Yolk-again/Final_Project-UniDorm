/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body } from "@nestjs/common";
import { AnnouncementService } from "./announcement.service";

@Controller("announcements")
export class AnnouncementController {
  constructor(private announcementService: AnnouncementService) {}

  @Get()
  getAnnouncements() {
    return this.announcementService.getAnnouncements();
  }

  @Post()
  createAnnouncement(@Body() body: any) {
    return this.announcementService.createAnnouncement(body);
  }
}
