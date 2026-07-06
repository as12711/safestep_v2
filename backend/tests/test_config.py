"""Unit tests for Settings env parsing and validate() in config.py.

config.py imports only stdlib at module top, so these run in the light unit
environment. validate() does `from .graph_manager import AREA_CONFIGS` *inside*
the function, and graph_manager imports osmnx at module top. To exercise the
validate() branches without osmnx, we inject a fake `routing.graph_manager`
module into sys.modules (see fake_graph_manager fixture).
"""

import sys
import types
from pathlib import Path

import pytest

from routing.config import Settings, _split_csv


# =========================================
# _split_csv
# =========================================

class TestSplitCsv:
    def test_trims_whitespace(self):
        assert _split_csv("a.com, b.com , c.com") == ["a.com", "b.com", "c.com"]

    def test_drops_empty_items(self):
        assert _split_csv("a.com,,b.com, ,c.com") == ["a.com", "b.com", "c.com"]

    def test_empty_string_yields_empty_list(self):
        assert _split_csv("") == []


# =========================================
# CORS parsing
# =========================================

class TestCorsParsing:
    def test_default_is_empty_list(self, monkeypatch):
        monkeypatch.delenv("CORS_ALLOW_ORIGINS", raising=False)
        assert Settings().cors_allow_origins == []

    def test_parses_and_trims_csv(self, monkeypatch):
        monkeypatch.setenv("CORS_ALLOW_ORIGINS", " https://a.com , https://b.com ,, ")
        assert Settings().cors_allow_origins == ["https://a.com", "https://b.com"]


# =========================================
# Cache dir resolution
# =========================================

class TestCacheDir:
    def test_default_cache_dir(self, monkeypatch):
        monkeypatch.delenv("SAFESTEP_CACHE_DIR", raising=False)
        s = Settings()
        assert s.cache_dir == Path(".safestep_cache")

    def test_env_override(self, monkeypatch):
        monkeypatch.setenv("SAFESTEP_CACHE_DIR", "/var/data/safestep")
        assert Settings().cache_dir == Path("/var/data/safestep")

    def test_derived_subdirs(self, monkeypatch):
        monkeypatch.setenv("SAFESTEP_CACHE_DIR", "/var/data/safestep")
        s = Settings()
        assert s.osmnx_cache_dir == Path("/var/data/safestep/osmnx")
        assert s.graph_cache_dir == Path("/var/data/safestep/graphs")


# =========================================
# default_area and refresh cadence
# =========================================

class TestAreaAndRefresh:
    def test_default_area(self, monkeypatch):
        monkeypatch.delenv("SAFESTEP_AREA", raising=False)
        assert Settings().default_area == "nyu"

    def test_area_override(self, monkeypatch):
        monkeypatch.setenv("SAFESTEP_AREA", "manhattan")
        assert Settings().default_area == "manhattan"

    def test_refresh_default(self, monkeypatch):
        monkeypatch.delenv("RISK_REFRESH_MINUTES", raising=False)
        assert Settings().risk_refresh_minutes == 15

    def test_refresh_valid_override(self, monkeypatch):
        monkeypatch.setenv("RISK_REFRESH_MINUTES", "30")
        assert Settings().risk_refresh_minutes == 30

    def test_refresh_invalid_falls_back_to_default(self, monkeypatch):
        monkeypatch.setenv("RISK_REFRESH_MINUTES", "not-a-number")
        assert Settings().risk_refresh_minutes == 15

    def test_refresh_negative_is_parsed_but_kept(self, monkeypatch):
        # Parsing keeps the value; validate() is what rejects it (tested below).
        monkeypatch.setenv("RISK_REFRESH_MINUTES", "-5")
        assert Settings().risk_refresh_minutes == -5


# =========================================
# nyc_app_token
# =========================================

class TestNycToken:
    def test_default_is_none(self, monkeypatch):
        monkeypatch.delenv("NYC_OPEN_DATA_APP_TOKEN", raising=False)
        assert Settings().nyc_app_token is None

    def test_whitespace_only_is_none(self, monkeypatch):
        monkeypatch.setenv("NYC_OPEN_DATA_APP_TOKEN", "   ")
        assert Settings().nyc_app_token is None

    def test_set_token_trimmed(self, monkeypatch):
        monkeypatch.setenv("NYC_OPEN_DATA_APP_TOKEN", "  tok123  ")
        assert Settings().nyc_app_token == "tok123"


