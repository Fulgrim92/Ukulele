import hashlib
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from lyrics_pipeline.cached_import import consensus, timing_consensus, prepare, Track


def record(text, **changes):
    return {'id': 1, 'artistName': 'Synthetic Artist', 'trackName': 'Synthetic Song',
            'albumName': 'Original', 'duration': 120, 'plainLyrics': text, **changes}


class CachedImportTests(unittest.TestCase):
    def test_timestamp_consensus_never_silently_selects_a_conflicting_timeline(self):
        track = Track('Synthetic Artist', 'Synthetic Song')
        one = record('One chord', syncedLyrics='[00:02]One chord')
        two = record('One chord', syncedLyrics='[00:02]One chord', id=2)
        self.assertEqual(timing_consensus(track, [one, two], 'One chord'), '[00:02]One chord')
        two['syncedLyrics'] = '[00:04]One chord'
        self.assertIsNone(timing_consensus(track, [one, two], 'One chord'))
        self.assertIsNone(timing_consensus(track, [one], 'Different words'))

    def test_equal_words_can_be_shared_without_claiming_recording_timing(self):
        text, candidates, _ = consensus(Track('Synthetic Artist', 'Synthetic Song'), [
            record('One small chord\nFour soft strings'),
            record('ONE small chord  Four soft strings', id=2, duration=130, albumName='Compilation')])
        self.assertEqual(text, 'One small chord\nFour soft strings')
        self.assertEqual(len(candidates), 2)

    def test_conflicts_repeats_and_other_artists_are_not_silently_chosen(self):
        track = Track('Synthetic Artist', 'Synthetic Song')
        self.assertIsNone(consensus(track, [record('One chord'), record('One chord\nOne chord', id=2)])[0])
        self.assertIsNone(consensus(track, [record('One chord', artistName='Cover Artist')])[0])
        self.assertIsNone(consensus(track, [record('One chord', trackName='Synthetic Song (Live)')])[0])

    def test_export_is_offline_preserves_input_and_is_resumable(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent) as directory:
            root = Path(directory)
            source, output = root / 'source', root / 'import'
            (source / '.pipeline').mkdir(parents=True)
            (source / 'manifest.json').write_text(json.dumps({'version': 1, 'tracks': [
                {'artist': 'Synthetic Artist', 'title': 'Synthetic Song', 'status': 'ambiguous'}]}))
            database = source / '.pipeline/state.sqlite3'
            db = sqlite3.connect(database)
            db.execute('CREATE TABLE http_cache (status INTEGER, payload TEXT)')
            db.execute('INSERT INTO http_cache VALUES (?,?)', (200, json.dumps([record('Four soft strings')])) )
            db.commit()
            db.close()
            before = hashlib.sha256(database.read_bytes()).hexdigest()
            self.assertEqual(prepare(source, output), {'success': 1})
            self.assertEqual(prepare(source, output), {'success': 1})
            self.assertEqual(hashlib.sha256(database.read_bytes()).hexdigest(), before)
            entry = json.loads((output / 'manifest.json').read_text())['tracks'][0]
            self.assertEqual(entry['format'], 'txt')
            self.assertFalse(entry['recording_timing_verified'])
            self.assertNotIn('match', entry)
            self.assertEqual((output / entry['lyrics_path']).read_text().strip(), 'Four soft strings')
            with self.assertRaises(ValueError):
                prepare(source, source)


if __name__ == '__main__':
    unittest.main()
