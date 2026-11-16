import { AuthRateLimitMiddleware } from "./auth-rate-limit.middleware";

describe("AuthRateLimitMiddleware", () => {
  function createResponse() {
    const headers: Record<string, string> = {};
    const response: any = {
      headers,
      statusCode: 200,
      body: undefined,
      setHeader: jest.fn((name: string, value: string) => {
        headers[name] = value;
      }),
      status: jest.fn(function (this: any, code: number) {
        this.statusCode = code;
        return this;
      }),
      json: jest.fn(function (this: any, body: unknown) {
        this.body = body;
        return this;
      }),
    };
    return response;
  }

  it("limits repeated login attempts from the same client IP", () => {
    const middleware = new AuthRateLimitMiddleware();
    const next = jest.fn();

    for (let attempt = 0; attempt < 120; attempt += 1) {
      middleware.use(
        { method: "POST", path: "/auth/login", ip: "192.0.2.5", socket: {} } as any,
        createResponse(),
        next,
      );
    }

    const blockedResponse = createResponse();
    middleware.use(
      { method: "POST", path: "/auth/login", ip: "192.0.2.5", socket: {} } as any,
      blockedResponse,
      next,
    );

    expect(next).toHaveBeenCalledTimes(120);
    expect(blockedResponse.statusCode).toBe(429);
    expect(blockedResponse.body.statusCode).toBe(429);
    expect(blockedResponse.headers["Retry-After"]).toBeDefined();
  });

  it("does not throttle unrelated routes", () => {
    const middleware = new AuthRateLimitMiddleware();
    const next = jest.fn();

    middleware.use(
      { method: "POST", path: "/payments", ip: "192.0.2.5", socket: {} } as any,
      createResponse(),
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
  });
});
