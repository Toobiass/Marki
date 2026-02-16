import { Component, signal, inject, HostListener } from '@angular/core';
import { ElectronService } from '../../services/electron.service';
import { SettingsService } from '../../services/settings.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
    private electron = inject(ElectronService);
    public settingsService = inject(SettingsService);

    isVisible = signal(false);

    toggle() {
        this.isVisible.update(v => !v);
    }

    async selectFolder() {
        const path = await this.electron.selectFolder();
        if (path) {
            await this.settingsService.setStandardFolder(path);
        }
    }

    async setTheme(theme: string) {
        await this.settingsService.setTheme(theme);
    }

    @HostListener('window:keydown', ['$event'])
    onKey(event: KeyboardEvent) {
        if (!this.isVisible()) return;

        if (event.key === 'Escape') {
            this.isVisible.set(false);
        }
    }
}
