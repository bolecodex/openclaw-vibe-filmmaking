#!/usr/bin/env python3
"""
2A: FFmpeg silence trim / concat from shot clips.
2B: Apply EDL JSON (trim per clip, reorder).
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str]) -> str:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        raise SystemExit(r.returncode)
    return r.stderr + r.stdout


def silencedetect(video: Path) -> list[tuple[float, float]]:
    """Return list of (silence_start, silence_end) from ffmpeg silencedetect."""
    cmd = [
        "ffmpeg", "-i", str(video), "-af", "silencedetect=noise=-30dB:d=0.4",
        "-f", "null", "-",
    ]
    out = run(cmd)
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    return list(zip(starts, ends))


def trim_silence_edges(video: Path, out: Path, pad: float = 0.15) -> None:
    """Trim leading/trailing silence (conservative)."""
    regions = silencedetect(video)
    if not regions:
        subprocess.run(["cp", str(video), str(out)], check=True)
        return
    # probe duration
    pr = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(video),
        ],
        capture_output=True,
        text=True,
    )
    dur = float(pr.stdout.strip() or 0)
    if dur <= 0:
        subprocess.run(["cp", str(video), str(out)], check=True)
        return
    start_trim = 0.0
    if regions and regions[0][0] < 0.5:
        start_trim = min(regions[0][1] + pad, dur * 0.15)
    end_trim = dur
    if regions and regions[-1][1] > dur - 0.5:
        end_trim = max(regions[-1][0] - pad, dur * 0.85)
    if end_trim <= start_trim + 0.1:
        subprocess.run(["cp", str(video), str(out)], check=True)
        return
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(video),
            "-ss", str(start_trim), "-to", str(end_trim),
            "-c", "copy", str(out),
        ],
        check=True,
    )


def apply_edl(edl_path: Path, out_video: Path, work_dir: Path) -> None:
    data = json.loads(edl_path.read_text(encoding="utf-8"))
    clips = data.get("clips") or []
    if not clips:
        raise SystemExit("EDL has no clips")
    work_dir.mkdir(parents=True, exist_ok=True)
    parts: list[Path] = []
    for i, c in enumerate(clips):
        src = Path(c["source"])
        if not src.is_absolute():
            src = edl_path.parent / src
        ts = float(c.get("trim_start", 0))
        te = c.get("trim_end")
        part = work_dir / f"part_{i:04d}.mp4"
        cmd = ["ffmpeg", "-y", "-i", str(src), "-ss", str(ts)]
        if te is not None:
            cmd += ["-to", str(float(te))]
        cmd += ["-c", "copy", str(part)]
        subprocess.run(cmd, check=True)
        parts.append(part)
    list_file = work_dir / "concat_list.txt"
    list_file.write_text("".join(f"file '{p.resolve()}'\n" for p in parts), encoding="utf-8")
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
            "-c", "copy", str(out_video),
        ],
        check=True,
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    p1 = sub.add_parser("silence-trim", help="Trim head/tail silence of one mp4")
    p1.add_argument("--input", required=True)
    p1.add_argument("--output", required=True)

    p2 = sub.add_parser("edl", help="Concatenate per EDL JSON")
    p2.add_argument("--edl", required=True)
    p2.add_argument("--output", required=True)
    p2.add_argument("--work-dir", default="")

    args = ap.parse_args()
    if args.cmd == "silence-trim":
        trim_silence_edges(Path(args.input), Path(args.output))
        print("ok", args.output)
    else:
        edl = Path(args.edl)
        out = Path(args.output)
        wd = Path(args.work_dir) if args.work_dir else out.parent / ".edl_work"
        apply_edl(edl, out, wd)
        manifest = {
            "output": str(out.resolve()),
            "edl": str(edl.resolve()),
            "clips": len(json.loads(edl.read_text()).get("clips") or []),
        }
        (out.parent / "edit_manifest.json").write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print("ok", out)


if __name__ == "__main__":
    main()
