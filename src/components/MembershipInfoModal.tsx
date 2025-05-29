import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import i18n from '@/i18n';
import { useUser } from '@/contexts/UserContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
};

const MembershipInfoModal: React.FC<Props> = ({ visible, onClose, onSubscribe }) => {
  const { user } = useUser();
  const isBusiness = user?.businessVerified;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="trophy-outline" size={30} color="#FFD700" style={{ marginRight: 8 }} />
            <Text style={styles.title}>{i18n.t('membershipTitle')}</Text>
          </View>

          {/* Benefits List */}
          <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
            <Text style={styles.benefitTitle}>{i18n.t('premiumBenefits')}</Text>

            <View style={styles.benefitRow}>
              <Ionicons name="map" size={22} color="#2b7cfa" />
              <Text style={styles.benefitText}>{i18n.t('allCitiesAccess')}</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="star" size={22} color="#fbbf24" />
              <Text style={styles.benefitText}>{i18n.t('premiumBadge')}</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="people-circle" size={22} color="#38b000" />
              <Text style={styles.benefitText}>{i18n.t('exclusiveEvents')}</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="chatbubbles" size={22} color="#6f42c1" />
              <Text style={styles.benefitText}>{i18n.t('prioritySupport')}</Text>
            </View>
            {isBusiness && (
              <View style={styles.benefitRow}>
                <Ionicons name="business" size={22} color="#ff9100" />
                <Text style={styles.benefitText}>{i18n.t('businessPremiumBenefit')}</Text>
              </View>
            )}
          </ScrollView>

          {/* Plans */}
          <View style={styles.plansRow}>
            <TouchableOpacity
              style={styles.planButton}
              onPress={() => onSubscribe('monthly')}
            >
              <Text style={styles.planLabel}>{i18n.t('monthlyPlan')}</Text>
              <Text style={styles.planPrice}>$5.99</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.planButton, { backgroundColor: '#ffd70022', borderWidth: 2, borderColor: '#ffd700' }]}
              onPress={() => onSubscribe('yearly')}
            >
              <Text style={[styles.planLabel, { color: '#c09c00' }]}>{i18n.t('yearlyPlan')}</Text>
              <Text style={[styles.planPrice, { color: '#c09c00' }]}>$59.99</Text>
              <Text style={styles.savings}>{i18n.t('saveTwoMonths')}</Text>
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close-circle" size={28} color="#777" />
            <Text style={styles.closeText}>{i18n.t('close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default MembershipInfoModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30,30,40,0.32)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 25,
    elevation: 8,
  },
  title: {
    fontSize: 23,
    fontWeight: '700',
    color: '#222',
  },
  benefitTitle: {
    fontWeight: '600',
    fontSize: 17,
    marginVertical: 8,
    textAlign: 'center',
    color: '#444',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 7,
  },
  benefitText: {
    fontSize: 15,
    color: '#2d3748',
    marginLeft: 10,
    flex: 1,
    flexWrap: 'wrap',
  },
  plansRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 14,
    width: '100%',
    gap: 12,
  },
  planButton: {
    backgroundColor: '#f3f4fa',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  planLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2b7cfa',
    marginBottom: 2,
  },
  planPrice: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  savings: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 6,
  },
  closeText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 7,
  },
});
