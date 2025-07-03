import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Report } from '@/types/report';
import i18n from '@/i18n';

interface ReportBannerProps {
  reports: Report[];
  onPress?: (report: Report | null) => void; // Accept null for "see all"
  onDismiss?: () => void;
}

const ALERT_EMOJIS: Record<string, string> = {
  lost_pet: "🐾",
  lost_person: "🧑‍🦯",
  robbery: "🚨",
  theft: "🚨",
  incident: "⚠️",
  // Add more as needed
};

const ReportBanner: React.FC<ReportBannerProps> = ({ reports, onPress, onDismiss }) => {

  if (!reports.length) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.headerRow}>
        <Ionicons name="alert-circle" size={20} color="#ff9800" style={{ marginRight: 8 }} />
        <Text style={styles.title}>
          {reports.length === 1
            ? i18n.t('reportBanner.oneAlert')
            : i18n.t('reportBanner.multipleAlerts', { count: reports.length })}
        </Text>
      </View>

      {!!onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} accessibilityLabel="Dismiss banner">
          <Ionicons name="close" size={16} color="#888" />
        </TouchableOpacity>
      )}
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.list}>
        {reports.map(report => (
          <TouchableOpacity
            key={report.id}
            onPress={() => onPress && onPress(report)}
            activeOpacity={0.82}
            style={styles.reportCard}
          >
            <View style={styles.badge}>
              <Text style={{ fontSize: 18, marginRight: 3 }}>
                {ALERT_EMOJIS[report.type] || "📢"}
              </Text>
              <Text style={styles.type}>
                {i18n.t(`reportBanner.types.${report.type}`) ||
                report.type.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            
            <Text numberOfLines={2} style={styles.desc}>
              {report.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default ReportBanner;

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF9EC',
    paddingVertical: 3,
    paddingHorizontal: 16,
    borderRadius: 18,
    margin: 10,
    marginBottom: 7,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontWeight: '700',
    color: '#d2691e',
    fontSize: 14,
    flex: 1,
    marginLeft: 2,
  },
  dismissBtn: {
    position: 'absolute',
    right: 8,
    top: 6,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 24,
    padding: 4,
  },
  list: {
    marginTop: 2,
    paddingLeft: 2,
    marginBottom: 2,
  },
  reportCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 11,
    marginRight: 12,
    minWidth: 160,
    maxWidth: 360,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: '#FFA000',
    shadowColor: '#F18F01',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  type: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ff9800',
    marginLeft: 5,
    letterSpacing: 1,
  },
  desc: {
    fontSize: 13,
    color: '#2d2d2d',
    marginTop: 3,
    fontWeight: '500',
  },
  seeAllBtn: {
    marginLeft: 8,
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: '#ffecb3',
    borderRadius: 7,
  },
  seeAllText: {
    color: '#d2691e',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
