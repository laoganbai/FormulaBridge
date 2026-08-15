const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("formulaDesktop", {
  exportDocx: (payload) => ipcRenderer.invoke("export-docx", payload),
});
