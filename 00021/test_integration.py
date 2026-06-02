#!/usr/bin/env python3
import os
import sys
import tempfile
import shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from music_manager import MusicManagerCLI
from models import Song, Playlist
from utils import generate_song_id
from datetime import datetime


def test_cli_initialization():
    print("=" * 60)
    print("集成测试 1: CLI 初始化")
    print("=" * 60)
    
    temp_dir = tempfile.mkdtemp()
    original_home = os.environ.get('HOME')
    
    try:
        os.environ['HOME'] = temp_dir
        
        cli = MusicManagerCLI()
        print(f"  CLI初始化成功")
        print(f"  当前播放列表: {cli.current_playlist}")
        print(f"  配置管理器: {'已初始化' if cli.config_manager else '未初始化'}")
        print(f"  推荐引擎: {'已初始化' if cli.recommender else '未初始化'}")
        print(f"  播放器: {'已初始化' if cli.player else '未初始化'}")
        
        print("  ✅ CLI初始化测试通过!\n")
        return True
    finally:
        if original_home:
            os.environ['HOME'] = original_home
        shutil.rmtree(temp_dir)


def test_full_workflow():
    print("=" * 60)
    print("集成测试 2: 完整工作流模拟")
    print("=" * 60)
    
    temp_dir = tempfile.mkdtemp()
    original_home = os.environ.get('HOME')
    
    try:
        os.environ['HOME'] = temp_dir
        
        cli = MusicManagerCLI()
        
        print("  步骤1: 创建播放列表")
        playlist_id = cli.config_manager.generate_playlist_id()
        playlist = Playlist(
            id=playlist_id,
            name="我的最爱",
            created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        
        songs_data = [
            ("Bohemian Rhapsody", "Queen", "摇滚", "激情", 5),
            ("Yesterday", "The Beatles", "流行", "怀旧", 5),
            ("Hotel California", "Eagles", "摇滚", "经典", 4),
            ("Shape of You", "Ed Sheeran", "流行", "快乐", 4),
            ("Moonlight Sonata", "Beethoven", "古典", "平静", 3),
        ]
        
        for title, artist, genre, mood, rating in songs_data:
            song = Song(
                id=generate_song_id(),
                title=title,
                artist=artist,
                album="",
                file_path=f"/tmp/{title}.mp3",
                genre=genre,
                mood=mood,
                rating=rating
            )
            playlist.add_song(song)
        
        cli.config_manager.save_playlist(playlist)
        cli.current_playlist = playlist
        cli.config_manager.set_current_playlist(playlist_id)
        print(f"    创建了 '{playlist.name}'，包含 {len(playlist.songs)} 首歌曲")
        
        print("\n  步骤2: 显示歌曲列表")
        cli.show_songs()
        
        print("\n  步骤3: 智能推荐测试")
        target_song = playlist.songs[0]
        print(f"    基于 '{target_song.title}' 推荐:")
        recommendations = cli.recommender.recommend(target_song, playlist, top_n=3)
        for i, (song, score) in enumerate(recommendations, 1):
            print(f"      {i}. {song.title} - 相似度 {score:.2%}")
        
        print("\n  步骤4: 统计信息")
        cli.show_statistics()
        
        print("\n  步骤5: M3U导出")
        m3u_path = os.path.join(temp_dir, "test_playlist.m3u")
        from utils import M3UManager
        success = M3UManager.export_playlist(playlist, m3u_path)
        print(f"    导出成功: {success}")
        
        print("\n  步骤6: M3U导入")
        imported = M3UManager.import_playlist(m3u_path)
        print(f"    导入歌曲数: {len(imported)}")
        
        print("\n  ✅ 完整工作流测试通过!\n")
        return True
    finally:
        if original_home:
            os.environ['HOME'] = original_home
        shutil.rmtree(temp_dir)


def main():
    print("\n" + "🔗" * 30)
    print("开始集成测试")
    print("🔗" * 30 + "\n")
    
    tests = [
        ("CLI初始化", test_cli_initialization),
        ("完整工作流", test_full_workflow),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"  ❌ 测试失败: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    print("=" * 60)
    print("集成测试总结")
    print("=" * 60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {name}: {status}")
    
    print(f"\n总计: {passed}/{total} 集成测试通过")
    
    if passed == total:
        print("\n🎉 所有集成测试通过!")
        return 0
    else:
        return 1


if __name__ == "__main__":
    sys.exit(main())
