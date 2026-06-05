import { Track, Note } from '../types';

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export class MidiParser {
  private static readVarInt(data: Uint8Array, offset: number): { value: number; offset: number } {
    let value = 0;
    let byte: number;
    do {
      byte = data[offset++];
      value = (value << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    return { value, offset };
  }

  private static readUint16(data: Uint8Array, offset: number): number {
    return (data[offset] << 8) | data[offset + 1];
  }

  private static readUint32(data: Uint8Array, offset: number): number {
    return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
  }

  static parse(data: ArrayBuffer, laneCount: number = 4): Omit<Track, 'id'> {
    const uint8 = new Uint8Array(data);
    let offset = 0;

    const headerChunk = uint8.slice(0, 4);
    if (String.fromCharCode(...headerChunk) !== 'MThd') {
      throw new Error('Invalid MIDI file');
    }

    offset += 4;
    const headerLength = this.readUint32(uint8, offset);
    offset += 4;
    
    const format = this.readUint16(uint8, offset);
    offset += 2;
    const numTracks = this.readUint16(uint8, offset);
    offset += 2;
    const timeDivision = this.readUint16(uint8, offset);
    offset += 2;

    const ticksPerQuarter = timeDivision & 0x7fff;
    const bpm = 120;
    const microsecondsPerBeat = 60000000 / bpm;
    const msPerTick = microsecondsPerBeat / ticksPerQuarter / 1000;

    const notes: Note[] = [];
    let totalDuration = 0;

    for (let trackIndex = 0; trackIndex < numTracks; trackIndex++) {
      const trackHeader = uint8.slice(offset, offset + 4);
      if (String.fromCharCode(...trackHeader) !== 'MTrk') {
        throw new Error('Invalid track chunk');
      }
      offset += 4;

      const trackLength = this.readUint32(uint8, offset);
      offset += 4;

      const trackEnd = offset + trackLength;
      let currentTime = 0;
      let runningStatus: number | null = null;

      while (offset < trackEnd) {
        const { value: deltaTime, offset: newOffset } = this.readVarInt(uint8, offset);
        offset = newOffset;
        currentTime += deltaTime;

        let status = uint8[offset];
        if (status < 0x80) {
          status = runningStatus!;
        } else {
          runningStatus = status;
          offset++;
        }

        const eventType = status >> 4;
        const channel = status & 0x0f;

        if (eventType === 0x9) {
          const noteNumber = uint8[offset++];
          const velocity = uint8[offset++];
          
          if (velocity > 0) {
            const timeInMs = currentTime * msPerTick;
            totalDuration = Math.max(totalDuration, timeInMs);
            
            notes.push({
              id: generateId(),
              time: timeInMs,
              lane: noteNumber % laneCount,
              type: 'normal',
            });
          }
        } else if (eventType === 0x8) {
          offset += 2;
        } else if (eventType >= 0x8 && eventType <= 0xe) {
          if (eventType === 0xc || eventType === 0xd) {
            offset += 1;
          } else {
            offset += 2;
          }
        } else if (status === 0xff) {
          const metaType = uint8[offset++];
          const { value: length, offset: lenOffset } = this.readVarInt(uint8, offset);
          offset = lenOffset + length;
        }
      }
    }

    notes.sort((a, b) => a.time - b.time);

    return {
      name: 'Imported Track',
      artist: 'MIDI Import',
      difficulty: 'normal',
      bpm: bpm,
      duration: totalDuration + 2000,
      notes: notes,
      isCustom: true,
    };
  }
}

export function generateTrackFromPattern(
  id: string,
  name: string,
  artist: string,
  difficulty: 'easy' | 'normal' | 'hard' | 'expert',
  bpm: number,
  pattern: number[],
  repetitions: number = 8
): Track {
  const notes: Note[] = [];
  const beatInterval = 60000 / bpm;
  const noteInterval = beatInterval / 2;
  
  let time = 1000;
  
  for (let rep = 0; rep < repetitions; rep++) {
    for (let i = 0; i < pattern.length; i++) {
      notes.push({
        id: `${id}-${rep}-${i}`,
        time: time,
        lane: pattern[i],
        type: 'normal',
      });
      time += noteInterval;
    }
  }

  return {
    id,
    name,
    artist,
    difficulty,
    bpm,
    duration: time + 1000,
    notes,
  };
}
