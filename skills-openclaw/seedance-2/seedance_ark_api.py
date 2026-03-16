#!/usr/bin/env python3
"""
Seedance 2.0 视频生成 - 火山方舟 Ark API CLI

直接调用火山方舟官方 API 生成视频，支持文生视频和图生视频。

Usage:
  python seedance_ark_api.py generate --prompt PROMPT [--image_url URL] [--duration SEC] [--resolution RES] [--aspect_ratio RATIO] [--model MODEL] [--no-audio]
  python seedance_ark_api.py get --task_id TASK_ID
  python seedance_ark_api.py wait --task_id TASK_ID [--timeout SEC] [--interval SEC]
  python seedance_ark_api.py run --prompt PROMPT [--image_url URL] [--duration SEC] [--resolution RES] [--output PATH]
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
DEFAULT_MODEL = os.environ.get('SEEDANCE_MODEL', 'doubao-seedance-2-0-pro-260215')


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


def create_task(prompt, image_url=None, model=None, duration=None,
                resolution=None, aspect_ratio=None, generate_audio=True, seed=None):
    """Create a video generation task."""
    content = []

    if image_url:
        content.append({
            'type': 'image_url',
            'image_url': {'url': image_url}
        })

    content.append({
        'type': 'text',
        'text': prompt
    })

    body = {
        'model': model or DEFAULT_MODEL,
        'content': content,
    }

    extra = {}
    if duration is not None:
        extra['duration'] = str(duration)
    if resolution is not None:
        extra['resolution'] = resolution
    if aspect_ratio is not None:
        extra['aspect_ratio'] = aspect_ratio
    if not generate_audio:
        extra['generate_audio'] = False
    if seed is not None:
        extra['seed'] = int(seed)

    if extra:
        body['extra'] = extra

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


def main():
    parser = argparse.ArgumentParser(description='Seedance 2.0 - Volcengine Ark API CLI')
    subparsers = parser.add_subparsers(dest='command')

    # generate: create task and return task_id
    p_gen = subparsers.add_parser('generate', help='Submit a video generation task')
    p_gen.add_argument('--prompt', required=True, help='Video generation prompt')
    p_gen.add_argument('--image_url', help='First-frame image URL (for image-to-video)')
    p_gen.add_argument('--model', default=None, help=f'Model name (default: {DEFAULT_MODEL})')
    p_gen.add_argument('--duration', type=int, default=5, help='Video duration in seconds (4-15)')
    p_gen.add_argument('--resolution', default='720p', help='Resolution: 480p/720p/1080p')
    p_gen.add_argument('--aspect_ratio', default='16:9', help='Aspect ratio: 16:9/9:16/1:1/4:3/3:4/21:9')
    p_gen.add_argument('--no-audio', action='store_true', help='Disable audio generation')
    p_gen.add_argument('--seed', type=int, help='Random seed (-1 for random)')

    # get: query task status
    p_get = subparsers.add_parser('get', help='Query task status')
    p_get.add_argument('--task_id', required=True, help='Task ID to query')

    # wait: poll until task completes
    p_wait = subparsers.add_parser('wait', help='Wait for task completion')
    p_wait.add_argument('--task_id', required=True, help='Task ID to wait for')
    p_wait.add_argument('--timeout', type=int, default=600, help='Max wait seconds (default: 600)')
    p_wait.add_argument('--interval', type=int, default=10, help='Poll interval seconds (default: 10)')

    # run: generate + wait + optional download (all-in-one)
    p_run = subparsers.add_parser('run', help='Generate, wait, and optionally download')
    p_run.add_argument('--prompt', required=True, help='Video generation prompt')
    p_run.add_argument('--image_url', help='First-frame image URL')
    p_run.add_argument('--model', default=None, help=f'Model name (default: {DEFAULT_MODEL})')
    p_run.add_argument('--duration', type=int, default=5, help='Video duration (4-15s)')
    p_run.add_argument('--resolution', default='720p', help='Resolution: 480p/720p/1080p')
    p_run.add_argument('--aspect_ratio', default='16:9', help='Aspect ratio')
    p_run.add_argument('--no-audio', action='store_true', help='Disable audio generation')
    p_run.add_argument('--seed', type=int, help='Random seed')
    p_run.add_argument('--output', '-o', help='Download video to this path')
    p_run.add_argument('--timeout', type=int, default=600, help='Max wait seconds')

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    if not ARK_API_KEY:
        print('Error: ARK_API_KEY not set. Add it to .env or export it.', file=sys.stderr)
        sys.exit(1)

    if args.command == 'generate':
        result = create_task(
            prompt=args.prompt,
            image_url=args.image_url,
            model=args.model,
            duration=args.duration,
            resolution=args.resolution,
            aspect_ratio=args.aspect_ratio,
            generate_audio=not args.no_audio,
            seed=args.seed,
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif args.command == 'get':
        result = get_task(args.task_id)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif args.command == 'wait':
        result = wait_for_task(args.task_id, timeout=args.timeout, interval=args.interval)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif args.command == 'run':
        print('Submitting task...', file=sys.stderr)
        task_result = create_task(
            prompt=args.prompt,
            image_url=args.image_url,
            model=args.model,
            duration=args.duration,
            resolution=args.resolution,
            aspect_ratio=args.aspect_ratio,
            generate_audio=not args.no_audio,
            seed=args.seed,
        )
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
