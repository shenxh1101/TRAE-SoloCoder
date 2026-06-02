#!/usr/bin/env python3
import os
import sys
from datetime import datetime
from models import Song, Playlist
from config_manager import ConfigManager
from recommender import Recommender
from utils import Player, M3UManager, Statistics, generate_song_id, extract_mp3_metadata


class MusicManagerCLI:
    def __init__(self):
        self.config_manager = ConfigManager()
        self.recommender = Recommender()
        self.player = Player()
        self.current_playlist = None
        self._load_current_playlist()

    def _load_current_playlist(self):
        playlist_id = self.config_manager.get_current_playlist_id()
        if playlist_id:
            self.current_playlist = self.config_manager.load_playlist(playlist_id)

    def _save_current_playlist(self):
        if self.current_playlist:
            self.config_manager.save_playlist(self.current_playlist)

    def print_menu(self):
        print("\n" + "=" * 60)
        print("🎵 本地音乐播放列表管理器 🎵")
        print("=" * 60)
        if self.current_playlist:
            print(f"当前播放列表: {self.current_playlist.name} ({len(self.current_playlist.songs)} 首歌曲)")
        else:
            print("当前播放列表: 无")
        print(f"播放模式: {self.player.mode}")
        print("=" * 60)
        print("1.  创建新播放列表")
        print("2.  切换播放列表")
        print("3.  删除播放列表")
        print("4.  显示所有播放列表")
        print("-" * 60)
        print("5.  添加音乐文件")
        print("6.  从文件夹批量添加音乐")
        print("7.  移除歌曲")
        print("8.  编辑歌曲信息（标签、评分）")
        print("9.  显示当前播放列表歌曲")
        print("-" * 60)
        print("10. 播放歌曲（交互式选择）")
        print("11. 播放整个播放列表")
        print("12. 下一首")
        print("13. 切换播放模式（顺序/随机）")
        print("-" * 60)
        print("14. 智能推荐（基于选定歌曲）")
        print("15. 按标签推荐")
        print("-" * 60)
        print("16. 导出播放列表为M3U")
        print("17. 从M3U导入播放列表")
        print("-" * 60)
        print("18. 显示统计信息")
        print("-" * 60)
        print("0. 退出")
        print("=" * 60)

    def create_playlist(self):
        name = input("请输入播放列表名称: ").strip()
        if not name:
            print("名称不能为空！")
            return
        
        playlist_id = self.config_manager.generate_playlist_id()
        playlist = Playlist(
            id=playlist_id,
            name=name,
            created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        
        self.config_manager.save_playlist(playlist)
        self.current_playlist = playlist
        self.config_manager.set_current_playlist(playlist_id)
        print(f"播放列表 '{name}' 创建成功！")

    def switch_playlist(self):
        playlist_ids = self.config_manager.get_all_playlists()
        if not playlist_ids:
            print("没有可用的播放列表！")
            return
        
        print("\n可用的播放列表:")
        playlists = []
        for i, pid in enumerate(playlist_ids, 1):
            pl = self.config_manager.load_playlist(pid)
            if pl:
                playlists.append(pl)
                print(f"{i}. {pl.name} ({len(pl.songs)} 首歌曲)")
        
        try:
            choice = int(input("请选择播放列表编号: ")) - 1
            if 0 <= choice < len(playlists):
                self.current_playlist = playlists[choice]
                self.config_manager.set_current_playlist(playlists[choice].id)
                print(f"已切换到播放列表: {playlists[choice].name}")
            else:
                print("无效的选择！")
        except ValueError:
            print("请输入有效数字！")

    def delete_playlist(self):
        playlist_ids = self.config_manager.get_all_playlists()
        if not playlist_ids:
            print("没有可用的播放列表！")
            return
        
        print("\n可用的播放列表:")
        playlists = []
        for i, pid in enumerate(playlist_ids, 1):
            pl = self.config_manager.load_playlist(pid)
            if pl:
                playlists.append(pl)
                print(f"{i}. {pl.name}")
        
        try:
            choice = int(input("请选择要删除的播放列表编号: ")) - 1
            if 0 <= choice < len(playlists):
                confirm = input(f"确定要删除播放列表 '{playlists[choice].name}' 吗? (y/N): ")
                if confirm.lower() == 'y':
                    self.config_manager.delete_playlist(playlists[choice].id)
                    if self.current_playlist and self.current_playlist.id == playlists[choice].id:
                        self.current_playlist = None
                    print("播放列表已删除！")
            else:
                print("无效的选择！")
        except ValueError:
            print("请输入有效数字！")

    def show_all_playlists(self):
        playlist_ids = self.config_manager.get_all_playlists()
        if not playlist_ids:
            print("没有可用的播放列表！")
            return
        
        print("\n所有播放列表:")
        for pid in playlist_ids:
            pl = self.config_manager.load_playlist(pid)
            if pl:
                current_marker = " *" if self.current_playlist and self.current_playlist.id == pid else ""
                print(f"- {pl.name} ({len(pl.songs)} 首歌曲){current_marker}")

    def add_music_file(self):
        if not self.current_playlist:
            print("请先创建或选择一个播放列表！")
            return
        
        file_path = input("请输入MP3文件路径: ").strip()
        if not os.path.exists(file_path) or not file_path.lower().endswith('.mp3'):
            print("无效的MP3文件路径！")
            return
        
        metadata = extract_mp3_metadata(file_path)
        
        song = Song(
            id=generate_song_id(),
            title=metadata['title'],
            artist=metadata['artist'],
            album=metadata['album'],
            file_path=os.path.abspath(file_path),
            duration=metadata['duration']
        )
        
        genre = input("请输入流派（如: 摇滚、流行）: ").strip()
        mood = input("请输入心情（如: 快乐、悲伤）: ").strip()
        
        try:
            rating = int(input("请输入评分（1-5星，0为未评分）: ").strip())
            rating = max(0, min(5, rating))
        except ValueError:
            rating = 0
        
        song.genre = genre
        song.mood = mood
        song.rating = rating
        
        if self.current_playlist.add_song(song):
            self._save_current_playlist()
            print(f"歌曲 '{song.title}' 已添加到播放列表！")
        else:
            print("该歌曲已在播放列表中！")

    def add_music_from_folder(self):
        if not self.current_playlist:
            print("请先创建或选择一个播放列表！")
            return
        
        folder_path = input("请输入文件夹路径: ").strip()
        if not os.path.isdir(folder_path):
            print("无效的文件夹路径！")
            return
        
        mp3_files = []
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                if file.lower().endswith('.mp3'):
                    mp3_files.append(os.path.join(root, file))
        
        if not mp3_files:
            print("文件夹中没有找到MP3文件！")
            return
        
        print(f"找到 {len(mp3_files)} 个MP3文件")
        
        default_genre = input("请输入默认流派（留空跳过）: ").strip()
        default_mood = input("请输入默认心情（留空跳过）: ").strip()
        
        try:
            default_rating = int(input("请输入默认评分（1-5，0跳过）: ").strip())
            default_rating = max(0, min(5, default_rating))
        except ValueError:
            default_rating = 0
        
        added_count = 0
        for file_path in mp3_files:
            metadata = extract_mp3_metadata(file_path)
            
            song = Song(
                id=generate_song_id(),
                title=metadata['title'],
                artist=metadata['artist'],
                album=metadata['album'],
                file_path=os.path.abspath(file_path),
                genre=default_genre,
                mood=default_mood,
                rating=default_rating,
                duration=metadata['duration']
            )
            
            if self.current_playlist.add_song(song):
                added_count += 1
        
        self._save_current_playlist()
        print(f"成功添加 {added_count} 首歌曲！")

    def remove_song(self):
        if not self.current_playlist or not self.current_playlist.songs:
            print("播放列表为空！")
            return
        
        self.show_songs()
        try:
            choice = int(input("请输入要删除的歌曲编号: ")) - 1
            song = self.current_playlist.get_song_by_index(choice)
            if song:
                confirm = input(f"确定要删除 '{song.title}' 吗? (y/N): ")
                if confirm.lower() == 'y':
                    self.current_playlist.remove_song(song.id)
                    self._save_current_playlist()
                    print("歌曲已删除！")
            else:
                print("无效的歌曲编号！")
        except ValueError:
            print("请输入有效数字！")

    def edit_song(self):
        if not self.current_playlist or not self.current_playlist.songs:
            print("播放列表为空！")
            return
        
        self.show_songs()
        try:
            choice = int(input("请输入要编辑的歌曲编号: ")) - 1
            song = self.current_playlist.get_song_by_index(choice)
            if song:
                print(f"\n编辑歌曲: {song.title}")
                print(f"当前流派: {song.genre}")
                new_genre = input("新流派（留空保持不变）: ").strip()
                if new_genre:
                    song.genre = new_genre
                
                print(f"当前心情: {song.mood}")
                new_mood = input("新心情（留空保持不变）: ").strip()
                if new_mood:
                    song.mood = new_mood
                
                print(f"当前评分: {song.rating}星")
                new_rating_str = input("新评分（1-5，0为未评分，留空保持不变）: ").strip()
                if new_rating_str:
                    try:
                        new_rating = int(new_rating_str)
                        song.rating = max(0, min(5, new_rating))
                    except ValueError:
                        pass
                
                self._save_current_playlist()
                print("歌曲信息已更新！")
            else:
                print("无效的歌曲编号！")
        except ValueError:
            print("请输入有效数字！")

    def show_songs(self):
        if not self.current_playlist:
            print("请先选择一个播放列表！")
            return
        
        if not self.current_playlist.songs:
            print("播放列表为空！")
            return
        
        print(f"\n{self.current_playlist.name} - 歌曲列表:")
        print("-" * 80)
        print(f"{'编号':<4} {'歌曲名':<25} {'艺术家':<15} {'流派':<10} {'心情':<10} {'评分':<5}")
        print("-" * 80)
        
        for i, song in enumerate(self.current_playlist.songs, 1):
            title = song.title[:24] if len(song.title) > 24 else song.title
            artist = song.artist[:14] if len(song.artist) > 14 else song.artist
            genre = song.genre[:9] if len(song.genre) > 9 else song.genre
            mood = song.mood[:9] if len(song.mood) > 9 else song.mood
            rating = "★" * song.rating if song.rating > 0 else "-"
            
            print(f"{i:<4} {title:<25} {artist:<15} {genre:<10} {mood:<10} {rating:<5}")
        
        print("-" * 80)

    def play_selected_song(self):
        if not self.current_playlist or not self.current_playlist.songs:
            print("播放列表为空！")
            return
        
        self.show_songs()
        try:
            choice = int(input("请输入要播放的歌曲编号: ")) - 1
            song = self.current_playlist.get_song_by_index(choice)
            if song:
                self.player.current_index = choice
                print(f"正在播放: {song.title}")
                self.player.play_song(song)
            else:
                print("无效的歌曲编号！")
        except ValueError:
            print("请输入有效数字！")

    def play_entire_playlist(self):
        if not self.current_playlist:
            print("请先选择一个播放列表！")
            return
        
        self.player.play_playlist(self.current_playlist)

    def play_next(self):
        if not self.current_playlist:
            print("请先选择一个播放列表！")
            return
        
        self.player.next_song(self.current_playlist)

    def toggle_play_mode(self):
        if self.player.mode == "sequential":
            self.player.set_mode("shuffle")
        else:
            self.player.set_mode("sequential")

    def recommend_songs(self):
        if not self.current_playlist or len(self.current_playlist.songs) < 2:
            print("播放列表中至少需要2首歌曲才能进行推荐！")
            return
        
        self.show_songs()
        try:
            choice = int(input("请选择一首歌曲作为推荐基础: ")) - 1
            song = self.current_playlist.get_song_by_index(choice)
            if song:
                recommendations = self.recommender.recommend(song, self.current_playlist, top_n=3)
                print(f"\n基于 '{song.title}' 的推荐歌曲:")
                print("-" * 60)
                for i, (rec_song, score) in enumerate(recommendations, 1):
                    print(f"{i}. {rec_song.title} - {rec_song.artist}")
                    print(f"   流派: {rec_song.genre} | 心情: {rec_song.mood} | 评分: {'★' * rec_song.rating}")
                    print(f"   相似度: {score:.2%}")
                print("-" * 60)
            else:
                print("无效的歌曲编号！")
        except ValueError:
            print("请输入有效数字！")

    def recommend_by_tags(self):
        if not self.current_playlist or not self.current_playlist.songs:
            print("播放列表为空！")
            return
        
        genre_input = input("请输入想要的流派（多个用逗号分隔）: ").strip()
        mood_input = input("请输入想要的心情（多个用逗号分隔）: ").strip()
        
        genres = set([g.strip() for g in genre_input.split(',') if g.strip()])
        moods = set([m.strip() for m in mood_input.split(',') if m.strip()])
        
        if not genres and not moods:
            print("请至少输入一个流派或心情！")
            return
        
        recommendations = self.recommender.recommend_by_tags(genres, moods, self.current_playlist, top_n=3)
        print("\n根据标签推荐的歌曲:")
        print("-" * 60)
        for i, (rec_song, score) in enumerate(recommendations, 1):
            print(f"{i}. {rec_song.title} - {rec_song.artist}")
            print(f"   流派: {rec_song.genre} | 心情: {rec_song.mood} | 评分: {'★' * rec_song.rating}")
            print(f"   匹配度: {score:.2%}")
        print("-" * 60)

    def export_m3u(self):
        if not self.current_playlist:
            print("请先选择一个播放列表！")
            return
        
        output_path = input("请输入输出M3U文件路径: ").strip()
        if not output_path:
            output_path = f"{self.current_playlist.name}.m3u"
        
        M3UManager.export_playlist(self.current_playlist, output_path)

    def import_m3u(self):
        if not self.current_playlist:
            print("请先创建或选择一个播放列表！")
            return
        
        file_path = input("请输入M3U文件路径: ").strip()
        if not os.path.exists(file_path):
            print("文件不存在！")
            return
        
        songs_data = M3UManager.import_playlist(file_path)
        added_count = 0
        
        for song_data in songs_data:
            if os.path.exists(song_data.get('file_path', '')):
                song = Song(
                    id=generate_song_id(),
                    title=song_data.get('title', ''),
                    artist=song_data.get('artist', ''),
                    album='',
                    file_path=song_data['file_path'],
                    genre=song_data.get('genre', ''),
                    mood=song_data.get('mood', ''),
                    rating=song_data.get('rating', 0)
                )
                if self.current_playlist.add_song(song):
                    added_count += 1
        
        self._save_current_playlist()
        print(f"成功导入 {added_count} 首歌曲！")

    def show_statistics(self):
        if not self.current_playlist:
            print("请先选择一个播放列表！")
            return
        
        Statistics.print_all_stats(self.current_playlist)

    def run(self):
        while True:
            self.print_menu()
            choice = input("请选择操作: ").strip()
            
            if choice == '0':
                print("再见！")
                break
            elif choice == '1':
                self.create_playlist()
            elif choice == '2':
                self.switch_playlist()
            elif choice == '3':
                self.delete_playlist()
            elif choice == '4':
                self.show_all_playlists()
            elif choice == '5':
                self.add_music_file()
            elif choice == '6':
                self.add_music_from_folder()
            elif choice == '7':
                self.remove_song()
            elif choice == '8':
                self.edit_song()
            elif choice == '9':
                self.show_songs()
            elif choice == '10':
                self.play_selected_song()
            elif choice == '11':
                self.play_entire_playlist()
            elif choice == '12':
                self.play_next()
            elif choice == '13':
                self.toggle_play_mode()
            elif choice == '14':
                self.recommend_songs()
            elif choice == '15':
                self.recommend_by_tags()
            elif choice == '16':
                self.export_m3u()
            elif choice == '17':
                self.import_m3u()
            elif choice == '18':
                self.show_statistics()
            else:
                print("无效的选择，请重新输入！")
            
            input("\n按回车键继续...")


def main():
    try:
        cli = MusicManagerCLI()
        cli.run()
    except KeyboardInterrupt:
        print("\n\n再见！")
        sys.exit(0)


if __name__ == "__main__":
    main()
