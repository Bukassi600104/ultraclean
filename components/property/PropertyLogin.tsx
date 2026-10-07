"use client";
import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PropertyLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = new FormData(event.currentTarget), db = createClient();
    try {
      if (!db) throw new Error("Sign-in is unavailable. Please try again later.");
      const {error: loginError} = await db.auth.signInWithPassword({email: String(values.get("email")), password: String(values.get("password"))});
      if (loginError) throw new Error("Check your email and password, then try again.");
      const {data: {user}} = await db.auth.getUser();
      if (!user) throw new Error("Your session could not be verified. Please retry.");
      const {data: profile, error: profileError} = await db.from("profiles").select("role,suspended").eq("id", user.id).single();
      if (profileError || !profile || profile.suspended || !["admin", "property_manager"].includes(profile.role)) {
        await db.auth.signOut();
        throw new Error("An active Property Manager or CEO account is required.");
      }
      router.replace("/property"); router.refresh();
    } catch (failure) {setError(failure instanceof Error ? failure.message : "Unable to sign in. Please retry.");}
    finally {setBusy(false);}
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
    <section className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-sm">
      <Image src="/bossbiz-logo.png" width={56} height={56} alt="BossBimbz" className="mb-6 h-14 w-auto object-contain" priority />
      <h1 className="text-2xl font-bold text-slate-900">Property Manager</h1><p className="mt-2 text-sm text-slate-600">Sign in to manage properties, tenancies and payments.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">Email<input name="email" type="email" autoComplete="username" required className="mt-1 block min-h-11 w-full rounded-lg border px-3" /></label>
        <label className="block text-sm font-medium">Password<input name="password" type="password" autoComplete="current-password" required className="mt-1 block min-h-11 w-full rounded-lg border px-3" /></label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="min-h-11 w-full rounded-lg bg-[#0BBDB2] px-4 font-semibold text-slate-950 disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </section>
  </main>;
}
