import { IsIn, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class LoginDto {
  @IsIn(["student", "admin"])
  role!: "student" | "admin";

  @IsString()
  @Length(1, 72)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  studentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  adminId?: string;
}
