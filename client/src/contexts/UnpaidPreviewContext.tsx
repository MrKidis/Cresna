import { trpc } from "@/lib/trpc";
import { createContext, useContext } from "react";

type UnpaidPreviewContextValue = {
  isUnpaidPreview: boolean;
  isCheckingPreview: boolean;
};

const UnpaidPreviewContext = createContext<UnpaidPreviewContextValue>({ isUnpaidPreview: false, isCheckingPreview: false });

export function UnpaidPreviewProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = trpc.preview.unpaidWorkspace.useQuery();
  const isUnpaidPreview = data?.previewMode === "unpaid" && data.accessSource === "none" && data.hasAccess === false;
  return <UnpaidPreviewContext.Provider value={{ isUnpaidPreview, isCheckingPreview: isLoading }}>{children}</UnpaidPreviewContext.Provider>;
}

export function useUnpaidPreview() {
  return useContext(UnpaidPreviewContext);
}
