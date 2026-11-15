import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateChatThreadDto {
  @IsIn(["GROUP", "DIRECT"])
  type!: "GROUP" | "DIRECT";

  @IsOptional()
  @IsIn(["Male", "Female"])
  audienceGender?: "Male" | "Female";

  @IsOptional()
  @IsString()
  @MaxLength(16)
  studentId?: string;
}
