#!/usr/bin/env python3
"""
Poll GET /api/metrics and log CPU/RAM for deployment sizing.

Usage:
  python scripts/measure_resources.py [--base-url URL] [--interval SEC] [--duration MIN] [--output CSV]

Ensure the backend is running (e.g. docker-compose up) before running.
"""

import argparse
import csv
import sys
import time
from datetime import datetime

try:
    import requests
except ImportError:
    print("Install requests: pip install requests", file=sys.stderr)
    sys.exit(1)


def main():
    p = argparse.ArgumentParser(description="Poll /api/metrics and log resources for sizing.")
    p.add_argument("--base-url", default="http://localhost:5000", help="Backend base URL")
    p.add_argument("--interval", type=float, default=5, help="Seconds between polls")
    p.add_argument("--duration", type=float, default=2, help="Minutes to run")
    p.add_argument("--output", "-o", help="Write CSV to this file (default: stdout only)")
    args = p.parse_args()

    url = args.base_url.rstrip("/") + "/api/metrics"
    end_time = time.time() + args.duration * 60
    rows = []
    headers = ["timestamp", "cpu_percent", "memory_rss_mb", "memory_vms_mb"]

    print(f"Polling {url} every {args.interval}s for {args.duration} min... (Ctrl+C to stop early)", file=sys.stderr)

    while time.time() < end_time:
        try:
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            data = r.json()
            proc = data.get("process", {})
            ts = datetime.utcnow().isoformat() + "Z"
            row = {
                "timestamp": ts,
                "cpu_percent": proc.get("cpu_percent"),
                "memory_rss_mb": proc.get("memory_rss_mb"),
                "memory_vms_mb": proc.get("memory_vms_mb"),
            }
            rows.append(row)
            print(f"{ts}  cpu={row['cpu_percent']}%  rss_mb={row['memory_rss_mb']}  vms_mb={row['memory_vms_mb']}", file=sys.stderr)
        except requests.RequestException as e:
            print(f"Request failed: {e}", file=sys.stderr)
        except (KeyError, TypeError) as e:
            print(f"Unexpected response: {e}", file=sys.stderr)
        time.sleep(args.interval)

    if args.output and rows:
        with open(args.output, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=headers)
            w.writeheader()
            w.writerows(rows)
        print(f"Wrote {len(rows)} rows to {args.output}", file=sys.stderr)
    elif rows:
        print("\nSample CSV (paste into a file if needed):", file=sys.stderr)
        out = sys.stdout
        w = csv.DictWriter(out, fieldnames=headers)
        w.writeheader()
        w.writerows(rows)


if __name__ == "__main__":
    main()
