/**
 * svgTopologyRenderer.ts
 * Port 1:1 dari renderer.js (V20 - FORCE EVEN COLUMNS) asbuilt_python.
 * Logika snake TIDAK diubah — hanya di-TypeScript-kan.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NodePosition {
  name: string;
  x: number;
  y: number;
  labelTop?: string;
  service?: string;
}

export interface LayoutConfig {
  icon: number;
  gx: number;
  gy: number;
  maxW: number;
  maxRows: number;
  padX: number;
  padY: number;
  midY: number;
}

export interface TopologyInput {
  title: string;
  serviceName: string;
  locOri: string;
  locTermi: string;
  mainNodes: string[];
  backupNodes: string[];
  mode: "ring" | "linear";
  config: {
    maxCols: number;
    gapX: number;
    gapY: number;
    maxRows: number;
  };
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const STYLES = {
  fontFamily: "Arial, sans-serif",
  textFill: "#333333",
  titleFill: "#2c3e50",
  mainStroke: "#00b894",
  backupStroke: "#0984e3",
};

const SVG_NS   = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

function el(tag: string): SVGElement {
  return document.createElementNS(SVG_NS, tag);
}

// ─── Layout Algorithms (port 1:1 dari renderer.js) ───────────────────────────

/**
 * calculateSnakePath — Backup path (port dari Renderer.calculateSnakePath)
 */
export function calculateSnakePath(
  names: string[],
  mainPath: NodePosition[],
  C: LayoutConfig
): NodePosition[] {
  if (!names || names.length === 0) return [];

  const nodes: NodePosition[] = [];
  const totalNodes = names.length;
  const maxRows    = C.maxRows || 4;
  const startX     = mainPath[0].x;

  // Isi kolom dulu sampai maxW, baru baris bertambah otomatis
  let cols = Math.min(totalNodes, C.maxW);
  if (cols < 1) cols = 1;

  // [PENTING] FORCE EVEN COLUMNS
  if (cols > 1 && cols % 2 !== 0) cols += 1;

  const backupYG = C.gy * 1.2;
  let nodeIndex  = 0;

  for (let col = 0; col < cols && nodeIndex < totalNodes; col++) {
    const x = startX + col * C.gx;

    let nodesInThisCol = Math.floor(totalNodes / cols);
    if (col < totalNodes % cols) nodesInThisCol++;
    if (nodesInThisCol === 0 && nodeIndex < totalNodes) nodesInThisCol = 1;

    if (col % 2 === 0) {
      // Turun
      for (let i = 0; i < nodesInThisCol && nodeIndex < totalNodes; i++) {
        const y = mainPath[0].y + C.gy * 1.5 + i * backupYG;
        nodes.push({ name: names[nodeIndex], x, y });
        nodeIndex++;
      }
    } else {
      // Naik
      for (let i = nodesInThisCol - 1; i >= 0 && nodeIndex < totalNodes; i--) {
        const y = mainPath[0].y + C.gy * 1.5 + i * backupYG;
        nodes.push({ name: names[nodeIndex], x, y });
        nodeIndex++;
      }
    }
  }

  // Rescale x: backup[0] tepat di bawah mainPath[0], backup[last] tepat di bawah mainPath[last]
  if (nodes.length > 1) {
    const srcStart = nodes[0].x;
    const srcEnd   = nodes[nodes.length - 1].x;
    const dstStart = mainPath[0].x;
    const dstEnd   = mainPath[mainPath.length - 1].x;
    const srcSpan  = srcEnd - srcStart;
    const dstSpan  = dstEnd - dstStart;
    nodes.forEach((n) => {
      const ratio = srcSpan === 0 ? 0 : (n.x - srcStart) / srcSpan;
      n.x = dstStart + ratio * dstSpan;
    });
  } else if (nodes.length === 1) {
    nodes[0].x = mainPath[0].x;
  }
  return nodes;
}

/**
 * calculateMainPathSnake — Main path (port dari Renderer.calculateMainPathSnake)
 */
