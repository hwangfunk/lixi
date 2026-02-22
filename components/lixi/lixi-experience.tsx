"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { LuckyWheel } from "@/components/lixi/lucky-wheel";
import { NamePhoneModal } from "@/components/lixi/name-phone-modal";
import { ResultCelebration } from "@/components/lixi/result-celebration";
import { usePhysicsSpin } from "@/hooks/use-physics-spin";
import { buildPrizeSegments, type PrizeLabel } from "@/lib/prizes";

interface RegisterResponse {
  participantId: string;
  name: string;
  phoneMasked: string;
  hasSpun: boolean;
  isExistingPhone: boolean;
  existingPrize?: {
    label: PrizeLabel;
    amount: number;
  };
}

interface SpinResponse {
  status: "ok" | "already_spun";
  prize: {
    label: PrizeLabel;
    amount: number;
  };
}

interface PendingSpinResult {
  prize: SpinResponse["prize"];
  participantName: string;
  mode: "new_prize" | "existing_prize";
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handleChange = () => onStoreChange();

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    },
    () => {
      if (typeof window === "undefined") {
        return false;
      }

      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    },
    () => false,
  );
}

function getErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Có lỗi xảy ra, vui lòng thử lại.";
  }

  const objectPayload = payload as {
    error?: string;
    fieldErrors?: Record<string, string[] | undefined>;
  };

  if (typeof objectPayload.error === "string" && objectPayload.error.trim()) {
    return objectPayload.error;
  }

  if (objectPayload.fieldErrors) {
    const firstError = Object.values(objectPayload.fieldErrors)
      .flat()
      .find((message) => typeof message === "string" && message.trim().length > 0);

    if (firstError) {
      return firstError;
    }
  }

  return "Có lỗi xảy ra, vui lòng thử lại.";
}

