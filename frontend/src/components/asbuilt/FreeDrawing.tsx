import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActiveSelection,
  Canvas,
  Circle,
  FabricImage,
  FabricText,
  IText,
  Textbox,
  Group as FabricGroup,
  Line,
  PencilBrush,
  Rect,
  Triangle,
  type FabricObject,
} from "fabric";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bold,
  BringToFront,
  Circle as CircleIcon,
  Copy,
  Download,
  MoreHorizontal,
  SlidersHorizontal,
  X,
  Group,
  ImagePlus,
  Italic,
  Layers,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  RectangleHorizontal,
  SendToBack,
  Square,
  Trash2,
  Type,
  Ungroup,
  Undo2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Link2,
  Save,
  Search,
  Upload,
  Maximize,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import asbuiltApi, { type IconAsset } from "../../services/asbuiltApi";

interface Props {
  onToast: (msg: string, type?: "success" | "error") => void;
}

type Tool = "select" | "text" | "rect" | "roundRect" | "circle" | "line" | "arrow" | "draw" | "connect";
type DraftData = { name: string; canvasSize: { width: number; height: number }; background: string; json: string; savedAt: string };
const DRAFT_KEY = "freedrawing:draft:v1";
function iconCategoryOf(filename: string): string {
  const n = filename.toLowerCase();
  if (n.includes("pc")) return "PC";
  if (n.includes("router")) return "Router";
  if (n.includes("odp")) return "ODP";
  if (n.includes("ont")) return "ONT";
  if (n.includes("kabel") || n.includes("cable") || n.includes("fiber")) return "Kabel";
  if (n.includes("ttd") || n.includes("tanda")) return "Tanda Tangan";
  return "Lainnya";
}
function objectNameOf(obj: FabricObject): string {
  const dataIcon = (obj as any).get?.("dataIcon") as string | undefined;
  if (dataIcon) return dataIcon;
  if ((obj as any).get?.("dataConnection")) return "Koneksi";
  if (objectIsText(obj)) return (obj.text || "Teks").slice(0, 24) || "Teks";
  return obj.type || "Object";
}
function slugifyName(name: string): string {
  const slug = name.trim().replace(/[^a-zA-Z0-9-_ ]+/g, "").replace(/\s+/g, "-");
  return slug || "free-drawing";
}
type HistoryState = string;

const DEFAULT_WIDTH = 1600;
const DEFAULT_HEIGHT = 900;
const ZOOM_MIN = 0.15;
const ZOOM_MAX = 2;
const HISTORY_LIMIT = 80;

function objectIsText(obj: FabricObject | undefined): obj is IText {
  return !!obj && (obj.type === "text" || obj.type === "i-text" || obj.type === "textbox");
}

function getObjectFill(obj: FabricObject | undefined): string {
  const fill = obj?.get("fill");
  return typeof fill === "string" ? fill : "#111827";
}

function getObjectStroke(obj: FabricObject | undefined): string {
  const stroke = obj?.get("stroke");
  return typeof stroke === "string" ? stroke : "#111827";
}

