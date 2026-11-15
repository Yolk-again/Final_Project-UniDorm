import { IsString, Length } from "class-validator";

export class SendChatMessageDto {
  @IsString()
  @Length(1, 2000)
  content!: string;
}
