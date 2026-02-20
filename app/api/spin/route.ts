import { NextResponse } from "next/server";

import { createSpinForParticipant } from "@/lib/server/repositories";
import { spinSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = spinSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Yêu cầu quay không hợp lệ.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = createSpinForParticipant(parsed.data.participantId);

    return NextResponse.json(
      {
        status: result.status,
        prize: {
          label: result.spin.prizeLabel,
          amount: result.spin.prizeAmount,
        },
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("spin_post_error", error);

    if (error instanceof Error && error.message === "participant_not_found") {
      return NextResponse.json({ error: "Không tìm thấy người chơi." }, { status: 404 });
    }

    return NextResponse.json({ error: "Không thể quay lúc này." }, { status: 500 });
  }
}
