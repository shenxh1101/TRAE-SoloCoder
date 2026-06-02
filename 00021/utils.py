import os
import sys
import subprocess
import random
from typing import List, Dict
from collections import Counter
from models import Song, Playlist


class Player:
    def __init__(self):
        self.current_index = 0
        self.is_playing = False
        self.mode = "sequential"

    def play_song(self, song: Song) -> bool:
        if not os.path.exists(song.file_path):
            print(f"文件不存在: {song.file_path}")
            return False
        
        try:
            if sys.platform == "darwin":
                subprocess.Popen(["open", song.file_path])
            elif sys.platform == "win32":
                os.startfile(song.file_path)
            else:
                subprocess.Popen(["xdg-open", song.file_path])
            return True
        except Exception as e:
            print(f"播放失败: {e}")
            return False

    def play_playlist(self, playlist: Playlist, start_index: int = 0):
        if not playlist.songs:
            print("播放列表为空")
            return
        
        self.current_index = start_index
        songs = playlist.songs.copy()
        
        if self.mode == "shuffle":
            random.shuffle(songs)
        
        print(f"\n开始播放（模式: {self.mode}）...")
        print(f"正在播放: {songs[self.current_index].title}")
        self.play_song(songs[self.current_index])

    def next_song(self, playlist: Playlist):
        if not playlist.songs:
            return
        
        songs = playlist.songs.copy()
        if self.mode == "shuffle":
            self.current_index = random.randint(0, len(songs) - 1)
        else:
            self.current_index = (self.current_index + 1) % len(songs)
        
        print(f"下一首: {songs[self.current_index].title}")
        self.play_song(songs[self.current_index])

    def set_mode(self, mode: str):
        if mode in ["sequential", "shuffle"]:
            self.mode = mode
            print(f"播放模式已设置为: {mode}")
        else:
            print("无效的播放模式，使用 sequential 或 shuffle")


class M3UManager:
    @staticmethod
    def export_playlist(playlist: Playlist, output_path: str) -> bool:
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write("#EXTM3U\n")
                f.write(f"#PLAYLIST:{playlist.name}\n\n")
                
                for song in playlist.songs:
                    if song.duration > 0:
                        duration = int(song.duration)
                    else:
                        duration = -1
                    
                    artist = song.artist if song.artist else "Unknown Artist"
                    title = song.title if song.title else "Unknown Title"
                    
                    f.write(f"#EXTINF:{duration},{artist} - {title}\n")
                    f.write(f"#EXTGENRE:{song.genre}\n")
                    f.write(f"#EXTMOOD:{song.mood}\n")
                    f.write(f"#EXTRATING:{song.rating}\n")
                    f.write(f"{song.file_path}\n\n")
            
            print(f"播放列表已导出到: {output_path}")
            return True
        except Exception as e:
            print(f"导出失败: {e}")
            return False

    @staticmethod
    def import_playlist(file_path: str) -> List[Dict]:
        songs = []
        current_song = {}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    
                    if line.startswith('#EXTINF:'):
                        if current_song and 'file_path' in current_song:
                            songs.append(current_song)
                        
                        current_song = {}
                        info = line.split(',', 1)
                        if len(info) > 1:
                            artist_title = info[1].split(' - ', 1)
                            if len(artist_title) == 2:
                                current_song['artist'] = artist_title[0].strip()
                                current_song['title'] = artist_title[1].strip()
                            else:
                                current_song['title'] = artist_title[0].strip()
                    
                    elif line.startswith('#EXTGENRE:'):
                        current_song['genre'] = line[10:].strip()
                    
                    elif line.startswith('#EXTMOOD:'):
                        current_song['mood'] = line[9:].strip()
                    
                    elif line.startswith('#EXTRATING:'):
                        try:
                            current_song['rating'] = int(line[11:].strip())
                        except ValueError:
                            current_song['rating'] = 0
                    
                    elif line and not line.startswith('#'):
                        current_song['file_path'] = line
                
                if current_song and 'file_path' in current_song:
                    songs.append(current_song)
            
            print(f"成功导入 {len(songs)} 首歌曲")
            return songs
        except Exception as e:
            print(f"导入失败: {e}")
            return []


class Statistics:
    @staticmethod
    def get_genre_stats(playlist: Playlist) -> Dict[str, int]:
        genres = [song.genre for song in playlist.songs if song.genre]
        return dict(Counter(genres))

    @staticmethod
    def get_mood_stats(playlist: Playlist) -> Dict[str, int]:
        moods = [song.mood for song in playlist.songs if song.mood]
        return dict(Counter(moods))

    @staticmethod
    def get_rating_stats(playlist: Playlist) -> Dict[int, int]:
        ratings = [song.rating for song in playlist.songs if song.rating > 0]
        return dict(Counter(ratings))

    @staticmethod
    def print_bar_chart(data: Dict[str, int], title: str):
        if not data:
            print(f"\n{title}: 暂无数据")
            return
        
        print(f"\n{title}")
        print("=" * 50)
        
        max_value = max(data.values())
        max_bar_width = 30
        
        for key, value in sorted(data.items(), key=lambda x: x[1], reverse=True):
            bar_length = int((value / max_value) * max_bar_width)
            bar = "█" * bar_length
            print(f"{key:<15} | {bar} ({value})")
        
        print("=" * 50)

    @staticmethod
    def print_all_stats(playlist: Playlist):
        print(f"\n=== 播放列表统计: {playlist.name} ===")
        print(f"总歌曲数: {len(playlist.songs)}")
        
        genre_stats = Statistics.get_genre_stats(playlist)
        Statistics.print_bar_chart(genre_stats, "流派分布")
        
        mood_stats = Statistics.get_mood_stats(playlist)
        Statistics.print_bar_chart(mood_stats, "心情分布")
        
        rating_stats = Statistics.get_rating_stats(playlist)
        rating_str_stats = {f"{k}星": v for k, v in rating_stats.items()}
        Statistics.print_bar_chart(rating_str_stats, "评分分布")


def generate_song_id() -> str:
    import uuid
    return str(uuid.uuid4())[:8]


def extract_mp3_metadata(file_path: str) -> Dict:
    metadata = {
        'title': '',
        'artist': '',
        'album': '',
        'duration': 0.0
    }
    
    try:
        from mutagen.mp3 import MP3
        audio = MP3(file_path)
        
        if 'TIT2' in audio:
            metadata['title'] = str(audio['TIT2'])
        if 'TPE1' in audio:
            metadata['artist'] = str(audio['TPE1'])
        if 'TALB' in audio:
            metadata['album'] = str(audio['TALB'])
        
        metadata['duration'] = audio.info.length if audio.info else 0.0
    except ImportError:
        pass
    except Exception:
        pass
    
    return metadata
