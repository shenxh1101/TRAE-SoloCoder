export interface InMemoryStore<T extends { id: string }> {
  [key: string]: T
}

class MemoryDatabase {
  private stores: Map<string, InMemoryStore<any>> = new Map()

  createStore<T extends { id: string }>(name: string): InMemoryStore<T> {
    if (!this.stores.has(name)) {
      this.stores.set(name, {})
    }
    return this.stores.get(name) as InMemoryStore<T>
  }

  getStore<T extends { id: string }>(name: string): InMemoryStore<T> | null {
    return this.stores.get(name) as InMemoryStore<T> || null
  }

  clearStore(name: string): boolean {
    if (this.stores.has(name)) {
      this.stores.set(name, {})
      return true
    }
    return false
  }

  getAllStores(): Map<string, InMemoryStore<any>> {
    return this.stores
  }
}

export const db = new MemoryDatabase()
export default db
