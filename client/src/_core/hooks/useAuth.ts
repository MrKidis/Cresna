import { signOutFirebase, subscribeToFirebaseToken, firebaseAuth } from "@/lib/firebase";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();
  const [firebaseReady, setFirebaseReady] = useState(!firebaseAuth);
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });

  useEffect(() => {
    if (!firebaseAuth) return;
    return subscribeToFirebaseToken(() => {
      setFirebaseReady(true);
      void utils.auth.me.invalidate();
    });
  }, [utils]);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => utils.auth.me.setData(undefined, null),
  });

  const logout = useCallback(async () => {
    try {
      await signOutFirebase();
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (!(error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED")) throw error;
    } finally {
      try { sessionStorage.removeItem("manus-cookie"); } catch {}
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => ({
    user: meQuery.data ?? null,
    loading: !firebaseReady || meQuery.isLoading || logoutMutation.isPending,
    error: meQuery.error ?? logoutMutation.error ?? null,
    isAuthenticated: Boolean(meQuery.data),
  }), [firebaseReady, meQuery.data, meQuery.error, meQuery.isLoading, logoutMutation.error, logoutMutation.isPending]);

  useEffect(() => {
    if (!redirectOnUnauthenticated || !firebaseReady || meQuery.isLoading || logoutMutation.isPending || state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;
    if (window.location.pathname !== "/auth") {
      window.location.href = redirectPath || "/auth";
    }
  }, [firebaseReady, logoutMutation.isPending, meQuery.isLoading, redirectOnUnauthenticated, redirectPath, state.user]);

  return { ...state, refresh: () => meQuery.refetch(), logout };
}
