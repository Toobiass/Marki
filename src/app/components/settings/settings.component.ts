import { Component, signal, inject, HostListener } from '@angular/core';
import { ElectronService } from '../../services/electron.service';
import { SettingsService } from '../../services/settings.service';
import { EditorService } from '../../services/editor.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
    private electron = inject(ElectronService);
    private editor = inject(EditorService);
    public settingsService = inject(SettingsService);

    isVisible = signal(false);

    toggle() {
        const newState = !this.isVisible();
        this.isVisible.set(newState);
        this.editor.isOverlayOpen.set(newState);
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
            this.editor.isOverlayOpen.set(false);
        }
    }
}
