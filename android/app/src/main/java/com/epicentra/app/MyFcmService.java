package com.epicentra.app;

import android.util.Log;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MyFcmService extends FirebaseMessagingService {
    private static final String TAG = "MyFcmService";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.i(TAG, "FCM TOKEN: " + token);
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.i(TAG, "FCM MESSAGE: from=" + remoteMessage.getFrom());
        if (remoteMessage.getNotification() != null) {
            Log.i(TAG, "FCM MESSAGE NOTIF: title=" + remoteMessage.getNotification().getTitle() + ", body=" + remoteMessage.getNotification().getBody());
        }
        if (remoteMessage.getData() != null && !remoteMessage.getData().isEmpty()) {
            Log.i(TAG, "FCM MESSAGE DATA: " + remoteMessage.getData().toString());
        }
    }
}
