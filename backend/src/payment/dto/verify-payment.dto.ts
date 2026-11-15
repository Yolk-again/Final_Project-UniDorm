import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class VerifyPaymentDto {
  @IsIn(["APPROVE", "REJECT"])
  decision!: "APPROVE" | "REJECT";

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
