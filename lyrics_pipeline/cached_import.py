"""Prepare a private app import from a user-supplied pipeline cache, offline.

Only identical plain text across all compatible cached versions is accepted.
Optional unanimous LRC timing can be retained. No network code runs.
"""
import argparse
from collections import Counter
import csv
import io
import json
from pathlib import Path
import re
import sqlite3
import sys

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT))
from lyrics_pipeline.models import Track
from lyrics_pipeline.matching import compatible, usable_lrc, candidate_summary
from lyrics_pipeline.pipeline import (atomic_write, json_text, output_lock,
                                     plain_from_lrc, spreadsheet_safe, write_result)


def consensus(track, records):
    texts = {}
    candidates = []
    for record in records:
        if not compatible(track, record):
            continue
        if record.get('instrumental'):
            return None, [], 'Cached versions disagree about whether this song has vocals.'
        text = record.get('plainLyrics')
        if not isinstance(text, str) or not text.strip():
            text = plain_from_lrc(record['syncedLyrics']) if usable_lrc(record.get('syncedLyrics')) else ''
        if not text.strip():
            continue
        # Only whitespace/case differences collapse. Repeats and words stay significant.
        key = re.sub(r'\s+', ' ', text.strip()).casefold()
        texts.setdefault(key, text.strip())
        candidates.append(candidate_summary(record))
    if len(texts) > 1:
        return None, candidates, 'Different cached lyric texts remain; review the recording version.'
    if not texts:
        return None, candidates, 'No compatible lyric text in the supplied local cache.'
    text = next(iter(texts.values()))
    if len(text) > 100000 or len(text.splitlines()) > 1000:
        return None, candidates, 'Text exceeds the app import limit.'
    return text, candidates, 'Compatible cached versions agree on plain text; recording timing is unverified.'


def timing_consensus(track, records, text):
    expected = re.sub(r'\s+', ' ', text.strip()).casefold()
    versions = set()
    for record in records:
        lrc = record.get('syncedLyrics')
        if compatible(track, record) and usable_lrc(lrc):
            words = re.sub(r'\s+', ' ', plain_from_lrc(lrc).strip()).casefold()
            if words == expected:
                versions.add(lrc.strip())
    return next(iter(versions)) if len(versions) == 1 else None


def prepare(source, output, *, include_timing=False):
    source, output = Path(source).resolve(), Path(output).resolve()
    if output == source or output.is_relative_to(source) or source.is_relative_to(output):
        raise ValueError('Use a separate sibling output folder to preserve the supplied collection.')
    if output.is_relative_to(PROJECT / 'dist'):
        raise ValueError('Keep the import outside the published app assets.')
    manifest = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
    if manifest.get('version') != 1 or not isinstance(manifest.get('tracks'), list):
        raise ValueError('Unsupported source manifest.')
    records = []
    # URI read-only mode does not create a database or update its cache/state.
    db = sqlite3.connect((source / '.pipeline/state.sqlite3').as_uri() + '?mode=ro', uri=True)
    try:
        for (payload,) in db.execute('SELECT payload FROM http_cache WHERE status=200'):
            data = json.loads(payload)
            records.extend(r for r in (data if isinstance(data, list) else [data]) if isinstance(r, dict))
    finally:
        db.close()
    entries = []
    with output_lock(output):
        for original in manifest['tracks']:
            track = Track(original['artist'], original['title'], original.get('album') or '', original.get('duration'))
            track.validate()
            text, candidates, reason = consensus(track, records)
            status = 'success' if text else 'ambiguous' if candidates else 'missing'
            # This is a text consensus, not a claim to have selected a recording.
            record = {'artistName': track.artist, 'trackName': track.title, 'plainLyrics': text} if text else None
            lrc = timing_consensus(track, records, text) if text and include_timing else None
            if lrc:
                record['syncedLyrics'] = lrc
            entry = write_result(output, track, status, record, candidates, reason)
            entry['input_status'] = original.get('status')
            entry['match_scope'] = 'cached_plain_text_consensus' if text else 'unresolved'
            entry['recording_timing_verified'] = False
            entry['cached_timing_consensus'] = bool(lrc)
            entry['source_collection'] = str(source)
            entry.pop('match', None)
            atomic_write(output / entry['metadata_path'], json_text(entry))
            from lyrics_pipeline.pipeline import file_hash
            entry['files'][entry['metadata_path']] = file_hash(output / entry['metadata_path'])
            entries.append(entry)
        atomic_write(output / 'manifest.json', json_text({'version': 1, 'provider': 'User-supplied LRCLIB cache (offline)', 'tracks': entries}))
        report = io.StringIO(newline='')
        fields = ['artist', 'title', 'status', 'reason', 'input_status']
        writer = csv.DictWriter(report, fieldnames=fields)
        writer.writeheader()
        for entry in entries:
            if entry['status'] != 'success':
                writer.writerow({key: spreadsheet_safe(entry.get(key)) for key in fields})
        atomic_write(output / 'unresolved.csv', report.getvalue())
        atomic_write(output / 'README.txt', 'Prepared offline from your supplied cached responses.\n'
                     'Only agreeing texts are included. With --timing, unanimous cached LRC is retained.\n'
                     'In Four Strings choose Practice studio > Import lyric collection and select this folder.\n'
                     'TXT imports use manual lyric advance; approximate bar following is optional in Edit.\n'
                     'Existing saved lyrics are kept. See unresolved.csv for remaining songs.\n')
    return dict(Counter(entry['status'] for entry in entries))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--timing', action='store_true', help='Retain LRC only when all matching cached timing versions agree')
    args = parser.parse_args()
    print(json.dumps(prepare(args.source, args.output, include_timing=args.timing), sort_keys=True))
