import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useUser } from '@/contexts/UserContext';
import StarRating from 'react-native-star-rating-widget';
import {
  submitBusinessRating,
  getUserBusinessRating,
  updateBusinessRatingStats,
} from '@/utils/businessRating';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  businessId: string;
  businessName: string;
}

const BusinessRatingModal: React.FC<Props> = ({ visible, onClose, businessId, businessName, onSubmitted }) => {
    const { user } = useUser();
    const [stars, setStars] = useState<number>(0);
    const [review, setReview] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [existingRatingLoaded, setExistingRatingLoaded] = useState(false);

  useEffect(() => {
    if (visible && user && businessId) {
      fetchExistingRating();
    }
  }, [visible]);

  const fetchExistingRating = async () => {
    setLoading(true);
    try {
      const existing = await getUserBusinessRating({
        businessId,
        userId: user!.uid,
      });
      if (existing) {
        setStars(existing.stars);
        setReview(existing.review);
      } else {
        setStars(0);
        setReview('');
      }
      setExistingRatingLoaded(true);
    } catch (error) {
      console.error('Failed to fetch existing rating:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!stars) {
      Alert.alert('Please select a rating before submitting.');
      return;
    }

    console.log('Auth UID:', user?.uid);

    setLoading(true);
    try {
      await submitBusinessRating({
        businessId,
        userId: user!.uid,
        stars,
        review,
        userName: user!.name,
        userAvatar: user!.avatar,
      });

      await updateBusinessRatingStats(businessId);
      onSubmitted(); // Notify parent to refresh reviews
      onClose();     // Close modal
      Alert.alert('Thank you!', 'Your review has been submitted.');
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Oops!', 'Something went wrong. Please try again later.');
    }
    setLoading(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Rate {businessName}</Text>

          {loading && !existingRatingLoaded ? (
            <ActivityIndicator size="large" />
          ) : (
            <>
              <StarRating
                rating={stars}
                onChange={setStars}
                starSize={32}
                animationConfig={{ scale: 1.2 }}
              />

              <TextInput
                style={styles.input}
                placeholder="Leave a short review (optional)"
                value={review}
                onChangeText={setReview}
                multiline
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
                <Text style={styles.submitText}>{existingRatingLoaded && stars > 0 ? 'Update' : 'Submit'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={styles.cancel}>
                <Text style={{ color: '#888' }}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default BusinessRatingModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0007',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#fff',
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    height: 100,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlignVertical: 'top',
    marginTop: 16,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#0057D9',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancel: {
    marginTop: 12,
    alignItems: 'center',
  },
});
