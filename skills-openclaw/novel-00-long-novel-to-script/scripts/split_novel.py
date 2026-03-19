#!/usr/bin/env python3
"""Split a long novel into chunks for map-reduce script generation."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def find_chapter_splits(text: str) -> list[int]:
    """Return start indices of chapter-like headings (Chinese web novel patterns)."""
    patterns = [
        r"^第[0-9零一二三四五六七八九十百千万]+章",
        r"^第[0-9]+章",
        r"^Chapter\s+\d+",
        r"^\*{0,3}\s*第[0-9零一二三四五六七八九十百千万]+章",
    ]
    combined = "|".join(f"({p})" for p in patterns)
    rx = re.compile(combined, re.MULTILINE)
    return [m.start() for m in rx.finditer(text)]


def split_text(
    text: str,
    max_chars: int,
    overlap: int,
    prefer_chapters: bool,
) -> list[tuple[int, int, str]]:
    """
    Returns list of (start, end, content) for each chunk.
    """
    text = text.replace("\r\n", "\n")
    if not text.strip():
        return []

    if prefer_chapters:
        splits = find_chapter_splits(text)
        splits = sorted(set([0] + splits + [len(text)]))
        raw_ranges: list[tuple[int, int]] = []
        for i in range(len(splits) - 1):
            a, b = splits[i], splits[i + 1]
            if b > a:
                raw_ranges.append((a, b))
        merged: list[tuple[int, int]] = []
        cur_s, cur_e = raw_ranges[0]
        for a, b in raw_ranges[1:]:
            if b - cur_s <= max_chars:
                cur_e = b
            else:
                merged.append((cur_s, cur_e))
                cur_s, cur_e = a, b
        merged.append((cur_s, cur_e))
        ranges = merged
    else:
        ranges = []
        pos = 0
        n = len(text)
        while pos < n:
            end = min(pos + max_chars, n)
            if end < n:
                back = text.rfind("\n\n", pos + max_chars // 2, end)
                if back > pos:
                    end = back + 2
            ranges.append((pos, end))
            pos = max(pos + 1, end - overlap)

    chunks: list[tuple[int, int, str]] = []
    for a, b in ranges:
        chunks.append((a, b, text[a:b]))
    return chunks


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--novel", required=True, help="Path to full novel .txt/.md")
    ap.add_argument("--project-dir", required=True, help="Project output directory")
    ap.add_argument("--max-chars", type=int, default=12000)
    ap.add_argument("--overlap", type=int, default=400)
    ap.add_argument("--no-chapters", action="store_true", help="Fixed-size windows only")
    ap.add_argument("--project-name", default="", help="For manifest")
    args = ap.parse_args()

    novel_path = Path(args.novel)
    project_dir = Path(args.project_dir)
    chunks_dir = project_dir / "novel_chunks"
    pipeline_dir = project_dir / ".pipeline"
    chunks_dir.mkdir(parents=True, exist_ok=True)
    pipeline_dir.mkdir(parents=True, exist_ok=True)

    text = novel_path.read_text(encoding="utf-8", errors="replace")
    pieces = split_text(
        text,
        max_chars=args.max_chars,
        overlap=args.overlap,
        prefer_chapters=not args.no_chapters,
    )

    manifest_chunks = []
    for i, (start, end, content) in enumerate(pieces):
        idx = i + 1
        fname = f"chunk_{idx:04d}.md"
        fpath = chunks_dir / fname
        header = f"<!-- chunk_index={idx} byte_range={start}-{end} -->\n\n"
        fpath.write_text(header + content, encoding="utf-8")
        manifest_chunks.append(
            {
                "index": idx,
                "file": f"novel_chunks/{fname}",
                "byte_start": start,
                "byte_end": end,
                "char_len": len(content),
                "status": "pending",
                "phases": {
                    "analyzed": False,
                    "bible_merged": False,
                    "act_script": False,
                },
            }
        )

    acts_every = max(1, min(10, len(pieces) // 20 + 5))
    acts = []
    for i in range(0, len(pieces), acts_every):
        act_num = len(acts) + 1
        chunk_indices = [c["index"] for c in manifest_chunks[i : i + acts_every]]
        acts.append(
            {
                "act": act_num,
                "chunk_indices": chunk_indices,
                "status": "pending",
                "output_file": f"_剧本_第{act_num}幕.md",
            }
        )

    name = args.project_name or project_dir.name
    manifest = {
        "version": 1,
        "novel_source": str(novel_path.resolve()),
        "project_name": name,
        "total_chunks": len(pieces),
        "max_chars": args.max_chars,
        "overlap": args.overlap,
        "chunks": manifest_chunks,
        "acts": acts,
        "final_script": f"{name}_剧本.md",
    }
    (pipeline_dir / "novel_chunks_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {len(pieces)} chunks to {chunks_dir}")
    print(f"Manifest: {pipeline_dir / 'novel_chunks_manifest.json'}")


if __name__ == "__main__":
    main()
