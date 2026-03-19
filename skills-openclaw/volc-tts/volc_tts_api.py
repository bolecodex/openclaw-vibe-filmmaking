#!/usr/bin/env python3
"""
豆包语音 TTS - 火山引擎 API CLI

调用火山引擎豆包语音合成（HTTP Chunked 同步 / 异步长文本），用于分镜配音等场景。
文档：https://www.volcengine.com/docs/6561/1598757（流式）、https://www.volcengine.com/docs/6561/1829010（异步长文本）

Usage:
  python volc_tts_api.py list_voices
  python volc_tts_api.py synthesize --text "文本" --voice_id SPEAKER_ID [--output PATH] [--format mp3]
  python volc_tts_api.py submit --text "长文本" --voice_id SPEAKER_ID
  python volc_tts_api.py query --task_id TASK_ID [--output PATH]
"""

import argparse
import base64
import json
import os
import sys
import time
import urllib.request
import urllib.error

# 常用豆包语音合成 2.0 音色（与 list_voices 输出一致，详见火山文档音色列表）
DEFAULT_VOICES = [
    {"id": "zh_female_shuangkuaisisi_moon_bigtts", "name": "双快思思", "tags": ["中文", "女"]},
    {"id": "zh_male_bvlazysheep", "name": "懒羊羊", "tags": ["中文", "男"]},
    {"id": "zh_female_xiaoxuan_moon_bigtts", "name": "小轩", "tags": ["中文", "女"]},
    {"id": "zh_male_ahu_conversation_wvae_bigtts", "name": "阿虎对话", "tags": ["中文", "男"]},
    {"id": "zh_female_coral_moon_bigtts", "name": "珊瑚", "tags": ["中文", "女"]},
    {"id": "zh_male_chunhou_wvae_bigtts", "name": "淳厚", "tags": ["中文", "男"]},
    {"id": "BV700_streaming", "name": "BV700", "tags": ["中文"]},
    {"id": "BV120_streaming", "name": "BV120", "tags": ["中文"]},
]


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

VOLC_APP_ID = os.environ.get('VOLC_APP_ID', '') or os.environ.get('VOLC_APPID', '')
VOLC_ACCESS_KEY = os.environ.get('VOLC_ACCESS_KEY', '') or os.environ.get('VOLC_TOKEN', '')
VOLC_TTS_RESOURCE_ID = os.environ.get('VOLC_TTS_RESOURCE_ID', 'seed-tts-2.0')
VOLC_TTS_BASE = os.environ.get('VOLC_TTS_BASE', 'https://openspeech.bytedance.com')


def _headers():
    return {
        'Content-Type': 'application/json',
        'X-Api-App-Id': VOLC_APP_ID,
        'X-Api-Access-Key': VOLC_ACCESS_KEY,
        'X-Api-Resource-Id': VOLC_TTS_RESOURCE_ID,
    }


def list_voices():
    """Return list of available speaker IDs (built-in list; 完整音色见火山控制台或 API)."""
    return {
        'public_voices': DEFAULT_VOICES,
        'note': 'Full list: https://www.volcengine.com/docs/6561/1257544',
    }


def synthesize_sync(text, voice_id, output_path=None, fmt='mp3', sample_rate=24000):
    """
    Synchronous TTS via HTTP Chunked. Collects base64 audio chunks and writes to file.
    Returns dict with audio_path and/or audio_url (if output_path given).
    """
    url = f'{VOLC_TTS_BASE.rstrip("/")}/api/v3/tts/unidirectional'
    body = {
        'user': {'uid': 'default'},
        'req_params': {
            'text': text,
            'speaker': voice_id,
            'audio_params': {'format': fmt, 'sample_rate': sample_rate},
        },
    }
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=_headers(), method='POST')

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode('utf-8')
        chunks = []
        for line in raw.splitlines():
            line = line.strip()
            if not line or not line.startswith('{'):
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if obj.get('code') == 20000000 and obj.get('message') == 'ok':
                break
            if obj.get('code') == 0 and obj.get('data'):
                chunks.append(base64.b64decode(obj['data']))
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8')
        try:
            detail = json.loads(detail)
        except json.JSONDecodeError:
            pass
        print(json.dumps({'error': f'HTTP {e.code}', 'detail': detail}, ensure_ascii=False, indent=2),
              file=sys.stderr)
        sys.exit(1)

    audio_bytes = b''.join(chunks)
    if not audio_bytes:
        print(json.dumps({'error': 'No audio data received'}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)

    result = {}
    if output_path:
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        with open(output_path, 'wb') as f:
            f.write(audio_bytes)
        result['audio_path'] = output_path
    result['audio_size'] = len(audio_bytes)
    return result


def submit_async(text, voice_id, unique_id=None, fmt='mp3', sample_rate=24000):
    """Submit long-text async task. Returns task_id."""
    url = f'{VOLC_TTS_BASE.rstrip("/")}/api/v3/tts/submit'
    body = {
        'user': {'uid': 'default'},
        'namespace': 'BidirectionalTTS',
        'req_params': {
            'text': text,
            'speaker': voice_id,
            'audio_params': {'format': fmt, 'sample_rate': sample_rate},
        },
    }
    if unique_id:
        body['unique_id'] = unique_id
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=_headers(), method='POST')

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            out = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8')
        try:
            detail = json.loads(detail)
        except json.JSONDecodeError:
            pass
        print(json.dumps({'error': f'HTTP {e.code}', 'detail': detail}, ensure_ascii=False, indent=2),
              file=sys.stderr)
        sys.exit(1)

    if out.get('code') != 20000000:
        print(json.dumps(out, ensure_ascii=False, indent=2), file=sys.stderr)
        sys.exit(1)
    return out.get('data', {}).get('task_id'), out


