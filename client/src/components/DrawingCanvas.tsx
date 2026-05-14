import { useRef, useEffect, useCallback, useState } from "react";
import type { DrawingStroke, DrawingPoint } from "shared/types";

const COLORS = [
  "#000000", // black
  "#444444", // dark gray
  "#888888", // gray
  "#FFFFFF", // white
  "#FF0000", // red
  "#FF5722", // deep orange
  "#FF8800", // orange
  "#FFCC00", // yellow
  "#8BC34A", // light green
  "#00CC00", // green
  "#009688", // teal
  "#0088FF", // blue
  "#3F51B5", // indigo
  "#8800FF", // purple
  "#E91E63", // pink
  "#795548", // brown
];

const BRUSH_SIZES = [4, 8, 14];

type Tool = "brush" | "eraser" | "fill";

interface Props {
  isDrawer: boolean;
  onStroke?: (stroke: DrawingStroke) => void;
  onClear?: () => void;
  onUndo?: () => void;
  onFill?: (color: string, x: number, y: number) => void;
  onLivePoint?: (
    point: DrawingPoint,
    color: string,
    width: number,
    isStart: boolean,
  ) => void;
  incomingStroke?: DrawingStroke | null;
  incomingFill?: { color: string; x: number; y: number } | null;
  incomingLivePoint?: {
    point: DrawingPoint;
    color: string;
    width: number;
    isStart: boolean;
  } | null;
  clearSignal?: number; // increment to clear
}

