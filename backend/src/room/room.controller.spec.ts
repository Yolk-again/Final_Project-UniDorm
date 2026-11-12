import { Test, TestingModule } from "@nestjs/testing";
import { RoomService } from "./room.service";
import { RoomController } from "./room.controller";

describe("RoomController", () => {
  let controller: RoomController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomController],
      providers: [{ provide: RoomService, useValue: {} }],
    }).compile();

    controller = module.get<RoomController>(RoomController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
