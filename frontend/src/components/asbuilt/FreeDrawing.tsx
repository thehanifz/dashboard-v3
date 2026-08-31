import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
  MoreHorizontal,
  Settings2,
  Wrench,
  Maximize2,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bold,
  BringToFront,
  Circle as CircleIcon,
  Copy,
  Download,
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
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import asbuiltApi, { type IconAsset } from "../../services/asbuiltApi";

interface Props {
  onToast: (msg: string, type?: "success" | "error") => void;
}

type Tool = "select" | "text" | "rect" | "roundRect" | "circle" | "line" | "arrow" | "draw";
type HistoryState = string;

const DEFAULT_WIDTH = 1600;
const DEFAULT_HEIGHT = 900;
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
  const [zoom, setZoom] = useState(0.65);
  const zoomRef = useRef(zoom);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDirty, setIsDirty] = useState(false);
  const [background, setBackground] = useState("#ffffff");
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [strokeColor, setStrokeColor] = useState("#111827");
  const [fillColor, setFillColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(18);
  const [mobilePanel, setMobilePanel] = useState<"tools" | "properties" | null>(null);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const syncSelection = useCallback(() => {
    const canvas = fabricRef.current;
    setSelectedObject(canvas?.getActiveObject() || null);
  }, []);

  const serialize = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return "";
    return JSON.stringify(canvas.toJSON());
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

    const onModified = () => {
      if (snapEnabled) {
        canvas.getActiveObjects().forEach((obj) => {
          if (!obj.get("dataGrid")) {
            obj.set({
              left: Math.round((obj.left || 0) / gridSize) * gridSize,
              top: Math.round((obj.top || 0) / gridSize) * gridSize,
            });
            obj.setCoords();
          }
        });
        canvas.requestRenderAll();
      }
      syncSelection();
      pushHistory();
    };
    const onAdded = (event: { target?: FabricObject }) => {
      if (event.target?.get("dataGrid")) return;
      syncSelection();
      pushHistory();
    };
    const onRemoved = (event: { target?: FabricObject }) => {
      if (event.target?.get("dataGrid")) return;
      syncSelection();
      pushHistory();
    };

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

    // Mobile: two-finger pan + pinch zoom. Fabric continues to handle one-finger object gestures.
    const gesture = { active: false, distance: 0, lastX: 0, lastY: 0, startZoom: 0 };
    const distance = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const center = (a: Touch, b: Touch) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const c = center(e.touches[0], e.touches[1]);
      gesture.active = true;
      gesture.distance = distance(e.touches[0], e.touches[1]);
      gesture.lastX = c.x;
      gesture.lastY = c.y;
      gesture.startZoom = zoomRef.current;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!gesture.active || e.touches.length !== 2) return;
      e.preventDefault();
      const c = center(e.touches[0], e.touches[1]);
      const d = distance(e.touches[0], e.touches[1]);
      const scale = gesture.distance > 0 ? d / gesture.distance : 1;
      const nextZoom = Math.min(2, Math.max(0.15, +(gesture.startZoom * scale).toFixed(2)));
      setZoom(nextZoom);
      canvas.relativePan({ x: (c.x - gesture.lastX) / Math.max(0.15, zoomRef.current), y: (c.y - gesture.lastY) / Math.max(0.15, zoomRef.current) } as any);
      gesture.lastX = c.x;
      gesture.lastY = c.y;
    };
    const onTouchEnd = () => { gesture.active = false; };
    canvasEl.addEventListener("touchstart", onTouchStart, { passive: false });
    canvasEl.addEventListener("touchmove", onTouchMove, { passive: false });
    canvasEl.addEventListener("touchend", onTouchEnd, { passive: false });

    historyRef.current = [];
    historyIndexRef.current = -1;
    setIsDirty(false);
    pushHistory();

    return () => {
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
      canvasEl.removeEventListener("touchstart", onTouchStart);
      canvasEl.removeEventListener("touchmove", onTouchMove);
      canvasEl.removeEventListener("touchend", onTouchEnd);
      void canvas.dispose();
      fabricRef.current = null;
    };
  }, []); // Canvas is initialized once; settings are applied through dedicated effects.

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setDimensions({ width: canvasSize.width, height: canvasSize.height });
    canvas.set({ backgroundColor: "transparent" });
    canvas.requestRenderAll();
  }, [background, canvasSize.height, canvasSize.width]);


  const setToolMode = (nextTool: Tool) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setTool(nextTool);
    canvas.isDrawingMode = nextTool === "draw";
    if (nextTool === "draw") {
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

  // Keep the canvas inside the mobile viewport without requiring horizontal page scrolling.
  useEffect(() => {
    const main = canvasElementRef.current?.parentElement?.parentElement;
    if (!main || typeof window === "undefined" || typeof ResizeObserver === "undefined") return;
    const media = window.matchMedia("(max-width: 1023px)");
    const applyMobileFit = () => {
      if (!media.matches) return;
      const availableWidth = Math.max(220, main.clientWidth - 32);
      const availableHeight = Math.max(220, main.clientHeight - 32);
      const nextZoom = Math.min(1.5, Math.max(0.15, Math.min(availableWidth / canvasSize.width, availableHeight / canvasSize.height)));
      setZoom(Number(nextZoom.toFixed(2)));
    };
    applyMobileFit();
    const observer = new ResizeObserver(applyMobileFit);
    observer.observe(main);
    media.addEventListener?.("change", applyMobileFit);
    return () => {
      observer.disconnect();
      media.removeEventListener?.("change", applyMobileFit);
    };
  }, [canvasSize.height, canvasSize.width]);

  const exportDrawing = (format: "png" | "svg") => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects().filter((obj) => !obj.get("dataGrid"));
    if (!objects.length) {
      onToast("Tidak ada object untuk diekspor", "error");
      return;
    }

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

    const margin = 10;
    const left = Math.max(0, bounds.left - margin);
    const top = Math.max(0, bounds.top - margin);
    const right = Math.min(canvas.getWidth(), bounds.right + margin);
    const bottom = Math.min(canvas.getHeight(), bounds.bottom + margin);
    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);

    const previousBackground = canvas.backgroundColor;
    canvas.set({ backgroundColor: background });
    canvas.requestRenderAll();

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
      a.download = "free-drawing.png";
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
      a.download = "free-drawing.svg";
      a.click();
      URL.revokeObjectURL(url);
    }

    canvas.set({ backgroundColor: previousBackground });
    canvas.requestRenderAll();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editingText = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (editingText) return;
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

  const addIconAtPoint = async (icon: IconAsset, clientX: number, clientY: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    try {
      const image = await FabricImage.fromURL(icon.url, { crossOrigin: "anonymous" });
      image.set({
        scaleX: 0.45,
        scaleY: 0.45,
        dataIcon: icon.filename,
      });

      // Fabric 7 resolves the pointer against the current viewport transform,
      // so drag/drop remains accurate at any zoom or pan level.
      const scenePoint = canvas.getScenePoint({ clientX, clientY } as any);
      image.set({
        left: Math.max(0, scenePoint.x - image.getScaledWidth() / 2),
        top: Math.max(0, scenePoint.y - image.getScaledHeight() / 2),
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

  const toolbarButton = (active: boolean, label: string, icon: ReactNode, onClick: () => void, disabled = false) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
      style={{
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
      }}
    >
      {icon}
    </button>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ color: "var(--text-primary)" }}>
      <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b free-drawing-toolbar" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-1 min-w-0 overflow-x-auto lg:overflow-visible custom-scrollbar">
          <div className="flex items-center gap-1 shrink-0">
            <span className="lg:hidden">{toolbarButton(tool === "select", "Select", <MousePointer2 size={15} />, () => setToolMode("select"))}</span>
            <span className="lg:hidden">{toolbarButton(tool === "draw", "Freehand", <Pencil size={15} />, () => setToolMode("draw"))}</span>
            <span className="lg:hidden">{toolbarButton(tool === "text", "Text", <Type size={15} />, addText)}</span>
            <span className="lg:hidden">{toolbarButton(tool === "rect", "Rectangle", <Square size={15} />, () => addShape("rect"))}</span>
            <span className="lg:hidden">{toolbarButton(false, "More tools", <MoreHorizontal size={15} />, () => setMobileMoreOpen(true))}</span>

            <span className="hidden lg:inline-flex">{toolbarButton(tool === "select", "Select", <MousePointer2 size={15} />, () => setToolMode("select"))}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(tool === "text", "Text", <Type size={15} />, addText)}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(tool === "rect", "Rectangle", <Square size={15} />, () => addShape("rect"))}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(tool === "roundRect", "Rounded rectangle", <RectangleHorizontal size={15} />, () => addShape("roundRect"))}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(tool === "circle", "Circle", <CircleIcon size={15} />, () => addShape("circle"))}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(tool === "line", "Line", <Minus size={15} />, () => addLine(false))}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(tool === "arrow", "Arrow", <ArrowRight size={15} />, () => addLine(true))}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(tool === "draw", "Freehand", <Pencil size={15} />, () => setToolMode("draw"))}</span>
            <span className="hidden lg:inline-flex w-px h-5 mx-1" style={{ background: "var(--border)" }} />
            <span className="hidden lg:inline-flex">{toolbarButton(false, "Undo", <Undo2 size={15} />, () => void undo(), historyIndex <= 0)}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(false, "Redo", <Redo2 size={15} />, () => void redo(), historyIndex >= historyRef.current.length - 1)}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(false, "Copy", <Copy size={15} />, () => void copy(), !selected)}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(false, "Paste", <Layers size={15} />, () => void paste(), !clipboardRef.current)}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(false, "Duplicate", <Copy size={15} />, () => void duplicate(), !selected)}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(false, "Delete", <Trash2 size={15} />, deleteSelected, !selected)}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(false, "Group", <Group size={15} />, groupSelected, !selected)}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(false, "Ungroup", <Ungroup size={15} />, ungroupSelected, !selected)}</span>
            <span className="hidden lg:inline-flex w-px h-5 mx-1" style={{ background: "var(--border)" }} />
            <span className="hidden lg:inline-flex">{toolbarButton(false, "Bring to front", <BringToFront size={15} />, bringToFront, !selected)}</span>
            <span className="hidden lg:inline-flex">{toolbarButton(false, "Send to back", <SendToBack size={15} />, sendToBack, !selected)}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1 shrink-0">
          {toolbarButton(false, "Zoom out", <ZoomOut size={15} />, () => setZoom((v) => Math.max(0.15, +(v - 0.1).toFixed(2))))}
          <span className="text-[10px] w-10 text-center" style={{ color: "var(--text-muted)" }}>{Math.round(zoom * 100)}%</span>
          {toolbarButton(false, "Zoom in", <ZoomIn size={15} />, () => setZoom((v) => Math.min(2, +(v + 0.1).toFixed(2))))}
          {toolbarButton(false, "Fit canvas", <Maximize2 size={15} />, fitCanvas)}
          <button onClick={() => exportDrawing("svg")} className="hidden lg:flex ml-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold items-center gap-1.5" style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <Download size={13} /> SVG
          </button>
          <button onClick={() => exportDrawing("png")} className="hidden lg:flex px-2.5 py-1.5 rounded-lg text-[11px] font-semibold items-center gap-1.5 text-white" style={{ background: "var(--accent)" }}>
            <Download size={13} /> PNG
          </button>
        </div>
      </div>

      {mobileMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] bg-black/40 flex items-end" onClick={() => setMobileMoreOpen(false)}>
          <div className="w-full rounded-t-2xl p-4 space-y-3" style={{ background: "var(--bg-surface)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-bold">More tools</p><p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Aksi lanjutan Free Drawing</p></div>
              <button type="button" onClick={() => setMobileMoreOpen(false)} className="h-8 px-3 rounded-lg text-xs" style={{ background: "var(--bg-surface2)" }}>Tutup</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {toolbarButton(false, "Rounded rectangle", <RectangleHorizontal size={15} />, () => { addShape("roundRect"); setMobileMoreOpen(false); })}
              {toolbarButton(false, "Circle", <CircleIcon size={15} />, () => { addShape("circle"); setMobileMoreOpen(false); })}
              {toolbarButton(false, "Line", <Minus size={15} />, () => { addLine(false); setMobileMoreOpen(false); })}
              {toolbarButton(false, "Arrow", <ArrowRight size={15} />, () => { addLine(true); setMobileMoreOpen(false); })}
              {toolbarButton(false, "Undo", <Undo2 size={15} />, () => { void undo(); setMobileMoreOpen(false); }, historyIndex <= 0)}
              {toolbarButton(false, "Redo", <Redo2 size={15} />, () => { void redo(); setMobileMoreOpen(false); }, historyIndex >= historyRef.current.length - 1)}
              {toolbarButton(false, "Copy", <Copy size={15} />, () => { void copy(); setMobileMoreOpen(false); }, !selected)}
              {toolbarButton(false, "Paste", <Layers size={15} />, () => { void paste(); setMobileMoreOpen(false); }, !clipboardRef.current)}
              {toolbarButton(false, "Duplicate", <Copy size={15} />, () => { void duplicate(); setMobileMoreOpen(false); }, !selected)}
              {toolbarButton(false, "Delete", <Trash2 size={15} />, () => { deleteSelected(); setMobileMoreOpen(false); }, !selected)}
              {toolbarButton(false, "Group", <Group size={15} />, () => { groupSelected(); setMobileMoreOpen(false); }, !selected)}
              {toolbarButton(false, "Ungroup", <Ungroup size={15} />, () => { ungroupSelected(); setMobileMoreOpen(false); }, !selected)}
              {toolbarButton(false, "Bring to front", <BringToFront size={15} />, () => { bringToFront(); setMobileMoreOpen(false); }, !selected)}
              {toolbarButton(false, "Send to back", <SendToBack size={15} />, () => { sendToBack(); setMobileMoreOpen(false); }, !selected)}
              {toolbarButton(false, "Export SVG", <Download size={15} />, () => { exportDrawing("svg"); setMobileMoreOpen(false); })}
              {toolbarButton(false, "Export PNG", <Download size={15} />, () => { exportDrawing("png"); setMobileMoreOpen(false); })}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <aside className={`w-64 shrink-0 border-r flex flex-col overflow-hidden free-drawing-left ${mobilePanel === "tools" ? "mobile-open" : ""}` style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">Free Drawing</h2>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Canvas diagram editor</p>
              </div>
              <span className="text-[9px] px-2 py-1 rounded-full" style={{ background: isDirty ? "var(--accent-soft)" : "var(--bg-surface2)", color: isDirty ? "var(--accent)" : "var(--text-muted)" }}>
                {isDirty ? "Edited" : "Ready"}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Icon Library</p>
                <label className="cursor-pointer p-1.5 rounded-lg" title="Tambah icon" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                  {uploadingIcon ? <span className="text-[9px]">...</span> : <Upload size={14} />}
                  <input type="file" accept="image/png,image/svg+xml" className="hidden" disabled={uploadingIcon} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadIcon(file); e.currentTarget.value = ""; }} />
                </label>
              </div>
              {loadingIcons ? (
                <p className="text-[11px] py-4 text-center" style={{ color: "var(--text-muted)" }}>Memuat icon...</p>
              ) : icons.length === 0 ? (
                <div className="text-center py-5 rounded-xl" style={{ background: "var(--bg-surface2)", color: "var(--text-muted)" }}>
                  <ImagePlus size={20} className="mx-auto mb-2 opacity-50" />
                  <p className="text-[10px]">Belum ada icon</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {icons.map((icon) => (
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
                <label className="text-[9px]" style={{ color: "var(--text-muted)" }}>Width<input type="number" min={200} value={canvasSize.width} onChange={(e) => setCanvasSize((s) => ({ ...s, width: Math.max(200, Number(e.target.value) || 200) }))} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                <label className="text-[9px]" style={{ color: "var(--text-muted)" }}>Height<input type="number" min={200} value={canvasSize.height} onChange={(e) => setCanvasSize((s) => ({ ...s, height: Math.max(200, Number(e.target.value) || 200) }))} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
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

        <main className="flex-1 min-w-0 min-h-0 overflow-auto flex items-center justify-center p-4" style={{ background: "var(--bg-app)" }}>
          <div
            className="shadow-lg relative"
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
            <canvas ref={canvasElementRef} style={{ width: "100%", height: "100%" }} />
          </div>
        </main>

        <aside className={`w-60 shrink-0 border-l overflow-y-auto custom-scrollbar p-3 space-y-4 free-drawing-right ${mobilePanel === "properties" ? "mobile-open" : ""}` style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Object</p>
            {!selected ? (
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Pilih object di canvas untuk mengedit property.</p>
            ) : (
              <div className="space-y-2">
                <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>X<input type="number" value={Math.round(selected.left || 0)} onChange={(e) => updateSelected({ left: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Y<input type="number" value={Math.round(selected.top || 0)} onChange={(e) => updateSelected({ top: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
                <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Rotation<input type="number" value={Math.round(selected.angle || 0)} onChange={(e) => updateSelected({ angle: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border text-xs" style={{ background: "var(--bg-surface2)", borderColor: "var(--border)", color: "var(--text-primary)" }} /></label>
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

          {selected && !objectIsText(selected) && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Appearance</p>
              <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Fill<input type="color" value={getObjectFill(selected)} onChange={(e) => updateSelected({ fill: e.target.value })} className="w-full h-8 mt-1 rounded-lg cursor-pointer" /></label>
              <label className="text-[9px] block" style={{ color: "var(--text-muted)" }}>Stroke<input type="color" value={getObjectStroke(selected)} onChange={(e) => updateSelected({ stroke: e.target.value })} className="w-full h-8 mt-1 rounded-lg cursor-pointer" /></label>
            </div>
          )}
        </aside>
      </div>

      <div className="lg:hidden shrink-0 grid grid-cols-3 gap-1 px-2 py-2 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <button type="button" onClick={() => setMobilePanel(mobilePanel === "tools" ? null : "tools")} className="h-9 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold" style={{ background: mobilePanel === "tools" ? "var(--accent-soft)" : "var(--bg-surface2)", color: mobilePanel === "tools" ? "var(--accent)" : "var(--text-secondary)" }}><Wrench size={14} /> Tools</button>
        <button type="button" onClick={() => setMobilePanel(mobilePanel === "properties" ? null : "properties")} className="h-9 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold" style={{ background: mobilePanel === "properties" ? "var(--accent-soft)" : "var(--bg-surface2)", color: mobilePanel === "properties" ? "var(--accent)" : "var(--text-secondary)" }}><Settings2 size={14} /> Properties</button>
        <button type="button" onClick={() => setMobileMoreOpen(true)} className="h-9 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold" style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)" }}><MoreHorizontal size={14} /> More</button>
      </div>
    </div>
  );
}