def query_async(task_id):
    """Query async task. Returns (task_status, data). task_status: 1=Running, 2=Success, 3=Failure."""
    url = f'{VOLC_TTS_BASE.rstrip("/")}/api/v3/tts/query'
    body = {'task_id': task_id}
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=_headers(), method='POST')

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            out = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8')
        try:
            detail = json.loads(detail)
        except json.JSONDecodeError:
            pass
        print(json.dumps({'error': f'HTTP {e.code}', 'detail': detail}, ensure_ascii=False, indent=2),
              file=sys.stderr)
        sys.exit(1)

    if out.get('code') != 20000000:
        return None, out
    data = out.get('data', {})
    return data.get('task_status'), data


def wait_and_download(task_id, output_path=None, timeout=300, interval=5):
    """Poll query until task_status=2, then optionally download audio_url to output_path."""
    start = time.time()
    while True:
        status, data = query_async(task_id)
        if status is None:
            print(json.dumps(data, ensure_ascii=False, indent=2), file=sys.stderr)
            sys.exit(1)
        if status == 2:
            url = data.get('audio_url')
            if url and output_path:
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req, timeout=120) as resp:
                    with open(output_path, 'wb') as f:
                        while True:
                            chunk = resp.read(8192)
                            if not chunk:
                                break
                            f.write(chunk)
            return {'task_id': task_id, 'task_status': status, 'audio_url': data.get('audio_url'), 'audio_path': output_path}
        if status == 3:
            print(json.dumps({'error': 'Task failed', 'data': data}, ensure_ascii=False, indent=2), file=sys.stderr)
            sys.exit(1)
        if time.time() - start > timeout:
            print(json.dumps({'error': 'Timeout', 'task_id': task_id}, ensure_ascii=False), file=sys.stderr)
            sys.exit(1)
        time.sleep(interval)


def main():
    parser = argparse.ArgumentParser(description='Volc TTS - 火山豆包语音 CLI')
    subparsers = parser.add_subparsers(dest='command')

    subparsers.add_parser('list_voices', help='List available voice IDs')

    p_syn = subparsers.add_parser('synthesize', help='Sync synthesize (short text)')
    p_syn.add_argument('--text', required=True, help='Text to synthesize')
    p_syn.add_argument('--voice_id', required=True, help='Speaker ID (e.g. zh_female_shuangkuaisisi_moon_bigtts)')
    p_syn.add_argument('--output', '-o', help='Output audio path (.mp3)')
    p_syn.add_argument('--format', default='mp3', help='Audio format: mp3 (default), ogg_opus, pcm')
    p_syn.add_argument('--sample_rate', type=int, default=24000, help='Sample rate')

    p_sub = subparsers.add_parser('submit', help='Submit async long-text task')
    p_sub.add_argument('--text', required=True, help='Long text')
    p_sub.add_argument('--voice_id', required=True, help='Speaker ID')
    p_sub.add_argument('--unique_id', help='Optional task id (uuid)')
    p_sub.add_argument('--format', default='mp3')
    p_sub.add_argument('--sample_rate', type=int, default=24000)

    p_q = subparsers.add_parser('query', help='Query async task')
    p_q.add_argument('--task_id', required=True)
    p_q.add_argument('--output', '-o', help='Download audio to path when done')

    p_w = subparsers.add_parser('wait', help='Submit + poll + optional download (async flow)')
    p_w.add_argument('--text', required=True)
    p_w.add_argument('--voice_id', required=True)
    p_w.add_argument('--output', '-o', help='Download to path when done')
    p_w.add_argument('--timeout', type=int, default=300)
    p_w.add_argument('--interval', type=int, default=5)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command != 'list_voices' and (not VOLC_APP_ID or not VOLC_ACCESS_KEY):
        print('Error: VOLC_APP_ID and VOLC_ACCESS_KEY (or VOLC_TOKEN) must be set.', file=sys.stderr)
        sys.exit(1)

    if args.command == 'list_voices':
        print(json.dumps(list_voices(), ensure_ascii=False, indent=2))

    elif args.command == 'synthesize':
        out = synthesize_sync(
            text=args.text,
            voice_id=args.voice_id,
            output_path=args.output,
            fmt=args.format,
            sample_rate=args.sample_rate,
        )
        print(json.dumps(out, ensure_ascii=False, indent=2))

    elif args.command == 'submit':
        task_id, full = submit_async(
            text=args.text,
            voice_id=args.voice_id,
            unique_id=getattr(args, 'unique_id', None),
            fmt=getattr(args, 'format', 'mp3'),
            sample_rate=getattr(args, 'sample_rate', 24000),
        )
        print(json.dumps({'task_id': task_id, **full}, ensure_ascii=False, indent=2))

    elif args.command == 'query':
        status, data = query_async(args.task_id)
        out = {'task_status': status, **data}
        if status == 2 and args.output and data.get('audio_url'):
            req = urllib.request.Request(data['audio_url'])
            with urllib.request.urlopen(req, timeout=120) as resp:
                with open(args.output, 'wb') as f:
                    while True:
                        chunk = resp.read(8192)
                        if not chunk:
                            break
                        f.write(chunk)
            out['audio_path'] = args.output
        print(json.dumps(out, ensure_ascii=False, indent=2))

    elif args.command == 'wait':
        task_id, _ = submit_async(args.text, args.voice_id, fmt='mp3', sample_rate=24000)
        result = wait_and_download(task_id, output_path=args.output, timeout=args.timeout, interval=args.interval)
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