export function calculateMainPathSnake(
  names: string[],
  backupCount: number,
  C: LayoutConfig
): NodePosition[] {
  const totalNodes = names.length;
  const maxRows    = C.maxRows || 4;

  // Hitung Kebutuhan Kolom Backup — isi kolom dulu sampai maxW
  let backupColsNeeded = Math.min(backupCount, C.maxW);
  if (backupColsNeeded > 1 && backupColsNeeded % 2 !== 0) backupColsNeeded += 1;

  // Main: isi kolom dulu sampai maxW
  let mainColsNeeded = Math.min(totalNodes, C.maxW);
  if (totalNodes <= C.maxW) mainColsNeeded = totalNodes;

  // Ambil Max
  let totalCols = Math.max(backupColsNeeded, mainColsNeeded);
  totalCols = Math.min(totalCols, C.maxW);

  // Final Check Force Even
  if (totalCols > 1 && totalCols % 2 !== 0) totalCols += 1;

  // Ensure at least 2 columns if we have 2 nodes
  if (totalNodes >= 2 && totalCols < 2) totalCols = 2;

  const nodes: NodePosition[] = [];
  const startX  = C.padX + C.gx;
  const mainYG  = C.gy;

  // Stretch Logic
  if (totalNodes <= totalCols) {
    const totalWidth = (totalCols - 1) * C.gx;
    for (let i = 0; i < totalNodes; i++) {
      const ratio = i / (totalNodes - 1);
      nodes.push({ name: names[i], x: startX + ratio * totalWidth, y: C.midY });
    }
    return nodes;
  }

  // Snake Logic
  let nodeIndex = 0;
  for (let col = 0; col < totalCols && nodeIndex < totalNodes; col++) {
    const x = startX + col * C.gx;

    let nodesInThisCol = Math.floor(totalNodes / totalCols);
    if (col < totalNodes % totalCols) nodesInThisCol++;

    if (col % 2 === 0) {
      // Genap (Naik)
      for (let i = 0; i < nodesInThisCol && nodeIndex < totalNodes; i++) {
        nodes.push({ name: names[nodeIndex], x, y: C.midY - i * mainYG });
        nodeIndex++;
      }
    } else {
      // Ganjil (Turun)
      for (let i = 0; i < nodesInThisCol && nodeIndex < totalNodes; i++) {
        const y = C.midY - (nodesInThisCol - 1) * mainYG + i * mainYG;
        nodes.push({ name: names[nodeIndex], x, y });
        nodeIndex++;
      }
    }
  }

  return nodes;
}

// ─── SVG Drawing ─────────────────────────────────────────────────────────────

function drawEndpointNode(g: SVGGElement, n: NodePosition, icon: string, size: number): void {
  const group = el("g") as SVGGElement;

  const txtTop = el("text") as SVGTextElement;
  txtTop.setAttribute("x", String(n.x));
  txtTop.setAttribute("y", String(n.y - size / 2 - 10));
  txtTop.setAttribute("style", `font-weight: bold; font-size: 12px; fill: ${STYLES.textFill}; text-anchor: middle;`);
  txtTop.textContent = n.labelTop || "";

  const img = el("image") as SVGImageElement;
  img.setAttribute("x", String(n.x - size / 2));
  img.setAttribute("y", String(n.y - size / 2));
  img.setAttribute("width", String(size));
  img.setAttribute("height", String(size));
  img.setAttribute("href", icon);
  img.setAttributeNS(XLINK_NS, "href", icon);

  const txtService = el("text") as SVGTextElement;
  txtService.setAttribute("x", String(n.x));
  txtService.setAttribute("y", String(n.y + size / 2 + 10));
  txtService.setAttribute("style", `font-weight: bold; font-size: 11px; fill: ${STYLES.textFill}; text-anchor: middle;`);
  txtService.textContent = n.service || "";

  const txtLoc = el("text") as SVGTextElement;
  txtLoc.setAttribute("x", String(n.x));
  txtLoc.setAttribute("y", String(n.y + size / 2 + 25));
  txtLoc.setAttribute("style", `font-size: 11px; fill: ${STYLES.textFill}; text-anchor: middle;`);
  txtLoc.textContent = n.name;

  group.appendChild(txtTop);
  group.appendChild(img);
  group.appendChild(txtService);
  group.appendChild(txtLoc);
  g.appendChild(group);
}

function drawRegularNode(g: SVGGElement, n: NodePosition, icon: string, size: number): void {
  const group = el("g") as SVGGElement;

  const img = el("image") as SVGImageElement;
  img.setAttribute("x", String(n.x - size / 2));
  img.setAttribute("y", String(n.y - size / 2));
  img.setAttribute("width", String(size));
  img.setAttribute("height", String(size));
  img.setAttribute("href", icon);
  img.setAttributeNS(XLINK_NS, "href", icon);

  const fontSize = (n.name || "").length > 20 ? "9px" : "10px";
  const txt = el("text") as SVGTextElement;
  txt.setAttribute("x", String(n.x));
  txt.setAttribute("y", String(n.y + size / 2 + 10));
  txt.setAttribute("style", `font-weight: bold; font-size: ${fontSize}; fill: ${STYLES.textFill}; text-anchor: middle;`);
  txt.textContent = n.name;

  const subTxt = el("text") as SVGTextElement;
  subTxt.setAttribute("x", String(n.x));
  subTxt.setAttribute("y", String(n.y + size / 2 + 23));
  subTxt.setAttribute("style", `font-size: 8px; font-style: italic; fill: #666; text-anchor: middle;`);
  subTxt.textContent = "OSN 1800";

  group.appendChild(img);
  group.appendChild(txt);
  group.appendChild(subTxt);
  g.appendChild(group);
}

