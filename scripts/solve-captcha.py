#!/usr/bin/env python3
"""Read captcha PNG bytes from stdin; print lowercase code to stdout."""
import sys

import ddddocr

ocr = ddddocr.DdddOcr(show_ad=False)
data = sys.stdin.buffer.read()
if not data:
    sys.exit(1)
code = ocr.classification(data).strip().lower()
print(code)
