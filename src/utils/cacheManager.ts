import * as FileSystem from 'expo-file-system';

const CACHE_DIR = FileSystem.cacheDirectory + 'AV/';

export async function cleanOldCacheFiles() {
  try {
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    const now = Date.now();

    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(CACHE_DIR + file);
      if (fileInfo.exists && fileInfo.modificationTime) {
        const age = now - fileInfo.modificationTime * 1000;
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (age > twentyFourHours) {
          await FileSystem.deleteAsync(fileInfo.uri, { idempotent: true });
          console.log(`🧹 Deleted cached file: ${file}`);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to clean video cache:', error);
  }
}
