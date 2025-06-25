import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Platform, TextInput, Switch, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Linking } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
// import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { deleteObject, ref as storageRef } from 'firebase/storage';
import { onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirestore, collection, addDoc, Timestamp, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { useUser } from '../src/contexts/UserContext';
import { Audio as RNCompressorAudio } from 'react-native-compressor';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCity } from '@/contexts/cityContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { logScreen, logEvent } from '@/utils/analytics';
import { useTheme } from '@/contexts/ThemeContext';
import { themeColors } from '@/theme/themeColors';
import type { ThemeColors } from '@/theme/themeColors';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import type { Song } from '@/contexts/MusicPlayerContext';
import { useIsFocused } from '@react-navigation/native';
import { Audio } from 'expo-av';
import ThemedStatusBar from '@/components/ThemedStatusBar';
import i18n from '@/i18n';

const storage = getStorage();
const firestore = getFirestore();
const MAX_UPLOADS_PER_DAY = 1;
const MAX_FILE_SIZE_MB = 20;


const genres = [
  'Cumbia', 'Electronic', 'Rock', 'Reggaeton', 'Folklore', 'Pop', 'Other', "Salsa", "Jazz"
];


const MusicScreen = () => {
    const [selectedTab, setSelectedTab] = useState<'listen' | 'artist'>('listen');
    const { nowPlaying, isPlaying, isPaused, play, pause, resume, stop } = useMusicPlayer();

    // For Artists tab state
    const [agreed, setAgreed] = useState(false);
    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState(genres[0]);
    const [desc, setDesc] = useState('');
    const [artistName, setArtistName] = useState('');
    const [social, setSocial] = useState('');
    const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
    const [uploading, setUploading] = useState(false);
    const titleNormalized = title.trim().toLowerCase();
    const artistNormalized = artistName.trim().toLowerCase();
    const { user } = useUser();
    const currentCity = user?.lastKnownLocation?.label || '';
    const userId = user?.uid;
    const isAdmin = !!user?.claims?.admin; // This is the key line

    const [songs, setSongs] = useState<Song[]>([]);
    const [loadingSongs, setLoadingSongs] = useState(false);

    const [fileSize, setFileSize] = useState<number | null>(null); // in bytes
    const [compressedSize, setCompressedSize] = useState<number | null>(null); // in bytes
    const [audioDuration, setAudioDuration] = useState<number | null>(null); // in seconds

    const [reportingSong, setReportingSong] = useState<Song | null>(null);
    const [reportReason, setReportReason] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);    
    const { city } = useCity();

    const { resolvedTheme } = useTheme();
    const colors = themeColors[resolvedTheme];
    const styles = useStyles(colors);

    const allowedExtensions = ['mp3', 'wav'];

    function isAllowedFile(file: DocumentPickerAsset | null): boolean {
        if (!file || !file.name) return false;
        const ext = file.name.split('.').pop()?.toLowerCase();
        return allowedExtensions.includes(ext || "");
    }

    useEffect(() => {
        logScreen('MusicScreen');
    }, []);

    useEffect(() => {
        logEvent('music_tab_selected', { tab: selectedTab });
    }, [selectedTab]);      

    // Fetch songs from Firestore on mount and when uploads change
    useEffect(() => {
        if (selectedTab !== 'listen') return;

        setLoadingSongs(true);

        let q;
        if (city) {
            q = query(
            collection(firestore, 'songs'),
            where('city', '==', city),
            where('status', '==', 'approved'),
            orderBy('createdAt', 'desc')
            );
        } else {
            setSongs([]);
            setLoadingSongs(false);
            return;
        }

        // Real-time listener
        const unsubscribe = onSnapshot(q, (snap) => {
            const docs = snap.docs
            .map(doc => {
                const data = doc.data() as Partial<Song>;
                return { id: doc.id, ...data };
            })
            .filter(
                (d): d is Song =>
                typeof d.title === 'string' &&
                typeof d.artist === 'string' &&
                typeof d.genre === 'string' &&
                typeof d.fileUrl === 'string'
            );
            setSongs(docs);
            setLoadingSongs(false);
        }, (error:any) => {
            console.error('Error loading songs:', error);
            setLoadingSongs(false);
        });

        return () => unsubscribe();

    }, [selectedTab, city]);

    async function handlePickFile() {
        try {
          const result = await DocumentPicker.getDocumentAsync({
            type: 'audio/*',
            copyToCacheDirectory: true,
            multiple: false,
          });
      
          if (!result.canceled && result.assets && result.assets.length > 0) {
            const picked = result.assets[0];
            const ext = picked.name.split('.').pop()?.toLowerCase();
      
            // 5. File Type Alert
            if (!allowedExtensions.includes(ext || '')) {
                Alert.alert(
                    i18n.t('music.unsupportedFileTypeTitle'),
                    i18n.t('music.unsupportedFileTypeMessage')
                );
              return;
            }
      
            // 4. Check file.size Fallback
            if (picked && (!picked.size || picked.size === 0)) {
                Alert.alert(
                  i18n.t('music.fileSizeUnknownTitle'),
                  i18n.t('music.fileSizeUnknownMessage')
                );
                return;
            }

            setFileSize(picked.size || null);
      
            // 1. Warn for WAV Re-compression
            if (ext === 'wav' && (picked.size || 0) > 10 * 1024 * 1024) {
                Alert.alert(
                    i18n.t('music.compressionWarningTitle'),
                    i18n.t('music.compressionWarningMessage')
                );
            }
      
            // 3. Validate Audio Duration
            const duration = await getAudioDuration(picked.uri);
            setAudioDuration(duration);
            if (duration && duration > 6 * 60) {
                Alert.alert(
                    i18n.t('music.audioTooLongTitle'),
                    i18n.t('music.audioTooLongMessage', { max: 6 })
                );
              return;
            }
            if (duration && duration > 5 * 60) {
                Alert.alert(
                    i18n.t('music.audioLongTitle'),
                    i18n.t('music.audioLongMessage', { max: 6 })
                );
            }
      
            setFile(picked);
            setCompressedSize(null); // Reset compressed size
      
          }
        } catch (err: any) {
            Alert.alert(i18n.t('music.filePickingErrorTitle'), err.message);
        }
    }

    const resetForm = () => {
        setTitle('');
        setGenre(genres[0]);
        setDesc('');
        setArtistName('');
        setSocial('');
        setFile(null);
    };

    const handleReportSong = (song: Song) => {
        setReportingSong(song);
        setReportReason('');
      };
      

    function formatSize(bytes?: number | null) {
        if (bytes === undefined || bytes === null) return 'Unknown';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    }

    const playSongAtIndex = (index: number) => {
        if (!songs.length) return;
        if (index >= 0 && index < songs.length) {
          handlePlay(songs[index]);
        }
    };
      

    // Basic playback logic
    const handlePlay = async (song: any, songIndex?: number) => {
        logEvent('music_song_played', {
            songId: song.id,
            title: song.title,
            artist: song.artist,
            city: song.city,
            genre: song.genre,
        });

        await play(song, () => {
            // Callback to auto-play next song
            const currentIdx = songs.findIndex((s) => s.id === song.id);
            if (currentIdx !== -1 && currentIdx + 1 < songs.length) {
              playSongAtIndex(currentIdx + 1);
            }
        });

        // Optimistically update UI
        setSongs(prevSongs => prevSongs.map(s =>
            s.id === song.id
            ? { ...s, playCount: (s.playCount || 0) + 1 }
            : s
        ));

        try {
            await updateDoc(doc(firestore, 'songs', song.id), {
                playCount: increment(1),
            });
    
        } catch (err) {
            console.log('Failed to increment playCount:', err);
            // Optionally roll back UI if failed
            setSongs(prevSongs => prevSongs.map(s =>
                s.id === song.id
                ? { ...s, playCount: (s.playCount || 1) - 1 }
                : s
            ));
        }

    };

    const handleDeleteSong = async (song: any) => {

        logEvent('music_song_deleted', {
            songId: song.id,
            userId: user?.uid,
            city: song.city,
            genre: song.genre,
        });

        Alert.alert(
            i18n.t('music.deleteSongTitle'),
            i18n.t('music.deleteSongMessage'),
          [
            { text: i18n.t('music.cancel'), style: 'cancel' },
            { text: i18n.t('music.delete'), style: 'destructive', onPress: async () => {
              try {
                // 1. Delete from Firestore
                await deleteDoc(doc(firestore, 'songs', song.id));
                // 2. Delete from Storage
                // The file path you used for uploading
                const filePath = decodeURIComponent(song.fileUrl.split('/o/')[1].split('?')[0]);
                await deleteObject(ref(storage, filePath));
                // 3. Remove from list in UI
                setSongs(songs => songs.filter(s => s.id !== song.id));
                Alert.alert(i18n.t('music.songDeleted'));
            } catch (e: any) {
                Alert.alert(i18n.t('music.deleteFailed'), e.message);
            }
            }},
          ]
        );
    };

    const handleStop = async () => {
        if (nowPlaying) {
            logEvent('music_song_stopped', {
                songId: nowPlaying.id,
                userId,
                city: nowPlaying.city,
                genre: nowPlaying.genre,
            });
        } else {
            logEvent('music_stop_pressed_no_song', { userId });
        }
        await stop();
    };

    async function getAudioDuration(uri: string): Promise<number | null> {
        try {
          const { sound } = await Audio.Sound.createAsync({ uri });
          const status = await sound.getStatusAsync();
          await sound.unloadAsync();
          if (status.isLoaded) {
            return status.durationMillis ? status.durationMillis / 1000 : null;
          }
          return null;
        } catch (e) {
          console.warn('Failed to get audio duration', e);
          return null;
        }
    }

    const handleUpload = async () => {
        if (!userId) {
            Alert.alert(i18n.t('music.authRequiredTitle'), i18n.t('music.authRequiredMessage'));
            return;
        }

        if (!currentCity) {
            Alert.alert(i18n.t('music.cityRequiredTitle'), i18n.t('music.cityRequiredMessage'));
            return;
        }

        if (!title.trim() || !artistName.trim() || !file) {
            Alert.alert(i18n.t('music.fillAllFields'));
            return;
        }

        if (!isAllowedFile(file)) {
            Alert.alert(
            i18n.t('music.invalidFileTitle'),
            i18n.t('music.invalidFileMessage') // "Please upload a .mp3 or .wav file."
            );
            return;
        }

        if (file && file.size && file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            Alert.alert(
              i18n.t('music.fileTooLargeTitle') || 'File Too Large',
              i18n.t('music.fileTooLargeMessage', { max: MAX_FILE_SIZE_MB }) ||
              `Audio files must be smaller than ${MAX_FILE_SIZE_MB} MB. Please compress or trim your audio.`
            );
            return;
        }

        setUploading(true);

        logEvent('music_upload_attempt', {
            userId,
            city,
            genre,
            fileSize: file?.size || 0,
            ext: file?.name?.split('.').pop(),
          });

        try {
            if (!isAdmin) {
                // 1. Rate limit: block if user has >= MAX_UPLOADS_PER_DAY in last 24h
                const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
                const uploadsQuery = query(
                collection(firestore, 'songs'),
                where('uploadedBy', '==', userId),
                where('createdAt', '>=', Timestamp.fromDate(since))
                );
                const uploadsSnap = await getDocs(uploadsQuery);
                if (uploadsSnap.size >= MAX_UPLOADS_PER_DAY) {
                    Alert.alert(
                        i18n.t('music.tooManyUploadsTitle') || 'Upload limit reached',
                        i18n.t('music.tooManyUploadsMessage', { n: MAX_UPLOADS_PER_DAY }) ||
                        `You can only upload ${MAX_UPLOADS_PER_DAY} songs per day.`
                    );
                    setUploading(false);
                    return;
                }
            }

            // 2. Duplicate check: block if (title + artist) already exists (approved or pending)
            const duplicateQuery = query(
            collection(firestore, 'songs'),
            where('titleNormalized', '==', titleNormalized),
            where('artistNormalized', '==', artistNormalized),
            where('status', 'in', ['pending', 'approved']) // block uploading again while review pending or already in app
            );
            const duplicateSnap = await getDocs(duplicateQuery);
            if (!duplicateSnap.empty) {
                Alert.alert(
                    i18n.t('music.duplicateSongTitle') || 'Duplicate song',
                    i18n.t('music.duplicateSongMessage') || 'A song with this title and artist has already been uploaded.'
                );
                setUploading(false);
                return;
            }

            const ext = file.name.split('.').pop()?.toLowerCase();
            // Compress the audio file first
            let compressedUri = file.uri;
            if (ext === 'mp3' || (file.size && file.size < 7 * 1024 * 1024)) {
                // Don't compress mp3 or small files, just upload
                compressedUri = file.uri;
            } else {

                try {
                    // Use medium quality as a good tradeoff; adjust as needed
                    compressedUri = await RNCompressorAudio.compress(file.uri, { quality: 'high' });
                    console.log('Compressed audio path:', compressedUri);
                } catch (compressionError) {
                    // Optional: alert user if compression fails, or just upload the original
                    console.warn('Audio compression failed, uploading original file', compressionError);
                    // continue with the original file
                }
            }

            // 1. Upload audio file to Firebase Storage
            const fileExt = file.name.split('.').pop();
            const fileRef = ref(storage, `music/${userId}/${Date.now()}.${fileExt}`);


            // After getting compressedUri:
            const response = await fetch(compressedUri);
            const blob = await response.blob();
            setCompressedSize(blob.size); // set size in UI

            // Fetch file as a blob
            // const fileBlob = await fetch(compressedUri).then(res => res.blob());
            await uploadBytes(fileRef, blob);
            const downloadURL = await getDownloadURL(fileRef);

            // 2. Add song metadata to Firestore
            await addDoc(collection(firestore, 'songs'), {
                title: title.trim(),
                artist: artistName.trim(),
                genre,
                description: desc,
                social,
                fileUrl: downloadURL,
                uploadedBy: userId,
                userName: user.name ?? "",
                userEmail: user.email ?? "",
                city: currentCity,
                createdAt: Timestamp.now(),
                status: 'pending',
                titleNormalized,     
                artistNormalized,
                playCount: 0     
            });

            Alert.alert(
                i18n.t('music.uploadSuccess'),
                i18n.t('music.uploadPendingReview')
            );

            logEvent('music_upload_success', {
                userId,
                city,
                genre,
                fileSize: file?.size || 0,
                ext: file?.name?.split('.').pop(),
            });

            resetForm();
            setAgreed(false);
        } catch (err: any) {
            console.log("error:", err);
            Alert.alert(
                i18n.t('music.uploadFailed'),
                err.message
            ); 
            
            logEvent('music_upload_failure', {
                userId,
                city,
                genre,
                error: err?.message || String(err),
            });

        } finally {
        setUploading(false);
        }
    };

    const isFocused = useIsFocused();

    return (
        <>
            {isFocused && (
            <ThemedStatusBar/>
            )}
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundprofile}}>
            <View style={styles.container}>
            {/* Tabs */}
                <View style={styles.tabRow}>
                    
                    <TouchableOpacity
                        style={[styles.tabButton, selectedTab === 'listen' && styles.tabButtonActive]}
                        onPress={() => setSelectedTab('listen')}
                    >
                    <Text style={[styles.tabLabel, selectedTab === 'listen' && styles.tabLabelActive]}>
                        {i18n.t('music.listen')}
                    </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, selectedTab === 'artist' && styles.tabButtonActive]}
                        onPress={() => setSelectedTab('artist')}
                    >
                    <Text style={[styles.tabLabel, selectedTab === 'artist' && styles.tabLabelActive]}>
                        {i18n.t('music.forArtists')}
                    </Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.tabContent}>
                    {selectedTab === 'listen' ? (
                    <View style={{ flex: 1 }}>
                        <View style={{ alignItems: 'center', marginTop: 4 }}>
                            <Text style={{ fontSize: 15, color: colors.musicCity, fontWeight: 'bold' }}>
                                {city
                                    ? i18n.t('music.showingMusicForCity', { city })
                                    : i18n.t('music.chooseCity')
                                }
                            </Text>
                        </View>
                        <FlatList
                            data={songs}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                            <View style={styles.songRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.songTitle}>{item.title} - {item.artist}</Text>
                                    <Text style={styles.songMeta}>

                                    <Text>{i18n.t('music.genre')}: {item.genre}</Text>
                                    {item.duration ? ` • ${item.duration}` : ''}
                                    </Text>

                                    <Text style={[styles.songMeta, { color: '#009688', fontWeight: 'bold' }]}>
                                        <Ionicons name="location-outline" size={14} color="#009688" /> {item.city}
                                    </Text>

                                    {/* <Text style={{ height: 4 }} /> */}
                                    <Text style={styles.songMeta}>
                                    <Ionicons name="play-circle-outline" size={14} color="#888" /> {(item.playCount || 0)} {i18n.t('music.playCount')}
                                    </Text>

                                    {item.description ? (
                                    <Text style={styles.songDesc} selectable>
                                        {item.description}
                                    </Text>
                                    ) : null}

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

                                    {item.userName ? (
                                        
                                        <Text style={styles.songMeta}>{i18n.t('music.submittedBy')}: {item.userName}</Text>
                                    ) : null}
                                    {item.createdAt?.toDate && (
                                        <Text style={styles.songMeta}>
                                            {i18n.t('music.submittedAt')}: {item.createdAt.toDate().toLocaleString()}

                                        </Text>
                                    )}

                                </View>
                                <TouchableOpacity
                                    style={styles.playButton}
                                    onPress={() => handlePlay(item)}
                                    disabled={nowPlaying?.id === item.id && (isPlaying || isPaused)}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                        {nowPlaying?.id === item.id
                                        ? (isPlaying ? 'Playing' : isPaused ? 'Paused' : 'Play')
                                        : 'Play'}
                                        
                                    </Text>

                                </TouchableOpacity>
                                {user?.uid === item.uploadedBy && (
                                    <TouchableOpacity
                                        style={styles.fabDeleteIcon}
                                        onPress={() => handleDeleteSong(item)}
                                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                                    >
                                        <Ionicons name="trash-bin" size={26} color="#ff1744" />
                                    </TouchableOpacity>
                                )}

                                {user?.uid !== item.uploadedBy && (
                                    <TouchableOpacity
                                    style={styles.fabReportIcon}
                                    onPress={() => handleReportSong(item)}
                                    hitSlop={{ top: 18, bottom: 18, left: 18, right: 18 }}
                                    >
                                    <Ionicons name="flag-outline" size={25} color="#FFC107" />
                                    </TouchableOpacity>
                                )}

                            </View>
                            )}
                            contentContainerStyle={{ paddingBottom: 24 }}
                            ListEmptyComponent={
                                loadingSongs
                                ? <ActivityIndicator style={{ marginTop: 40 }} />
                                : <Text style={{ textAlign: 'center', color: '#aaa', marginTop: 30 }}>
                                    {i18n.t('music.noMusic')}
                                    </Text>
                            }
                        />
                        {nowPlaying && (
                        <View style={styles.nowPlayingBar}>
                            <Text numberOfLines={1} style={styles.nowPlayingText}>
                            {i18n.t('music.nowPlaying', { title: nowPlaying.title, artist: nowPlaying.artist })}
                            </Text>
                            {isPlaying && (
                            <TouchableOpacity onPress={pause}>
                                <Text style={[styles.stopButton, { color: '#FFA000' }]}>
                                {i18n.t('music.pause') || 'Pause'}
                                </Text>
                            </TouchableOpacity>
                            )}
                            {isPaused && (
                            <TouchableOpacity onPress={resume}>
                                <Text style={[styles.stopButton, { color: '#009688' }]}>
                                {i18n.t('music.resume') || 'Resume'}
                                </Text>
                            </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={handleStop}>
                            <Text style={styles.stopButton}>{i18n.t('music.stop')}</Text>
                            </TouchableOpacity>
                        </View>
                        )}

                        {reportingSong && (
                        <View style={{
                            position: 'absolute', left: 0, right: 0, bottom: 0, top: 0,
                            backgroundColor: 'rgba(0,0,0,0.22)', justifyContent: 'center', alignItems: 'center', zIndex: 100,
                        }}>
                            <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 24, width: '90%', maxWidth: 340 }}>
                            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
                                {i18n.t('music.reportSongTitle')}
                            </Text>
                            <Text style={{ fontSize: 14, color: '#444', marginBottom: 12 }}>
                                {i18n.t('music.reportSongMessage')}
                            </Text>
                            <TextInput
                                style={{
                                borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
                                padding: 10, minHeight: 40, marginBottom: 16
                                }}
                                placeholder={i18n.t('music.enterReportReason')}
                                value={reportReason}
                                onChangeText={setReportReason}
                                multiline
                                autoFocus
                            />
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                                <TouchableOpacity
                                onPress={() => setReportingSong(null)}
                                style={{ marginRight: 20 }}
                                >
                                <Text style={{ color: '#888', fontWeight: 'bold' }}>{i18n.t('music.cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                onPress={async () => {
                                    if (!reportReason.trim()) {
                                    Alert.alert(i18n.t('music.enterReportReason'));
                                    return;
                                    }
                                    setReportSubmitting(true);
                                    try {
                                    await addDoc(collection(firestore, 'songReports'), {
                                        songId: reportingSong?.id,
                                        reporterId: userId,
                                        reason: reportReason.trim(),
                                        createdAt: Timestamp.now(),
                                    });

                                    setReportingSong(null);
                                    // After successful report submission:
                                    logEvent('music_song_reported', {
                                        songId: reportingSong?.id,
                                        userId,
                                        reason: reportReason.trim(),
                                    });
                                    Alert.alert(i18n.t('music.reportThanksTitle'), i18n.t('music.reportThanksMessage'));
                                    } catch (e: any) {
                                        console.log("Report failed:", e);
                                        Alert.alert(i18n.t('music.reportFailed'), e.message);
                                    } finally {
                                    setReportSubmitting(false);
                                    }
                                }}
                                disabled={reportSubmitting}
                                >
                                <Text style={{ color: '#4f46e5', fontWeight: 'bold' }}>
                                    {reportSubmitting ? i18n.t('music.submitting') : i18n.t('music.submit')}
                                </Text>
                                </TouchableOpacity>
                            </View>
                            </View>
                        </View>
                        )}

                    </View>
                    ) : (   
                    <View style={{ flex: 1 }}>
                        <View style={{ alignItems: 'center', marginTop: 4 }}>
                            <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.musicCity }}>
                                {i18n.t('music.uploadingFromCity', {city: currentCity || i18n.t('music.unknownCity')})}
                            </Text>
                        </View>

                        <KeyboardAvoidingView
                            style={{ flex: 1 }}
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 95 : 0}
                        >
                            <ScrollView
                                contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >

                            {/* Policy/terms */}
                            {!agreed ? (
                            <View style={styles.artistBox}>
                                <Text style={styles.title}>{i18n.t('music.showcaseTitle')}</Text>
                                <Text style={styles.text}>{i18n.t('music.policy')}</Text>
                                <View style={styles.agreeRow}>
                                    <Switch value={agreed} onValueChange={setAgreed} />
                                    <Text style={{ marginLeft: 10, fontSize: 16, color: colors.text }}>
                                        {i18n.t('music.agreeToPolicy')}
                                    </Text>
                                </View>
                            </View>
                            ) : (
                            <View style={styles.artistBox}>
                                <Text style={styles.formLabel}>{i18n.t('music.songTitle')}</Text>
                                <TextInput
                                    value={title}
                                    onChangeText={setTitle}
                                    style={styles.input}
                                    placeholder={i18n.t('music.songTitlePlaceholder')}
                                    placeholderTextColor={colors.placeholder}
                                    maxLength={40}
                                />
                                <Text style={styles.formLabel}>{i18n.t('music.artistName')}</Text>
                                <TextInput
                                    value={artistName}
                                    onChangeText={setArtistName}
                                    style={styles.input}
                                    placeholderTextColor={colors.placeholder}
                                    placeholder={i18n.t('music.artistNamePlaceholder')}
                                    maxLength={40}
                                />
                                <Text style={styles.formLabel}>{i18n.t('music.genre')}</Text>
                                <View style={styles.genreRow}>
                                    {genres.map(g => (
                                        <TouchableOpacity
                                        key={g}
                                        style={[
                                            styles.genreChip,
                                            genre === g && styles.genreChipActive
                                        ]}
                                        onPress={() => setGenre(g)}
                                        >
                                        <Text style={{ color: colors.text ? '#fff' : '#444', fontWeight: genre === g ? 'bold' : 'normal' }}>
                                            {g}
                                        </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.formLabel}>{i18n.t('music.shortDesc')}</Text>
                                <TextInput
                                    value={desc}
                                    onChangeText={setDesc}
                                    style={[styles.input, { minHeight: 60 }]}
                                    placeholderTextColor={colors.placeholder}
                                    placeholder={i18n.t('music.shortDescPlaceholder')}
                                    maxLength={120}
                                    multiline
                                />
                                <Text style={styles.formLabel}>{i18n.t('music.socialLink')}</Text>
                                <TextInput
                                    value={social}
                                    onChangeText={setSocial}
                                    style={styles.input}
                                    placeholderTextColor={colors.placeholder}
                                    placeholder={i18n.t('music.socialLinkPlaceholder')}
                                    maxLength={80}
                                />
                                {/* Pick File */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                                    <TouchableOpacity style={styles.fileButton} onPress={handlePickFile} disabled={uploading}>
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                        {file ? i18n.t('music.fileSelected') : i18n.t('music.selectAudio')}
                                        </Text>
                                    </TouchableOpacity>
                                        {file && <Text style={{ marginLeft: 12, color: '#333', maxWidth: 120 }} numberOfLines={1}>{file.name}</Text>}
                                </View>
                                <Text style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
                                    {i18n.t('music.fileFormatNote')}
                                </Text>

                                <View style={{ marginTop: 12, backgroundColor: '#fffbe6', borderRadius: 8, padding: 12 }}>
                                    <Text style={{ color: '#ad6800', fontSize: 13 }}>
                                        {i18n.t('music.note')}
                                    </Text>
                                </View>

                                {file && (
                                <View style={{ marginTop: 10 }}>
                                    <Text style={{ fontSize: 13, color: '#555' }}>
                                        {i18n.t('music.originalSize')}: {formatSize(fileSize)}
                                    </Text>
                                    {compressedSize !== null && (
                                    <Text style={{ fontSize: 13, color: '#555' }}>
                                        {i18n.t('music.compressedSize')}: {formatSize(compressedSize)}
                                    </Text>
                                    )}
                                    {audioDuration !== null && (
                                    <Text style={{ fontSize: 13, color: '#555' }}>
                                        {i18n.t('music.duration')}: {Math.round(audioDuration / 60)} {i18n.t('music.minutes')} {Math.round(audioDuration % 60)} {i18n.t('music.seconds')}
                                    </Text>
                                    )}
                                </View>
                                )}

                                {isAdmin && (
                                <Text style={{ color: '#43a047', fontWeight: 'bold', marginTop: 6, marginBottom: 4 }}>
                                    {i18n.t('music.adminUnlimitedUploads') || 'You can upload unlimited songs as an admin.'}
                                </Text>
                                )}

                                {/* Upload */}
                                <TouchableOpacity
                                    style={[styles.uploadButton, uploading && { opacity: 0.7 }]}
                                    onPress={handleUpload}
                                    disabled={uploading}
                                >
                                {uploading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
                                        {uploading ? i18n.t('music.uploading') : i18n.t('music.uploadSong')}
                                    </Text>
                                )}
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => setAgreed(false)}>
                                <Text style={{ color: '#ff1744', marginTop: 16, textAlign: 'center', fontSize: 15 }}>
                                    {i18n.t('music.cancelReturn')}
                                </Text>
                                </TouchableOpacity>
                            </View>
                            )}
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </View>
                    )}
                </View>
            </View>
        </SafeAreaView>
        </>
    );
};

