package nl.rarevogel.wesenbuch;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.DisplayCutout;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.InputStream;

public class MainActivity extends Activity {
    static final String HOST = "wesenbuch.local";
    WebView web;
    FrameLayout frame;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        frame = new FrameLayout(this);
        frame.setBackgroundColor(Color.parseColor("#3a2418"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#f3ead6"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);
        web.addJavascriptInterface(new Bridge(), "WesenApp");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!HOST.equals(u.getHost())) return null;
                String path = u.getPath();
                if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
                try {
                    InputStream in = getAssets().open(path.substring(1));
                    return new WebResourceResponse(path.endsWith(".html") ? "text/html" : "application/octet-stream", "utf-8", in);
                } catch (Exception e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not found", null, null);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                if (HOST.equals(r.getUrl().getHost()) || !r.isForMainFrame()) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, r.getUrl())); } catch (Exception ignored) {}
                return true;
            }
        });
        frame.addView(web, new FrameLayout.LayoutParams(-1, -1));
        frame.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            public WindowInsets onApplyWindowInsets(View v, WindowInsets in) {
                int l = in.getSystemWindowInsetLeft(), t = in.getSystemWindowInsetTop(), rr = in.getSystemWindowInsetRight(), b = in.getSystemWindowInsetBottom();
                if (Build.VERSION.SDK_INT >= 28) {
                    DisplayCutout c = in.getDisplayCutout();
                    if (c != null) { l = Math.max(l, c.getSafeInsetLeft()); t = Math.max(t, c.getSafeInsetTop()); rr = Math.max(rr, c.getSafeInsetRight()); b = Math.max(b, c.getSafeInsetBottom()); }
                }
                v.setPadding(l, t, rr, b);
                return in;
            }
        });
        setContentView(frame);
        frame.requestApplyInsets();
        if (state != null) web.restoreState(state);
        else web.loadUrl("https://" + HOST + "/");
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.__terug ? String(__terug()) : 'false'", new ValueCallback<String>() {
            public void onReceiveValue(String r) { if (!"\"true\"".equals(r) && !"true".equals(r)) finish(); }
        });
    }

    class Bridge {
        @JavascriptInterface
        public void setDark(final boolean dark) {
            runOnUiThread(new Runnable() { public void run() {
                int paper = Color.parseColor(dark ? "#1d1612" : "#f3ead6");
                int bar = Color.parseColor(dark ? "#120c08" : "#3a2418");
                Window w = getWindow();
                frame.setBackgroundColor(bar);
                web.setBackgroundColor(paper);
                w.setStatusBarColor(bar);
                w.setNavigationBarColor(paper);
                int f = w.getDecorView().getSystemUiVisibility() & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                if (Build.VERSION.SDK_INT >= 26) f = dark ? (f & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR) : (f | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
                w.getDecorView().setSystemUiVisibility(f);
            }});
        }
    }
}
