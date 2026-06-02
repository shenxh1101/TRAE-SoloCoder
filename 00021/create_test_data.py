#!/usr/bin/env python3
import os
import struct

def create_minimal_mp3(file_path):
    mp3_header = struct.pack('>BBBB', 0xFF, 0xFB, 0x90, 0x00)
    silence_frame = mp3_header + b'\x00' * 1000
    
    frames = silence_frame * 10
    
    with open(file_path, 'wb') as f:
        f.write(frames)
    
    return file_path

def main():
    test_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_music")
    os.makedirs(test_dir, exist_ok=True)
    
    songs = [
        ("Bohemian Rhapsody.mp3", "Queen", "摇滚", "激情", 5),
        ("Yesterday.mp3", "The Beatles", "流行", "怀旧", 5),
        ("Hotel California.mp3", "Eagles", "摇滚", "经典", 4),
        ("Shape of You.mp3", "Ed Sheeran", "流行", "快乐", 4),
        ("Moonlight Sonata.mp3", "Beethoven", "古典", "平静", 3),
        ("Thunderstruck.mp3", "AC/DC", "摇滚", "亢奋", 5),
        ("Hallelujah.mp3", "Leonard Cohen", "民谣", "深沉", 4),
        ("Happy.mp3", "Pharrell Williams", "流行", "快乐", 5),
    ]
    
    created_files = []
    for filename, artist, genre, mood, rating in songs:
        file_path = os.path.join(test_dir, filename)
        create_minimal_mp3(file_path)
        created_files.append((file_path, filename, artist, genre, mood, rating))
        print(f"创建: {filename}")
    
    print(f"\n成功创建 {len(created_files)} 个测试MP3文件")
    print(f"测试目录: {test_dir}")
    
    return test_dir, created_files

if __name__ == "__main__":
    main()
