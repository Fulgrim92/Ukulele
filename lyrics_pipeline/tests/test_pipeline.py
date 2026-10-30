import csv
import io
import json
import math
import os
from pathlib import Path
import sqlite3
import struct
import subprocess
import sys
import tempfile
import unittest
import urllib.error
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '.python-deps'))
(ROOT / 'test-results').mkdir(exist_ok=True)
from lyrics_pipeline.client import LRCLIBClient, ApiError, AccessError, retry_seconds, SameOriginRedirect
from lyrics_pipeline.demo import ARTIST, ALBUM, TRACKS, run_demo, synthetic_record, synthetic_transport
from lyrics_pipeline.inputs import song_list, duration_seconds, library_tracks, audio_track
from lyrics_pipeline.matching import choose_match, compatible, retrieve
from lyrics_pipeline.models import Track, normalize
from lyrics_pipeline.pipeline import run, safe_component, open_state, spreadsheet_safe, output_lock
from lyrics_pipeline.runtime import load_lyrics, load_manifest


class Clock:
    def __init__(self):
        self.value = 0
        self.waits = []
    def sleep(self, delay):
        self.waits.append(delay)
        self.value += delay
    def now(self):
        return self.value


class ClientTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.clock = Clock()
        self.calls = []
    def tearDown(self):
        self.db.close()
    def client(self, replies, **options):
        def send(url, headers, timeout):
            self.calls.append((url, headers))
            result = replies.pop(0)
            if isinstance(result, Exception):
                raise result
            return result
        return LRCLIBClient(self.db, send=send, sleep=self.clock.sleep, clock=self.clock.now, wall=self.clock.now, jitter=lambda a,b: 0, **options)
    def test_cache_and_minimum_sequential_interval(self):
        reply = (200, {'Content-Type': 'application/json'}, b'[]')
        client = self.client([reply, reply, reply])
        self.assertEqual(client.get('/api/search', {'track_name':'one'}), [])
        client.get('/api/search', {'track_name':'one'})
        client.get('/api/search', {'track_name':'two'})
        self.assertEqual(len(self.calls), 2)
        self.assertEqual(self.clock.value, 1)
        self.assertIn('FourStringsLyrics', self.calls[0][1]['User-Agent'])
        self.clock.value += 86401
        client.get('/api/search', {'track_name':'one'})
        self.assertEqual(len(self.calls), 3)
    def test_rate_limit_honors_retry_after_even_for_html(self):
        client = self.client([(429, {'Retry-After':'7'}, b'<html>slow down</html>'), (200, {'Content-Type':'application/json'}, b'[]')])
        client.get('/api/search', {'track_name':'one'})
        self.assertGreaterEqual(self.clock.value, 7)
        self.assertEqual(len(self.calls), 2)
        self.assertEqual(retry_seconds('Thu, 01 Jan 1970 00:00:09 GMT', 0), 9)
    def test_network_and_server_errors_retry_without_caching_failures(self):
        client = self.client([urllib.error.URLError('offline'), (503, {'Retry-After':'3'}, b'busy'), (200, {'Content-Type':'application/json'}, b'[]')])
        client.get('/api/search', {'track_name':'one'})
        self.assertEqual(len(self.calls), 3)
        self.assertGreaterEqual(self.clock.value, 4)
    def test_final_retry_after_also_prevents_next_track_from_rushing(self):
        client = self.client([(429, {'Retry-After':'11'}, b'')], retries=0)
        with self.assertRaises(ApiError):
            client.get('/api/search', {'track_name':'one'})
        self.assertGreaterEqual(self.clock.value, 11)
        self.assertEqual(self.db.execute('select count(*) from http_cache').fetchone()[0], 0)
    def test_denied_access_and_bad_request_are_not_retried(self):
        for status in [401,403,400]:
            client = self.client([(status, {}, b'')])
            with self.assertRaises(AccessError if status in (401,403) else ApiError):
                client.get('/api/get', {'track_name':str(status)})
        self.assertEqual(len(self.calls), 3)
    def test_non_json_and_malformed_responses_are_rejected(self):
        for headers, body in [({'Content-Type':'text/html'},b'<html>'),({'Content-Type':'application/json'},b'{'),({'Content-Type':'application/json'},b'5')]:
            client = self.client([(200, headers, body)])
            with self.assertRaises(ApiError):
                client.get('/api/search', {'track_name':str(len(self.calls))})
    def test_404_negative_cache(self):
        client = self.client([(404, {}, b'')])
        self.assertIsNone(client.get('/api/get', {'track_name':'missing'}))
        self.assertIsNone(client.get('/api/get', {'track_name':'missing'}))
        self.assertEqual(len(self.calls), 1)
    def test_redirects_cannot_forward_credentials_to_another_origin(self):
        with self.assertRaises(AccessError):
            SameOriginRedirect().redirect_request(None,None,302,'',{},'https://another.example/lyrics')
        with self.assertRaises(AccessError):
            SameOriginRedirect().redirect_request(None,None,302,'',{},'http://lrclib.net/api/get')


