"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="wrap" style={{ maxWidth: 440 }}>
      <a className="back" href="/">‹ Home</a>
      <div className="card" style={{ padding: 24 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, letterSpacing: "-.02em" }}>Sign in</h1>
        <p className="muted" style={{ marginTop: 0 }}>Dev sign-in — enter any email to create or continue an account. Your ratings will be attributed to you.</p>
        <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); await signIn("credentials", { email, redirectTo: "/" }); }}>
          <input
            type="email" required placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", fontSize: 15, marginBottom: 12 }}
          />
          <button className="cta" disabled={busy} style={{ width: "100%" }}>{busy ? "Signing in…" : "Continue"}</button>
        </form>
      </div>
    </main>
  );
}
