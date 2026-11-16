import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

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
  @Length(10, 10)
  @Matches(/^[0-9]{10}$/)
  studentId?: string;

  @IsOptional()
  @IsIn(["Male", "Female"])
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  registrationKey?: string;
}
