import { Component, signal, inject, HostListener, ViewChild, ElementRef } from '@angular/core';
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
    @ViewChild('settingsModal') modal?: ElementRef;

    close() {
        this.isVisible.set(false);
        this.editor.isOverlayOpen.set(false);
    }

    toggle() {
        if (this.isVisible()) {
            this.close();
        } else {
            this.isVisible.set(true);
            this.editor.isOverlayOpen.set(true);
            setTimeout(() => this.modal?.nativeElement.focus(), 0);
        }
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

    async setDefaultViewMode(mode: string) {
        await this.settingsService.setDefaultViewMode(mode);
    }

    async setWindowSizePreset(preset: string) {
        await this.settingsService.setWindowSizePreset(preset);
    }

    @HostListener('window:keydown', ['$event'])
    onKey(event: KeyboardEvent) {
        if (!this.isVisible()) return;

        if (event.key === 'Escape') {
            this.close();
        }
    }
}
