"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export function usePullToRefresh(
  onRefresh: () => void,
  isRefreshing: boolean
) {
  const [pullProgress, setPullProgress] = useState(0);
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number | null>(null);
  const lastTriggerRef = useRef<number>(0);
  const COOLDOWN = 1500;
  const THRESHOLD = 70;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY !== 0) return;
    const now = Date.now();
    if (now - lastTriggerRef.current < COOLDOWN) return;
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startYRef.current === null) return;
    if (window.scrollY !== 0) {
      startYRef.current = null;
      currentYRef.current = null;
      setPullProgress(0);
      return;
    }
    currentYRef.current = e.touches[0].clientY;
    const delta = currentYRef.current - startYRef.current;
    if (delta > 0) {
      const progress = Math.min(delta / THRESHOLD, 1.5);
      setPullProgress(progress);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (startYRef.current === null || currentYRef.current === null) {
      setPullProgress(0);
      return;
    }
    const delta = currentYRef.current - startYRef.current;
    startYRef.current = null;
    currentYRef.current = null;
    if (delta >= THRESHOLD) {
      lastTriggerRef.current = Date.now();
      onRefresh();
    }
    setPullProgress(0);
  }, [onRefresh]);

  useEffect(() => {
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullProgress, isRefreshing };
}
