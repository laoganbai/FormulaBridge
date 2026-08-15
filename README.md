# FormulaBridge

FormulaBridge 是一个面向个人使用的本地公式解析工具。它可以识别 AI 回答中的 LaTeX、MathML 和公式代码块，将公式整理成可预览的内容，并导出为可继续编辑的 Word 文档。

## 主要功能

- 自动识别混合文本中的 LaTeX、MathML 和公式代码块。
- 支持 `$...$`、`$$...$$`、`\(...\)`、`\[...\]` 等常见公式写法。
- 支持 `latex`、`tex`、`math`、`mathml` 代码围栏。
- 支持分式、根式、上下标、希腊字母、求和、积分、矩阵和常见字体样式。
- 公式预览、缩放、单个公式选择和源代码复制。
- 支持导入 `.txt`、`.md`、`.markdown`、`.tex`、`.html` 和 `.htm` 文件。
- 导出为 `.docx`，公式会写入 Word 数学对象，打开后可以继续编辑。
- 可选择是否在 Word 公式下方保留原始公式代码。
- 全部解析在本机完成，不需要登录，也不上传输入内容。

## 直接使用 Windows 版本

双击：

```text
FormulaWorkbench.exe
```

桌面版不需要手动启动本地服务器，也不需要安装 Node.js 或 Python。首次运行需要 Windows 中安装 Microsoft Edge WebView2 Runtime；如果程序窗口空白，请先安装该运行环境后再启动。

基本使用流程：

1. 将 AI 生成的回答粘贴到输入框，或导入文本文件。
2. 点击解析结果中的公式，可以在右侧查看并复制原始代码。
3. 设置文档标题、导出文件名和是否保留源代码。
4. 点击“导出 Word”，选择保存位置。

## 输入示例

将下面内容粘贴到输入框即可测试：

~~~text
一元二次方程的求根公式：
$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

矩阵示例：
\[
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\]
~~~

也可以使用 MathML：

~~~html
<math>
  <mfrac>
    <mi>a</mi>
    <mi>b</mi>
  </mfrac>
</math>
~~~

## 解析模式

- **自动识别**：保留普通文本、代码块和识别到的公式。
- **仅公式**：只保留可识别的公式内容。
- **原始文本**：不解析，按原文导出。

## 从源码运行

### 环境要求

- Windows 10/11
- Python 3.12 或更高版本（仅运行桌面源码或重新打包时需要）
- Node.js（仅浏览器开发模式需要）

### 运行浏览器开发模式

在项目根目录打开 PowerShell：

```powershell
npm install
npm start
```

然后访问：

```text
http://127.0.0.1:4173/
```

浏览器开发模式需要本地服务器，因为它使用服务器端 Word 导出接口。正常使用已经打包好的 Windows 版本时不需要启动服务器。

### 运行桌面源码

```powershell
python -m pip install -r requirements-desktop.txt
python desktop.py
```

### 重新打包单文件 EXE

```powershell
powershell -ExecutionPolicy Bypass -File .\build-desktop.ps1
```

打包完成后，文件位于：

```text
outputs/FormulaWorkbench.exe
```

构建脚本会自动安装 `pywebview`、`pyinstaller` 和 `python-docx`，并将 `public` 目录一起打包到 EXE 中。

## 项目结构

```text
formula-core.mjs       公式识别和 AST 解析核心
public/                前端界面、预览和交互逻辑
desktop.py             Windows 桌面入口和 Word 导出桥接
server.mjs             浏览器开发模式服务器和 Word 导出接口
build-desktop.ps1      Windows 单文件 EXE 打包脚本
requirements-desktop.txt
                       桌面版 Python 依赖
package.json           Node.js 开发模式配置
outputs/               已生成的 EXE 文件
```

## 说明

这是一个面向个人使用的轻量工具，解析器覆盖常见 AI 公式格式，但不是完整的 TeX 排版引擎。遇到不支持的 LaTeX 命令时，建议先在预览中检查结果，再导出 Word。

## License

本项目用于个人本地使用。依赖库的许可证以各自项目声明为准。

