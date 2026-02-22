"use client";

import { useEffect, useRef, useState } from "react";

type SpinPhase = "idle" | "free" | "braking";

interface BrakePlan {
  startMs: number;
  durationSec: number;
  theta0: number;
  omega0: number;
  alpha: number;
  targetAbsDeg: number;
}

interface UsePhysicsSpinOptions {
  onComplete: () => void;
}

interface UsePhysicsSpinResult {
  rotationDeg: number;
  isAnimating: boolean;
  startImpulseSpin: () => void;
  resolveToPrize: (landingAngleDeg: number) => void;
  cancelAndStop: (stopMs?: number) => void;
  reset: (angleDeg?: number) => void;
}

const TARGET_TOTAL_MS = 20_000;
const MIN_BRAKE_MS = 4_000;
const FREE_FRICTION = 24;
const FREE_DRAG = 0.085;
const IMPULSE_MIN = 2_200;
const IMPULSE_MAX = 2_800;
const TURN_CANDIDATE_MIN = 6;
const TURN_CANDIDATE_MAX = 30;
const OMEGA_FLOOR = 300;
const OMEGA_CEIL = 4_800;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeAngleDeg(angleDeg: number) {
  return ((angleDeg % 360) + 360) % 360;
}

export function usePhysicsSpin({ onComplete }: UsePhysicsSpinOptions): UsePhysicsSpinResult {
  const [rotationDeg, setRotationDeg] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const rafRef = useRef<number>(0);
  const angleRef = useRef(0);
  const omegaRef = useRef(0);
  const phaseRef = useRef<SpinPhase>("idle");
  const lastTsRef = useRef(0);
  const spinStartAtMsRef = useRef(0);
  const brakePlanRef = useRef<BrakePlan | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  function ensureAnimationLoop() {
    if (rafRef.current !== 0) {
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  function stopAnimationLoop() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    lastTsRef.current = 0;
  }

  function tick(timestamp: number) {
    if (!lastTsRef.current) {
      lastTsRef.current = timestamp;
    }

    const dtSec = clamp((timestamp - lastTsRef.current) / 1000, 0, 0.05);
    lastTsRef.current = timestamp;

    if (phaseRef.current === "free") {
      const currentOmega = omegaRef.current;
      const alpha = -(FREE_FRICTION + FREE_DRAG * currentOmega);
      const nextOmega = Math.max(0, currentOmega + alpha * dtSec);
      omegaRef.current = nextOmega;
      angleRef.current += nextOmega * dtSec;
      setRotationDeg(angleRef.current);

      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (phaseRef.current === "braking") {
      const plan = brakePlanRef.current;
      if (!plan) {
        phaseRef.current = "idle";
      } else {
        const elapsedSec = Math.min((timestamp - plan.startMs) / 1000, plan.durationSec);
        const nextAngle = plan.theta0 + plan.omega0 * elapsedSec + 0.5 * plan.alpha * elapsedSec * elapsedSec;
        const nextOmega = Math.max(0, plan.omega0 + plan.alpha * elapsedSec);

        angleRef.current = nextAngle;
        omegaRef.current = nextOmega;
        setRotationDeg(nextAngle);

        if (elapsedSec >= plan.durationSec) {
          angleRef.current = plan.targetAbsDeg;
          omegaRef.current = 0;
          phaseRef.current = "idle";
          brakePlanRef.current = null;
          setRotationDeg(plan.targetAbsDeg);
          setIsAnimating(false);
          stopAnimationLoop();
          onCompleteRef.current();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    setIsAnimating(false);
    stopAnimationLoop();
  }

  function startImpulseSpin() {
    const impulse = IMPULSE_MIN + Math.random() * (IMPULSE_MAX - IMPULSE_MIN);

    spinStartAtMsRef.current = performance.now();
    brakePlanRef.current = null;
    phaseRef.current = "free";
    omegaRef.current = impulse;
    setIsAnimating(true);
    ensureAnimationLoop();
  }

  function resolveToPrize(landingAngleDeg: number) {
    const now = performance.now();

    if (phaseRef.current === "idle") {
      spinStartAtMsRef.current = now;
      phaseRef.current = "free";
      omegaRef.current = IMPULSE_MIN;
    }

    const angleNow = angleRef.current;
    const omegaNow = Math.max(omegaRef.current, OMEGA_FLOOR);
    const spinStartedAt = spinStartAtMsRef.current || now;
    const plannedStopAtMs = Math.max(spinStartedAt + TARGET_TOTAL_MS, now + MIN_BRAKE_MS);
    const durationSec = Math.max((plannedStopAtMs - now) / 1000, MIN_BRAKE_MS / 1000);

    const currentNorm = normalizeAngleDeg(angleNow);
    const baseDelta = (360 - landingAngleDeg - currentNorm + 360) % 360;

    let bestTurns: number | null = null;
    let bestDistance = 0;
    let bestOmegaRequired = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let turns = TURN_CANDIDATE_MIN; turns <= TURN_CANDIDATE_MAX; turns += 1) {
      const distanceDeg = baseDelta + turns * 360;
      const omegaRequired = (2 * distanceDeg) / durationSec;

      if (omegaRequired < OMEGA_FLOOR || omegaRequired > OMEGA_CEIL) {
        continue;
      }

      const score = Math.abs(omegaRequired - omegaNow);
      if (score < bestScore) {
        bestScore = score;
        bestTurns = turns;
        bestDistance = distanceDeg;
        bestOmegaRequired = omegaRequired;
      }
    }

    if (bestTurns === null) {
      bestTurns = TURN_CANDIDATE_MIN;
      bestDistance = baseDelta + bestTurns * 360;
      bestOmegaRequired = clamp((2 * bestDistance) / durationSec, OMEGA_FLOOR, OMEGA_CEIL);
    }

    const brakeOmega0 = bestOmegaRequired;
    const brakeAlpha = -brakeOmega0 / durationSec;
    const targetAbsDeg = angleNow + bestDistance;

    brakePlanRef.current = {
      startMs: now,
      durationSec,
      theta0: angleNow,
      omega0: brakeOmega0,
      alpha: brakeAlpha,
      targetAbsDeg,
    };
    omegaRef.current = brakeOmega0;
    phaseRef.current = "braking";
    setIsAnimating(true);
    ensureAnimationLoop();
  }

  function cancelAndStop(stopMs = 1_000) {
    const now = performance.now();
    const durationSec = Math.max(stopMs, 50) / 1000;
    const angleNow = angleRef.current;
    const omegaNow = Math.max(0, omegaRef.current);

    const targetAbsDeg = angleNow + 0.5 * omegaNow * durationSec;

    brakePlanRef.current = {
      startMs: now,
      durationSec,
      theta0: angleNow,
      omega0: omegaNow,
      alpha: omegaNow > 0 ? -omegaNow / durationSec : 0,
      targetAbsDeg,
    };
    phaseRef.current = "braking";
    setIsAnimating(true);
    ensureAnimationLoop();
  }

  function reset(angleDeg = 0) {
    stopAnimationLoop();
    const normalized = Number.isFinite(angleDeg) ? angleDeg : 0;

    angleRef.current = normalized;
    omegaRef.current = 0;
    phaseRef.current = "idle";
    spinStartAtMsRef.current = 0;
    brakePlanRef.current = null;
    setRotationDeg(normalized);
    setIsAnimating(false);
  }

  useEffect(() => {
    return () => {
      stopAnimationLoop();
    };
  }, []);

  return {
    rotationDeg,
    isAnimating,
    startImpulseSpin,
    resolveToPrize,
    cancelAndStop,
    reset,
  };
}
