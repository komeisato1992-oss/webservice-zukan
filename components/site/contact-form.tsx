"use client";

import { useState, useTransition } from "react";
import {
  CONTACT_TYPES,
  submitContact,
  type ContactPayload,
  type ContactType,
  type ContactValidationErrors,
} from "@/lib/site/contact";
import { buttonClass, cn } from "@/components/site/ui";

const empty: ContactPayload = {
  name: "",
  email: "",
  type: "question",
  message: "",
};

export function ContactForm() {
  const [values, setValues] = useState<ContactPayload>(empty);
  const [errors, setErrors] = useState<ContactValidationErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof ContactPayload>(
    key: K,
    value: ContactPayload[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || submitted) return;

    startTransition(() => {
      const result = submitContact(values);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setSubmitted(true);
      window.location.href = result.href;
    });
  }

  const disabled = pending || submitted;

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <Field
        label="お名前"
        htmlFor="contact-name"
        error={errors.name}
        required
      >
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          value={values.name}
          disabled={disabled}
          onChange={(e) => update("name", e.target.value)}
          className={fieldClass(Boolean(errors.name))}
        />
      </Field>

      <Field
        label="メールアドレス"
        htmlFor="contact-email"
        error={errors.email}
        required
      >
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          disabled={disabled}
          onChange={(e) => update("email", e.target.value)}
          className={fieldClass(Boolean(errors.email))}
        />
      </Field>

      <Field
        label="お問い合わせ種別"
        htmlFor="contact-type"
        error={errors.type}
        required
      >
        <select
          id="contact-type"
          name="type"
          value={values.type}
          disabled={disabled}
          onChange={(e) => update("type", e.target.value as ContactType)}
          className={fieldClass(Boolean(errors.type))}
        >
          {CONTACT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="お問い合わせ内容"
        htmlFor="contact-message"
        error={errors.message}
        required
      >
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          value={values.message}
          disabled={disabled}
          onChange={(e) => update("message", e.target.value)}
          className={cn(fieldClass(Boolean(errors.message)), "resize-y")}
        />
      </Field>

      <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
        送信ボタンを押すと、お使いのメールアプリが開きます。内容をご確認のうえ送信してください。
      </p>

      <button
        type="submit"
        disabled={disabled}
        className={buttonClass("primary", "md")}
      >
        {submitted ? "メールアプリを開いています…" : pending ? "送信準備中…" : "送信する"}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-medium text-[var(--text-primary)]"
      >
        {label}
        {required ? (
          <span className="ml-1 text-[11px] font-normal text-red-600">必須</span>
        ) : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1 text-[12px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function fieldClass(invalid: boolean) {
  return cn(
    "w-full rounded-[var(--radius-btn)] border bg-white px-3 py-2.5 text-[14px] text-[var(--text-primary)] outline-none transition focus:ring-2 focus:ring-[var(--accent)]/30",
    invalid
      ? "border-red-400 focus:border-red-400"
      : "border-[var(--border)] focus:border-[var(--navy)]/40",
  );
}
