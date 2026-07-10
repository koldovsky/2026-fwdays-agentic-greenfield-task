"""
Тести верифікації геометрії.

Ключова ідея agentic-verification: не довіряти власному коду парсингу
"на слово" — а звірити результат з незалежно обчисленим еталоном
(аналітичні формули обʼєму для простих тіл: паралелепіпед, циліндр).

Тести самі генерують тестові STEP-файли через cadquery (детермінований
геометричний генератор, не залежить від зовнішніх фікстур), тому вони
відтворювані на будь-якій машині без збережених бінарних STP-файлів.
"""

import math
import sys
from pathlib import Path

import pytest
import cadquery as cq

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from step_tree import parse_step, encode_path_id, decode_path_id, build_path_id
from compare import compare_nodes, _com_distance, _volume_delta_pct, _volume_within_tolerance, _com_within_tolerance


@pytest.fixture(scope="module")
def box_cylinder_step(tmp_path_factory):
    """Збірка: box 10x20x5 у початку координат + циліндр r=3, h=15 зсунутий на (20,0,0)."""
    box = cq.Workplane("XY").box(10, 20, 5)
    cyl = cq.Workplane("XY").cylinder(15, 3)

    assy = cq.Assembly(name="TestAssembly")
    assy.add(box, name="Box1", loc=cq.Location(cq.Vector(0, 0, 0)))
    assy.add(cyl, name="Cylinder1", loc=cq.Location(cq.Vector(20, 0, 0)))

    out_dir = tmp_path_factory.mktemp("stp")
    path = out_dir / "box_cylinder.stp"
    assy.save(str(path), exportType="STEP")
    return str(path)


@pytest.fixture(scope="module")
def nested_subassembly_step(tmp_path_factory):
    """Assembly fixture with nested instance locations (root -> subassembly -> part)."""
    inner_cyl = cq.Workplane("XY").cylinder(10, 2)

    sub_assy = cq.Assembly(name="SubAssembly")
    sub_assy.add(inner_cyl, name="InnerCylinder", loc=cq.Location(cq.Vector(5, 0, 0)))

    root_assy = cq.Assembly(name="RootAssembly")
    root_assy.add(sub_assy, name="SubAssemblyInstance", loc=cq.Location(cq.Vector(40, 0, 0)))

    out_dir = tmp_path_factory.mktemp("nested_stp")
    path = out_dir / "nested_subassembly.stp"
    root_assy.save(str(path), exportType="STEP")
    return str(path)


def test_parses_correct_number_of_children(box_cylinder_step):
    """Parser should keep assembly hierarchy and expose two direct children."""
    tree = parse_step(box_cylinder_step)
    assert tree.is_assembly is True
    assert len(tree.children) == 2
    assert tree.path_id.startswith("/")


def test_nodes_have_unique_path_ids(box_cylinder_step):
    """Every node in a tree should expose a unique hierarchical path_id."""
    tree = parse_step(box_cylinder_step)
    seen = set()

    def walk(node):
        assert node.path_id not in seen
        seen.add(node.path_id)
        for child in node.children:
            walk(child)

    walk(tree)
    assert any(path_id.endswith("Box1") for path_id in seen)


def test_path_id_encoding_roundtrip():
    """Encoded path ids should round-trip for URL-safe asset routes."""
    originals = [
        "/TestAssembly/Box1",
        "/TestAssembly/Box #2",
        "/TestAssembly/part_with_underscore",
        "/TestAssembly/foo/bar",
    ]
    for original in originals:
        encoded = encode_path_id(original)
        assert decode_path_id(encoded) == original


def test_build_path_id_handles_duplicate_suffixes():
    """Duplicate display names should produce distinct path ids."""
    parent = "/Assembly"
    first = build_path_id(parent, "Bolt")
    second = build_path_id(parent, "Bolt #2")
    assert first != second


def test_box_volume_matches_analytic_formula(box_cylinder_step):
    """Box volume from STEP parsing must match analytical box volume."""
    tree = parse_step(box_cylinder_step)
    box_node = next(c for c in tree.children if c.name.startswith("Box1"))
    expected_volume = 10 * 20 * 5  # = 1000
    assert box_node.volume == pytest.approx(expected_volume, rel=1e-6)


