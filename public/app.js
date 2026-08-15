import { astToPlainText, parseContent } from "./formula-core.mjs";

const SAMPLE = `下面整理二次方程的求根公式，以及一个矩阵示例。

当 a ≠ 0 时，方程 ax² + bx + c = 0 的两个根为：
$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

判别式决定根的类型：\\(\\Delta = b^2 - 4ac\\)。

系数矩阵可以写成：
\\[
\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
\\]`;

const state = {
  mode: "auto",
  items: [],
  selectedIndex: -1,
  zoom: 1,
};

const elements = {
  source: document.querySelector("#sourceInput"),
  charCount: document.querySelector("#charCount"),
  formulaCount: document.querySelector("#formulaCount"),
  textCount: document.querySelector("#textCount"),
  codeCount: document.querySelector("#codeCount"),
  statusText: document.querySelector("#statusText"),
  statusDot: document.querySelector(".status-dot"),
  preview: document.querySelector("#previewDocument"),
  title: document.querySelector("#titleInput"),
  fileName: document.querySelector("#fileNameInput"),
  includeSource: document.querySelector("#includeSource"),
  inspectorEmpty: document.querySelector("#inspectorEmpty"),
  inspectorContent: document.querySelector("#inspectorContent"),
  inspectorStatus: document.querySelector("#inspectorStatus"),
  inspectorFormat: document.querySelector("#inspectorFormat"),
  inspectorNumber: document.querySelector("#inspectorNumber"),
  inspectorSource: document.querySelector("#inspectorSource"),
  selectionHint: document.querySelector("#selectionHint"),
  zoomLabel: document.querySelector("#zoomLabel"),
  toast: document.querySelector("#toast"),
  exportButton: document.querySelector("#exportButton"),
};

const htmlEscape = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

function renderAst(nodes) {
  const list = Array.isArray(nodes) ? nodes : nodes ? [nodes] : [];
  return list.map(renderNode).join("");
}

function renderNode(node) {
  if (!node) return "";
  if (node.type === "text") return htmlEscape(node.value).replace(/ {2}/g, " &nbsp;");
  if (node.type === "group") return `<span class="math-group">${renderAst(node.children)}</span>`;
  if (node.type === "frac") {
    return `<span class="math-frac"><span class="math-num">${renderAst(node.numerator)}</span><span class="math-den">${renderAst(node.denominator)}</span></span>`;
  }
  if (node.type === "sqrt") {
    const degree = node.degree?.length ? `<sup class="math-degree">${renderAst(node.degree)}</sup>` : "";
    return `<span class="math-root">${degree}<span class="math-radical-symbol">√</span><span class="math-radicand">${renderAst(node.radicand)}</span></span>`;
  }
  if (node.type === "sup") return `<span class="math-script"><span class="math-base">${renderNode(node.base)}</span><sup>${renderAst(node.sup)}</sup></span>`;
  if (node.type === "sub") return `<span class="math-script"><span class="math-base">${renderNode(node.base)}</span><sub>${renderAst(node.sub)}</sub></span>`;
  if (node.type === "subsup") return `<span class="math-script"><span class="math-base">${renderNode(node.base)}</span><sup>${renderAst(node.sup)}</sup><sub>${renderAst(node.sub)}</sub></span>`;
  if (node.type === "binom") {
    return `<span class="math-parentheses">(</span><span class="math-frac"><span class="math-num">${renderAst(node.numerator)}</span><span class="math-den">${renderAst(node.denominator)}</span></span><span class="math-parentheses">)</span>`;
  }
  if (node.type === "matrix") {
    return `<span class="math-matrix"><span class="math-matrix-rows">${node.rows.map((row) => `<span class="math-row">${row.map((cell) => `<span>${renderAst(cell)}</span>`).join("")}</span>`).join("")}</span></span>`;
  }
  if (node.type === "styled") {
    const style = node.style === "bold" ? "math-bold" : node.style === "italic" ? "math-italic" : node.style === "operator" ? "math-operator" : "math-text";
    return `<span class="${style}">${renderAst(node.children)}</span>`;
  }
  if (node.type === "accent") {
    const accent = node.accent || "over";
    const line = ["over", "overline", "bar"].includes(accent) ? `<span class="math-accent-line" aria-hidden="true"></span>` : "";
    return `<span class="math-accent math-accent-${htmlEscape(accent)}">${line}<span>${renderAst(node.children)}</span></span>`;
  }
  return "";
}

function formulaMarkup(item, index) {
  const inlineClass = item.inline ? " inline-formula" : "";
  const selected = state.selectedIndex === index ? " selected" : "";
  const source = htmlEscape(item.source).replace(/\n/g, " ");
  return `<div class="document-block formula-block${inlineClass}${selected}" data-index="${index}" role="button" tabindex="0" aria-label="选择第 ${index + 1} 个公式">
    <span class="formula-tag">${htmlEscape(item.format)} · ${String(index + 1).padStart(2, "0")}</span>
    <span class="formula-render">${renderAst(item.ast)}</span>
    <div class="formula-source">${source}</div>
  </div>`;
}

function renderDocument() {
  const title = htmlEscape(elements.title.value.trim() || "AI 公式解析结果");
  const formulaTotal = state.items.filter((item) => item.type === "formula").length;
  if (!state.items.length) {
    elements.preview.innerHTML = `<div class="empty-state"><div class="empty-glyph" aria-hidden="true">∑</div><h3>还没有解析内容</h3><p>输入或载入一段内容后，预览会显示在这里。</p></div>`;
    return;
  }
  const blocks = state.items.map((item, index) => {
    if (item.type === "formula") return formulaMarkup(item, index);
    if (item.type === "code") return `<div class="document-block code-block">${htmlEscape(item.text)}</div>`;
    return `<div class="document-block text-block">${htmlEscape(item.text)}</div>`;
  }).join("");
  elements.preview.innerHTML = `<h3 class="document-title">${title}</h3><div class="document-meta">${formulaTotal} FORMULA${formulaTotal === 1 ? "" : "S"} · LOCAL PARSE</div>${blocks}`;
  elements.preview.querySelectorAll(".formula-block").forEach((block) => {
    block.addEventListener("click", () => selectFormula(Number(block.dataset.index)));
    block.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectFormula(Number(block.dataset.index));
      }
    });
  });
}

