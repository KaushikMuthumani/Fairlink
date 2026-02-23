"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Use Google or email/password.
        </p>

        <button
          className="mt-6 w-full rounded-xl border px-4 py-2 hover:bg-gray-50"
          onClick={() => signIn("google", { callbackUrl: "/app" })}
        >
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-500">OR</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            const res = await signIn("credentials", {
              email,
              password,
              redirect: false,
              callbackUrl: "/app",
            });

            if (res?.error) setError("Invalid email or password");
            if (res?.ok) window.location.href = "/app";
          }}
          className="space-y-3"
        >
          <input
            className="w-full rounded-xl border px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
          <input
            className="w-full rounded-xl border px-3 py-2"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button className="w-full rounded-xl bg-black text-white px-4 py-2">
            Sign in with Email
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4">
          No signup UI yet — we’ll add it next (API-based register).
        </p>
      </div>
    </div>
  );
}
