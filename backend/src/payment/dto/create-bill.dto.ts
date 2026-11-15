import { IsDateString, IsEnum, IsNumber, IsString, Length, Max, Min } from "class-validator";
import { PaymentCategory, PaymentCycle } from "@prisma/client";

export class CreateBillDto {
  @IsString()
  @Length(1, 32)
  studentId!: string;

  @IsEnum(PaymentCategory)
  category!: PaymentCategory;

  @IsEnum(PaymentCycle)
  cycle!: PaymentCycle;

  @IsString()
  @Length(1, 120)
  billingLabel!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10000000)
  amount!: number;

  @IsDateString()
  dueDate!: string;

  @IsString()
  @Length(1, 12)
  roomNumber!: string;
}
