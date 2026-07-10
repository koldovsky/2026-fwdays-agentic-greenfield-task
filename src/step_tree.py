"""
step_tree.py

Читає STEP-файл (AP203/AP214/AP242) через OpenCASCADE XCAF framework,
зберігаючи ІЄРАРХІЮ збірки (assembly tree), а не лише плаский список solid-ів.

Для кожного вузла дерева (деталі або підзбірки) обчислює:
  - назву (з STEP-файлу, якщо є; інакше згенеровану)
  - обʼєм (volume)
  - центр ваги (center of mass, x/y/z)
  - bounding box (додатково, для наочності)

Результат — вкладений список/дерево dataclass Node, який можна серіалізувати в JSON.
"""

from __future__ import annotations

import dataclasses
import json
import logging
import os
import struct
import uuid
from pathlib import Path
from typing import Optional
from urllib.parse import quote, unquote

import numpy as np
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
from matplotlib.figure import Figure
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.IFSelect import IFSelect_RetDone
from OCP.TDocStd import TDocStd_Document
from OCP.XCAFApp import XCAFApp_Application
from OCP.XCAFDoc import XCAFDoc_DocumentTool
from OCP.TDF import TDF_LabelSequence, TDF_Label
from OCP.TCollection import TCollection_ExtendedString
from OCP.TDataStd import TDataStd_Name
from OCP.BRepGProp import BRepGProp
from OCP.GProp import GProp_GProps
from OCP.Bnd import Bnd_Box
from OCP.BRepBndLib import BRepBndLib
from OCP.TopoDS import TopoDS_Shape
try:
    from OCP.StlAPI import StlAPI_Writer
    from OCP.BRepMesh import BRepMesh_IncrementalMesh
    _STL_AVAILABLE = True
except ImportError:
    _STL_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclasses.dataclass
class Node:
    """Represents one STEP assembly-tree node with computed geometry properties."""
    name: str
    is_assembly: bool
    path_id: str = "/"
    volume: Optional[float] = None          # мм^3 (одиниці STEP-файлу)
    com: Optional[tuple] = None             # (x, y, z) центр ваги
    bbox: Optional[tuple] = None            # (xmin, ymin, zmin, xmax, ymax, zmax)
    stl_id: Optional[str] = None            # ім'я STL-файлу в stl_dir сесії
    children: list = dataclasses.field(default_factory=list)

    def to_dict(self):
        """Convert a geometry node tree into a JSON-serializable dictionary."""
        return {
            "name": self.name,
            "is_assembly": self.is_assembly,
            "path_id": self.path_id,
            "volume": self.volume,
            "com": self.com,
            "bbox": self.bbox,
            "stl_id": self.stl_id,
            "children": [c.to_dict() for c in self.children],
        }


def _path_segment(name: str) -> str:
    """Sanitize a node label for use inside a stable path identifier."""
    return name.replace("/", "_").replace("\\", "_")


def build_path_id(parent_path_id: str, segment: str) -> str:
    """Build a stable hierarchical path id from parent path and node segment."""
    segment = _path_segment(segment)
    if parent_path_id:
        return f"{parent_path_id}/{segment}"
    return f"/{segment}"


_PATH_ID_SEGMENT_DELIM = "~"


def encode_path_id(path_id: str) -> str:
    """Encode a path id as a single URL/filesystem-safe segment."""
    segments = [segment for segment in path_id.strip("/").split("/") if segment]
    if not segments:
        return ""
    return _PATH_ID_SEGMENT_DELIM.join(quote(segment, safe="-_.") for segment in segments)


def decode_path_id(encoded: str) -> str:
    """Decode a path id produced by encode_path_id."""
    if not encoded:
        return "/"
    segments = [unquote(segment) for segment in encoded.split(_PATH_ID_SEGMENT_DELIM)]
    return "/" + "/".join(segments)


def find_node_by_path_id(root: Node, path_id: str) -> Optional[Node]:
    """Return the first node in the tree with the given path_id."""
    if root.path_id == path_id:
        return root
    for child in root.children:
        found = find_node_by_path_id(child, path_id)
        if found is not None:
            return found
    return None


def export_shape_assets(shape: TopoDS_Shape, title: str, stl_dir: str, basename: str) -> Optional[str]:
    """Export STL and PNG files for a shape; return the STL filename on success."""
    stl_path = os.path.join(stl_dir, basename + ".stl")
    png_path = os.path.join(stl_dir, basename + ".png")
    if _export_stl(shape, stl_path):
        _export_png_from_stl(stl_path, png_path, title=title)
        return basename + ".stl"
    return None


