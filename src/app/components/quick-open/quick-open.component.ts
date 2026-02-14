import { Component, signal, inject, HostListener, Output, EventEmitter } from '@angular/core';

import { ElectronService } from '../../services/electron.service';
import { EditorService } from '../../services/editor.service';

@Component({
    selector: 'app-quick-open',
    standalone: true,
    imports: [],
    templateUrl: './quick-open.component.html',
    styleUrls: ['./quick-open.component.css']
})
export class QuickOpenComponent {
    private electron = inject(ElectronService);
    private editor = inject(EditorService);

    @Output() requestFullOpen = new EventEmitter<void>();

    isVisible = signal(false);
    items = signal<any[]>([]);
    selectedIndex = signal(0);

    private lastTriggerTime = 0;

    handleTrigger() {
        const now = Date.now();
        if (now - this.lastTriggerTime < 300) return;
        this.lastTriggerTime = now;

        if (!this.isVisible()) {
            this.openOverlay();
        } else {
            this.isVisible.set(false);
            this.requestFullOpen.emit();
        }
    }

    async openOverlay() {
        const recents = await this.electron.getRecentFiles();
        this.items.set(recents.map(path => ({
            name: path.split(/[\\/]/).pop(),
            path: path
        })));
        this.isVisible.set(true);
        this.selectedIndex.set(0);
    }

    @HostListener('window:keydown', ['$event'])
    onKey(event: KeyboardEvent) {
        if (!this.isVisible()) return;

        if (event.key === 'ArrowDown') {
            this.selectedIndex.update(i => (i + 1) % this.items().length);
        } else if (event.key === 'ArrowUp') {
            this.selectedIndex.update(i => (i - 1 + this.items().length) % this.items().length);
        } else if (event.key === 'Escape') {
            this.isVisible.set(false);
        } else if (event.key === 'Enter') {
            this.selectItem(this.items()[this.selectedIndex()]);
        }
    }

    async selectItem(item: any) {
        const result = await this.electron.readFilePath(item.path);
        if (result) {
            this.editor.setFile(result.filePath, result.content);
            this.isVisible.set(false);
        }
    }
}