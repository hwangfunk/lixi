import { normalizePhone } from "@/lib/phone";
import { pickWeightedPrize, type PrizeLabel } from "@/lib/prizes";
import { getDb } from "@/lib/server/db";

export interface ParticipantRecord {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  createdAt: string;
}

export interface SpinRecord {
  id: string;
  participantId: string;
  prizeLabel: PrizeLabel;
  prizeAmount: number;
  createdAt: string;
}

export interface AdminEntry {
  id: string;
  name: string;
  phone: string;
  prizeLabel: PrizeLabel | null;
  prizeAmount: number | null;
  spunAt: string | null;
  createdAt: string;
}

interface ParticipantRow {
  id: string;
  name: string;
  phone: string;
  normalized_phone: string;
  created_at: string;
}

interface SpinRow {
  id: string;
  participant_id: string;
  prize_label: PrizeLabel;
  prize_amount: number;
  created_at: string;
}

interface AdminEntryRow {
  id: string;
  name: string;
  phone: string;
  prize_label: PrizeLabel | null;
  prize_amount: number | null;
  spun_at: string | null;
  created_at: string;
}

function mapParticipant(row: ParticipantRow): ParticipantRecord {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    normalizedPhone: row.normalized_phone,
    createdAt: row.created_at,
  };
}

function mapSpin(row: SpinRow): SpinRecord {
  return {
    id: row.id,
    participantId: row.participant_id,
    prizeLabel: row.prize_label,
    prizeAmount: row.prize_amount,
    createdAt: row.created_at,
  };
}

export function findParticipantById(participantId: string): ParticipantRecord | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM participants WHERE id = ? LIMIT 1")
    .get(participantId) as ParticipantRow | undefined;

  return row ? mapParticipant(row) : null;
}

export function findParticipantByNormalizedPhone(normalizedPhone: string): ParticipantRecord | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM participants WHERE normalized_phone = ? LIMIT 1")
    .get(normalizedPhone) as ParticipantRow | undefined;

  return row ? mapParticipant(row) : null;
}

export function findSpinByParticipantId(participantId: string): SpinRecord | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM spins WHERE participant_id = ? LIMIT 1")
    .get(participantId) as SpinRow | undefined;

  return row ? mapSpin(row) : null;
}

export function registerParticipant(name: string, phone: string): {
  participant: ParticipantRecord;
  spin: SpinRecord | null;
  isExistingPhone: boolean;
} {
  const db = getDb();
  const normalizedPhone = normalizePhone(phone);

  const existingParticipant = findParticipantByNormalizedPhone(normalizedPhone);
  if (existingParticipant) {
    return {
      participant: existingParticipant,
      spin: findSpinByParticipantId(existingParticipant.id),
      isExistingPhone: true,
    };
  }

  const participantId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    db.prepare(
      `
      INSERT INTO participants (id, name, phone, normalized_phone, created_at)
      VALUES (?, ?, ?, ?, ?)
      `,
    ).run(participantId, name.trim(), phone.trim(), normalizedPhone, createdAt);
  } catch (error) {
    if (isConstraintError(error)) {
      const fallbackParticipant = findParticipantByNormalizedPhone(normalizedPhone);
      if (fallbackParticipant) {
        return {
          participant: fallbackParticipant,
          spin: findSpinByParticipantId(fallbackParticipant.id),
          isExistingPhone: true,
        };
      }
    }

    throw error;
  }

  const participant = findParticipantById(participantId);
  if (!participant) {
    throw new Error("participant_create_failed");
  }

  return {
    participant,
    spin: null,
    isExistingPhone: false,
  };
}

export function createSpinForParticipant(participantId: string): {
  status: "ok" | "already_spun";
  spin: SpinRecord;
} {
  const participant = findParticipantById(participantId);
  if (!participant) {
    throw new Error("participant_not_found");
  }

  const existingSpin = findSpinByParticipantId(participantId);
  if (existingSpin) {
    return {
      status: "already_spun",
      spin: existingSpin,
    };
  }

  const chosenPrize = pickWeightedPrize();
  const spinId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const db = getDb();
  try {
    db.prepare(
      `
      INSERT INTO spins (id, participant_id, prize_label, prize_amount, created_at)
      VALUES (?, ?, ?, ?, ?)
      `,
    ).run(spinId, participantId, chosenPrize.label, chosenPrize.amount, createdAt);
  } catch (error) {
    if (isConstraintError(error)) {
      const fallback = findSpinByParticipantId(participantId);
      if (fallback) {
        return {
          status: "already_spun",
          spin: fallback,
        };
      }
    }

    throw error;
  }

  const spin = findSpinByParticipantId(participantId);
  if (!spin) {
    throw new Error("spin_create_failed");
  }

  return {
    status: "ok",
    spin,
  };
}

export function listAdminEntries(): AdminEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        p.id AS id,
        p.name AS name,
        p.phone AS phone,
        s.prize_label AS prize_label,
        s.prize_amount AS prize_amount,
        s.created_at AS spun_at,
        p.created_at AS created_at
      FROM participants p
      LEFT JOIN spins s ON s.participant_id = p.id
      ORDER BY COALESCE(s.created_at, p.created_at) DESC
      `,
    )
    .all() as AdminEntryRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    prizeLabel: row.prize_label,
    prizeAmount: row.prize_amount,
    spunAt: row.spun_at,
    createdAt: row.created_at,
  }));
}

function isConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorCode = (error as { code?: string }).code;
  return (
    errorCode === "SQLITE_CONSTRAINT_UNIQUE" ||
    errorCode === "SQLITE_CONSTRAINT" ||
    error.message.includes("UNIQUE constraint failed")
  );
}
