"use client";

import React from "react";

// ── SwipeableRow：左滑展開右側操作按鈕、右滑展開左側按鈕 ──────────────────
// 使用 Pointer Events API + setPointerCapture，同時支援 mouse 和 touch
export default function SwipeableRow({
  children,
  onEdit,
  onDelete,
  onSwipeRight,
  editLabel = "編輯",
  deleteLabel = "刪除",
  swipeRightLabel = "調整",
  swipeRightColor = "bg-orange-500",
  isOpen = false,
}: {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onSwipeRight?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  swipeRightLabel?: string;
  swipeRightColor?: string;
  isOpen?: boolean;
}) {
  const RIGHT_BTN_W = (onEdit ? 60 : 0) + (onDelete ? 60 : 0);
  const LEFT_BTN_W  = onSwipeRight ? 72 : 0;
  const SNAP_THRESHOLD = 30;

  const [offset, setOffset] = React.useState(0);
  const offsetRef   = React.useRef(0);
  const startX      = React.useRef(0);
  const startY      = React.useRef(0);
  const startOff    = React.useRef(0);
  const didSwipe    = React.useRef(false);
  const dirLocked   = React.useRef<"h" | "v" | null>(null);

  React.useEffect(() => { offsetRef.current = offset; }, [offset]);
  React.useEffect(() => { if (!isOpen) setOffset(0); }, [isOpen]);

  const close = () => setOffset(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startX.current   = e.clientX;
    startY.current   = e.clientY;
    startOff.current = offsetRef.current;
    didSwipe.current  = false;
    dirLocked.current = null;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (dirLocked.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      dirLocked.current = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
      if (dirLocked.current === "h") {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }

    if (dirLocked.current !== "h") return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

    if (Math.abs(dx) > 5) didSwipe.current = true;
    const raw = startOff.current + dx;
    setOffset(Math.max(-RIGHT_BTN_W, Math.min(LEFT_BTN_W, raw)));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const o = offsetRef.current;
    if      (o < -SNAP_THRESHOLD) setOffset(-RIGHT_BTN_W);
    else if (o >  SNAP_THRESHOLD) setOffset(LEFT_BTN_W);
    else                          setOffset(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* 左側按鈕（右滑展開）*/}
      {onSwipeRight && (
        <div className="absolute left-0 top-0 bottom-0 flex" style={{ width: LEFT_BTN_W }}>
          <button onClick={() => { close(); onSwipeRight(); }}
            className={`flex-1 ${swipeRightColor} text-white text-[11px] font-semibold flex items-center justify-center`}
          >{swipeRightLabel}</button>
        </div>
      )}
      {/* 右側按鈕（左滑展開）*/}
      {RIGHT_BTN_W > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex" style={{ width: RIGHT_BTN_W }}>
          {onEdit && (
            <button onClick={() => { close(); onEdit(); }}
              className="flex-1 bg-blue-500 text-white text-[11px] font-semibold flex items-center justify-center"
            >{editLabel}</button>
          )}
          {onDelete && (
            <button onClick={() => { close(); onDelete(); }}
              className="flex-1 bg-destructive text-white text-[11px] font-semibold flex items-center justify-center"
            >{deleteLabel}</button>
          )}
        </div>
      )}
      {/* 內容層 */}
      <div
        style={{ transform: `translateX(${offset}px)`, transition: offset === 0 || Math.abs(offset) === RIGHT_BTN_W || Math.abs(offset) === LEFT_BTN_W ? "transform 0.2s ease" : "none" }}
        className="relative bg-background select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClickCapture={e => { if (didSwipe.current) { e.stopPropagation(); didSwipe.current = false; } }}
      >
        {children}
      </div>
    </div>
  );
}
