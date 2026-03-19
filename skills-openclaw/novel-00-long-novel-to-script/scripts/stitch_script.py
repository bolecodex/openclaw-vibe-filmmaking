#!/usr/bin/env python3
"""Concatenate act scripts into final {project}_剧本.md."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project-dir", required=True)
    args = ap.parse_args()
    d = Path(args.project_dir)
    manifest_path = d / ".pipeline" / "novel_chunks_manifest.json"
    if not manifest_path.exists():
        raise SystemExit("novel_chunks_manifest.json not found; run split_novel.py first")
    m = json.loads(manifest_path.read_text(encoding="utf-8"))
    final_name = m.get("final_script") or f"{d.name}_剧本.md"
    acts = sorted(m.get("acts") or [], key=lambda x: x.get("act", 0))
    parts = []
    for act in acts:
        rel = act.get("output_file")
        if not rel:
            continue
        fp = d / rel
        if fp.exists():
            parts.append(f"\n\n---\n\n## 第 {act.get('act')} 幕\n\n")
            parts.append(fp.read_text(encoding="utf-8"))
    if not parts:
        raise SystemExit("No act script files found")
    out = d / final_name
    header = f"# {m.get('project_name', d.name)} — 漫剧剧本（长篇汇编）\n\n"
    out.write_text(header + "".join(parts), encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
