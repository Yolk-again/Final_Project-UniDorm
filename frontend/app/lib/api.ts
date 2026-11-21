const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
export const API_BASE_URL = (configuredApiUrl || "http://localhost:3001").replace(/\/+$/, "");

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

  try {
    const response = await fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, {
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
      throw new Error("The server took too long to respond. Please try again.");
    }

    if (error instanceof TypeError) {
      throw new Error("Unable to reach the UniDorm server. Check your connection and API configuration.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
