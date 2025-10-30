import { Injectable, signal } from '@angular/core';

const KEY = 'app.settings';

export interface AppSettings {
    keepAwake: boolean;
}

const defaultSettings: AppSettings = {
    keepAwake: false,
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
    private _settings = signal<AppSettings>(load());
    settings = this._settings.asReadonly();

    keepAwake = signal<boolean>(this._settings().keepAwake);

    setKeepAwake(value: boolean) {
        this.keepAwake.set(value);
        this.save();
    }

    private save() {
        const s: AppSettings = {
            keepAwake: this.keepAwake(),
        };
        try {
            localStorage.setItem(KEY, JSON.stringify(s));
        } catch { /* ignore */ }
    }
}

function load(): AppSettings {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) return { ...defaultSettings, ...JSON.parse(raw) } as AppSettings;
    } catch { /* ignore */ }
    return { ...defaultSettings };
}
