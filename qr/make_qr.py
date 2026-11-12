"""Make the QR code for the vehicle once the Netlify URL is known.

    pip install "qrcode[pil]"
    python qr/make_qr.py https://YOUR-SITE.netlify.app/s/V1
"""
import sys
from pathlib import Path

import qrcode

if len(sys.argv) != 2:
    sys.exit(__doc__)

url = sys.argv[1]
out = Path(__file__).with_name("vehicle-V1.png")
qrcode.make(url, box_size=12, border=4).save(out)
print(f"Saved {out} -> {url}")
