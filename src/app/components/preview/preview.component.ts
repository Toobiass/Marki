import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, from, combineLatest } from 'rxjs';
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

  private editorService = inject(EditorService);
  private electronService = inject(ElectronService);
  private isSyncing = false;

  // Observable combining content and path
  private renderParams$ = combineLatest([
    toObservable(this.editorService.content),
    toObservable(this.editorService.filePath)
  ]);

  // Modern Angular way: transform the observable stream into a signal
  renderedHtml = toSignal(
    this.renderParams$.pipe(
      switchMap(([content, filePath]) => from(this.renderMarkdown(content, filePath)))
    ),
    { initialValue: '' }
  );

  private async renderMarkdown(content: string, filePath: string | null): Promise<string> {
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
          const isAbsolutePath = href.includes(':') || href.startsWith('/');
          if (!isAbsolutePath && baseDir) {
            const absolutePath = baseDir + href;
            token.href = 'file:///' + absolutePath.replace(/\\/g, '/').replace(/^\/+/, '/');
          }
        }
        return originalImage(token);
      };

      return await marked.parse(content || '', { renderer });
    } catch (err) {
      console.error('[Preview] Render error:', err);
      return await marked.parse(content || '');
    }
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

  async exportToPdf() {
    const element = document.getElementById('preview');
    if (!element) return;

    // Ensure all images are loaded before generating PDF
    const images = Array.from(element.getElementsByTagName('img'));
    await Promise.all(images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));

    const suggestedName = this.getFileNameWithoutExtension();

    // 1. Get save path from electron BEFORE showing loading
    const filePath = await this.electronService.getPdfPath(suggestedName);
    if (!filePath) return;

    // 2. Start loading
    this.editorService.exporting.set(true);

    // Give the UI a moment to render the loader before the heavy work starts
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      this.electronService.log('Generating PDF...');

      const lightThemeCss = `
        :root {
          --bg-dark: #ffffff;
          --bg-editor: #ffffff;
          --text-main: #000000;
          --accent: #0078d4;
          --border: #e5e5e5;
          --text-muted: #666666;
          --font-mono: 'Consolas', 'Monaco', 'Courier New', monospace;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: white;
          color: black;
          margin: 0;
          padding: 20mm;
        }
        #preview {
          line-height: 1.5;
          word-wrap: break-word;
        }
        h1 { color: var(--text-main); border-bottom: 1px solid var(--border); padding-bottom: 10px; }
        h2 { color: var(--text-main); margin-top: 1.5em; }
        h3 { color: var(--text-main); }
        p { margin-bottom: 16px; font-size: 11pt; }
        code { background: #f3f3f3; color: #d63384; padding: 2px 4px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.9em; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 8px; overflow-x: auto; border: 1px solid var(--border); }
        blockquote { border-left: 4px solid var(--accent); margin: 0; padding-left: 20px; color: var(--text-muted); font-style: italic; }
        a { color: var(--accent); text-decoration: underline; }
        img { max-width: 100%; height: auto; display: block; border-radius: 8px; margin: 20px 0; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid var(--border); padding: 8px; text-align: left; }
        th { background: #f8f9fa; }
      `;

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${lightThemeCss}</style>
        </head>
        <body>
          <div id="preview">
            ${element.innerHTML}
          </div>
        </body>
        </html>
      `;

      const result = await this.electronService.printToPdf(fullHtml, filePath);

      if (result.success) {
        this.electronService.log(`Exported PDF to: ${filePath}`);
      }
    } catch (err) {
      this.electronService.log(`PDF Export Error: ${err}`);
      console.error('[Preview] PDF Export Error:', err);
    } finally {
      this.editorService.exporting.set(false);
    }
  }

  private getFileNameWithoutExtension(): string {
    const path = this.editorService.filePath();
    if (path) {
      const fileName = path.split(/[\\/]/).pop() || 'document';
      return fileName.replace(/\.[^/.]+$/, "");
    }

    // Fallback to title based on content if no file path
    const content = this.editorService.content();
    const h1Match = content.match(/^#\s+(.*)$/m);
    if (h1Match && h1Match[1]) {
      return h1Match[1].trim().replace(/[<>:"/\\|?*]/g, '').substring(0, 50);
    }
    return 'untitled';
  }
}
