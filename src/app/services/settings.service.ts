import { Injectable, signal, inject } from '@angular/core';
import { ElectronService } from './electron.service';

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private electron = inject(ElectronService);

    standardFolder = signal('');
    theme = signal('dark');
    userAgreementAccepted = signal(false);

    async loadSettings() {
        const settings = await this.electron.getSettings();
        this.standardFolder.set(settings.standardFolder || '');
        this.theme.set(settings.theme || 'dark');
        this.userAgreementAccepted.set(settings.userAgreementAccepted || false);
        this.applyTheme(this.theme());
    }

    async setStandardFolder(path: string) {
        this.standardFolder.set(path);
        await this.electron.setSetting('standard-folder', path);
    }

    async setTheme(theme: string) {
        this.theme.set(theme);
        await this.electron.setSetting('theme', theme);
        this.applyTheme(theme);
    }

    async acceptUserAgreement() {
        this.userAgreementAccepted.set(true);
        await this.electron.setSetting('user-agreement-accepted', true);
    }

    private applyTheme(theme: string) {
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${theme}`);
        this.electron.setNativeTheme(theme);
    }
}
