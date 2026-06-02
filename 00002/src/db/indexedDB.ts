import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Meme } from '../types';

interface MemeDB extends DBSchema {
  memes: {
    key: number;
    value: Meme;
    indexes: { 'by-date': Date };
  };
}

let db: IDBPDatabase<MemeDB> | null = null;

export async function initDB() {
  if (db) return db;
  
  db = await openDB<MemeDB>('MemeGeneratorDB', 1, {
    upgrade(db) {
      const store = db.createObjectStore('memes', {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex('by-date', 'createdAt');
    },
  });
  
  return db;
}

export async function saveMeme(meme: Omit<Meme, 'id' | 'createdAt'>) {
  const db = await initDB();
  return db.add('memes', {
    ...meme,
    createdAt: new Date(),
  });
}

export async function getAllMemes(): Promise<Meme[]> {
  const db = await initDB();
  const memes = await db.getAllFromIndex('memes', 'by-date');
  return memes.reverse();
}

export async function deleteMeme(id: number) {
  const db = await initDB();
  return db.delete('memes', id);
}

export async function searchMemes(query: string): Promise<Meme[]> {
  const memes = await getAllMemes();
  return memes.filter(meme => 
    meme.textSettings.content.toLowerCase().includes(query.toLowerCase())
  );
}
