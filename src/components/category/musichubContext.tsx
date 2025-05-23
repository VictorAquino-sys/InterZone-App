import React, { createContext, useContext, useState, useRef } from 'react';
import { VideoRef } from 'react-native-video';

type MusicHubContextType = {
  selectedVideoUrl: string | null;
  isVideoModalVisible: boolean;
  videoRef: React.MutableRefObject<VideoRef | null>;
  openVideoModal: (url: string) => void;
  closeVideoModal: () => void;
};

const MusicHubContext = createContext<MusicHubContextType | undefined>(undefined);

export const MusicHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [isVideoModalVisible, setVideoModalVisible] = useState(false);
  const videoRef = useRef<VideoRef>(null);

  const openVideoModal = (url: string) => {
    setSelectedVideoUrl(url);
    setVideoModalVisible(true);
  };

  const closeVideoModal = () => {
    setSelectedVideoUrl(null);
    setVideoModalVisible(false);
  };

  return (
    <MusicHubContext.Provider
      value={{
        selectedVideoUrl,
        isVideoModalVisible,
        videoRef,
        openVideoModal,
        closeVideoModal,
      }}
    >
      {children}
    </MusicHubContext.Provider>
  );
};

export const useMusicHub = (): MusicHubContextType => {
  const context = useContext(MusicHubContext);
  if (!context) {
    throw new Error('useMusicHub must be used within a MusicHubProvider');
  }
  return context;
};
