"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface SwipeableRowContextValue {
  openRowId: string | null;
  setOpenRowId: (id: string | null) => void;
  closeAll: () => void;
}

const SwipeableRowContext = createContext<SwipeableRowContextValue>({
  openRowId: null,
  setOpenRowId: () => {},
  closeAll: () => {},
});

export function SwipeableRowProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const closeAll = useCallback(() => setOpenRowId(null), []);

  return (
    <SwipeableRowContext.Provider value={{ openRowId, setOpenRowId, closeAll }}>
      {children}
    </SwipeableRowContext.Provider>
  );
}

export function useSwipeableRowContext() {
  return useContext(SwipeableRowContext);
}
