"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

type Action = (formData: FormData) => Promise<void> | void;

interface FormState {
  error: string | null;
  ok: boolean;
}

const initialState: FormState = { error: null, ok: false };

function useAction(formAction: (formData: FormData) => Promise<void> | void) {
  return useActionState<FormState, FormData>(
    async (_prev, formData) => {
      try {
        await formAction(formData);
        return { error: null, ok: true };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "Aksi gagal dijalankan.", ok: false };
      }
    },
    initialState,
  );
}

/**
 * Pembungkus form untuk server action: memuat status pending dan menampilkan
 * galat validasi dari server sebagai pesan sebaris di dekat tombol pemicu.
 */
export function ActionForm({
  action,
  className = "contents",
  children,
  onDone,
}: {
  action: Action;
  className?: string;
  children: ReactNode;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useAction(action);
  const doneRef = useRef(false);

  if (state.ok && !doneRef.current) {
    doneRef.current = true;
    onDone?.();
  }

  return (
    <form action={formAction} className={className}>
      {children}
      <span aria-live="polite" className="sr-only">
        {pending ? "Memproses" : state.error ? state.error : ""}
      </span>
      {state.error && (
        <span role="alert" className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-red-700">
          {state.error}
        </span>
      )}
      {pending && <LoaderCircle className="ml-1.5 inline size-3 animate-spin text-slate-400" aria-hidden="true" />}
    </form>
  );
}

/** Tombol aksi baris tabel. Bila `confirm`, klik pertama menyiapkan, klik kedua menjalankan. */
export function RowAction({
  action,
  label,
  variant = "secondary",
  title,
  hiddenFields,
  confirm,
  confirmMessage = "Konfirmasi",
  children,
}: {
  action: Action;
  label: string;
  variant?: "primary" | "secondary" | "success" | "danger";
  title?: string;
  hiddenFields?: Record<string, string>;
  confirm?: boolean;
  confirmMessage?: string;
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useAction(action);
  const [armed, setArmed] = useState(false);
  const showConfirm = Boolean(confirm) && !armed;

  return (
    <form action={formAction} className="inline">
      {hiddenFields && Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <button
        type={showConfirm ? "button" : "submit"}
        disabled={pending}
        title={title ?? label}
        onClick={showConfirm ? () => setArmed(true) : undefined}
        className={`btn btn-${variant} !min-h-7 !px-2.5 !py-1 text-[11px]`}
      >
        {pending ? <LoaderCircle className="size-3 animate-spin" aria-hidden="true" /> : showConfirm ? label : confirm ? confirmMessage : label}
      </button>
      {armed && !pending && (
        <button type="button" className="ml-1.5 text-[11px] text-slate-400 hover:text-slate-700" onClick={() => setArmed(false)}>
          Batal
        </button>
      )}
      {children}
      {state.error && (
        <span role="alert" className="ml-1.5 text-[11px] font-medium text-red-700">
          {state.error}
        </span>
      )}
    </form>
  );
}
