import { IsOptional, IsString, Length, MaxLength } from "class-validator";

export class SubmitPaymentDto {
  @IsString()
  @Length(3, 120)
  paymentReference!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  paymentNote?: string;
}
