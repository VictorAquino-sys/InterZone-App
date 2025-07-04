import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Alert, Platform, Modal, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, addDoc, getDocs, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Avatar from '@/components/Avatar';
// import { deleteObject, ref as storageRef, getStorage } from 'firebase/storage';
import { Video, ResizeMode } from 'expo-av';
import ImageViewer from 'react-native-image-zoom-viewer';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigationTypes';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import i18n from '@/i18n';
import type { Report } from '@/types/report';
import { deleteImageFromStorage, deleteVideoFromStorage } from '@/utils/storageUtils';
import { useUser } from '@/contexts/UserContext';

type ReportDetailScreenRouteProp = RouteProp<RootStackParamList, 'ReportDetailScreen'>;

interface LastSeen {
  id: string;
  userId: string;
  coords: { latitude: number; longitude: number };
  note: string;
  timestamp: any;
  userName?: string;
}

const MAP_TYPES = [
  { type: 'standard', label: i18n.t('reportDetail.mapTypes.standard'), icon: 'map' },
  { type: 'satellite', label: i18n.t('reportDetail.mapTypes.satellite'), icon: 'planet' },
  { type: 'hybrid', label: i18n.t('reportDetail.mapTypes.hybrid'), icon: 'layers' }
];

const ReportDetailScreen: React.FC = () => {
  const route = useRoute<ReportDetailScreenRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useUser();
  const { reportId } = route.params;
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  // Last seen marker state
  const [lastSeenMarker, setLastSeenMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [lastSeenNote, setLastSeenNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [allLastSeen, setAllLastSeen] = useState<LastSeen[]>([]);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);

  const mapRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'publicReports', reportId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setReport({ id: docSnap.id, ...docSnap.data() } as Report);
        } else {
          setReport(null);
        }
      } catch (e) {
        setReport(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId]);

  // Fetch all lastSeenReports
  useEffect(() => {
    if (!reportId) return;
    (async () => {
      try {
        const querySnap = await getDocs(collection(db, 'publicReports', reportId, 'lastSeenReports'));
        const arr: LastSeen[] = [];
        querySnap.forEach(docSnap => {
          arr.push({ id: docSnap.id, ...docSnap.data() } as LastSeen);
        });
        setAllLastSeen(arr);
      } catch (e) {}
    })();
  }, [reportId, saving]);

  // Helper: format Firestore Timestamp or Date
  const getFormattedTime = (ts: any) => {
    if (!ts) return '';
    try {
      const dateObj = ts.toDate ? ts.toDate() : new Date(ts);
      return dateObj.toLocaleString();
    } catch {
      return '';
    }
  };

  // Relative time ("2 hours ago")
  const getRelativeTime = (ts: any) => {
    if (!ts) return '';
    let dateObj = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  const handleDeleteReport = async () => {
    if (!report || !user) return;
    Alert.alert(
      i18n.t('reportDetail.closeReportTitle'),
      i18n.t('reportDetail.closeReportMessage'),
      [
        { text: i18n.t('reportDetail.closeReportCancel'), style: 'cancel' },
        {
          text: i18n.t('reportDetail.closeReportDelete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Delete attached images (helper)
              if (report.imageUrls && report.imageUrls.length > 0) {
                for (const url of report.imageUrls) {
                  await deleteImageFromStorage(url);
                }
              }
              // 2. Delete attached video (helper)
              if (report.videoUrl) {
                await deleteVideoFromStorage(report.videoUrl);
              }

              // 3. Delete subcollections
              await deleteSubcollection();
              
              // 4. Delete the Firestore doc (and subcollections, if needed)
              await deleteDoc(doc(db, 'publicReports', report.id));
              // 5. Feedback and navigation
              Alert.alert(
                i18n.t('reportDetail.closeReportDeletedTitle'),
                i18n.t('reportDetail.closeReportDeletedMessage')
              );
              navigation.goBack();
            } catch (err) {
              console.error('Delete error', err);
              Alert.alert(
                i18n.t('reportDetail.closeReportErrorTitle'),
                i18n.t('reportDetail.closeReportErrorMessage')
              );
            }
          }
        }
      ]
    );
  };

  const deleteSubcollection = async () => {
    const subSnap = await getDocs(collection(db, 'publicReports', reportId, 'lastSeenReports'));
    for (const docSnap of subSnap.docs) {
      await deleteDoc(docSnap.ref);
    }
  };

  // Save last seen pin + note
  const handleSaveLastSeen = async () => {
    if (!user || !lastSeenMarker || !lastSeenNote.trim()) {
      Alert.alert(
        i18n.t('reportDetail.missingInfo'),
        i18n.t('reportDetail.missingInfoDesc')
      );
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'publicReports', reportId, 'lastSeenReports'), {
        userId: user.uid,
        userName: user.name,
        coords: lastSeenMarker,
        note: lastSeenNote.trim(),
        timestamp: serverTimestamp(),
      });
      setLastSeenMarker(null);
      setLastSeenNote('');
      // Animate to new pin on map
      setTimeout(() => {
        if (mapRef.current && lastSeenMarker) {
          mapRef.current.animateToRegion({
            ...lastSeenMarker,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 600);
        }
      }, 700);
      Alert.alert(i18n.t('reportDetail.thankYou'), i18n.t('reportDetail.lastSeenAdded'));
    } catch (e) {
      console.error('Error saving last seen:', e);
      Alert.alert(i18n.t('reportDetail.error'), i18n.t('reportDetail.saveLastSeenError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#26c6da" />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#e53935' }}>{i18n.t('reportDetail.notFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <SafeAreaView style={styles.header}>
            <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                accessibilityLabel="Go back"
            >
                <Ionicons name="chevron-back" size={26} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>{i18n.t('reportDetail.alertDetail')}</Text>
        </SafeAreaView>

      <View style={styles.section}>
        <View style={styles.badgeRow}>
          <Ionicons name="alert-circle" size={22} color="#f57c00" style={{ marginRight: 8 }} />
          <Text style={styles.type}>
            {i18n.t(`reportBanner.types.${report.type}`) || (report.type ?? '').replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.desc}>{report.description}</Text>
        <Text style={styles.label}>
          {i18n.t('reportDetail.status')}: <Text style={{ color: report.status === 'active' ? '#388e3c' : '#e53935' }}>{report.status}</Text>
        </Text>
        {!!report.timestamp && (
          <Text style={styles.label}>
            {i18n.t('reportDetail.reportedAt')}: {getFormattedTime(report.timestamp)}
          </Text>
        )}
        {!!report.location && (
          <Text style={styles.label}>
            <Ionicons name="location" size={15} color="#222" /> {report.location}
          </Text>
        )}
      </View>

      {/* Map Type Toggle */}
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        {MAP_TYPES.map(mt => (
          <TouchableOpacity
            key={mt.type}
            style={[
              styles.mapTypeBtn,
              mapType === mt.type && styles.mapTypeBtnActive,
            ]}
            onPress={() => setMapType(mt.type as 'standard' | 'satellite' | 'hybrid')}
          >
            <Ionicons name={mt.icon as any} size={16} color={mapType === mt.type ? '#fff' : '#1976D2'} style={{ marginRight: 5 }} />
            <Text style={[
              styles.mapTypeText,
              mapType === mt.type && { color: "#fff" }
            ]}>
              {mt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{ fontWeight: 'bold', marginBottom: 6, color: "#1976D2" }}>
        {i18n.t('reportDetail.petLocation')}
      </Text>
      {!!report.coords && (
        <View style={{ marginBottom: 12 }}>
          <MapView
            ref={mapRef}
            style={styles.mainMap}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            mapType={mapType}
            initialRegion={{
              latitude: report.coords.latitude,
              longitude: report.coords.longitude,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            }}
            onPress={e => {
              // User can tap/long-press to add a marker
              setLastSeenMarker(e.nativeEvent.coordinate);
            }}
          >
            {/* Original location */}
            <Marker
              coordinate={report.coords}
              pinColor="#1976D2"
              title={i18n.t('reportDetail.originalReportedSpot')}
              description={report.location}
            />

            {/* Existing last seen pins */}
            {allLastSeen.map(ls => (
              <Marker
                key={ls.id}
                coordinate={ls.coords}
                pinColor="#f9a825"
              >
                <Callout>
                  <Text style={{ fontWeight: "bold" }}>{ls.userName || "User"}</Text>
                  <Text>{ls.note}</Text>
                  <Text style={{ color: "#888", fontSize: 12 }}>{getRelativeTime(ls.timestamp)}</Text>
                </Callout>
              </Marker>
            ))}

            {/* User's temp marker (not saved yet) */}
            {lastSeenMarker && (
              <Marker
                coordinate={lastSeenMarker}
                pinColor="#d84315"
                title={i18n.t('reportDetail.lastSeenHere')}
              />
            )}
          </MapView>
        </View>
      )}

      <Text style={{ color: "#888", fontSize: 13, marginBottom: 7 }}>
        {i18n.t('reportDetail.tapMap')}
      </Text>

      {/* Mark Last Seen Section */}
      {lastSeenMarker && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? "padding" : undefined} style={{ marginBottom: 16 }}>
          <TextInput
            style={styles.noteInput}
            value={lastSeenNote}
            onChangeText={setLastSeenNote}
            placeholder={i18n.t('reportDetail.lastSeenPlaceholder')}
            maxLength={140}
            multiline
          />
          <TouchableOpacity
            style={[styles.saveBtn, (!lastSeenMarker || !lastSeenNote.trim()) && { opacity: 0.5 }]}
            disabled={!lastSeenMarker || !lastSeenNote.trim() || saving}
            onPress={handleSaveLastSeen}
          >
            <Text style={styles.saveBtnText}>{saving ? i18n.t('reportDetail.saving') : i18n.t('reportDetail.saveLastSeen')}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      )}

      {!!report.imageUrls?.length && report.imageUrls.length > 0 && (
        <ScrollView horizontal style={styles.imagesRow} showsHorizontalScrollIndicator={false}>
          {report.imageUrls.map((url, idx) => (
            <TouchableOpacity
              key={url + idx }
              onPress={() => {
                setZoomIndex(idx);
                setZoomModalVisible(true);
              }}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: url }}
                style={styles.image}
                resizeMode="cover"
              />
              </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {!!report.videoUrl && report.mediaType === 'video' && (
        <View style={{ marginBottom: 12, marginTop: 5 }}>
          <Video
            source={{ uri: report.videoUrl }}
            style={{ width: '100%', height: 220, borderRadius: 12 }}
            useNativeControls
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isLooping={false}
          />
        </View>
      )}

      {/* Show previous last seen notes */}
      {allLastSeen.length > 0 && (
        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4, color: "#263238" }}>
            {i18n.t('reportDetail.sightingsNotes')}
          </Text>
          <View>
            {allLastSeen.map(ls => (
              <View key={ls.id} style={{ marginBottom: 8, padding: 6, backgroundColor: "#fafafa", borderRadius: 7 }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('UserProfile', { userId: ls.userId})}
                  activeOpacity={0.7}
                >
                  <Text style={styles.usernameLink}>
                    {ls.userName || "User"}:
                  </Text>
                </TouchableOpacity>
                <Text style={{ color: "#333" }}>{ls.note}</Text>
                <Text style={{ color: "#bbb", fontSize: 12 }}>{getRelativeTime(ls.timestamp)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {!!report.user && (
        <View style={styles.section}>
          <Text style={styles.label}>{i18n.t('reportDetail.reportedBy')}:</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('UserProfile', { userId: report.user.uid })}
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Avatar
                  name={report.user.name}
                  imageUri={report.user.avatar}
                  size={36}
                  backgroundColor="#eee"
                />
                <Text style={styles.usernameLink}>
                  {report.user.name}
                </Text>
              </View>
            </TouchableOpacity>
        </View>
      )}

      {user && report && (user.uid === report.user?.uid || user.claims?.admin) && (
        <TouchableOpacity
          style={{
            backgroundColor: '#e53935',
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 8
          }}
          onPress={handleDeleteReport}
          activeOpacity={0.8}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 17 }}>
            {i18n.t('reportDetail.closeReport') || 'Close Report'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 24 }} />

      <Modal
        visible={zoomModalVisible}
        transparent
        onRequestClose={() => setZoomModalVisible(false)}
      >
        <View style={{flex: 1, backgroundColor: '#000'}}>
          <TouchableOpacity
            style={{position: 'absolute', top: 50, right: 25, zIndex: 1001}}
            onPress={() => setZoomModalVisible(false)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          <ImageViewer
            imageUrls={report.imageUrls?.map(url => ({ url }))}
            index={zoomIndex}
            onSwipeDown={() => setZoomModalVisible(false)}
            enableSwipeDown={true}
            renderIndicator={(currentIndex?: number, allSize?: number) => {
              if (typeof currentIndex !== "number" || typeof allSize !== "number") return <View />;
              return (
                <View
                  style={{
                    position: 'absolute',
                    top: 70,
                    left: 0,
                    right: 0,
                    alignItems: 'center',
                    zIndex: 1000,
                  }}
                >
                  <Text style={{
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: 18,
                    textShadowColor: '#000',
                    textShadowRadius: 8,
                  }}>
                    {`${currentIndex}/${allSize}`}
                  </Text>
                </View>
              );
            }}
          />
        </View>
      </Modal>

    </ScrollView>
  );
};

export default ReportDetailScreen;

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 40,
    backgroundColor: '#fff',
    minHeight: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    marginRight: 7,
    padding: 6,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#263238',
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: 18,
  },
  mainMap: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    marginBottom: 0,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  usernameLink: {
    marginLeft: 8,
    fontWeight: 'bold',
    color: '#1565c0',
    textDecorationLine: 'underline',
    fontSize: 15,
  },
  type: {
    fontWeight: '700',
    color: '#f57c00',
    fontSize: 15,
  },
  desc: {
    color: '#333',
    fontSize: 15,
    marginBottom: 5,
    marginTop: 2,
  },
  label: {
    color: '#757575',
    fontSize: 14,
    marginTop: 3,
    marginBottom: 2,
  },
  mapTypeBtn: {
    backgroundColor: '#e3f2fd',
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapTypeBtnActive: {
    backgroundColor: '#1976D2',
  },
  mapTypeText: {
    color: '#1976D2',
    fontWeight: 'bold',
    fontSize: 15,
  },
  imagesRow: {
    flexDirection: 'row',
    marginTop: 7,
    marginBottom: 12,
  },
  image: {
    width: 140,
    height: 120,
    borderRadius: 13,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  noteInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 7,
    padding: 10,
    fontSize: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd"
  },
  saveBtn: {
    backgroundColor: '#1976D2',
    paddingVertical: 11,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 0,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});