import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'
import type { Report } from '@/types/report';
import type { RootStackParamList } from '@/navigationTypes';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import i18n from '@/i18n';

type AllPublicReportsRouteProp = RouteProp<RootStackParamList, 'AllPublicReportsScreen'>;

const AllPublicReportsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<AllPublicReportsRouteProp>();
  const { reports: reportIds } = route.params; // string[]

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (!reportIds || reportIds.length === 0) {
      setReports([]);
      setLoading(false);
      return;
    }
    // Firebase 'in' query is limited to 10 items
    const batches = [];
    for (let i = 0; i < reportIds.length; i += 10) {
      batches.push(reportIds.slice(i, i + 10));
    }
    const unsubscribes = batches.map(batch => {
      const q = query(collection(db, 'publicReports'), where('__name__', 'in', batch));
      return onSnapshot(q, (snapshot) => {
        setReports(prev =>
          // Remove old versions of these IDs, then add new data from this batch
          [
            ...prev.filter(r => !batch.includes(r.id)),
            ...snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Report))
          ]
        );
        setLoading(false);
      });
    });
    return () => unsubscribes.forEach(unsub => unsub());
  }, [reportIds]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFA000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reports}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={26} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>{i18n.t('reportBanner.allActiveAlerts')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ReportDetailScreen', { reportId: item.id })}
          >
            <Text style={styles.type}>
              {i18n.t(`reportBanner.types.${item.type}`) || item.type}
            </Text>
            <Text numberOfLines={2} style={styles.desc}>
              {item.description}
            </Text>
            <Text style={styles.date}>
              {item.timestamp?.toDate?.()?.toLocaleString?.()}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>
            {i18n.t('reportBanner.noReports') || "No active alerts"}
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    paddingBottom: 40,
    backgroundColor: '#fff',
  },
  title: { fontWeight: 'bold', fontSize: 20, marginBottom: 12 },
  card: { backgroundColor: '#f7f7f7', borderRadius: 10, marginBottom: 10, padding: 14, elevation: 2 },
  type: { color: '#ff9800', fontWeight: 'bold', fontSize: 15 },
  desc: { color: '#222', fontSize: 14, marginVertical: 3 },
  date: { color: '#888', fontSize: 12 },
  backBtn: {
    marginRight: 7,
    padding: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
});

export default AllPublicReportsScreen;
