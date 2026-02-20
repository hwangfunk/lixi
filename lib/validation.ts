import { z } from "zod";

import { isVietnamPhone } from "@/lib/phone";
import type { PrizeLabel } from "@/lib/prizes";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên cần có ít nhất 2 ký tự.")
    .max(60, "Tên không được dài quá 60 ký tự."),
  phone: z
    .string()
    .trim()
    .min(8, "Số điện thoại không hợp lệ.")
    .max(20, "Số điện thoại không hợp lệ.")
    .refine(isVietnamPhone, "Số điện thoại Việt Nam không hợp lệ."),
});

export const spinSchema = z.object({
  participantId: z.string().uuid("Mã người chơi không hợp lệ."),
});

export type RegisterPayload = z.infer<typeof registerSchema>;
export type SpinPayload = z.infer<typeof spinSchema>;

export interface SpinResult {
  status: "ok" | "already_spun";
  prize: {
    label: PrizeLabel;
    amount: number;
  };
}
