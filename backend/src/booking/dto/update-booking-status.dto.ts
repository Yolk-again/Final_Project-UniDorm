import { IsIn } from "class-validator";

export class UpdateBookingStatusDto {
  @IsIn(["Approved", "Rejected"])
  status!: "Approved" | "Rejected";
}
