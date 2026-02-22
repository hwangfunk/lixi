"use client";

import type { CSSProperties } from "react";

import type { PrizeSegment } from "@/lib/prizes";

interface LuckyWheelProps {
  segments: PrizeSegment[];
  rotation: number;
  canSpin: boolean;
  isSpinning: boolean;
  statusMessage: string;
  onSpin: () => void;
}

export function LuckyWheel({
  segments,
  rotation,
  canSpin,
  isSpinning,
  statusMessage,
  onSpin,
}: LuckyWheelProps) {
  const gradientStops = segments
    .map((segment) => {
      return `${segment.color} ${segment.startAngle.toFixed(3)}deg ${segment.endAngle.toFixed(3)}deg`;
    })
    .join(", ");

  const wheelStyle: CSSProperties = {
    backgroundImage: `conic-gradient(${gradientStops})`,
    transform: `rotate(${rotation}deg)`,
  };

  return (
    <section className="wheel-stage" aria-label="Vòng quay lì xì">
      <div className="wheel-shell">
        <div className="wheel-pointer" aria-hidden="true" />

        <div className="lucky-wheel" style={wheelStyle}>
          {segments.map((segment) => (
            <span
              className="wheel-label"
              key={segment.label}
              style={
                {
                  color: segment.textColor,
                  transform: `translate(-50%, -50%) rotate(${segment.centerAngle.toFixed(3)}deg) translateY(calc(-1 * var(--wheel-label-offset, 8.8rem))) rotate(-${segment.centerAngle.toFixed(3)}deg)`,
                } as CSSProperties
              }
            >
              {segment.label}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="spin-button"
        onClick={onSpin}
        disabled={!canSpin || isSpinning}
      >
        {isSpinning ? "Đang quay..." : "Quay ngay"}
      </button>

      <p className="wheel-status" aria-live="polite">
        {statusMessage}
      </p>
    </section>
  );
}
