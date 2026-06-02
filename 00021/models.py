import os
from typing import List, Set, Dict, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class Song:
    id: str
    title: str
    artist: str
    album: str
    file_path: str
    genre: str = ""
    mood: str = ""
    rating: int = 0
    duration: float = 0.0

    def __post_init__(self):
        if not self.title:
            self.title = os.path.splitext(os.path.basename(self.file_path))[0]

    def get_all_tags(self) -> Set[str]:
        tags = set()
        if self.genre:
            tags.add(self.genre.lower())
        if self.mood:
            tags.add(self.mood.lower())
        return tags

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> 'Song':
        return cls(**data)


@dataclass
class Playlist:
    id: str
    name: str
    songs: List[Song] = field(default_factory=list)
    created_at: str = ""

    def add_song(self, song: Song) -> bool:
        for s in self.songs:
            if s.file_path == song.file_path:
                return False
        self.songs.append(song)
        return True

    def remove_song(self, song_id: str) -> bool:
        for i, song in enumerate(self.songs):
            if song.id == song_id:
                self.songs.pop(i)
                return True
        return False

    def get_song_by_id(self, song_id: str) -> Optional[Song]:
        for song in self.songs:
            if song.id == song_id:
                return song
        return None

    def get_song_by_index(self, index: int) -> Optional[Song]:
        if 0 <= index < len(self.songs):
            return self.songs[index]
        return None

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "songs": [s.to_dict() for s in self.songs],
            "created_at": self.created_at
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'Playlist':
        songs = [Song.from_dict(s) for s in data.get("songs", [])]
        return cls(
            id=data["id"],
            name=data["name"],
            songs=songs,
            created_at=data.get("created_at", "")
        )
