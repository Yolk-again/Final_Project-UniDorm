import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RoomModule } from "./room/room.module";
import { BookingModule } from "./booking/booking.module";
import { AnnouncementModule } from "./announcement/announcement.module";
import { ChatModule } from "./chat/chat.module";
import { PaymentModule } from "./payment/payment.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "backend/.env"],
    }),
    AuthModule,
    PrismaModule,
    RoomModule,
    BookingModule,
    AnnouncementModule,
    ChatModule,
    PaymentModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