export default function FreeDrawing({ onToast }: Props) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const historyRef = useRef<HistoryState[]>([]);
  const historyIndexRef = useRef(-1);
  const restoringRef = useRef(false);
  const clipboardRef = useRef<FabricObject[] | null>(null);

  const [icons, setIcons] = useState<IconAsset[]>([]);
  const [loadingIcons, setLoadingIcons] = useState(true);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [tool, setTool] = useState<Tool>("select");
  const [canvasSize, setCanvasSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [widthInput, setWidthInput] = useState(String(DEFAULT_WIDTH));
  const [heightInput, setHeightInput] = useState(String(DEFAULT_HEIGHT));
  useEffect(() => {
    setWidthInput(String(canvasSize.width));
    setHeightInput(String(canvasSize.height));
  }, [canvasSize.width, canvasSize.height]);

  const handleWidthChange = (val: string) => {
    setWidthInput(val);
    const n = Number(val);
    if (!isNaN(n) && n >= 50 && n <= 10000) {
      setCanvasSize((s) => ({ ...s, width: n }));
    }
  };
  const handleWidthBlur = () => {
    const parsed = Math.max(50, Math.min(10000, Number(widthInput) || DEFAULT_WIDTH));
    setWidthInput(String(parsed));
    setCanvasSize((s) => ({ ...s, width: parsed }));
  };

  const handleHeightChange = (val: string) => {
    setHeightInput(val);
    const n = Number(val);
    if (!isNaN(n) && n >= 50 && n <= 10000) {
      setCanvasSize((s) => ({ ...s, height: n }));
    }
  };
  const handleHeightBlur = () => {
    const parsed = Math.max(50, Math.min(10000, Number(heightInput) || DEFAULT_HEIGHT));
    setHeightInput(String(parsed));
    setCanvasSize((s) => ({ ...s, height: parsed }));
  };
  const [zoom, setZoom] = useState(0.65);
  const zoomRef = useRef(zoom);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDirty, setIsDirty] = useState(false);
  const [docName, setDocName] = useState("Asbuilt Baru");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [draftInfo, setDraftInfo] = useState<DraftData | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [iconQuery, setIconQuery] = useState("");
  const [iconCategory, setIconCategory] = useState("Semua");
  const [connectFrom, setConnectFrom] = useState<FabricObject | null>(null);
  const [lockAspect, setLockAspect] = useState(true);
  const docNameRef = useRef(docName);
  const backgroundRef = useRef("#ffffff");
  const connectFromRef = useRef<FabricObject | null>(null);
  const userEditedRef = useRef(false);
  const [background, setBackground] = useState("#ffffff");
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const snapEnabledRef = useRef(snapEnabled);
  const gridSizeRef = useRef(gridSize);
  const [strokeColor, setStrokeColor] = useState("#111827");
  const [fillColor, setFillColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(18);
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"tools" | "icons" | "properties" | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { docNameRef.current = docName; }, [docName]);
  useEffect(() => { backgroundRef.current = background; }, [background]);
  useEffect(() => { connectFromRef.current = connectFrom; }, [connectFrom]);
  useEffect(() => { snapEnabledRef.current = snapEnabled; }, [snapEnabled]);
  useEffect(() => { gridSizeRef.current = gridSize; }, [gridSize]);
  // Draft recovery info (explicit restore, never auto-overwrites on mount).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setDraftInfo(JSON.parse(raw) as DraftData);
    } catch { /* ignore corrupt draft */ }
  }, []);

  // --- Canvas zoom (Ctrl/Cmd+Scroll, pinch, keyboard) ---
  // Why this exists: the old zoom was only a CSS scale on the wrapper div
  // and there was no wheel handler at all, so Ctrl+Scroll fell through to
  // the browser and zoomed the whole page instead of the canvas.
  const canvasSizeRef = useRef(canvasSize);
  useEffect(() => { canvasSizeRef.current = canvasSize; }, [canvasSize]);
  const zoomAnchorRef = useRef<{ canvasX: number; canvasY: number; cursorX: number; cursorY: number } | null>(null);
  const pinchRef = useRef<{ distance: number; midX: number; midY: number } | null>(null);

  const clampZoom = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(value.toFixed(2))));

  // Zoom so that the canvas point under (clientX, clientY) stays under the
  // cursor after the zoom. Scroll is adjusted after React applies the new
  // zoom, because the wrapper size (canvasSize * zoom) only changes then.
  const zoomAtPoint = useCallback((clientX: number, clientY: number, nextZoomRaw: number) => {
    const node = workspaceRef.current;
    if (!node) return;
    const nextZoom = clampZoom(nextZoomRaw);
    const oldZoom = zoomRef.current;
    if (Math.abs(nextZoom - oldZoom) < 0.001) return;
    const rect = node.getBoundingClientRect();
    const cursorX = clientX - rect.left;
    const cursorY = clientY - rect.top;
    const contentWidth = canvasSizeRef.current.width * oldZoom;
    const contentHeight = canvasSizeRef.current.height * oldZoom;
    const offsetX = node.clientWidth > contentWidth ? (node.clientWidth - contentWidth) / 2 : 0;
    const offsetY = node.clientHeight > contentHeight ? (node.clientHeight - contentHeight) / 2 : 0;
    zoomAnchorRef.current = {
      canvasX: (node.scrollLeft + cursorX - offsetX) / oldZoom,
      canvasY: (node.scrollTop + cursorY - offsetY) / oldZoom,
      cursorX,
      cursorY,
    };
    setZoom(nextZoom);
  }, []);

  const zoomAtCenter = useCallback((nextZoomRaw: number) => {
    const node = workspaceRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, nextZoomRaw);
  }, [zoomAtPoint]);

  useEffect(() => {
    const anchor = zoomAnchorRef.current;
    const node = workspaceRef.current;
    if (!anchor || !node) return;
    zoomAnchorRef.current = null;
    requestAnimationFrame(() => {
      const newContentWidth = canvasSizeRef.current.width * zoom;
      const newContentHeight = canvasSizeRef.current.height * zoom;
      const newOffsetX = node.clientWidth > newContentWidth ? (node.clientWidth - newContentWidth) / 2 : 0;
      const newOffsetY = node.clientHeight > newContentHeight ? (node.clientHeight - newContentHeight) / 2 : 0;
      node.scrollLeft = Math.max(0, anchor.canvasX * zoom + newOffsetX - anchor.cursorX);
      node.scrollTop = Math.max(0, anchor.canvasY * zoom + newOffsetY - anchor.cursorY);
    });
  }, [zoom]);

  useEffect(() => {
    // v2: listen on window in the CAPTURE phase, not only on the workspace
    // element. This catches Ctrl+Scroll even if a child (e.g. the Fabric
    // canvas) stops propagation, and before the browser's page-zoom gesture
    // runs. The target check keeps Ctrl+Scroll over the side panels
    // behaving like normal browser zoom.
    // Must be non-passive: a passive wheel listener cannot preventDefault,
    // and the browser would still zoom the whole page on Ctrl+Scroll.
    const onWheel = (event: WheelEvent) => {
      const node = workspaceRef.current;
      if (!node || !node.contains(event.target as Node)) return;
      if (!event.ctrlKey && !event.metaKey) return; // plain scroll = pan/scroll, untouched
      event.preventDefault();
      event.stopPropagation();
      // deltaMode 1 = lines (e.g. Firefox); normalise to pixels.
      const deltaY = event.deltaMode === 1 ? event.deltaY * 33 : event.deltaY;
      // Exponential factor: smooth on trackpads (tiny deltas) and mice
      // (large deltas), instead of a fixed 10% jump per notch.
      zoomAtPoint(event.clientX, event.clientY, zoomRef.current * Math.exp(-deltaY * 0.002));
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      const [a, b] = [event.touches[0], event.touches[1]];
      pinchRef.current = {
        distance: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
        midX: (a.clientX + b.clientX) / 2,
        midY: (a.clientY + b.clientY) / 2,
      };
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchRef.current) return;
      event.preventDefault();
      const [a, b] = [event.touches[0], event.touches[1]];
      const distance = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const midX = (a.clientX + b.clientX) / 2;
      const midY = (a.clientY + b.clientY) / 2;
      if (distance > 0 && pinchRef.current.distance > 0) {
        zoomAtPoint(midX, midY, zoomRef.current * (distance / pinchRef.current.distance));
      }
      pinchRef.current = { distance, midX, midY };
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchRef.current = null;
    };
    const node = workspaceRef.current;
    if (node) {
      node.addEventListener("touchstart", onTouchStart, { passive: false });
      node.addEventListener("touchmove", onTouchMove, { passive: false });
      node.addEventListener("touchend", onTouchEnd);
      node.addEventListener("touchcancel", onTouchEnd);
    }
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      if (node) {
        node.removeEventListener("touchstart", onTouchStart);
        node.removeEventListener("touchmove", onTouchMove);
        node.removeEventListener("touchend", onTouchEnd);
        node.removeEventListener("touchcancel", onTouchEnd);
      }
    };
  }, [zoomAtPoint]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const node = workspaceRef.current;
    if (!node) return;
    const fit = () => {
      const availableWidth = Math.max(220, node.clientWidth - 24);
      const availableHeight = Math.max(220, node.clientHeight - 24);
      const nextZoom = Math.min(1.25, Math.max(0.15, Math.min(availableWidth / canvasSize.width, availableHeight / canvasSize.height)));
      const rounded = Number(nextZoom.toFixed(2));
      setZoom((current) => Math.abs(current - rounded) > 0.01 ? rounded : current);
    };
    const observer = new ResizeObserver(() => requestAnimationFrame(fit));
    observer.observe(node);
    fit();
    return () => observer.disconnect();
  }, [isMobile, canvasSize.height, canvasSize.width]);

  const syncSelection = useCallback(() => {
    const canvas = fabricRef.current;
    setSelectedObject(canvas?.getActiveObject() || null);
  }, []);

  const serialize = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return "";
    return JSON.stringify(canvas.toJSON(["dataIcon", "dataObjectId", "dataConnection"]));
  }, []);

  const updateHistoryState = useCallback(() => {
    setHistoryIndex(historyIndexRef.current);
  }, []);

  const pushHistory = useCallback(() => {
    if (restoringRef.current) return;
    const state = serialize();
    if (!state) return;

    const current = historyRef.current[historyIndexRef.current];
    if (current === state) return;

    const next = historyRef.current.slice(0, historyIndexRef.current + 1);
    next.push(state);
    if (next.length > HISTORY_LIMIT) next.shift();
    historyRef.current = next;
    historyIndexRef.current = next.length - 1;
    setIsDirty(true);
    updateHistoryState();
  }, [serialize, updateHistoryState]);


  const iconCategories = useMemo(() => {
    const set = new Set<string>(["Semua"]);
    icons.forEach((icon) => set.add(iconCategoryOf(icon.filename)));
    return [...set];
  }, [icons]);
  const filteredIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    return icons.filter((icon) => {
      if (iconCategory !== "Semua" && iconCategoryOf(icon.filename) !== iconCategory) return false;
      if (q && !icon.filename.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [icons, iconQuery, iconCategory]);

  const saveDraft = useCallback(async (silent = false) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const data: DraftData = {
      name: docNameRef.current,
      canvasSize: canvasSizeRef.current,
      background: backgroundRef.current,
      json: JSON.stringify(canvas.toJSON(["dataIcon", "dataObjectId", "dataConnection"])),
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      setSavedAt(data.savedAt);
      setIsDirty(false);
      if (!silent) onToast(`Draft "${data.name}" tersimpan`, "success");
    } catch {
      if (!silent) onToast("Gagal menyimpan draft (penyimpanan penuh?)", "error");
    }
  }, [onToast]);

  // Autosave (debounced) only after a real user edit, so the empty canvas
  // created on mount never wipes a recoverable draft.
  useEffect(() => {
    if (!userEditedRef.current) return;
    const t = window.setTimeout(() => { void saveDraft(true); }, 1000);
    return () => window.clearTimeout(t);
  }, [historyIndex, saveDraft]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const restoreDraft = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas || !draftInfo) return;
    restoringRef.current = true;
    try {
      await canvas.loadFromJSON(draftInfo.json);
      setDocName(draftInfo.name);
      setCanvasSize(draftInfo.canvasSize);
      setBackground(draftInfo.background);
      canvas.requestRenderAll();
      syncSelection();
    } finally {
      restoringRef.current = false;
    }
    setDraftInfo(null);
    setIsDirty(false);
    onToast(`Draft "${draftInfo.name}" dipulihkan`, "success");
  }, [draftInfo, onToast, syncSelection]);

  const discardDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setDraftInfo(null);
  }, []);

  const loadIcons = useCallback(async () => {
    setLoadingIcons(true);
    try {
      setIcons(await asbuiltApi.listIcons());
    } catch {
      onToast("Gagal memuat icon library", "error");
    } finally {
      setLoadingIcons(false);
    }
  }, [onToast]);

  useEffect(() => {
    void loadIcons();
  }, [loadIcons]);

  useEffect(() => {
    const canvasEl = canvasElementRef.current;
    if (!canvasEl) return;

    const canvas = new Canvas(canvasEl, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: "transparent",
      preserveObjectStacking: true,
      selection: true,
    });
    fabricRef.current = canvas;

    const updateConnections = (target?: any) => {
      if (!canvas || (target && target.get?.("dataConnection"))) return;
      canvas.getObjects().forEach((obj: any) => {
        const conn = obj.get?.("dataConnection");
        if (!conn) return;
        const from = canvas.getObjects().find((o: any) => o.get?.("dataObjectId") === conn.fromId);
        const to = canvas.getObjects().find((o: any) => o.get?.("dataObjectId") === conn.toId);
        if (!from || !to) return;
        const a = from.getCenterPoint ? from.getCenterPoint() : { x: (from.left || 0) + from.getScaledWidth() / 2, y: (from.top || 0) + from.getScaledHeight() / 2 };
        const b = to.getCenterPoint ? to.getCenterPoint() : { x: (to.left || 0) + to.getScaledWidth() / 2, y: (to.top || 0) + to.getScaledHeight() / 2 };
        obj.set({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
        obj.setCoords();
      });
    };

    const onMoving = (event: { target?: FabricObject }) => {
      const target = event.target;
      if (!target || target.get?.("dataGrid")) return;
      if (snapEnabledRef.current) {
        const grid = gridSizeRef.current;
        target.set({
          left: Math.round((target.left || 0) / grid) * grid,
          top: Math.round((target.top || 0) / grid) * grid,
        });
        target.setCoords();
      }
      updateConnections(target);
    };

    const onModified = (event: { target?: FabricObject }) => {
      userEditedRef.current = true;
      if (snapEnabledRef.current) {
        const grid = gridSizeRef.current;
        canvas.getActiveObjects().forEach((obj) => {
          if (!obj.get("dataGrid")) {
            obj.set({
              left: Math.round((obj.left || 0) / grid) * grid,
              top: Math.round((obj.top || 0) / grid) * grid,
            });
            obj.setCoords();
          }
        });
        canvas.requestRenderAll();
      }
      updateConnections(event.target);
      syncSelection();
      pushHistory();
    };
    const onAdded = (event: { target?: FabricObject }) => {
      if (event.target?.get("dataGrid")) return;
      userEditedRef.current = true;
      syncSelection();
      pushHistory();
    };
    const onRemoved = (event: { target?: FabricObject }) => {
      if (event.target?.get("dataGrid")) return;
      userEditedRef.current = true;
      syncSelection();
      pushHistory();
    };

    canvas.on("object:moving", onMoving);
    canvas.on("object:modified", onModified);
    canvas.on("object:added", onAdded);
    canvas.on("object:removed", onRemoved);
    canvas.on("selection:created", syncSelection);
    canvas.on("selection:updated", syncSelection);
    canvas.on("selection:cleared", syncSelection);
    canvas.on("text:changed", pushHistory as any);

    let panning = false;
    let lastPan = { x: 0, y: 0 };
    const onMouseDown = (event: any) => {
      const native = event.e as MouseEvent;
      if (native?.button === 1 || native?.shiftKey) {
        panning = true;
        lastPan = { x: native.clientX, y: native.clientY };
        canvas.selection = false;
        canvas.defaultCursor = "grabbing";
      }
    };
    const onMouseMove = (event: any) => {
      if (!panning) return;
      const native = event.e as MouseEvent;
      canvas.relativePan({ x: (native.clientX - lastPan.x) / zoomRef.current, y: (native.clientY - lastPan.y) / zoomRef.current } as any);
      lastPan = { x: native.clientX, y: native.clientY };
    };
    const onMouseUp = () => {
      if (!panning) return;
      panning = false;
      canvas.selection = true;
      canvas.defaultCursor = "default";
    };
    canvas.on("mouse:down", onMouseDown);
    canvas.on("mouse:move", onMouseMove);
    canvas.on("mouse:up", onMouseUp);

    historyRef.current = [];
    historyIndexRef.current = -1;
    setIsDirty(false);
    pushHistory();

    return () => {
      canvas.off("object:moving", onMoving);
      canvas.off("object:modified", onModified);
      canvas.off("object:added", onAdded);
      canvas.off("object:removed", onRemoved);
      canvas.off("selection:created", syncSelection);
      canvas.off("selection:updated", syncSelection);
      canvas.off("selection:cleared", syncSelection);
      canvas.off("text:changed", pushHistory as any);
      canvas.off("mouse:down", onMouseDown);
      canvas.off("mouse:move", onMouseMove);
      canvas.off("mouse:up", onMouseUp);
      void canvas.dispose();
      fabricRef.current = null;
    };
  }, []); // Canvas is initialized once; settings are applied through dedicated effects.

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setDimensions({
      width: Math.round(canvasSize.width * zoom),
      height: Math.round(canvasSize.height * zoom),
    });
    canvas.setZoom(zoom);
    canvas.set({ backgroundColor: "transparent" });
    canvas.calcOffset();
    canvas.requestRenderAll();
  }, [background, canvasSize.height, canvasSize.width, zoom]);

  useEffect(() => {
    const node = workspaceRef.current;
    if (!node) return;
    const handleScroll = () => {
      fabricRef.current?.calcOffset();
    };
    node.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      node.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const setToolMode = (nextTool: Tool) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (nextTool !== "connect") setConnectFrom(null);
    setTool(nextTool);
    canvas.isDrawingMode = nextTool === "draw";
    if (nextTool === "select") {
      canvas.selection = true;
      canvas.defaultCursor = "default";
      canvas.calcOffset();
      canvas.requestRenderAll();
    } else if (nextTool === "draw") {
      const brush = new PencilBrush(canvas);
      brush.color = strokeColor;
      brush.width = strokeWidth;
      canvas.freeDrawingBrush = brush;
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
  };

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas?.freeDrawingBrush) return;
    canvas.freeDrawingBrush.color = strokeColor;
    canvas.freeDrawingBrush.width = strokeWidth;
  }, [strokeColor, strokeWidth]);

  const addText = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const text = new Textbox("Teks Baru", {
      left: 100,
      top: 100,
      width: 260,
      fill: strokeColor,
      fontSize,
      fontFamily: "Arial",
      scaleX: 1,
      scaleY: 1,
    });

    // Text size is controlled only by Font Size in the properties panel.
    // On-canvas resizing changes the textbox width (wrapping), not the font scale.
    text.setControlsVisibility({
      tl: false,
      tr: false,
      bl: false,
      br: false,
      mt: false,
      mb: false,
      ml: true,
      mr: true,
      mtr: true,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    setToolMode("select");
  };

  const addShape = (shape: Exclude<Tool, "select" | "text" | "draw" | "line" | "arrow">) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    let object: FabricObject;
    if (shape === "rect") {
      object = new Rect({ left: 100, top: 100, width: 160, height: 90, fill: fillColor, stroke: strokeColor, strokeWidth });
    } else if (shape === "roundRect") {
      object = new Rect({ left: 100, top: 100, width: 160, height: 90, rx: 14, ry: 14, fill: fillColor, stroke: strokeColor, strokeWidth });
    } else {
      object = new Circle({ left: 100, top: 100, radius: 55, fill: fillColor, stroke: strokeColor, strokeWidth });
    }
    canvas.add(object);
    canvas.setActiveObject(object);
    setToolMode("select");
  };

  const addLine = (arrow = false) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const line = new Line([100, 150, 320, 150], { stroke: strokeColor, strokeWidth, selectable: true });
    if (!arrow) {
      canvas.add(line);
      canvas.setActiveObject(line);
    } else {
      const head = new Triangle({
        left: 308,
        top: 138,
        width: 24,
        height: 24,
        angle: 90,
        fill: strokeColor,
        strokeWidth: 0,
      });
      const group = new FabricGroup([line, head]);
      canvas.add(group);
      canvas.setActiveObject(group);
    }
    setToolMode("select");
  };

  const addIcon = async (icon: IconAsset) => {
    const canvasEl = canvasElementRef.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    await addIconAtPoint(icon, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const undo = async () => {
    if (historyIndexRef.current <= 0) return;
    const canvas = fabricRef.current;
    if (!canvas) return;
    historyIndexRef.current -= 1;
    restoringRef.current = true;
    await canvas.loadFromJSON(historyRef.current[historyIndexRef.current]);
    restoringRef.current = false;
    canvas.requestRenderAll();
    setIsDirty(true);
    syncSelection();
    updateHistoryState();
  };

  const redo = async () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const canvas = fabricRef.current;
    if (!canvas) return;
    historyIndexRef.current += 1;
    restoringRef.current = true;
    await canvas.loadFromJSON(historyRef.current[historyIndexRef.current]);
    restoringRef.current = false;
    canvas.requestRenderAll();
    setIsDirty(true);
    syncSelection();
    updateHistoryState();
  };

  const copy = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Always copy the actual selected objects. Cloning ActiveSelection itself
    // can serialize the selection wrapper instead of the objects the user picked.
    const activeObjects = canvas
      .getActiveObjects()
      .filter((obj) => !obj.get("dataGrid"));
    if (!activeObjects.length) return;

    clipboardRef.current = await Promise.all(activeObjects.map((obj) => obj.clone()));
    onToast(`${activeObjects.length} object disalin`, "success");
  };

  const paste = async () => {
    const canvas = fabricRef.current;
    const clipboard = clipboardRef.current;
    if (!canvas || !clipboard?.length) return;

    // Paste every copied object independently, preserving the original
    // relative positions. Multi-selection is recreated only after all objects
    // have been added; it is never converted into a Group.
    restoringRef.current = true;
    const clonedObjects = await Promise.all(clipboard.map((item) => item.clone()));
    clonedObjects.forEach((obj) => {
      obj.set({
        left: (obj.left || 0) + 20,
        top: (obj.top || 0) + 20,
      });
      obj.setCoords();
      canvas.add(obj);
    });
    restoringRef.current = false;

    canvas.discardActiveObject();
    if (clonedObjects.length === 1) {
      canvas.setActiveObject(clonedObjects[0]);
    } else {
      canvas.setActiveObject(new ActiveSelection(clonedObjects, { canvas }));
    }
    canvas.requestRenderAll();
    syncSelection();
    pushHistory();
  };

  const deleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getActiveObjects().forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  };

  const duplicate = async () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    const clone = await active.clone();
    clone.set({ left: (clone.left || 0) + 20, top: (clone.top || 0) + 20 });
    canvas.add(clone);
    canvas.setActiveObject(clone);
  };

  const bringToFront = () => {
    const canvas = fabricRef.current;
    if (!canvas || !selected) return;
    canvas.bringObjectToFront(selected);
    canvas.requestRenderAll();
    pushHistory();
  };

  const sendToBack = () => {
    const canvas = fabricRef.current;
    if (!canvas || !selected) return;
    canvas.sendObjectToBack(selected);
    canvas.requestRenderAll();
    pushHistory();
  };

  const groupSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.type !== "activeSelection") return;

    const objects = canvas.getActiveObjects().filter((obj) => !obj.get("dataGrid"));
    if (objects.length < 2) return;

    // Fabric 7's supported flow is: ActiveSelection.removeAll() -> Group -> canvas.add().
    // Suppress intermediate history events so Group becomes one undoable action.
    restoringRef.current = true;
    const group = new FabricGroup(active.removeAll());
    canvas.add(group);
    canvas.setActiveObject(group);
    restoringRef.current = false;
    canvas.requestRenderAll();
    syncSelection();
    pushHistory();
  };

  const ungroupSelected = () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || active.type !== "group") return;

    // Fabric 7: remove the Group, then put its children into a new ActiveSelection.
    restoringRef.current = true;
    canvas.remove(active);
    const selection = new ActiveSelection(active.removeAll(), { canvas });
    canvas.setActiveObject(selection);
    restoringRef.current = false;
    canvas.requestRenderAll();
    syncSelection();
    pushHistory();
  };

  const align = (direction: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getActiveObjects().filter((obj) => !obj.get("dataGrid"));
    if (objects.length < 2) return;
    const bounds = objects.reduce((acc, obj) => {
      const rect = obj.getBoundingRect();
      return {
        left: Math.min(acc.left, rect.left),
        top: Math.min(acc.top, rect.top),
        right: Math.max(acc.right, rect.left + rect.width),
        bottom: Math.max(acc.bottom, rect.top + rect.height),
      };
    }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });

    objects.forEach((obj) => {
      const rect = obj.getBoundingRect();
      if (direction === "left") obj.set({ left: (obj.left || 0) + bounds.left - rect.left });
      if (direction === "center") obj.set({ left: (obj.left || 0) + ((bounds.left + bounds.right) / 2) - (rect.left + rect.width / 2) });
      if (direction === "right") obj.set({ left: (obj.left || 0) + bounds.right - (rect.left + rect.width) });
      if (direction === "top") obj.set({ top: (obj.top || 0) + bounds.top - rect.top });
      if (direction === "middle") obj.set({ top: (obj.top || 0) + ((bounds.top + bounds.bottom) / 2) - (rect.top + rect.height / 2) });
      if (direction === "bottom") obj.set({ top: (obj.top || 0) + bounds.bottom - (rect.top + rect.height) });
      obj.setCoords();
    });
    canvas.requestRenderAll();
    pushHistory();
  };

  const fitCanvas = () => {
    const main = canvasElementRef.current?.parentElement?.parentElement;
    if (!main) return;
    const availableWidth = Math.max(280, main.clientWidth - 32);
    const availableHeight = Math.max(280, main.clientHeight - 32);
    const nextZoom = Math.min(1.5, Math.max(0.15, Math.min(availableWidth / canvasSize.width, availableHeight / canvasSize.height)));
    setZoom(Number(nextZoom.toFixed(2)));
  };

  const exportDrawing = (format: "png" | "svg" | "pdf") => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects().filter((obj) => !obj.get("dataGrid"));
    if (!objects.length) {
      onToast("Tidak ada object untuk diekspor", "error");
      return;
    }

    const previousZoom = canvas.getZoom();
    const previousDims = { width: canvas.getWidth(), height: canvas.getHeight() };
    const previousBackground = canvas.backgroundColor;

    // Temporarily reset to 100% zoom and full canvas size for crisp 1:1 export
    canvas.setDimensions({ width: canvasSize.width, height: canvasSize.height });
    canvas.setZoom(1);
    canvas.set({ backgroundColor: background });
    canvas.requestRenderAll();

    try {
      // Export only the actual drawing content, with a fixed 10px margin.
      const bounds = objects.reduce(
        (acc, obj) => {
          const rect = obj.getBoundingRect();
          return {
            left: Math.min(acc.left, rect.left),
            top: Math.min(acc.top, rect.top),
            right: Math.max(acc.right, rect.left + rect.width),
            bottom: Math.max(acc.bottom, rect.top + rect.height),
          };
        },
        { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
      );

      const baseName = slugifyName(docNameRef.current);
      const margin = 10;
      const left = Math.max(0, bounds.left - margin);
      const top = Math.max(0, bounds.top - margin);
      const right = Math.min(canvasSize.width, bounds.right + margin);
      const bottom = Math.min(canvasSize.height, bounds.bottom + margin);
      const width = Math.max(1, right - left);
      const height = Math.max(1, bottom - top);

      if (format === "pdf") {
        const data = canvas.toDataURL({
          format: "png",
          left,
          top,
          width,
          height,
          multiplier: 2,
        });
        const win = window.open("", "_blank");
        if (!win) {
          onToast("Popup diblokir browser — izinkan popup untuk cetak PDF", "error");
        } else {
          win.document.write(`<html><head><title>${baseName}</title><style>@page{size:landscape;margin:10mm}body{margin:0}img{width:100%;height:auto}</style></head><body><img src="${data}" onload="window.print()"></body></html>`);
          win.document.close();
          onToast("Pilih 'Save as PDF' di dialog print browser", "success");
        }
        return;
      }
      if (format === "png") {
        const data = canvas.toDataURL({
          format: "png",
          left,
          top,
          width,
          height,
          multiplier: 2,
        });
        const a = document.createElement("a");
        a.href = data;
        a.download = `${baseName}.png`;
        a.click();
      } else {
        const svg = canvas.toSVG({
          viewBox: { x: left, y: top, width, height },
          width: `${width}px`,
          height: `${height}px`,
        });
        const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      canvas.set({ backgroundColor: previousBackground });
      canvas.setDimensions(previousDims);
      canvas.setZoom(previousZoom);
      canvas.requestRenderAll();
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editingText = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (editingText) return;

      if (event.key === "Escape") {
        event.preventDefault();
        const canvas = fabricRef.current;
        if (canvas) {
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          syncSelection();
        }
        setToolMode("select");
        return;
      }
      // Canvas zoom shortcuts. These must preventDefault, otherwise the
      // browser intercepts Ctrl/Cmd +/- and zooms the whole page.
      if ((event.ctrlKey || event.metaKey) && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        zoomAtCenter(zoomRef.current * 1.2);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        zoomAtCenter(zoomRef.current / 1.2);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "0") {
        event.preventDefault();
        fitCanvas();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "1") {
        event.preventDefault();
        zoomAtCenter(1);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        void (event.shiftKey ? redo() : undo());
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        void redo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        void copy();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        void paste();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        void duplicate();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        const canvas = fabricRef.current;
        if (canvas) {
          const objects = canvas.getObjects().filter((obj) => !obj.get("dataGrid"));
          if (objects.length) canvas.setActiveObject(new ActiveSelection(objects, { canvas }));
          canvas.requestRenderAll();
        }
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const active = canvas.getActiveObject() as any;
        if (!active || active.isEditing) return;
        const activeObjects = canvas.getActiveObjects();
        if (!activeObjects || activeObjects.length === 0) return;

        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;

        activeObjects.forEach((obj) => {
          if (!obj.get("dataGrid")) {
            obj.set({
              left: (obj.left || 0) + dx,
              top: (obj.top || 0) + dy,
            });
            obj.setCoords();
          }
        });

        canvas.getObjects().forEach((obj: any) => {
          const conn = obj.get?.("dataConnection");
          if (!conn) return;
          const from = canvas.getObjects().find((o: any) => o.get?.("dataObjectId") === conn.fromId);
          const to = canvas.getObjects().find((o: any) => o.get?.("dataObjectId") === conn.toId);
          if (!from || !to) return;
          const a = from.getCenterPoint ? from.getCenterPoint() : { x: (from.left || 0) + from.getScaledWidth() / 2, y: (from.top || 0) + from.getScaledHeight() / 2 };
          const b = to.getCenterPoint ? to.getCenterPoint() : { x: (to.left || 0) + to.getScaledWidth() / 2, y: (to.top || 0) + to.getScaledHeight() / 2 };
          obj.set({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
          obj.setCoords();
        });

        canvas.requestRenderAll();
        userEditedRef.current = true;
        syncSelection();
        pushHistory();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const selected = selectedObject;

  const updateSelected = (patch: Record<string, unknown>) => {
    const canvas = fabricRef.current;
    if (!canvas || !selected) return;

    if (objectIsText(selected) && Object.prototype.hasOwnProperty.call(patch, "fontSize")) {
      // Never let a previous canvas scale affect the effective text size.
      // Font size is an absolute px value controlled by the panel.
      selected.set({
        ...patch,
        scaleX: 1,
        scaleY: 1,
      } as any);
    } else {
      selected.set(patch as any);
    }

    selected.setCoords();
    canvas.requestRenderAll();
    pushHistory();
    setSelectedObject(selected);
  };

  const updateObjectSize = (dimension: "width" | "height", value: number) => {
    const canvas = fabricRef.current;
    const obj: any = selectedObject;
    if (!canvas || !obj || !obj.width || !obj.height) return;
    const current = dimension === "width" ? obj.getScaledWidth() : obj.getScaledHeight();
    if (!current || value <= 0) return;
    const ratio = value / current;
    const patch: Record<string, number> = dimension === "width"
      ? { scaleX: (obj.scaleX || 1) * ratio, ...(lockAspect ? { scaleY: (obj.scaleY || 1) * ratio } : {}) }
      : { scaleY: (obj.scaleY || 1) * ratio, ...(lockAspect ? { scaleX: (obj.scaleX || 1) * ratio } : {}) };
    updateSelected(patch as any);
  };


  // Connect mode: first click picks the source, second click draws the line.
  // This runs from the selection effect below, because Fabric owns clicks.
  const createConnection = useCallback((fromObj: FabricObject, toObj: FabricObject) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const ensureId = (obj: any) => {
      if (!obj.get?.("dataObjectId")) obj.set("dataObjectId", `obj-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
      return obj.get("dataObjectId") as string;
    };
    const fromId = ensureId(fromObj as any);
    const toId = ensureId(toObj as any);
    const a = (fromObj as any).getCenterPoint ? (fromObj as any).getCenterPoint() : { x: (fromObj.left || 0) + fromObj.getScaledWidth() / 2, y: (fromObj.top || 0) + fromObj.getScaledHeight() / 2 };
    const b = (toObj as any).getCenterPoint ? (toObj as any).getCenterPoint() : { x: (toObj.left || 0) + toObj.getScaledWidth() / 2, y: (toObj.top || 0) + toObj.getScaledHeight() / 2 };
    const line = new Line([a.x, a.y, b.x, b.y], { stroke: strokeColor, strokeWidth, selectable: true });
    (line as any).set("dataConnection", { fromId, toId });
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.requestRenderAll();
    pushHistory();
    onToast("Koneksi dibuat — garis akan mengikuti saat icon digeser", "success");
  }, [onToast, pushHistory, strokeColor, strokeWidth]);

  useEffect(() => {
    if (tool !== "connect" || !selectedObject) return;
    if (!connectFromRef.current) {
      setConnectFrom(selectedObject);
      onToast("Sumber dipilih — klik icon kedua untuk menghubungkan", "success");
      return;
    }
    if (connectFromRef.current === selectedObject) return;
    const from = connectFromRef.current;
    setConnectFrom(null);
    createConnection(from, selectedObject);
    setToolMode("select");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedObject, tool]);

  const addIconAtPoint = async (icon: IconAsset, clientX: number, clientY: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    try {
      const image = await FabricImage.fromURL(icon.url, { crossOrigin: "anonymous" });
      image.set({
        scaleX: 0.45,
        scaleY: 0.45,
        dataIcon: icon.filename,
        dataObjectId: `obj-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      });

      const canvasEl = canvas.upperCanvasEl || canvas.lowerCanvasEl;
      const rect = canvasEl.getBoundingClientRect();
      const currentZoom = zoomRef.current || 1;
      const sceneX = (clientX - rect.left) / currentZoom;
      const sceneY = (clientY - rect.top) / currentZoom;
      let left = sceneX - image.getScaledWidth() / 2;
      let top = sceneY - image.getScaledHeight() / 2;
      if (snapEnabledRef.current) {
        const grid = gridSizeRef.current;
        left = Math.round(left / grid) * grid;
        top = Math.round(top / grid) * grid;
      }
      image.set({
        left: Math.max(0, Math.min(canvasSizeRef.current.width - image.getScaledWidth(), left)),
        top: Math.max(0, Math.min(canvasSizeRef.current.height - image.getScaledHeight(), top)),
      });

      canvas.add(image);
      canvas.setActiveObject(image);
      canvas.requestRenderAll();
      setToolMode("select");
    } catch {
      onToast(`Gagal menambahkan icon ${icon.filename}`, "error");
    }
  };

  const uploadIcon = async (file: File) => {
    if (!/^(image\/png|image\/svg\+xml)$/.test(file.type)) {
      onToast("Icon harus PNG atau SVG", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onToast("Ukuran icon maksimal 5 MB", "error");
      return;
    }
    setUploadingIcon(true);
    try {
      await asbuiltApi.uploadIcon(file);
      await loadIcons();
      onToast(`Icon ${file.name} berhasil ditambahkan`, "success");
    } catch (err: any) {
      onToast(err?.response?.data?.detail || "Gagal menambahkan icon", "error");
    } finally {
      setUploadingIcon(false);
    }
  };

  const toolbarButton = (active: boolean, label: string, icon: ReactNode, onClick: () => void, disabled = false, showLabel = false, displayLabel?: string) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={showLabel ? "w-12 h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors disabled:opacity-30 shrink-0" : "w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"}
      style={{
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
      }}
    >
      {icon}
      {showLabel && <span className="text-[9px] leading-none font-medium">{displayLabel || label}</span>}
    </button>
  );

  // Layers list, topmost first. Recomputed when history/selection changes.
  const layers = useMemo(() => {
    const canvas = fabricRef.current;
    if (!canvas) return [] as FabricObject[];
    return canvas.getObjects().filter((obj: any) => !obj.get?.("dataGrid")).slice().reverse();
  }, [historyIndex, selectedObject]);
  const moveLayer = (obj: FabricObject, dir: 1 | -1) => {
    const canvas: any = fabricRef.current;
    if (!canvas) return;
    if (dir === 1) {
      if (typeof canvas.bringObjectForward === "function") canvas.bringObjectForward(obj);
      else canvas.bringObjectToFront(obj);
    } else {
      if (typeof canvas.sendObjectBackwards === "function") canvas.sendObjectBackwards(obj);
      else canvas.sendObjectToBack(obj);
    }
    canvas.requestRenderAll();
    pushHistory();
    syncSelection();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative" style={{ color: "var(--text-primary)" }}>
      <div className="hidden md:flex shrink-0 flex items-center gap-1 px-3 py-2 border-b overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-1 pr-2 border-r shrink-0" style={{ borderColor: "var(--border)" }}>
          {toolbarButton(tool === "select", "Select", <MousePointer2 size={15} />, () => setToolMode("select"), false, true, "Select")}
          {toolbarButton(tool === "text", "Text", <Type size={15} />, addText, false, true, "Text")}
          {toolbarButton(tool === "rect", "Rectangle", <Square size={15} />, () => addShape("rect"), false, true, "Rect")}
          {toolbarButton(tool === "roundRect", "Rounded rectangle", <RectangleHorizontal size={15} />, () => addShape("roundRect"), false, true, "Round")}
          {toolbarButton(tool === "circle", "Circle", <CircleIcon size={15} />, () => addShape("circle"), false, true, "Circle")}
          {toolbarButton(tool === "line", "Line", <Minus size={15} />, () => addLine(false), false, true, "Line")}
          {toolbarButton(tool === "arrow", "Arrow", <ArrowRight size={15} />, () => addLine(true), false, true, "Arrow")}
          {toolbarButton(tool === "draw", "Freehand", <Pencil size={15} />, () => setToolMode("draw"), false, true, "Draw")}
          {toolbarButton(tool === "connect", "Connect — klik sumber, lalu target", <Link2 size={15} />, () => setToolMode("connect"), false, true, "Connect")}
        </div>
        <div className="flex items-center gap-1 px-2 border-r shrink-0" style={{ borderColor: "var(--border)" }}>
          {toolbarButton(false, "Undo (Ctrl+Z)", <Undo2 size={15} />, () => void undo(), historyIndex <= 0)}
          {toolbarButton(false, "Redo (Ctrl+Shift+Z)", <Redo2 size={15} />, () => void redo(), historyIndex >= historyRef.current.length - 1)}
          {toolbarButton(false, "Copy (Ctrl+C)", <Copy size={15} />, () => void copy(), !selected)}
          {toolbarButton(false, "Paste (Ctrl+V)", <Layers size={15} />, () => void paste(), !clipboardRef.current)}
          {toolbarButton(false, "Duplicate (Ctrl+D)", <Copy size={15} />, () => void duplicate(), !selected)}
          {toolbarButton(false, "Delete", <Trash2 size={15} />, deleteSelected, !selected)}
          {toolbarButton(false, "Group", <Group size={15} />, groupSelected, !selected)}
          {toolbarButton(false, "Ungroup", <Ungroup size={15} />, ungroupSelected, !selected)}
        </div>
        <div className="flex items-center gap-1 px-2 shrink-0">
          {toolbarButton(false, "Bring to front", <BringToFront size={15} />, bringToFront, !selected)}
          {toolbarButton(false, "Send to back", <SendToBack size={15} />, sendToBack, !selected)}
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="hidden xl:block text-[11px] mr-1" style={{ color: "var(--text-muted)" }}>Ctrl + Scroll untuk zoom canvas</span>
          <button type="button" onClick={() => exportDrawing("png")} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 text-white" style={{ background: "var(--accent)" }}>
            <Download size={13} /> PNG
          </button>
          <button type="button" onClick={() => exportDrawing("svg")} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5" style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <Download size={13} /> SVG
          </button>
          <button type="button" onClick={() => exportDrawing("pdf")} title="Buka dialog print browser, lalu pilih Save as PDF" className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5" style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <Download size={13} /> PDF
          </button>
        </div>
      </div>      <div className="md:hidden shrink-0 flex items-center gap-1 px-2 py-2 border-b overflow-x-auto" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        {toolbarButton(tool === "select", "Select", <MousePointer2 size={15} />, () => { setMobilePanel(null); setToolMode("select"); })}
        {toolbarButton(tool === "draw", "Freehand", <Pencil size={15} />, () => { setMobilePanel(null); setToolMode("draw"); })}
        {toolbarButton(tool === "text", "Text", <Type size={15} />, () => { setMobilePanel(null); addText(); })}
        {toolbarButton(false, "Rectangle", <Square size={15} />, () => { setMobilePanel(null); addShape("rect"); })}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          {toolbarButton(false, "Undo", <Undo2 size={15} />, () => void undo(), historyIndex <= 0)}
          {toolbarButton(false, "Redo", <Redo2 size={15} />, () => void redo(), historyIndex >= historyRef.current.length - 1)}
          {toolbarButton(false, "More", <MoreHorizontal size={18} />, () => setMobilePanel(mobilePanel === null ? "tools" : null))}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <aside className={leftCollapsed ? "hidden" : "hidden md:flex w-64 shrink-0 border-r flex flex-col overflow-hidden"} style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
          <div className="p-3 border-b shrink-0 space-y-2" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Nama dokumen" aria-label="Nama dokumen" className="w-full bg-transparent text-sm font-bold outline-none border-b border-transparent focus:border-[var(--accent)]" style={{ color: "var(--text-primary)" }} />
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Canvas diagram editor • {canvasSize.width} × {canvasSize.height}</p>
              </div>
              <button type="button" title="Sembunyikan panel kiri" aria-label="Sembunyikan panel kiri" onClick={() => setLeftCollapsed(true)} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)" }}><ChevronLeft size={14} /></button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => void saveDraft()} className="flex-1 h-8 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 text-white" style={{ background: "var(--accent)" }}><Save size={13} /> Simpan draft</button>
              <span className="text-[9px] px-2 py-1 rounded-full" style={{ background: isDirty ? "var(--accent-soft)" : "var(--bg-surface2)", color: isDirty ? "var(--accent)" : "var(--text-muted)" }}>
                {isDirty ? "Belum tersimpan" : savedAt ? "Tersimpan" : "Ready"}
              </span>
            </div>
            {savedAt && <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Terakhir tersimpan: {new Date(savedAt).toLocaleString("id-ID")}</p>}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
            {draftInfo && (
              <div className="rounded-xl border p-3 space-y-2" style={{ background: "var(--accent-soft)", borderColor: "var(--border)" }}>
                <p className="text-[11px] font-semibold">Draft ditemukan: {draftInfo.name}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Tersimpan {new Date(draftInfo.savedAt).toLocaleString("id-ID")}. Pulihkan untuk melanjutkan, atau hapus jika tidak perlu.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void restoreDraft()} className="flex-1 h-8 rounded-lg text-[11px] font-semibold text-white" style={{ background: "var(--accent)" }}>Pulihkan</button>
                  <button type="button" onClick={discardDraft} className="h-8 px-3 rounded-lg text-[11px] font-semibold" style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)" }}>Hapus</button>
                </div>
              </div>
            )}
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Icon Library</p>
                <label className="cursor-pointer px-2 py-1.5 rounded-lg flex items-center gap-1 text-[11px] font-semibold" title="Tambah icon (PNG/SVG, maks 5 MB)" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                  {uploadingIcon ? <span className="text-[9px]">...</span> : <><Upload size={14} /> Upload</>}
                  <input type="file" accept="image/png,image/svg+xml" className="hidden" disabled={uploadingIcon} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadIcon(file); e.currentTarget.value = ""; }} />
                </label>
              </div>
              <input value={iconQuery} onChange={(e) => setIconQuery(e.target.value)} placeholder="Cari icon..." aria-label="Cari icon" className="w-full mb-2 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              <div className="flex flex-wrap gap-1 mb-2">
                {iconCategories.map((cat) => (
                  <button key={cat} type="button" onClick={() => setIconCategory(cat)} className="px-2 py-1 rounded-full text-[10px] font-semibold" style={{ background: iconCategory === cat ? "var(--accent-soft)" : "var(--bg-surface2)", color: iconCategory === cat ? "var(--accent)" : "var(--text-secondary)" }}>{cat}</button>
                ))}
              </div>
              {loadingIcons ? (
                <p className="text-[11px] py-4 text-center" style={{ color: "var(--text-muted)" }}>Memuat icon...</p>
              ) : filteredIcons.length === 0 ? (
                <div className="text-center py-5 rounded-xl" style={{ background: "var(--bg-surface2)", color: "var(--text-muted)" }}>
                  <ImagePlus size={20} className="mx-auto mb-2 opacity-50" />
                  <p className="text-[10px]">{icons.length === 0 ? "Belum ada icon" : "Tidak ada icon yang cocok"}</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {filteredIcons.map((icon) => (
                    <button key={icon.filename} type="button" title={icon.filename} draggable onDragStart={(e) => e.dataTransfer.setData("application/x-free-drawing-icon", icon.filename)} onClick={() => void addIcon(icon)} className="aspect-square rounded-xl p-2 flex flex-col items-center justify-center gap-1 border hover:shadow-sm" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)" }}>
                      <img src={icon.url} alt={icon.filename} className="max-w-full max-h-12 object-contain" draggable={false} />
                      <span className="w-full truncate text-[8px]" style={{ color: "var(--text-muted)" }}>{icon.filename}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Canvas</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[9px]" style={{ color: "var(--text-muted)" }}>Width<input type="number" min={50} max={10000} value={widthInput} onChange={(e) => handleWidthChange(e.target.value)} onBlur={handleWidthBlur} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                <label className="text-[9px]" style={{ color: "var(--text-muted)" }}>Height<input type="number" min={50} max={10000} value={heightInput} onChange={(e) => handleHeightChange(e.target.value)} onBlur={handleHeightBlur} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
              </div>
              <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Background<input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="w-full h-8 mt-1 rounded-lg cursor-pointer" /></label>
              <label className="flex items-center justify-between text-[10px]" style={{ color: "var(--text-secondary)" }}><span>Show Grid</span><input type="checkbox" checked={gridEnabled} onChange={(e) => setGridEnabled(e.target.checked)} /></label>
              <label className="flex items-center justify-between text-[10px]" style={{ color: "var(--text-secondary)" }}><span>Snap to Grid</span><input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} /></label>
              <label className="flex items-center justify-between text-[10px]" style={{ color: "var(--text-secondary)" }}><span>Grid Size</span><input type="number" min={5} max={100} value={gridSize} onChange={(e) => setGridSize(Math.max(5, Math.min(100, Number(e.target.value) || 20)))} className="w-16 px-2 py-1 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
            </section>

            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Drawing Style</p>
              <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Stroke<input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-full h-8 mt-1 rounded-lg cursor-pointer" /></label>
              <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Fill<input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="w-full h-8 mt-1 rounded-lg cursor-pointer" /></label>
              <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Stroke Width<input type="number" min={1} max={20} value={strokeWidth} onChange={(e) => setStrokeWidth(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
              <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Font Size<input type="number" min={8} max={120} value={fontSize} onChange={(e) => setFontSize(Math.max(8, Math.min(120, Number(e.target.value) || 18)))} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
            </section>
          </div>
        </aside>

        <div className="flex-1 min-w-0 min-h-0 relative flex flex-col overflow-hidden">
        {leftCollapsed && (
          <button type="button" title="Tampilkan panel kiri" aria-label="Tampilkan panel kiri" onClick={() => setLeftCollapsed(false)} className="hidden md:flex absolute top-3 left-3 z-30 w-8 h-8 rounded-lg items-center justify-center shadow border" style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}><ChevronRight size={15} /></button>
        )}
        {tool === "connect" && connectFrom && (
          <div className="hidden md:flex absolute top-3 left-1/2 -translate-x-1/2 z-30 items-center gap-2 px-3 py-2 rounded-xl shadow-lg border text-[11px] font-semibold" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
            <Link2 size={14} /> Menghubungkan dari: {objectNameOf(connectFrom)} — klik objek kedua
            <button type="button" onClick={() => { setConnectFrom(null); setToolMode("select"); }} className="ml-1 px-2 py-1 rounded-lg" style={{ background: "var(--bg-surface2)" }}>Batal</button>
          </div>
        )}
        <main
          ref={workspaceRef as any}
          onClick={(e) => {
            if (e.target === workspaceRef.current || (e.target as HTMLElement).tagName === "MAIN") {
              const canvas = fabricRef.current;
              if (canvas && canvas.getActiveObject()) {
                canvas.discardActiveObject();
                canvas.requestRenderAll();
                syncSelection();
              }
            }
          }}
          className="flex-1 min-w-0 min-h-0 overflow-auto flex items-center justify-center p-3 md:p-4 relative"
          style={{ background: "var(--bg-app)" }}
        >
          <div
            className="shadow-lg relative overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const filename = e.dataTransfer.getData("application/x-free-drawing-icon");
              const icon = icons.find((item) => item.filename === filename);
              if (icon) void addIconAtPoint(icon, e.clientX, e.clientY);
            }}
            style={{
              width: canvasSize.width * zoom,
              height: canvasSize.height * zoom,
              flex: "0 0 auto",
              backgroundImage: gridEnabled
                ? `linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`
                : undefined,
              backgroundSize: gridEnabled ? `${gridSize * zoom}px ${gridSize * zoom}px` : undefined,
              backgroundColor: background,
            }}
          >
            <canvas ref={canvasElementRef} />
          </div>
        </main>

        <div className="hidden md:flex absolute bottom-3 right-3 z-30 items-center gap-1 px-1.5 py-1.5 rounded-xl shadow-lg border" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <button type="button" title="Zoom out (Ctrl+-)" aria-label="Zoom out" onClick={() => zoomAtCenter(zoomRef.current / 1.2)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "var(--text-secondary)" }}><ZoomOut size={15} /></button>
          <input type="range" min={15} max={200} step={1} value={Math.round(zoom * 100)} onChange={(e) => zoomAtCenter(Number(e.target.value) / 100)} aria-label="Zoom canvas" title="Zoom canvas" className="w-24 cursor-pointer" />
          <span className="text-[11px] w-11 text-center font-semibold" style={{ color: "var(--text-primary)" }}>{Math.round(zoom * 100)}%</span>
          <button type="button" title="Zoom in (Ctrl++)" aria-label="Zoom in" onClick={() => zoomAtCenter(zoomRef.current * 1.2)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "var(--text-secondary)" }}><ZoomIn size={15} /></button>
          <span className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />
          <button type="button" title="Fit canvas (Ctrl+0)" onClick={fitCanvas} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "var(--text-secondary)" }}><Maximize size={15} /></button>
          <button type="button" title="Zoom 100% (Ctrl+1)" onClick={() => zoomAtCenter(1)} className="h-8 px-2 rounded-lg text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>100%</button>
        </div>
        </div>

        <aside className="hidden md:block w-60 shrink-0 border-l overflow-y-auto custom-scrollbar p-3 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Object</p>
            {!selected ? (
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Pilih object di canvas untuk mengedit property.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold truncate" title={objectNameOf(selected)}>{objectNameOf(selected)}</p>
                <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>X<input type="number" value={Math.round(selected.left || 0)} onChange={(e) => updateSelected({ left: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Y<input type="number" value={Math.round(selected.top || 0)} onChange={(e) => updateSelected({ top: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Rotation<input type="number" value={Math.round(selected.angle || 0)} onChange={(e) => updateSelected({ angle: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                {!objectIsText(selected) && !(selected as any).get?.("dataConnection") && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Width<input type="number" min={1} value={Math.round((selected as any).getScaledWidth?.() || 0)} onChange={(e) => updateObjectSize("width", Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                      <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Height<input type="number" min={1} value={Math.round((selected as any).getScaledHeight?.() || 0)} onChange={(e) => updateObjectSize("height", Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                    </div>
                    <label className="flex items-center justify-between text-[10px]" style={{ color: "var(--text-secondary)" }}><span>Kunci rasio</span><input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} /></label>
                  </>
                )}
                <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Opacity<input type="range" min={0} max={1} step={0.05} value={selected.opacity ?? 1} onChange={(e) => updateSelected({ opacity: Number(e.target.value) })} className="w-full mt-1" /></label>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    ["left", <AlignLeft size={13} />], ["center", <AlignCenter size={13} />], ["right", <AlignRight size={13} />],
                    ["top", <ArrowUp size={13} />], ["middle", <ArrowDown size={13} />], ["bottom", <ArrowDown size={13} />],
                  ].map(([direction, icon]) => <button key={direction as string} type="button" onClick={() => align(direction as any)} className="h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)" }}>{icon}</button>)}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Layers ({layers.length})</p>
            {layers.length === 0 ? (
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Belum ada objek di canvas.</p>
            ) : (
              <div className="space-y-1">
                {layers.map((obj: any, idx: number) => (
                  <div key={obj.get?.("dataObjectId") || `layer-${idx}`} className="flex items-center gap-1 rounded-lg px-1 py-1" style={{ background: selected === obj ? "var(--accent-soft)" : "transparent" }}>
                    <button type="button" onClick={() => { const canvas = fabricRef.current; if (!canvas) return; if (selected === obj) { canvas.discardActiveObject(); } else { canvas.setActiveObject(obj); } canvas.requestRenderAll(); syncSelection(); }} className="flex-1 min-w-0 text-left truncate text-[11px]" title={objectNameOf(obj)} style={{ color: "var(--text-primary)" }}>{objectNameOf(obj)}</button>
                    <button type="button" title={obj.visible === false ? "Tampilkan" : "Sembunyikan"} aria-label={obj.visible === false ? "Tampilkan" : "Sembunyikan"} onClick={() => { const canvas = fabricRef.current; if (!canvas) return; obj.visible = obj.visible === false; canvas.requestRenderAll(); pushHistory(); syncSelection(); }} style={{ color: "var(--text-secondary)" }}>{obj.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                    <button type="button" title="Naik satu layer" aria-label="Naik satu layer" onClick={() => moveLayer(obj, 1)} style={{ color: "var(--text-secondary)" }}><ArrowUp size={13} /></button>
                    <button type="button" title="Turun satu layer" aria-label="Turun satu layer" onClick={() => moveLayer(obj, -1)} style={{ color: "var(--text-secondary)" }}><ArrowDown size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selected && objectIsText(selected) && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Text</p>
              <textarea value={selected.text || ""} onChange={(e) => updateSelected({ text: e.target.value })} className="w-full min-h-20 px-2 py-1.5 rounded-lg border text-xs resize-y" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Font Size (px)
                <input
                  type="number"
                  min={8}
                  max={240}
                  value={Math.round(Number(selected.fontSize) || 18)}
                  onChange={(e) => updateSelected({ fontSize: Math.max(8, Math.min(240, Number(e.target.value) || 18)) })}
                  className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs"
                  style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
              </label>
              <div className="flex gap-1">
                <button type="button" onClick={() => updateSelected({ fontWeight: selected.fontWeight === "bold" ? "normal" : "bold" })} className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: selected.fontWeight === "bold" ? "var(--accent-soft)" : "var(--bg-surface2)", color: "var(--text-secondary)" }}><Bold size={14} /></button>
                <button type="button" onClick={() => updateSelected({ fontStyle: selected.fontStyle === "italic" ? "normal" : "italic" })} className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: selected.fontStyle === "italic" ? "var(--accent-soft)" : "var(--bg-surface2)", color: "var(--text-secondary)" }}><Italic size={14} /></button>
              </div>
            </div>
          )}

          {selected && !objectIsText(selected) && (selected as any).type !== "image" && !(selected as any).get?.("dataConnection") && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Appearance</p>
              <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Fill<input type="color" value={getObjectFill(selected)} onChange={(e) => updateSelected({ fill: e.target.value })} className="w-full h-8 mt-1 rounded-lg cursor-pointer" /></label>
              <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Stroke<input type="color" value={getObjectStroke(selected)} onChange={(e) => updateSelected({ stroke: e.target.value })} className="w-full h-8 mt-1 rounded-lg cursor-pointer" /></label>
            </div>
          )}
          {selected && (selected as any).get?.("dataConnection") && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Koneksi</p>
              <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Stroke<input type="color" value={getObjectStroke(selected)} onChange={(e) => updateSelected({ stroke: e.target.value })} className="w-full h-8 mt-1 rounded-lg cursor-pointer" /></label>
              <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Stroke Width<input type="number" min={1} max={20} value={Math.round(Number((selected as any).strokeWidth) || 2)} onChange={(e) => updateSelected({ strokeWidth: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
            </div>
          )}
        </aside>
      </div>
      {isMobile && (
        <>
          <div className="shrink-0 grid grid-cols-4 gap-1 px-2 py-2 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
            <button type="button" onClick={() => setMobilePanel(mobilePanel === "tools" ? null : "tools")} className="h-9 rounded-lg flex items-center justify-center gap-1 text-[10px] font-semibold" style={{ background: mobilePanel === "tools" ? "var(--accent-soft)" : "var(--bg-surface2)", color: mobilePanel === "tools" ? "var(--accent)" : "var(--text-secondary)" }}><SlidersHorizontal size={14} />Tools</button>
            <button type="button" onClick={() => setMobilePanel(mobilePanel === "icons" ? null : "icons")} className="h-9 rounded-lg flex items-center justify-center gap-1 text-[10px] font-semibold" style={{ background: mobilePanel === "icons" ? "var(--accent-soft)" : "var(--bg-surface2)", color: mobilePanel === "icons" ? "var(--accent)" : "var(--text-secondary)" }}><ImagePlus size={14} />Icons</button>
            <button type="button" onClick={() => setMobilePanel(mobilePanel === "properties" ? null : "properties")} className="h-9 rounded-lg flex items-center justify-center gap-1 text-[10px] font-semibold" style={{ background: mobilePanel === "properties" ? "var(--accent-soft)" : "var(--bg-surface2)", color: mobilePanel === "properties" ? "var(--accent)" : "var(--text-secondary)" }}><SlidersHorizontal size={14} />Properties</button>
            <button type="button" onClick={() => { setMobilePanel(null); exportDrawing("png"); }} className="h-9 rounded-lg flex items-center justify-center gap-1 text-[10px] font-semibold" style={{ background: "var(--accent)", color: "#fff" }}><Download size={14} />PNG</button>
          </div>

          {mobilePanel && (
            <div className="md:hidden absolute inset-x-2 bottom-[58px] z-40 max-h-[68%] overflow-hidden rounded-2xl border shadow-2xl" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-bold">{mobilePanel === "icons" ? "Icon Library" : mobilePanel === "tools" ? "Tools" : "Properties"}</p>
                <button type="button" onClick={() => setMobilePanel(null)} className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)" }}><X size={14} /></button>
              </div>

              {mobilePanel === "icons" && (
                <div className="overflow-y-auto max-h-[calc(68vh-42px)] p-3 custom-scrollbar space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Free Drawing Icons</p>
                    <label className="cursor-pointer p-1.5 rounded-lg" title="Tambah icon" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                      {uploadingIcon ? <span className="text-[9px]">...</span> : <Upload size={14} />}
                      <input type="file" accept="image/png,image/svg+xml" className="hidden" disabled={uploadingIcon} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadIcon(file); e.currentTarget.value = ""; }} />
                    </label>
                  </div>
                  {loadingIcons ? <p className="text-[11px] py-6 text-center" style={{ color: "var(--text-muted)" }}>Memuat icon...</p> : icons.length === 0 ? (
                    <div className="text-center py-8 rounded-xl" style={{ background: "var(--bg-surface2)", color: "var(--text-muted)" }}><ImagePlus size={24} className="mx-auto mb-2 opacity-50" /><p className="text-[10px]">Belum ada icon</p></div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {icons.map((icon) => (
                        <button key={icon.filename} type="button" title={icon.filename} onClick={() => { void addIcon(icon); setMobilePanel(null); }} className="aspect-square rounded-xl p-2 flex flex-col items-center justify-center gap-1 border" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)" }}>
                          <img src={icon.url} alt={icon.filename} className="max-w-full max-h-16 object-contain" draggable={false} />
                          <span className="w-full truncate text-[8px]" style={{ color: "var(--text-muted)" }}>{icon.filename}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {mobilePanel === "tools" && (
                <div className="overflow-y-auto max-h-[calc(68vh-42px)] p-3 custom-scrollbar space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Canvas</p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[9px]" style={{ color: "var(--text-muted)" }}>Width<input type="number" min={50} max={10000} value={widthInput} onChange={(e) => handleWidthChange(e.target.value)} onBlur={handleWidthBlur} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                      <label className="text-[9px]" style={{ color: "var(--text-muted)" }}>Height<input type="number" min={50} max={10000} value={heightInput} onChange={(e) => handleHeightChange(e.target.value)} onBlur={handleHeightBlur} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                    </div>
                    <label className="text-[9px] block mt-2" style={{ color: "var(--text-muted)" }}>Background<input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="w-full h-8 mt-1 rounded-lg cursor-pointer" /></label>
                    <label className="flex items-center justify-between text-[10px] mt-2" style={{ color: "var(--text-secondary)" }}><span>Show Grid</span><input type="checkbox" checked={gridEnabled} onChange={(e) => setGridEnabled(e.target.checked)} /></label>
                    <label className="flex items-center justify-between text-[10px] mt-2" style={{ color: "var(--text-secondary)" }}><span>Snap to Grid</span><input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} /></label>
                    <label className="flex items-center justify-between text-[10px] mt-2" style={{ color: "var(--text-secondary)" }}><span>Grid Size</span><input type="number" min={5} max={100} value={gridSize} onChange={(e) => setGridSize(Math.max(5, Math.min(100, Number(e.target.value) || 20)))} className="w-16 px-2 py-1 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Drawing Style</p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Stroke<input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-full h-8 mt-1 rounded-lg cursor-pointer" /></label>
                      <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Fill<input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="w-full h-8 mt-1 rounded-lg cursor-pointer" /></label>
                    </div>
                    <label className="text-[9px] block mt-2" style={{ color: "var(--text-muted)" }}>Stroke Width<input type="number" min={1} max={20} value={strokeWidth} onChange={(e) => setStrokeWidth(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                    <label className="text-[9px] block mt-2" style={{ color: "var(--text-muted)" }}>Font Size<input type="number" min={8} max={120} value={fontSize} onChange={(e) => setFontSize(Math.max(8, Math.min(120, Number(e.target.value) || 18)))} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                  </div>
                </div>
              )}

              {mobilePanel === "properties" && (
                <div className="overflow-y-auto max-h-[calc(68vh-42px)] p-3 custom-scrollbar space-y-4">
                  {!selected ? <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Pilih object di canvas untuk mengedit property.</p> : (
                    <>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Object</p>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>X<input type="number" value={Math.round(selected.left || 0)} onChange={(e) => updateSelected({ left: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                          <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Y<input type="number" value={Math.round(selected.top || 0)} onChange={(e) => updateSelected({ top: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                        </div>
                        <label className="text-[9px] block mt-2" style={{ color: "var(--text-muted)" }}>Rotation<input type="number" value={Math.round(selected.angle || 0)} onChange={(e) => updateSelected({ angle: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                        <label className="text-[9px] block mt-2" style={{ color: "var(--text-muted)" }}>Opacity<input type="range" min={0} max={1} step={0.05} value={selected.opacity ?? 1} onChange={(e) => updateSelected({ opacity: Number(e.target.value) })} className="w-full mt-1" /></label>
                      </div>
                      {selected && objectIsText(selected) && <div className="space-y-2"><p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Text</p><textarea value={selected.text || ""} onChange={(e) => updateSelected({ text: e.target.value })} className="w-full min-h-20 px-2 py-1.5 rounded-lg border text-xs resize-y" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></div>}
                      {!objectIsText(selected) && (selected as any).type !== "image" && !(selected as any).get?.("dataConnection") && <div className="space-y-2"><p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Appearance</p><label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Fill<input type="color" value={getObjectFill(selected)} onChange={(e) => updateSelected({ fill: e.target.value })} className="w-full h-8 mt-1 rounded-lg cursor-pointer" /></label><label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Stroke<input type="color" value={getObjectStroke(selected)} onChange={(e) => updateSelected({ stroke: e.target.value })} className="w-full h-8 mt-1 rounded-lg cursor-pointer" /></label></div>}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>

  );
}