class MatchingTests(unittest.TestCase):
    def test_artist_version_album_and_duration_are_checked(self):
        track = TRACKS[0]
        record = synthetic_record(track.title)
        self.assertTrue(compatible(track, record))
        for change in [{'artistName':'A cover artist'}, {'trackName':track.title+' (Live)'}, {'trackName':track.title+' Remix'}, {'albumName':'Another album'}, {'duration':123}, {'duration':float('nan')}]:
            self.assertFalse(compatible(track, {**record, **change}))
        self.assertTrue(compatible(track, {**record, 'duration':122}))
    def test_ambiguity_is_not_silently_resolved_by_first_result(self):
        track = Track(ARTIST, 'Echo Study')
        first = synthetic_record(track.title)
        second = {**first, 'id':102, 'albumName':'Other edition'}
        self.assertEqual(choose_match(track, [first,second])[0], 'ambiguous')
    def test_prefer_lrc_plain_fallback_and_instrumental(self):
        record = synthetic_record(TRACKS[0].title)
        plain = {**record, 'id':102, 'syncedLyrics':None}
        self.assertEqual(choose_match(TRACKS[0],[plain,record])[1]['id'],101)
        self.assertEqual(choose_match(TRACKS[0],[plain])[0],'success')
        self.assertEqual(choose_match(TRACKS[0],[{**record,'syncedLyrics':None,'plainLyrics':None}])[0],'missing')
        self.assertEqual(choose_match(TRACKS[0],[{**plain,'instrumental':True}])[0],'instrumental')
    def test_missing_metadata_forces_search_to_check_for_alternate_versions(self):
        calls=[]
        class Client:
            def get(self, endpoint, params):
                calls.append(endpoint)
                result = synthetic_record('Echo Study')
                return result if endpoint.endswith('/get') else [result,{**result,'albumName':'Other'}]
        self.assertEqual(retrieve(Track(ARTIST,'Echo Study'),Client())[0],'ambiguous')
        self.assertEqual(calls,['/api/get','/api/search'])
    def test_normalization_retains_non_latin_identity(self):
        self.assertEqual(normalize('Beyoncé'),normalize('Beyonce'))
        self.assertNotEqual(normalize('你好'),normalize('再见'))


