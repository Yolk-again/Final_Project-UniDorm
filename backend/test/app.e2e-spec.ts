import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";

describe("UniDorm API (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("keeps the health route public", () => {
    return request(app.getHttpServer())
      .get("/")
      .expect(200)
      .expect("Hello World!");
  });

  it("requires authentication for room data", () => {
    return request(app.getHttpServer()).get("/rooms").expect(401);
  });

  it("keeps login available without an existing token", () => {
    return request(app.getHttpServer())
      .post("/auth/login")
      .send({ role: "unknown" })
      .expect(400);
  });
});
