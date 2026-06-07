"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export function SwipeableRow({
  children,
  onEdit,
  onDelete,
  className,
}: SwipeableRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number | null>(null);
  const currentXRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ACTION_WIDTH = 144; // 72px each for edit + delete
  const THRESHOLD = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    currentXRef.current = e.touches[0].clientX;
    const delta = startXRef.current - currentXRef.current;
    if (delta > 0) {
      setTranslateX(Math.min(delta, ACTION_WIDTH));
    } else {
      setTranslateX(Math.max(0, translateX + delta * 0.3));
    }
  }, [translateX]);

  const handleTouchEnd = useCallback(() => {
    if (startXRef.current === null || currentXRef.current === null) {
      setIsDragging(false);
      return;
    }
    const delta = startXRef.current - currentXRef.current;
    startXRef.current = null;
    currentXRef.current = null;
    setIsDragging(false);

    if (delta >= THRESHOLD) {
      setTranslateX(ACTION_WIDTH);
    } else {
      setTranslateX(0);
    }
  }, []);

  const handleClickOutside = useCallback((e: MouseEvent | TouchEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setTranslateX(0);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [handleClickOutside]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden md:overflow-visible", className)}
    >
      {/* Actions layer behind */}
      <div className="absolute inset-y-0 right-0 flex md:hidden">
        <button
          onClick={() => {
            onEdit();
            setTranslateX(0);
          }}
          className="flex w-[72px] items-center justify-center bg-indigo-600 text-white"
          aria-label="Edit"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </button>
        <button
          onClick={() => {
            onDelete();
            setTranslateX(0);
          }}
          className="flex w-[72px] items-center justify-center bg-rose-600 text-white"
          aria-label="Delete"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* Content layer */}
      <div
        className="relative z-10 transition-transform duration-200 ease-out md:translate-x-0"
        style={{
          transform: `translateX(-${translateX}px)`,
          transition: isDragging ? "none" : "transform 200ms ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