class InputTests(unittest.TestCase):
    def test_csv_json_aliases_duration_and_invalid_rows(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'test-results') as folder:
            csv_path=Path(folder)/'songs.csv'
            csv_path.write_text('artist,title,album,duration\nTest Artist,Test Title,Study,03:20\nTest Artist,Bad duration,,oops\n',encoding='utf-8')
            rows=list(song_list(csv_path))
            self.assertEqual(rows[0].duration,200)
            self.assertTrue(rows[1].input_error)
            json_path=Path(folder)/'songs.json'
            json_path.write_text(json.dumps({'tracks':[{'artist_name':'Test','track_name':'Song','duration_seconds':12},'invalid']}))
            rows=list(song_list(json_path))
            self.assertEqual(rows[0].title,'Song')
            self.assertTrue(rows[1].input_error)
            self.assertEqual(duration_seconds('1:02:03'),3723)
    def test_reads_actual_synthetic_mp3_and_flac_tags_without_modifying_files(self):
        from mutagen.flac import FLAC
        from mutagen.id3 import ID3,TIT2,TPE1,TALB
        with tempfile.TemporaryDirectory(dir=ROOT / 'test-results') as folder:
            root=Path(folder)
            # Valid synthetic FLAC STREAMINFO: two seconds of mono 16-bit, with no musical content.
            packed=(44100<<44)|(15<<36)|88200
            stream=struct.pack('>HH',4096,4096)+bytes(6)+packed.to_bytes(8,'big')+bytes(16)
            flac=root/'sample.FLAC'
            flac.write_bytes(b'fLaC'+b'\x80'+len(stream).to_bytes(3,'big')+stream)
            audio=FLAC(flac);audio['title']='Synthetic FLAC';audio['artist']=ARTIST;audio['album']=ALBUM;audio.save()
            mp3=root/'sample.mp3';mp3.write_bytes((b'\xff\xfb\x90\x00'+bytes(413))*50)
            tags=ID3();tags.add(TIT2(encoding=3,text=['Synthetic MP3']));tags.add(TPE1(encoding=3,text=[ARTIST]));tags.add(TALB(encoding=3,text=[ALBUM]));tags.save(mp3)
            before={p:p.read_bytes() for p in (flac,mp3)}
            tracks=list(library_tracks(root))
            self.assertEqual({t.title for t in tracks},{'Synthetic FLAC','Synthetic MP3'})
            self.assertTrue(all(t.artist==ARTIST and t.album==ALBUM and t.duration>0 for t in tracks))
            self.assertEqual(next(t for t in tracks if 'FLAC' in t.title).duration,2)
            self.assertTrue(all(p.read_bytes()==data for p,data in before.items()))
    def test_broken_files_and_missing_tags_are_reportable(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'test-results') as folder:
            path=Path(folder)/'broken.mp3';path.write_bytes(b'not audio')
            self.assertTrue(audio_track(path).input_error)
        with self.assertRaises(ValueError):
            Track('Artist','Song',duration=float('nan')).validate()


