import argparse
import csv
import io
import itertools
import json
from pathlib import Path
import sys
from .client import ApiError, DEFAULT_AGENT
from .demo import run_demo
from .inputs import library_tracks, song_list
from .pipeline import atomic_write, run, spreadsheet_safe


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Resumable local LRCLIB lyrics pipeline. Lyrics stay outside the source code.")
    commands = parser.add_subparsers(dest="command", required=True)
    acquire = commands.add_parser("run", help="Acquire from local libraries and/or CSV/JSON song lists")
    acquire.add_argument("--library", action="append", default=[], metavar="FOLDER")
    acquire.add_argument("--songs", action="append", default=[], metavar="CSV_OR_JSON")
    acquire.add_argument("--output", default="lyrics-output", metavar="FOLDER")
    acquire.add_argument("--interval", type=float, default=1.0, help="Minimum seconds between sequential requests (default 1)")
    acquire.add_argument("--retries", type=int, default=4)
    acquire.add_argument("--timeout", type=float, default=25)
    acquire.add_argument("--user-agent", default=DEFAULT_AGENT)
    acquire.add_argument("--retry-unresolved", action="store_true", help="Revisit missing, ambiguous and invalid entries")
    acquire.add_argument("--refresh-cache", action="store_true", help="Discard cached API responses before this run")
    demo = commands.add_parser("demo", help="Run synthetic fixtures without any network access")
    demo.add_argument("--output", default="lyrics-output/synthetic-demo")
    prepare = commands.add_parser("prepare", help="Prepare an app import from your existing local response cache, without network access")
    prepare.add_argument("--source", required=True)
    prepare.add_argument("--output", required=True)
    prepare.add_argument("--timing", action="store_true", help="Retain only unanimous cached LRC timelines")
    scan = commands.add_parser("scan", help="Extract MP3/FLAC tags to CSV without network access")
    scan.add_argument("--library", action="append", required=True)
    scan.add_argument("--output", required=True, metavar="CSV")
    args = parser.parse_args(argv)
    try:
        if args.command == "prepare":
            from .cached_import import prepare as prepare_import
            counts = prepare_import(args.source, args.output, include_timing=args.timing)
        elif args.command == "demo":
            counts = run_demo(args.output)
        elif args.command == "scan":
            buffer = io.StringIO(newline="")
            fields = ["artist", "title", "album", "duration", "source", "input_error"]
            writer = csv.DictWriter(buffer, fieldnames=fields)
            writer.writeheader()
            count = 0
            for root in args.library:
                for track in library_tracks(root):
                    writer.writerow({k: spreadsheet_safe(v) for k, v in track.as_dict().items()})
                    count += 1
            atomic_write(args.output, buffer.getvalue())
            print(f"Extracted {count} tracks to {args.output}. No network requests were made.")
            return 0
        else:
            if not args.library and not args.songs:
                parser.error("run needs --library or --songs")
            for name in args.songs:
                if not Path(name).is_file():
                    parser.error(f"Song list not found: {name}")
            tracks = itertools.chain.from_iterable([*(library_tracks(p) for p in args.library), *(song_list(p) for p in args.songs)])
            counts = run(tracks, args.output, retry_unresolved=args.retry_unresolved, refresh_cache=args.refresh_cache,
                         interval=args.interval, retries=args.retries, timeout=args.timeout, user_agent=args.user_agent)
        print("Run complete: " + json.dumps(counts, sort_keys=True))
        print(f"Collection: {Path(args.output).resolve()}\nReview unresolved.csv for missing, ambiguous or failed matches.")
        return 0
    except KeyboardInterrupt:
        print("\nStopped. Completed tracks and reports are saved; run the same command to resume.", file=sys.stderr)
        return 130
    except (ApiError, OSError, ValueError, RuntimeError) as exc:
        print(f"Could not complete this run: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
