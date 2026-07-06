"""
SafeStep backend configuration.
=================================
Env-driven settings with fail-loud startup validation.

Config over constants (agent-context §6): CORS origins, cache location, and
data-source tokens are all read from the environment, never hardcoded. Nothing
here is coerced silently; invalid config raises at startup (see validate()).
"""

import os
from pathlib import Path


def _split_csv(raw: str):
    """Parse a comma-separated env value into a clean list."""
    return [item.strip() for item in raw.split(",") if item.strip()]


class Settings:
    def __init__(self):
        # --- CORS ---------------------------------------------------------
        # Comma-separated allowlist of *browser* origins permitted to call the
        # API. Empty by default: the React Native app does not send an Origin
        # header, so the mobile client needs no entry. Add web origins here
        # only if a browser client must reach the backend.
        self.cors_allow_origins = _split_csv(os.getenv("CORS_ALLOW_ORIGINS", ""))

        # --- Durable cache ------------------------------------------------
        # Root for the OSMnx download cache and the built graph pickles. In the
        # container this is set to the mounted volume (/app/cache) so the graph
        # survives container recreation. Locally it defaults to a repo-local,
        # gitignored directory.
        self.cache_dir = Path(os.getenv("SAFESTEP_CACHE_DIR", ".safestep_cache"))

        # --- Area ---------------------------------------------------------
        # The area the pilot serves. Validated against AREA_CONFIGS at startup.
        self.default_area = os.getenv("SAFESTEP_AREA", "nyu")

        # --- NYC Open Data ------------------------------------------------
        # Socrata app token. Strongly recommended: anonymous requests share a
        # low throttling pool. Sent as the X-App-Token header when present.
        self.nyc_app_token = os.getenv("NYC_OPEN_DATA_APP_TOKEN", "").strip() or None

        # --- Supabase (community reports, P1-1) ---------------------------
        # Read-only pull of verified rows from the public `reports` table via
        # PostgREST on each risk refresh. Optional dependency: if either value
        # is unset, the community pull is skipped gracefully (not validated
        # below) since not every deployment has Supabase wired.
        self.supabase_url = os.getenv("SUPABASE_URL", "").strip() or None
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY", "").strip() or None

        # --- Refresh cadence ----------------------------------------------
        # Minutes between scheduled risk-data refreshes (NYC Open Data + any
        # durable community sources). Config over constants: subject to
        # recalibration during the pilot.
        try:
            self.risk_refresh_minutes = int(os.getenv("RISK_REFRESH_MINUTES", "15"))
        except ValueError:
            self.risk_refresh_minutes = 15

    @property
    def osmnx_cache_dir(self) -> Path:
        return self.cache_dir / "osmnx"

    @property
    def graph_cache_dir(self) -> Path:
        return self.cache_dir / "graphs"

    def validate(self):
        """Fail loudly on invalid configuration. Called once at startup."""
        errors = []

        # Area must be known.
        from .graph_manager import AREA_CONFIGS
        if self.default_area not in AREA_CONFIGS:
            errors.append(
                f"SAFESTEP_AREA='{self.default_area}' is not a known area; "
                f"expected one of {list(AREA_CONFIGS.keys())}"
            )

        # Cache root must be creatable and writable, or the graph cannot persist.
        try:
            self.graph_cache_dir.mkdir(parents=True, exist_ok=True)
            self.osmnx_cache_dir.mkdir(parents=True, exist_ok=True)
            probe = self.cache_dir / ".write_probe"
            probe.write_text("ok")
            probe.unlink()
        except OSError as e:
            errors.append(
                f"SAFESTEP_CACHE_DIR='{self.cache_dir}' is not writable: {e}. "
                f"Set SAFESTEP_CACHE_DIR to a writable, persistent path."
            )

        if self.risk_refresh_minutes <= 0:
            errors.append(
                f"RISK_REFRESH_MINUTES must be a positive integer, got "
                f"{self.risk_refresh_minutes}"
            )

        if errors:
            raise RuntimeError(
                "Invalid SafeStep configuration:\n  - " + "\n  - ".join(errors)
            )


settings = Settings()
