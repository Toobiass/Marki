import { Component, OnInit, ElementRef, ViewChild, inject, effect } from '@angular/core';
import { EditorService } from '../../services/editor.service';
import { ElectronService } from '../../services/electron.service';
import { marked } from 'marked';

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [],
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.css']
})
export class PreviewComponent {
  @ViewChild('previewContainer') previewContainer!: ElementRef;
  renderedHtml: string = '';
  private editorService = inject(EditorService);
  private electronService = inject(ElectronService);
  private isSyncing = false;

  constructor() {
    // Re-render when content signal changes
    effect(async () => {
      const content = this.editorService.content();
      const filePath = this.editorService.filePath();

      try {
        let baseDir = '';
        if (filePath) {
          // Normalize separators and get directory
          const normalizedPath = filePath.replace(/\\/g, '/');
          baseDir = normalizedPath.substring(0, normalizedPath.lastIndexOf('/') + 1);
        } else {
          const settings = await this.electronService.getSettings();
          baseDir = settings.standardFolder ? settings.standardFolder.replace(/\\/g, '/') : '';
          if (baseDir && !baseDir.endsWith('/')) baseDir += '/';
        }

        const renderer = new marked.Renderer();
        const originalImage = renderer.image.bind(renderer);

        renderer.image = (token: any) => {
          let href = token.href;
          // If it's a relative path and we have a baseDir, make it absolute for the preview
          if (href && !href.startsWith('http') && !href.startsWith('file://') && !href.startsWith('/') && !href.includes(':')) {
            // Fix: ensure we don't double up on file:/// or handle absolute paths with drive letters
            const isAbsolutePath = href.includes(':') || href.startsWith('/');
            if (!isAbsolutePath && baseDir) {
              const absolutePath = baseDir + href;
              token.href = 'file:///' + absolutePath.replace(/\\/g, '/').replace(/^\/+/, '/');
            }
          }
          return originalImage(token);
        };

        this.renderedHtml = await marked.parse(content, { renderer });
      } catch (err) {
        console.error('Render error:', err);
        // Fallback to simple parse if custom renderer fails
        this.renderedHtml = await marked.parse(content);
      }
    });
  }

  onScroll() {
    if (this.isSyncing) {
      this.isSyncing = false;
      return;
    }
    this.isSyncing = true;
    const source = this.previewContainer.nativeElement;
    const percentage = source.scrollTop / (source.scrollHeight - source.clientHeight);
    const editor = document.querySelector('.cm-scroller');
    if (editor && !isNaN(percentage)) {
      editor.scrollTop = percentage * (editor.scrollHeight - editor.clientHeight);
    }
  }
}
