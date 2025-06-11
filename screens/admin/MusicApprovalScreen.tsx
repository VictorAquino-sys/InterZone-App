import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking} from 'react-native';
import { getFirestore, collection, query, where, orderBy, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { getStorage, ref as storageRef, deleteObject } from 'firebase/storage';
import i18n from '@/i18n';

const firestore = getFirestore();

type Song = {
    id: string;
    title: string;
    artist: string;
    genre: string;
    description?: string;
    social?: string;
    fileUrl: string;
    userName?: string;
    userEmail?: string;
    uploadedBy: string;
    city: string;
    createdAt: any; // Or: FirebaseFirestoreTypes.Timestamp
    status: 'pending' | 'approved' | 'rejected';
    // Remove userName, userAvatar, tags unless you actually store them!
  };

export default function MusicApprovalScreen() {
    const [pendingSongs, setPendingSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        setLoading(true);
        const fetchSongs = async () => {
        try {
            const q = query(
            collection(firestore, 'songs'),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            const docs: Song[] = snap.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  title: data.title ?? "Unknown",
                  artist: data.artist ?? "Unknown",
                  genre: data.genre ?? "Unknown",
                  description: data.description ?? "",
                  social: data.social ?? "",
                  fileUrl: data.fileUrl ?? "",
                  uploadedBy: data.uploadedBy ?? "",
                  userName: data.userName ?? "",
                  userEmail: data.userEmail ?? "",
                  city: data.city ?? "",
                  createdAt: data.createdAt,
                  status: data.status ?? "pending",
                };
              });

            setPendingSongs(docs);
        } catch (e: any) {
            console.log("Error:", e);
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
        };
        fetchSongs();
    }, []);

    useEffect(() => {
        return () => { if (sound) sound.unloadAsync(); };
    }, [sound]);

    const handleApprove = async (songId: string) => {
        try {
        await updateDoc(doc(firestore, 'songs', songId), { status: 'approved' });
        setPendingSongs(pendingSongs.filter(s => s.id !== songId));
        } catch (e: any) {
        Alert.alert('Error', e.message);
        }
    };

    const handlePlayPause = async (fileUrl: string, songId: string) => {
        if (!fileUrl) {
          Alert.alert("No file", "This song does not have a valid file URL.");
          return;
        }
        try {

            // If pressing play for a different song, stop old sound and start new
            if (playingId !== songId && sound) {
                await sound.unloadAsync();
                setSound(null);
                setPlayingId(null);
                setIsPlaying(false);
                setIsPaused(false);
            }
        
            // Play new song
            if (!sound || playingId !== songId) {
                setIsPlaying(true);
                setIsPaused(false);
                setPlayingId(songId);
                await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
                interruptionModeIOS: InterruptionModeIOS.DoNotMix,
                playThroughEarpieceAndroid: false,
            });
            console.log("Audio mode set. Loading sound...");
        
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: fileUrl }
            );
            setSound(newSound);
            console.log("Sound loaded, starting playback...");
    
            // Play audio and set callback to auto-unload when done
            await newSound.playAsync();
            console.log("Playback started!");

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (!status.isLoaded) return;
                if ('didJustFinish' in status && status.didJustFinish) {
                newSound.unloadAsync();
                setSound(null);
                setPlayingId(null);
                setIsPlaying(false);
                setIsPaused(false);
              } else if (status.isPlaying) {
                setIsPlaying(true);
                setIsPaused(false);
              } else if (status.positionMillis > 0 && !status.isPlaying) {
                setIsPlaying(false);
                setIsPaused(true);
              }
            });
            return;
          }
      
            // Pause if playing
            if (isPlaying && sound) {
                await sound.pauseAsync();
                setIsPlaying(false);
                setIsPaused(true);
                return;
            }
        
            // Resume if paused
            if (isPaused && sound) {
                await sound.playAsync();
                setIsPlaying(true);
                setIsPaused(false);
                return;
            }
      
            } catch (e: any) {
            setIsPlaying(false);
            setPlayingId(null);
            console.log("Audio play error:", e, fileUrl);
            Alert.alert('Playback error', e.message || "Could not play audio.");
            }
        };

    const handleReject = async (song: Song) => {
        try {
            // Delete the audio file from Firebase Storage
            if (song.fileUrl) {
                const filePath = decodeURIComponent(song.fileUrl.split('/o/')[1].split('?')[0]);
                const storage = getStorage();
                try {
                    await deleteObject(storageRef(storage, filePath));
                } catch (err: any) {
                    // Ignore "object-not-found" errors
                    if (!err.code || err.code !== 'storage/object-not-found') throw err;
                }
            }
            // Delete the Firestore document
            await deleteDoc(doc(firestore, 'songs', song.id));
            setPendingSongs(pendingSongs.filter(s => s.id !== song.id));
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{i18n.t('adminDashboard.reviewMusic')}</Text>
            {loading ? <ActivityIndicator /> : (
                <FlatList
                    data={pendingSongs}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingBottom: 32 }}
                    renderItem={({ item }) => {
                        const songActive = playingId === item.id && (isPlaying || isPaused);
                        return (
                            <View style={styles.card}>
                                <Text style={styles.songTitle}>{item.title} — {item.artist}</Text>
                                <Text style={styles.songMeta}>{item.genre}</Text>

                                {item.description ? (
                                <Text style={styles.songDescription}>{item.description}</Text>
                                ) : null}

                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                                    {item.city && (
                                        <Text style={styles.metaChip}>{i18n.t('music.city')}: {item.city}</Text>
                                    )}
                                    {item.userName && (
                                        <Text style={styles.metaChip}>{i18n.t('music.submittedBy')}: {item.userName}</Text>
                                    )}
                                    {item.userEmail && (
                                    <Text style={styles.metaChip}>
                                        {i18n.t('music.email')}: {item.userEmail}
                                    </Text>
                                    )}
                                    {item.createdAt?.toDate && (
                                        <Text style={styles.metaChip}>
                                        {i18n.t('music.submittedAt')}: {item.createdAt.toDate().toLocaleString()}
                                        </Text>
                                    )}
                                    {item.social ? (
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 2 }}>
                                            <Text style={styles.songMeta}>{i18n.t('music.socialLink')}: </Text>
                                            <Text
                                            style={styles.songSocialLink}
                                            onPress={() => {
                                                let url = item.social?.trim();
                                                if (!url) return;
                                                if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
                                                Linking.openURL(url).catch(() =>
                                                Alert.alert('Cannot open link', url)
                                                );
                                            }}
                                            selectable
                                            >
                                            {item.social}
                                            </Text>
                                        </View>
                                    ) : null}

                                </View>

                                <View style={styles.buttonRow}>

                                    <TouchableOpacity style={styles.playButton} onPress={() => handlePlayPause(item.fileUrl, item.id)}>
                                        <Text style={{ color: '#4f46e5', fontWeight: '700' }}>
                                            {playingId === item.id
                                            ? isPlaying
                                                ? "Pause"
                                                : isPaused
                                                ? "Resume"
                                                : "Play"
                                            : i18n.t('play')}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.approveButton, songActive && styles.disabledButton]}
                                        onPress={() => handleApprove(item.id)}
                                        disabled={songActive}
                                    >
                                        <Text style={styles.buttonText}>{i18n.t('approve')}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.rejectButton, songActive && styles.disabledButton]}
                                        onPress={() => handleReject(item)}
                                        disabled={songActive}
                                    >
                                        <Text style={styles.buttonText}>{i18n.t('reject')}</Text>
                                    </TouchableOpacity>
                                    
                                </View>
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f9fafb' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 18 },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 14 },
    songTitle: { fontSize: 16, fontWeight: '700' },
    songMeta: { fontSize: 13, color: '#888', marginBottom: 10 },
    buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
    approveButton: { backgroundColor: '#43a047', borderRadius: 6, padding: 10 },
    rejectButton: { backgroundColor: '#e53935', borderRadius: 6, padding: 10 },
    buttonText: { color: '#fff', fontWeight: '600' },
    playButton: { padding: 8, borderRadius: 5, backgroundColor: '#e3e7fd', marginRight: 10 },
    songDescription: {
        fontSize: 14, color: '#333', marginBottom: 6,
    },
    metaChip: {
        fontSize: 12,
        backgroundColor: '#f0f1f4',
        color: '#444',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginRight: 8,
        marginBottom: 4,
    },
    disabledButton: {
        opacity: 0.5
    },
    songSocialLink: {
        fontSize: 13,
        color: '#2962ff',
        textDecorationLine: 'underline',
    },

});
