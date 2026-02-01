// Editor Entry Point - wird von esbuild gebündelt
import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { placeholder } from "@codemirror/view";

// Exportiere alles was wir im HTML brauchen
window.CodeMirrorBundle = {
    EditorView,
    basicSetup,
    markdown,
    EditorState,
    HighlightStyle,
    syntaxHighlighting,
    tags: t,
    placeholder
};
