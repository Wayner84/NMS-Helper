import { openDB } from 'idb'

const DB_NAME = 'nms-helper'
const DB_VERSION = 1
const STORES = ['planner', 'hints', 'notes', 'portals'] as const
export type PersistKey = (typeof STORES)[number]

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    STORES.forEach((store) => {
      if (!db.objectStoreNames.contains(store)) {
        db.createObjectStore(store)
      }
    })
  }
})

export const loadPersisted = async <T>(key: PersistKey): Promise<T | undefined> => {
  const db = await dbPromise
  return (await db.get(key, 'data')) as T | undefined
}

export const savePersisted = async <T>(key: PersistKey, value: T): Promise<void> => {
  const db = await dbPromise
  await db.put(key, value, 'data')
}

export const clearPersisted = async (key: PersistKey): Promise<void> => {
  const db = await dbPromise
  await db.delete(key, 'data')
}
