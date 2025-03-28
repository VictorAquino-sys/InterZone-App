import { LRUCache } from 'lru-cache';

const options = {
  max: 100, // Keep 100 most recently used items
  ttl: 1000 * 60 * 5, // Items expire after 5 minutes
  dispose: (value, key) => {
    console.log(`Item with key ${key} is being removed`);
  },
  onInsert: (value, key) => {
    console.log(`New item with key ${key} added`);
  }
};

const cache = new LRUCache(options);

// Set an item in the cache
cache.set('exampleKey', 'exampleValue');
// Retrieve an item
console.log(cache.get('exampleKey')); // Output: 'exampleValue'

// Clear the cache when needed
cache.clear();
