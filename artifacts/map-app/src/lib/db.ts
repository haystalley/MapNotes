import { openDB, DBSchema, IDBPDatabase } from "idb";

export interface MapMarker {
  id: string;
  type: "marker";
  lat: number;
  lng: number;
  title: string;
  description: string;
  tags: string[];
  date: string;
  color: string;
  iconType: string;
  imageIds: string[];
  createdAt: number;
}

export interface MapShape {
  id: string;
  type: "polygon" | "rectangle" | "circle";
  geojson: object;
  center?: [number, number];
  radius?: number;
  title: string;
  description: string;
  tags: string[];
  date: string;
  color: string;
  fillColor: string;
  opacity: number;
  imageIds: string[];
  createdAt: number;
}

export type MapElement = MapMarker | MapShape;

export interface StoredImage {
  id: string;
  data: string;
  name: string;
  mimeType: string;
  createdAt: number;
}

export interface ProjectEntry {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  mapMode?: string;
  activeLayers?: { id: string; opacity: number; activatedAt: number }[];
  darkMode?: boolean;
  elements: MapElement[];
  images: StoredImage[];
  thumbnail: string;
}

interface MapAppDB extends DBSchema {
  elements: {
    key: string;
    value: MapElement;
  };
  images: {
    key: string;
    value: StoredImage;
  };
  settings: {
    key: string;
    value: unknown;
  };
  projects: {
    key: string;
    value: ProjectEntry;
  };
}

let dbInstance: IDBPDatabase<MapAppDB> | null = null;

export async function getDb(): Promise<IDBPDatabase<MapAppDB>> {
  if (!dbInstance) {
    dbInstance = await openDB<MapAppDB>("map-app", 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("elements", { keyPath: "id" });
          db.createObjectStore("images", { keyPath: "id" });
          db.createObjectStore("settings");
        }
        if (oldVersion < 2) {
          db.createObjectStore("projects", { keyPath: "id" });
        }
      },
    });
  }
  return dbInstance;
}

export async function getAllElements(): Promise<MapElement[]> {
  const db = await getDb();
  return db.getAll("elements");
}

export async function saveElement(element: MapElement): Promise<void> {
  const db = await getDb();
  await db.put("elements", element);
}

export async function deleteElement(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("elements", id);
}

export async function clearAllElements(): Promise<void> {
  const db = await getDb();
  await db.clear("elements");
}

export async function saveImage(image: StoredImage): Promise<void> {
  const db = await getDb();
  await db.put("images", image);
}

export async function getImage(id: string): Promise<StoredImage | undefined> {
  const db = await getDb();
  return db.get("images", id);
}

export async function getAllImages(): Promise<StoredImage[]> {
  const db = await getDb();
  return db.getAll("images");
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("images", id);
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put("settings", value, key);
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return db.get("settings", key) as Promise<T | undefined>;
}

export async function getAllProjects(): Promise<ProjectEntry[]> {
  const db = await getDb();
  const all = await db.getAll("projects");
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveProject(project: ProjectEntry): Promise<void> {
  const db = await getDb();
  await db.put("projects", project);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("projects", id);
}
