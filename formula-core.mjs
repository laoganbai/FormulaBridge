const COMMAND_SYMBOLS = Object.freeze({
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ϵ",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  vartheta: "ϑ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  varpi: "ϖ",
  rho: "ρ",
  varrho: "ϱ",
  sigma: "σ",
  varsigma: "ς",
  tau: "τ",
  upsilon: "υ",
  phi: "ϕ",
  varphi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Upsilon: "Υ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
  times: "×",
  cdot: "·",
  div: "÷",
  pm: "±",
  mp: "∓",
  le: "≤",
  leq: "≤",
  ge: "≥",
  geq: "≥",
  neq: "≠",
  ne: "≠",
  approx: "≈",
  asymp: "≍",
  equiv: "≡",
  sim: "∼",
  simeq: "≃",
  propto: "∝",
  to: "→",
  rightarrow: "→",
  longrightarrow: "⟶",
  leftarrow: "←",
  leftrightarrow: "↔",
  mapsto: "↦",
  in: "∈",
  notin: "∉",
  ni: "∋",
  subset: "⊂",
  subseteq: "⊆",
  supset: "⊃",
  supseteq: "⊇",
  cup: "∪",
  cap: "∩",
  setminus: "∖",
  emptyset: "∅",
  varnothing: "∅",
  infinity: "∞",
  partial: "∂",
  nabla: "∇",
  forall: "∀",
  exists: "∃",
  neg: "¬",
  land: "∧",
  lor: "∨",
  sum: "∑",
  prod: "∏",
  coprod: "∐",
  int: "∫",
  iint: "∬",
  iiint: "∭",
  oint: "∮",
  sqrt: "√",
  angle: "∠",
  degree: "°",
  prime: "′",
  cdots: "⋯",
  ldots: "…",
  vdots: "⋮",
  ddots: "⋱",
  dots: "…",
  mid: "∣",
  parallel: "∥",
  perp: "⊥",
  triangle: "△",
  therefore: "∴",
  because: "∵",
  nabla: "∇",
  lVert: "‖",
  rVert: "‖",
  langle: "⟨",
  rangle: "⟩",
  lceil: "⌈",
  rceil: "⌉",
  lfloor: "⌊",
  rfloor: "⌋",
  quad: " ",
  qquad: "  ",
});

const TEXT_COMMANDS = new Set([
  "text",
  "textrm",
  "textnormal",
  "textbf",
  "boldsymbol",
  "bm",
  "pmb",
  "symbf",
  "textit",
  "mathrm",
  "mathbf",
  "mathit",
  "mathbb",
  "mathcal",
  "mathsf",
  "mathtt",
  "operatorname",
]);

const FORMAT_COMMANDS = new Set([
  "displaystyle",
  "textstyle",
  "scriptstyle",
  "scriptscriptstyle",
  "limits",
  "nolimits",
  "nonumber",
  "notag",
]);

const ENVIRONMENTS = new Set([
  "matrix",
  "pmatrix",
  "bmatrix",
  "Bmatrix",
  "vmatrix",
  "Vmatrix",
  "cases",
  "array",
  "aligned",
  "align",
  "align*",
  "gather",
  "gather*",
  "equation",
  "equation*",
]);

const FORMULA_SIGNAL = /\\[a-zA-Z]+|(?:[A-Za-z0-9)\]])\s*[\^_]\s*(?:\{[^}]+\}|[A-Za-z0-9(])|[=∫∑∏√≤≥≠≈±×÷∞∂∇]/;

