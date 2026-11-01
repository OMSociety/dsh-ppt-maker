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

## 技能与语料

`skills/ppt-maker/` 与 `tests/corpus/` 是本项目的自有内容；语料已脱敏，不含来源机构的专名与真实人名，
生成与复查办法见 `scripts/desensitize-corpus.mjs`。
