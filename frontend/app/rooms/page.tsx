/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";

function normalizeGender(value?: string) {
  const gender = String(value ?? "").trim().toLowerCase();

  if (gender === "male" || gender === "boy") return "Male";
  if (gender === "female" || gender === "girl") return "Female";

  return "";
}

function hasUnreadThread(
  thread: any,
  currentRole: "student" | "admin",
  chatReadTimes: Record<string, string>,
  selectedChatKey: string,
  currentUserId: string,
) {
  if (selectedChatKey === thread.chatKey) return false;
  if (thread.type === "DIRECT" && thread.status === "PENDING" && currentRole === "student") {
    return true;
  }
  if (!thread.lastMessage) return false;
  if (
    thread.lastMessage.senderRole === currentRole &&
    thread.lastMessage.senderId === currentUserId
  ) {
    return false;
  }

  const lastRead = chatReadTimes[thread.chatKey];
  if (!lastRead) return true;

  return new Date(thread.lastMessage.createdAt) > new Date(lastRead);
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
  const [view, setView] = useState<"available" | "my" | "announcements" | "payments" | "chat">("available");
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [chatThreads, setChatThreads] = useState<any[]>([]);
  const [selectedChatKey, setSelectedChatKey] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatError, setChatError] = useState("");
  const [announcementsLoaded, setAnnouncementsLoaded] = useState(false);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [chatReadTimes, setChatReadTimes] = useState<Record<string, string>>({});
  const [announcementReadIds, setAnnouncementReadIds] = useState<number[]>([]);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentGender, setStudentGender] = useState<"Male" | "Female" | "">(
    "",
  );
  const [hiddenBookingIds, setHiddenBookingIds] = useState<number[]>([]);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");
    const sessionUser = safeParseUser(sessionStorage.getItem("loggedInUser"));
    const localUser = safeParseUser(localStorage.getItem("loggedInUser"));
    const user = sessionUser || localUser;

    if (!token || user?.role !== "student" || !user?.studentId) {
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

  useEffect(() => {
    if (!studentId) return;

    const storedReadTimes = localStorage.getItem(
      `chatReadTimes_student_${studentId}`,
    );
    if (storedReadTimes) {
      try {
        const parsed = JSON.parse(storedReadTimes);
        if (parsed && typeof parsed === "object") {
          setChatReadTimes(parsed as Record<string, string>);
        }
      } catch {
        setChatReadTimes({});
      }
    }

    const announcementRead = localStorage.getItem(
      `announcementReadIds_student_${studentId}`,
    );
    if (announcementRead) {
      try {
        const parsed = JSON.parse(announcementRead);
        if (Array.isArray(parsed)) {
          setAnnouncementReadIds(parsed as number[]);
        }
      } catch {
        setAnnouncementReadIds([]);
      }
    }
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    localStorage.setItem(
      `chatReadTimes_student_${studentId}`,
      JSON.stringify(chatReadTimes),
    );
  }, [chatReadTimes, studentId]);

  useEffect(() => {
    if (!studentId) return;
    localStorage.setItem(
      `announcementReadIds_student_${studentId}`,
      JSON.stringify(announcementReadIds),
    );
  }, [announcementReadIds, studentId]);

  const fetchRooms = async () => {
    try {
      const res = await apiFetch("/rooms");
      const data = await res.json();
      setRooms(data);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    }
  };

  const fetchBookings = async (id: string) => {
    try {
      const res = await apiFetch("/bookings");
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
    fetchAnnouncements();
    fetchBills(studentId);
    fetchChatThreads();
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

  const orderedOccupiedRooms = [...occupiedRooms].sort((a, b) => {
    const aStatus = getRoomBookingStatus(a.roomNumber);
    const bStatus = getRoomBookingStatus(b.roomNumber);

    if (aStatus === "Your Room" && bStatus !== "Your Room") return -1;
    if (aStatus !== "Your Room" && bStatus === "Your Room") return 1;
    return 0;
  });

  // Split active booking statuses
  const hasApprovedBooking = myBookings.some((b) => b.status === "Approved");
  const hasPendingBooking = myBookings.some((b) => b.status === "Pending");
  const studentHasActiveBooking = hasApprovedBooking || hasPendingBooking;

  const handleBookRoom = async (room: any) => {
    if (studentHasActiveBooking) return;

    try {
      const res = await apiFetch("/bookings", {
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

  const fetchAnnouncements = async () => {
    try {
      const res = await apiFetch("/announcements");
      const data = await res.json();
      const normalizedGender = studentGender.toUpperCase();
      const filtered = Array.isArray(data)
        ? data.filter((announcement: any) =>
            announcement.audience === "ALL" ||
            announcement.audience === normalizedGender,
          )
        : [];
      setAnnouncements(filtered);
      setAnnouncementsLoaded(true);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    }
  };

  const fetchBills = async (id: string) => {
    try {
      const res = await apiFetch(`/payments/${id}`);
      const data = await res.json();
      setBills(data);
    } catch (error) {
      console.error("Failed to fetch bills:", error);
    }
  };

  const fetchChatThreads = async () => {
    try {
      const res = await apiFetch("/chat/threads");
      const data = await res.json();
      setChatThreads(data);
      setChatsLoaded(true);
    } catch (error) {
      console.error("Failed to fetch chat threads:", error);
    }
  };

  const fetchChatMessages = async (chatKey: string) => {
    try {
      const res = await apiFetch(`/chat/threads/${chatKey}/messages`);
      const data = await res.json();
      setChatMessages(data);
      setSelectedChatKey(chatKey);
      setChatReadTimes((prev) => ({
        ...prev,
        [chatKey]: new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChatKey || !newMessage.trim()) {
      return;
    }

    try {
      const res = await apiFetch(`/chat/threads/${selectedChatKey}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage.trim(),
          senderRole: "student",
          senderId: studentId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setChatError(data.message || "Failed to send message");
        return;
      }

      setNewMessage("");
      await fetchChatMessages(selectedChatKey);
    } catch (error) {
      console.error(error);
      setChatError("Failed to send message");
    }
  };

  const handleRespondRequest = async (chatKey: string, action: "accept" | "deny") => {
    try {
      const res = await apiFetch(`/chat/threads/${chatKey}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to respond to request");
        return;
      }
      await fetchChatThreads();
      if (selectedChatKey === chatKey) {
        await fetchChatMessages(chatKey);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to respond to request");
    }
  };

  const handleDeleteBooking = async (bookingId: number) => {
    try {
      const res = await apiFetch(`/bookings/${bookingId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to delete booking");
        return;
      }
      await fetchBookings(studentId);
    } catch (error) {
      console.error(error);
      alert("Failed to delete booking");
    }
  };
  useEffect(() => {
    if (view !== "announcements") return;
    const unreadIds = announcements
      .filter((announcement) => !announcementReadIds.includes(announcement.id))
      .map((announcement) => announcement.id);

    if (unreadIds.length === 0) return;

    setAnnouncementReadIds((prev) => Array.from(new Set([...prev, ...unreadIds])));
  }, [view, announcements, announcementReadIds]);
  const handlePayBill = async (billId: number) => {
    if (!window.confirm("Only mark this bill as paid after you have actually paid the dormitory office. Continue?")) return;
    try {
      const res = await apiFetch(`/payments/${billId}/pay`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to pay bill");
        return;
      }
      fetchBills(studentId);
    } catch (error) {
      console.error(error);
      alert("Failed to pay bill");
    }
  };

  const announcementNotification = announcementsLoaded && announcements.some(
    (announcement) => !announcementReadIds.includes(announcement.id),
  );

  const chatNotification = chatsLoaded && chatThreads.some((thread) =>
    (thread.type === "GROUP"
      ? thread.audienceGender === studentGender
      : thread.studentId === studentId) &&
    hasUnreadThread(thread, "student", chatReadTimes, selectedChatKey, studentId),
  );

  const handleLogout = () => {
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("loggedInUser");
    sessionStorage.removeItem("loggedInRole");
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("loggedInRole");
    router.replace("/");
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
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

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-200 p-1">
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
              <button
                onClick={() => setView("announcements")}
                aria-label="View announcements"
                className={`relative rounded-md px-4 py-2 text-sm font-semibold transition ${
                  view === "announcements"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Announcements
                {announcementNotification && view !== "announcements" && (
                  <span
                    role="status"
                    aria-label="New announcement"
                    className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-red-500"
                  />
                )}
              </button>
              <button
                onClick={() => setView("payments")}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  view === "payments"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Payments
              </button>
              <button
                onClick={() => setView("chat")}
                aria-label="View chat"
                className={`relative rounded-md px-4 py-2 text-sm font-semibold transition ${
                  view === "chat"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Chat
                {chatNotification && view !== "chat" && (
                  <span
                    role="status"
                    aria-label="New chat message"
                    className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-red-500"
                  />
                )}
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
                {orderedOccupiedRooms.map((r) => {
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

                {orderedOccupiedRooms.length === 0 && (
                  <p className="text-slate-400 italic">
                    No occupied rooms.
                  </p>
                )}
              </div>
            </section>
          </div>
        ) : view === "my" ? (
          <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-900">
                My Bookings
              </h2>
              <p className="text-sm text-slate-500">
                Track your booking requests and statuses.
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
                      {b.type} • {b.furniture} • {Number(b.price).toLocaleString()} THB
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {b.status !== "Approved" ? (
                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
                          b.status === "Rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    ) : null}

                    {b.status === "Rejected" ? (
                      <button
                        onClick={() => handleDeleteBooking(b.id)}
                        className="grid h-8 w-8 place-items-center rounded-full bg-red-100 text-sm font-bold text-red-600 transition hover:bg-red-200 hover:text-red-700"
                        aria-label="Delete booking"
                        title="Delete booking"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}

              {visibleMyBookings.length === 0 && (
                <p className="text-slate-400 italic">No bookings yet.</p>
              )}
            </div>
          </div>
        ) : view === "announcements" ? (
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-900">Announcements</h2>
                <p className="text-sm text-slate-500">
                  See the latest dorm news and updates.
                </p>
              </div>

              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-slate-900">
                          {announcement.title}
                        </p>
                        <p className="text-sm text-slate-500">
                          {announcement.audience === "ALL" ? "All Residents" : `${announcement.audience} Residents`}
                        </p>
                      </div>
                      <p className="text-sm text-slate-500">
                        {new Date(announcement.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="mt-4 text-sm text-slate-600">{announcement.content}</p>
                  </div>
                ))}

                {announcements.length === 0 && (
                  <p className="text-slate-400 italic">No announcements yet.</p>
                )}
              </div>
            </section>
          </div>
        ) : view === "payments" ? (
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-900">Your Bills</h2>
                <p className="text-sm text-slate-500">
                  Track your dorm bills and record payments after completing them through the dormitory office.
                </p>
              </div>

              <div className="space-y-4">
                {bills.map((bill) => (
                  <div
                    key={bill.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-lg font-bold text-slate-900">{bill.billingLabel}</p>
                        <p className="text-sm text-slate-500">
                          {bill.category} • {bill.cycle} • Due {new Date(bill.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-semibold text-blue-600">
                          {Number(bill.amount).toLocaleString()} THB
                        </p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            bill.status === "PAID"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {bill.status}
                        </span>
                        {bill.status === "PENDING" ? (
                          <button
                            onClick={() => handlePayBill(bill.id)}
                            className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                          >
                            Mark as paid
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}

                {bills.length === 0 && (
                  <p className="text-slate-400 italic">No bills available at the moment.</p>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-900">Messages</h2>
                <p className="text-sm text-slate-500">
                  Join group chats or respond to direct admin requests.
                </p>
              </div>

              <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-600">Chats</p>
                    <div className="mt-3 space-y-3">
                      {chatThreads
                        .filter((thread) =>
                          thread.type === "GROUP"
                            ? thread.audienceGender === studentGender
                            : thread.studentId === studentId,
                        )
                        .map((thread) => (
                          <button
                            key={thread.chatKey}
                            type="button"
                            onClick={() => fetchChatMessages(thread.chatKey)}
                            className={`relative block w-full rounded-2xl border px-4 py-3 text-left transition ${
                              selectedChatKey === thread.chatKey
                                ? "border-blue-600 bg-white shadow-sm"
                                : "border-transparent bg-white/80 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {thread.type === "GROUP"
                                    ? `${thread.audienceGender} Group`
                                    : `Admin Request`}
                                </p>
                                {thread.type === "DIRECT" && (
                                  <>
                                    <p className="text-xs text-slate-500">
                                      {thread.status === "PENDING"
                                        ? "Direct request pending"
                                        : thread.status === "DENIED"
                                          ? "Request denied"
                                          : "Direct chat"}
                                    </p>
                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                                      {thread.status}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {hasUnreadThread(thread, "student", chatReadTimes, selectedChatKey) && (
                              <span className="absolute right-4 top-4 h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white" />
                            )}
                          </button>
                        ))}
                      {chatThreads.filter((thread) =>
                        thread.type === "GROUP"
                          ? thread.audienceGender === studentGender
                          : thread.studentId === studentId,
                      ).length === 0 && (
                        <p className="text-sm text-slate-400">No chats yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  {selectedChatKey ? (
                    <>
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-slate-900">
                            {chatThreads.find((thread) => thread.chatKey === selectedChatKey)?.type === "GROUP"
                              ? `${chatThreads.find((thread) => thread.chatKey === selectedChatKey)?.audienceGender} Group Chat`
                              : "Admin Direct Request"}
                          </p>
                          {chatThreads.find((thread) => thread.chatKey === selectedChatKey)?.type === "DIRECT" && (
                            <p className="text-sm text-slate-500">
                              {chatThreads.find((thread) => thread.chatKey === selectedChatKey)?.status}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mb-4 max-h-[420px] space-y-3 overflow-y-auto pr-2">
                        {chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`rounded-2xl p-4 ${
                              msg.senderRole === "student"
                                ? "bg-blue-50 text-slate-900 self-end"
                                : "bg-slate-100 text-slate-900"
                            }`}
                          >
                            <p className="text-sm font-semibold">
                              {msg.senderRole === "student"
                                ? msg.senderId
                                : `Admin - ${msg.senderId}`}
                            </p>
                            <p className="mt-2 text-sm leading-6">{msg.content}</p>
                          </div>
                        ))}
                      </div>

                      {chatError && (
                        <p className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                          {chatError}
                        </p>
                      )}

                      {chatThreads.find((thread) => thread.chatKey === selectedChatKey)?.type === "DIRECT" &&
                      chatThreads.find((thread) => thread.chatKey === selectedChatKey)?.status === "PENDING" ? (
                        <div className="flex flex-col gap-3">
                          <p className="text-sm text-slate-600">
                            You have a pending chat request. Accept to continue or deny to cancel.
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => handleRespondRequest(selectedChatKey, "accept")}
                              className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
                            >
                              Accept Request
                            </button>
                            <button
                              onClick={() => handleRespondRequest(selectedChatKey, "deny")}
                              className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
                            >
                              Deny Request
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex gap-3">
                          <input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                            placeholder="Type a message..."
                          />
                          <button
                            onClick={handleSendMessage}
                            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                          >
                            Send
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                      Select a chat thread to view or reply.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}