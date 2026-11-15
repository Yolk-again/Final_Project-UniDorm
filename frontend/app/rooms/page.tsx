/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import LiveClock from "../components/LiveClock";
import NotificationCenter from "../components/NotificationCenter";
import ToastViewport, { type ToastMessage } from "../components/ToastViewport";
import { formatDateTime } from "../lib/date-time";

function normalizeGender(value?: string) {
  const gender = String(value ?? "").trim().toLowerCase();

  if (gender === "male" || gender === "boy") return "Male";
  if (gender === "female" || gender === "girl") return "Female";

  return "";
}

function hasUnreadThread(
  thread: any,
  currentRole: "student" | "admin",
  selectedChatKey: string,
  currentUserId: string,
) {
  if (selectedChatKey === thread.chatKey || !thread.lastMessage) return false;
  if (thread.lastMessage.senderRole === currentRole && thread.lastMessage.senderId === currentUserId) return false;
  if (thread.lastReadMessageId !== null && thread.lastReadMessageId !== undefined) {
    return Number(thread.lastMessage.id) > Number(thread.lastReadMessageId);
  }
  if (!thread.lastReadAt) return true;
  return new Date(thread.lastMessage.createdAt).getTime() > new Date(thread.lastReadAt).getTime();
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
  const [view, setView] = useState<"available" | "booking" | "my" | "announcements" | "payments" | "chat">("available");
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [hasUnreadBillNotification, setHasUnreadBillNotification] = useState(false);
  const [chatThreads, setChatThreads] = useState<any[]>([]);
  const [selectedChatKey, setSelectedChatKey] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatError, setChatError] = useState("");
  const [isStartingAdminChat, setIsStartingAdminChat] = useState(false);
  const [announcementsLoaded, setAnnouncementsLoaded] = useState(false);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const announcementReadAttempts = useRef<Set<number>>(new Set());
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentGender, setStudentGender] = useState<"Male" | "Female" | "">(
    "",
  );
  const [hiddenBookingIds, setHiddenBookingIds] = useState<number[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [bookingRoomId, setBookingRoomId] = useState<number | null>(null);
  const [billToConfirm, setBillToConfirm] = useState<any | null>(null);
  const [payingBillId, setPayingBillId] = useState<number | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "pending" | "submitted" | "paid">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

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


  const fetchRooms = useCallback(async () => {
    try {
      const res = await apiFetch("/rooms");
      const data = await res.json();
      setRooms(data);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    }
  }, []);

  const fetchBookings = useCallback(async (id: string) => {
    try {
      const res = await apiFetch("/bookings");
      const data = await res.json();
      setAllBookings(data);
      setMyBookings(data.filter((b: any) => b.studentId === id));
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    }
  }, []);



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
  const hasBookingRecords = myBookings.length > 0;
  const studentHasActiveBooking = hasApprovedBooking || hasPendingBooking;

  useEffect(() => {
    if (hasApprovedBooking && view === "booking") {
      setView("my");
    } else if (!hasApprovedBooking && view === "my" && hasBookingRecords) {
      setView("booking");
    } else if (!hasBookingRecords && view === "booking") {
      setView("available");
    }
  }, [hasApprovedBooking, hasBookingRecords, view]);

  const handleBookRoom = async (room: any) => {
    if (studentHasActiveBooking || bookingRoomId !== null) return;

    setBookingRoomId(room.id);
    try {
      const res = await apiFetch("/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: room.roomNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to book room");
      }

      await fetchBookings(studentId);
      setToast({ title: "Booking request sent", description: `Your request for room ${room.roomNumber} is now pending review.`, tone: "success" });
    } catch (error) {
      console.error("Failed to book room:", error);
      setToast({ title: "Could not book this room", description: error instanceof Error ? error.message : "Please try again.", tone: "error" });
    } finally {
      setBookingRoomId(null);
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

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await apiFetch("/announcements");
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        throw new Error(Array.isArray(data) ? "Could not load announcements" : data.message || "Could not load announcements");
      }
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
  }, [studentGender]);

  const fetchBills = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/payments/${id}`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        throw new Error(data?.message || "Could not load bills");
      }
      setBills(data);
      return true;
    } catch (error) {
      console.error("Failed to fetch bills:", error);
      return false;
    }
  }, []);

  const fetchBillNotificationStatus = useCallback(async () => {
    try {
      const response = await apiFetch("/notifications/unread-count/BILL_CREATED");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not check new bill notifications");
      setHasUnreadBillNotification(Number(data.unreadCount ?? 0) > 0);
    } catch (error) {
      console.error("Could not check unread bill notifications:", error);
    }
  }, []);

  const markBillNotificationsRead = useCallback(async () => {
    try {
      const response = await apiFetch("/notifications/type/BILL_CREATED/read", { method: "PATCH" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not mark bill notifications as read");
      setHasUnreadBillNotification(false);
      window.dispatchEvent(new Event("unidorm:notifications-changed"));
    } catch (error) {
      console.error("Could not mark bill notifications as read:", error);
    }
  }, []);

  const openPayments = useCallback(async () => {
    setView("payments");
    if (!studentId) return;
    const billsLoaded = await fetchBills(studentId);
    if (billsLoaded) await markBillNotificationsRead();
  }, [fetchBills, markBillNotificationsRead, studentId]);

  const fetchChatThreads = useCallback(async () => {
    try {
      const res = await apiFetch("/chat/threads");
      const data = await res.json();
      setChatThreads(data);
      setChatsLoaded(true);
    } catch (error) {
      console.error("Failed to fetch chat threads:", error);
    }
  }, []);

  useEffect(() => {
    if (!authChecked || !studentId) return;

    const syncBillNotification = () => {
      if (document.visibilityState === "visible") void fetchBillNotificationStatus();
    };

    syncBillNotification();
    const timer = window.setInterval(syncBillNotification, 30000);
    return () => window.clearInterval(timer);
  }, [authChecked, studentId, fetchBillNotificationStatus]);

  useEffect(() => {
    if (!authChecked || !studentId) return;

    const syncWorkspace = async () => {
      await Promise.all([
        fetchRooms(),
        fetchBookings(studentId),
        fetchAnnouncements(),
        fetchBills(studentId),
        fetchChatThreads(),
        fetchBillNotificationStatus(),
      ]);
      setLastSyncedAt(new Date());
    };

    void syncWorkspace();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void syncWorkspace();
    }, 60000);

    return () => window.clearInterval(timer);
  }, [
    authChecked,
    studentId,
    fetchRooms,
    fetchBookings,
    fetchAnnouncements,
    fetchBills,
    fetchChatThreads,
    fetchBillNotificationStatus,
  ]);

  const fetchChatMessages = async (chatKey: string) => {
    try {
      const res = await apiFetch(`/chat/threads/${chatKey}/messages`);
      const data = await res.json();
      setChatMessages(data);
      setSelectedChatKey(chatKey);
      try {
        const readResponse = await apiFetch(`/chat/threads/${encodeURIComponent(chatKey)}/read`, { method: "PATCH" });
        if (!readResponse.ok) throw new Error(await readResponse.text().catch(() => "Read receipt could not be saved."));
        const readState = await readResponse.json();
        setChatThreads((previous) => previous.map((thread) => thread.chatKey === chatKey
          ? { ...thread, lastReadAt: readState.lastReadAt, lastReadMessageId: readState.lastReadMessageId }
          : thread));
      } catch (readError) {
        console.error("Could not persist student chat read receipt:", readError);
      }
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
    }
  };

  const handleStartAdminChat = async () => {
    if (isStartingAdminChat || !studentId) return;

    setIsStartingAdminChat(true);
    setChatError("");
    try {
      let thread = chatThreads.find(
        (item) => item.type === "DIRECT" && item.chatKey === `student-admin-${studentId}`,
      );

      if (!thread) {
        const response = await apiFetch("/chat/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "DIRECT" }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "Could not start a direct message with the admin");
        }
        thread = data;
      }

      setChatThreads((previous) => [
        thread,
        ...previous.filter((item) => item.chatKey !== thread.chatKey),
      ]);
      setView("chat");
      await fetchChatMessages(thread.chatKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start a direct message with the admin";
      setChatError(message);
      setToast({ title: "Could not contact admin", description: message, tone: "error" });
    } finally {
      setIsStartingAdminChat(false);
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

    const unreadAnnouncements = announcements.filter(
      (announcement) => !announcement.isRead && !announcementReadAttempts.current.has(announcement.id),
    );
    if (unreadAnnouncements.length === 0) return;

    for (const announcement of unreadAnnouncements) {
      announcementReadAttempts.current.add(announcement.id);
    }

    void Promise.all(
      unreadAnnouncements.map(async (announcement) => {
        try {
          const response = await apiFetch(`/announcements/${announcement.id}/read`, { method: "PATCH" });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(result.message || "Could not save announcement read status");
          }
          setAnnouncements((previous) => previous.map((item) =>
            item.id === announcement.id
              ? { ...item, isRead: true, readAt: result.readAt ?? new Date().toISOString() }
              : item,
          ));
        } catch (error) {
          announcementReadAttempts.current.delete(announcement.id);
          console.error(`Could not mark announcement ${announcement.id} as read:`, error);
        }
      }),
    );
  }, [view, announcements]);
  const handlePayBill = (billId: number) => {
    const bill = bills.find((item) => item.id === billId);
    if (bill) {
      setPaymentReference("");
      setPaymentNote("");
      setPaymentProofFile(null);
      setBillToConfirm(bill);
    }
  };

  const openStudentPaymentSubmissionProof = async (billId: number, submission: any) => {
    const previewWindow = window.open("about:blank", "_blank");
    try {
      const response = await apiFetch(`/payments/${billId}/submissions/${submission.id}/proof`);
      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details.message || "Could not load your submitted receipt");
      }
      const proofBlob = await response.blob();
      const proofUrl = URL.createObjectURL(proofBlob);
      if (previewWindow) {
        previewWindow.location.href = proofUrl;
      } else {
        const anchor = document.createElement("a");
        anchor.href = proofUrl;
        anchor.download = submission.proofOriginalName || `payment-submission-${submission.id}`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(proofUrl), 60000);
    } catch (error) {
      previewWindow?.close();
      setToast({
        title: "Could not open submitted receipt",
        description: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
    }
  };

  const confirmBillPayment = async () => {
    if (!billToConfirm || payingBillId !== null) return;
    if (
      paymentReference.trim().length < 3 ||
      !paymentProofFile ||
      paymentProofFile.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "application/pdf"].includes(paymentProofFile.type)
    ) {
      setToast({
        title: "Payment proof required",
        description: "Enter the payment reference and attach a JPG, PNG, or PDF receipt no larger than 5 MB.",
        tone: "error",
      });
      return;
    }

    const billId = billToConfirm.id as number;
    setPayingBillId(billId);
    try {
      const formData = new FormData();
      formData.set("paymentReference", paymentReference.trim());
      formData.set("paymentNote", paymentNote.trim());
      formData.set("proof", paymentProofFile);
      const res = await apiFetch(`/payments/${billId}/submit`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not submit payment proof");
      await fetchBills(studentId);
      setBillToConfirm(null);
      setPaymentReference("");
      setPaymentNote("");
      setPaymentProofFile(null);
      setToast({ title: "Payment proof submitted", description: "The dormitory office will review your receipt before the bill is marked as paid.", tone: "success" });
    } catch (error) {
      console.error(error);
      setToast({ title: "Could not submit payment proof", description: error instanceof Error ? error.message : "Please contact the dormitory office.", tone: "error" });
    } finally {
      setPayingBillId(null);
    }
  };

  const refreshDashboard = async () => {
    if (isRefreshing || !studentId) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchRooms(),
        fetchBookings(studentId),
        fetchAnnouncements(),
        fetchBills(studentId),
        fetchChatThreads(),
        fetchBillNotificationStatus(),
      ]);
      setLastSyncedAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  const pendingBills = bills.filter((bill) => ["PENDING", "REJECTED"].includes(String(bill.status).toUpperCase()));
  const submittedBills = bills.filter((bill) => String(bill.status).toUpperCase() === "SUBMITTED");
  const paidBills = bills.filter((bill) => String(bill.status).toUpperCase() === "PAID");
  const pendingBillTotal = pendingBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  const paidBillTotal = paidBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  const visibleBills = bills.filter((bill) => {
    const status = String(bill.status).toUpperCase();
    if (paymentFilter === "all") return true;
    if (paymentFilter === "pending") return status === "PENDING" || status === "REJECTED";
    return status.toLowerCase() === paymentFilter;
  });

  const announcementNotification = announcementsLoaded && announcements.some(
    (announcement) => !announcement.isRead,
  );

  const chatNotification = chatsLoaded && chatThreads.some((thread) =>
    (thread.type === "GROUP"
      ? thread.audienceGender === studentGender
      : thread.studentId === studentId) &&
    hasUnreadThread(thread, "student", selectedChatKey, studentId),
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
      <div className="student-dashboard page-transition min-h-screen px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
        <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center">
          <div className="rounded-2xl border border-white/60 bg-white/80 px-6 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard page-transition min-h-screen px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
      <div className="dashboard-container mx-auto max-w-6xl">
        <div className="dashboard-header mb-7 flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
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
            <div className="dashboard-nav flex flex-wrap gap-1 rounded-lg bg-slate-200 p-1">
              <button
                onClick={() => setView("available")}
                className={`dashboard-tab rounded-md px-4 py-2 text-sm font-semibold transition ${
                  view === "available"
                    ? "is-active bg-white text-blue-600 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Available
              </button>
              {hasApprovedBooking ? (
                <button
                  onClick={() => setView("my")}
                  className={`dashboard-tab rounded-md px-4 py-2 text-sm font-semibold transition ${
                    view === "my"
                      ? "is-active bg-white text-blue-600 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  My Stay
                </button>
              ) : hasBookingRecords ? (
                <button
                  onClick={() => setView("booking")}
                  className={`dashboard-tab rounded-md px-4 py-2 text-sm font-semibold transition ${
                    view === "booking"
                      ? "is-active bg-white text-blue-600 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  Booking Status
                </button>
              ) : null}
              <button
                onClick={() => setView("announcements")}
                aria-label="View announcements"
                className={`dashboard-tab relative rounded-md px-4 py-2 text-sm font-semibold transition ${
                  view === "announcements"
                    ? "is-active bg-white text-blue-600 shadow-sm"
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
                onClick={() => void openPayments()}
                className={`dashboard-tab rounded-md px-4 py-2 text-sm font-semibold transition ${
                  view === "payments"
                    ? "is-active bg-white text-blue-600 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                <span className="relative inline-flex items-center gap-2">
                  Payments
                  {hasUnreadBillNotification && (
                    <span role="status" aria-label="New bill" title="New bill" className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(255,255,255,0.8)]" />
                  )}
                </span>
              </button>
              <button
                onClick={() => setView("chat")}
                aria-label="View chat"
                className={`dashboard-tab relative rounded-md px-4 py-2 text-sm font-semibold transition ${
                  view === "chat"
                    ? "is-active bg-white text-blue-600 shadow-sm"
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

            <div className="workspace-student-tools">
              <NotificationCenter onNavigate={(target) => {
                const nextView: Record<string, "available" | "booking" | "my" | "announcements" | "payments" | "chat"> = {
                  "student:payments": "payments",
                  "student:chat": "chat",
                  "student:announcements": "announcements",
                  "student:booking": hasApprovedBooking ? "my" : "booking",
                  "student:rooms": "available",
                };
                if (target === "student:payments") {
                  void openPayments();
                  return;
                }
                if (target && nextView[target]) setView(nextView[target]);
              }} />
              <LiveClock />
              <div className="workspace-sync-copy">
                <span className="workspace-sync-label">DATA SYNC</span>
                <strong>{lastSyncedAt ? `Updated ${formatDateTime(lastSyncedAt)}` : "Live workspace"}</strong>
              </div>
              <button type="button" onClick={() => void refreshDashboard()} disabled={isRefreshing} className="workspace-refresh-button">
                <span className={isRefreshing ? "refresh-glyph is-spinning" : "refresh-glyph"}>↻</span>
                {isRefreshing ? "Refreshing" : "Refresh"}
              </button>
              <button onClick={handleLogout} className="workspace-logout-button">Logout <span aria-hidden="true">↗</span></button>
            </div>
          </div>
        </div>

        <section className="dashboard-stats-grid" aria-label="Your dorm overview">
          <article className="dashboard-stat-card stat-blue"><span className="stat-symbol" aria-hidden="true">⌂</span><div><p>Available rooms</p><strong>{availableRooms.length}</strong><small>Ready to explore</small></div></article>
          <article className="dashboard-stat-card stat-violet"><span className="stat-symbol" aria-hidden="true">▣</span><div><p>{hasApprovedBooking ? "My Stay" : "Booking Status"}</p><strong>{hasApprovedBooking ? "Active" : visibleMyBookings.length}</strong><small>{hasApprovedBooking ? `Room ${myBookings.find((booking) => booking.status === "Approved")?.roomNumber || "confirmed"}` : studentHasActiveBooking ? "Waiting for approval" : "No active room request"}</small></div></article>
          <article className="dashboard-stat-card stat-amber"><span className="stat-symbol" aria-hidden="true">฿</span><div><p>Pending bills</p><strong>{bills.filter((bill) => String(bill.status).toUpperCase() === "PENDING").length}</strong><small>Payments to review</small></div></article>
          <article className="dashboard-stat-card stat-mint"><span className="stat-symbol" aria-hidden="true">✉</span><div><p>Chat threads</p><strong>{chatThreads.length}</strong><small>Stay in touch with admins</small></div></article>
        </section>

        {view === "available" ? (
          <div className="space-y-8">
            <section className="dashboard-panel rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
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
                    className="room-tile rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl"
                  >
                    <div className="room-card-art" aria-hidden="true">
                      <div className="room-art-sun" />
                      <div className="room-art-window"><span /><span /><span /><span /></div>
                      <div className="room-art-wall-frame" />
                      <div className="room-art-bed"><i /><b /><span /></div>
                      <div className="room-art-plant"><i /><i /><i /><b /></div>
                      <span className="room-art-caption">YOUR NEXT SPACE</span>
                      <span className="room-art-availability"><i /> AVAILABLE</span>
                    </div>
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
                        <p className="mt-2 text-xs text-slate-400">Listed {formatDateTime(r.createdAt)}</p>
                      </div>

                      <span className="rounded-full bg-green-200 px-3 py-1 text-xs font-bold text-green-800">
                        Available
                      </span>
                    </div>

                    <button
                      onClick={() => handleBookRoom(r)}
                      disabled={studentHasActiveBooking || bookingRoomId !== null}
                      className={`mt-4 w-full rounded-2xl py-3.5 font-semibold shadow-lg transition ${
                        studentHasActiveBooking
                          ? "cursor-not-allowed bg-slate-300 text-slate-500 shadow-none"
                          : "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700"
                      }`}
                    >
                      {bookingRoomId === r.id
                        ? "Sending request…"
                        : hasApprovedBooking
                          ? "You already have a room"
                          : hasPendingBooking
                            ? "One active booking only"
                            : "Book this room  ↗"}
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

            <section className="dashboard-panel rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
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
                      className="room-tile rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
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
                          <p className="mt-2 text-xs text-slate-400">Listed {formatDateTime(r.createdAt)}</p>
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
        ) : view === "booking" ? (
          <div className="room-tile rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            <div className="mb-5">
              <span className="operations-eyebrow">BOOKING PROGRESS</span>
              <h2 className="text-2xl font-bold text-slate-900">Booking Status</h2>
              <p className="text-sm text-slate-500">Follow your room request while it is being reviewed by the dormitory admin.</p>
            </div>
            <div className="space-y-4">
              {visibleMyBookings.map((booking) => (
                <article key={booking.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-slate-900">Room request · {booking.roomNumber}</p>
                    <p className="mt-1 text-sm text-slate-500">{booking.type} · {booking.furniture} · {Number(booking.price).toLocaleString()} THB</p>
                    <p className="mt-2 text-xs text-slate-400">Submitted {formatDateTime(booking.createdAt)} · Updated {formatDateTime(booking.updatedAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${booking.status === "Rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                      {booking.status === "Rejected" ? "Not approved" : "Pending review"}
                    </span>
                    {booking.status === "Rejected" && (
                      <button type="button" onClick={() => handleDeleteBooking(booking.id)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">Remove</button>
                    )}
                  </div>
                </article>
              ))}
              {visibleMyBookings.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No active booking requests. Browse available rooms to submit a request.</div>
              )}
            </div>
          </div>
        ) : view === "my" ? (
          <div className="room-tile rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            <div className="mb-5">
              <span className="operations-eyebrow">RESIDENT OVERVIEW</span>
              <h2 className="text-2xl font-bold text-slate-900">My Stay</h2>
              <p className="text-sm text-slate-500">Your approved accommodation and resident services.</p>
            </div>

            {(() => {
              const currentBooking = myBookings.find((booking) => booking.status === "Approved");
              if (!currentBooking) return <p className="text-sm text-slate-500">Your approved accommodation will appear here.</p>;
              return (
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Current accommodation</span>
                      <h3 className="mt-1 text-2xl font-extrabold text-slate-900">Room {currentBooking.roomNumber}</h3>
                      <p className="mt-2 text-sm text-slate-600">{currentBooking.type} · {currentBooking.furniture}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{Number(currentBooking.price).toLocaleString()} THB</p>
                      <p className="mt-2 text-xs text-slate-500">Approved / updated {formatDateTime(currentBooking.updatedAt)}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">Approved · Active resident</span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button type="button" onClick={() => void openPayments()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">View my bills</button>
                    <button type="button" onClick={() => void handleStartAdminChat()} disabled={isStartingAdminChat} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{isStartingAdminChat ? "Opening chat…" : "Contact admin"}</button>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : view === "announcements" ? (
          <div className="space-y-6">
            <section className="dashboard-panel rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
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
                      <div className="flex shrink-0 items-center gap-3">
                        {!announcement.isRead && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">New</span>
                        )}
                      <p className="text-sm text-slate-500">
                        {formatDateTime(announcement.createdAt)}
                      </p>
                      </div>
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
            <section className="dashboard-panel rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="payments-panel-heading mb-5">
                <div><span className="operations-eyebrow">PAYMENT CENTER</span><h2 className="text-2xl font-bold text-slate-900">Bills & payment history</h2>
                  <p className="text-sm text-slate-500">Track due dates and keep a clear record of payments made at the dormitory office.</p></div>
                <span className="payment-ledger-badge"><span className="payment-ledger-pulse" /> {bills.length} records</span>
              </div>

              <div className="student-payment-summary">
                <div className="student-payment-total due-total"><span>Outstanding</span><strong>฿{pendingBillTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong><small>{pendingBills.length} unpaid bills · rejected proofs need resubmission</small></div>
                <div className="student-payment-total all-total"><span>Awaiting verification</span><strong>{submittedBills.length}</strong><small>Submitted receipts under admin review</small></div>
                <div className="student-payment-total paid-total"><span>Verified paid</span><strong>฿{paidBillTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong><small>{paidBills.length} verified bills</small></div>
              </div>
              <div className="payment-filter-row" role="group" aria-label="Filter payment records">
                {[{ key: "all", label: "All records" }, { key: "pending", label: "Outstanding" }, { key: "submitted", label: "Awaiting review" }, { key: "paid", label: "Verified paid" }].map((item) => (
                  <button key={item.key} type="button" onClick={() => setPaymentFilter(item.key as "all" | "pending" | "submitted" | "paid")} className={paymentFilter === item.key ? "payment-filter is-active" : "payment-filter"}>{item.label}</button>
                ))}
              </div>

              <div className="space-y-4">
                {visibleBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="student-bill-card dashboard-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="student-bill-title-row">
                        <span className={`student-bill-icon ${String(bill.status).toUpperCase() === "PAID" ? "bill-icon-paid" : "bill-icon-due"}`}>{String(bill.category).toUpperCase() === "ELECTRIC" ? "ϟ" : String(bill.category).toUpperCase() === "WATER" ? "◉" : "⌂"}</span>
                        <div>
                          <p className="text-lg font-bold text-slate-900">{bill.billingLabel}</p>
                          <span className="student-invoice-code">INVOICE #{String(bill.id).padStart(5, "0")}</span>
                          <p className="mt-1 text-sm text-slate-500">{bill.category} • {bill.cycle} • {String(bill.status).toUpperCase() === "PAID" && bill.paidAt ? `Verified ${formatDateTime(bill.paidAt)}` : String(bill.status).toUpperCase() === "SUBMITTED" && bill.submittedAt ? `Submitted ${formatDateTime(bill.submittedAt)}` : `Due ${bill.dueDate ? formatDateTime(bill.dueDate) : "Not specified"}`}</p>
                          <p className="mt-1 text-xs text-slate-400">Created {formatDateTime(bill.createdAt)}</p>
                          {String(bill.status).toUpperCase() === "REJECTED" && bill.rejectionReason ? <p className="mt-2 text-xs font-semibold text-rose-600">Proof needs attention: {bill.rejectionReason}</p> : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-semibold text-blue-600">
                          {Number(bill.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB
                        </p>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                          String(bill.status).toUpperCase() === "PAID" ? "bg-green-100 text-green-700" :
                          String(bill.status).toUpperCase() === "SUBMITTED" ? "bg-blue-100 text-blue-700" :
                          String(bill.status).toUpperCase() === "REJECTED" ? "bg-rose-100 text-rose-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {String(bill.status).toUpperCase() === "PAID" ? "VERIFIED PAID" :
                           String(bill.status).toUpperCase() === "SUBMITTED" ? "AWAITING REVIEW" :
                           String(bill.status).toUpperCase() === "REJECTED" ? "PROOF REJECTED" : "OUTSTANDING"}
                        </span>
                        {["PENDING", "REJECTED"].includes(String(bill.status).toUpperCase()) ? (
                          <button type="button" onClick={() => handlePayBill(bill.id)} className="record-payment-button">
                            Submit payment proof <span>↗</span>
                          </button>
                        ) : String(bill.status).toUpperCase() === "SUBMITTED" ? (
                          <span className="payment-recorded-label">◷ Awaiting review</span>
                        ) : <span className="payment-recorded-label">✓ Verified</span>}
                      </div>
                    </div>
                    {Array.isArray(bill.submissions) && bill.submissions.length > 0 ? (
                      <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                          Payment submission history ({bill.submissions.length})
                        </summary>
                        <div className="mt-3 space-y-3">
                          {bill.submissions.map((submission: any) => (
                            <div key={submission.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <strong className="text-slate-800">{submission.paymentReference}</strong>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                  submission.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                                  submission.status === "REJECTED" ? "bg-rose-100 text-rose-700" :
                                  "bg-blue-100 text-blue-700"
                                }`}>{submission.status}</span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">Submitted {formatDateTime(submission.submittedAt)}</p>
                              {submission.reviewedAt ? <p className="mt-1 text-xs text-slate-500">Reviewed {formatDateTime(submission.reviewedAt)}{submission.reviewer?.name ? ` by ${submission.reviewer.name}` : ""}</p> : null}
                              {submission.rejectionReason ? <p className="mt-2 text-xs font-medium text-rose-600">Reason: {submission.rejectionReason}</p> : null}
                              {submission.paymentNote ? <p className="mt-2 text-xs text-slate-600">Note: {submission.paymentNote}</p> : null}
                              <button type="button" onClick={() => void openStudentPaymentSubmissionProof(bill.id, submission)} className="mt-2 text-left text-xs font-semibold text-blue-700 hover:text-blue-900">View submitted receipt ↗</button>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </div>
                ))}

                {visibleBills.length === 0 && (
                  <div className="transaction-empty"><span>฿</span><strong>No matching bills</strong><p>{bills.length === 0 ? "New bills will appear here when the dormitory office issues them." : "Try another payment filter to see your records."}</p></div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="dashboard-panel rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Messages</h2>
                  <p className="text-sm text-slate-500">Join your group chat or start a private conversation with the dormitory admin.</p>
                </div>
                <button type="button" onClick={() => void handleStartAdminChat()} disabled={isStartingAdminChat} className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
                  {isStartingAdminChat ? "Opening chat…" : "Message Admin"}
                </button>
              </div>

              <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div className="dashboard-panel rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
                                    : "Direct message with Admin"}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">{thread.lastMessage ? `Last activity ${formatDateTime(thread.lastMessage.createdAt)}` : `Created ${formatDateTime(thread.createdAt)}`}</p>
                              </div>
                            </div>
                            {hasUnreadThread(thread, "student", selectedChatKey, studentId) && (
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

                <div className="dashboard-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  {selectedChatKey ? (
                    <>
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-slate-900">
                            {chatThreads.find((thread) => thread.chatKey === selectedChatKey)?.type === "GROUP"
                              ? `${chatThreads.find((thread) => thread.chatKey === selectedChatKey)?.audienceGender} Group Chat`
                              : "Direct message with Admin"}
                          </p>
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
                            <p className="mt-2 text-sm leading-6 break-words">{msg.content}</p>
                            <p className="mt-2 text-[11px] text-slate-400">{formatDateTime(msg.createdAt)}</p>
                          </div>
                        ))}
                      </div>

                      {chatError && (
                        <p className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                          {chatError}
                        </p>
                      )}

                      <form className="mt-4 flex gap-3" onSubmit={(event) => { event.preventDefault(); void handleSendMessage(); }}>
                        <input
                          value={newMessage}
                          onChange={(event) => setNewMessage(event.target.value)}
                          className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                          placeholder="Type a message..."
                        />
                        <button type="submit" disabled={!newMessage.trim()} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Send</button>
                      </form>
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
      {billToConfirm ? (
        <div className="payment-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && payingBillId === null) setBillToConfirm(null); }}>
          <section className="payment-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="payment-confirm-title">
            <div className="payment-modal-top"><span className="payment-modal-symbol">฿</span><button type="button" onClick={() => setBillToConfirm(null)} disabled={payingBillId !== null} aria-label="Close payment proof form">×</button></div>
            <span className="operations-eyebrow">MANUAL PAYMENT SUBMISSION</span>
            <h2 id="payment-confirm-title">Submit payment proof</h2>
            <p className="payment-modal-description">Upload the receipt from your payment to the dormitory office. Your bill remains outstanding until an administrator verifies the proof.</p>
            <div className="payment-receipt-preview">
              <div><span>Bill</span><strong>{billToConfirm.billingLabel}</strong></div>
              <div><span>Invoice</span><strong>#{String(billToConfirm.id).padStart(5, "0")}</strong></div>
              <div><span>Room</span><strong>{billToConfirm.roomNumber || "—"}</strong></div>
              <div><span>Amount</span><strong>฿{Number(billToConfirm.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
              <div><span>Due date</span><strong>{billToConfirm.dueDate ? formatDateTime(billToConfirm.dueDate) : "Not specified"}</strong></div>
            </div>
            <div className="payment-proof-fields">
              <label htmlFor="payment-reference">Receipt / transaction reference *</label>
              <input id="payment-reference" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} maxLength={120} placeholder="Enter the receipt or transaction number" />
              <label htmlFor="payment-proof-file">Payment slip or receipt (JPG, PNG, PDF; up to 5 MB) *</label>
              <input id="payment-proof-file" type="file" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" onChange={(event) => setPaymentProofFile(event.target.files?.[0] ?? null)} />
              {paymentProofFile ? <small className="payment-proof-selected">Selected: {paymentProofFile.name}</small> : null}
              <label htmlFor="payment-note">Note for the admin (optional)</label>
              <textarea id="payment-note" value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} maxLength={500} rows={2} placeholder="Add a short note if needed" />
            </div>
            <div className="payment-modal-note"><span>i</span><p>Submitting proof does not mark the bill as paid. The administrator must review the receipt and approve it first.</p></div>
            <div className="payment-modal-actions"><button type="button" onClick={() => setBillToConfirm(null)} disabled={payingBillId !== null} className="payment-cancel-button">Cancel</button><button type="button" onClick={() => void confirmBillPayment()} disabled={payingBillId !== null || paymentReference.trim().length < 3 || !paymentProofFile} className="payment-confirm-button">{payingBillId === billToConfirm.id ? "Submitting proof…" : "Submit for verification"}</button></div>
          </section>
        </div>
      ) : null}
      <ToastViewport toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}