import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronService } from './electron.service';

@Injectable({
  providedIn: 'root'
})
export class EditorService {
  // Signals for state management
  content = signal<string>('');
  filePath = signal<string | null>(null);
  savedContent = signal<string>('');
  exporting = signal<boolean>(false);
  isOverlayOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  private electronService = inject(ElectronService);

  // Computed signal for dirty state
  isDirty = computed(() => this.content() !== this.savedContent());

  updateContent(newContent: string) {
    this.content.set(newContent);
  }

  setFile(path: string | null, newContent: string) {
    this.filePath.set(path);
    this.savedContent.set(newContent);
    this.content.set(newContent);
  }

  markSaved() {
    this.savedContent.set(this.content());
  }

  async handleAutoSave() {
    const content = this.content();
    const path = this.filePath();

    if (!path || !this.isDirty() || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    try {
      const result = await this.electronService.saveFile(content, path, '');
      if (result.success) {
        this.markSaved();
        this.electronService.log(`Auto-saved to: ${path}`);
      }
    } finally {
      // Small delay to make the "Saving" indicator visible if it's too fast
      setTimeout(() => {
        this.isSaving.set(false);
      }, 500);
    }
  }
}
