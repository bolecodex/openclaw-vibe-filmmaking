#!/usr/bin/env python3
"""
Seedance 2.0 视频生成 - 火山方舟 Ark API CLI

直接调用火山方舟官方 API 生成视频。支持：文生视频、图生视频-首帧、图生视频-首尾帧、
多模态参考（1~9 图 + 0~3 视频 + 0~3 音频 + 文本）、联网搜索（仅文生）。

Usage:
  # 文生视频
  python seedance_ark_api.py generate --prompt PROMPT [--web_search]
  # 图生视频-首帧
  python seedance_ark_api.py generate --prompt PROMPT --image_url URL
  # 图生视频-首尾帧
  python seedance_ark_api.py generate --prompt PROMPT --first_frame URL --last_frame URL
  # 多模态参考（延长/编辑/全能）
  python seedance_ark_api.py generate --prompt PROMPT --reference_images URL [URL...] [--reference_videos URL...] [--reference_audios URL...]
  python seedance_ark_api.py get --task_id TASK_ID
  python seedance_ark_api.py wait --task_id TASK_ID
  python seedance_ark_api.py run --prompt PROMPT [--image_url URL] [--output PATH]
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error


def _load_dotenv():
    """Load .env from project root."""
    for rel in [
        os.path.join(os.path.dirname(__file__), '..', '..', '.env'),
        os.path.join(os.path.dirname(__file__), '.env'),
    ]:
        env_path = os.path.normpath(rel)
        if not os.path.isfile(env_path):
            continue
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, _, value = line.partition('=')
                key, value = key.strip(), value.strip()
                if key and key not in os.environ:
                    os.environ[key] = value
        break


_load_dotenv()

ARK_API_KEY = os.environ.get('ARK_API_KEY', '')
ARK_BASE_URL = os.environ.get('ARK_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3')
# 若配置了 EP（模型单元），优先使用 EP；否则使用模型名
SEEDANCE_EP = os.environ.get('SEEDANCE_EP', '')
DEFAULT_MODEL = SEEDANCE_EP if SEEDANCE_EP else os.environ.get('SEEDANCE_MODEL', 'doubao-seedance-2-0-pro-260215')


def _request(method, path, body=None):
    """Send HTTP request to Ark API."""
    url = f'{ARK_BASE_URL.rstrip("/")}{path}'
    headers = {
        'Authorization': f'Bearer {ARK_API_KEY}',
        'Content-Type': 'application/json',
    }
    data = json.dumps(body).encode('utf-8') if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8')
        try:
            detail = json.loads(detail)
        except json.JSONDecodeError:
            pass
        print(json.dumps({'error': f'HTTP {e.code}', 'detail': detail}, ensure_ascii=False, indent=2),
              file=sys.stderr)
        sys.exit(1)


def build_content(prompt=None, image_url=None, first_frame_url=None, last_frame_url=None,
                  reference_images=None, reference_videos=None, reference_audios=None):
    """
    Build content array for Seedance 2.0 API. Three mutually exclusive modes:
    - first_frame + last_frame -> 图生视频-首尾帧
    - any of reference_images / reference_videos / reference_audios -> 多模态参考 (need at least 1 image or 1 video)
    - image_url only -> 图生视频-首帧
    - else -> 文生视频 (text only)
    """
    reference_images = reference_images or []
    reference_videos = reference_videos or []
    reference_audios = reference_audios or []

    # 1) 首尾帧：两张图，role first_frame / last_frame
    if first_frame_url and last_frame_url:
        content = [
            {'type': 'image_url', 'image_url': {'url': first_frame_url}, 'role': 'first_frame'},
            {'type': 'image_url', 'image_url': {'url': last_frame_url}, 'role': 'last_frame'},
        ]
        if prompt:
            content.append({'type': 'text', 'text': prompt})
        return content

    # 2) 多模态参考：至少 1 图或 1 视频（不可仅音频）
    if reference_images or reference_videos or reference_audios:
        if not reference_images and not reference_videos:
            raise ValueError('Multimodal reference requires at least 1 reference image or 1 reference video (cannot use audio only).')
        content = []
        if prompt:
            content.append({'type': 'text', 'text': prompt})
        for url in reference_images:
            content.append({
                'type': 'image_url',
                'image_url': {'url': url},
                'role': 'reference_image',
            })
        for url in reference_videos:
            content.append({
                'type': 'video_url',
                'video_url': {'url': url},
                'role': 'reference_video',
            })
        for url in reference_audios:
            content.append({
                'type': 'audio_url',
                'audio_url': {'url': url},
                'role': 'reference_audio',
            })
        return content

    # 3) 图生视频-首帧：单图 + 文本
    if image_url:
        content = [
            {'type': 'image_url', 'image_url': {'url': image_url}, 'role': 'first_frame'},
            {'type': 'text', 'text': prompt or ''},
        ]
        return content

    # 4) 文生视频
    if not prompt:
        raise ValueError('Prompt (text) is required for text-to-video or when no images/videos are provided.')
    return [{'type': 'text', 'text': prompt}]


def create_task(prompt=None, image_url=None, first_frame_url=None, last_frame_url=None,
                reference_images=None, reference_videos=None, reference_audios=None,
                model=None, duration=None, resolution=None, aspect_ratio=None,
                generate_audio=True, seed=None, web_search=False, watermark=None):
    """Create a video generation task. Uses top-level body params per Seedance 2.0 doc."""
    content = build_content(
        prompt=prompt,
        image_url=image_url,
        first_frame_url=first_frame_url,
        last_frame_url=last_frame_url,
        reference_images=reference_images,
        reference_videos=reference_videos,
        reference_audios=reference_audios,
    )

    body = {
        'model': model or DEFAULT_MODEL,
        'content': content,
    }
    # Top-level params (Seedance 2.0 doc)
    if duration is not None:
        body['duration'] = int(duration)
    if resolution is not None:
        body['resolution'] = resolution
    if aspect_ratio is not None:
        body['ratio'] = aspect_ratio
    body['generate_audio'] = bool(generate_audio)
    if watermark is not None:
        body['watermark'] = bool(watermark)
    if seed is not None:
        body['extra'] = body.get('extra') or {}
        body['extra']['seed'] = int(seed)
    if web_search:
        body['tools'] = [{'type': 'web_search'}]

    result = _request('POST', '/contents/generations/tasks', body)
    return result


def get_task(task_id):
    """Query task status."""
    return _request('GET', f'/contents/generations/tasks/{task_id}')


def wait_for_task(task_id, timeout=600, interval=10):
    """Poll until task completes or fails."""
    start = time.time()
    while True:
        elapsed = int(time.time() - start)
        result = get_task(task_id)
        status = result.get('status', 'unknown')

        print(f'[{elapsed}s] status={status}', file=sys.stderr)

        if status == 'succeeded':
            return result
        if status == 'failed':
            print(json.dumps({'error': 'Task failed', 'detail': result}, ensure_ascii=False, indent=2),
                  file=sys.stderr)
            sys.exit(1)

        if elapsed > timeout:
            print(json.dumps({'error': 'Timeout', 'elapsed': elapsed}, ensure_ascii=False, indent=2),
                  file=sys.stderr)
            sys.exit(1)

        time.sleep(interval)


def download_video(url, output_path):
    """Download video file."""
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=120) as resp:
        with open(output_path, 'wb') as f:
            while True:
                chunk = resp.read(8192)
                if not chunk:
                    break
                f.write(chunk)
    size_kb = os.path.getsize(output_path) // 1024
    print(f'Downloaded: {output_path} ({size_kb} KB)', file=sys.stderr)


def _parse_list_arg(val):
    if val is None:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        return [u.strip() for u in val.split(',') if u.strip()]
    return []


def main():
    parser = argparse.ArgumentParser(description='Seedance 2.0 - Volcengine Ark API CLI')
    subparsers = parser.add_subparsers(dest='command')

    def add_common_gen_args(p):
        p.add_argument('--prompt', default='', help='Video generation prompt (optional for multimodal if refs describe intent)')
        p.add_argument('--image_url', help='First-frame image URL (single image-to-video)')
        p.add_argument('--first_frame', help='First frame URL (for first+last frame mode)')
        p.add_argument('--last_frame', help='Last frame URL (for first+last frame mode)')
        p.add_argument('--reference_images', nargs='*', default=[], help='Reference image URLs (1-9, multimodal)')
        p.add_argument('--reference_videos', nargs='*', default=[], help='Reference video URLs (0-3, multimodal/extend/edit)')
        p.add_argument('--reference_audios', nargs='*', default=[], help='Reference audio URLs (0-3, multimodal)')
        p.add_argument('--model', default=None, help=f'Model name (default: {DEFAULT_MODEL})')
        p.add_argument('--duration', type=int, default=5, help='Video duration in seconds (4-15 or -1 for auto)')
        p.add_argument('--resolution', default='720p', help='Resolution: 480p/720p')
        p.add_argument('--aspect_ratio', default='16:9', help='Aspect ratio: 16:9/9:16/1:1/4:3/3:4/21:9/adaptive')
        p.add_argument('--no-audio', action='store_true', help='Disable audio generation')
        p.add_argument('--seed', type=int, help='Random seed')
        p.add_argument('--web_search', action='store_true', help='Enable web search (text-to-video only)')
        p.add_argument('--watermark', action='store_true', help='Add watermark')

    # generate
    p_gen = subparsers.add_parser('generate', help='Submit a video generation task')
    add_common_gen_args(p_gen)

    # get
    p_get = subparsers.add_parser('get', help='Query task status')
    p_get.add_argument('--task_id', required=True, help='Task ID to query')

    # wait
    p_wait = subparsers.add_parser('wait', help='Wait for task completion')
    p_wait.add_argument('--task_id', required=True, help='Task ID to wait for')
    p_wait.add_argument('--timeout', type=int, default=600, help='Max wait seconds (default: 600)')
    p_wait.add_argument('--interval', type=int, default=10, help='Poll interval seconds (default: 10)')

    # run
    p_run = subparsers.add_parser('run', help='Generate, wait, and optionally download')
    add_common_gen_args(p_run)
    p_run.add_argument('--output', '-o', help='Download video to this path')
    p_run.add_argument('--timeout', type=int, default=600, help='Max wait seconds')

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    if not ARK_API_KEY:
        print('Error: ARK_API_KEY not set. Add it to .env or export it.', file=sys.stderr)
        sys.exit(1)

    def run_create(args):
        ref_imgs = getattr(args, 'reference_images', []) or []
        ref_vids = getattr(args, 'reference_videos', []) or []
        ref_auds = getattr(args, 'reference_audios', []) or []
        prompt = getattr(args, 'prompt', '') or None
        if prompt is not None and prompt.strip() == '':
            prompt = None
        try:
            return create_task(
                prompt=prompt,
                image_url=getattr(args, 'image_url', None),
                first_frame_url=getattr(args, 'first_frame', None),
                last_frame_url=getattr(args, 'last_frame', None),
                reference_images=ref_imgs if ref_imgs else None,
                reference_videos=ref_vids if ref_vids else None,
                reference_audios=ref_auds if ref_auds else None,
                model=getattr(args, 'model', None),
                duration=getattr(args, 'duration', 5),
                resolution=getattr(args, 'resolution', None),
                aspect_ratio=getattr(args, 'aspect_ratio', None),
                generate_audio=not getattr(args, 'no_audio', False),
                seed=getattr(args, 'seed', None),
                web_search=getattr(args, 'web_search', False),
                watermark=getattr(args, 'watermark', None),
            )
        except ValueError as e:
            print(json.dumps({'error': str(e)}, ensure_ascii=False), file=sys.stderr)
            sys.exit(1)

    if args.command == 'generate':
        result = run_create(args)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif args.command == 'get':
        result = get_task(args.task_id)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif args.command == 'wait':
        result = wait_for_task(args.task_id, timeout=args.timeout, interval=args.interval)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif args.command == 'run':
        print('Submitting task...', file=sys.stderr)
        task_result = run_create(args)
        task_id = task_result.get('id')
        if not task_id:
            print(json.dumps(task_result, ensure_ascii=False, indent=2))
            sys.exit(1)

        print(f'Task ID: {task_id}', file=sys.stderr)
        result = wait_for_task(task_id, timeout=args.timeout)

        video_url = None
        for item in result.get('content', []):
            if item.get('type') == 'video_url':
                video_url = item.get('video_url', {}).get('url')
                break

        if video_url and args.output:
            download_video(video_url, args.output)

        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
