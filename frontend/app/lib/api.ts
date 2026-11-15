const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

const DEFAULT_API_URL = "http://127.0.0.1:3001";

function normalizeApiUrl(value: string) {
  const normalized = value.replace(/\/$/, "");

  if (process.env.NODE_ENV !== "production") {
    try {
      const url = new URL(normalized);
      if (url.hostname === "localhost") {
        url.hostname = "127.0.0.1";
        return url.toString().replace(/\/$/, "");
      }
    } catch {
      return normalized;
    }
  }

  return normalized;
}

export const API_BASE_URL = normalizeApiUrl(
  configuredApiUrl || DEFAULT_API_URL,
);

function isLocalApiUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.replace(/^\[|\]$/g, "");
    return ["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return false;
  }
}

function getApiCandidates(path: string, method: string) {
  const candidates = [API_BASE_URL];
  const canRetryLocalOrigin =
    process.env.NODE_ENV !== "production" &&
    isLocalApiUrl(API_BASE_URL) &&
    (["GET", "HEAD", "OPTIONS"].includes(method) || path === "/auth/login");

  if (canRetryLocalOrigin) {
    const hostname = new URL(API_BASE_URL).hostname.replace(/^\[|\]$/g, "");
    const alternate =
      hostname === "localhost" || hostname === "::1"
        ? "http://127.0.0.1:3001"
        : "http://localhost:3001";
    candidates.push(alternate);
  }

  return [...new Set(candidates)];
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const requestPath = path.startsWith("/") ? path : `/${path}`;
  const method = (init.method || "GET").toUpperCase();

  const isMultipartBody =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !headers.has("Content-Type") && !isMultipartBody) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined" && !requestPath.startsWith("/auth/")) {
    const token =
      sessionStorage.getItem("accessToken") ||
      localStorage.getItem("accessToken");

    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const candidates = getApiCandidates(requestPath, method);
  let lastError: unknown;

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}${requestPath}`, {
        ...init,
        cache: init.cache ?? "no-store",
        headers,
      });

      const contentType = response.headers.get("content-type") || "";
      if (candidates.length > 1 && contentType.includes("text/html")) {
        lastError = new Error(
          `The server at ${baseUrl} returned a web page instead of an API response.`,
        );
        continue;
      }

      if (
        response.status === 401 &&
        typeof window !== "undefined" &&
        !requestPath.startsWith("/auth/")
      ) {
        for (const storage of [sessionStorage, localStorage]) {
          storage.removeItem("accessToken");
          storage.removeItem("loggedInUser");
          storage.removeItem("loggedInRole");
        }
        window.location.assign("/login");
      }

      return response;
    } catch (error) {
      lastError = error;
    }
  }

  const failedOrigins = candidates.join(" or ");
  const originalMessage =
    lastError instanceof Error ? lastError.message : "Unknown network error";

  throw new Error(
    `Unable to connect to the UniDorm API (${failedOrigins}). Make sure the backend is running on port 3001, then check http://127.0.0.1:3001/health. Browser detail: ${originalMessage}`,
  );
}
