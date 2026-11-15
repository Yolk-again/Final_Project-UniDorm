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

  it("exposes a public health check for frontend connectivity", () => {
    return request(app.getHttpServer())
      .get("/health")
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe("ok");
        expect(body.service).toBe("unidorm-api");
        expect(typeof body.timestamp).toBe("string");
      });
  });

  it("exposes database readiness for deployment health checks", () => {
    return request(app.getHttpServer())
      .get("/health/ready")
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe("ready");
        expect(body.database).toBe("connected");
      });
  });

  it("requires authentication for room data", () => {
    return request(app.getHttpServer()).get("/rooms").expect(401);
  });

  it("registers and protects the student announcement read endpoint", () => {
    return request(app.getHttpServer())
      .patch("/announcements/1/read")
      .expect(401);
  });

  it("requires authentication to list personal notifications", () => {
    return request(app.getHttpServer()).get("/notifications").expect(401);
  });

  it("requires authentication to mark one notification as read", () => {
    return request(app.getHttpServer()).patch("/notifications/1/read").expect(401);
  });

  it("requires authentication to mark all notifications as read", () => {
    return request(app.getHttpServer()).patch("/notifications/read-all").expect(401);
  });
  it("requires authentication to count unread notifications by type", () => {
    return request(app.getHttpServer()).get("/notifications/unread-count/BILL_CREATED").expect(401);
  });

  it("requires authentication to mark a notification type as read", () => {
    return request(app.getHttpServer()).patch("/notifications/type/BILL_CREATED/read").expect(401);
  });

  it("requires authentication to check unread notifications by type", () => {
    return request(app.getHttpServer()).get("/notifications/unread-count/BILL_CREATED").expect(401);
  });

  it("requires authentication to mark a notification type as read", () => {
    return request(app.getHttpServer()).patch("/notifications/type/BILL_CREATED/read").expect(401);
  });


  it("requires authentication for manual payment submissions", () => {
    return request(app.getHttpServer()).post("/payments/1/submit").expect(401);
  });

  it("requires authentication for payment verification", () => {
    return request(app.getHttpServer()).patch("/payments/1/verify").send({ decision: "APPROVE" }).expect(401);
  });

  it("requires authentication to retrieve payment evidence", () => {
    return request(app.getHttpServer()).get("/payments/1/proof").expect(401);
  });

  it("requires authentication to retrieve historical payment evidence", () => {
    return request(app.getHttpServer()).get("/payments/1/submissions/1/proof").expect(401);
  });

  it("requires an authenticated admin before accepting room creation", () => {
    return request(app.getHttpServer())
      .post("/rooms")
      .send({ roomNumber: "A01", gender: "Male", type: "Standard", furniture: "Basic", price: 4500, createdBy: "spoofed" })
      .expect(401);
  });

  it("does not expose the previous student mark-as-paid endpoint", () => {
    return request(app.getHttpServer()).patch("/payments/1/pay").expect(404);
  });

  it("keeps login available without an existing token", () => {
    return request(app.getHttpServer())
      .post("/auth/login")
      .send({ role: "unknown" })
      .expect(400);
  });
});
