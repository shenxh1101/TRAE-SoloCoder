from typing import List, Tuple, Set
from models import Song, Playlist


class Recommender:
    def __init__(self):
        self.rating_weight = 0.4
        self.tag_weight = 0.6

    def calculate_tag_similarity(self, song1: Song, song2: Song) -> float:
        tags1 = song1.get_all_tags()
        tags2 = song2.get_all_tags()
        
        if not tags1 or not tags2:
            return 0.0
        
        intersection = len(tags1.intersection(tags2))
        union = len(tags1.union(tags2))
        
        return intersection / union if union > 0 else 0.0

    def calculate_rating_score(self, song: Song) -> float:
        if song.rating <= 0:
            return 0.5
        return song.rating / 5.0

    def calculate_similarity_score(self, target_song: Song, candidate_song: Song) -> float:
        tag_sim = self.calculate_tag_similarity(target_song, candidate_song)
        rating_score = self.calculate_rating_score(candidate_song)
        
        return tag_sim * self.tag_weight + rating_score * self.rating_weight

    def recommend(self, target_song: Song, playlist: Playlist, top_n: int = 3) -> List[Tuple[Song, float]]:
        candidates = []
        
        for song in playlist.songs:
            if song.id == target_song.id:
                continue
            
            score = self.calculate_similarity_score(target_song, song)
            candidates.append((song, score))
        
        candidates.sort(key=lambda x: x[1], reverse=True)
        
        return candidates[:top_n]

    def recommend_by_tags(self, genres: Set[str], moods: Set[str], 
                         playlist: Playlist, top_n: int = 3) -> List[Tuple[Song, float]]:
        candidates = []
        target_tags = set([g.lower() for g in genres]) | set([m.lower() for m in moods])
        
        for song in playlist.songs:
            song_tags = song.get_all_tags()
            if not target_tags or not song_tags:
                tag_sim = 0.0
            else:
                intersection = len(target_tags.intersection(song_tags))
                union = len(target_tags.union(song_tags))
                tag_sim = intersection / union if union > 0 else 0.0
            
            rating_score = self.calculate_rating_score(song)
            score = tag_sim * self.tag_weight + rating_score * self.rating_weight
            candidates.append((song, score))
        
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[:top_n]
