import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { firebaseConfigured, signInWithGoogle, signInWithMicrosoft } from "@/lib/firebase";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const [busyProvider, setBusyProvider] = useState<"google" | "microsoft" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (provider: "google" | "microsoft") => {
    setBusyProvider(provider);
    setError(null);
    try {
      await (provider === "google" ? signInWithGoogle() : signInWithMicrosoft());
      navigate("/app");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Authentication could not be completed.");
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-16">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Cresna commerce intelligence</p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">Make every store decision evidence-led.</h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Sign in to diagnose revenue friction, turn connected-store evidence into actions, and keep every AI draft merchant-approved.</p>
        </section>

        <Card className="border-border/70 bg-card/95 shadow-xl">
          <CardHeader>
            <CardTitle>Welcome to Cresna</CardTitle>
            <CardDescription>Use your organization’s Google or Microsoft account. Cresna does not create password-based accounts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!firebaseConfigured && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">Firebase Web configuration is not available in this deployment yet.</div>
            )}
            <Button className="w-full" disabled={busyProvider !== null || !firebaseConfigured} onClick={() => void run("google")}>
              {busyProvider === "google" ? "Connecting to Google…" : "Continue with Google"}
            </Button>
            <Button className="w-full" variant="secondary" disabled={busyProvider !== null || !firebaseConfigured} onClick={() => void run("microsoft")}>
              {busyProvider === "microsoft" ? "Connecting to Microsoft…" : "Continue with Microsoft"}
            </Button>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <p className="text-center text-xs leading-5 text-muted-foreground">Authentication is handled by Firebase. Cresna receives a verified identity token and never receives your OAuth password.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
