import { MongoClient, Db } from 'mongodb';

// Global references to survive Next.js dev server route bundling & hot module reloads
const globalForDb = globalThis as unknown as {
  __prepkit_client?: MongoClient | null;
  __prepkit_db?: Db | null;
  __prepkit_useMemoryStore?: boolean;
  __prepkit_inMemoryKits?: Map<string, any>;
  __prepkit_inMemoryUsers?: Map<string, any>;
};

const inMemoryKits: Map<string, any> = globalForDb.__prepkit_inMemoryKits || new Map();
const inMemoryUsers: Map<string, any> = globalForDb.__prepkit_inMemoryUsers || new Map();

globalForDb.__prepkit_inMemoryKits = inMemoryKits;
globalForDb.__prepkit_inMemoryUsers = inMemoryUsers;

let client: MongoClient | null = globalForDb.__prepkit_client || null;
let db: Db | null = globalForDb.__prepkit_db || null;
let useMemoryStore = globalForDb.__prepkit_useMemoryStore || false;

export async function connectToDatabase(): Promise<Db | null> {
  if (db) return db;
  if (useMemoryStore) return null;

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepkit';
  
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
    await client.connect();
    db = client.db('prepkit');

    globalForDb.__prepkit_client = client;
    globalForDb.__prepkit_db = db;

    // Create indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('kits').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('kits').createIndex({ id: 1 }, { unique: true });
    
    return db;
  } catch (error) {
    console.warn('MongoDB connection failed or not available, using in-memory store:', (error as Error).message);
    useMemoryStore = true;
    globalForDb.__prepkit_useMemoryStore = true;
    return null;
  }
}

export function isUsingMemoryStore(): boolean {
  return useMemoryStore;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    globalForDb.__prepkit_client = null;
    globalForDb.__prepkit_db = null;
  }
  useMemoryStore = false;
  globalForDb.__prepkit_useMemoryStore = false;
  inMemoryKits.clear();
  inMemoryUsers.clear();
}

// Data access abstractions for Kits
export async function saveKitToDb(savedKit: any): Promise<void> {
  const database = await connectToDatabase();
  if (database) {
    await database.collection('kits').updateOne(
      { id: savedKit.id },
      { $set: savedKit },
      { upsert: true }
    );
  } else {
    inMemoryKits.set(savedKit.id, savedKit);
  }
}

export async function getKitById(id: string, userId?: string): Promise<any | null> {
  const database = await connectToDatabase();
  if (database) {
    const query: any = { id };
    if (userId) query.userId = userId;
    return await database.collection('kits').findOne(query);
  } else {
    const kit = inMemoryKits.get(id);
    if (!kit) return null;
    if (userId && kit.userId !== userId) return null;
    return kit;
  }
}

export async function getUserKits(userId: string): Promise<any[]> {
  const database = await connectToDatabase();
  if (database) {
    return await database.collection('kits')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  } else {
    return Array.from(inMemoryKits.values())
      .filter((k: any) => k.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function deleteKitById(id: string, userId: string): Promise<boolean> {
  const database = await connectToDatabase();
  if (database) {
    const res = await database.collection('kits').deleteOne({ id, userId });
    return res.deletedCount > 0;
  } else {
    const kit = inMemoryKits.get(id);
    if (kit && kit.userId === userId) {
      inMemoryKits.delete(id);
      return true;
    }
    return false;
  }
}

// Data access abstractions for Users
export async function saveUserToDb(user: any): Promise<void> {
  const database = await connectToDatabase();
  if (database) {
    await database.collection('users').updateOne(
      { email: user.email },
      { $set: user },
      { upsert: true }
    );
  } else {
    inMemoryUsers.set(user.email, user);
  }
}

export async function getUserByEmail(email: string): Promise<any | null> {
  const database = await connectToDatabase();
  if (database) {
    return await database.collection('users').findOne({ email });
  } else {
    return inMemoryUsers.get(email) || null;
  }
}

export async function getUserById(id: string): Promise<any | null> {
  const database = await connectToDatabase();
  if (database) {
    return await database.collection('users').findOne({ id });
  } else {
    for (const user of inMemoryUsers.values()) {
      if (user.id === id) return user;
    }
    return null;
  }
}