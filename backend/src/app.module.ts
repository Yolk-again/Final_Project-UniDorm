import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RoomModule } from "./room/room.module";
import { BookingModule } from "./booking/booking.module";
import { AnnouncementModule } from "./announcement/announcement.module";
import { ChatModule } from "./chat/chat.module";
import { PaymentModule } from "./payment/payment.module";

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    RoomModule,
    BookingModule,
    AnnouncementModule,
    ChatModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}