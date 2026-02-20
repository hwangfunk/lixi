import { NextResponse } from "next/server";

import { maskPhone } from "@/lib/phone";
import { registerParticipant } from "@/lib/server/repositories";
import { registerSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dữ liệu không hợp lệ.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { participant, spin, isExistingPhone } = registerParticipant(parsed.data.name, parsed.data.phone);

    const responseBody: {
      participantId: string;
      name: string;
      phoneMasked: string;
      hasSpun: boolean;
      isExistingPhone: boolean;
      existingPrize?: {
        label: string;
        amount: number;
      };
    } = {
      participantId: participant.id,
      name: participant.name,
      phoneMasked: maskPhone(participant.normalizedPhone),
      hasSpun: Boolean(spin),
      isExistingPhone,
    };

    if (spin) {
      responseBody.existingPrize = {
        label: spin.prizeLabel,
        amount: spin.prizeAmount,
      };
    }

    return NextResponse.json(responseBody, {
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("register_post_error", error);
    return NextResponse.json({ error: "Không thể đăng ký lúc này." }, { status: 500 });
  }
}
