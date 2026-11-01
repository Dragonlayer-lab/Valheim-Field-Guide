// Bundled into the app page so it can reach native storage, back button and status bar.
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
window.VFGNative = { native: Capacitor.isNativePlatform(), Preferences, App, StatusBar, Style };
