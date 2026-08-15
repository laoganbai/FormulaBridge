$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $python) {
  throw "未找到 python，请先安装 Python 3.12+。"
}

Set-Location $projectRoot
& $python -m pip install -r requirements-desktop.txt
& $python -m PyInstaller --noconfirm --clean --onefile --windowed --name FormulaWorkbench --add-data "public;public" desktop.py
New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot "outputs") | Out-Null
Copy-Item -Force (Join-Path $projectRoot "dist\FormulaWorkbench.exe") (Join-Path $projectRoot "outputs\FormulaWorkbench.exe")
Write-Host "生成完成: outputs\FormulaWorkbench.exe"