function updateInspector() {
  const item = state.items[state.selectedIndex];
  if (!item || item.type !== "formula") {
    elements.inspectorEmpty.hidden = false;
    elements.inspectorContent.hidden = true;
    elements.inspectorStatus.textContent = "IDLE";
    elements.selectionHint.textContent = "未选择公式";
    return;
  }
  elements.inspectorEmpty.hidden = true;
  elements.inspectorContent.hidden = false;
  elements.inspectorStatus.textContent = "SELECTED";
  elements.inspectorFormat.textContent = item.format.toUpperCase();
  elements.inspectorNumber.textContent = `FORMULA ${String(state.selectedIndex + 1).padStart(2, "0")}`;
  elements.inspectorSource.value = item.source;
  elements.selectionHint.textContent = `已选择公式 ${String(state.selectedIndex + 1).padStart(2, "0")}`;
}

function selectFormula(index) {
  state.selectedIndex = state.selectedIndex === index ? -1 : index;
  renderDocument();
  updateInspector();
}

function updateStats() {
  const formulaTotal = state.items.filter((item) => item.type === "formula").length;
  const textTotal = state.items.filter((item) => item.type === "text").length;
  const codeTotal = state.items.filter((item) => item.type === "code").length;
  elements.formulaCount.textContent = String(formulaTotal);
  elements.textCount.textContent = String(textTotal);
  elements.codeCount.textContent = String(codeTotal);
  elements.charCount.textContent = `${elements.source.value.length.toLocaleString("zh-CN")} 字符`;
  const hasInput = Boolean(elements.source.value.trim());
  elements.statusText.textContent = hasInput ? `${formulaTotal} 个公式已解析` : "等待输入";
  elements.statusDot.classList.toggle("ready", hasInput);
  elements.exportButton.disabled = !hasInput;
}

function parseAndRender({ keepSelection = false } = {}) {
  state.items = parseContent(elements.source.value, state.mode);
  if (!keepSelection || !state.items[state.selectedIndex] || state.items[state.selectedIndex].type !== "formula") state.selectedIndex = -1;
  renderDocument();
  updateInspector();
  updateStats();
}

let toastTimer;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

function setZoom(value) {
  state.zoom = Math.min(1.3, Math.max(0.8, Math.round(value * 10) / 10));
  document.documentElement.style.setProperty("--math-scale", String(state.zoom));
  elements.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
}

async function exportDocument() {
  if (!state.items.length) {
    showToast("请先输入或载入内容。");
    return;
  }
  elements.exportButton.disabled = true;
  elements.exportButton.innerHTML = '<span class="button-symbol" aria-hidden="true">…</span> 生成中';
  try {
    const payload = {
      title: elements.title.value.trim() || "AI 公式解析结果",
      fileName: elements.fileName.value.trim() || "公式解析结果",
      includeSource: elements.includeSource.checked,
      items: state.items,
    };
    const desktopExport = window.formulaDesktop?.exportDocx || window.pywebview?.api?.export_docx;
    if (desktopExport) {
      const result = await desktopExport(payload);
      if (result?.canceled) {
        showToast("已取消导出。");
        return;
      }
      showToast("Word 文档已保存。");
      return;
    }
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error || "导出失败");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(elements.fileName.value.trim() || "公式解析结果").replace(/[\\/:*?"<>|]/g, "")}.docx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Word 文档已生成并开始下载。");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "导出失败，请检查服务状态。");
  } finally {
    elements.exportButton.disabled = !elements.source.value.trim();
    elements.exportButton.innerHTML = '<span class="button-symbol" aria-hidden="true">↓</span> 导出 Word';
  }
}

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.mode = button.dataset.mode;
    parseAndRender();
  });
});

elements.source.addEventListener("input", () => parseAndRender({ keepSelection: true }));
elements.title.addEventListener("input", () => renderDocument());
document.querySelector("#loadSample").addEventListener("click", () => {
  elements.source.value = SAMPLE;
  parseAndRender();
  showToast("示例内容已载入。");
});
document.querySelector("#clearButton").addEventListener("click", () => {
  elements.source.value = "";
  parseAndRender();
  elements.source.focus();
});
document.querySelector("#fileInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    elements.source.value = await file.text();
    parseAndRender();
    showToast(`已载入 ${file.name}`);
  } catch {
    showToast("文件读取失败。");
  }
  event.target.value = "";
});
document.querySelector("#zoomOut").addEventListener("click", () => setZoom(state.zoom - 0.1));
document.querySelector("#zoomReset").addEventListener("click", () => setZoom(1));
document.querySelector("#zoomIn").addEventListener("click", () => setZoom(state.zoom + 0.1));
document.querySelector("#copySource").addEventListener("click", async () => {
  if (!elements.inspectorSource.value) return;
  try {
    await navigator.clipboard.writeText(elements.inspectorSource.value);
    showToast("公式源代码已复制。");
  } catch {
    elements.inspectorSource.select();
    document.execCommand("copy");
    showToast("公式源代码已复制。");
  }
});
elements.exportButton.addEventListener("click", exportDocument);
elements.source.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") parseAndRender();
});

setZoom(1);
parseAndRender();
