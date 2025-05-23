###############################################
# Firebase / Firestore / Firebase Auth / Storage
###############################################
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Firestore models using reflection (Gson)
-keepattributes Signature, *Annotation*
-keep class com.google.gson.** { *; }
-dontwarn com.google.gson.**

# Prevent Firebase Auth and User info from being removed
-keep class com.google.firebase.auth.** { *; }
-keep class com.google.firebase.firestore.** { *; }
-keep class com.google.firebase.storage.** { *; }

###############################################
# React Native & Expo (Hermes + core bridges)
###############################################
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.react.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

###############################################
# Google Sign-In
###############################################
-keep class com.google.android.gms.auth.api.signin.** { *; }
-dontwarn com.google.android.gms.auth.api.signin.**

# Keep @Keep-annotated classes
-keep @androidx.annotation.Keep class * { *; }

###############################################
# Misc
###############################################
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
}

-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
}

###############################################
# Diagnostic (optional)
###############################################
# -printconfiguration build/outputs/mapping/proguard/full-r8-config.txt
