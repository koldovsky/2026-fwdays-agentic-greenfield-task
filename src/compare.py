"""
compare.py

Порівнює два дерева елементів (отримані з step_tree.parse_step) за:
  - обʼємом (volume)
  - центром ваги (center of mass)

Співставлення вузлів відбувається за стабільним `path_id` на кожному рівні дерева
(ієрархічний шлях на кшталт `/Assembly/Box1`). Якщо path_id є в обох деревах —
вузли порівнюються; якщо є лише в одному — позначається як "додано"/"видалено".

Статус вузла:
  - "match"    — обʼєм і ЦВ співпадають в межах допуску
  - "changed"  — вузол є в обох, але обʼєм і/або ЦВ відрізняються
  - "added"    — є лише у файлі B
  - "removed"  — є лише у файлі A
"""

from __future__ import annotations

import dataclasses
import math
from typing import Optional

from step_tree import Node


@dataclasses.dataclass
class DiffNode:
    """Represents one compared node and its recursive diff metadata."""
    name: str
    path_id: str
    status: str  # match | changed | added | removed
    is_assembly: bool
    volume_a: Optional[float]
    volume_b: Optional[float]
    volume_delta_pct: Optional[float]
    com_a: Optional[tuple]
    com_b: Optional[tuple]
    com_delta_mm: Optional[float]  # евклідова відстань між ЦВ
    children: list = dataclasses.field(default_factory=list)

    def to_dict(self):
        """Convert a diff node (including children) to a JSON-serializable dict."""
        return {
            "name": self.name,
            "path_id": self.path_id,
            "status": self.status,
            "is_assembly": self.is_assembly,
            "volume_a": self.volume_a,
            "volume_b": self.volume_b,
            "volume_delta_pct": self.volume_delta_pct,
            "com_a": self.com_a,
            "com_b": self.com_b,
            "com_delta_mm": self.com_delta_mm,
            "children": [c.to_dict() for c in self.children],
        }


def _com_distance(a: Optional[tuple], b: Optional[tuple]) -> Optional[float]:
    """Return Euclidean distance between two COM tuples, or None when missing."""
    if a is None or b is None:
        return None
    return round(math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b))), 4)


def _volume_delta_pct(a: Optional[float], b: Optional[float]) -> Optional[float]:
    """Return absolute percentage delta between two volumes."""
    if a is None or b is None:
        return None
    if a == 0:
        return None if b == 0 else 100.0
    return round(abs(b - a) / abs(a) * 100.0, 3)


def _volume_within_tolerance(
    volume_a: Optional[float],
    volume_b: Optional[float],
    volume_tol_pct: float,
) -> bool:
    """Return True when both volumes are absent or within the allowed delta."""
    delta = _volume_delta_pct(volume_a, volume_b)
    if delta is None:
        return volume_a is None and volume_b is None
    return delta <= volume_tol_pct


def _com_within_tolerance(
    com_a: Optional[tuple],
    com_b: Optional[tuple],
    com_tol_mm: float,
) -> bool:
    """Return True when both COM values are absent or within the allowed distance."""
    delta = _com_distance(com_a, com_b)
    if delta is None:
        return com_a is None and com_b is None
    return delta <= com_tol_mm


def compare_nodes(
    node_a: Optional[Node],
    node_b: Optional[Node],
    volume_tol_pct: float = 0.5,
    com_tol_mm: float = 0.1,
) -> DiffNode:
    """Рекурсивно порівнює два вузли (може бути None, якщо вузол відсутній)."""
    if node_a is None and node_b is None:
        raise ValueError("Обидва вузли None — нічого порівнювати")

    if node_a is None:
        # вузол додано у файлі B
        return DiffNode(
            name=node_b.name,
            path_id=node_b.path_id,
            status="added", is_assembly=node_b.is_assembly,
            volume_a=None, volume_b=node_b.volume, volume_delta_pct=None,
            com_a=None, com_b=node_b.com, com_delta_mm=None,
            children=[compare_nodes(None, c) for c in node_b.children],
        )
    if node_b is None:
        return DiffNode(
            name=node_a.name,
            path_id=node_a.path_id,
            status="removed", is_assembly=node_a.is_assembly,
            volume_a=node_a.volume, volume_b=None, volume_delta_pct=None,
            com_a=node_a.com, com_b=None, com_delta_mm=None,
            children=[compare_nodes(c, None) for c in node_a.children],
        )

    vol_delta = _volume_delta_pct(node_a.volume, node_b.volume)
    com_delta = _com_distance(node_a.com, node_b.com)

    # спочатку порівнюємо дітей (за path_id), потім вирішуємо статус поточного вузла
    children_a = {c.path_id: c for c in node_a.children}
    children_b = {c.path_id: c for c in node_b.children}
    all_path_ids = list(dict.fromkeys(list(children_a.keys()) + list(children_b.keys())))

    diff_children = [
        compare_nodes(children_a.get(path_id), children_b.get(path_id), volume_tol_pct, com_tol_mm)
        for path_id in all_path_ids
    ]

    same_node_type = node_a.is_assembly == node_b.is_assembly
    volume_ok = _volume_within_tolerance(node_a.volume, node_b.volume, volume_tol_pct)
    com_ok = _com_within_tolerance(node_a.com, node_b.com, com_tol_mm)
    any_child_changed = any(c.status != "match" for c in diff_children)
    status = "match" if (same_node_type and volume_ok and com_ok and not any_child_changed) else "changed"

    return DiffNode(
        name=node_a.name,
        path_id=node_a.path_id,
        status=status,
        is_assembly=node_a.is_assembly,
        volume_a=node_a.volume,
        volume_b=node_b.volume,
        volume_delta_pct=vol_delta,
        com_a=node_a.com,
        com_b=node_b.com,
        com_delta_mm=com_delta,
        children=diff_children,
    )
