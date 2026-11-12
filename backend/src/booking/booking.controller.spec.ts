import { Test, TestingModule } from "@nestjs/testing";
import { BookingService } from "./booking.service";
import { BookingController } from "./booking.controller";

describe("BookingController", () => {
  let controller: BookingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [{ provide: BookingService, useValue: {} }],
    }).compile();

    controller = module.get<BookingController>(BookingController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
