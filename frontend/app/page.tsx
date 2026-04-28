"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200 px-6 py-6">
      <div className="mx-auto grid h-full max-w-7xl items-center gap-10 lg:grid-cols-2">
        {/* LEFT SIDE */}
        <div className="relative z-10 flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit rounded-full border border-blue-200 bg-white/70 px-4 py-1 text-sm font-semibold text-blue-600 backdrop-blur-xl">
            Unidorm • Smart Living
          </div>

          <h1 className="text-5xl font-bold leading-tight text-slate-900 lg:text-7xl">
            Modern Dorm
            <span className="block text-blue-600">Management</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 lg:text-lg">
            Simplify room booking, approvals, and student accommodation with a
            clean digital platform built for modern campuses.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => router.push("/login")}
              className="rounded-2xl bg-blue-600 px-7 py-3 font-semibold text-white shadow-xl shadow-blue-200 transition hover:-translate-y-1 hover:bg-blue-700"
            >
              Login
            </button>

            <button
              onClick={() => router.push("/register")}
              className="rounded-2xl border border-slate-300 bg-white px-7 py-3 font-semibold text-slate-700 transition hover:-translate-y-1 hover:bg-slate-100"
            >
              Register
            </button>
          </div>

          {/* MINI STATS */}
          <div className="mt-10 grid max-w-lg grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/70 p-4 text-center shadow-sm backdrop-blur-xl">
              <p className="text-2xl font-bold text-slate-900">24/7</p>
              <p className="text-xs text-slate-500">Access</p>
            </div>

            <div className="rounded-2xl bg-white/70 p-4 text-center shadow-sm backdrop-blur-xl">
              <p className="text-2xl font-bold text-slate-900">Live</p>
              <p className="text-xs text-slate-500">Tracking</p>
            </div>

            <div className="rounded-2xl bg-white/70 p-4 text-center shadow-sm backdrop-blur-xl">
              <p className="text-2xl font-bold text-slate-900">Fast</p>
              <p className="text-xs text-slate-500">Booking</p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="relative flex items-center justify-center">
          {/* BACKGROUND BLOBS */}
          <div className="absolute h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-60 w-60 rounded-full bg-slate-300/40 blur-3xl" />

          {/* MAIN GLASS PANEL */}
          <div className="relative w-full max-w-xl rounded-[2.5rem] border border-white/60 bg-white/70 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Dashboard Preview
              </h2>

              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-red-300" />
                <span className="h-3 w-3 rounded-full bg-yellow-300" />
                <span className="h-3 w-3 rounded-full bg-green-300" />
              </div>
            </div>

            {/* ROOM CARDS */}
            <div className="mt-7 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">Room A01</p>
                    <p className="text-sm text-slate-500">Male • Available</p>
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    Open
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">Room B03</p>
                    <p className="text-sm text-slate-500">Female • Reserved</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                    Pending
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">Room A07</p>
                    <p className="text-sm text-slate-500">Male • Occupied</p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                    Full
                  </span>
                </div>
              </div>
            </div>

            {/* BOTTOM BAR */}
            <div className="mt-6 rounded-2xl bg-blue-600 px-5 py-4 text-white shadow-lg">
              <p className="text-sm font-semibold">
                Manage bookings faster with Unidorm
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}