"""Flask app smoke tests for upload, compare, and cached report rendering."""

import sys
from pathlib import Path
from unittest.mock import patch

import pytest

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "src"))

import app as webapp


@pytest.fixture
def client():
    """Provide a Flask test client with an isolated session store."""
    webapp._sessions.clear()
    webapp.app.config["TESTING"] = True
    with webapp.app.test_client() as test_client:
        yield test_client
    webapp._sessions.clear()


@pytest.fixture
def fixture_paths():
    """Return paths to committed sample STEP fixtures."""
    fixtures = ROOT / "tests" / "fixtures"
    return fixtures / "sample_a.stp", fixtures / "sample_b.stp"


def test_index_returns_upload_page(client):
    """GET / should return the localized upload form."""
    response = client.get("/?lang=en")
    assert response.status_code == 200
    assert b"STEP Tree Comparator" in response.data


def test_healthz_returns_ok(client):
    """GET /healthz should return plain-text OK status for probes."""
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.mimetype == "text/plain"
    assert response.data == b"ok"


def test_compare_caches_trees_and_report_reuses_them(client, fixture_paths):
    """POST /compare should parse once; GET /report should not call parse_step again."""
    path_a, path_b = fixture_paths
    with path_a.open("rb") as fa, path_b.open("rb") as fb:
        with patch.object(webapp, "parse_step", wraps=webapp.parse_step) as parse_mock:
            response = client.post(
                "/compare",
                data={
                    "file_a": (fa, "sample_a.stp"),
                    "file_b": (fb, "sample_b.stp"),
                    "volume_tol": "0.5",
                    "com_tol": "0.1",
                    "lang": "en",
                },
                content_type="multipart/form-data",
                follow_redirects=False,
            )

    assert response.status_code == 303
    assert len(webapp._sessions) == 1
    sid = next(iter(webapp._sessions))
    session = webapp._sessions[sid]
    assert session.get("tree_a") is not None
    assert session.get("tree_b") is not None
    assert session.get("diff") is not None
    assert session.get("holder_a") is not None
    assert session.get("holder_b") is not None
    assert parse_mock.call_count == 2

    with patch.object(webapp, "parse_step", wraps=webapp.parse_step) as parse_mock:
        report = client.get(f"/report/{sid}?lang=da")

    assert report.status_code == 200
    assert b"STEP" in report.data
    parse_mock.assert_not_called()


def test_report_language_switch_uses_cached_diff(client, fixture_paths):
    """Switching report language should re-render HTML without recomputing diff."""
    path_a, path_b = fixture_paths
    with path_a.open("rb") as fa, path_b.open("rb") as fb:
        client.post(
            "/compare",
            data={
                "file_a": (fa, "sample_a.stp"),
                "file_b": (fb, "sample_b.stp"),
                "lang": "uk",
            },
            content_type="multipart/form-data",
            follow_redirects=True,
        )

    sid = next(iter(webapp._sessions))
    cached_diff = webapp._sessions[sid]["diff"]

    with patch.object(webapp, "compare_nodes", wraps=webapp.compare_nodes) as compare_mock:
        response = client.get(f"/report/{sid}?lang=en")

    assert response.status_code == 200
    compare_mock.assert_not_called()
    assert webapp._sessions[sid]["diff"] is cached_diff


def test_lazy_asset_endpoint_generates_png(client, fixture_paths):
    """Lazy asset route should generate a PNG preview on first request."""
    path_a, path_b = fixture_paths
    with path_a.open("rb") as fa, path_b.open("rb") as fb:
        client.post(
            "/compare",
            data={
                "file_a": (fa, "sample_a.stp"),
                "file_b": (fb, "sample_b.stp"),
                "lang": "en",
            },
            content_type="multipart/form-data",
            follow_redirects=True,
        )

    sid = next(iter(webapp._sessions))
    tree_a = webapp._sessions[sid]["tree_a"]
    leaf = next(child for child in tree_a.children if child.volume is not None)
    from step_tree import encode_path_id

    encoded = encode_path_id(leaf.path_id)

    response = client.get(f"/asset/{sid}/a/{encoded}.png")
    assert response.status_code == 200
    assert response.mimetype == "image/png"
    assert len(response.data) > 100


def test_danish_report_keeps_visualization_markup(client, fixture_paths):
    """Danish/DK language reports must stay non-translatable and keep asset URLs."""
    path_a, path_b = fixture_paths
    with path_a.open("rb") as fa, path_b.open("rb") as fb:
        client.post(
            "/compare",
            data={
                "file_a": (fa, "sample_a.stp"),
                "file_b": (fb, "sample_b.stp"),
                "lang": "en",
            },
            content_type="multipart/form-data",
            follow_redirects=False,
        )

    sid = next(iter(webapp._sessions))
    for lang in ("da", "dk"):
        report = client.get(f"/report/{sid}?lang={lang}")
        assert report.status_code == 200
        body = report.data
        assert b'translate="no"' in body
        assert b'name="google" content="notranslate"' in body
        assert b"selectElementFrom" in body
        assert body.count(b"/asset/") > 0
        assert b"data-fallback=" in body
        assert b"id=\"theme-toggle\"" in body
        assert b"data-stl-url=" in body
        assert b"onclick=\"selectElementFrom(this)\"" in body
        assert b"CDN'et" not in body