def ensure_lazy_assets(path_id: str, holder: dict, stl_dir: str) -> Optional[str]:
    """Generate cached STL/PNG assets on demand for a parsed node path."""
    shape_cache = holder.get("shape_cache", {})
    entry = shape_cache.get(path_id)
    if not entry:
        return None
    basename = encode_path_id(path_id)
    stl_name = basename + ".stl"
    stl_path = os.path.join(stl_dir, stl_name)
    png_path = os.path.join(stl_dir, basename + ".png")
    if os.path.isfile(stl_path) and os.path.isfile(png_path):
        return stl_name
    try:
        return export_shape_assets(entry["shape"], entry["title"], stl_dir, basename)
    except OSError as exc:
        logger.warning("Lazy asset export failed for %s: %s", path_id, exc)
        return None


def _label_name(label: TDF_Label, fallback: str) -> str:
    """Read XCAF label name, or return fallback when name attribute is missing."""
    name_attr = TDataStd_Name()
    if label.FindAttribute(TDataStd_Name.GetID_s(), name_attr):
        return name_attr.Get().ToExtString()
    return fallback


def _shape_props(shape: TopoDS_Shape):

    """Обчислює обʼєм, центр ваги і bounding box для форми (може бути composite)."""
    gprops = GProp_GProps()
    BRepGProp.VolumeProperties_s(shape, gprops)
    volume = gprops.Mass()  # для VolumeProperties Mass() == обʼєм
    com_pnt = gprops.CentreOfMass()
    com = (round(com_pnt.X(), 4), round(com_pnt.Y(), 4), round(com_pnt.Z(), 4))

    bbox = Bnd_Box()
    BRepBndLib.Add_s(shape, bbox)
    xmin, ymin, zmin, xmax, ymax, zmax = bbox.Get()
    bbox_t = tuple(round(v, 4) for v in (xmin, ymin, zmin, xmax, ymax, zmax))

    return round(volume, 6), com, bbox_t


def _aggregate_bbox_from_children(children: list) -> Optional[tuple]:
    """Return an axis-aligned union bbox from child nodes that have bbox data."""
    bboxes = [child.bbox for child in children if child.bbox]
    if not bboxes:
        return None
    xmin = min(bbox[0] for bbox in bboxes)
    ymin = min(bbox[1] for bbox in bboxes)
    zmin = min(bbox[2] for bbox in bboxes)
    xmax = max(bbox[3] for bbox in bboxes)
    ymax = max(bbox[4] for bbox in bboxes)
    zmax = max(bbox[5] for bbox in bboxes)
    return tuple(round(value, 4) for value in (xmin, ymin, zmin, xmax, ymax, zmax))


def _export_stl(shape: TopoDS_Shape, path: str, deflection: float = 0.1) -> bool:
    """Тесселює форму і записує бінарний STL. Повертає True при успіху."""
    if not _STL_AVAILABLE:
        return False
    try:
        mesh = BRepMesh_IncrementalMesh(shape, deflection, False, 0.5, True)
        mesh.Perform()
        writer = StlAPI_Writer()
        return bool(writer.Write(shape, path))
    except Exception as exc:
        logger.warning("STL export failed for %s: %s", path, exc)
        return False


def _write_placeholder_png(path: str, title: str = "Preview unavailable") -> None:
    """Write a small placeholder PNG when geometry preview rendering is unavailable."""
    fig = Figure(figsize=(1.2, 0.9), dpi=120)
    FigureCanvas(fig)
    ax = fig.add_subplot(111)
    fig.patch.set_facecolor("#d8d1be")
    ax.set_facecolor("#d8d1be")
    ax.axis("off")
    ax.text(0.5, 0.55, "PNG", ha="center", va="center", fontsize=18, weight="bold", color="#6c6a60")
    ax.text(0.5, 0.2, title, ha="center", va="center", fontsize=7, color="#6c6a60", wrap=True)
    fig.savefig(path, bbox_inches="tight", pad_inches=0.08)


def _read_stl_triangles(path: str):
    """Read STL triangles from binary or ASCII STL files."""
    data = Path(path).read_bytes()
    if len(data) >= 84:
        face_count = struct.unpack_from("<I", data, 80)[0]
        expected = 84 + face_count * 50
        if expected == len(data):
            triangles = []
            offset = 84
            for _ in range(face_count):
                _, *coords, _attr = struct.unpack_from("<12fH", data, offset)
                offset += 50
                vertices = np.array(coords, dtype=float).reshape(3, 3)
                triangles.append(vertices)
            return triangles

    text = data.decode("utf-8", errors="ignore").splitlines()
    triangles = []
    current = []
    for line in text:
        line = line.strip()
        if line.startswith("vertex "):
            parts = line.split()
            if len(parts) == 4:
                current.append([float(parts[1]), float(parts[2]), float(parts[3])])
        elif line.startswith("endloop") or line.startswith("endfacet"):
            if len(current) == 3:
                triangles.append(np.array(current, dtype=float))
            current = []
    return triangles


