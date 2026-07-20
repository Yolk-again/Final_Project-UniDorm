/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Param, Delete, Patch } from "@nestjs/common";
import { ChatService } from "./chat.service";

@Controller("chat")
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get("/threads")
  getThreads() {
    return this.chatService.getThreads();
  }

  @Post("/threads")
  createThread(@Body() body: any) {
    return this.chatService.createThread(body);
  }

  @Get("/threads/:chatKey/messages")
  getMessages(@Param("chatKey") chatKey: string) {
    return this.chatService.getMessages(chatKey);
  }

  @Post("/threads/:chatKey/messages")
  sendMessage(@Param("chatKey") chatKey: string, @Body() body: any) {
    return this.chatService.sendMessage({ ...body, chatKey });
  }

  @Patch("/threads/:chatKey/respond")
  respondToRequest(@Param("chatKey") chatKey: string, @Body() body: any) {
    return this.chatService.respondToRequest(chatKey, body.action);
  }

  @Delete("/threads/:chatKey")
  deleteThread(@Param("chatKey") chatKey: string) {
    return this.chatService.deleteThread(chatKey);
  }
}
