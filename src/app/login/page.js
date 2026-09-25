"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage("Account created. Check your email to confirm your address, then sign in.");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        router.replace("/");
        router.refresh();
      }
    } catch (err) {
      setError(err?.message || "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f6f1] px-4 py-12 text-[#202a23]">
      <section className="mx-auto max-w-md rounded-3xl border border-[#e5e6dc] bg-white p-7 shadow-sm sm:p-9">
        <Link href="/" className="text-3xl font-black tracking-tight">plate<span className="text-[#d96d54]">.</span></Link>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-[#d96d54]">Your day, planned</p>
        <h1 className="mt-2 text-3xl font-black">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          {mode === "signin" ? "Sign in to continue to your meal orders." : "Create an account to start ordering meals."}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {mode === "signup" && (
            <label className="block text-sm font-semibold">
              Full name
              <input required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 w-full rounded-xl border border-[#e1e3d9] px-4 py-3 font-normal outline-none focus:border-[#426347]" placeholder="Your name" />
            </label>
          )}
          <label className="block text-sm font-semibold">
            Email address
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[#e1e3d9] px-4 py-3 font-normal outline-none focus:border-[#426347]" placeholder="you@example.com" />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input required type="password" minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#e1e3d9] px-4 py-3 font-normal outline-none focus:border-[#426347]" placeholder="At least 6 characters" />
          </label>

          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}

          <button disabled={busy} type="submit" className="w-full rounded-xl bg-[#263f32] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#345442] disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {mode === "signin" ? "New to plate? " : "Already have an account? "}
          <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }} className="font-bold text-[#426347] underline underline-offset-4">
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </section>
    </main>
  );
}
