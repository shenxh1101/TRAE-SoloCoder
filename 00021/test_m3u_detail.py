#!/usr/bin/env python3
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import Song, Playlist
from utils import M3UManager
from datetime import datetime

def test_m3u():
    print("=" * 60)
    print("测试 M3U 导入导出详细内容")
    print("=" * 60)
    
    songs = [
        Song(id='s1', title='测试歌曲1', artist='艺术家A', album='专辑1', 
             file_path='/tmp/test1.mp3', genre='摇滚', mood='快乐', 
             rating=5, duration=180.5),
        Song(id='s2', title='测试歌曲2', artist='艺术家B', album='专辑2', 
             file_path='/tmp/test2.mp3', genre='流行', mood='悲伤', 
             rating=4, duration=240.0),
    ]
    
    playlist = Playlist(id='test', name='测试导出', songs=songs, 
                       created_at=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    
    temp_file = tempfile.mktemp(suffix='.m3u')
    success = M3UManager.export_playlist(playlist, temp_file)
    
    print(f"导出成功: {success}")
    print(f"\nM3U文件内容:")
    print("=" * 60)
    with open(temp_file, 'r') as f:
        content = f.read()
        print(content)
    print("=" * 60)
    
    imported = M3UManager.import_playlist(temp_file)
    print(f"\n导入歌曲数: {len(imported)}")
    for i, song in enumerate(imported, 1):
        print(f"  {i}. {song.get('title')} - {song.get('artist')}")
        print(f"     流派: {song.get('genre')}, 心情: {song.get('mood')}, 评分: {song.get('rating')}")
        print(f"     文件: {song.get('file_path')}")
    
    os.remove(temp_file)
    print("\n✅ M3U导入导出验证完成")
    return True

if __name__ == "__main__":
    test_m3u()
