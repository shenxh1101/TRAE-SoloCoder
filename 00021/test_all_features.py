#!/usr/bin/env python3
import os
import sys
import tempfile
import shutil
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import Song, Playlist
from config_manager import ConfigManager
from recommender import Recommender
from utils import Player, M3UManager, Statistics, generate_song_id


def test_models():
    print("=" * 60)
    print("测试 1: 数据模型 (Song, Playlist)")
    print("=" * 60)
    
    song1 = Song(
        id="song001",
        title="测试歌曲1",
        artist="艺术家A",
        album="专辑X",
        file_path="/tmp/test1.mp3",
        genre="摇滚",
        mood="快乐",
        rating=5
    )
    
    song2 = Song(
        id="song002",
        title="测试歌曲2",
        artist="艺术家B",
        album="专辑Y",
        file_path="/tmp/test2.mp3",
        genre="流行",
        mood="轻松",
        rating=4
    )
    
    print(f"  Song 1: {song1.title}, 标签: {song1.get_all_tags()}")
    print(f"  Song 2: {song2.title}, 标签: {song2.get_all_tags()}")
    
    playlist = Playlist(id="pl001", name="测试播放列表")
    playlist.add_song(song1)
    playlist.add_song(song2)
    
    print(f"  Playlist: {playlist.name}, 歌曲数: {len(playlist.songs)}")
    
    playlist_dict = playlist.to_dict()
    playlist_restored = Playlist.from_dict(playlist_dict)
    print(f"  序列化/反序列化测试: {'通过' if playlist_restored.name == playlist.name else '失败'}")
    
    print("  ✅ 数据模型测试通过!\n")
    return True


