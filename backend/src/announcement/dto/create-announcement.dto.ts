import { IsIn, IsString, Length } from "class-validator";

export class CreateAnnouncementDto {
  @IsString()
  @Length(1, 120)
  title!: string;

  @IsString()
  @Length(1, 5000)
  content!: string;

  @IsIn(["ALL", "MALE", "FEMALE"])
  audience!: "ALL" | "MALE" | "FEMALE";
}
