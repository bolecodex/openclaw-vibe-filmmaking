#!/usr/bin/env python3
"""Extract N evenly spaced frames from a video for multimodal review."""
from __future__ import annotations

import argparse
import subprocess
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--count", type=int, default=6)
    args = ap.parse_args()
    vid = Path(args.video)
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    pr = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(vid),
        ],
        capture_output=True,
        text=True,
    )
    dur = float(pr.stdout.strip() or 1)
    n = max(1, args.count)
    for i in range(n):
        t = (i + 0.5) * dur / n
        fp = out / f"frame_{i:02d}.jpg"
        subprocess.run(
            [
                "ffmpeg", "-y", "-ss", str(t), "-i", str(vid),
                "-vframes", "1", "-q:v", "3", str(fp),
            ],
            capture_output=True,
        )
    print(f"Wrote {n} frames to {out}")


if __name__ == "__main__":
    main()
