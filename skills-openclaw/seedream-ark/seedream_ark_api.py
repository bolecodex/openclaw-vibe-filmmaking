#!/usr/bin/env python3
"""
Seedream 图像生成 - 火山方舟 Ark API CLI

通过火山方舟 Ark 调用 Seedream 模型，支持文生图、图生图（与 seedance_ark_api 鉴权与请求风格一致）。

Usage:
  python seedream_ark_api.py generate --prompt PROMPT [--image_url URL] [--model MODEL] [--size SIZE] [--seed N]
  python seedream_ark_api.py get --task_id TASK_ID
  python seedream_ark_api.py wait --task_id TASK_ID [--timeout SEC] [--interval SEC]
  python seedream_ark_api.py run --prompt PROMPT [--image_url URL] [--model MODEL] [--size SIZE] [--output PATH]
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
DEFAULT_MODEL = os.environ.get('SEEDREAM_ARK_MODEL', 'doubao-seedream-4-5-251128')


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


def create_task(prompt, image_url=None, model=None, size=None, seed=None):
    """Create an image generation task (text-to-image or image-to-image)."""
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
    if size:
        extra['size'] = size
    if seed is not None:
        extra['seed'] = int(seed)
    if extra:
        body['extra'] = extra

    result = _request('POST', '/contents/generations/tasks', body)
    return result


def get_task(task_id):
    """Query task status."""
    return _request('GET', f'/contents/generations/tasks/{task_id}')


def wait_for_task(task_id, timeout=300, interval=5):
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


def extract_image_url(result):
    """Get first image URL from task result content."""
    for item in result.get('content', []):
        if item.get('type') == 'image_url':
            return item.get('image_url', {}).get('url')
        if item.get('type') == 'image':
            return item.get('url')
    return None


def download_image(url, output_path):
    """Download image to local file."""
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
    parser = argparse.ArgumentParser(description='Seedream - Volcengine Ark Image API CLI')
    subparsers = parser.add_subparsers(dest='command')

    p_gen = subparsers.add_parser('generate', help='Submit an image generation task')
    p_gen.add_argument('--prompt', required=True, help='Image generation prompt')
    p_gen.add_argument('--image_url', help='Input image URL (for image-to-image)')
    p_gen.add_argument('--model', default=None, help=f'Model name (default: {DEFAULT_MODEL})')
    p_gen.add_argument('--size', default='1024x1024', help='Image size e.g. 1024x1024, 1280x720')
    p_gen.add_argument('--seed', type=int, help='Random seed')

    p_get = subparsers.add_parser('get', help='Query task status')
    p_get.add_argument('--task_id', required=True, help='Task ID to query')

    p_wait = subparsers.add_parser('wait', help='Wait for task completion')
    p_wait.add_argument('--task_id', required=True, help='Task ID to wait for')
    p_wait.add_argument('--timeout', type=int, default=300, help='Max wait seconds (default: 300)')
    p_wait.add_argument('--interval', type=int, default=5, help='Poll interval seconds (default: 5)')

    p_run = subparsers.add_parser('run', help='Generate, wait, and optionally download')
    p_run.add_argument('--prompt', required=True, help='Image generation prompt')
    p_run.add_argument('--image_url', help='Input image URL (image-to-image)')
    p_run.add_argument('--model', default=None, help=f'Model name (default: {DEFAULT_MODEL})')
    p_run.add_argument('--size', default='1024x1024', help='Image size')
    p_run.add_argument('--seed', type=int, help='Random seed')
    p_run.add_argument('--output', '-o', help='Download image to this path')
    p_run.add_argument('--timeout', type=int, default=300, help='Max wait seconds')

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
            size=args.size,
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
            size=getattr(args, 'size', '1024x1024'),
            seed=getattr(args, 'seed', None),
        )
        task_id = task_result.get('id')
        if not task_id:
            print(json.dumps(task_result, ensure_ascii=False, indent=2))
            sys.exit(1)

        print(f'Task ID: {task_id}', file=sys.stderr)
        result = wait_for_task(task_id, timeout=args.timeout)

        image_url = extract_image_url(result)
        if image_url and getattr(args, 'output', None):
            download_image(image_url, args.output)

        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