const useStyles = (colors: ThemeColors) => StyleSheet.create({
    container: { 
    flex: 1, 
    backgroundColor: colors.background, 
    paddingTop: Platform.OS === 'android' ? 0 : 0, 
    paddingHorizontal: 14 
},
  tabRow: { 
    flexDirection: 'row', 
    marginTop: 0, 
    marginBottom: 0, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderColor: colors.border, 
    backgroundColor: colors.card, 
},
  tabButton: { 
    flex: 1, 
    paddingVertical: 12, 
    alignItems: 'center', 
    borderBottomWidth: 3, 
    borderColor: 'transparent' 
},
deleteButton: {
    backgroundColor: colors.trashcan,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 18,
    marginLeft: 10,
  },
  tabButtonActive: { 
    borderColor: colors.primary, 
    backgroundColor: colors.categoryBg,
  },
  tabLabel: { 
    fontSize: 18, 
    color: colors.textSecondary, 
    fontWeight: '500' 
},
  tabLabelActive: { 
    color: colors.text, 
    fontWeight: '700' 
},
  tabContent: { 
    flex: 1, 
    padding: 18 
},
  tabContentInner: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
},
  title: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: colors.text, 
    marginBottom: 10, 
    textAlign: 'center' 
},
  text: { 
    fontSize: 15, 
    color: colors.textSecondary, 
    textAlign: 'center',
    flexShrink: 1,    // allows text to shrink inside flex
    flexWrap: 'wrap'
},
fabDeleteIcon: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 4,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    zIndex: 10,
  },
  fabReportIcon: {
    position: 'absolute',
    bottom: 10,
    right: 50, // Don't overlap delete
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 4,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    zIndex: 10,
  },
  songRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.card, 
    borderRadius: 14, 
    marginBottom: 12, 
    padding: 16, 
    shadowColor: colors.shadow, 
    shadowOpacity: 0.06, 
    shadowRadius: 3, 
    shadowOffset: { width: 0, height: 1 }, 
    elevation: 1,
    position: 'relative',
},
  songTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.text, 
},
  songMeta: { 
    fontSize: 13, 
    color: colors.iconColor, 
    marginTop: 2 
},
  playButton: { 
    backgroundColor: colors.primary, 
    borderRadius: 8, 
    paddingVertical: 7, 
    paddingHorizontal: 18, 
    marginLeft: 15 
},
  nowPlayingBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: colors.card, 
    paddingHorizontal: 20, 
    paddingVertical: 13, 
    borderRadius: 12, 
    position: 'absolute', 
    bottom: 20, 
    left: 16, 
    right: 16, 
    shadowColor: colors.shadow, 
    shadowOpacity: 0.12, 
    shadowRadius: 5, 
    shadowOffset: { 
        width: 0, 
        height: 3 
    }, 
    elevation: 2 
},
  nowPlayingText: { 
    flex: 1, 
    fontWeight: '600', 
    color: colors.text, 
    marginRight: 15 
},
  stopButton: { 
    color: colors.trashcan, 
    fontWeight: '700', 
    marginLeft: 16, 
    fontSize: 16 
},
  artistBox: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderColor: '#ccc',
    padding: 18,
    marginVertical: 8,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    width: '100%',          
    maxWidth: 420,          
    alignSelf: 'center',
},
songDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 2,
  },
  songSocial: {
    fontSize: 13,
    color: colors.primary, // Use primary for accent links
    textDecorationLine: 'underline',
    marginBottom: 2,
  },
  songSocialLink: {
    fontSize: 13,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  agreeRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    color: colors.text, 
    marginTop: 18, 
    marginBottom: 6 
},
  formLabel: { 
    fontWeight: '700', 
    fontSize: 15, 
    color: colors.text, 
    marginTop: 0, 
    marginBottom: 3 
},
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc',
    borderRadius: 8, 
    padding: 11, 
    marginBottom: 8, 
    fontSize: 15, 
    color: colors.text, 
    backgroundColor: colors.background
},
  genreRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginVertical: 5, 
    marginBottom: 5 
},
  genreChip: { 
    borderWidth: 1, 
    borderColor: colors.muted, 
    borderRadius: 14, 
    paddingVertical: 5, 
    paddingHorizontal: 13, 
    marginRight: 8, 
    marginBottom: 8, 
    backgroundColor: colors.categoryBg 
},
  genreChipActive: { 
    backgroundColor: colors.primary, 
    borderColor: colors.primary 
},
  fileButton: { 
    backgroundColor: colors.primary, 
    borderRadius: 10, 
    paddingVertical: 9, 
    paddingHorizontal: 22 
},
  uploadButton: { 
    backgroundColor: '#4A90E2',
    color: 'white', // Text color
    borderRadius: 10, 
    marginTop: 22, 
    paddingVertical: 13, 
    alignItems: 'center' 
},
});

export default MusicScreen;