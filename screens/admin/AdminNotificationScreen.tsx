import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getAuth } from 'firebase/auth';
import i18n from '@/i18n';

const AdminNotificationScreen = () => {
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('adminNotification.title')}</Text>
      <Text style={styles.label}>{i18n.t('adminNotification.notifTitle')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('adminNotification.notifTitlePlaceholder')}
        value={notifTitle}
        onChangeText={setNotifTitle}
      />
      <Text style={styles.label}>{i18n.t('adminNotification.message')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('adminNotification.messagePlaceholder')}
        value={notifBody}
        onChangeText={setNotifBody}
        multiline
      />
      <TouchableOpacity
        style={styles.button}
        onPress={async () => {
          if (!notifTitle.trim() || !notifBody.trim()) {
            Alert.alert(
              i18n.t("adminNotification.completeFieldsTitle"),
              i18n.t("adminNotification.completeFieldsMsg")
            );
            return;
          }
          try {
            const auth = getAuth();
            const currentUser = auth.currentUser;
            if (!currentUser) {
              Alert.alert(
                i18n.t("adminNotification.noAdminSessionTitle"),
                i18n.t("adminNotification.noAdminSessionMsg")
              );
              return;
            }
            const idToken = await currentUser.getIdToken(true);
            const response = await fetch(
              "https://us-central1-interzone-production.cloudfunctions.net/notifyPeruEvent",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                  data: {
                    title: notifTitle.trim(),
                    body: notifBody.trim(),
                    url: "https://www.upc.edu.pe/servicios/vida-universitaria/viernes-culturales/",
                  },
                }),
              }
            );
            const result = await response.json();
            if (result.data && result.data.sent) {
              Alert.alert(
                i18n.t("adminNotification.successTitle"),
                i18n.t("adminNotification.successMsg", { count: result.data.sent })
              );
            } else {
              Alert.alert(
                i18n.t("adminNotification.failureTitle"),
                i18n.t("adminNotification.failureMsg")
              );
            }
          } catch (error: any) {
            Alert.alert(
              i18n.t("adminNotification.errorTitle"),
              i18n.t("adminNotification.failureMsg") + "\n" + error.message
            );
          }
        }}
      >
        <Text style={styles.buttonText}>{i18n.t('adminNotification.sendBtn')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f4f9ff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  label: { fontWeight: 'bold', marginBottom: 6, marginTop: 12 },
  input: { borderColor: '#b3b3b3', borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 15, backgroundColor: '#fff', marginBottom: 6 },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 10, marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});

export default AdminNotificationScreen;
