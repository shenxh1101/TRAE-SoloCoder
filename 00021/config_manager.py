import os
import json
from typing import Dict, List, Optional
from datetime import datetime
from models import Playlist


class ConfigManager:
    def __init__(self, config_dir: str = None):
        if config_dir is None:
            self.config_dir = os.path.join(os.path.expanduser("~"), ".music_manager")
        else:
            self.config_dir = config_dir
        
        self.playlists_dir = os.path.join(self.config_dir, "playlists")
        self.config_file = os.path.join(self.config_dir, "config.json")
        self._ensure_dirs()
        self.config = self._load_config()

    def _ensure_dirs(self):
        if not os.path.exists(self.config_dir):
            os.makedirs(self.config_dir)
        if not os.path.exists(self.playlists_dir):
            os.makedirs(self.playlists_dir)

    def _load_config(self) -> Dict:
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {
            "current_playlist": None,
            "playlists": []
        }

    def _save_config(self):
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, ensure_ascii=False, indent=2)

    def get_all_playlists(self) -> List[str]:
        playlist_files = [f for f in os.listdir(self.playlists_dir) if f.endswith('.json')]
        return [os.path.splitext(f)[0] for f in playlist_files]

    def save_playlist(self, playlist: Playlist):
        playlist_file = os.path.join(self.playlists_dir, f"{playlist.id}.json")
        with open(playlist_file, 'w', encoding='utf-8') as f:
            json.dump(playlist.to_dict(), f, ensure_ascii=False, indent=2)
        
        if playlist.name not in self.config["playlists"]:
            self.config["playlists"].append(playlist.name)
        self._save_config()

    def load_playlist(self, playlist_id: str) -> Optional[Playlist]:
        playlist_file = os.path.join(self.playlists_dir, f"{playlist_id}.json")
        if os.path.exists(playlist_file):
            with open(playlist_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return Playlist.from_dict(data)
        return None

    def load_playlist_by_name(self, name: str) -> Optional[Playlist]:
        for playlist_id in self.get_all_playlists():
            playlist = self.load_playlist(playlist_id)
            if playlist and playlist.name == name:
                return playlist
        return None

    def delete_playlist(self, playlist_id: str) -> bool:
        playlist_file = os.path.join(self.playlists_dir, f"{playlist_id}.json")
        if os.path.exists(playlist_file):
            playlist = self.load_playlist(playlist_id)
            if playlist and playlist.name in self.config["playlists"]:
                self.config["playlists"].remove(playlist.name)
            os.remove(playlist_file)
            if self.config.get("current_playlist") == playlist_id:
                self.config["current_playlist"] = None
            self._save_config()
            return True
        return False

    def set_current_playlist(self, playlist_id: str):
        self.config["current_playlist"] = playlist_id
        self._save_config()

    def get_current_playlist_id(self) -> Optional[str]:
        return self.config.get("current_playlist")

    def generate_playlist_id(self) -> str:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"playlist_{timestamp}"
