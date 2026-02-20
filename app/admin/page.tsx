"use client";

import { FormEvent, useState } from "react";

interface AdminEntry {
  id: string;
  name: string;
  phone: string;
  prizeLabel: string | null;
  prizeAmount: number | null;
  spunAt: string | null;
  createdAt: string;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAmount(value: number | null): string {
  if (value === null) {
    return "Chưa quay";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/entries", {
        method: "GET",
        headers: {
          "x-admin-passcode": passcode,
        },
      });

      const payload = (await response.json()) as
        | {
            entries: AdminEntry[];
          }
        | {
            error: string;
          };

      if (!response.ok) {
        const message = "error" in payload ? payload.error : "Không thể tải dữ liệu admin.";
        throw new Error(message);
      }

      if (!("entries" in payload)) {
        throw new Error("Dữ liệu admin trả về không đúng định dạng.");
      }

      setEntries(payload.entries);
      setIsAuthorized(true);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Không thể tải dữ liệu admin.";
      setError(message);
      setEntries([]);
      setIsAuthorized(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="admin-page">
      <section className="admin-panel">
        <p className="admin-kicker">Bảng điều khiển lì xì</p>
        <h1>Danh sách người chơi</h1>
        <p>Nhập mật khẩu quản trị để xem tên, số điện thoại và kết quả quay thưởng.</p>

        <form className="admin-login" onSubmit={handleSubmit}>
          <label htmlFor="admin-passcode">Mật khẩu admin</label>
          <div className="admin-login-row">
            <input
              id="admin-passcode"
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              required
              autoComplete="current-password"
              placeholder="Nhập mật khẩu quản trị"
            />
            <button type="submit" className="primary-button" disabled={isLoading}>
              {isLoading ? "Đang tải..." : "Mở bảng dữ liệu"}
            </button>
          </div>
          <p className="admin-error" aria-live="polite">
            {error ?? " "}
          </p>
        </form>

        {isAuthorized ? (
          <div className="admin-table-wrap" role="region" aria-label="Bảng kết quả lì xì">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Số điện thoại</th>
                  <th>Mệnh giá</th>
                  <th>Thời gian quay</th>
                  <th>Tham gia lúc</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Chưa có dữ liệu người chơi.</td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.name}</td>
                      <td>{entry.phone}</td>
                      <td>
                        {entry.prizeLabel ? `${entry.prizeLabel} (${formatAmount(entry.prizeAmount)})` : "Chưa quay"}
                      </td>
                      <td>{formatDate(entry.spunAt)}</td>
                      <td>{formatDate(entry.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}
