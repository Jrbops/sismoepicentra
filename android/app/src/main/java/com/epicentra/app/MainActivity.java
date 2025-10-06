package com.epicentra.app;

import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivityFCM";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Force-fetch FCM token on startup to ensure generation
        try {
            FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(new OnCompleteListener<String>() {
                    @Override
                    public void onComplete(Task<String> task) {
                        if (!task.isSuccessful()) {
                            Log.w(TAG, "Fetching FCM registration token failed", task.getException());
                            return;
                        }
                        String token = task.getResult();
                        if (token != null) {
                            Log.i(TAG, "FCM TOKEN (getToken): " + token);
                        } else {
                            Log.i(TAG, "FCM TOKEN (getToken): null");
                        }
                    }
                });
        } catch (Exception e) {
            Log.w(TAG, "FCM getToken exception", e);
        }
    }
}
