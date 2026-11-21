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

  it("serves the root API response", () => {
    return request(app.getHttpServer())
      .get("/")
      .expect(200)
      .expect("Hello World!");
  });

  it("serves a liveness check without requiring PostgreSQL", () => {
    return request(app.getHttpServer())
      .get("/health")
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe("ok");
        expect(body.service).toBe("unidorm-api");
      });
  });
});
