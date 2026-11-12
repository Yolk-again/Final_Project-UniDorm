const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (
  configuredApiUrl || "http://localhost:3001"
).replace(/\/$/, "");

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined" && !path.startsWith("/auth/")) {
    const token =
      sessionStorage.getItem("accessToken") ||
      localStorage.getItem("accessToken");

    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
    {
      ...init,
      cache: init.cache ?? "no-store",
      headers,
    },
  );

  if (
    response.status === 401 &&
    typeof window !== "undefined" &&
    !path.startsWith("/auth/")
  ) {
    for (const storage of [sessionStorage, localStorage]) {
      storage.removeItem("accessToken");
      storage.removeItem("loggedInUser");
      storage.removeItem("loggedInRole");
    }
    window.location.assign("/login");
  }

  return response;
}
