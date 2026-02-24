import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, effect } from '@angular/core';
import { EditorService } from '../../services/editor.service';
import { ElectronService } from '../../services/electron.service';
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { placeholder, keymap } from '@codemirror/view';
import { defaultKeymap, undo, redo, moveLineUp, moveLineDown } from '@codemirror/commands';

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
  private lastPath: string | null = null;

  constructor() {
    // Sync external content changes into CodeMirror
    effect(() => {
      const content = this.editorService.content();
      const path = this.editorService.filePath();

      if (!this.view) return;

      // If the document content is different, sync it
      if (this.view.state.doc.toString() !== content) {
        if (path !== this.lastPath) {
          // Path changed -> Reset entire state (clears history)
          this.view.setState(this.createNewState(content));
          this.lastPath = path;
        } else {
          // Same path -> Just update content (preserves history)
          this.view.dispatch({
            changes: { from: 0, to: this.view.state.doc.length, insert: content }
          });
        }
      }
    });
  }

  private createNewState(content: string): EditorState {
    // ... (rest of the createNewState method as defined before)
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

    return EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        theme,
        syntaxHighlighting(highlightStyle),
        placeholder("Write anything..."),
        EditorView.lineWrapping,
        keymap.of([
          ...defaultKeymap,
          { key: "Ctrl-b", run: () => { this.toggleFormat('**'); return true; } },
          { key: "Ctrl-i", run: () => { this.toggleFormat('*'); return true; } },
          { key: "Ctrl-k", run: () => { this.insertLink(); return true; } },
          { key: "Ctrl-h", run: () => { this.cycleHeader(); return true; } },
          { key: "Ctrl-Shift-c", run: () => { this.toggleCodeBlock(); return true; } },
          { key: "Ctrl-z", run: (view) => { undo(view); return true; } },
          { key: "Ctrl-y", run: (view) => { redo(view); return true; } },
          { key: "Alt-ArrowUp", run: moveLineUp },
          { key: "Alt-ArrowDown", run: moveLineDown },
          { key: "Tab", run: () => this.handleTab() },
        ]),
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
    });
  }

  ngAfterViewInit() {
    this.initEditor();
  }

  ngOnDestroy() {
    if (this.view) this.view.destroy();
  }

  focus() {
    if (this.view) {
      this.view.focus();
    }
  }

  private initEditor() {
    this.lastPath = this.editorService.filePath();
    this.view = new EditorView({
      state: this.createNewState(this.editorService.content()),
      parent: this.editorContainer.nativeElement
    });
  }

  private onScroll(view: EditorView) {
    if (this.isSyncing) {
      this.isSyncing = false;
      return;
    }
    if (this.editorService.isOverlayOpen()) {
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

  private handleTab(): boolean {
    const { state, dispatch } = this.view;
    const mainSelection = state.selection.main;

    if (!mainSelection.empty) return false;

    const pos = mainSelection.head;
    const nextChars = state.doc.sliceString(pos, pos + 4);

    if (nextChars.startsWith('\n```')) {
      dispatch({ selection: { anchor: pos + 4 } });
      return true;
    } else if (nextChars.startsWith('**')) {
      dispatch({ selection: { anchor: pos + 2 } });
      return true;
    } else if (nextChars.startsWith('*') ||
      nextChars.startsWith('`') ||
      nextChars.startsWith(']') ||
      nextChars.startsWith(')')) {
      dispatch({ selection: { anchor: pos + 1 } });
      return true;
    }

    return false;
  }

  private toggleCodeBlock() {
    const { state, dispatch } = this.view;
    const mainSelection = state.selection.main;

    if (!mainSelection.empty) {
      const selectedText = state.doc.sliceString(mainSelection.from, mainSelection.to);
      const isMultiLine = selectedText.includes('\n');

      if (isMultiLine) {
        const insert = `\n\`\`\`\n${selectedText}\n\`\`\`\n`;
        dispatch({
          changes: { from: mainSelection.from, to: mainSelection.to, insert },
          selection: { anchor: mainSelection.from + 5, head: mainSelection.from + 5 + selectedText.length }
        });
      } else {
        const insert = `\`${selectedText}\``;
        dispatch({
          changes: { from: mainSelection.from, to: mainSelection.to, insert },
          selection: { anchor: mainSelection.from + 1, head: mainSelection.from + 1 + selectedText.length }
        });
      }
    } else {
      const pos = mainSelection.head;
      const insert = `\n\`\`\`\n\n\`\`\`\n`;
      dispatch({
        changes: { from: pos, to: pos, insert },
        selection: { anchor: pos + 5 }
      });
    }
  }

  private toggleFormat(symbol: string) {
    const { state, dispatch } = this.view;
    const mainSelection = state.selection.main;

    if (!mainSelection.empty) {
      // Selection Mode: Wrap highlighted text
      const selectedText = state.doc.sliceString(mainSelection.from, mainSelection.to);
      dispatch({
        changes: { from: mainSelection.from, to: mainSelection.to, insert: `${symbol}${selectedText}${symbol}` },
        selection: { anchor: mainSelection.from + symbol.length, head: mainSelection.to + symbol.length }
      });
    } else {
      const pos = mainSelection.head;
      const line = state.doc.lineAt(pos);
      const lineText = line.text;
      const relPos = pos - line.from;

      // Word-Jump Mode Logic
      let wordStart = relPos;
      while (wordStart > 0 && /\w/.test(lineText[wordStart - 1])) wordStart--;
      let wordEnd = relPos;
      while (wordEnd < lineText.length && /\w/.test(lineText[wordEnd])) wordEnd++;

      if (wordStart < wordEnd) {
        // We are touching a word
        const from = line.from + wordStart;
        const to = line.from + wordEnd;
        const word = lineText.slice(wordStart, wordEnd);
        dispatch({
          changes: { from, to, insert: `${symbol}${word}${symbol}` },
          selection: { anchor: from + symbol.length, head: to + symbol.length }
        });
      } else {
        // Empty State / Inline Insertion
        dispatch({
          changes: { from: pos, to: pos, insert: `${symbol}${symbol}` },
          selection: { anchor: pos + symbol.length }
        });
      }
    }
  }

  private insertLink() {
    const { state, dispatch } = this.view;
    const mainSelection = state.selection.main;
    const defaultUrl = "https://";

    if (!mainSelection.empty) {
      const selectedText = state.doc.sliceString(mainSelection.from, mainSelection.to);
      const insert = `[${selectedText}](${defaultUrl})`;
      dispatch({
        changes: { from: mainSelection.from, to: mainSelection.to, insert },
        selection: { anchor: mainSelection.from + insert.length - 1 - defaultUrl.length, head: mainSelection.from + insert.length - 1 }
      });
    } else {
      const insert = `[text](${defaultUrl})`;
      const pos = mainSelection.head;
      dispatch({
        changes: { from: pos, to: pos, insert },
        selection: { anchor: pos + 1, head: pos + 5 } // Select "text"
      });
    }
  }

  private cycleHeader() {
    const { state, dispatch } = this.view;
    const mainSelection = state.selection.main;
    const line = state.doc.lineAt(mainSelection.head);
    const lineText = line.text;

    let newText = lineText;
    if (lineText.startsWith('### ')) {
      newText = lineText.slice(4);
    } else if (lineText.startsWith('## ')) {
      newText = '### ' + lineText.slice(3);
    } else if (lineText.startsWith('# ')) {
      newText = '## ' + lineText.slice(2);
    } else {
      newText = '# ' + lineText;
    }

    dispatch({
      changes: { from: line.from, to: line.to, insert: newText },
      selection: { anchor: line.from + newText.length }
    });
  }
}