export default function DrawingCanvas({
  isDrawer,
  onStroke,
  onClear,
  onUndo,
  onFill,
  onLivePoint,
  incomingStroke,
  incomingFill,
  incomingLivePoint,
  clearSignal,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState("#000000");
  const [customColor, setCustomColor] = useState("#FF69B4");
  const [brushSize, setBrushSize] = useState(8);
  const [tool, setTool] = useState<Tool>("brush");

  // Drawing state
  const isDrawing = useRef(false);
  const currentPoints = useRef<DrawingPoint[]>([]);
  const strokesRef = useRef<DrawingStroke[]>([]);
  const lastLiveEmitTime = useRef(0);
  const liveLastPoint = useRef<DrawingPoint | null>(null);

  // Canvas dimensions (logical)
  const CANVAS_W = 800;
  const CANVAS_H = 500;

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // Draw a single stroke on canvas
  const drawStroke = useCallback((stroke: DrawingStroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (stroke.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const first = stroke.points[0];
    ctx.moveTo(first.x * CANVAS_W, first.y * CANVAS_H);
    for (let i = 1; i < stroke.points.length; i++) {
      const p = stroke.points[i];
      ctx.lineTo(p.x * CANVAS_W, p.y * CANVAS_H);
    }
    ctx.stroke();
  }, []);

  // Handle incoming strokes from server (viewer mode)
  useEffect(() => {
    if (!incomingStroke) return;
    liveLastPoint.current = null; // Clear live state, finalized stroke replaces it
    strokesRef.current.push(incomingStroke);
    drawStroke(incomingStroke);
  }, [incomingStroke, drawStroke]);

  // Handle incoming live points from server (viewer mode — draw incrementally)
  useEffect(() => {
    if (!incomingLivePoint) return;
    const { point, color: liveColor, width, isStart } = incomingLivePoint;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (isStart || !liveLastPoint.current) {
      // Draw a dot for the start of a new stroke
      ctx.beginPath();
      ctx.fillStyle = liveColor;
      ctx.arc(
        point.x * CANVAS_W,
        point.y * CANVAS_H,
        width / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else {
      // Draw line segment from last live point
      ctx.beginPath();
      ctx.strokeStyle = liveColor;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(
        liveLastPoint.current.x * CANVAS_W,
        liveLastPoint.current.y * CANVAS_H,
      );
      ctx.lineTo(point.x * CANVAS_W, point.y * CANVAS_H);
      ctx.stroke();
    }
    liveLastPoint.current = point;
  }, [incomingLivePoint]);

  // Handle clear signal
  useEffect(() => {
    if (clearSignal === undefined) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    strokesRef.current = [];
  }, [clearSignal]);

  // Get normalized coordinates from pointer event
  const getPoint = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): DrawingPoint => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    },
    [],
  );

  // Flood fill implementation
  const floodFill = useCallback(
    (startX: number, startY: number, fillColor: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
      const data = imageData.data;

      // Parse fill color
      const r = parseInt(fillColor.slice(1, 3), 16);
      const g = parseInt(fillColor.slice(3, 5), 16);
      const b = parseInt(fillColor.slice(5, 7), 16);

      const pixelX = Math.floor(startX * CANVAS_W);
      const pixelY = Math.floor(startY * CANVAS_H);
      const startIdx = (pixelY * CANVAS_W + pixelX) * 4;

      const targetR = data[startIdx];
      const targetG = data[startIdx + 1];
      const targetB = data[startIdx + 2];
      const targetA = data[startIdx + 3];

      // Don't fill if clicking on the same color
      if (targetR === r && targetG === g && targetB === b && targetA === 255)
        return;

      const tolerance = 20;
      const matchesTarget = (idx: number) => {
        return (
          Math.abs(data[idx] - targetR) <= tolerance &&
          Math.abs(data[idx + 1] - targetG) <= tolerance &&
          Math.abs(data[idx + 2] - targetB) <= tolerance &&
          Math.abs(data[idx + 3] - targetA) <= tolerance
        );
      };

      const stack: [number, number][] = [[pixelX, pixelY]];
      const visited = new Uint8Array(CANVAS_W * CANVAS_H);

      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        if (cx < 0 || cx >= CANVAS_W || cy < 0 || cy >= CANVAS_H) continue;
        const vIdx = cy * CANVAS_W + cx;
        if (visited[vIdx]) continue;
        visited[vIdx] = 1;

        const idx = vIdx * 4;
        if (!matchesTarget(idx)) continue;

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;

        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }

      ctx.putImageData(imageData, 0, 0);
    },
    [],
  );

  // Handle incoming fill from server (viewer mode)
  useEffect(() => {
    if (!incomingFill) return;
    floodFill(incomingFill.x, incomingFill.y, incomingFill.color);
  }, [incomingFill, floodFill]);

  // Pointer handlers (drawer only)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawer) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const point = getPoint(e);

      if (tool === "fill") {
        floodFill(point.x, point.y, color);
        onFill?.(color, point.x, point.y);
        return;
      }

      canvas.setPointerCapture(e.pointerId);
      isDrawing.current = true;
      currentPoints.current = [point];

      // Emit live point for start of stroke
      const liveColor = tool === "eraser" ? "#FFFFFF" : color;
      const liveWidth = tool === "eraser" ? brushSize * 2 : brushSize;
      onLivePoint?.(point, liveColor, liveWidth, true);
      lastLiveEmitTime.current = Date.now();

      // Draw dot for single click
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.fillStyle = tool === "eraser" ? "#FFFFFF" : color;
        ctx.arc(
          point.x * CANVAS_W,
          point.y * CANVAS_H,
          (tool === "eraser" ? brushSize * 2 : brushSize) / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    },
    [
      isDrawer,
      color,
      brushSize,
      tool,
      getPoint,
      floodFill,
      onFill,
      onLivePoint,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawer || !isDrawing.current) return;
      e.preventDefault();
      const point = getPoint(e);
      currentPoints.current.push(point);

      // Emit live point (throttled to ~30fps to reduce network traffic)
      const now = Date.now();
      if (now - lastLiveEmitTime.current >= 33) {
        const liveColor = tool === "eraser" ? "#FFFFFF" : color;
        const liveWidth = tool === "eraser" ? brushSize * 2 : brushSize;
        onLivePoint?.(point, liveColor, liveWidth, false);
        lastLiveEmitTime.current = now;
      }

      // Draw incrementally
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const points = currentPoints.current;
      if (points.length < 2) return;

      const prev = points[points.length - 2];
      const curr = points[points.length - 1];
      ctx.beginPath();
      ctx.strokeStyle = tool === "eraser" ? "#FFFFFF" : color;
      ctx.lineWidth = tool === "eraser" ? brushSize * 2 : brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(prev.x * CANVAS_W, prev.y * CANVAS_H);
      ctx.lineTo(curr.x * CANVAS_W, curr.y * CANVAS_H);
      ctx.stroke();
    },
    [isDrawer, color, brushSize, tool, getPoint, onLivePoint],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawer || !isDrawing.current) return;
      e.preventDefault();
      isDrawing.current = false;

      if (currentPoints.current.length > 0) {
        const stroke: DrawingStroke = {
          points: [...currentPoints.current],
          color: tool === "eraser" ? "#FFFFFF" : color,
          width: tool === "eraser" ? brushSize * 2 : brushSize,
        };
        strokesRef.current.push(stroke);
        onStroke?.(stroke);
      }
      currentPoints.current = [];
    },
    [isDrawer, color, brushSize, tool, onStroke],
  );

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    strokesRef.current = [];
    onClear?.();
  };

  const handleUndo = () => {
    // Redraw all strokes except the last one
    strokesRef.current.pop();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    for (const s of strokesRef.current) {
      drawStroke(s);
    }
    onUndo?.();
  };

  return (
    <div
      className="flex flex-col items-center w-full max-h-full"
      ref={containerRef}
    >
      {/* Canvas */}
      <div
        className={`w-full max-w-[800px] aspect-[8/5] ${isDrawer ? "max-h-[calc(100%-48px)]" : "max-h-full"} relative rounded-xl overflow-hidden border-2 border-gray-200 bg-white shadow-inner`}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{
            touchAction: "none",
            cursor: isDrawer
              ? tool === "fill"
                ? "cell"
                : "crosshair"
              : "default",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      {/* Toolbar (drawer only) */}
      {isDrawer && (
        <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
          {/* Colors */}
          <div className="flex gap-1 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  if (tool === "eraser") setTool("brush");
                }}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  color === c && tool !== "eraser"
                    ? "border-teal-500 scale-110 shadow-md"
                    : "border-gray-300"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            {/* Custom color picker */}
            <label
              className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer relative overflow-hidden flex items-center justify-center ${
                color === customColor &&
                !COLORS.includes(color) &&
                tool !== "eraser"
                  ? "border-teal-500 scale-110 shadow-md"
                  : "border-gray-300"
              }`}
              style={{ backgroundColor: customColor }}
              title="Kies een kleur"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-3 h-3 drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]"
                style={{ color: "#fff" }}
              >
                <path d="M17.66 5.41l.92.92-2.69 2.69-.92-.92 2.69-2.69M17.67 3c-.26 0-.51.1-.71.29l-3.12 3.12-1.93-1.91-1.41 1.41 1.42 1.42L3 16.25V21h4.75l8.92-8.92 1.42 1.42 1.41-1.41-1.92-1.92 3.12-3.12c.4-.4.4-1.03.01-1.42l-2.34-2.34c-.2-.19-.45-.29-.7-.29z" />
              </svg>
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setColor(e.target.value);
                  if (tool === "eraser") setTool("brush");
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Brush sizes */}
          <div className="flex gap-1 items-center">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => {
                  setBrushSize(size);
                  if (tool !== "brush") setTool("brush");
                }}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                  brushSize === size && tool === "brush"
                    ? "bg-teal-100 border-2 border-teal-400"
                    : "bg-gray-100 border border-gray-200"
                }`}
              >
                <div
                  className="rounded-full bg-gray-800"
                  style={{ width: size, height: size }}
                />
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Fill tool */}
          <button
            onClick={() => setTool(tool === "fill" ? "brush" : "fill")}
            className={`px-3 py-1.5 rounded-lg text-sm font-display font-bold transition-all ${
              tool === "fill"
                ? "bg-teal-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title="Vul"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5 inline-block"
            >
              <path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15a1.49 1.49 0 000 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z" />
            </svg>
          </button>

          {/* Eraser */}
          <button
            onClick={() => setTool(tool === "eraser" ? "brush" : "eraser")}
            className={`px-3 py-1.5 rounded-lg text-sm font-display font-bold transition-all ${
              tool === "eraser"
                ? "bg-teal-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🧽
          </button>

          {/* Undo */}
          <button
            onClick={handleUndo}
            className="px-3 py-1.5 rounded-lg text-sm font-display font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
          >
            ↩️
          </button>

          {/* Clear */}
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-lg text-sm font-display font-bold bg-red-100 text-red-600 hover:bg-red-200 transition-all"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}
