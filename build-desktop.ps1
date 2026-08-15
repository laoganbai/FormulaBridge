$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $python) {
  throw "Python was not found. Install Python 3.12 or newer first."
}

Set-Location $projectRoot
& $python -m pip install -r requirements-desktop.txt
& $python -m PyInstaller --noconfirm --clean --onefile --windowed --name FormulaWorkbench --add-data "public;public" desktop.py
New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot "outputs") | Out-Null
Copy-Item -Force (Join-Path $projectRoot "dist\FormulaWorkbench.exe") (Join-Path $projectRoot "outputs\FormulaWorkbench.exe")
Write-Host "Build complete: outputs\FormulaWorkbench.exe"
