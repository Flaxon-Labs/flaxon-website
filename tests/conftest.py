from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
FRAMEWORK_SRC = ROOT.parent / "Flaxon-Backend-Framework-main" / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))
if str(FRAMEWORK_SRC) not in sys.path:
    sys.path.insert(0, str(FRAMEWORK_SRC))
