package com.siiaquamedica.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge explícito y consistente en Android 13/14/15+: el WebView dibuja
        // bajo status bar/notch/nav bar y las Safe Areas se resuelven en CSS con
        // env(safe-area-inset-*). En Android 15+ (targetSdk 35+) esto ya es forzado por
        // el sistema; lo fijamos igual para un comportamiento uniforme en 13 y 14.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat insetsController =
            new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        insetsController.setAppearanceLightStatusBars(true);
        insetsController.setAppearanceLightNavigationBars(true);

        // Deshabilita completamente el zoom del WebView (pinch, doble tap y controles),
        // ya que depender solo del meta viewport no es suficiente en Android.
        WebView webView = bridge.getWebView();
        WebSettings settings = webView.getSettings();
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Integra el botón físico/gestual de retroceso con el historial de React Router:
        // si el WebView puede regresar, navega atrás; si no, cierra la app (pantalla principal).
        // getOnBackPressedDispatcher() usa OnBackInvokedDispatcher en Android 13+ de forma
        // transparente a través de androidx.activity.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                }
            }
        });
    }
}
