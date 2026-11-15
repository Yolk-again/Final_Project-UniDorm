import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { AuthenticatedUser, Roles } from "../auth/auth.guard";
import { CreateBillDto } from "./dto/create-bill.dto";
import { SubmitPaymentDto } from "./dto/submit-payment.dto";
import { VerifyPaymentDto } from "./dto/verify-payment.dto";
import { PaymentService } from "./payment.service";

type RequestWithUser = { user: AuthenticatedUser };
const diskStorage = (require("multer") as { diskStorage: (options: any) => any }).diskStorage;

type UploadedProof = {
  filename: string;
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
};

function getPaymentProofDirectory() {
  return resolve(process.env.PAYMENT_PROOF_DIR || join(process.cwd(), "uploads", "payment-proofs"));
}
const ALLOWED_PROOF_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

function validateProofSignature(file: UploadedProof) {
  const header = readFileSync(file.path).subarray(0, 8);
  if (file.mimetype === "application/pdf") return header.subarray(0, 5).toString() === "%PDF-";
  if (file.mimetype === "image/png") return header.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === "image/jpeg") return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  return false;
}

@Controller("payments")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @Roles("admin")
  getAllBills() {
    return this.paymentService.getAllBills();
  }

  @Get(":studentId")
  @Roles("student", "admin")
  getBills(@Req() request: RequestWithUser, @Param("studentId") studentId: string) {
    if (request.user.role === "student" && request.user.studentId !== studentId) {
      return this.paymentService.rejectForeignAccount();
    }
    return this.paymentService.getBills(studentId);
  }

  @Post()
  @Roles("admin")
  createBill(@Body() body: CreateBillDto) {
    return this.paymentService.createBill(body);
  }

  @Post(":id/submit")
  @Roles("student")
  @UseInterceptors(
    FileInterceptor("proof", {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          const directory = getPaymentProofDirectory();
          mkdirSync(directory, { recursive: true });
          callback(null, directory);
        },
        filename: (_request, file, callback) => {
          const extension = ALLOWED_PROOF_TYPES[file.mimetype];
          callback(null, `${randomUUID()}${extension}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
      fileFilter: (_request, file, callback) => {
        if (!ALLOWED_PROOF_TYPES[file.mimetype]) {
          callback(new BadRequestException("Payment proof must be a JPG, PNG, or PDF file"), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async submitPayment(
    @Req() request: RequestWithUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: SubmitPaymentDto,
    @UploadedFile() file?: UploadedProof,
  ) {
    if (file && (!existsSync(file.path) || !validateProofSignature(file))) {
      if (file.path && existsSync(file.path)) unlinkSync(file.path);
      throw new BadRequestException("The uploaded proof does not match its file type");
    }

    try {
      return await this.paymentService.submitPayment(
        id,
        request.user.studentId ?? "",
        body,
        file,
      );
    } catch (error) {
      if (file?.path && existsSync(file.path)) unlinkSync(file.path);
      throw error;
    }
  }

  @Patch(":id/verify")
  @Roles("admin")
  verifyPayment(
    @Req() request: RequestWithUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: VerifyPaymentDto,
  ) {
    return this.paymentService.verifyPayment(
      id,
      request.user.id,
      body.decision,
      body.rejectionReason,
    );
  }

  @Get(":id/submissions/:submissionId/proof")
  @Header("Cache-Control", "private, no-store")
  @Roles("student", "admin")
  async getSubmissionProof(
    @Req() request: RequestWithUser,
    @Param("id", ParseIntPipe) id: number,
    @Param("submissionId", ParseIntPipe) submissionId: number,
  ) {
    const proof = await this.paymentService.getSubmissionProof(id, submissionId, request.user);
    const safeName = proof.originalName.replace(/[\r\n"\\]/g, "_");
    return new StreamableFile(readFileSync(proof.filePath), {
      type: proof.mimeType,
      disposition: `inline; filename="${safeName}"`,
    });
  }

  @Get(":id/proof")
  @Header("Cache-Control", "private, no-store")
  @Roles("student", "admin")
  async getPaymentProof(
    @Req() request: RequestWithUser,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const proof = await this.paymentService.getPaymentProof(id, request.user);
    const safeName = proof.originalName.replace(/[\r\n"\\]/g, "_");
    return new StreamableFile(readFileSync(proof.filePath), {
      type: proof.mimeType,
      disposition: `inline; filename="${safeName}"`,
    });
  }
}
