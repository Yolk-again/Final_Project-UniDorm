/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function normalizeGender(value?: string) {
  const gender = String(value ?? "").trim().toLowerCase();

  if (gender === "male" || gender === "boy") return "Male";
  if (gender === "female" || gender === "girl") return "Female";

  return "";
}

function safeParseUser(raw: string | null) {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export default function StudentPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [view, setView] = useState<"available" | "my">("available");
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentGender, setStudentGender] = useState<"Male" | "Female" | "">(
    "",
  );
  const [hiddenBookingIds, setHiddenBookingIds] = useState<number[]>([]);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const sessionUser = safeParseUser(sessionStorage.getItem("loggedInUser"));
    const localUser = safeParseUser(localStorage.getItem("loggedInUser"));
    const user = sessionUser || localUser;

    if (!user?.studentId) {
      router.replace("/login");
      return;
    }

    setStudentId(user.studentId);
    setStudentName(user.name || "Student");
    setStudentGender(normalizeGender(user.gender));
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!studentId) return;

    const storedHidden = localStorage.getItem(
      `hiddenBookingIds_student_${studentId}`,
    );

    if (storedHidden) {
      try {
        const parsed = JSON.parse(storedHidden);
        if (Array.isArray(parsed)) {
          setHiddenBookingIds(parsed);
        }
      } catch {
        setHiddenBookingIds([]);
      }
    } else {
      setHiddenBookingIds([]);
    }
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;

    localStorage.setItem(
      `hiddenBookingIds_student_${studentId}`,
      JSON.stringify(hiddenBookingIds),
    );
  }, [hiddenBookingIds, studentId]);

  const fetchRooms = async () => {
    try {
      const res = await fetch("http://localhost:3001/rooms");
      const data = await res.json();
      setRooms(data);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    }
  };

  const fetchBookings = async (id: string) => {
    try {
      const res = await fetch("http://localhost:3001/bookings");
      const data = await res.json();
      setAllBookings(data);
      setMyBookings(data.filter((b: any) => b.studentId === id));
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    }
  };

  useEffect(() => {
    if (!authChecked || !studentId) return;

    fetchRooms();
    fetchBookings(studentId);
  }, [authChecked, studentId]);

  const getRoomBookingStatus = (roomNumber: string) => {
    const roomBookings = allBookings.filter((b) => b.roomNumber === roomNumber);

    if (
      roomBookings.some(
        (b) => b.status === "Approved" && String(b.studentId) === studentId,
      )
    ) {
      return "Your Room";
    }

    if (roomBookings.some((b) => b.status === "Approved")) {
      return "Occupied";
    }

    if (roomBookings.some((b) => b.status === "Pending")) {
      return "Reserved";
    }

    return "Available";
  };

  const visibleRooms =
    studentGender === ""
      ? rooms
      : rooms.filter((r) => normalizeGender(r.gender) === studentGender);

  const availableRooms = visibleRooms.filter(
    (r) => getRoomBookingStatus(r.roomNumber) === "Available",
  );

  const occupiedRooms = visibleRooms.filter(
    (r) => getRoomBookingStatus(r.roomNumber) !== "Available",
  );

  // Split active booking statuses
  const hasApprovedBooking = myBookings.some((b) => b.status === "Approved");
  const hasPendingBooking = myBookings.some((b) => b.status === "Pending");
  const studentHasActiveBooking = hasApprovedBooking || hasPendingBooking;

  const handleBookRoom = async (room: any) => {
    if (studentHasActiveBooking) return;

    try {
      const res = await fetch("http://localhost:3001/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          roomNumber: room.roomNumber,
          type: room.type,
          furniture: room.furniture,
          price: room.price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to book room");
        return;
      }

      await fetchBookings(studentId);
    } catch (error) {
      console.error("Failed to book room:", error);
      alert("Something went wrong");
    }
  };

  const handleHideBooking = (booking: any) => {
    if (!hiddenBookingIds.includes(booking.id)) {
      setHiddenBookingIds((prev) => [...prev, booking.id]);
    }
  };

  const visibleMyBookings = myBookings.filter(
    (b) => !hiddenBookingIds.includes(b.id),
  );

  const handleLogout = () => {
    sessionStorage.removeItem("loggedInUser");
    sessionStorage.removeItem("loggedInRole");
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("loggedInRole");
    router.replace("/");
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 px-6 py-8 text-slate-900">
        <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center">
          <div className="rounded-2xl border border-white/60 bg-white/80 px-6 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.35em] text-blue-600 uppercase">
              Unidorm
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Hello, {studentName}!
            </h1>
            <p className="text-sm text-slate-500">
              Browse rooms and manage your bookings
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex rounded-lg bg-slate-200 p-1">
              <button
                onClick={() => setView("available")}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  view === "available"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Available
              </button>
              <button
                onClick={() => setView("my")}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  view === "my"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                My Bookings
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {view === "available" ? (
          <div className="space-y-8">
            <section className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-900">
                  Available Rooms
                </h2>
                <p className="text-sm text-slate-500">
                  Rooms that match your gender and are free to book.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {availableRooms.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl"
                  >
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          Room {r.roomNumber}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {r.gender} • {r.type} • {r.furniture}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-blue-600">
                          {Number(r.price).toLocaleString()} THB
                        </p>
                      </div>

                      <span className="rounded-full bg-green-200 px-3 py-1 text-xs font-bold text-green-800">
                        Available
                      </span>
                    </div>

                    <button
                      onClick={() => handleBookRoom(r)}
                      disabled={studentHasActiveBooking}
                      className={`mt-4 w-full rounded-2xl py-3.5 font-semibold shadow-lg transition ${
                        studentHasActiveBooking
                          ? "cursor-not-allowed bg-slate-300 text-slate-500 shadow-none"
                          : "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700"
                      }`}
                    >
                      {hasApprovedBooking
                        ? "You already have a room"
                        : hasPendingBooking
                          ? "One active booking only"
                          : "Book Now"}
                    </button>
                  </div>
                ))}

                {availableRooms.length === 0 && (
                  <p className="text-slate-400 italic">
                    No available rooms currently.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-900">
                  Occupied Rooms
                </h2>
                <p className="text-sm text-slate-500">
                  Rooms already booked or waiting for approval.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {occupiedRooms.map((r) => {
                  const roomStatus = getRoomBookingStatus(r.roomNumber);

                  return (
                    <div
                      key={r.id}
                      className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">
                            Room {r.roomNumber}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {r.gender} • {r.type} • {r.furniture}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-blue-600">
                            {Number(r.price).toLocaleString()} THB
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            roomStatus === "Your Room"
                              ? "bg-blue-200 text-blue-800"
                              : roomStatus === "Occupied"
                                ? "bg-green-200 text-green-800"
                                : "bg-amber-200 text-amber-800"
                          }`}
                        >
                          {roomStatus}
                        </span>
                      </div>

                      <button
                        disabled
                        className="mt-4 w-full cursor-not-allowed rounded-2xl bg-slate-300 py-3.5 font-semibold text-slate-500 shadow-none"
                      >
                        {roomStatus}
                      </button>
                    </div>
                  );
                })}

                {occupiedRooms.length === 0 && (
                  <p className="text-slate-400 italic">
                    No occupied rooms for your gender.
                  </p>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-900">
                My Bookings
              </h2>
              <p className="text-sm text-slate-500">
                Track your booking requests and statuses
              </p>
            </div>

            <div className="space-y-4">
              {visibleMyBookings.map((b) => (
                <div
                  key={b.id}
                  className="relative flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-lg font-bold text-slate-800">
                      Room {b.roomNumber}
                    </p>
                    <p className="text-sm text-slate-500">
                      {b.type} • {b.furniture} •{" "}
                      {Number(b.price).toLocaleString()} THB
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
                        b.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : b.status === "Rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {b.status}
                    </span>

                    {(b.status === "Approved" || b.status === "Rejected") && (
                      <button
                        onClick={() => handleHideBooking(b)}
                        className="grid h-8 w-8 place-items-center rounded-full bg-red-100 text-sm font-bold text-red-600 transition hover:bg-red-200 hover:text-red-700"
                        aria-label="Hide booking"
                        title="Hide booking"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {visibleMyBookings.length === 0 && (
                <p className="text-slate-400 italic">No bookings yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}