# =========================================
# Supabase (P1-1 community-report pull) -- optional, not required by validate()
# =========================================

class TestSupabaseSettings:
    def test_url_and_key_default_to_none(self, monkeypatch):
        monkeypatch.delenv("SUPABASE_URL", raising=False)
        monkeypatch.delenv("SUPABASE_ANON_KEY", raising=False)
        s = Settings()
        assert s.supabase_url is None
        assert s.supabase_key is None

    def test_parse_from_env(self, monkeypatch):
        monkeypatch.setenv("SUPABASE_URL", "https://proj.supabase.co")
        monkeypatch.setenv("SUPABASE_ANON_KEY", "anon-key-123")
        s = Settings()
        assert s.supabase_url == "https://proj.supabase.co"
        assert s.supabase_key == "anon-key-123"

    def test_whitespace_only_is_none(self, monkeypatch):
        monkeypatch.setenv("SUPABASE_URL", "   ")
        monkeypatch.setenv("SUPABASE_ANON_KEY", "  ")
        s = Settings()
        assert s.supabase_url is None
        assert s.supabase_key is None

    def test_values_trimmed(self, monkeypatch):
        monkeypatch.setenv("SUPABASE_URL", "  https://proj.supabase.co  ")
        monkeypatch.setenv("SUPABASE_ANON_KEY", "  anon-key-123  ")
        s = Settings()
        assert s.supabase_url == "https://proj.supabase.co"
        assert s.supabase_key == "anon-key-123"

    def test_not_required_by_validate(self, monkeypatch, tmp_path, fake_graph_manager):
        # Supabase is an optional dependency: validate() must pass with it unset.
        monkeypatch.delenv("SUPABASE_URL", raising=False)
        monkeypatch.delenv("SUPABASE_ANON_KEY", raising=False)
        monkeypatch.setenv("SAFESTEP_CACHE_DIR", str(tmp_path))
        monkeypatch.setenv("SAFESTEP_AREA", "nyu")
        Settings().validate()  # should not raise


# =========================================
# validate() -- with a fake graph_manager so no osmnx import is needed
# =========================================

@pytest.fixture
def fake_graph_manager(monkeypatch):
    """Inject a fake routing.graph_manager exposing AREA_CONFIGS, so validate()
    can resolve `from .graph_manager import AREA_CONFIGS` without pulling osmnx."""
    fake = types.ModuleType("routing.graph_manager")
    fake.AREA_CONFIGS = {"nyu": {"bounds": None}, "manhattan": {"bounds": None}}
    monkeypatch.setitem(sys.modules, "routing.graph_manager", fake)
    return fake


class TestValidate:
    def test_valid_config_passes(self, monkeypatch, tmp_path, fake_graph_manager):
        monkeypatch.setenv("SAFESTEP_CACHE_DIR", str(tmp_path))
        monkeypatch.setenv("SAFESTEP_AREA", "nyu")
        monkeypatch.setenv("RISK_REFRESH_MINUTES", "15")
        Settings().validate()  # should not raise

    def test_unknown_area_raises(self, monkeypatch, tmp_path, fake_graph_manager):
        monkeypatch.setenv("SAFESTEP_CACHE_DIR", str(tmp_path))
        monkeypatch.setenv("SAFESTEP_AREA", "atlantis")
        with pytest.raises(RuntimeError, match="atlantis"):
            Settings().validate()

    def test_non_positive_refresh_raises(self, monkeypatch, tmp_path, fake_graph_manager):
        monkeypatch.setenv("SAFESTEP_CACHE_DIR", str(tmp_path))
        monkeypatch.setenv("SAFESTEP_AREA", "nyu")
        monkeypatch.setenv("RISK_REFRESH_MINUTES", "0")
        with pytest.raises(RuntimeError, match="RISK_REFRESH_MINUTES"):
            Settings().validate()

    def test_creates_cache_subdirs(self, monkeypatch, tmp_path, fake_graph_manager):
        monkeypatch.setenv("SAFESTEP_CACHE_DIR", str(tmp_path / "nested"))
        monkeypatch.setenv("SAFESTEP_AREA", "nyu")
        s = Settings()
        s.validate()
        assert s.graph_cache_dir.is_dir()
        assert s.osmnx_cache_dir.is_dir()
