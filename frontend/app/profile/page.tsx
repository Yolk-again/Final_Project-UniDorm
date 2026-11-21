"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  studentId: string | null;
  adminId: string | null;
  gender: string | null;
  role: "student" | "admin";
  createdAt: string;
  updatedAt: string;
};

type ProfileForm = {
  name: string;
  email: string;
  gender: string;
  password: string;
  confirmPassword: string;
};

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    email: "",
    gender: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      router.replace("/login");
      return;
    }

    let active = true;

    apiRequest<UserProfile>("/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((user) => {
        if (!active) return;
        setProfile(user);
        setForm({
          name: user.name || "",
          email: user.email || "",
          gender: user.gender || "",
          password: "",
          confirmPassword: "",
        });
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load your profile.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!profile) return;

    if (!form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!/^[^\s@]+@gmail\.com$/i.test(form.email.trim())) {
      setError("Please enter a valid @gmail.com address.");
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    if (
      form.password &&
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(form.password)
    ) {
      setError("Password must be at least 8 characters and include a lowercase letter, an uppercase letter, and a symbol.");
      return;
    }

    const token = localStorage.getItem("authToken");

    if (!token) {
      router.replace("/login");
      return;
    }

    setSaving(true);

    try {
      const updated = await apiRequest<UserProfile>("/auth/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          ...(profile.role === "student" ? { gender: form.gender } : {}),
          ...(form.password ? { password: form.password } : {}),
        }),
      });

      setProfile(updated);
      setForm((current) => ({
        ...current,
        name: updated.name,
        email: updated.email,
        gender: updated.gender || "",
        password: "",
        confirmPassword: "",
      }));
      localStorage.setItem("loggedInUser", JSON.stringify(updated));
      sessionStorage.setItem("loggedInUser", JSON.stringify(updated));
      document.cookie = `user=${encodeURIComponent(JSON.stringify(updated))}; path=/; max-age=28800; samesite=lax`;
      setSuccess("Your profile has been updated.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update your profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const backPath = profile?.role === "admin" ? "/admin/dashboard" : "/rooms";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 px-6 text-slate-700">
        <div className="rounded-3xl border border-white/70 bg-white/80 px-8 py-7 text-center shadow-xl backdrop-blur-xl">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="font-semibold">Loading your profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div>
            <p className="text-sm font-semibold tracking-[0.35em] text-blue-600 uppercase">
              Unidorm
            </p>
            <h1 className="mt-1 text-3xl font-bold">My Profile</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your account information and security.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(backPath)}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Dashboard
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {profile ? (
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="h-fit rounded-[2rem] border border-white/60 bg-white/80 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-600">
                {profile.name.trim().charAt(0).toUpperCase() || "U"}
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Account type
              </p>
              <h2 className="mt-1 text-2xl font-bold capitalize">{profile.role}</h2>
              <p className="mt-2 break-all text-sm text-slate-500">{profile.email}</p>

              <div className="mt-7 space-y-4 border-t border-slate-100 pt-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {profile.role === "student" ? "Student ID" : "Admin ID"}
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-800">
                    {profile.role === "student" ? profile.studentId : profile.adminId}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Member since
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
                Your account role and assigned ID are managed by UniDorm and cannot be changed from this page.
              </p>
            </section>

            <section className="rounded-[2rem] border border-white/60 bg-white/80 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold">Personal information</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update the details connected to your account.
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Full name
                  </label>
                  <input
                    className={inputClass}
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    autoComplete="name"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email address
                  </label>
                  <input
                    className={inputClass}
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    autoComplete="email"
                    required
                  />
                </div>

                {profile.role === "student" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Gender
                    </label>
                    <select
                      className={inputClass}
                      value={form.gender}
                      onChange={(event) =>
                        setForm({ ...form, gender: event.target.value })
                      }
                      required
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="font-semibold text-slate-800">Change password</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Leave these fields empty to keep your current password.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    New password
                  </label>
                  <input
                    className={inputClass}
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    autoComplete="new-password"
                    placeholder="Enter a new password"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Confirm new password
                  </label>
                  <input
                    className={inputClass}
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm({ ...form, confirmPassword: event.target.value })
                    }
                    autoComplete="new-password"
                    placeholder="Confirm your new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Saving changes..." : "Save changes"}
                </button>
              </form>
            </section>
          </div>
        ) : (
          <section className="rounded-[2rem] border border-white/60 bg-white/80 p-8 text-center shadow-xl backdrop-blur-xl">
            <h2 className="text-xl font-bold">Profile unavailable</h2>
            <p className="mt-2 text-sm text-slate-500">
              {error || "Please sign in again to view your profile."}
            </p>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Return to login
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
