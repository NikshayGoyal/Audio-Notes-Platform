"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={350} skipDelayDuration={200}>
      {children}
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{ className: "app-toast" }}
      />
    </Tooltip.Provider>
  );
}
