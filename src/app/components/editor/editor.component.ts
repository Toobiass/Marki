import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, effect } from '@angular/core';
import { EditorService } from '../../services/editor.service';
import { ElectronService } from '../../services/electron.service';
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { placeholder } from '@codemirror/view';

@Component({
  selector: 'app-editor',
  standalone: true,
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  private view!: EditorView;
  private editorService = inject(EditorService);
  private electronService = inject(ElectronService);
  private isSyncing = false;

  constructor() {
    // Sync external content changes into CodeMirror
    effect(() => {
      const content = this.editorService.content();
      if (this.view && this.view.state.doc.toString() !== content) {
        this.view.dispatch({
          changes: { from: 0, to: this.view.state.doc.length, insert: content }
        });
      }
    });
  }

  ngAfterViewInit() {
    this.initEditor();
  }

  ngOnDestroy() {
    if (this.view) this.view.destroy();
  }

  private initEditor() {
    const highlightStyle = HighlightStyle.define([
      { tag: t.heading, color: "var(--accent)", fontWeight: "bold" },
      { tag: t.strong, color: "var(--accent)", fontWeight: "bold" },
      { tag: t.emphasis, color: "var(--accent)", fontStyle: "italic" },
      { tag: t.link, color: "var(--accent)", textDecoration: "underline" },
      { tag: t.url, color: "var(--accent)" },
      { tag: t.keyword, color: "var(--accent)" },
      { tag: t.atom, color: "var(--accent)" },
      { tag: t.meta, color: "var(--text-muted)" },
      { tag: t.comment, color: "var(--text-muted)" },
      { tag: t.strikethrough, color: "var(--text-muted)", textDecoration: "line-through" },
      { tag: t.special(t.string), color: "var(--accent)" },
      { tag: t.processingInstruction, color: "var(--accent)" },
      { tag: t.content, color: "var(--text-main)" }
    ]);

    const theme = EditorView.theme({
      "&": { backgroundColor: "var(--bg-editor)", color: "var(--text-main)" },
      "&.cm-focused": { outline: "none" },
      ".cm-content": { caretColor: "var(--text-main)", color: "var(--text-main)" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--text-main)" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: "var(--accent) !important", opacity: "0.2" },
      ".cm-placeholder": { color: "var(--text-muted) !important" },
      ".cm-gutters": { backgroundColor: "var(--cm-gutter-bg)", color: "var(--cm-gutter-text)", border: "none" },
      ".cm-activeLine": { backgroundColor: "rgba(128, 128, 128, 0.05) !important" },
      ".cm-activeLineGutter": { backgroundColor: "var(--cm-gutter-bg) !important", color: "var(--text-main)" }
    });

    this.view = new EditorView({
      state: EditorState.create({
        doc: this.editorService.content(),
        extensions: [
          basicSetup,
          markdown(),
          theme,
          syntaxHighlighting(highlightStyle),
          placeholder("Write anything..."),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.editorService.updateContent(update.state.doc.toString());
            }
          }),
          EditorView.domEventHandlers({
            scroll: (event, view) => {
              this.onScroll(view);
            },
            paste: (event, view) => {
              this.handlePaste(event, view);
            }
          })
        ]
      }),
      parent: this.editorContainer.nativeElement
    });
  }

  private onScroll(view: EditorView) {
    if (this.isSyncing) {
      this.isSyncing = false;
      return;
    }
    this.isSyncing = true;
    const source = view.scrollDOM;
    const percentage = source.scrollTop / (source.scrollHeight - source.clientHeight);
    const preview = document.getElementById('preview-container');
    if (preview && !isNaN(percentage)) {
      preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
    }
  }

  private handlePaste(event: ClipboardEvent, view: EditorView): boolean {
    const items = event.clipboardData?.items;
    if (!items) return false;

    let handled = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        event.preventDefault();
        handled = true;
        const file = item.getAsFile();
        if (!file) continue;

        this.electronService.log(`Image paste detected: ${item.type}`);

        file.arrayBuffer().then(async (arrayBuffer) => {
          const currentFilePath = this.editorService.filePath();
          const result = await this.electronService.saveImage(arrayBuffer, currentFilePath);

          if (result && result.success && result.fileName) {
            const markdownImage = `![alt text](${result.fileName})`;
            const pos = view.state.selection.main.head;
            view.dispatch({
              changes: { from: pos, to: pos, insert: markdownImage },
              selection: { anchor: pos + markdownImage.length }
            });
            this.electronService.log(`Image saved and inserted: ${result.fileName}`);
          } else {
            this.electronService.log(`Failed to save image: ${result?.error}`);
          }
        });
      }
    }
    return handled;
  }
}