def _export_png_from_stl(stl_path: str, png_path: str, title: str = "Preview") -> bool:
    """Render an isometric PNG preview from STL triangles."""
    try:
        triangles = _read_stl_triangles(stl_path)
        if not triangles:
            _write_placeholder_png(png_path, title=title)
            return True

        verts = np.array(triangles, dtype=float)
        flat = verts.reshape(-1, 3)
        mins = flat.min(axis=0)
        maxs = flat.max(axis=0)
        center = (mins + maxs) / 2.0
        span = float(np.max(maxs - mins))
        if not np.isfinite(span) or span <= 0:
            span = 1.0

        fig = Figure(figsize=(1.25, 0.95), dpi=120)
        FigureCanvas(fig)
        fig.patch.set_facecolor("#d8d1be")
        ax = fig.add_subplot(111, projection="3d")
        ax.set_facecolor("#d8d1be")
        poly = Poly3DCollection(
            verts,
            facecolors="#7f9db9",
            edgecolors="#5b6d7f",
            linewidths=0.08,
            alpha=1.0,
        )
        ax.add_collection3d(poly)
        radius = span * 0.56
        ax.set_xlim(center[0] - radius, center[0] + radius)
        ax.set_ylim(center[1] - radius, center[1] + radius)
        ax.set_zlim(center[2] - radius, center[2] + radius)
        try:
            ax.set_box_aspect((1, 1, 1))
        except Exception:
            pass
        ax.view_init(elev=24, azim=35)
        ax.set_axis_off()
        fig.savefig(png_path, bbox_inches="tight", pad_inches=0.0)
        return True
    except Exception as exc:
        logger.warning("PNG preview failed for %s: %s", png_path, exc)
        try:
            _write_placeholder_png(png_path, title=title)
            return True
        except Exception as placeholder_exc:
            logger.warning("PNG placeholder failed for %s: %s", png_path, placeholder_exc)
            return False


def _get_components(shape_tool, label):
    """Return direct XCAF component labels for an assembly label."""
    seq = TDF_LabelSequence()
    shape_tool.GetComponents_s(label, seq)
    return [seq.Value(i) for i in range(1, seq.Length() + 1)]


def _resolve_referred(shape_tool, comp_label):
    """Компонент (інстанс) -> мітка деталі/підзбірки, на яку він посилається."""
    ref_label = TDF_Label()
    is_ref = shape_tool.GetReferredShape_s(comp_label, ref_label)
    return ref_label if is_ref else comp_label


