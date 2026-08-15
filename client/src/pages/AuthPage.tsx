import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { firebaseConfigured, createFirebaseAccount, signInWithEmail, signInWithGoogle } from "@/lib/firebase";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = () => {
    navigate("/app");
  };

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      finish();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Authentication could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-16">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Cresna commerce intelligence</p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">Make every store decision evidence-led.</h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Sign in to your workspace to diagnose revenue friction, turn connected store evidence into actions, and keep every AI draft merchant-approved.</p>
        </section>

        <Card className="border-border/70 bg-card/95 shadow-xl">
          <CardHeader>
            <CardTitle>{mode === "signIn" ? "Welcome back" : "Create your workspace"}</CardTitle>
            <CardDescription>Use Google or an email and password. Cresna never stores your password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!firebaseConfigured && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">Firebase Web configuration is not available in this deployment yet.</div>
            )}
            <Button className="w-full" disabled={busy || !firebaseConfigured} onClick={() => run(() => signInWithGoogle())}>Continue with Google</Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@brand.com" /></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete={mode === "signIn" ? "current-password" : "new-password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters" /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" variant="secondary" disabled={busy || !firebaseConfigured || !email || password.length < 6} onClick={() => run(() => mode === "signIn" ? signInWithEmail(email, password) : createFirebaseAccount(email, password))}>{mode === "signIn" ? "Sign in with email" : "Create account with email"}</Button>
            <Button className="w-full" variant="ghost" disabled={busy} onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); setError(null); }}>{mode === "signIn" ? "Need an account? Sign up" : "Already have an account? Sign in"}</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
