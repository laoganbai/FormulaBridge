import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const PORT = Number(process.env.FORMULA_PORT || 4173);
const ROOT = resolve(process.env.FORMULA_ROOT || process.cwd());
const RUNTIME_NODE_MODULES = "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";

const DOCX_CANDIDATES = [
  join(ROOT, "node_modules", "docx", "dist", "index.mjs"),
  join(RUNTIME_NODE_MODULES, "docx", "dist", "index.mjs"),
];
const DOCX_ENTRY = DOCX_CANDIDATES.find((candidate) => existsSync(candidate));
const docx = DOCX_ENTRY ? await import(`file:///${DOCX_ENTRY.replace(/\\/g, "/")}`) : null;
const {
  AlignmentType,
  Document,
  HeadingLevel,
  Math: MathBlock,
  MathFraction,
  MathRadical,
  MathRun,
  MathSubScript,
  MathSubSuperScript,
  MathSuperScript,
  Packer,
  Paragraph,
  TextRun,
} = docx ?? {};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function send(response, status, body, contentType = "text/plain; charset=utf-8", extraHeaders = {}) {
  response.writeHead(status, { "Content-Type": contentType, ...extraHeaders });
  response.end(body);
}

function sendStatic(requestPath, response) {
  const pathname = requestPath === "/" ? "/index.html" : requestPath;
  const publicRoot = resolve(join(ROOT, "public"));
  const target = pathname === "/formula-core.mjs"
    ? resolve(join(ROOT, "formula-core.mjs"))
    : resolve(join(publicRoot, pathname.replace(/^\/+/, "")));
  const allowedRoot = pathname === "/formula-core.mjs" ? ROOT : publicRoot;
  if (!target.startsWith(allowedRoot) || !existsSync(target)) {
    send(response, 404, "Not found");
    return;
  }
  send(response, 200, readFileSync(target), MIME_TYPES[extname(target)] || "application/octet-stream");
}

export function sanitizeFileName(value) {
  const result = String(value || "公式解析结果")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return result || "公式解析结果";
}

function componentChildren(nodes) {
  const list = Array.isArray(nodes) ? nodes : nodes ? [nodes] : [];
  return list.flatMap(astToMathComponents);
}

function safeMathRun(value) {
  return new MathRun(String(value ?? "") || " ");
}

function astToMathComponents(node) {
  if (!node) return [];
  if (Array.isArray(node)) return componentChildren(node);
  if (node.type === "text") return node.value ? [safeMathRun(node.value)] : [];
  if (node.type === "group") return componentChildren(node.children);
  if (node.type === "styled" || node.type === "accent") return componentChildren(node.children);
  if (node.type === "frac") {
    return [new MathFraction({ numerator: componentChildren(node.numerator), denominator: componentChildren(node.denominator) })];
  }
  if (node.type === "sqrt") {
    const options = { children: componentChildren(node.radicand) };
    if (node.degree?.length) options.degree = componentChildren(node.degree);
    return [new MathRadical(options)];
  }
  if (node.type === "sup") {
    return [new MathSuperScript({ children: componentChildren([node.base]), superScript: componentChildren(node.sup) })];
  }
  if (node.type === "sub") {
    return [new MathSubScript({ children: componentChildren([node.base]), subScript: componentChildren(node.sub) })];
  }
  if (node.type === "subsup") {
    return [new MathSubSuperScript({ children: componentChildren([node.base]), subScript: componentChildren(node.sub), superScript: componentChildren(node.sup) })];
  }
  if (node.type === "binom") {
    return [safeMathRun("(") , new MathFraction({ numerator: componentChildren(node.numerator), denominator: componentChildren(node.denominator) }), safeMathRun(")")];
  }
  if (node.type === "matrix") {
    const matrixText = node.rows.map((row) => `[${row.map((cell) => cell.map((part) => part.value ?? "").join("")).join(", ")}]`).join(" ");
    return [safeMathRun(matrixText)];
  }
  return [];
}

function textParagraphs(value, options = {}) {
  return String(value ?? "").split("\n").map((line) => new Paragraph({
    children: [new TextRun({
      text: line || " ",
      font: options.font || "Aptos",
      size: options.size || 22,
      color: options.color,
    })],
    spacing: { after: options.after ?? 80 },
  }));
}

function formulaParagraph(item) {
  const components = astToMathComponents(item.ast);
  if (!components.length) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: item.source, font: "Cambria Math", italics: true, size: 26 })],
      spacing: { before: 160, after: 120 },
    });
  }
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new MathBlock({ children: components })],
    spacing: { before: 180, after: 120 },
  });
}

function sourceParagraph(source) {
  return new Paragraph({
    children: [
      new TextRun({ text: "源代码  ", bold: true, color: "61736B", size: 18 }),
      new TextRun({ text: source, font: "Cascadia Mono", color: "61736B", size: 18 }),
    ],
    spacing: { after: 160 },
  });
}

export async function createDocx(payload) {
  if (!docx) throw new Error("未找到 docx 生成依赖");
  const title = String(payload.title || "公式解析结果").trim().slice(0, 120) || "公式解析结果";
  const items = Array.isArray(payload.items) ? payload.items : [];
  const children = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: title, bold: true, font: "Aptos Display", size: 34, color: "17342A" })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${items.filter((item) => item.type === "formula").length} 个公式 · ${new Date().toLocaleDateString("zh-CN")}`, color: "61736B", size: 20 })],
      spacing: { after: 360 },
    }),
  ];

  for (const item of items) {
    if (item.type === "formula") {
      children.push(formulaParagraph(item));
      if (payload.includeSource !== false) children.push(sourceParagraph(item.source));
    } else if (item.type === "code") {
      children.push(...textParagraphs(item.text, { font: "Cascadia Mono", size: 19, color: "33443C", after: 40 }));
    } else if (item.type === "text") {
      children.push(...textParagraphs(item.text));
    }
  }

  if (!items.length) children.push(new Paragraph({ text: "未检测到可导出的内容。" }));
  const document = new Document({
    title,
    subject: "AI 公式解析结果",
    creator: "公式解析器",
    sections: [{
      properties: { page: { margin: { top: 900, right: 1100, bottom: 900, left: 1100 } } },
      children,
    }],
  });
  return Packer.toBuffer(document);
}

async function readJson(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > 3 * 1024 * 1024) throw new Error("请求内容过大");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (request.method === "POST" && url.pathname === "/api/export") {
      const payload = await readJson(request);
      const buffer = await createDocx(payload);
      const fileName = `${sanitizeFileName(payload.fileName || payload.title)}.docx`;
      send(response, 200, buffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", {
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      });
      return;
    }
    if (request.method !== "GET") {
      send(response, 405, "Method not allowed");
      return;
    }
    sendStatic(url.pathname, response);
  } catch (error) {
    send(response, 500, JSON.stringify({ error: error instanceof Error ? error.message : "导出失败" }), "application/json; charset=utf-8");
  }
});

if (process.env.FORMULA_SERVER !== "disabled") {
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Formula parser running at http://127.0.0.1:${PORT}`);
  });
}