export function normalizeFormulaSource(source) {
  return String(source ?? "")
    .replace(/\r/g, "")
    // AI responses sometimes contain JSON-escaped commands such as \\frac.
    // Collapse only repeated slashes before command names so matrix row breaks remain intact.
    .replace(/\\{2,}(?=[A-Za-z])/g, "\\")
    .replace(/^\s*```(?:latex|tex|math|mathml)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .replace(/^\s*(?:\\\[|\\\(|\$\$|\$)/, "")
    .replace(/(?:\\\]|\\\)|\$\$|\$)\s*$/, "")
    .trim();
}

export function looksLikeFormula(value) {
  return FORMULA_SIGNAL.test(String(value ?? ""));
}

function text(value) {
  return { type: "text", value: String(value ?? "") };
}

function group(children) {
  return { type: "group", children: children ?? [] };
}

function flattenText(nodes) {
  const list = Array.isArray(nodes) ? nodes : nodes ? [nodes] : [];
  return list
    .map((item) => {
      if (!item) return "";
      if (item.type === "text") return item.value;
      if (item.type === "group" || item.type === "styled" || item.type === "accent") {
        return flattenText(item.children);
      }
      if (item.type === "frac") return `${flattenText(item.numerator)} / ${flattenText(item.denominator)}`;
      if (item.type === "sqrt") return `√${flattenText(item.radicand)}`;
      if (item.type === "sup") return `${flattenText(item.base)}${flattenText(item.sup)}`;
      if (item.type === "sub") return `${flattenText(item.base)}${flattenText(item.sub)}`;
      if (item.type === "subsup") return `${flattenText(item.base)}${flattenText(item.sub)}${flattenText(item.sup)}`;
      if (item.type === "matrix") return item.rows.map((row) => row.map(flattenText).join(" ")).join("; ");
      return "";
    })
    .join("");
}

function mergeTextNodes(nodes) {
  const merged = [];
  for (const item of nodes) {
    if (!item) continue;
    const last = merged[merged.length - 1];
    if (last?.type === "text" && item.type === "text") {
      last.value += item.value;
    } else {
      merged.push(item);
    }
  }
  return merged;
}

function splitTopLevel(source, separator) {
  const result = [];
  let start = 0;
  let depth = 0;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") depth = Math.max(depth - 1, 0);
    if (character === separator && depth === 0) {
      result.push(source.slice(start, index));
      start = index + 1;
    }
  }
  result.push(source.slice(start));
  return result;
}

function parseMatrixBody(body) {
  const rows = body
    .split(/(?:\\\\|\\cr)\s*/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => splitTopLevel(row, "&").map((cell) => parseLatexToAst(cell)));
  return { type: "matrix", rows: rows.length ? rows : [[[]]] };
}

export function parseLatexToAst(source) {
  const input = normalizeFormulaSource(source);
  let cursor = 0;

  function skipSpaces() {
    while (cursor < input.length && /\s/.test(input[cursor])) cursor += 1;
  }

  function readCommandName() {
    const start = cursor;
    while (cursor < input.length && /[A-Za-z*]/.test(input[cursor])) cursor += 1;
    return input.slice(start, cursor);
  }

  function readRawGroup() {
    skipSpaces();
    if (input[cursor] !== "{") return "";
    cursor += 1;
    const start = cursor;
    let depth = 1;
    while (cursor < input.length && depth > 0) {
      if (input[cursor] === "\\") {
        cursor += 2;
        continue;
      }
      if (input[cursor] === "{") depth += 1;
      if (input[cursor] === "}") depth -= 1;
      cursor += 1;
    }
    return input.slice(start, Math.max(start, cursor - 1));
  }

  function parseGroup() {
    skipSpaces();
    if (input[cursor] === "{") {
      cursor += 1;
      return parseSequence("}");
    }
    return parseAtomWithScripts(true);
  }

  function parseOptionalBracket() {
    skipSpaces();
    if (input[cursor] !== "[") return null;
    cursor += 1;
    const nodes = parseSequence("]");
    return nodes;
  }

  function parseTextCommand(command) {
    const children = parseGroup();
    const childNodes = Array.isArray(children) ? children : children ? [children] : [];
    if (["mathbf", "textbf", "boldsymbol", "bm", "pmb", "symbf"].includes(command)) {
      return { type: "styled", style: "bold", children: childNodes };
    }
    if (["mathit", "textit"].includes(command)) {
      return { type: "styled", style: "italic", children: childNodes };
    }
    const value = flattenText(children).replace(/\s+/g, " ").trim();
    if (!value) return text("");
    return { type: "styled", style: "text", children: [text(value)] };
  }

  function parseEnvironment(command) {
    const environment = readRawGroup().trim();
    if (!environment) return text("\\begin");
    const endMarker = `\\end{${environment}}`;
    const end = input.indexOf(endMarker, cursor);
    if (end < 0) return text(`\\begin{${environment}}`);
    const body = input.slice(cursor, end);
    cursor = end + endMarker.length;
    if (ENVIRONMENTS.has(environment) && environment !== "equation" && environment !== "equation*") {
      return parseMatrixBody(body);
    }
    return group(parseLatexToAst(body));
  }

  function parseCommand() {
    cursor += 1;
    if (input[cursor] === "\\") {
      cursor += 1;
      return text(" ");
    }
    if (cursor >= input.length) return text("\\");
    if (!/[A-Za-z*]/.test(input[cursor])) {
      const symbol = input[cursor];
      cursor += 1;
      if (symbol === " ") return text(" ");
      return text(symbol);
    }

    const command = readCommandName();
    if (command === "begin") return parseEnvironment(command);
    if (command === "end") {
      readRawGroup();
      return null;
    }
    if (command === "left" || command === "right" || command === "middle") {
      skipSpaces();
      if (cursor < input.length) cursor += 1;
      return null;
    }
    if (FORMAT_COMMANDS.has(command)) return text("");
    if (command === "frac" || command === "dfrac" || command === "tfrac") {
      const numerator = parseGroup();
      const denominator = parseGroup();
      return { type: "frac", numerator, denominator };
    }
    if (command === "binom") {
      return { type: "binom", numerator: parseGroup(), denominator: parseGroup() };
    }
    if (command === "sqrt") {
      return { type: "sqrt", degree: parseOptionalBracket(), radicand: parseGroup() };
    }
    if (TEXT_COMMANDS.has(command)) return parseTextCommand(command);
    if (command === "overline" || command === "bar" || command === "underline" || command === "hat" || command === "vec" || command === "tilde") {
      return { type: "accent", accent: command, children: parseGroup() };
    }
    if (command === "color" || command === "textcolor") {
      if (command === "textcolor") parseGroup();
      else parseGroup();
      return parseGroup();
    }
    if (command === "pmod") return { type: "styled", style: "text", children: [text(`(mod ${flattenText(parseGroup())})`)] };
    if (command === "not") {
      const next = parseAtomWithScripts(true);
      return { type: "styled", style: "not", children: [next ?? text("")] };
    }
    if (COMMAND_SYMBOLS[command]) return text(COMMAND_SYMBOLS[command]);
    if (["log", "ln", "exp", "sin", "cos", "tan", "cot", "sec", "csc", "lim", "max", "min", "det", "gcd", "Pr", "arg", "Re", "Im"].includes(command)) {
      return { type: "styled", style: "operator", children: [text(command)] };
    }
    return text(command);
  }

  function parseAtom(atomic = false) {
    skipSpaces();
    if (cursor >= input.length) return null;
    const character = input[cursor];
    if (character === "{") return group(parseGroup());
    if (character === "\\") return parseCommand();
    if (character === "}") return null;
    if (character === "&") {
      cursor += 1;
      return text(" ");
    }
    if (character === "\n") {
      cursor += 1;
      return text(" ");
    }
    if (atomic) {
      cursor += 1;
      return text(character);
    }
    if (/[A-Za-z0-9]/.test(character)) {
      cursor += 1;
      return text(character);
    }
    const start = cursor;
    while (cursor < input.length && !/[\\{}^_&\nA-Za-z0-9]/.test(input[cursor])) cursor += 1;
    return text(input.slice(start, cursor));
  }

  function parseAtomWithScripts(atomic = false) {
    const atom = parseAtom(atomic);
    if (!atom) return null;
    let sub = null;
    let sup = null;
    while (true) {
      skipSpaces();
      const marker = input[cursor];
      if (marker !== "^" && marker !== "_") break;
      cursor += 1;
      const argument = parseGroup();
      const argumentNodes = Array.isArray(argument) ? argument : argument ? [argument] : [];
      if (marker === "^") sup = argumentNodes;
      else sub = argumentNodes;
    }
    if (sub && sup) return { type: "subsup", base: atom, sub, sup };
    if (sub) return { type: "sub", base: atom, sub };
    if (sup) return { type: "sup", base: atom, sup };
    return atom;
  }

  function parseSequence(stopCharacter = null) {
    const nodes = [];
    while (cursor < input.length) {
      if (stopCharacter && input[cursor] === stopCharacter) {
        cursor += 1;
        break;
      }
      if (input[cursor] === "}") {
        if (stopCharacter) cursor += 1;
        break;
      }
      const atom = parseAtomWithScripts();
      if (atom) nodes.push(atom);
      else if (cursor < input.length && input[cursor] !== stopCharacter) cursor += 1;
    }
    return mergeTextNodes(nodes);
  }

  return parseSequence();
}

function decodeXmlText(value) {
  return String(value ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)));
}

export function parseMathMLToAst(source) {
  const tokenPattern = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|[^<]+/g;
  const tokens = String(source ?? "").match(tokenPattern) ?? [];
  let index = 0;

  function tagName(token) {
    return token.match(/^<\/?\s*([A-Za-z][\w:-]*)/)?.[1].toLowerCase() ?? "";
  }

  function parseNode() {
    while (index < tokens.length && /^<!--/.test(tokens[index])) index += 1;
    const token = tokens[index];
    if (!token) return null;
    if (!token.startsWith("<")) {
      index += 1;
      const value = decodeXmlText(token).replace(/\s+/g, " ");
      return value.trim() ? text(value) : null;
    }
    if (/^<\//.test(token)) {
      index += 1;
      return null;
    }
    index += 1;
    const name = tagName(token);
    const selfClosing = /\/\s*>$/.test(token);
    const children = [];
    if (!selfClosing) {
      while (index < tokens.length && !new RegExp(`^<\\/\\s*${name}\\s*>$`, "i").test(tokens[index])) {
        const child = parseNode();
        if (child) children.push(child);
      }
      if (index < tokens.length) index += 1;
    }
    const compact = children.length === 1 ? children[0] : group(children);
    if (name === "mfrac") return { type: "frac", numerator: children[0] ? [children[0]] : [], denominator: children[1] ? [children[1]] : [] };
    if (name === "msqrt") return { type: "sqrt", degree: null, radicand: children };
    if (name === "mroot") return { type: "sqrt", degree: children[1] ? [children[1]] : null, radicand: children[0] ? [children[0]] : [] };
    if (name === "msup") return { type: "sup", base: children[0] ? children[0] : text(""), sup: children[1] ? [children[1]] : [] };
    if (name === "msub") return { type: "sub", base: children[0] ? children[0] : text(""), sub: children[1] ? [children[1]] : [] };
    if (name === "msubsup") return { type: "subsup", base: children[0] ? children[0] : text(""), sub: children[1] ? [children[1]] : [], sup: children[2] ? [children[2]] : [] };
    if (name === "mover") return { type: "accent", accent: "over", children: children[0] ? [children[0]] : [] };
    if (name === "munder") return { type: "sub", base: children[0] ? children[0] : text(""), sub: children[1] ? [children[1]] : [] };
    if (name === "munderover") return { type: "subsup", base: children[0] ? children[0] : text(""), sub: children[1] ? [children[1]] : [], sup: children[2] ? [children[2]] : [] };
    if (name === "mtable") return { type: "matrix", rows: children.filter((item) => item?.type === "matrixRow").map((item) => item.cells) };
    if (name === "mtr") return { type: "matrixRow", cells: children.filter((item) => item?.type === "matrixCell").map((item) => item.children) };
    if (name === "mtd") return { type: "matrixCell", children };
    if (name === "mfenced") {
      const open = token.match(/\bopen\s*=\s*["']([^"']*)["']/i)?.[1] ?? "(";
      const close = token.match(/\bclose\s*=\s*["']([^"']*)["']/i)?.[1] ?? ")";
      return group([text(open), ...children, text(close)]);
    }
    if (["math", "mathml", "mrow", "semantics", "annotation", "annotation-xml"].includes(name)) return compact;
    return compact;
  }

  const nodes = [];
  while (index < tokens.length) {
    const parsed = parseNode();
    if (parsed) nodes.push(parsed);
  }
  return mergeTextNodes(nodes);
}

export function astToPlainText(nodes) {
  return flattenText(nodes);
}

function isFormulaMatch(match) {
  return match.kind === "latex" || match.kind === "mathml";
}

function collectFormulaMatches(source) {
  const patterns = [
    { kind: "fenced", regex: /```\s*([\w+-]*)?\s*\n?([\s\S]*?)```/gi },
    { kind: "mathml", regex: /<(?:math|mathml)\b[\s\S]*?<\/(?:math|mathml)>/gi },
    { kind: "latex", regex: /\\begin\{(?:matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|cases|array|aligned|align\*?|gather\*?|equation\*?)\}[\s\S]*?\\end\{(?:matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|cases|array|aligned|align\*?|gather\*?|equation\*?)\}/gi },
    { kind: "latex", regex: /\\\[[\s\S]*?\\\]/g },
    { kind: "latex", regex: /\\\([\s\S]*?\\\)/g },
    { kind: "latex", regex: /\$\$[\s\S]*?\$\$/g },
    { kind: "latex", regex: /\$[^\n$]+?\$/g },
  ];
  const matches = [];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern.regex)) {
      matches.push({ kind: pattern.kind, index: match.index ?? 0, end: (match.index ?? 0) + match[0].length, match });
    }
  }
  matches.sort((left, right) => left.index - right.index || right.end - left.end);
  const filtered = [];
  for (const candidate of matches) {
    if (filtered.every((item) => candidate.index >= item.end || candidate.end <= item.index)) filtered.push(candidate);
  }
  return filtered.sort((left, right) => left.index - right.index);
}

function addTextItem(items, value, mode) {
  if (mode === "formula-only" || !value) return;
  items.push({ type: "text", text: value });
}

function formulaItem(source, format, inline = false) {
  const raw = String(source ?? "").trim();
  const ast = format === "MathML" ? parseMathMLToAst(raw) : parseLatexToAst(raw);
  return {
    type: "formula",
    format,
    source: raw,
    ast,
    inline,
  };
}

export function parseContent(source, mode = "auto") {
  const input = String(source ?? "").replace(/\r/g, "");
  if (!input.trim()) return [];
  if (mode === "raw") return [{ type: "text", text: input }];

  const matches = collectFormulaMatches(input);
  const items = [];
  let cursor = 0;
  for (const found of matches) {
    addTextItem(items, input.slice(cursor, found.index), mode);
    const match = found.match;
    if (found.kind === "fenced") {
      const language = (match[1] ?? "").toLowerCase();
      const body = match[2] ?? "";
      if (looksLikeFormula(body) || ["latex", "tex", "math", "mathml"].includes(language)) {
        items.push(formulaItem(body, language === "mathml" ? "MathML" : "LaTeX"));
      } else if (mode !== "formula-only") {
        items.push({ type: "code", language: language || "text", text: body.trim() });
      }
    } else if (found.kind === "mathml") {
      items.push(formulaItem(match[0], "MathML", !/^\s*</.test(match[0])));
    } else {
      let formula = match[0];
      const isInline = /^\s*(?:\$[^$]|\\\()/.test(formula) && !/^\s*(?:\$\$|\\\[)/.test(formula);
      items.push(formulaItem(formula, "LaTeX", isInline));
    }
    cursor = found.end;
  }
  addTextItem(items, input.slice(cursor), mode);

  if (!matches.length) {
    const lines = input.split("\n");
    if (lines.some((line) => looksLikeFormula(line))) {
      return lines.flatMap((line) => {
        if (looksLikeFormula(line.trim())) return [formulaItem(line, "LaTeX")];
        return mode === "formula-only" || !line ? [] : [{ type: "text", text: line }];
      });
    }
  }
  return items.filter((item) => item.type !== "text" || item.text.trim());
}
