CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");
CREATE INDEX "Room_gender_roomNumber_idx" ON "Room"("gender", "roomNumber");
CREATE INDEX "Booking_studentId_status_idx" ON "Booking"("studentId", "status");
CREATE INDEX "Booking_roomNumber_status_idx" ON "Booking"("roomNumber", "status");
CREATE INDEX "Announcement_audience_createdAt_idx" ON "Announcement"("audience", "createdAt");
CREATE INDEX "ChatThread_studentId_status_idx" ON "ChatThread"("studentId", "status");
CREATE INDEX "ChatThread_adminId_status_idx" ON "ChatThread"("adminId", "status");
CREATE INDEX "ChatMessage_chatKey_createdAt_idx" ON "ChatMessage"("chatKey", "createdAt");
CREATE INDEX "PaymentBill_studentId_status_dueDate_idx" ON "PaymentBill"("studentId", "status", "dueDate");
