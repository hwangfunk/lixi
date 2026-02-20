import { NextResponse } from "next/server";

import { listAdminEntries } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configuredPasscode = process.env.ADMIN_PASSCODE;

  if (!configuredPasscode) {
    return NextResponse.json(
      { error: "Chưa cấu hình ADMIN_PASSCODE trên server." },
      { status: 500 },
    );
  }

  const incomingPasscode = request.headers.get("x-admin-passcode");
  if (!incomingPasscode || incomingPasscode !== configuredPasscode) {
    return NextResponse.json({ error: "Mật khẩu quản trị không đúng." }, { status: 401 });
  }

  try {
    const entries = listAdminEntries();

    return NextResponse.json(
      { entries },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("admin_entries_get_error", error);
    return NextResponse.json({ error: "Không thể tải danh sách người chơi." }, { status: 500 });
  }
}