def test_cylinder_volume_matches_analytic_formula(box_cylinder_step):
    """Cylinder volume from STEP parsing must match analytical cylinder volume."""
    tree = parse_step(box_cylinder_step)
    cyl_node = next(c for c in tree.children if c.name.startswith("Cylinder1"))
    expected_volume = math.pi * (3 ** 2) * 15  # π r^2 h
    assert cyl_node.volume == pytest.approx(expected_volume, rel=1e-4)


def test_box_center_of_mass_is_origin(box_cylinder_step):
    """Box located at origin should have COM at (0, 0, 0)."""
    tree = parse_step(box_cylinder_step)
    box_node = next(c for c in tree.children if c.name.startswith("Box1"))
    assert box_node.com == pytest.approx((0, 0, 0), abs=1e-3)


def test_cylinder_center_of_mass_reflects_assembly_location(box_cylinder_step):
    """Регресійний тест на баг, знайдений під час розробки: без урахування
    трансформації компонента ЦВ циліндра помилково показував (0,0,0)
    замість зміщеного (20,0,0)."""
    tree = parse_step(box_cylinder_step)
    cyl_node = next(c for c in tree.children if c.name.startswith("Cylinder1"))
    assert cyl_node.com[0] == pytest.approx(20.0, abs=1e-3)
    assert cyl_node.com[1] == pytest.approx(0.0, abs=1e-3)
    assert cyl_node.com[2] == pytest.approx(0.0, abs=1e-3)


def test_nested_subassembly_center_of_mass_reflects_instance_location(nested_subassembly_step):
    """Nested subassembly COM should include parent instance transform."""
    tree = parse_step(nested_subassembly_step)

    sub_node = next(c for c in tree.children if c.name.startswith("SubAssembly"))

    # Subassembly instance x=40 with inner part local x=5 -> global COM x=45.
    assert sub_node.com[0] == pytest.approx(45.0, abs=1e-3)


def test_assembly_volume_is_sum_of_children(box_cylinder_step):
    """Assembly volume should equal the sum of child volumes."""
    tree = parse_step(box_cylinder_step)
    child_sum = sum(c.volume for c in tree.children)
    assert tree.volume == pytest.approx(child_sum, rel=1e-6)


def test_assembly_com_is_volume_weighted_average(box_cylinder_step):
    """Assembly COM should be the volume-weighted average of child COM values."""
    tree = parse_step(box_cylinder_step)
    total_v = sum(c.volume for c in tree.children)
    expected_x = sum(c.com[0] * c.volume for c in tree.children) / total_v
    assert tree.com[0] == pytest.approx(expected_x, abs=1e-3)  # округлення до 4 знаків у step_tree.py


# ---------- Тести compare.py ----------

def test_com_distance_euclidean():
    """COM helper should return Euclidean distance in millimeters."""
    assert _com_distance((0, 0, 0), (3, 4, 0)) == pytest.approx(5.0)


def test_com_distance_none_if_missing():
    """COM helper should return None when one side is missing."""
    assert _com_distance(None, (1, 2, 3)) is None


def test_volume_delta_pct_basic():
    """Volume delta helper should compute absolute percentage difference."""
    assert _volume_delta_pct(100, 110) == pytest.approx(10.0)


def test_volume_delta_pct_zero_base_equal():
    """Zero-to-zero volume delta should be treated as no computable delta."""
    assert _volume_delta_pct(0, 0) is None


def test_volume_delta_pct_zero_base_nonequal():
    """Zero baseline and non-zero comparison should map to 100% delta."""
    assert _volume_delta_pct(0, 5) == 100.0


def test_volume_within_tolerance_both_none():
    """Missing volume on both sides should be treated as a match."""
    assert _volume_within_tolerance(None, None, 0.5) is True


def test_volume_within_tolerance_one_missing():
    """Missing volume on one side should not be treated as a match."""
    assert _volume_within_tolerance(100.0, None, 0.5) is False


def test_com_within_tolerance_both_none():
    """Missing COM on both sides should be treated as a match."""
    assert _com_within_tolerance(None, None, 0.1) is True


def test_compare_identical_trees_is_match(box_cylinder_step):
    """Comparing identical trees should produce only match statuses."""
    tree_a = parse_step(box_cylinder_step)
    tree_b = parse_step(box_cylinder_step)
    diff = compare_nodes(tree_a, tree_b)
    assert diff.status == "match"
    assert diff.path_id == tree_a.path_id
    assert all(c.status == "match" for c in diff.children)


