import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { useEffect } from 'react';

export type Song = {
    id: string;
    title: string;
    artist: string;
    genre: string;
    fileUrl: string;
    duration?: string;
    description?: string;
    social?: string;
    [key: string]: any;
  };

type MusicPlayerContextType = {
  nowPlaying: Song | null;
  isPlaying: boolean;
  isPaused: boolean;
  play: (song: Song) => Promise<void>;
  stop: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
};

const MusicPlayerContext = createContext<MusicPlayerContextType>({
  nowPlaying: null,
  isPlaying: false,
  isPaused: false,
  play: async () => {},
  stop: async () => {},
  pause: async () => {},
  resume: async () => {},
});

export const useMusicPlayer = () => useContext(MusicPlayerContext);

export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nowPlaying, setNowPlaying] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const play = useCallback(async (song: Song) => {
    try {
        // If already playing this song, do nothing (or restart, your call)
        if (nowPlaying?.id === song.id && isPlaying) {
            return; // Already playing
        }

        if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }
        const { sound } = await Audio.Sound.createAsync({ uri: song.fileUrl });
        soundRef.current = sound;
        setNowPlaying(song);
        setIsPlaying(true);
        setIsPaused(false);
        await sound.playAsync();

        sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
            setNowPlaying(null);
            setIsPlaying(false);
            setIsPaused(false);
            soundRef.current = null;
            }
        });
        } catch (e) {
        setNowPlaying(null);
        setIsPlaying(false);
        setIsPaused(false);
        }
    }, [nowPlaying, isPlaying]);

    const stop = useCallback(async () => {
        if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
            setNowPlaying(null);
            setIsPlaying(false);
            setIsPaused(false);
        }
    }, []);

    const pause = useCallback(async () => {
        if (soundRef.current && isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
          setIsPaused(true);
        }
    }, [isPlaying]);
    
    const resume = useCallback(async () => {
        if (soundRef.current && isPaused) {
            await soundRef.current.playAsync();
            setIsPlaying(true);
            setIsPaused(false);
        }
    }, [isPaused]);

    React.useEffect(() => {
        return () => {
          if (soundRef.current) {
            soundRef.current.unloadAsync();
          }
        };
      }, []);

    return (
        <MusicPlayerContext.Provider 
            value={{ nowPlaying, isPlaying, isPaused, play, stop, pause, resume }}
        >
            {children}
        </MusicPlayerContext.Provider>
    );
};