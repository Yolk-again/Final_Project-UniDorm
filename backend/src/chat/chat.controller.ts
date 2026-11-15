import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import { AuthenticatedUser, Roles } from "../auth/auth.guard";
import { ChatService } from "./chat.service";
import { CreateChatThreadDto } from "./dto/create-chat-thread.dto";
import { SendChatMessageDto } from "./dto/send-chat-message.dto";

type RequestWithUser = { user: AuthenticatedUser };

@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("threads")
  @Roles("student", "admin")
  getThreads(@Req() request: RequestWithUser) {
    return this.chatService.getThreads(request.user);
  }

  @Post("threads")
  @Roles("student", "admin")
  createThread(@Req() request: RequestWithUser, @Body() body: CreateChatThreadDto) {
    return this.chatService.createThread(body, request.user);
  }

  @Get("threads/:chatKey/messages")
  @Roles("student", "admin")
  getMessages(@Req() request: RequestWithUser, @Param("chatKey") chatKey: string) {
    return this.chatService.getMessages(chatKey, request.user);
  }

  @Patch("threads/:chatKey/read")
  @Roles("student", "admin")
  markThreadRead(@Req() request: RequestWithUser, @Param("chatKey") chatKey: string) {
    return this.chatService.markThreadRead(chatKey, request.user);
  }

  @Post("threads/:chatKey/messages")
  @Roles("student", "admin")
  sendMessage(
    @Req() request: RequestWithUser,
    @Param("chatKey") chatKey: string,
    @Body() body: SendChatMessageDto,
  ) {
    return this.chatService.sendMessage({ ...body, chatKey }, request.user);
  }

  @Delete("threads/:chatKey")
  @Roles("admin")
  deleteThread(@Param("chatKey") chatKey: string) {
    return this.chatService.deleteThread(chatKey);
  }
}
