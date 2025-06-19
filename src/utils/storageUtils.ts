import { getStorage, ref, deleteObject } from 'firebase/storage';

export const deleteImageFromStorage = async (imageUrl: string) => {
  if (!imageUrl) return;
  try {
    const storage = getStorage();
    // Extract the path from the imageUrl
    // Assuming all your Storage URLs contain `/o/` and end with `?alt=media`
    const decodePath = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
    const imageRef = ref(storage, decodePath);
    await deleteObject(imageRef);
  } catch (error) {
    console.warn('Failed to delete image from storage:', imageUrl, error);
  }
};
