import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { basename, join } from "node:path";
import { writeFile } from "node:fs/promises";

let createDocx;

function safeName(value) {
  const cleaned = String(value || "公式解析结果")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned || "公式解析结果";
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: "#f2f5f1",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(app.getAppPath(), "electron", "preload.cjs"),
    },
  });
  window.loadFile(join(app.getAppPath(), "public", "index.html"));
}

app.whenReady().then(async () => {
  process.env.FORMULA_SERVER = "disabled";
  process.env.FORMULA_ROOT = app.getAppPath();
  ({ createDocx } = await import("../server.mjs"));

  ipcMain.handle("export-docx", async (_event, payload) => {
    const fileName = `${safeName(payload?.fileName || payload?.title)}.docx`;
    const result = await dialog.showSaveDialog({
      title: "保存 Word 文档",
      defaultPath: join(app.getPath("documents"), fileName),
      filters: [{ name: "Word 文档", extensions: ["docx"] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const buffer = await createDocx(payload || {});
    await writeFile(result.filePath, buffer);
    return { canceled: false, filePath: basename(result.filePath) };
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
