"use client";

import type { CSSProperties } from "react";

import type { PrizeLabel } from "@/lib/prizes";

interface PrizeDisplay {
  label: PrizeLabel;
  amount: number;
}

interface ResultCelebrationProps {
  prize: PrizeDisplay | null;
  participantName: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ResultCelebration({ prize, participantName }: ResultCelebrationProps) {
  if (!prize) {
    return null;
  }

  return (
    <section className="celebration-card celebration-reveal" role="status" aria-live="polite">
      <div className="confetti-layer" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, index) => (
          <span
            className="confetti-piece"
            key={index}
            style={{
              ["--piece-index" as string]: index,
            } as CSSProperties}
          />
        ))}
      </div>

      <p className="celebration-kicker">Chúc mừng năm mới</p>
      <h3>{participantName ? `${participantName}, bạn đã trúng` : "Bạn đã trúng"}</h3>
      <p className="celebration-amount">{formatCurrency(prize.amount)}</p>
      <p className="celebration-note">
        Mệnh giá: <strong>{prize.label}</strong> - giữ số điện thoại để nhận lì xì nhé.
      </p>
    </section>
  );
}
