import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, effect } from '@angular/core';
import { EditorService } from '../../services/editor.service';
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
      { tag: t.heading, color: "#569cd6", fontWeight: "bold" },
      { tag: t.strong, color: "#569cd6" },
      { tag: t.emphasis, color: "#569cd6" },
      { tag: t.link, color: "#569cd6" },
      { tag: t.url, color: "#569cd6" },
      { tag: t.keyword, color: "#569cd6" },
      { tag: t.atom, color: "#569cd6" },
      { tag: t.meta, color: "#569cd6" },
      { tag: t.strikethrough, color: "#569cd6" },
      { tag: t.special(t.string), color: "#569cd6" },
      { tag: t.processingInstruction, color: "#569cd6" },
    ]);

    const theme = EditorView.theme({
      "&": { backgroundColor: "#1e1e1e", color: "#d4d4d4" },
      ".cm-content": { caretColor: "#aeafad" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#aeafad" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: "#264f78" },
      ".cm-gutters": { backgroundColor: "#1e1e1e", color: "#858585", border: "none" },
      ".cm-activeLine": { backgroundColor: "transparent !important" },
      ".cm-activeLineGutter": { backgroundColor: "transparent !important", color: "#d4d4d4" }
    }, { dark: true });

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
}