def _walk(shape_tool, label: TDF_Label, seen_names: dict,
          parent_path_id: str = "",
          shape_label_for_geometry: TDF_Label = None,
          stl_dir: str = None,
          shape_cache: dict = None) -> Node:
    """
    label: мітка структури (визначає is_assembly / дітей) — це "referred"/part label.
    shape_label_for_geometry: мітка КОМПОНЕНТА (інстанса), з якої треба брати
        форму для обчислення обʼєму/ЦВ, бо саме вона містить накопичену
        трансформацію (розташування) відносно кореня збірки. Для кореневих
        вільних форм (без батьківського компонента) співпадає з `label`.
    """
    geom_label = shape_label_for_geometry if shape_label_for_geometry is not None else label

    name_fallback = f"unnamed_{label.Tag()}"
    name = _label_name(label, name_fallback)
    count = seen_names.get(name, 0)
    seen_names[name] = count + 1
    display_name = name if count == 0 else f"{name} #{count + 1}"

    is_assembly_flag = shape_tool.IsAssembly_s(label)
    path_id = build_path_id(parent_path_id, display_name)
    node = Node(name=display_name, is_assembly=bool(is_assembly_flag), path_id=path_id)

    if is_assembly_flag:
        for comp_label in _get_components(shape_tool, label):
            ref_label = _resolve_referred(shape_tool, comp_label)
            child_node = _walk(
                shape_tool,
                ref_label,
                seen_names,
                parent_path_id=path_id,
                shape_label_for_geometry=comp_label,
                stl_dir=stl_dir,
                shape_cache=shape_cache,
            )
            node.children.append(child_node)
        assy_shape = shape_tool.GetShape_s(geom_label)

        # Prefer instance-shape properties for assemblies so nested instance
        # TopLoc_Location is preserved; fallback to child aggregation only when
        # the shape is unavailable.
        if assy_shape is not None and not assy_shape.IsNull():
            volume, com, bbox = _shape_props(assy_shape)
            node.volume = volume
            node.com = com
            node.bbox = bbox
        else:
            merged_bbox = _aggregate_bbox_from_children(node.children)
            if merged_bbox is not None:
                node.bbox = merged_bbox
            total_vol = sum(c.volume for c in node.children if c.volume)
            if total_vol:
                wx = sum((c.com[0] * c.volume) for c in node.children if c.volume) / total_vol
                wy = sum((c.com[1] * c.volume) for c in node.children if c.volume) / total_vol
                wz = sum((c.com[2] * c.volume) for c in node.children if c.volume) / total_vol
                node.volume = round(total_vol, 6)
                node.com = (round(wx, 4), round(wy, 4), round(wz, 4))

        if assy_shape is not None and not assy_shape.IsNull():
            if shape_cache is not None:
                shape_cache[path_id] = {"shape": assy_shape, "title": display_name}
            if stl_dir and shape_cache is None:
                asset_id = uuid.uuid4().hex
                stl_path = os.path.join(stl_dir, asset_id + ".stl")
                png_path = os.path.join(stl_dir, asset_id + ".png")
                if _export_stl(assy_shape, stl_path):
                    _export_png_from_stl(stl_path, png_path, title=display_name)
                    node.stl_id = asset_id + ".stl"
    else:
        shape = shape_tool.GetShape_s(geom_label)
        if shape is not None and not shape.IsNull():
            volume, com, bbox = _shape_props(shape)
            node.volume = volume
            node.com = com
            node.bbox = bbox
            if shape_cache is not None:
                shape_cache[path_id] = {"shape": shape, "title": display_name}
            if stl_dir and shape_cache is None:
                asset_id = uuid.uuid4().hex
                stl_path = os.path.join(stl_dir, asset_id + ".stl")
                png_path = os.path.join(stl_dir, asset_id + ".png")
                if _export_stl(shape, stl_path):
                    _export_png_from_stl(stl_path, png_path, title=display_name)
                    node.stl_id = asset_id + ".stl"

    return node


def parse_step(path: str, stl_dir: str = None, holder: dict = None) -> Node:
    """Парсить STEP-файл і повертає корінь дерева елементів."""
    path = str(Path(path).resolve())

    app = XCAFApp_Application.GetApplication_s()
    doc = TDocStd_Document(TCollection_ExtendedString("stp-tree-doc"))
    app.NewDocument(TCollection_ExtendedString("MDTV-XCAF"), doc)

    reader = STEPCAFControl_Reader()
    reader.SetNameMode(True)
    status = reader.ReadFile(path)
    if status != IFSelect_RetDone:
        raise RuntimeError(f"Не вдалося прочитати STEP-файл: {path}")
    reader.Transfer(doc)

    shape_tool = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())
    shape_cache = None
    if holder is not None:
        holder["doc"] = doc
        holder["shape_cache"] = {}
        shape_cache = holder["shape_cache"]

    free_labels = TDF_LabelSequence()
    getter = shape_tool.GetFreeShapes_s if hasattr(shape_tool, "GetFreeShapes_s") else shape_tool.GetFreeShapes
    getter(free_labels)

    seen_names: dict = {}
    virtual_root_path = build_path_id("", Path(path).stem)
    roots = [
        _walk(
            shape_tool,
            free_labels.Value(i),
            seen_names,
            parent_path_id=virtual_root_path if free_labels.Length() > 1 else "",
            stl_dir=stl_dir,
            shape_cache=shape_cache,
        )
        for i in range(1, free_labels.Length() + 1)
    ]

    if len(roots) == 1:
        return roots[0]

    # якщо кілька незалежних верхніх тіл — обгортаємо у віртуальний корінь
    root = Node(
        name=Path(path).stem,
        is_assembly=True,
        path_id=virtual_root_path,
        children=roots,
    )
    total_vol = sum(c.volume for c in roots if c.volume)
    if total_vol:
        wx = sum((c.com[0] * c.volume) for c in roots if c.volume) / total_vol
        wy = sum((c.com[1] * c.volume) for c in roots if c.volume) / total_vol
        wz = sum((c.com[2] * c.volume) for c in roots if c.volume) / total_vol
        root.volume = round(total_vol, 6)
        root.com = (round(wx, 4), round(wy, 4), round(wz, 4))
    return root


if __name__ == "__main__":
    import sys
    tree = parse_step(sys.argv[1])
    print(json.dumps(tree.to_dict(), indent=2, ensure_ascii=False))
