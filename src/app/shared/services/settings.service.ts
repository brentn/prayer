import { Injectable, signal } from '@angular/core';

const KEY = 'app.settings';

export interface AppSettings {
    keepAwake: boolean;
    shuffleRequests: boolean;
    praySelectCount: number; // last used number of items in pray session
    prayTimeValue: number;   // last used time value (1..121, 121 = unlimited)
}

const defaultSettings: AppSettings = {
    keepAwake: false,
    shuffleRequests: true,
    praySelectCount: 0,
    prayTimeValue: 60,
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
    private _settings = signal<AppSettings>(load());
    settings = this._settings.asReadonly();

    keepAwake = signal<boolean>(this._settings().keepAwake);
    shuffleRequests = signal<boolean>(this._settings().shuffleRequests);
    praySelectCount = signal<number>(this._settings().praySelectCount);
    prayTimeValue = signal<number>(this._settings().prayTimeValue);

    setKeepAwake(value: boolean) {
        this.keepAwake.set(value);
        this.save();
    }

    setShuffleRequests(value: boolean) {
        this.shuffleRequests.set(value);
        this.save();
    }

    setPraySelectCount(value: number) {
        this.praySelectCount.set(value);
        this.save();
    }

    setPrayTimeValue(value: number) {
        this.prayTimeValue.set(value);
        this.save();
    }

    private save() {
        const s: AppSettings = {
            keepAwake: this.keepAwake(),
            shuffleRequests: this.shuffleRequests(),
            praySelectCount: this.praySelectCount(),
            prayTimeValue: this.prayTimeValue(),
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
