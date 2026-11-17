# 第三方声明

`lib/index.js` 是把 `src/` 与部分运行时依赖一起打包成的单文件，随包分发（`dsh plugin add` 只安装不构建）。
下面列出被**内联进该产物**的第三方代码及其许可；其余依赖作为普通 npm 依赖安装，各自带许可文件，不在本文件重复。

## 内联进 lib/index.js

### yaml

ISC 许可，Copyright Eemeli Aro <eemeli@gmail.com>。

```
Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

### fflate

MIT 许可，Copyright (c) 2026 Arjun Barrett。

### @xmldom/xmldom

MIT 许可，Copyright 2019 - present Christopher J. Brody and other contributors，
Copyright 2012 - 2017 @jindw <jindw@xidea.org> and other contributors。

MIT 许可正文（上述两个 MIT 组件同文）：

```
Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 作为普通依赖安装（未内联）

`@office-kit/pptx`（MIT）、`@office-kit/pptx-preview`、`@deepseek-ai/libreoffice-kit`（MPL-2.0）、
`@deepseek-ai/dsh-native-command`、`fontkit`（MIT）、`subset-font`（BSD-3-Clause）。

## Vendored：ppt-master SVG → DrawingML 转换器

`skills/ppt-maker/vendor/ppt-master/` 收录自 [ppt-master](https://github.com/hugohe3/ppt-master)
（commit `7e0df6705de0cd24345210d31f07fcb5a32b6900`）的 SVG → 原生 DrawingML PPTX 转换器，
MIT 许可，**Copyright (c) 2025-2026 Hugo He**。许可全文见该目录下的 `LICENSE`；
版权头在各源文件中原样保留。

收录范围为 `svg_to_pptx.pptx_package.builder` 的 import 闭包；上游的署名完整性校验
（`attribution_guard.py`、`console_encoding.py` 中的分发身份校验）不在本副本内。
MIT 许可条款（含 `LICENSE` 中的版权声明）按要求完整保留。

该目录 `pptx_shapes/data/` 下的数据文件带各自许可：Apache-2.0 与 MIT
（见同目录 `LICENSE-APACHE-2.0.txt`、`LICENSE-OPEN-XML-SDK-MIT.txt`、`NOTICE.md`）。

Python 侧依赖（`python-pptx`、`XlsxWriter`、`skia-pathops`、`uharfbuzz`、`lxml`、`Pillow`）
由 `scripts/prepare-vendor-env.mjs` 按 `skills/ppt-maker/vendor/requirements.txt` 的 pin 版本
安装到本地虚拟环境，作为普通依赖各自带许可文件，不随本包分发。

## 技能与语料

`skills/ppt-maker/` 与 `tests/corpus/` 是本项目的自有内容；语料已脱敏，不含来源机构的专名与真实人名，
生成与复查办法见 `scripts/desensitize-corpus.mjs`。
