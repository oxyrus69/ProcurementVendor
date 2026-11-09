"use client";

import { useActionState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import { loginAction } from "@/server/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });

  return (
    <form action={action} className="mt-6 space-y-4">
      {state?.error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] leading-4 text-red-800">
          {state.error}
        </div>
      )}

      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue="cpo@nexusprocure.id"
          className="field mt-1.5"
        />
      </label>

      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Kata sandi</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          defaultValue="nexus123"
          className="field mt-1.5"
        />
      </label>

      <button disabled={pending} className="btn btn-primary w-full justify-center disabled:opacity-55">
        {pending ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <LogIn className="size-3.5" aria-hidden="true" />}
        {pending ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
}