function drawPath(g: SVGGElement, p1: NodePosition, p2: NodePosition, type: "main" | "backup"): void {
  const path = el("path") as SVGPathElement;
  const dx   = Math.abs(p1.x - p2.x);
  const dy   = Math.abs(p1.y - p2.y);
  let d: string;
  if (dx < 1) d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  else if (dy < 1) d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  else d = `M ${p1.x} ${p1.y} L ${p2.x} ${p1.y} L ${p2.x} ${p2.y}`;

  const stroke = type === "main" ? STYLES.mainStroke : STYLES.backupStroke;
  path.setAttribute("d", d);
  path.setAttribute("style", `fill: none; stroke: ${stroke}; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round;`);
  g.insertBefore(path, g.firstChild);
}

function drawTitle(g: SVGGElement, x: number, y: number, text: string): void {
  const t = el("text") as SVGTextElement;
  t.setAttribute("x", String(x));
  t.setAttribute("y", String(y));
  t.setAttribute("style", `font-size: 24px; font-weight: bold; fill: ${STYLES.titleFill}; text-anchor: middle;`);
  t.textContent = text;
  g.appendChild(t);
}

function drawLegend(g: SVGGElement, x: number, y: number, mode: "ring" | "linear"): void {
  const group = el("g") as SVGGElement;
  let mainX = x - 60;
  if (mode === "ring") mainX = x - 120;

  const line1 = el("rect") as SVGRectElement;
  line1.setAttribute("x", String(mainX)); line1.setAttribute("y", String(y - 2));
  line1.setAttribute("width", "30"); line1.setAttribute("height", "4");
  line1.setAttribute("fill", STYLES.mainStroke);

  const text1 = el("text") as SVGTextElement;
  text1.setAttribute("x", String(mainX + 40)); text1.setAttribute("y", String(y + 2));
  text1.setAttribute("style", `font-size: 12px; fill: ${STYLES.textFill}; text-anchor: start; alignment-baseline: middle;`);
  text1.textContent = "Main Link";

  group.appendChild(line1);
  group.appendChild(text1);

  if (mode === "ring") {
    const backupX = x + 30;
    const line2 = el("rect") as SVGRectElement;
    line2.setAttribute("x", String(backupX)); line2.setAttribute("y", String(y - 2));
    line2.setAttribute("width", "30"); line2.setAttribute("height", "4");
    line2.setAttribute("fill", STYLES.backupStroke);

    const text2 = el("text") as SVGTextElement;
    text2.setAttribute("x", String(backupX + 40)); text2.setAttribute("y", String(y + 2));
    text2.setAttribute("style", `font-size: 12px; fill: ${STYLES.textFill}; text-anchor: start; alignment-baseline: middle;`);
    text2.textContent = "Backup Link";

    group.appendChild(line2);
    group.appendChild(text2);
  }

  g.appendChild(group);
}

// ─── Main Render Function ─────────────────────────────────────────────────────

