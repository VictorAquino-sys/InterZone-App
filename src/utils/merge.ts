// src/utils/merge.ts

/**
 * Performs a shallow + nested deep merge of objects, useful for merging context state updates
 * without losing existing nested values (e.g., businessProfile, verifications, etc.).
 */
export function deepMerge<T>(target: T, updates: Partial<T>): T {
    const output = { ...target };
  
    for (const key in updates) {
      const updateVal = updates[key];
      const targetVal = target[key];
  
      if (
        updateVal &&
        typeof updateVal === 'object' &&
        !Array.isArray(updateVal) &&
        typeof targetVal === 'object' &&
        targetVal !== null
      ) {
        // @ts-ignore — safely recurse for nested objects
        output[key] = deepMerge(targetVal, updateVal);
      } else {
        output[key] = updateVal as any;
      }
    }
  
    return output;
  }
  