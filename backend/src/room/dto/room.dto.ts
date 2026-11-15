import { Type } from "class-transformer";
import { IsIn, IsNumber, IsString, Length, Matches, Max, Min } from "class-validator";

export class RoomDto {
  @IsString()
  @Matches(/^[A-Za-z]\d{2}$/)
  roomNumber!: string;

  @IsIn(["Male", "Female"])
  gender!: "Male" | "Female";

  @IsString()
  @Length(1, 80)
  type!: string;

  @IsString()
  @Length(1, 240)
  furniture!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  price!: number;
}