export function renderTopology(
  data: TopologyInput,
  container: HTMLElement,
  iconPc: string,
  iconRouter: string
): void {
  container.innerHTML = "";

  const C: LayoutConfig = {
    icon: 60,
    gx: data.config.gapX || 120,
    gy: data.config.gapY || 100,
    maxW: data.config.maxCols || 8,
    maxRows: data.config.maxRows || 4,
    padX: 100,
    padY: 150,
    midY: 450,
  };

  const mainNodesRaw   = data.mainNodes;
  const backupNodesRaw = data.mode === "linear" ? [] : data.backupNodes;

  if (mainNodesRaw.length < 2) {
    container.innerHTML = `<p style="text-align:center; padding:20px;">Main Link minimal butuh 2 node.</p>`;
    return;
  }

  // Layout calculation (sama persis dengan renderer.js)
  const mainPath   = calculateMainPathSnake(mainNodesRaw, backupNodesRaw.length, C);
  const backupPath = data.mode === "ring" && backupNodesRaw.length > 0
    ? calculateSnakePath(backupNodesRaw, mainPath, C)
    : [];

  // Posisi endpoint (sama persis dengan renderer.js)
  const originNode: NodePosition = {
    name: data.locOri, service: data.serviceName, labelTop: "ORIGINATING",
    x: mainPath[0].x - C.gx, y: mainPath[0].y,
  };

  const lastMain = mainPath[mainPath.length - 1];
  let maxX = lastMain.x;
  if (backupPath.length > 0) {
    const lastBackup = backupPath[backupPath.length - 1];
    if (lastBackup.x > maxX) maxX = lastBackup.x;
  }

  const termNode: NodePosition = {
    name: data.locTermi, service: data.serviceName, labelTop: "TERMINATING",
    x: maxX + C.gx, y: lastMain.y,
  };

  // SVG setup
  const allNodes = [originNode, termNode, ...mainPath, ...backupPath];
  const ys = allNodes.map((n) => n.y);
  const xs = allNodes.map((n) => n.x);

  const minY = Math.min(...ys) - C.padY;
  const maxY = Math.max(...ys) + C.padY;
  const minX = Math.min(...xs) - C.padX;
  const maxXMap = Math.max(...xs) + C.padX;

  const topoMaxY  = Math.max(...ys);
  const centerX   = (minX + maxXMap) / 2;
  const labelOffset = C.icon / 2 + 35;
  const legendY   = topoMaxY + labelOffset + C.gy * 0.1;
  const adjustedMaxY = Math.max(maxY, legendY + C.gy * 0.15);

  const svg = el("svg") as SVGSVGElement;
  svg.setAttribute("viewBox", `${minX} ${minY} ${maxXMap - minX} ${adjustedMaxY - minY}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("style", `font-family: ${STYLES.fontFamily};`);

  const g = el("g") as SVGGElement;
  svg.appendChild(g);

  // Draw lines
  drawPath(g, originNode, mainPath[0], "main");
  for (let i = 0; i < mainPath.length - 1; i++) drawPath(g, mainPath[i], mainPath[i + 1], "main");
  drawPath(g, mainPath[mainPath.length - 1], termNode, "main");

  if (data.mode === "ring" && backupPath.length > 0) {
    drawPath(g, mainPath[0], backupPath[0], "backup");
    const lastB = backupPath[backupPath.length - 1];
    const lastM = mainPath[mainPath.length - 1];
    drawPath(g, lastB, lastM, "backup");
    for (let i = 0; i < backupPath.length - 1; i++) drawPath(g, backupPath[i], backupPath[i + 1], "backup");
  }

  // Draw icons
  drawEndpointNode(g, originNode, iconPc, C.icon);
  drawEndpointNode(g, termNode, iconPc, C.icon);
  mainPath.forEach((n) => drawRegularNode(g, n, iconRouter, C.icon));
  backupPath.forEach((n) => drawRegularNode(g, n, iconRouter, C.icon));

  // Title & Legend
  drawTitle(g, centerX, minY + 60, data.title);
  drawLegend(g, centerX, legendY, data.mode);

  container.appendChild(svg);
}

// ─── PNG Download Helper ──────────────────────────────────────────────────────

export async function downloadSvgAsPng(svgEl: SVGSVGElement, filename: string, scale = 2): Promise<void> {
  const cloned = svgEl.cloneNode(true) as SVGSVGElement;
  const images = Array.from(cloned.querySelectorAll("image"));

  await Promise.all(
    images.map(async (img) => {
      const href = img.getAttribute("href") || img.getAttributeNS(XLINK_NS, "href") || "";
      if (!href) return;
      try {
        const dataUrl = await loadImageAsDataUrl(href);
        img.setAttribute("href", dataUrl);
        img.setAttributeNS(XLINK_NS, "href", dataUrl);
      } catch { /* biarkan */ }
    })
  );

  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(cloned);
  if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const viewBox = svgEl.getAttribute("viewBox")?.split(" ").map(Number) || [0, 0, 800, 600];
      const w = viewBox[2];
      const h = viewBox[3];
      const canvas = document.createElement("canvas");
      canvas.width  = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, h);
      const a = document.createElement("a");
      a.download = filename;
      a.href = canvas.toDataURL("image/png");
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Gagal load SVG ke canvas")); };
    img.src = url;
  });
}

function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      try { resolve(canvas.toDataURL("image/png")); } catch { resolve(src); }
    };
    img.onerror = () => resolve(src);
    img.src = src + "?t=" + Date.now();
  });
}