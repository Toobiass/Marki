import { Component, signal, inject, HostListener, Output, EventEmitter, ViewChild, ElementRef, effect } from '@angular/core';

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
    @Output() closed = new EventEmitter<void>();
    @ViewChild('quickOpenModal') modal?: ElementRef;

    isVisible = signal(false);
    isLoading = signal(false);
    items = signal<any[]>([]);
    selectedIndex = signal(0);
    private canHover = false;

    private lastTriggerTime = 0;

    handleTrigger() {
        const now = Date.now();
        if (now - this.lastTriggerTime < 300) return;
        this.lastTriggerTime = now;

        if (!this.isVisible()) {
            this.openOverlay();
        } else {
            this.isVisible.set(false);
            this.editor.isOverlayOpen.set(false);
            this.requestFullOpen.emit();
        }
    }

    async openOverlay() {
        this.canHover = false;
        this.items.set([]);
        this.selectedIndex.set(0);
        this.isLoading.set(true);
        this.isVisible.set(true);
        this.editor.isOverlayOpen.set(true);

        setTimeout(() => this.modal?.nativeElement.focus(), 0);

        const recents = await this.electron.getRecentFiles();
        const existing = await this.electron.filterExistingFiles(recents);
        const mapped = existing.map(path => ({
            name: path.split(/[\\/]/).pop(),
            path: path
        }));

        this.items.set(mapped);
        this.isLoading.set(false);

        setTimeout(() => this.canHover = true, 150);
    }

    @HostListener('window:keydown', ['$event'])
    onGlobalKey(event: KeyboardEvent) {
        if (!this.isVisible()) return;
        if (event.key === 'Escape') {
            this.close();
        }
    }

    onKey(event: KeyboardEvent) {
        const items = this.items();
        if (!items.length) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            event.stopPropagation();
            this.selectedIndex.update(i => (i + 1) % items.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            this.selectedIndex.update(i => (i - 1 + items.length) % items.length);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            const item = items[this.selectedIndex()];
            if (item) this.selectItem(item);
        }
    }

    close() {
        this.isVisible.set(false);
        this.editor.isOverlayOpen.set(false);
        this.closed.emit();
    }

    onItemHover(index: number) {
        if (this.canHover) {
            this.selectedIndex.set(index);
        }
    }

    async selectItem(item: any) {
        await this.editor.handleAutoSave();
        const result = await this.electron.readFilePath(item.path);
        if (result) {
            this.editor.setFile(result.filePath, result.content);
            this.close();
        }
    }

    // Proactive: Scroll selected item into view
    constructor() {
        effect(() => {
            const index = this.selectedIndex();
            if (this.isVisible()) {
                setTimeout(() => {
                    const selectedElem = document.querySelector('.item.selected');
                    selectedElem?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }, 0);
            }
        });
    }
}