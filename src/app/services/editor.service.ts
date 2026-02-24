import { Injectable, signal, computed } from '@angular/core';

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
}