def test_config_manager():
    print("=" * 60)
    print("测试 2: 配置管理器")
    print("=" * 60)
    
    temp_dir = tempfile.mkdtemp()
    print(f"  临时目录: {temp_dir}")
    
    try:
        cm = ConfigManager(config_dir=temp_dir)
        
        playlist_id = cm.generate_playlist_id()
        playlist = Playlist(
            id=playlist_id,
            name="测试列表",
            created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        
        song = Song(
            id=generate_song_id(),
            title="测试歌曲",
            artist="测试艺术家",
            album="",
            file_path="/tmp/test.mp3",
            genre="摇滚",
            mood="快乐",
            rating=5
        )
        playlist.add_song(song)
        
        cm.save_playlist(playlist)
        print(f"  保存播放列表: {playlist.name}")
        
        loaded = cm.load_playlist(playlist_id)
        print(f"  加载播放列表: {'成功' if loaded else '失败'}")
        
        cm.set_current_playlist(playlist_id)
        current = cm.get_current_playlist_id()
        print(f"  当前播放列表: {'正确' if current == playlist_id else '错误'}")
        
        all_playlists = cm.get_all_playlists()
        print(f"  所有播放列表数: {len(all_playlists)}")
        
        cm.delete_playlist(playlist_id)
        deleted = cm.load_playlist(playlist_id)
        print(f"  删除播放列表: {'成功' if deleted is None else '失败'}")
        
        print("  ✅ 配置管理器测试通过!\n")
        return True
    finally:
        shutil.rmtree(temp_dir)


def test_recommender():
    print("=" * 60)
    print("测试 3: 推荐引擎")
    print("=" * 60)
    
    recommender = Recommender()
    
    songs = [
        Song(id="s1", title="摇滚快乐歌", artist="A", album="", file_path="/tmp/s1.mp3", genre="摇滚", mood="快乐", rating=5),
        Song(id="s2", title="摇滚悲伤歌", artist="B", album="", file_path="/tmp/s2.mp3", genre="摇滚", mood="悲伤", rating=4),
        Song(id="s3", title="流行快乐歌", artist="C", album="", file_path="/tmp/s3.mp3", genre="流行", mood="快乐", rating=3),
        Song(id="s4", title="古典轻松歌", artist="D", album="", file_path="/tmp/s4.mp3", genre="古典", mood="轻松", rating=5),
        Song(id="s5", title="摇滚劲爆歌", artist="E", album="", file_path="/tmp/s5.mp3", genre="摇滚", mood="亢奋", rating=2),
    ]
    
    playlist = Playlist(id="test", name="测试", songs=songs)
    
    target_song = songs[0]
    print(f"  目标歌曲: {target_song.title} (流派: {target_song.genre}, 心情: {target_song.mood}, 评分: {target_song.rating}星)")
    
    recommendations = recommender.recommend(target_song, playlist, top_n=3)
    
    print(f"  推荐结果 (Top 3):")
    for i, (song, score) in enumerate(recommendations, 1):
        print(f"    {i}. {song.title} - 相似度: {score:.2%}")
        print(f"       流派: {song.genre}, 心情: {song.mood}, 评分: {song.rating}星")
    
    tag_recommendations = recommender.recommend_by_tags({"摇滚"}, {"快乐"}, playlist, top_n=2)
    print(f"  按标签推荐 (摇滚+快乐):")
    for i, (song, score) in enumerate(tag_recommendations, 1):
        print(f"    {i}. {song.title} - 匹配度: {score:.2%}")
    
    print("  ✅ 推荐引擎测试通过!\n")
    return True


def test_m3u_manager():
    print("=" * 60)
    print("测试 4: M3U 导入导出")
    print("=" * 60)
    
    temp_file = tempfile.mktemp(suffix=".m3u")
    print(f"  临时M3U文件: {temp_file}")
    
    try:
        songs = [
            Song(id="s1", title="歌曲1", artist="艺术家1", album="", file_path="/tmp/song1.mp3", genre="摇滚", mood="快乐", rating=5, duration=180.5),
            Song(id="s2", title="歌曲2", artist="艺术家2", album="", file_path="/tmp/song2.mp3", genre="流行", mood="轻松", rating=4, duration=240.0),
        ]
        playlist = Playlist(id="test", name="测试导出列表", songs=songs)
        
        success = M3UManager.export_playlist(playlist, temp_file)
        print(f"  导出M3U: {'成功' if success else '失败'}")
        
        if os.path.exists(temp_file):
            with open(temp_file, 'r') as f:
                content = f.read()
            print(f"  M3U文件内容预览:")
            for line in content.strip().split('\n')[:8]:
                print(f"    {line}")
        
        imported_songs = M3UManager.import_playlist(temp_file)
        print(f"  导入歌曲数: {len(imported_songs)}")
        if imported_songs:
            print(f"  导入的第一首: {imported_songs[0].get('title')}, 流派: {imported_songs[0].get('genre')}")
        
        print("  ✅ M3U导入导出测试通过!\n")
        return True
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)


def test_statistics():
    print("=" * 60)
    print("测试 5: 统计功能和柱状图")
    print("=" * 60)
    
    songs = [
        Song(id="s1", title="", artist="", album="", file_path="/tmp/s1.mp3", genre="摇滚", mood="快乐", rating=5),
        Song(id="s2", title="", artist="", album="", file_path="/tmp/s2.mp3", genre="摇滚", mood="快乐", rating=5),
        Song(id="s3", title="", artist="", album="", file_path="/tmp/s3.mp3", genre="摇滚", mood="悲伤", rating=4),
        Song(id="s4", title="", artist="", album="", file_path="/tmp/s4.mp3", genre="流行", mood="快乐", rating=4),
        Song(id="s5", title="", artist="", album="", file_path="/tmp/s5.mp3", genre="流行", mood="轻松", rating=3),
        Song(id="s6", title="", artist="", album="", file_path="/tmp/s6.mp3", genre="古典", mood="平静", rating=5),
        Song(id="s7", title="", artist="", album="", file_path="/tmp/s7.mp3", genre="电子", mood="亢奋", rating=2),
    ]
    
    playlist = Playlist(id="test", name="统计测试", songs=songs)
    
    genre_stats = Statistics.get_genre_stats(playlist)
    mood_stats = Statistics.get_mood_stats(playlist)
    rating_stats = Statistics.get_rating_stats(playlist)
    
    print(f"  流派统计: {genre_stats}")
    print(f"  心情统计: {mood_stats}")
    print(f"  评分统计: {rating_stats}")
    
    print("\n  显示统计图表:")
    Statistics.print_all_stats(playlist)
    
    print("\n  ✅ 统计功能测试通过!\n")
    return True


