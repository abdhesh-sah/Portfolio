import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Relative path from Backend/src/lib to Backend/src/seed-data.json is ../seed-data.json
const SEED_DATA_PATH = path.resolve(__dirname, '../seed-data.json');

export type SeedDataType = 
  | 'siteSettings' 
  | 'projects' 
  | 'skills' 
  | 'mindsets' 
  | 'experiences' 
  | 'emailTemplates' 
  | 'seoSettings';

/**
 * Synchronizes database updates back to seed-data.json.
 * This ensures that frontend fallbacks remain up-to-date even when the backend is offline.
 * 
 * @param type The top-level key in seed-data.json
 * @param data The updated data object (must contain the natural identifier)
 */
export function syncSeedData(type: SeedDataType, data: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    let fileContent: string;
    try {
      // Read atomically — catches ENOENT directly instead of existsSync + read (TOCTOU)
      fileContent = fs.readFileSync(SEED_DATA_PATH, 'utf-8');
    } catch (readErr: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (readErr?.code === 'ENOENT') {
        logger.warn({ path: SEED_DATA_PATH }, "seed-data.json not found for sync");
        return;
      }
      throw readErr;
    }

    let seedData: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
        seedData = JSON.parse(fileContent);
    } catch (e) {
        logger.error({ error: e }, "Failed to parse seed-data.json");
        return;
    }

    if (type === 'siteSettings') {
      // Merge site settings (object)
      seedData.siteSettings = { ...seedData.siteSettings, ...data };
    } else {
      const array = seedData[type];
      if (!Array.isArray(array)) {
        logger.warn({ type }, "Target type in seed-data is not an array");
        return;
      }

      // Determine identifier key
      let identifierKey: string | string[] = 'id';
      if (type === 'projects') identifierKey = 'slug';
      else if (type === 'skills') identifierKey = 'name';
      else if (type === 'mindsets') identifierKey = 'title';
      else if (type === 'emailTemplates') identifierKey = 'name';
      else if (type === 'seoSettings') identifierKey = 'pageSlug';
      else if (type === 'experiences') identifierKey = ['role', 'organization'];

      if (Array.isArray(identifierKey)) {
        // Multi-key matching (e.g. experiences)
        const keys = identifierKey;
        const index = array.findIndex((item: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
            keys.every(k => item[k] === data[k])
        );
        if (index !== -1) {
            array[index] = { ...array[index], ...data };
        } else {
            array.push(data);
        }
      } else {
        // Single-key matching
        const key = identifierKey;
        const idValue = data[key];
        
        // If we don't have the identifier in the data, we can't sync reliably
        if (idValue === undefined || idValue === null) {
            logger.warn({ type, key, data }, "Cannot sync: missing identifier in data");
            return;
        }

        const index = array.findIndex((item: any) => item[key] === idValue); // eslint-disable-line @typescript-eslint/no-explicit-any
        if (index !== -1) {
          array[index] = { ...array[index], ...data };
        } else {
          array.push(data);
        }
      }
    }

    // Write back to disk with formatting
    fs.writeFileSync(SEED_DATA_PATH, JSON.stringify(seedData, null, 2), 'utf-8');
    logger.info({ type }, "Synchronized update to seed-data.json");
  } catch (error) {
    // Requirements state to handle errors gracefully so DB save still succeeds
    logger.error({ error, type }, "Graceful failure syncing seed-data.json");
  }
}
