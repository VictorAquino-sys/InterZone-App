import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Avatar from './Avatar';
import { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import i18n from '@/i18n';

interface Props {
  visible: boolean;
  onClose: () => void;
  businessId: string;
  refreshTrigger?: boolean;
}

interface Review {
  id: string;
  stars: number;
  review: string;
  timestamp: Timestamp;
  userName?: string;
  userAvatar?: string;
}

const BusinessReviewListModal: React.FC<Props> = ({ visible, onClose, businessId, refreshTrigger  }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible || refreshTrigger) {
      fetchReviews();
    }
  }, [visible, refreshTrigger]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'businessProfiles', businessId, 'ratings'),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      const fetched: Review[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          stars: data.stars,
          review: data.review,
          timestamp: data.timestamp,
          userName: data.userName ?? 'Anonymous',
          userAvatar: data.userAvatar ?? '',
        };
      });
      setReviews(fetched);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    }
    setLoading(false);
  };

  return (
      <Modal visible={visible} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
              <View style={styles.header}>
                  <View style={styles.flexSpacer} />
                      <Text style={styles.headerText}>{i18n.t('businessReviews.title')}</Text>
                  <TouchableOpacity onPress={onClose}>
                      <Text style={styles.closeText}>{i18n.t('close')}</Text>
                  </TouchableOpacity>
              </View>

              {loading ? (
                  <ActivityIndicator style={{ marginTop: 40 }} size="large" />
              ) : (
                  <FlatList
                  data={reviews}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ padding: 16 }}
                  renderItem={({ item }) => (
                      <View style={styles.reviewCard}>
                      <View style={styles.userRow}>
                          <Avatar name={item.userName ?? 'Anonymous'} imageUri={item.userAvatar} size={40} />
                          <View style={{ marginLeft: 10 }}>
                          <Text style={styles.userName}>{item.userName}</Text>
                          <Text style={styles.timestamp}>
                              {formatDistanceToNow(item.timestamp?.toDate?.() || new Date(), { addSuffix: true })}
                          </Text>
                          </View>
                      </View>

                      <Text style={styles.stars}>{"★".repeat(item.stars)}{"☆".repeat(5 - item.stars)}</Text>

                      {item.review ? (
                          <Text style={styles.comment}>{item.review}</Text>
                      ) : null}
                      </View>
                  )}
                  />
              )}
          </SafeAreaView>        
      </Modal>
  );
};

export default BusinessReviewListModal;

const styles = StyleSheet.create({
    header: {
        // paddingTop: 10,
        paddingBottom: 14,
        paddingHorizontal: 16,
        backgroundColor: '#f9f9f9',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    flexSpacer: {
        width: 60, 
    },
    headerText: {
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'center',
        flex: 1, 
    },
    closeText: {
        fontSize: 15,
        color: '#007aff',
        fontWeight: '500',
    },
    reviewCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 10,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 3,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    userName: {
        fontWeight: '600',
        fontSize: 15,
    },
    timestamp: {
        fontSize: 12,
        color: '#888',
    },
    stars: {
        fontSize: 16,
        color: '#FFD700',
        marginBottom: 4,
    },
    comment: {
        fontSize: 14,
        color: '#333',
    },
});
