import { Timestamp } from 'firebase/firestore'; // adjust import if needed

export type ReportType = 'lost_pet' | 'missing_person' | 'incident';
export type ReportMediaType = '' | 'image' | 'video';

export type Report = {
  id: string; // Firestore doc id
  type: ReportType;
  description: string;
  status: string; // 'active', 'found', etc.
  timestamp: Timestamp | Date | any;

  // Location
  coords?: { latitude: number; longitude: number };
  location?: string;

  // Media
  mediaType?: ReportMediaType;
  imageUrls?: string[];
  mediaUrl?: string;
  mediaStoragePath?: string;
  videoUrl?: string;
  videoStoragePath?: string;

  // User
  user: {
    uid: string;
    name: string;
    avatar?: string;
  };

  // [key: string]: any; // <-- (optional) allows you to store future extra fields safely
};