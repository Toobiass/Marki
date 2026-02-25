import { Component, HostListener, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { TitleBarComponent } from './components/title-bar/title-bar.component';
import { EditorComponent } from './components/editor/editor.component';
import { PreviewComponent } from './components/preview/preview.component';
import { EditorService } from './services/editor.service';
import { ElectronService } from './services/electron.service';
import { SettingsService } from './services/settings.service';
import { UserAgreementComponent } from './components/user-agreement/user-agreement.component';
import { QuickOpenComponent } from './components/quick-open/quick-open.component';
import { SettingsComponent } from './components/settings/settings.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TitleBarComponent, EditorComponent, PreviewComponent, QuickOpenComponent, SettingsComponent, UserAgreementComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  viewMode = signal<'editor' | 'editor-large' | 'split' | 'preview-large' | 'preview'>('split');

  @ViewChild(EditorComponent) editor!: EditorComponent;

  @ViewChild(QuickOpenComponent) quickOpen!: QuickOpenComponent;
  @ViewChild(PreviewComponent) preview!: PreviewComponent;
  @ViewChild(SettingsComponent) settings!: SettingsComponent;
  @ViewChild(UserAgreementComponent) userAgreement!: UserAgreementComponent;

  isExporting = computed(() => this.editorService.exporting());

  private editorService = inject(EditorService);
  private electronService = inject(ElectronService);
  private settingsService = inject(SettingsService);

  async ngOnInit() {
    await this.settingsService.loadSettings();
    this.viewMode.set(this.settingsService.defaultViewMode() as any);
    window.addEventListener('keydown', (event) => this.handleKeyboardEvent(event), { capture: true });
  }

  async handleKeyboardEvent(event: KeyboardEvent) {
    if (event.ctrlKey) {
      if (event.key === 'ArrowLeft' && event.altKey) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.shiftLayout('left');
        return;
      } else if (event.key === 'ArrowRight' && event.altKey) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.shiftLayout('right');
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        event.stopPropagation();
        await this.handleSave();
      } else if (key === 'o') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.quickOpen.handleTrigger();
      } else if (key === 'n') {
        event.preventDefault();
        event.stopPropagation();
        this.handleNew();
      } else if (key === 'p') {
        event.preventDefault();
        event.stopPropagation();
        await this.handleSelectFolder();
      } else if (key === ',') {
        event.preventDefault();
        event.stopPropagation();
        this.settings.toggle();
      } else if (key === 'e') {
        event.preventDefault();
        event.stopPropagation();
        await this.preview.exportToPdf();
      } else if (key === 'w') {
        this.electronService.close();
      }
    }
  }

  shiftLayout(direction: 'left' | 'right') {
    const current = this.viewMode();
    const modes: ('editor' | 'editor-large' | 'split' | 'preview-large' | 'preview')[] =
      ['editor', 'editor-large', 'split', 'preview-large', 'preview'];

    let index = modes.indexOf(current);
    if (direction === 'left') {
      index = Math.max(0, index - 1);
    } else {
      index = Math.min(modes.length - 1, index + 1);
    }

    this.viewMode.set(modes[index]);

    if (this.viewMode() !== 'preview') {
      setTimeout(() => this.editor.focus(), 300); // Wait for transition
    }
  }

  async handleSave() {
    const content = this.editorService.content();
    const existingPath = this.editorService.filePath();
    const suggestedName = this.getSuggestedFilename(content);

    const result = await this.electronService.saveFile(content, existingPath, suggestedName);
    if (result.success && result.filePath) {
      this.editorService.setFile(result.filePath, content);
      this.electronService.log(`Saved to: ${result.filePath}`);
    }
  }

  async handleOpen() {
    const result = await this.electronService.openFile();
    if (result) {
      this.editorService.setFile(result.filePath, result.content);
      this.electronService.log(`Opened: ${result.filePath}`);
    }
  }

  handleNew() {
    this.editorService.setFile(null, '');
    this.electronService.log("Document state cleared!");
  }

  async handleSelectFolder() {
    const filePath = await this.electronService.selectFolder();
    if (filePath) {
      await this.settingsService.setStandardFolder(filePath);
      this.electronService.log("Standard folder updated!");
    }
  }

  private getSuggestedFilename(content: string): string {
    const h1Match = content.match(/^#\s+(.*)$/m);
    if (h1Match && h1Match[1]) {
      return h1Match[1].trim().replace(/[<>:"/\\|?*]/g, '').substring(0, 50);
    }
    return content.trim().substring(0, 20).replace(/\n/g, ' ').replace(/[<>:"/\\|?*]/g, '') || 'untitled';
  }
}
