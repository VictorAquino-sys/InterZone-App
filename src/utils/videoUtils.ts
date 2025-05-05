import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import mime from 'mime';
// import { getAuth } from 'firebase/auth';
import { Video as VideoCompressor, backgroundUpload, UploadType } from 'react-native-compressor';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage, auth } from '@/config/firebase';
import * as MediaLibrary from 'expo-media-library';
import { User } from '@/contexts/UserContext';

const MAX_VIDEO_SIZE = 250 * 1024 * 1024; // 100MB limit

export const ensureVideoDirExists = async (): Promise<string> => {
    const videoDir = FileSystem.documentDirectory + 'postVideos/';
    const dirInfo = await FileSystem.getInfoAsync(videoDir);
    if (!dirInfo.exists) {
      console.log('📁 Creating video directory...');
      await FileSystem.makeDirectoryAsync(videoDir, { intermediates: true });
    }
    return videoDir;
};

// ——————————————————————————————————————————————————————————————
// Convert any content:// or file:// URI into a readable file:// path
export async function getReadableVideoPath(rawUri: string): Promise<string> {
    console.log("Checking rawUri:", rawUri);
    if (rawUri.startsWith('file://')) return rawUri;
  
    const { status } = await MediaLibrary.requestPermissionsAsync(
      false,
      ['video']
    );
    if (status !== 'granted') {
      throw new Error('Video permission denied');
    }
  
    const ext = mime.getExtension(mime.getType(rawUri) ?? 'video/mp4') || 'mp4';
    const dest = `${FileSystem.cacheDirectory}${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: rawUri, to: dest });
    return dest;
}
// ——————————————————————————————————————————————————————————————

export const saveVideoToAppStorage = async (uri: string, uid: string): Promise<string | null> => {
    try {
      const videoDir = await ensureVideoDirExists();
      const fileName = `video_${uid}_${Date.now()}.mp4`;
      const targetPath = `${videoDir}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: targetPath });
      const verify = await FileSystem.getInfoAsync(targetPath);
      if (!verify.exists || verify.size === 0) {
        console.warn('❌ Copied file missing or empty');
        return null;
      }
      return targetPath;
    } catch (err) {
      console.error('❌ Failed to save video:', err);
      return null;
    }
};

export const validateVideoFile = async (
    uri: string,
    durationSeconds: number
  ): Promise<boolean> => {
    const maxDurationInSeconds = 60;
    if (durationSeconds > maxDurationInSeconds) {
      Alert.alert('Video too long', 'Maximum duration is 4 minutes.');
      return false;
    }
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists || fileInfo.size == null || fileInfo.size > MAX_VIDEO_SIZE) {
      Alert.alert('Invalid file', 'The video is missing or too large.');
      return false;
    }
    return true;
};

export const uploadVideoWithCompression = async (
    localUri: string,
    user: User,
    onProgress: (progress: number) => void
  ): Promise<{downloadUrl:string; storagePath:string} | null> => {
    try {
      const originalInfo = await FileSystem.getInfoAsync(localUri);
      if (!originalInfo.exists || originalInfo.size == null) {
        console.warn("❌ Original video file missing or invalid");
        Alert.alert("Upload Error", "Original video file is invalid or missing.");
        return null;
      }
  
      console.log(`📼 Original size: ${(originalInfo.size / (1024 * 1024)).toFixed(2)} MB`);
  
      const compressedUri = await VideoCompressor.compress(localUri, {}, (progress) => {
        console.log('Compression Progress:', progress);
      });
  
      const extension = compressedUri.split('.').pop() ?? 'mp4';
      const path = `postVideos/${user.uid}/${Date.now()}.${extension}`;
      const fileInfo = await FileSystem.getInfoAsync(compressedUri);
  
      if (!fileInfo.exists || fileInfo.size === 0) {
        console.warn('❌ Compressed file missing or empty');
        Alert.alert('Upload Error', 'Compressed video is invalid.');
        return null;
      }
  
      console.log(`📦 Compressed file size: ${(fileInfo.size / (1024 * 1024)).toFixed(2)} MB`);
  
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/interzone-production.firebasestorage.app/o/${encodeURIComponent(path)}?uploadType=media&name=${encodeURIComponent(path)}`;
      const token = await auth.currentUser?.getIdToken();
  
      if (!token) throw new Error("User token not found");
  
      const result = await backgroundUpload(
        uploadUrl,
        compressedUri,
        {
          httpMethod: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': mime.getType(extension) || 'video/mp4',
          },
          uploadType: UploadType.BINARY_CONTENT,
        },
        (written, total) => {
          onProgress(written / total);
        }
      );
  
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/interzone-production.firebasestorage.app/o/${encodeURIComponent(path)}?alt=media`;
      return { 
        downloadUrl,
        storagePath: path
      };
    } catch (err: any) {
      console.error('❌ Background upload failed:', err);
      Alert.alert('Upload Error', err.message || 'Background upload failed');
      return null;
    }
};