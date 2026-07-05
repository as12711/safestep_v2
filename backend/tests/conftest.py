"""Shared test setup.

Puts the backend directory (the parent of routing/) on sys.path so the tests
import the package as `routing.*` regardless of pytest's rootdir. The heavy
geospatial deps (osmnx/geopandas) are NOT imported here; only tests that need
them import them, guarded with pytest.importorskip.
"""

import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
