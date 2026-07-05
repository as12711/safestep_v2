"""API smoke/integration tests for the FastAPI app.

Importing routing.api pulls safe_router -> graph_manager -> osmnx, so this whole
module is skipped when the heavy geospatial deps are absent (local light unit
run). CI installs the full requirements and actually runs these.

These are kept hermetic: we build the TestClient WITHOUT its context-manager
form, so the app's lifespan (settings.validate() + a heavy graph-building
warmup task) never fires. That leaves the router uninitialized, which lets us
assert the documented "400 before init" routing contract and exercise the
read-only health/metadata endpoints without any network or graph build.

End-to-end tests that initialize an area and route for real belong at the
CI/integration level (they need OSM downloads and a built graph); they are out
of scope here.
"""

import pytest

# Skip the entire module unless the heavy deps are importable.
pytest.importorskip("osmnx")
pytest.importorskip("fastapi")

from fastapi.testclient import TestClient  # noqa: E402

from routing.api import app, router_state  # noqa: E402


@pytest.fixture
def client():
    # Plain instantiation (not `with TestClient(app) as c`) so lifespan startup
    # (validate + warmup graph build) does not run. Ensure uninitialized state.
    router_state["initialized"] = False
    router_state["area_id"] = None
    return TestClient(app)


class TestHealthEndpoints:
    def test_health_returns_200_with_expected_keys(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "healthy"
        assert "router" in body
        assert "risk_service" in body
        assert "incidents_loaded" in body["risk_service"]
        assert "grid_cells" in body["risk_service"]

    def test_root_reports_router_not_ready_before_init(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        body = resp.json()
        assert body["service"] == "SafeStep Routing API"
        assert body["router_ready"] is False

    def test_areas_lists_configured_areas(self, client):
        resp = client.get("/areas")
        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body["areas"], list)
        assert len(body["areas"]) > 0


class TestRoutingBeforeInit:
    ROUTE_BODY = {
        "origin": {"lat": 40.7300, "lng": -73.9950},
        "destination": {"lat": 40.7310, "lng": -73.9960},
    }

    def test_route_app_returns_400_before_init(self, client):
        resp = client.post("/route/app", json=self.ROUTE_BODY)
        assert resp.status_code == 400
        assert "not initialized" in resp.json()["detail"].lower()

    def test_route_returns_400_before_init(self, client):
        resp = client.post("/route", json=self.ROUTE_BODY)
        assert resp.status_code == 400
        assert "not initialized" in resp.json()["detail"].lower()

    def test_incident_returns_400_before_init(self, client):
        resp = client.post(
            "/incident",
            json={"lat": 40.73, "lng": -73.99, "type": "assault", "severity": 0.6},
        )
        assert resp.status_code == 400

    def test_refresh_risks_returns_400_before_init(self, client):
        resp = client.post("/refresh-risks")
        assert resp.status_code == 400
