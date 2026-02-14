import { Component, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { TitleBarComponent } from './components/title-bar/title-bar.component';
import { EditorComponent } from './components/editor/editor.component';
import { PreviewComponent } from './components/preview/preview.component';
import { EditorService } from './services/editor.service';
import { ElectronService } from './services/electron.service';
import { QuickOpenComponent } from './components/quick-open/quick-open.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TitleBarComponent, EditorComponent, PreviewComponent, QuickOpenComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild(QuickOpenComponent) quickOpen!: QuickOpenComponent;

  private editorService = inject(EditorService);
  private electronService = inject(ElectronService);

  ngOnInit() {
    const savedPath = localStorage.getItem('marki-path');
    if (savedPath) {
      this.electronService.log("savedPath: " + savedPath);
    }
  }

  @HostListener('window:keydown', ['$event'])
  async handleKeyboardEvent(event: KeyboardEvent) {
    if (event.ctrlKey) {
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        await this.handleSave();
      } else if (key === 'o') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.quickOpen.handleTrigger();
      } else if (key === 'n') {
        event.preventDefault();
        this.handleNew();
      } else if (key === 'p') {
        event.preventDefault();
        await this.handleSelectFolder();
      }
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
      localStorage.setItem('marki-path', filePath);
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
