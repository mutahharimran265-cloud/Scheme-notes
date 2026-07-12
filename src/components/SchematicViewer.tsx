"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchContentRef,
} from "react-zoom-pan-pinch";
import { STATUS_PIN_BG } from "@/lib/status";

export type PinData = {
  id: string;
  x: number;
  y: number;
  number: number;
  status: string;
};

type AnchorBox = {
  left: number;
  top: number;
  cw: number;
  ch: number;
  openLeft: boolean;
  openUp: boolean;
};

type Props = {
  fileUrl: string;
  fileType: string;
  pins: PinData[];
  activeId: string | null;
  draftPin: { x: number; y: number } | null;
  /** The popover content (composer or thread) to anchor at the active/draft pin. */
  overlay: React.ReactNode;
  onCanvasClick: (x: number, y: number) => void;
  onSelectPin: (id: string) => void;
};

const CLICK_MOVE_THRESHOLD = 5;
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export default function SchematicViewer({
  fileUrl,
  fileType,
  pins,
  activeId,
  draftPin,
  overlay,
  onCanvasClick,
  onSelectPin,
}: Props) {
  const isPdf = fileType === "pdf";

  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const apiRef = useRef<ReactZoomPanPinchContentRef | null>(null);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const scaleRef = useRef(1);

  const [pdfState, setPdfState] = useState<"loading" | "ready" | "error">(
    isPdf ? "loading" : "ready",
  );
  // Track the image load like the PDF: a schematic that fails to load shows a
  // clear message instead of a blank canvas, and (because pins only render once
  // ready) they never get positioned against a 0-size, not-yet-loaded image —
  // which is what made annotations look like they were in the wrong place.
  const [imgState, setImgState] = useState<"loading" | "ready" | "error">(
    isPdf ? "ready" : "loading",
  );
  const mediaState = isPdf ? pdfState : imgState;
  // Download progress for PDFs (0-99). Large schematics over slow links used to
  // sit on a silent "Rendering…" for a minute — show real progress instead.
  const [pdfProgress, setPdfProgress] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [anchorBox, setAnchorBox] = useState<AnchorBox | null>(null);

  const anchor = draftPin ?? pins.find((p) => p.id === activeId) ?? null;

  const setInvScale = useCallback((scale: number) => {
    containerRef.current?.style.setProperty("--inv-scale", String(1 / scale));
  }, []);

  // Fit the schematic into the viewport, centered.
  const fitView = useCallback(() => {
    const wrap = containerRef.current;
    const el = mediaRef.current;
    const api = apiRef.current;
    if (!wrap || !el || !api) return;
    const cw = wrap.clientWidth;
    const ch = wrap.clientHeight;
    const mw = el.offsetWidth;
    const mh = el.offsetHeight;
    if (!mw || !mh) return;
    const scale = Math.min(cw / mw, ch / mh) * 0.92;
    api.setTransform((cw - mw * scale) / 2, (ch - mh * scale) / 2, scale, 200);
    setInvScale(scale);
    setTick((t) => t + 1);
  }, [setInvScale]);

  // Pan + zoom to center a specific pin (used by sidebar / keyboard navigation).
  const focusPin = useCallback((xPct: number, yPct: number) => {
    const wrap = containerRef.current;
    const el = mediaRef.current;
    const api = apiRef.current;
    if (!wrap || !el || !api) return;
    const cw = wrap.clientWidth;
    const ch = wrap.clientHeight;
    const mw = el.offsetWidth;
    const mh = el.offsetHeight;
    if (!mw || !mh) return;
    const scale = Math.max(scaleRef.current, 1.4);
    const px = (xPct / 100) * mw;
    const py = (yPct / 100) * mh;
    api.setTransform(cw / 2 - px * scale, ch / 2 - py * scale, scale, 350);
  }, []);

  // When a comment becomes active, bring its pin into view.
  useEffect(() => {
    if (!activeId) return;
    const pin = pins.find((p) => p.id === activeId);
    if (pin) focusPin(pin.x, pin.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Render the first page of a PDF onto the canvas.
  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({ url: fileUrl });
        task.onProgress = ({ loaded, total }: { loaded: number; total?: number }) => {
          if (!cancelled && total) {
            setPdfProgress(Math.min(99, Math.round((loaded / total) * 100)));
          }
        };
        const pdf = await task.promise;
        const page = await pdf.getPage(1);
        // Cap the rendered canvas: oversized canvases exceed mobile limits
        // (iOS especially) and silently paint BLANK — the "not opening on my
        // phone" failure. 4096px on the long side is safe and still sharp.
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(2, 4096 / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        if (!cancelled) {
          setPdfState("ready");
          requestAnimationFrame(fitView);
        }
      } catch (err) {
        console.error("PDF render failed:", err);
        if (!cancelled) setPdfState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPdf, fileUrl, fitView]);

  // A cached image can already be `complete` before React attaches onLoad, which
  // would otherwise leave it stuck on "Loading…". Reconcile on mount / src change.
  useEffect(() => {
    if (isPdf) return;
    const img = imgRef.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth > 0) {
      setImgState("ready");
      requestAnimationFrame(fitView);
    } else {
      setImgState("error");
    }
  }, [isPdf, fileUrl, fitView]);

  // Recompute the popover anchor whenever the transform, anchor, or size changes.
  useLayoutEffect(() => {
    const el = mediaRef.current;
    const wrap = containerRef.current;
    if (!anchor || !el || !wrap) {
      setAnchorBox(null);
      return;
    }
    const m = el.getBoundingClientRect();
    const c = wrap.getBoundingClientRect();
    const left = m.left - c.left + (anchor.x / 100) * m.width;
    const top = m.top - c.top + (anchor.y / 100) * m.height;
    setAnchorBox({
      left,
      top,
      cw: c.width,
      ch: c.height,
      openLeft: left > c.width / 2,
      openUp: top > c.height / 2,
    });
  }, [anchor?.x, anchor?.y, tick]);

  // Keep anchor + fit correct on container resize.
  useEffect(() => {
    const onResize = () => setTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function pointFromEvent(e: React.PointerEvent) {
    const el = mediaRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return null;
    return { x, y };
  }

  function onPointerDown(e: React.PointerEvent) {
    downRef.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e: React.PointerEvent) {
    const down = downRef.current;
    downRef.current = null;
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved > CLICK_MOVE_THRESHOLD) return; // pan, not a click
    const pt = pointFromEvent(e);
    if (pt) onCanvasClick(pt.x, pt.y);
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ ["--inv-scale" as string]: 1 } as React.CSSProperties}
    >
      <TransformWrapper
        ref={apiRef}
        minScale={0.05}
        maxScale={16}
        initialScale={1}
        centerOnInit
        limitToBounds={false}
        doubleClick={{ disabled: true }}
        wheel={{ step: 0.12 }}
        panning={{ velocityDisabled: true }}
        onInit={() => {
          if (!isPdf) requestAnimationFrame(fitView);
        }}
        onTransform={(_ref, state) => {
          scaleRef.current = state.scale;
          setInvScale(state.scale);
          setTick((t) => t + 1);
        }}
      >
        {({ zoomIn, zoomOut }) => (
          <>
            <div className="absolute right-3 top-3 z-20 flex items-center gap-0.5 rounded-xl border border-black/[0.06] bg-white/85 p-1 shadow-lg shadow-black/5 backdrop-blur-md dark:border-white/[0.08] dark:bg-zinc-900/85">
              <ToolbarButton label="Zoom out" onClick={() => zoomOut()}>
                −
              </ToolbarButton>
              <ToolbarButton label="Zoom in" onClick={() => zoomIn()}>
                +
              </ToolbarButton>
              <ToolbarButton label="Fit to screen" onClick={fitView}>
                ⤢
              </ToolbarButton>
            </div>

            {mediaState !== "ready" && (
              <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
                {mediaState === "error" ? (
                  <span className="rounded-lg px-3 py-1.5 text-sm text-red-600">
                    {isPdf
                      ? "Could not render this PDF. Try a PNG/SVG export."
                      : "Couldn't load the schematic image. Check your connection and refresh."}
                  </span>
                ) : (
                  <span className="flex items-center gap-2.5 rounded-xl border border-black/[0.06] bg-white/90 px-4 py-2 text-sm text-zinc-600 shadow-lg backdrop-blur dark:border-white/[0.08] dark:bg-zinc-900/90 dark:text-zinc-300">
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    {isPdf && pdfProgress !== null
                      ? `Downloading schematic… ${pdfProgress}%`
                      : "Loading schematic…"}
                  </span>
                )}
              </div>
            )}

            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ width: "100%", height: "100%" }}
            >
              <div
                ref={mediaRef}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                className="relative select-none"
              >
                {isPdf ? (
                  <canvas ref={canvasRef} className="block max-w-none" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    ref={imgRef}
                    src={fileUrl}
                    alt="Schematic"
                    fetchPriority="high"
                    className="block max-w-none"
                    draggable={false}
                    onLoad={() => {
                      setImgState("ready");
                      requestAnimationFrame(fitView);
                    }}
                    onError={() => setImgState("error")}
                  />
                )}

                {/* Comment pins — counter-scaled so they stay a constant screen size.
                    Only rendered once the media is ready so they anchor to the
                    correctly-sized image, never a 0-size/not-yet-loaded box. */}
                {mediaState === "ready" && pins.map((p) => (
                  <button
                    key={p.id}
                    onPointerDown={stop}
                    onPointerUp={stop}
                    onClick={(e) => {
                      stop(e);
                      onSelectPin(p.id);
                    }}
                    title={`Comment ${p.number}`}
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      transform:
                        "translate(-50%,-50%) scale(var(--inv-scale))",
                    }}
                    className={`absolute grid h-7 w-7 place-items-center rounded-full text-xs font-semibold text-white shadow-md ring-2 ring-white/80 transition-transform hover:scale-110 ${
                      STATUS_PIN_BG[p.status] ?? "bg-indigo-600"
                    } ${
                      activeId === p.id
                        ? "outline outline-2 outline-offset-2 outline-indigo-500"
                        : ""
                    }`}
                  >
                    {p.number}
                  </button>
                ))}

                {/* Draft pin (new, unsaved comment) */}
                {draftPin && (
                  <span
                    style={{
                      left: `${draftPin.x}%`,
                      top: `${draftPin.y}%`,
                      transform:
                        "translate(-50%,-50%) scale(var(--inv-scale))",
                    }}
                    className="pointer-events-none absolute grid h-7 w-7 animate-pulse place-items-center rounded-full bg-indigo-600/90 text-xs font-semibold text-white shadow-md ring-2 ring-white"
                  >
                    +
                  </span>
                )}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Anchored popover (composer / thread), positioned in container space */}
      {anchorBox && overlay && (
        <div
          className="absolute z-30"
          style={{
            left: anchorBox.openLeft ? undefined : anchorBox.left + 16,
            right: anchorBox.openLeft
              ? anchorBox.cw - anchorBox.left + 16
              : undefined,
            top: anchorBox.openUp ? undefined : anchorBox.top + 16,
            bottom: anchorBox.openUp
              ? anchorBox.ch - anchorBox.top + 16
              : undefined,
          }}
        >
          {overlay}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded text-lg leading-none text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}