class PipelineTests(unittest.TestCase):
    def test_retry_unresolved_refreshes_cache_and_errors_retry_automatically(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'test-results') as folder:
            run_demo(folder,log=lambda s:None)
            calls=[]
            def available(url,headers,timeout):
                calls.append(url)
                query=parse_qs(urlparse(url).query);title=query['track_name'][0]
                if title=='Unwritten Tune':
                    record=synthetic_record(title,duration=80)
                    return 200,{'Content-Type':'application/json'},json.dumps(record).encode()
                return synthetic_transport(url,headers,timeout)
            factory=lambda db,**kw:LRCLIBClient(db,send=available,sleep=lambda s:None,**kw)
            counts=run(TRACKS,folder,retry_unresolved=True,refresh_cache=True,client_factory=factory,log=lambda s:None)
            self.assertEqual(counts,{'skipped':3,'ambiguous':1,'success':1})
            self.assertEqual(len(calls),3)
    def test_synthetic_end_to_end_resume_corruption_repair_and_runtime_loading(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'test-results') as folder:
            counts=run_demo(folder,log=lambda s:None)
            self.assertEqual(counts,{'success':2,'ambiguous':1,'instrumental':1,'missing':1})
            manifest=load_manifest(folder)
            self.assertEqual(len(manifest['tracks']),5)
            entry=next(t for t in manifest['tracks'] if t['title']=='Practice Dawn')
            loaded=load_lyrics(folder,entry['id'])
            self.assertEqual(loaded['format'],'lrc')
            self.assertTrue(loaded['text'].startswith('[00:00.00]'))
            self.assertTrue((Path(folder)/entry['plain_path']).is_file())
            self.assertNotIn('One small chord',json.dumps(manifest))
            self.assertEqual(run_demo(folder,log=lambda s:None),{'skipped':5})
            (Path(folder)/entry['lyrics_path']).write_text('damaged')
            self.assertEqual(run_demo(folder,log=lambda s:None),{'success':1,'skipped':4})
            self.assertEqual(load_lyrics(folder,entry['id'])['text'],loaded['text'])
            with (Path(folder)/'unresolved.csv').open(newline='',encoding='utf-8') as handle:
                self.assertEqual({r['status'] for r in csv.DictReader(handle)},{'missing','ambiguous'})
    def test_interrupt_saves_completed_tracks_and_next_run_resumes(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'test-results') as folder:
            def interrupted():
                yield TRACKS[0]
                raise KeyboardInterrupt()
            factory=lambda db,**kw:LRCLIBClient(db,send=synthetic_transport,sleep=lambda s:None,**kw)
            with self.assertRaises(KeyboardInterrupt):
                run(interrupted(),folder,client_factory=factory,log=lambda s:None)
            self.assertEqual(len(load_manifest(folder)['tracks']),1)
            result=run(TRACKS,folder,client_factory=factory,log=lambda s:None)
            self.assertEqual(result['skipped'],1)
    def test_access_denial_stops_batch_and_records_error(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'test-results') as folder:
            calls=[]
            def denied(url,headers,timeout):
                calls.append(url);return 403,{},b''
            factory=lambda db,**kw:LRCLIBClient(db,send=denied,**kw)
            with self.assertRaises(AccessError):
                run(TRACKS,folder,client_factory=factory,log=lambda s:None)
            self.assertEqual(len(calls),1)
            self.assertEqual(load_manifest(folder)['tracks'][0]['status'],'error')
    def test_invalid_tracks_duplicate_inputs_and_csv_formula_safety(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'test-results') as folder:
            invalid=Track('=Unsafe formula','Study',duration=float('nan'))
            result=run([invalid,invalid],folder,log=lambda s:None)
            self.assertEqual(result,{'invalid':1,'duplicate_inputs':1})
            self.assertIn("'=Unsafe formula",(Path(folder)/'unresolved.csv').read_text())
            self.assertEqual(safe_component('../CON'), '_CON')
            self.assertEqual(safe_component('NUL'),'_NUL')
    def test_runtime_rejects_path_traversal(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'test-results') as folder:
            root=Path(folder)
            (root/'manifest.json').write_text(json.dumps({'version':1,'tracks':[{'id':'test','status':'success','lyrics_path':'../outside.txt','format':'txt'}]}))
            with self.assertRaises(ValueError):
                load_lyrics(root,'test')
    def test_cli_offline_demo(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'test-results') as folder:
            result=subprocess.run([sys.executable,'-m','lyrics_pipeline','demo','--output',folder],cwd=ROOT,capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertIn('Run complete',result.stdout)
            self.assertNotIn('One small chord',result.stdout)

    def test_thousand_tracks_resume_without_any_more_requests(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'test-results') as folder:
            requests=[]
            def send(url,headers,timeout):
                query=parse_qs(urlparse(url).query);title=query['track_name'][0];requests.append(title)
                record=synthetic_record(title,duration=60,syncedLyrics=None,plainLyrics='Original synthetic scale-test words')
                return 200,{'Content-Type':'application/json'},json.dumps(record).encode()
            factory=lambda db,**kw:LRCLIBClient(db,send=send,sleep=lambda s:None,**kw)
            tracks=[Track(ARTIST,f'Scale Study {i}',ALBUM,60) for i in range(1000)]
            result=run(tracks,folder,client_factory=factory,log=lambda s:None)
            self.assertEqual(result,{'success':1000})
            self.assertEqual(len(load_manifest(folder)['tracks']),1000)
            self.assertEqual(run(tracks,folder,client_factory=factory,log=lambda s:None),{'skipped':1000})
            self.assertEqual(len(requests),1000)


if __name__=='__main__':
    unittest.main()
