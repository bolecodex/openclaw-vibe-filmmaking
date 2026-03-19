#!/usr/bin/env python3
"""Merge per-chunk bible patch into story_bible.yaml (shallow list merge)."""
from __future__ import annotations

import argparse
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore


def load_yaml(p: Path) -> dict:
    if not p.exists():
        return {}
    raw = p.read_text(encoding="utf-8")
    if yaml:
        return yaml.safe_load(raw) or {}
    raise SystemExit("pip install pyyaml required")


def save_yaml(p: Path, data: dict) -> None:
    if yaml:
        p.write_text(yaml.dump(data, allow_unicode=True, default_flow_style=False), encoding="utf-8")
    else:
        raise SystemExit("pip install pyyaml required")


def merge_list_by_key(
    base: list, incoming: list, key: str = "name"
) -> list:
    seen = {str(x.get(key)): x for x in base if isinstance(x, dict) and key in x}
    for item in incoming:
        if not isinstance(item, dict):
            continue
        k = str(item.get(key, id(item)))
        if k in seen:
            old = seen[k]
            for ik, iv in item.items():
                if ik not in old or not old[ik]:
                    old[ik] = iv
        else:
            seen[k] = dict(item)
    return list(seen.values())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bible", required=True, help="story_bible.yaml path")
    ap.add_argument("--patch", required=True, help="YAML fragment from chunk analysis")
    args = ap.parse_args()

    bible_path = Path(args.bible)
    patch_path = Path(args.patch)
    base = load_yaml(bible_path)
    patch = load_yaml(patch_path)

    for key in ("characters", "locations", "timeline", "foreshadow_active"):
        if key not in patch:
            continue
        inc = patch[key]
        if isinstance(inc, list) and isinstance(base.get(key), list):
            base[key] = merge_list_by_key(base[key], inc)
        elif isinstance(inc, list):
            base[key] = inc
        elif isinstance(inc, dict) and isinstance(base.get(key), dict):
            base[key].update(inc)
        else:
            base[key] = inc

    save_yaml(bible_path, base)
    print(f"Merged into {bible_path}")


if __name__ == "__main__":
    main()
