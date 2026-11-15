import { IsString, Matches } from "class-validator";

export class CreateBookingDto {
  @IsString()
  @Matches(/^[A-Za-z]\d{2}$/)
  roomNumber!: string;
}