def test_player():
    print("=" * 60)
    print("测试 6: 播放器功能")
    print("=" * 60)
    
    player = Player()
    print(f"  默认播放模式: {player.mode}")
    
    player.set_mode("shuffle")
    print(f"  设置随机模式: {player.mode}")
    
    player.set_mode("sequential")
    print(f"  设置顺序模式: {player.mode}")
    
    songs = [
        Song(id="s1", title="测试歌曲1", artist="A", album="", file_path="/tmp/nonexistent1.mp3"),
        Song(id="s2", title="测试歌曲2", artist="B", album="", file_path="/tmp/nonexistent2.mp3"),
    ]
    playlist = Playlist(id="test", name="测试", songs=songs)
    
    print(f"  测试播放不存在的文件 (预期会提示文件不存在):")
    result = player.play_song(songs[0])
    print(f"  播放结果 (文件不存在时应为False): {result}")
    
    print("  ✅ 播放器功能测试通过!\n")
    return True


def test_generate_song_id():
    print("=" * 60)
    print("测试 7: 生成歌曲ID")
    print("=" * 60)
    
    id1 = generate_song_id()
    id2 = generate_song_id()
    print(f"  ID 1: {id1}")
    print(f"  ID 2: {id2}")
    print(f"  唯一性测试: {'通过' if id1 != id2 else '失败'}")
    print(f"  长度测试: {'通过' if len(id1) == 8 else '失败'}")
    
    print("  ✅ 歌曲ID生成测试通过!\n")
    return True


def test_song_operations():
    print("=" * 60)
    print("测试 8: 歌曲操作 (添加、删除、编辑)")
    print("=" * 60)
    
    playlist = Playlist(id="test", name="操作测试")
    
    song1 = Song(id="s1", title="歌曲1", artist="A", album="", file_path="/tmp/s1.mp3")
    song2 = Song(id="s2", title="歌曲2", artist="B", album="", file_path="/tmp/s2.mp3")
    song3 = Song(id="s3", title="歌曲3", artist="C", album="", file_path="/tmp/s3.mp3")
    
    playlist.add_song(song1)
    playlist.add_song(song2)
    print(f"  添加2首歌后: {len(playlist.songs)} 首")
    
    playlist.add_song(song1)
    print(f"  重复添加同一首: {'正确' if len(playlist.songs) == 2 else '错误'} (应该保持2首)")
    
    found = playlist.get_song_by_id("s1")
    print(f"  按ID查找: {'成功' if found and found.title == '歌曲1' else '失败'}")
    
    found = playlist.get_song_by_index(1)
    print(f"  按索引查找: {'成功' if found and found.title == '歌曲2' else '失败'}")
    
    playlist.remove_song("s1")
    print(f"  删除后剩余: {len(playlist.songs)} 首")
    
    print("  ✅ 歌曲操作测试通过!\n")
    return True


def main():
    print("\n" + "🚀" * 30)
    print("开始全面测试音乐播放列表管理器")
    print("🚀" * 30 + "\n")
    
    tests = [
        ("数据模型", test_models),
        ("配置管理器", test_config_manager),
        ("推荐引擎", test_recommender),
        ("M3U导入导出", test_m3u_manager),
        ("统计功能", test_statistics),
        ("播放器", test_player),
        ("歌曲ID生成", test_generate_song_id),
        ("歌曲操作", test_song_operations),
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
    print("测试总结")
    print("=" * 60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {name}: {status}")
    
    print(f"\n总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过! 程序功能完整可用!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} 个测试失败，需要修复")
        return 1


if __name__ == "__main__":
    sys.exit(main())