export function LixiExperience() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const prizeSegments = useMemo(() => buildPrizeSegments(), []);
  const pendingResultRef = useRef<PendingSpinResult | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isInitialModal, setIsInitialModal] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Vận may đang chờ bạn! Nhấn quay để mở lì xì Tết Bính Ngọ 2026.");
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  const [participant, setParticipant] = useState<{
    id: string;
    name: string;
    phoneMasked: string;
  } | null>(null);

  const [hasSpun, setHasSpun] = useState(false);
  const [prize, setPrize] = useState<{
    label: PrizeLabel;
    amount: number;
  } | null>(null);

  const handleSpinAnimationComplete = useCallback(() => {
    const pendingResult = pendingResultRef.current;
    pendingResultRef.current = null;
    setIsSpinning(false);

    if (!pendingResult) {
      return;
    }

    setPrize(pendingResult.prize);
    setHasSpun(true);

    if (pendingResult.mode === "existing_prize") {
      setStatusMessage("Kết quả cũ đã được giữ nguyên cho số điện thoại này.");
      setLiveAnnouncement(`Bạn đã quay trước đó và nhận ${pendingResult.prize.label}.`);
      return;
    }

    setStatusMessage(`Chúc mừng ${pendingResult.participantName}! Bạn đã nhận ${pendingResult.prize.label}.`);
    setLiveAnnouncement(`Chúc mừng, bạn nhận được ${pendingResult.prize.label}.`);
  }, []);

  const {
    rotationDeg,
    isAnimating: isWheelAnimating,
    startImpulseSpin,
    resolveToPrize,
    cancelAndStop,
    reset,
  } = usePhysicsSpin({ onComplete: handleSpinAnimationComplete });

  async function handleRegister(payload: { name: string; phone: string }) {
    setIsRegistering(true);
    setFormError(null);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseBody = (await response.json()) as RegisterResponse | unknown;

      if (!response.ok) {
        throw new Error(getErrorMessage(responseBody));
      }

      const data = responseBody as RegisterResponse;

      if (data.isExistingPhone && data.hasSpun) {
        setFormError(`Số điện thoại này đã được ${data.name} sử dụng và đã nhận lì xì rồi.`);
        return;
      }

      setParticipant({
        id: data.participantId,
        name: data.name,
        phoneMasked: data.phoneMasked,
      });

      pendingResultRef.current = null;
      setIsSpinning(false);
      setIsModalOpen(false);
      setIsInitialModal(false);
      setPrize(null);
      setHasSpun(false);
      reset(0);
      setStatusMessage("Vận may đang chờ bạn! Nhấn quay để mở lì xì Tết Bính Ngọ 2026.");
      setLiveAnnouncement(`Xin chào ${data.name}, bạn đã sẵn sàng quay lì xì.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đăng ký lúc này.";
      setFormError(message);
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleSpin() {
    if (!participant || hasSpun || isSpinning) {
      return;
    }

    pendingResultRef.current = null;
    setIsSpinning(true);
    setStatusMessage("Phúc — Lộc — Thọ... đang chốt lì xì cho bạn...");
    startImpulseSpin();

    try {
      const response = await fetch("/api/spin", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          participantId: participant.id,
        }),
      });

      const responseBody = (await response.json()) as SpinResponse | unknown;

      if (!response.ok) {
        throw new Error(getErrorMessage(responseBody));
      }

      const data = responseBody as SpinResponse;

      if (data.status === "already_spun") {
        pendingResultRef.current = {
          prize: data.prize,
          participantName: participant.name,
          mode: "existing_prize",
        };
        setStatusMessage("Đang dừng vòng quay để hiển thị kết quả cũ...");
        cancelAndStop(1200);
        return;
      }

      const targetSegment = prizeSegments.find((segment) => segment.label === data.prize.label);
      if (!targetSegment) {
        throw new Error("Không xác định được mệnh giá trúng thưởng.");
      }

      const variance = Math.min(targetSegment.sweep * 0.25, 8);
      const randomOffset = prefersReducedMotion ? 0 : (Math.random() * 2 - 1) * variance;
      const landingAngle = Math.max(
        targetSegment.startAngle + 0.4,
        Math.min(targetSegment.endAngle - 0.4, targetSegment.centerAngle + randomOffset),
      );

      pendingResultRef.current = {
        prize: data.prize,
        participantName: participant.name,
        mode: "new_prize",
      };
      setStatusMessage("Kim chỉ nam đang dừng lại... hồi hộp chưa?");
      resolveToPrize(landingAngle);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể quay lúc này.";
      pendingResultRef.current = null;
      setStatusMessage(message);
      setLiveAnnouncement(message);
      cancelAndStop(900);
    }
  }

  function handleSwitchPlayer() {
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
  }

  return (
    <div className="lixi-shell">
      <header className="hero-panel">
        <p className="hero-kicker">XUÂN BÍNH NGỌ 2026</p>
        <h1>Vòng Quay Lì Xì May Mắn</h1>
        <p>
          Chúc bạn một năm mới an khang thịnh vượng! Hãy thử vận may đầu xuân —
          mỗi số điện thoại được quay một lần, mệnh giá lớn có tỷ lệ hiếm hơn.
        </p>
      </header>

      <div className="lixi-grid">
        <LuckyWheel
          segments={prizeSegments}
          rotation={rotationDeg}
          canSpin={Boolean(participant) && !hasSpun && !isWheelAnimating}
          isSpinning={isSpinning}
          statusMessage={statusMessage}
          onSpin={handleSpin}
        />

        <div className="lixi-side">
          <ResultCelebration prize={prize} participantName={participant?.name ?? null} />

          {participant ? (
            <section className="player-card" aria-label="Thông tin người chơi">
              <h2>Người chơi hiện tại</h2>
              <dl>
                <div>
                  <dt>Tên</dt>
                  <dd>{participant.name}</dd>
                </div>
                <div>
                  <dt>Số điện thoại</dt>
                  <dd>{participant.phoneMasked}</dd>
                </div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>{hasSpun ? "Đã quay" : "Chưa quay"}</dd>
                </div>
              </dl>
              {hasSpun ? (
                <button type="button" className="secondary-button" onClick={handleSwitchPlayer}>
                  Nhập thông tin người khác
                </button>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>

      {isModalOpen ? (
        <NamePhoneModal
          isSubmitting={isRegistering}
          errorMessage={formError}
          onSubmit={handleRegister}
          onClose={isInitialModal ? undefined : handleCloseModal}
        />
      ) : null}

      <p className="sr-only" aria-live="polite">
        {liveAnnouncement}
      </p>
    </div>
  );
}
