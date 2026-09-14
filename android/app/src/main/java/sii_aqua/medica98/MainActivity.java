package sii_aqua.medica98;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		notifyWebAppIfNeeded();
	}

	@Override
	protected void onNewIntent(android.content.Intent intent) {
		super.onNewIntent(intent);
		setIntent(intent);
		notifyWebAppIfNeeded();
	}

	private void notifyWebAppIfNeeded() {
		boolean openNotifications = getIntent().getBooleanExtra("open_notifications", false)
			|| "OPEN_NOTIFICATIONS".equals(getIntent().getAction());
		if (!openNotifications) return;

		getIntent().removeExtra("open_notifications");
		getIntent().setAction(null);
		Handler handler = new Handler(Looper.getMainLooper());
		Runnable notifyWebApp = new Runnable() {
			private int attempts = 0;

			@Override
			public void run() {
				if (getBridge() == null || getBridge().getWebView() == null) {
					if (++attempts < 10) handler.postDelayed(this, 500);
					return;
				}

				getBridge().getWebView().evaluateJavascript(
						"localStorage.setItem('siiAquaOpenNotifications','true');" +
						"window.dispatchEvent(new CustomEvent('sii-aqua-open-notifications'));",
						null
				);
			}
		};
		handler.post(notifyWebApp);
	}
}
