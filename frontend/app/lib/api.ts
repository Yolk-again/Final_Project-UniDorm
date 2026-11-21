export const API_BASE_URL = "/api-backend";

type ApiErrorBody = {
  message?: string | string[];
};

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const requestUrl = `${API_BASE_URL}${normalizedPath}`;

  try {
    const response = await fetch(requestUrl, {
      ...options,
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const apiBody = body as ApiErrorBody | null;
      const message = Array.isArray(apiBody?.message)
        ? apiBody.message.join(", ")
        : apiBody?.message;
      throw new Error(message || `Request failed with status ${response.status}`);
    }

    return body as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The UniDorm API request timed out. Check that the backend is running and the BACKEND_API_URL configuration is correct.");
    }

    if (error instanceof TypeError) {
      throw new Error("Unable to reach the UniDorm API through /api-backend. In local development, start the backend on port 3001. For deployment, configure BACKEND_API_URL to the public backend URL and redeploy the frontend.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
