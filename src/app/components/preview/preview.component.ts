import { Component, OnInit, ElementRef, ViewChild, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorService } from '../../services/editor.service';
import { marked } from 'marked';

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.css']
})
export class PreviewComponent {
  @ViewChild('previewContainer') previewContainer!: ElementRef;
  renderedHtml: string = '';
  private editorService = inject(EditorService);
  private isSyncing = false;

  constructor() {
    // Re-render when content signal changes
    effect(async () => {
      const content = this.editorService.content();
      this.renderedHtml = await marked.parse(content);
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
