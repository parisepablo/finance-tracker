"use client";

import { useRef, useState, useCallback } from "react";
import { useSwipeableRowContext } from "./swipeable-row-context";

interface SwipeableRowProps {
  rowId: string;
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export function SwipeableRow({
  rowId,
  children,
  onEdit,
  onDelete,
  className,
}: SwipeableRowProps) {
  const { openRowId, setOpenRowId, closeAll } = useSwipeableRowContext();
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const hasDecidedRef = useRef<boolean>(false);
  const isHorizontalRef = useRef<boolean>(false);
  const ACTION_WIDTH = 144;
  const SNAP_THRESHOLD = 72;

  const isOpen = openRowId === rowId;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const el = rowRef.current;
      if (!el) return;

      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        return;
      }

      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      currentXRef.current = e.clientX;
      hasDecidedRef.current = false;
      isHorizontalRef.current = false;
      setIsDragging(true);

      // Close any other open row
      if (openRowId && openRowId !== rowId) {
        closeAll();
      }
    },
    [openRowId, closeAll, rowId]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const el = rowRef.current;
      if (!el) return;

      const deltaX = e.clientX - startXRef.current;
      const deltaY = e.clientY - startYRef.current;
      currentXRef.current = e.clientX;

      if (!hasDecidedRef.current) {
        const absDx = Math.abs(deltaX);
        const absDy = Math.abs(deltaY);
        if (absDx > 10 || absDy > 10) {
          hasDecidedRef.current = true;
          if (absDx > absDy) {
            isHorizontalRef.current = true;
          } else {
            // Vertical scroll — release capture and let the browser handle it
            isHorizontalRef.current = false;
            try {
              el.releasePointerCapture(e.pointerId);
            } catch {
              // ignore
            }
            setIsDragging(false);
            return;
          }
        }
      }

      if (!isHorizontalRef.current) return;

      // Only allow swiping left (negative deltaX)
      let newOffset = -deltaX;
      if (newOffset < 0) newOffset = 0;
      if (newOffset > ACTION_WIDTH) newOffset = ACTION_WIDTH;
      setOffset(newOffset);
    },
    []
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const el = rowRef.current;
      if (!el) return;

      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      setIsDragging(false);

      if (!isHorizontalRef.current) {
        setOffset(0);
        return;
      }

      const deltaX = startXRef.current - currentXRef.current;
      if (deltaX > SNAP_THRESHOLD) {
        setOffset(ACTION_WIDTH);
        setOpenRowId(rowId);
      } else {
        setOffset(0);
        if (openRowId === rowId) {
          setOpenRowId(null);
        }
      }
    },
    [rowId, setOpenRowId, openRowId]
  );

  // Sync offset when row is opened/closed programmatically
  const targetOffset = isOpen ? ACTION_WIDTH : 0;
  const displayOffset = isDragging ? offset : targetOffset;

  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Action buttons — always rendered, revealed by sliding row */}
      <div
        className="md:hidden"
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          display: "flex",
          width: ACTION_WIDTH,
        }}
      >
        <button
          onClick={() => {
            onEdit();
            setOpenRowId(null);
          }}
          className="flex h-full w-[72px] items-center justify-center bg-indigo-600 text-white"
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
            setOpenRowId(null);
          }}
          className="flex h-full w-[72px] items-center justify-center bg-rose-600 text-white"
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

      {/* The actual row content that slides */}
      <div
        ref={rowRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          transform: `translateX(-${displayOffset}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease",
          backgroundColor: "rgb(24, 24, 27)",
          position: "relative",
          zIndex: 1,
          touchAction: "pan-y",
          boxShadow: "-4px 0 8px rgba(0,0,0,0.3)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
