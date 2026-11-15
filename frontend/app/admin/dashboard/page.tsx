/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import LiveClock from "../../components/LiveClock";
import NotificationCenter from "../../components/NotificationCenter";
import ToastViewport, { type ToastMessage } from "../../components/ToastViewport";
import { formatDateTime } from "../../lib/date-time";

function hasUnreadThread(
  thread: any,
  selectedChatKey: string,
  currentUserId = "",
) {
  if (selectedChatKey === thread.chatKey) return false;
  if (!thread.lastMessage) return false;
  if (
    thread.lastMessage.senderRole === "admin" &&
    thread.lastMessage.senderId === currentUserId
  ) {
    return false;
  }

  if (thread.lastReadMessageId !== null && thread.lastReadMessageId !== undefined) {
    return Number(thread.lastMessage.id) > Number(thread.lastReadMessageId);
  }
  const lastRead = thread.lastReadAt;
  if (!lastRead) return true;
  return new Date(thread.lastMessage.createdAt).getTime() > new Date(lastRead).getTime();
}

export default function AdminDashboard() {
  const router = useRouter();
  const publishingAnnouncementRef = useRef(false);
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
  const [isPublishingAnnouncement, setIsPublishingAnnouncement] = useState(false);
  const [bills, setBills] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [adminView, setAdminView] = useState<"rooms" | "requests" | "announcements" | "payments" | "chat">("rooms");

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [bookingActionId, setBookingActionId] = useState<number | null>(null);

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

    setAuthChecked(true);
    refresh();
  }, [router]);

  useEffect(() => {
    if (authChecked) {
      localStorage.setItem(
        "hiddenBookingIds_admin",
        JSON.stringify(hiddenBookingIds),
      );
    }
  }, [hiddenBookingIds, authChecked]);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await ensureGroupChats();

      const [roomsRes, bookingsRes, announcementsRes, chatRes, billRes] = await Promise.all([
        apiFetch("/rooms"),
        apiFetch("/bookings"),
        apiFetch("/announcements"),
        apiFetch("/chat/threads"),
        apiFetch("/payments"),
      ]);

      const [roomsData, bookingsData, announcementsData, chatData, billData] = await Promise.all([
        roomsRes.json(),
        bookingsRes.json(),
        announcementsRes.json(),
        chatRes.json(),
        billRes.json(),
      ]);

      setRoomList(Array.isArray(roomsData) ? roomsData : []);
      setBookingRequests(Array.isArray(bookingsData) ? bookingsData : []);
      setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
      setChatThreads(Array.isArray(chatData) ? chatData : []);
      setBills(Array.isArray(billData) ? billData : []);
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setToast({ title: "Could not refresh workspace", description: "Check that the UniDorm API is running, then try again.", tone: "error" });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authChecked) return;

    const syncWorkspace = async () => {
      try {
        const [roomsRes, bookingsRes, announcementsRes, chatRes, billRes] = await Promise.all([
          apiFetch("/rooms"),
          apiFetch("/bookings"),
          apiFetch("/announcements"),
          apiFetch("/chat/threads"),
          apiFetch("/payments"),
        ]);
        const [roomsData, bookingsData, announcementsData, chatData, billData] = await Promise.all([
          roomsRes.json(),
          bookingsRes.json(),
          announcementsRes.json(),
          chatRes.json(),
          billRes.json(),
        ]);
        setRoomList(Array.isArray(roomsData) ? roomsData : []);
        setBookingRequests(Array.isArray(bookingsData) ? bookingsData : []);
        setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
        setChatThreads(Array.isArray(chatData) ? chatData : []);
        setBills(Array.isArray(billData) ? billData : []);
        setLastSyncedAt(new Date());
      } catch (error) {
        console.error("Background workspace sync failed:", error);
      }
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void syncWorkspace();
    }, 60000);

    return () => window.clearInterval(timer);
  }, [authChecked]);

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
      if (!res.ok) throw new Error("Could not load this chat thread.");
      const data = await res.json();
      setChatMessages(Array.isArray(data) ? data : []);
      setSelectedChatKey(chatKey);

      try {
        const readResponse = await apiFetch(`/chat/threads/${encodeURIComponent(chatKey)}/read`, { method: "PATCH" });
        if (!readResponse.ok) throw new Error(await readResponse.text().catch(() => "Read receipt could not be saved."));
        const readState = await readResponse.json();
        setChatThreads((prev) => prev.map((thread) => thread.chatKey === chatKey
          ? { ...thread, lastReadAt: readState.lastReadAt, lastReadMessageId: readState.lastReadMessageId }
          : thread));
      } catch (readError) {
        console.error("Could not persist admin chat read receipt:", readError);
      }
    } catch (error) {
      console.error("Failed to fetch or mark chat as read:", error);
      setToast({
        title: "Could not load chat",
        description: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
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
        console.error("Missing admin ID for direct chat");
        return;
      }
      const res = await apiFetch("/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DIRECT",
          studentId: directStudentId.trim(),
        }),
      });
      const thread = await res.json();
      if (!res.ok) throw new Error(thread.message || "Could not create direct chat");
      setChatThreads((prev) => [thread, ...prev.filter((t) => t.chatKey !== thread.chatKey)]);
      setSelectedChatKey(thread.chatKey);
      if (firstChatMessage.trim()) {
        const messageResponse = await apiFetch(`/chat/threads/${encodeURIComponent(thread.chatKey)}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: firstChatMessage.trim() }),
        });
        const messageResult = await messageResponse.json().catch(() => ({}));
        if (!messageResponse.ok) throw new Error(messageResult.message || "Could not send the first message");
        setFirstChatMessage("");
      }
      await fetchChatMessages(thread.chatKey);
    } catch (error) {
      console.error(error);
    }
  };

  const createAnnouncement = async () => {
    // Prevent rapid double-clicks from sending a second request after the form resets.
    if (publishingAnnouncementRef.current) return;

    const title = announcementForm.title.trim();
    const content = announcementForm.content.trim();
    if (!title || !content) {
      setToast({
        title: "Complete announcement details",
        description: "Enter both an announcement title and its content before publishing.",
        tone: "error",
      });
      return;
    }

    publishingAnnouncementRef.current = true;
    setIsPublishingAnnouncement(true);

    try {
      const res = await apiFetch("/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          audience: announcementForm.audience,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message;
        throw new Error(message || "Could not create announcement");
      }

      const createdAnnouncement = data?.announcement ?? data?.data ?? data;
      if (createdAnnouncement && typeof createdAnnouncement === "object" && createdAnnouncement.id != null) {
        setAnnouncements((prev) => [
          createdAnnouncement,
          ...prev.filter((item) => item.id !== createdAnnouncement.id),
        ]);
      } else {
        await refresh();
      }

      setAnnouncementForm({ title: "", content: "", audience: "ALL" });
      setToast({
        title: "Announcement published",
        description: "Your announcement is now available to its selected audience.",
        tone: "success",
      });
    } catch (error) {
      console.error("Could not publish announcement:", error);
      setToast({
        title: "Could not publish announcement",
        description: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
    } finally {
      publishingAnnouncementRef.current = false;
      setIsPublishingAnnouncement(false);
    }
  };

  const openPaymentProof = async (bill: any) => {
    const previewWindow = window.open("about:blank", "_blank");
    try {
      const response = await apiFetch(`/payments/${bill.id}/proof`);
      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details.message || "Could not load payment proof");
      }
      const proofBlob = await response.blob();
      const proofUrl = URL.createObjectURL(proofBlob);
      if (previewWindow) {
        previewWindow.location.href = proofUrl;
      } else {
        const anchor = document.createElement("a");
        anchor.href = proofUrl;
        anchor.download = bill.proofOriginalName || `payment-proof-${bill.id}`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(proofUrl), 60000);
    } catch (error) {
      previewWindow?.close();
      setToast({
        title: "Could not open payment proof",
        description: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
    }
  };

  const openPaymentSubmissionProof = async (billId: number, submission: any) => {
    const previewWindow = window.open("about:blank", "_blank");
    try {
      const response = await apiFetch(`/payments/${billId}/submissions/${submission.id}/proof`);
      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details.message || "Could not load historical payment proof");
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
        title: "Could not open receipt history",
        description: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
    }
  };

  const reviewPayment = async (bill: any, decision: "APPROVE" | "REJECT") => {
    let rejectionReason = "";
    if (decision === "APPROVE") {
      const confirmed = window.confirm(
        `Verify payment for invoice #${String(bill.id).padStart(5, "0")}? Only approve after checking the attached receipt against the actual payment record.`,
      );
      if (!confirmed) return;
    } else {
      const reason = window.prompt("Explain why this payment proof is being rejected:");
      if (reason === null) return;
      rejectionReason = reason.trim();
      if (!rejectionReason) {
        setToast({ title: "A rejection reason is required", description: "Enter a short reason so the student knows what to correct.", tone: "error" });
        return;
      }
    }

    try {
      const response = await apiFetch(`/payments/${bill.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, rejectionReason }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Could not review payment");
      await refresh();
      setToast({
        title: decision === "APPROVE" ? "Payment verified" : "Payment proof rejected",
        description: decision === "APPROVE" ? "The bill is now recorded as paid." : "The student can submit corrected proof.",
        tone: decision === "APPROVE" ? "success" : "info",
      });
    } catch (error) {
      setToast({ title: "Payment review failed", description: error instanceof Error ? error.message : "Please try again.", tone: "error" });
    }
  };

  const createBill = async () => {
    const amount = Number(paymentForm.amount);
    const dueDate = new Date(paymentForm.dueDate);
    if (
      !paymentForm.studentId.trim() ||
      !paymentForm.category ||
      !paymentForm.cycle ||
      !paymentForm.billingLabel.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !paymentForm.dueDate ||
      Number.isNaN(dueDate.getTime()) ||
      !paymentForm.roomNumber.trim()
    ) {
      setToast({ title: "Complete all bill details", description: "Student ID, category, cycle, billing label, positive amount, due date, and room number are all required.", tone: "error" });
      return;
    }
    try {
      const res = await apiFetch("/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...paymentForm, dueDate: dueDate.toISOString() }),
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
      setToast({ title: "Bill created", description: `${data.billingLabel || "The new bill"} is now in the payment ledger.`, tone: "success" });
    } catch (error) {
      console.error(error);
      setToast({ title: "Could not create bill", description: error instanceof Error ? error.message : "Please check the details and try again.", tone: "error" });
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

  const availableRoomCount = roomList.filter((room) => getRoomStatus(room.roomNumber) === "Available").length;
  const availableMaleRoomCount = roomList.filter((room) => getRoomStatus(room.roomNumber) === "Available" && String(room.gender).toLowerCase() === "male").length;
  const availableFemaleRoomCount = roomList.filter((room) => getRoomStatus(room.roomNumber) === "Available" && String(room.gender).toLowerCase() === "female").length;
  const occupiedRoomCount = roomList.filter((room) => getRoomStatus(room.roomNumber) === "Occupied").length;
  const pendingBills = bills.filter((bill) => ["PENDING", "REJECTED"].includes(String(bill.status).toUpperCase()));
  const submittedBills = bills.filter((bill) => String(bill.status).toUpperCase() === "SUBMITTED");
  const paidBills = bills.filter((bill) => String(bill.status).toUpperCase() === "PAID");
  const pendingBillCount = pendingBills.length;
  const submittedBillCount = submittedBills.length;
  const paidBillTotal = paidBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  const pendingBillTotal = pendingBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  const occupancyRate = roomList.length ? Math.round((occupiedRoomCount / roomList.length) * 100) : 0;
  const recentBills = [...bills].sort((a, b) => {
    const aSubmitted = String(a.status).toUpperCase() === "SUBMITTED" ? 1 : 0;
    const bSubmitted = String(b.status).toUpperCase() === "SUBMITTED" ? 1 : 0;
    if (aSubmitted !== bSubmitted) return bSubmitted - aSubmitted;
    const aDate = new Date(a.submittedAt || a.createdAt || a.dueDate || 0).getTime();
    const bDate = new Date(b.submittedAt || b.createdAt || b.dueDate || 0).getTime();
    return bDate - aDate;
  });

  const handleHideBooking = (booking: any) => {
    setHiddenBookingIds((prev) => {
      if (prev.includes(booking.id)) return prev;
      return [...prev, booking.id];
    });
  };

  const handleBookingStatus = async (booking: any, status: string) => {
    setBookingActionId(booking.id);
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
      setToast({ title: status === "Approved" ? "Booking approved" : "Booking request declined", description: `Room ${booking.roomNumber} has been updated.`, tone: "success" });
    } catch (error) {
      console.error("Failed to update booking:", error);
      setToast({ title: "Booking update failed", description: error instanceof Error ? error.message : "Please try again.", tone: "error" });
    } finally {
      setBookingActionId(null);
    }
  };

  if (!authChecked) {
    return (
      <div className="admin-dashboard min-h-screen px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="rounded-2xl border border-white/60 bg-white/80 px-6 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard page-transition min-h-screen overflow-x-hidden px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
      <div className="dashboard-container mx-auto max-w-7xl">
        <div className="dashboard-header admin-titlebar mb-6 rounded-[2rem] border border-white/60 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6">
          <div className="admin-titlebar-layout">
            <div className="admin-titlebar-brand min-w-0">
              <p className="text-sm font-semibold tracking-[0.35em] uppercase">Unidorm</p>
              <h1 className="mt-1 text-3xl font-bold">Admin Dashboard</h1>
              <p className="mt-1 text-sm">Manage rooms, residents, payments and communication.</p>
            </div>

            <nav className="admin-titlebar-nav dashboard-nav" aria-label="Admin management tabs">
              {[
                { key: "rooms", label: "Rooms" },
                { key: "requests", label: "Bookings" },
                { key: "announcements", label: "Announcements" },
                { key: "payments", label: "Payments" },
                { key: "chat", label: "Messages" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={adminView === item.key}
                  onClick={() => setAdminView(item.key as any)}
                  className={`dashboard-tab relative rounded-md px-4 py-2 text-sm font-semibold transition ${adminView === item.key ? "is-active bg-white text-blue-600 shadow-sm" : "text-slate-600"} ${item.key === "chat" ? "pr-8" : ""}`}
                >
                  {item.label}
                  {item.key === "chat" && chatThreads.some((thread: any) => hasUnreadThread(thread, selectedChatKey, adminId)) && (
                    <span role="status" aria-label="Unread messages" className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  )}
                </button>
              ))}
            </nav>

            <div className="workspace-header-actions admin-titlebar-tools">
              <NotificationCenter onNavigate={(target) => {
                const nextView: Record<string, "rooms" | "requests" | "announcements" | "payments" | "chat"> = {
                  "admin:rooms": "rooms",
                  "admin:requests": "requests",
                  "admin:announcements": "announcements",
                  "admin:payments": "payments",
                  "admin:chat": "chat",
                };
                if (target && nextView[target]) setAdminView(nextView[target]);
              }} />
              <LiveClock />
              <div className="workspace-sync-copy">
                <span className="workspace-sync-label">DATA SYNC</span>
                <strong>{lastSyncedAt ? `Updated ${formatDateTime(lastSyncedAt)}` : "Waiting for first sync"}</strong>
              </div>
              <button type="button" onClick={() => void refresh()} disabled={isRefreshing} className="workspace-refresh-button">
                <span className={isRefreshing ? "refresh-glyph is-spinning" : "refresh-glyph"}>↻</span>
                {isRefreshing ? "Refreshing" : "Refresh"}
              </button>
              <button onClick={handleLogout} className="workspace-logout-button">
                Logout <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>
        </div>

        <section className="dashboard-stats-grid" aria-label="Dormitory overview">
          <article className="dashboard-stat-card stat-blue"><span className="stat-symbol" aria-hidden="true">⌂</span><div><p>Total rooms</p><strong>{roomList.length}</strong><small>Across all buildings</small></div></article>
          <article className="dashboard-stat-card stat-mint"><span className="stat-symbol" aria-hidden="true">✓</span><div><p>Available rooms</p><strong>{availableRoomCount}</strong><small>{availableMaleRoomCount} male · {availableFemaleRoomCount} female</small></div></article>
          <article className="dashboard-stat-card stat-amber"><span className="stat-symbol" aria-hidden="true">◷</span><div><p>Pending requests</p><strong>{pendingBookingRequests.length}</strong><small>Awaiting your review</small></div></article>
          <article className="dashboard-stat-card stat-violet"><span className="stat-symbol" aria-hidden="true">฿</span><div><p>Outstanding bills</p><strong>{pendingBillCount}</strong><small>{submittedBillCount} receipts awaiting review</small></div></article>
        </section>

        <section className="operations-overview" aria-label="Operations overview">
          <div className="operations-card occupancy-card">
            <div className="operations-card-heading">
              <div><span className="operations-eyebrow">DORM CAPACITY</span><h2>Occupancy snapshot</h2></div>
              <span className="operations-live-tag"><i /> LIVE DATA</span>
            </div>
            <div className="occupancy-content">
              <div className="occupancy-ring" style={{ background: `conic-gradient(#5b73ee ${occupancyRate}%, #e8edf7 0)` }}>
                <div><strong>{occupancyRate}%</strong><span>occupied</span></div>
              </div>
              <div className="occupancy-legend">
                <div><span className="legend-dot dot-occupied" /><span>Occupied</span><strong>{occupiedRoomCount}</strong></div>
                <div><span className="legend-dot dot-available" /><span>Available · {availableMaleRoomCount} Male / {availableFemaleRoomCount} Female</span><strong>{availableRoomCount}</strong></div>
                <div><span className="legend-dot dot-reserved" /><span>Reserved</span><strong>{Math.max(roomList.length - occupiedRoomCount - availableRoomCount, 0)}</strong></div>
              </div>
            </div>
          </div>
          <div className="operations-card finance-card">
            <div className="operations-card-heading">
              <div><span className="operations-eyebrow">PAYMENT OVERVIEW</span><h2>Collection summary</h2></div>
              <span className="finance-icon">฿</span>
            </div>
            <div className="finance-total-row"><span>Recorded as paid</span><strong>฿{paidBillTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
            <div className="finance-progress-track"><span style={{ width: `${paidBillTotal + pendingBillTotal > 0 ? (paidBillTotal / (paidBillTotal + pendingBillTotal)) * 100 : 0}%` }} /></div>
            <div className="finance-foot-row"><span><i className="legend-dot dot-paid" /> {paidBills.length} verified bills</span><strong>฿{pendingBillTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} outstanding</strong></div>
            <button type="button" className="text-link-button" onClick={() => setAdminView("payments")}>Open payment ledger <span>↗</span></button>
          </div>
          <div className="operations-card attention-card">
            <div className="operations-card-heading"><div><span className="operations-eyebrow">NEEDS ATTENTION</span><h2>Action queue & updates</h2></div><span className="attention-count">{pendingBookingRequests.length + pendingBillCount + submittedBillCount}</span></div>
            <div className="attention-row"><span className="attention-symbol booking-symbol">⌂</span><div><strong>{pendingBookingRequests.length} booking requests</strong><small>Waiting for your review</small></div><button type="button" onClick={() => setAdminView("requests")}>Review</button></div>
            <div className="attention-row"><span className="attention-symbol bill-symbol">฿</span><div><strong>{pendingBillCount} outstanding bills</strong><small>Awaiting payment or corrected proof</small></div><button type="button" onClick={() => setAdminView("payments")}>View</button></div>
            <div className="attention-row"><span className="attention-symbol bill-symbol">✓</span><div><strong>{submittedBillCount} payment proofs</strong><small>Waiting for administrator verification</small></div><button type="button" onClick={() => setAdminView("payments")}>Review</button></div>
            <div className="attention-row"><span className="attention-symbol announcement-symbol">✳</span><div><strong>{announcements.length} announcements</strong><small>Published dorm updates</small></div><button type="button" onClick={() => setAdminView("announcements")}>Open</button></div>
          </div>
        </section>

        {adminView === "rooms" && (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="dashboard-panel h-fit rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.10)] sm:p-8 backdrop-blur-xl">
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
            <section className="dashboard-panel rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
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
                      className="room-tile rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
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
                          <p className="mt-2 text-xs text-slate-400">Added {formatDateTime(r.createdAt)} · Updated {formatDateTime(r.updatedAt)}</p>

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
          </div>
        </div>
        )}

        {adminView === "requests" && (

            <section className="dashboard-panel rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
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
                        <p className="mt-2 text-xs text-slate-400">Submitted {formatDateTime(b.createdAt)} · Updated {formatDateTime(b.updatedAt)}</p>
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
                        disabled={bookingActionId === b.id}
                        className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60"
                      >
                        {bookingActionId === b.id ? "Updating…" : "Approve"}
                      </button>
                      <button
                        onClick={() => handleBookingStatus(b, "Rejected")}
                        disabled={bookingActionId === b.id}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                      >
                        {bookingActionId === b.id ? "Updating…" : "Reject"}
                      </button>
                    </div>
                  </div>
                ))}
                {pendingBookingRequests.length === 0 && (
                  <p className="text-sm text-slate-500">No booking requests at the moment.</p>
                )}
              </div>
            </section>



        )}

        {adminView === "announcements" && (
            <section className="dashboard-panel rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Announcements</h2>
                <p className="text-sm text-slate-500">
                  Publish dorm updates for all or gender-specific residents.
                </p>
              </div>

              <div className="announcements-workspace-grid grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                <div className="dashboard-panel rounded-2xl border border-slate-200 bg-slate-50 p-6">
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
                      disabled={isPublishingAnnouncement}
                      aria-busy={isPublishingAnnouncement}
                      className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPublishingAnnouncement ? "Publishing…" : "Publish Announcement"}
                    </button>
                  </div>
                </div>

                <div className="announcements-list-panel min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-xl font-bold text-slate-900">Published announcements</h3><p className="text-sm text-slate-500">Your recently created dorm updates.</p></div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{announcements.length} published</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {announcements.map((announcement) => (
                    <article key={announcement.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h4 className="font-bold text-slate-900">{announcement.title}</h4>
                        <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">{announcement.audience === "ALL" ? "All residents" : announcement.audience === "MALE" ? "Male residents" : "Female residents"}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{announcement.content}</p>
                      <p className="mt-4 text-xs text-slate-400">{announcement.createdAt ? formatDateTime(announcement.createdAt) : "Published"}</p>
                    </article>
                  ))}
                  {announcements.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-400">No announcements have been published yet.</p>}
                </div>
                </div>
              </div>
            </section>
        )}

        {adminView === "payments" && (
          <section className="dashboard-panel rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            <div className="payments-panel-heading mb-6">
              <div><span className="operations-eyebrow">BILLING CONTROL</span><h2 className="text-2xl font-bold text-slate-900">Payments & transactions</h2>
                <p className="text-sm text-slate-500">Create student bills and review the current payment ledger.</p></div>
              <div className="payment-ledger-badge"><span className="payment-ledger-pulse" /> {bills.length} records</div>
            </div>
            <div className="ledger-summary-grid">
              <div><span>Verified collected</span><strong>฿{paidBillTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong><small>{paidBills.length} verified records</small></div>
              <div><span>Awaiting verification</span><strong>{submittedBillCount}</strong><small>Submitted receipts to review</small></div>
              <div><span>Outstanding</span><strong>฿{pendingBillTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong><small>{pendingBills.length} unpaid records</small></div>
            </div>
            <div className="dashboard-panel rounded-2xl border border-slate-200 bg-white p-6">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Student ID *</label>
                  <input
                    required
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
                    <label className={labelClass}>Category *</label>
                    <select
                      required
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
                    <label className={labelClass}>Cycle *</label>
                    <select
                      required
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
                  <label className={labelClass}>Billing Label *</label>
                  <input
                    required
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
                    <label className={labelClass}>Amount *</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
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
                    <label className={labelClass}>Due Date & Time *</label>
                    <input
                      required
                      type="datetime-local"
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
                  <label className={labelClass}>Room Number *</label>
                  <input
                    required
                    style={{ textTransform: "uppercase" }}
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
                  Create bill <span aria-hidden="true">↗</span>
                </button>
              </div>
            </div>
            <div className="transaction-ledger-wrap">
              <div className="transaction-ledger-heading"><div><h3>Payment verification & bill activity</h3><p>{submittedBillCount} payment submissions awaiting administrator review</p></div><span>LIVE LEDGER</span></div>
              {recentBills.length ? <div className="transaction-list">
                {recentBills.map((bill) => {
                  const status = String(bill.status).toUpperCase();
                  return (
                    <article className="transaction-row payment-review-row" key={bill.id}>
                      <span className={`transaction-icon ${status === "PAID" ? "transaction-paid" : status === "SUBMITTED" ? "transaction-submitted" : "transaction-pending"}`}>{String(bill.category).toUpperCase() === "ELECTRIC" ? "ϟ" : String(bill.category).toUpperCase() === "WATER" ? "◉" : "⌂"}</span>
                      <div className="transaction-main"><strong>{bill.billingLabel || `${bill.category} bill`}</strong><span>#{bill.id} · {bill.studentId || "Student"} · Room {bill.roomNumber || "—"}</span>
                        {status === "SUBMITTED" ? <small>Reference: {bill.paymentReference || "—"} · Submitted {bill.submittedAt ? formatDateTime(bill.submittedAt) : "just now"}</small> : null}
                        {status === "SUBMITTED" && bill.paymentNote ? <small>Student note: {bill.paymentNote}</small> : null}
                        {status === "REJECTED" && bill.rejectionReason ? <small className="text-rose-600">Rejected: {bill.rejectionReason}</small> : null}
                      </div>
                      <div className="transaction-amount"><strong>฿{Number(bill.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong><span>{status === "PAID" && bill.paidAt ? `Verified ${formatDateTime(bill.paidAt)}` : bill.dueDate ? `Due ${formatDateTime(bill.dueDate)}` : "No due date"}</span><small className="block text-[11px] text-slate-400">Created {formatDateTime(bill.createdAt)}</small></div>
                      <span className={`transaction-status ${status === "PAID" ? "status-settled" : status === "SUBMITTED" ? "status-submitted" : status === "REJECTED" ? "status-rejected" : "status-awaiting"}`}>{status === "PAID" ? "Verified" : status === "SUBMITTED" ? "Review" : status === "REJECTED" ? "Rejected" : "Outstanding"}</span>
                      {status === "SUBMITTED" ? <div className="payment-review-actions"><button type="button" onClick={() => void openPaymentProof(bill)}>View proof</button><button type="button" onClick={() => void reviewPayment(bill, "APPROVE")}>Verify</button><button type="button" onClick={() => void reviewPayment(bill, "REJECT")}>Reject</button></div> : null}
                      {Array.isArray(bill.submissions) && bill.submissions.length > 0 ? <details className="payment-submission-history"><summary>Receipt history ({bill.submissions.length})</summary><div className="payment-submission-history-list">{bill.submissions.map((submission: any) => <div className="payment-submission-history-item" key={submission.id}><div><strong>{submission.paymentReference}</strong><span>{String(submission.status).toUpperCase()} · Submitted {formatDateTime(submission.submittedAt)}</span>{submission.reviewedAt ? <span>Reviewed {formatDateTime(submission.reviewedAt)}{submission.reviewer?.name ? ` by ${submission.reviewer.name}` : ""}</span> : null}{submission.rejectionReason ? <span className="text-rose-600">Reason: {submission.rejectionReason}</span> : null}</div><button type="button" onClick={() => void openPaymentSubmissionProof(bill.id, submission)}>View receipt</button></div>)}</div></details> : null}
                    </article>
                  );
                })}
              </div> : <div className="transaction-empty"><span>฿</span><strong>No transactions yet</strong><p>New student bills will appear here after they are created.</p></div>}
            </div>
          </section>
        )}

        {adminView === "chat" && (
          <div className="admin-chat-layout">
            <section className="dashboard-panel chat-management-panel rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Messaging & Chat</h2>
                <p className="text-sm text-slate-500">
                  Create group chats and message students directly.
                </p>
              </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <div className="dashboard-panel rounded-2xl border border-slate-200 bg-slate-50 p-6">
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
                        placeholder="Type an optional first message"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={createDirectChat}
                      className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      Open Direct Chat
                    </button>
                  </div>
                </div>

                <div className="dashboard-panel rounded-2xl border border-slate-200 bg-white p-6">
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
                            <p className="mt-1 text-xs text-slate-400">{thread.lastMessage ? `Last activity ${formatDateTime(thread.lastMessage.createdAt)}` : `Created ${formatDateTime(thread.createdAt)}`}</p>
                          </div>
                          {hasUnreadThread(thread, selectedChatKey, adminId) && (
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

            <section className="dashboard-panel selected-chat-panel rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Selected Chat</h2>
                <p className="text-sm text-slate-500">
                  View the selected chat thread and send replies.
                </p>
              </div>

              {selectedChatKey ? (
                <div className="selected-chat-content space-y-4">
                  <div className="dashboard-panel selected-chat-thread rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">
                          {chatThreads.find((thread) => thread.chatKey === selectedChatKey)?.type === "GROUP"
                            ? `${chatThreads.find((thread) => thread.chatKey === selectedChatKey)?.audienceGender} Group Chat`
                            : "Direct Chat"}
                        </p>
                      </div>
                    </div>

                    <div className="chat-message-list space-y-3 max-h-[420px] overflow-y-auto pr-2">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`chat-message-bubble max-w-[min(82%,680px)] rounded-2xl p-4 ${
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
                          <p className="mt-2 text-sm leading-6 break-words">{message.content}</p>
                          <p className="mt-2 text-[11px] text-slate-400">{formatDateTime(message.createdAt)}</p>
                        </div>
                      ))}

                      {chatMessages.length === 0 && (
                        <p className="text-sm text-slate-400">Select a chat to view messages.</p>
                      )}
                    </div>

                    <form className="chat-composer mt-4 flex gap-3" onSubmit={(event) => { event.preventDefault(); void sendChatMessage(); }}>
                      <input
                        type="text"
                        value={newChatMessage}
                        onChange={(e) => setNewChatMessage(e.target.value)}
                        placeholder="Type message..."
                        className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                  Select a chat thread to view messages and reply.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
      <ToastViewport toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}