"use client";

import { useState } from "react";

interface NamePhoneModalProps {
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (payload: { name: string; phone: string }) => Promise<void>;
  onClose?: () => void;
}

export function NamePhoneModal({
  isSubmitting,
  errorMessage,
  onSubmit,
  onClose,
}: NamePhoneModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="name-modal-backdrop" role="presentation">
      <div
        className="name-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-modal-title"
        aria-describedby="name-modal-description"
      >
        {onClose ? (
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        ) : null}
        <p className="name-modal-kicker">Lời chúc đầu năm</p>
        <h2 id="name-modal-title">Nhập tên và số điện thoại của bạn</h2>
        <p id="name-modal-description">
          Nhập tên và số điện thoại để tham gia nhận lì xì may mắn đầu xuân Bính Ngọ 2026.
        </p>

        <form
          className="name-modal-form"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit({
              name,
              phone,
            });
          }}
        >
          <label htmlFor="name-input">Tên của bạn</label>
          <input
            id="name-input"
            name="name"
            autoComplete="name"
            placeholder="Ví dụ: Minh Quân"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label htmlFor="phone-input">Số điện thoại</label>
          <input
            id="phone-input"
            name="phone"
            autoComplete="tel"
            placeholder="Ví dụ: 09xxxxxxxx"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            inputMode="tel"
          />

          <p className="name-modal-error" aria-live="polite">
            {errorMessage ?? " "}
          </p>

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu thông tin..." : "Vào vòng quay lì xì"}
          </button>
        </form>
      </div>
    </div>
  );
}
