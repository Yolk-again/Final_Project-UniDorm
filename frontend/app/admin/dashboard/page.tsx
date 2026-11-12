/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

function hasUnreadThread(
  thread: any,
  chatReadTimes: Record<string, string>,
  selectedChatKey: string,
  currentUserId = "",
) {
  if (selectedChatKey === thread.chatKey) return false;
  if (thread.type === "DIRECT" && thread.status === "PENDING") return true;
  if (!thread.lastMessage) return false;
  if (
    thread.lastMessage.senderRole === "admin" &&
    thread.lastMessage.senderId === currentUserId
  ) {
    return false;
  }

  const lastRead = chatReadTimes[thread.chatKey];
  if (!lastRead) return true;

  return new Date(thread.lastMessage.createdAt) > new Date(lastRead);
}

export default function AdminDashboard() {
  const router = useRouter();
  const adminId = (() => {
    try {
      return (
        JSON.parse(
          sessionStorage.getItem("loggedInUser") ||
          localStorage.getItem("loggedInUser") ||
          "null",
        )?.adminId || ""
      );
    } catch {
      return "";
    }
  })();

  const [roomList, setRoomList] = useState<any[]>([]);
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [chatThreads, setChatThreads] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [selectedChatKey, setSelectedChatKey] = useState("");
  const [firstChatMessage, setFirstChatMessage] = useState("");
  const [directStudentId, setDirectStudentId] = useState("");
  const [chatReadTimes, setChatReadTimes] = useState<Record<string, string>>({});
  const [paymentForm, setPaymentForm] = useState({
    studentId: "",
    category: "ELECTRIC",
    cycle: "MONTHLY",
    billingLabel: "",
    amount: "",
    dueDate: "",
    roomNumber: "",
  });
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    audience: "ALL",
  });
  const [bills, setBills] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [pendingChatNotifications, setPendingChatNotifications] = useState(false);
  const [adminView, setAdminView] = useState<"rooms" | "requests" | "announcements" | "payments" | "chat">("rooms");

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [hiddenBookingIds, setHiddenBookingIds] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    gender: "Male",
    type: "Single Room",
    furniture: "Fully Furnished",
    price: "",
  });

  useEffect(() => {
    const role =
      sessionStorage.getItem("loggedInRole") ||
      localStorage.getItem("loggedInRole");
    const token = sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");

    if (!token || !role || role !== "admin" || !adminId) {
      router.replace("/login");
      return;
    }

    const storedHidden = localStorage.getItem("hiddenBookingIds_admin");
    if (storedHidden) {
      try {
        const parsed = JSON.parse(storedHidden);
        if (Array.isArray(parsed)) {
          setHiddenBookingIds(parsed);
        }
      } catch {
        setHiddenBookingIds([]);
      }
    }

    const storedReadTimes = localStorage.getItem("chatReadTimes_admin");
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

    setAuthChecked(true);
    refresh();
  }, [router]);

  useEffect(() => {
    const storedReadTimes = localStorage.getItem("chatReadTimes_admin");
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
  }, []);

  useEffect(() => {
    localStorage.setItem("chatReadTimes_admin", JSON.stringify(chatReadTimes));
  }, [chatReadTimes]);

  useEffect(() => {
    if (authChecked) {
      localStorage.setItem(
        "hiddenBookingIds_admin",
        JSON.stringify(hiddenBookingIds),
      );
      localStorage.setItem(
        "chatReadTimes_admin",
        JSON.stringify(chatReadTimes),
      );
    }
  }, [hiddenBookingIds, chatReadTimes, authChecked]);

  const refresh = async () => {
    try {
      await ensureGroupChats();

      const roomsRes = await apiFetch("/rooms");
      const bookingsRes = await apiFetch("/bookings");
      const announcementsRes = await apiFetch("/announcements");
      const chatRes = await apiFetch("/chat/threads");
      const billRes = await apiFetch("/payments");

      const roomsData = await roomsRes.json();
      const bookingsData = await bookingsRes.json();
      const announcementsData = await announcementsRes.json();
      const chatData = await chatRes.json();
      const billData = await billRes.json();

      setRoomList(roomsData);
      setBookingRequests(bookingsData);
      setAnnouncements(announcementsData);
      setChatThreads(chatData);
      setBills(billData);
      setPendingChatNotifications(
        chatData.some((thread: any) => thread.type === "DIRECT" && thread.status === "PENDING"),
      );
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  const generateRoomNumber = (gender: string) => {
    const prefix = gender === "Male" ? "A" : "B";

    const sameGenderRooms = roomList.filter((r) => 
      r.roomNumber && r.roomNumber.startsWith(prefix)
    );

    if (sameGenderRooms.length === 0) {
      return `${prefix}01`;
    }

    const numbers = sameGenderRooms.map((r) => 
      parseInt(r.roomNumber.replace(prefix, ""), 10)
    ).filter(n => !isNaN(n));

    const maxNumber = Math.max(...numbers, 0);
    const nextNumber = maxNumber + 1;

    return `${prefix}${nextNumber.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let finalRoomNumber = "";

      if (isEditing && editId) {
        const existingRoom = roomList.find((room) => room.id === editId);
        finalRoomNumber = existingRoom?.roomNumber ?? "";
      } else {
        finalRoomNumber = generateRoomNumber(formData.gender);
      }

      const payload = {
        roomNumber: finalRoomNumber,
        gender: formData.gender,
        type: formData.type,
        furniture: formData.furniture,
        price: Number(formData.price),
      };

      const response =
        isEditing && editId
          ? await apiFetch(`/rooms/${editId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await apiFetch("/rooms", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Failed to save room");
      }

      setIsEditing(false);
      setEditId(null);
      setFormData({
        gender: "Male",
        type: "Single Room",
        furniture: "Fully Furnished",
        price: "",
      });

      await refresh();
    } catch (error) {
      console.error("Failed to save room:", error);
      alert(error instanceof Error ? error.message : "Failed to save room");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("loggedInUser");
    sessionStorage.removeItem("loggedInRole");
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("loggedInRole");
    router.replace("/login");
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

  const createGroupChat = async (audienceGender: string) => {
    try {
      const adminData = JSON.parse(
        sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "null",
      );
      if (!adminData?.adminId) {
        console.error("Missing admin ID for group chat creation");
        return;
      }
      const res = await apiFetch("/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "GROUP",
          audienceGender,
          adminId: adminData.adminId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not create group chat");
      setChatThreads((prev) => [data, ...prev.filter((t) => t.chatKey !== data.chatKey)]);
    } catch (error) {
      console.error(error);
    }
  };

  const ensureGroupChats = async () => {
    try {
      const adminData = JSON.parse(
        sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "null",
      );
      if (!adminData?.adminId) {
        return;
      }

      await Promise.all([
        createGroupChat("Male"),
        createGroupChat("Female"),
      ]);
    } catch (error) {
      console.error("Failed to ensure group chats:", error);
    }
  };

  const createDirectChat = async () => {
    try {
      if (!directStudentId.trim()) return;
      const adminData = JSON.parse(
        sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "null",
      );
      if (!adminData?.adminId) {
        console.error("Missing admin ID for direct chat request");
        return;
      }
      const res = await apiFetch("/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DIRECT",
          studentId: directStudentId.trim(),
          adminId: adminData.adminId,
        }),
      });
      const thread = await res.json();
      if (!res.ok) throw new Error(thread.message || "Could not create direct chat");
      setChatThreads((prev) => [thread, ...prev.filter((t) => t.chatKey !== thread.chatKey)]);
      setSelectedChatKey(thread.chatKey);
      if (firstChatMessage.trim()) {
        await apiFetch(`/chat/threads/${thread.chatKey}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderRole: "admin",
            senderId: adminData?.adminId,
            content: firstChatMessage.trim(),
          }),
        });
        setFirstChatMessage("");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const createAnnouncement = async () => {
    try {
      const adminData = JSON.parse(
        sessionStorage.getItem("loggedInUser") ||
          localStorage.getItem("loggedInUser") ||
          "null",
      );

      const res = await apiFetch("/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...announcementForm,
          createdBy: adminData?.adminId || adminData?.name || "admin",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not create announcement");
      setAnnouncements((prev) => [data, ...prev]);
      setAnnouncementForm({ title: "", content: "", audience: "ALL" });
    } catch (error) {
      console.error(error);
    }
  };

  const createBill = async () => {
    try {
      const res = await apiFetch("/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not create bill");
      setPaymentForm({
        studentId: "",
        category: "ELECTRIC",
        cycle: "MONTHLY",
        billingLabel: "",
        amount: "",
        dueDate: "",
        roomNumber: "",
      });
      await refresh();
    } catch (error) {
      console.error(error);
    }
  };

  const sendChatMessage = async () => {
    if (!selectedChatKey || !newChatMessage.trim()) return;

    try {
      const adminData = JSON.parse(
        sessionStorage.getItem("loggedInUser") ||
          localStorage.getItem("loggedInUser") ||
          "null",
      );
      if (!adminData?.adminId) {
        console.error("Missing admin ID for sending chat message");
        return;
      }

      const res = await apiFetch(`/chat/threads/${selectedChatKey}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatKey: selectedChatKey,
          senderRole: "admin",
          senderId: adminData.adminId,
          content: newChatMessage.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Could not send message");
      }

      setNewChatMessage("");
      await fetchChatMessages(selectedChatKey);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteChatThread = async (chatKey: string) => {
    try {
      await apiFetch(`/chat/threads/${chatKey}`, {
        method: "DELETE",
      });
      setChatThreads((prev) => prev.filter((thread) => thread.chatKey !== chatKey));
      if (selectedChatKey === chatKey) {
        setSelectedChatKey("");
        setChatMessages([]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const inputClass =
    "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-black placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:shadow-sm";

  const labelClass = "block text-sm font-semibold text-slate-700";

  const getRoomStatus = (roomNumber: string) => {
    const roomBookings = bookingRequests.filter(
      (b) => b.roomNumber === roomNumber,
    );

    if (roomBookings.some((b) => b.status === "Approved")) {
      return "Occupied";
    }

    if (roomBookings.some((b) => b.status === "Pending")) {
      return "Reserved";
    }

    return "Available";
  };

  const pendingBookingRequests = bookingRequests.filter(
    (b) => b.status === "Pending" && !hiddenBookingIds.includes(b.id),
  );

  const handleHideBooking = (booking: any) => {
    setHiddenBookingIds((prev) => {
      if (prev.includes(booking.id)) return prev;
      return [...prev, booking.id];
    });
  };

  const handleBookingStatus = async (booking: any, status: string) => {
    try {
      if (status === "Approved") {
        const alreadyOccupied = bookingRequests.some(
          (b) =>
            b.roomNumber === booking.roomNumber &&
            b.status === "Approved" &&
            b.id !== booking.id,
        );

        if (alreadyOccupied) {
          alert("This room is already occupied.");
          return;
        }
      }

      const response = await apiFetch(`/bookings/${booking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Failed to update booking");
      }

      await refresh();
    } catch (error) {
      console.error("Failed to update booking:", error);
      alert(error instanceof Error ? error.message : "Failed to update booking");
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="rounded-2xl border border-white/60 bg-white/80 px-6 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.35em] text-blue-600 uppercase">
              Unidorm
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage rooms and review booking requests.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        <div className="mb-8 rounded-[2rem] border border-white/60 bg-white/80 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-4">
          <div className="flex flex-wrap gap-3">
            {[
              { key: "rooms", label: "Rooms" },
              { key: "requests", label: "Requests" },
              { key: "announcements", label: "Announcements" },
              { key: "payments", label: "Payments" },
              { key: "chat", label: "Chat" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setAdminView(item.key as any)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  adminView === item.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                } relative`}
              >
                {item.label}
                {item.key === "chat" && chatThreads.some((thread: any) => hasUnreadThread(thread, chatReadTimes, selectedChatKey, adminId)) && (
                  <span className="absolute right-3 top-3 inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {adminView === "rooms" && (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="h-fit rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            <h2 className="mb-2 text-2xl font-bold text-slate-900">
              {isEditing ? "Edit Room" : "Add New Room"}
            </h2>

            <p className="mb-6 text-sm text-slate-500">
              {isEditing 
                ? "Update specific details for this room." 
                : "Select details; Room ID is auto-generated."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Room Gender</label>
                <select
                  disabled={isEditing}
                  className={`${inputClass} ${isEditing ? "bg-slate-100 cursor-not-allowed" : ""}`}
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
                >
                  <option value="Male">Male (Building A)</option>
                  <option value="Female">Female (Building B)</option>
                </select>
                {!isEditing && (
                  <p className="mt-1 text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                    Next Room ID: {generateRoomNumber(formData.gender)}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Room Type</label>
                <select
                  className={inputClass}
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                >
                  <option>Single Room</option>
                  <option>Studio Room</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Furniture</label>
                <select
                  className={inputClass}
                  value={formData.furniture}
                  onChange={(e) =>
                    setFormData({ ...formData, furniture: e.target.value })
                  }
                >
                  <option>Fully Furnished</option>
                  <option>Basic Type</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Price (THB)</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="Enter price"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                />
              </div>

              <div className="flex gap-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditId(null);
                      setFormData({
                        gender: "Male",
                        type: "Single Room",
                        furniture: "Fully Furnished",
                        price: "",
                      });
                    }}
                    className="mt-2 w-1/3 rounded-2xl bg-slate-200 py-3.5 font-semibold text-slate-600 transition hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                )}
                <button className={`mt-2 font-semibold text-white shadow-lg transition rounded-2xl py-3.5 ${isEditing ? 'w-2/3 bg-blue-600 shadow-blue-200 hover:bg-blue-700' : 'w-full bg-blue-600 shadow-blue-200 hover:bg-blue-700'}`}>
                  {isEditing ? "Update Room" : "Create Room"}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-10 lg:col-span-2">
            <section className="rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Current Rooms
                  </h2>
                  <p className="text-sm text-slate-500">
                    Rooms currently stored in the system.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {roomList.map((r) => {
                  const roomStatus = getRoomStatus(r.roomNumber);
                  const locked = roomStatus !== "Available";

                  return (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-bold text-slate-800">
                            Room {r.roomNumber}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {r.gender} • {r.type} • {r.furniture}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-blue-600">
                            {Number(r.price).toLocaleString()} THB
                          </p>

                          {roomStatus !== "Available" && (
                            <span
                              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                roomStatus === "Occupied"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {roomStatus}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              if (locked) return;
                              setIsEditing(true);
                              setEditId(r.id);
                              setFormData({
                                gender: r.gender || "Male",
                                type: r.type,
                                furniture: r.furniture,
                                price: String(r.price),
                              });
                            }}
                            disabled={locked}
                            className={`text-sm font-semibold ${
                              locked
                                ? "cursor-not-allowed text-slate-300"
                                : "text-blue-600 hover:text-blue-700"
                            }`}
                          >
                            Edit
                          </button>

                          <button
                            onClick={async () => {
                              if (locked) return;
                              if (!confirm("Delete this room?")) return;

                              try {
                                const response = await apiFetch(
                                  `/rooms/${r.id}`,
                                  { method: "DELETE" }
                                );
                                const result = await response.json().catch(() => ({}));
                                if (!response.ok) {
                                  throw new Error(result.message || "Failed to delete room");
                                }
                                await refresh();
                              } catch (error) {
                                console.error("Failed to delete room:", error);
                                alert(error instanceof Error ? error.message : "Failed to delete room");
                              }
                            }}
                            disabled={locked}
                            className={`text-sm font-semibold ${
                              locked
                                ? "cursor-not-allowed text-slate-300"
                                : "text-red-500 hover:text-red-600"
                            }`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

        {adminView === "requests" && (
            <>
            <section className="rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Booking Requests
                </h2>
                <p className="text-sm text-slate-500">
                  Review and respond to student booking requests.
                </p>
              </div>

              <div className="space-y-4">
                {pendingBookingRequests.map((b) => (
                  <div
                    key={b.id}
                    className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-bold text-slate-800">
                          Student: {b.studentId}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-blue-600">
                          Room {b.roomNumber}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {b.type} • {b.furniture} •{" "}
                          {Number(b.price).toLocaleString()} THB
                        </p>
                      </div>
                    </div>

                    <div className="absolute right-4 top-4 flex items-center gap-2">
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

                      {b.status !== "Pending" && (
                        <button
                          onClick={() => handleHideBooking(b)}
                          className="grid h-8 w-8 place-items-center rounded-full bg-red-100 text-sm font-bold text-red-600 transition hover:bg-red-200 hover:text-red-700"
                          aria-label="Hide request"
                          title="Hide request"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => handleBookingStatus(b, "Approved")}
                        className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleBookingStatus(b, "Rejected")}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {pendingBookingRequests.length === 0 && (
                  <p className="text-sm text-slate-500">No booking requests at the moment.</p>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Announcements</h2>
                <p className="text-sm text-slate-500">
                  Publish dorm updates for all or gender-specific residents.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Title</label>
                      <input
                        className={inputClass}
                        value={announcementForm.title}
                        onChange={(e) =>
                          setAnnouncementForm((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        placeholder="Announcement title"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Content</label>
                      <textarea
                        className={`${inputClass} min-h-[140px] resize-none`}
                        value={announcementForm.content}
                        onChange={(e) =>
                          setAnnouncementForm((prev) => ({
                            ...prev,
                            content: e.target.value,
                          }))
                        }
                        placeholder="Announcement details"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Audience</label>
                      <select
                        className={inputClass}
                        value={announcementForm.audience}
                        onChange={(e) =>
                          setAnnouncementForm((prev) => ({
                            ...prev,
                            audience: e.target.value,
                          }))
                        }
                      >
                        <option value="ALL">All Residents</option>
                        <option value="MALE">Male Residents</option>
                        <option value="FEMALE">Female Residents</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={createAnnouncement}
                      className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                      Publish Announcement
                    </button>
                  </div>
                </div>
              </div>
            </section>
            </>
        )}

        {adminView === "payments" && (
          <section className="rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Payments</h2>
              <p className="text-sm text-slate-500">
                Publish payment requests for students.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Student ID</label>
                  <input
                    className={inputClass}
                    value={paymentForm.studentId}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        studentId: e.target.value,
                      }))
                    }
                    placeholder="68306130XX"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Category</label>
                    <select
                      className={inputClass}
                      value={paymentForm.category}
                      onChange={(e) =>
                        setPaymentForm((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                    >
                      <option value="ELECTRIC">Electric</option>
                      <option value="WATER">Water</option>
                      <option value="ROOM">Room</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Cycle</label>
                    <select
                      className={inputClass}
                      value={paymentForm.cycle}
                      onChange={(e) =>
                        setPaymentForm((prev) => ({
                          ...prev,
                          cycle: e.target.value,
                        }))
                      }
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="SEMESTER">Semester</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Billing Label</label>
                  <input
                    className={inputClass}
                    value={paymentForm.billingLabel}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        billingLabel: e.target.value,
                      }))
                    }
                    placeholder="April electric bill"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Amount</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      placeholder="Amount"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Due Date</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={paymentForm.dueDate}
                      onChange={(e) =>
                        setPaymentForm((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Room Number</label>
                  <input
                    className={inputClass}
                    value={paymentForm.roomNumber}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        roomNumber: e.target.value,
                      }))
                    }
                    placeholder="A01"
                  />
                </div>
                <button
                  type="button"
                  onClick={createBill}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Create Bill
                </button>
              </div>
            </div>
          </section>
        )}

        {adminView === "chat" && (
          <>
            <section className="rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Messaging & Chat</h2>
                <p className="text-sm text-slate-500">
                  Create group chats, request direct chats with students, and manage messages.
                </p>
              </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <p className="mb-4 text-sm font-semibold text-slate-700">Create Chat</p>
                  <div className="space-y-4">
                    <div>
                      <button
                        type="button"
                        onClick={() => createGroupChat("Male")}
                        className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                      >
                        Create Male Group Chat
                      </button>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => createGroupChat("Female")}
                        className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                      >
                        Create Female Group Chat
                      </button>
                    </div>
                    <div>
                      <label className={labelClass}>Student ID for direct contact</label>
                      <input
                        className={inputClass}
                        value={directStudentId}
                        onChange={(e) => setDirectStudentId(e.target.value)}
                        placeholder="68306130XX"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>First message</label>
                      <textarea
                        className={`${inputClass} min-h-[120px] resize-none`}
                        value={firstChatMessage}
                        onChange={(e) => setFirstChatMessage(e.target.value)}
                        placeholder="Type the initial chat request message"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={createDirectChat}
                      className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      Send Direct Chat Request
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="mb-4 text-sm font-semibold text-slate-700">Open Chat Threads</p>
                  <div className="space-y-3">
                    {chatThreads.map((thread) => (
                      <div
                        key={thread.chatKey}
                        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 hover:border-blue-300"
                      >
                        <button
                          type="button"
                          onClick={() => fetchChatMessages(thread.chatKey)}
                          className="relative flex-1 text-left"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">
                              {thread.type === "GROUP"
                                ? `${thread.audienceGender} Group`
                                : `Direct to ${thread.studentId}`}
                            </p>
                          </div>
                          {hasUnreadThread(thread, chatReadTimes, selectedChatKey, adminId) && (
                            <span className="absolute right-4 top-4 h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteChatThread(thread.chatKey)}
                          className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                    {chatThreads.length === 0 && (
                      <p className="text-sm text-slate-400">No chat threads yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Selected Chat</h2>
                <p className="text-sm text-slate-500">
                  View the selected chat thread and send replies.
                </p>
              </div>

              {selectedChatKey ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">
                          {chatThreads.find((thread) => thread.chatKey === selectedChatKey)?.type === "GROUP"
                            ? `${chatThreads.find((thread) => thread.chatKey === selectedChatKey)?.audienceGender} Group Chat`
                            : "Direct Chat"}
                        </p>
                        {chatThreads.find((thread) => thread.chatKey === selectedChatKey)?.type === "DIRECT" && (
                          <p className="text-sm text-slate-500">
                            {chatThreads.find((thread) => thread.chatKey === selectedChatKey)?.status}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`rounded-2xl p-4 ${
                            message.senderRole === "admin"
                              ? "bg-slate-100 text-slate-900"
                              : "bg-blue-50 text-slate-900"
                          }`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            {message.senderRole === "admin"
                              ? `Admin - ${message.senderId}`
                              : message.senderId}
                          </p>
                          <p className="mt-2 text-sm leading-6">{message.content}</p>
                        </div>
                      ))}

                      {chatMessages.length === 0 && (
                        <p className="text-sm text-slate-400">Select a chat to view messages.</p>
                      )}
                    </div>

                    <div className="mt-4 flex gap-3">
                      <input
                        type="text"
                        value={newChatMessage}
                        onChange={(e) => setNewChatMessage(e.target.value)}
                        placeholder="Type message..."
                        className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={sendChatMessage}
                        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                  Select a chat thread to view messages and reply.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}