def test_compare_added_node(box_cylinder_step, tmp_path):
    """A part present only in file B should be marked as added."""
    box = cq.Workplane("XY").box(10, 20, 5)
    cyl = cq.Workplane("XY").cylinder(15, 3)
    plate = cq.Workplane("XY").box(30, 30, 2)

    assy = cq.Assembly(name="TestAssembly")
    assy.add(box, name="Box1", loc=cq.Location(cq.Vector(0, 0, 0)))
    assy.add(cyl, name="Cylinder1", loc=cq.Location(cq.Vector(20, 0, 0)))
    assy.add(plate, name="Plate1", loc=cq.Location(cq.Vector(0, 0, -10)))
    path_b = tmp_path / "with_plate.stp"
    assy.save(str(path_b), exportType="STEP")

    tree_a = parse_step(box_cylinder_step)
    tree_b = parse_step(str(path_b))
    diff = compare_nodes(tree_a, tree_b)

    plate_diff = next(c for c in diff.children if c.name.startswith("Plate1"))
    assert plate_diff.status == "added"
    assert plate_diff.volume_a is None
    assert plate_diff.volume_b == pytest.approx(30 * 30 * 2)


def test_compare_removed_node(box_cylinder_step, tmp_path):
    """A part present only in file A should be marked as removed."""
    box = cq.Workplane("XY").box(10, 20, 5)
    cyl = cq.Workplane("XY").cylinder(15, 3)
    plate = cq.Workplane("XY").box(30, 30, 2)

    assy = cq.Assembly(name="TestAssembly")
    assy.add(box, name="Box1", loc=cq.Location(cq.Vector(0, 0, 0)))
    assy.add(cyl, name="Cylinder1", loc=cq.Location(cq.Vector(20, 0, 0)))
    assy.add(plate, name="Plate1", loc=cq.Location(cq.Vector(0, 0, -10)))
    path_a = tmp_path / "with_plate.stp"
    assy.save(str(path_a), exportType="STEP")

    tree_a = parse_step(str(path_a))
    tree_b = parse_step(box_cylinder_step)
    diff = compare_nodes(tree_a, tree_b)

    plate_diff = next(c for c in diff.children if c.name.startswith("Plate1"))
    assert plate_diff.status == "removed"
    assert plate_diff.volume_b is None
    assert plate_diff.volume_a == pytest.approx(30 * 30 * 2)


def test_compare_changed_volume_exceeds_tolerance(box_cylinder_step, tmp_path):
    """Volume changes beyond tolerance should produce changed status."""
    box = cq.Workplane("XY").box(10, 20, 5)
    cyl = cq.Workplane("XY").cylinder(15, 3.5)  # обʼєм суттєво більший

    assy = cq.Assembly(name="TestAssembly")
    assy.add(box, name="Box1", loc=cq.Location(cq.Vector(0, 0, 0)))
    assy.add(cyl, name="Cylinder1", loc=cq.Location(cq.Vector(20, 0, 0)))
    path_b = tmp_path / "bigger_cylinder.stp"
    assy.save(str(path_b), exportType="STEP")

    tree_a = parse_step(box_cylinder_step)
    tree_b = parse_step(str(path_b))
    diff = compare_nodes(tree_a, tree_b, volume_tol_pct=0.5)

    cyl_diff = next(c for c in diff.children if c.name.startswith("Cylinder1"))
    assert cyl_diff.status == "changed"
    assert cyl_diff.volume_delta_pct > 0.5


def test_compare_within_tolerance_is_match(box_cylinder_step, tmp_path):
    """Дуже мала різниця (в межах допуску) не повинна позначатись як 'changed'."""
    box = cq.Workplane("XY").box(10, 20, 5)
    cyl = cq.Workplane("XY").cylinder(15, 3.001)  # мікроскопічна різниця обʼєму

    assy = cq.Assembly(name="TestAssembly")
    assy.add(box, name="Box1", loc=cq.Location(cq.Vector(0, 0, 0)))
    assy.add(cyl, name="Cylinder1", loc=cq.Location(cq.Vector(20, 0, 0)))
    path_b = tmp_path / "tiny_diff_cylinder.stp"
    assy.save(str(path_b), exportType="STEP")

    tree_a = parse_step(box_cylinder_step)
    tree_b = parse_step(str(path_b))
    diff = compare_nodes(tree_a, tree_b, volume_tol_pct=1.0, com_tol_mm=0.1)

    cyl_diff = next(c for c in diff.children if c.name.startswith("Cylinder1"))
    assert cyl_diff.status == "match"
