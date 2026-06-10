"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface MonthContextValue {
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
}

function getFirstDayOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

const MonthContext = createContext<MonthContextValue>({
  selectedMonth: getFirstDayOfCurrentMonth(),
  setSelectedMonth: () => {},
});

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [selectedMonth, setSelectedMonthState] = useState<Date>(
    getFirstDayOfCurrentMonth()
  );

  const setSelectedMonth = useCallback((date: Date) => {
    // Always normalize to first day of month
    const normalized = new Date(date.getFullYear(), date.getMonth(), 1);
    setSelectedMonthState(normalized);
  }, []);

  return (
    <MonthContext.Provider value={{ selectedMonth, setSelectedMonth }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth(): MonthContextValue {
  return useContext(MonthContext);
}
