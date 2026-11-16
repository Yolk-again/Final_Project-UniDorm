import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class RegisterDto {
  @IsIn(["student", "admin"])
  role!: "student" | "admin";

  @IsString()
  @Length(1, 100)
  name!: string;

  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsString()
  @Length(8, 72)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(8, 8)
  studentIdPrefix?: string;

  @IsOptional()
  @IsIn(["Male", "Female"])
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  registrationKey?: string;
}
