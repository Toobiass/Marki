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

    const opt = {
      margin: 15,
      filename: filePath.split(/[\\/]/).pop(),
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: true,
        onclone: (clonedDoc: Document) => {
          // Force body to be light theme to ensure CSS variables work correctly
          clonedDoc.body.classList.remove('theme-dark');
          clonedDoc.body.classList.add('theme-light');

          const preview = clonedDoc.getElementById('preview');
          if (preview) {
            preview.classList.add('theme-light');
            // Ensure background is explicitly white for the PDF content
            preview.style.background = '#ffffff';
          }
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      this.electronService.log('Generating PDF...');

      // Lazy load html2pdf
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;

      const pdfBuffer = await html2pdf().from(element).set(opt).output('arraybuffer');
      const result = await this.electronService.writeBinary(filePath, pdfBuffer);

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
