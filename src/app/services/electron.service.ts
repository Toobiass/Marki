import { Injectable } from '@angular/core';

export interface FileSaveResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface FileOpenResult {
  filePath: string;
  content: string;
}

export interface ElectronAPI {
  log: (msg: string) => void;
  selectFolder: () => Promise<string | null>;
  openFile: () => Promise<FileOpenResult | null>;
  saveFile: (data: { content: string; existingPath: string | null; suggestedName: string }) => Promise<FileSaveResult>;
  saveImage: (data: { arrayBuffer: ArrayBuffer; currentFilePath: string | null }) => Promise<{ success: boolean; fileName?: string; fullPath?: string; error?: string }>;
  getRecentFiles: () => Promise<string[]>;
  readFilePath: (path: string) => Promise<FileOpenResult | null>;
  getSettings: () => Promise<any>;
  setSetting: (key: string, value: any) => Promise<boolean>;
  setNativeTheme: (theme: string) => void;
  getPdfPath: (data: { suggestedName: string }) => Promise<string | null>;
  printToPdf: (data: { html: string; filePath: string }) => Promise<FileSaveResult>;
  close: () => void;
  applySizePreset: (preset: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  constructor() { }

  log(msg: string) {
    if (window.electronAPI) {
      window.electronAPI.log(msg);
    } else {
      console.log('Log:', msg);
    }
  }

  async selectFolder(): Promise<string | null> {
    return window.electronAPI?.selectFolder() || null;
  }

  async openFile(): Promise<FileOpenResult | null> {
    return window.electronAPI?.openFile() || null;
  }

  async saveFile(content: string, existingPath: string | null, suggestedName: string): Promise<FileSaveResult> {
    return window.electronAPI?.saveFile({ content, existingPath, suggestedName }) || { success: false, error: 'Electron API not available' };
  }

  async saveImage(arrayBuffer: ArrayBuffer, currentFilePath: string | null) {
    return window.electronAPI?.saveImage({ arrayBuffer, currentFilePath });
  }

  async getRecentFiles() {
    return window.electronAPI.getRecentFiles();
  }
  async readFilePath(path: string) {
    return window.electronAPI.readFilePath(path);
  }

  async getSettings() {
    return window.electronAPI?.getSettings() || {
      standardFolder: '',
      theme: 'dark',
      defaultViewMode: 'split',
      windowSizePreset: 'medium'
    };
  }

  async setSetting(key: string, value: any) {
    return window.electronAPI?.setSetting(key, value) || false;
  }

  setNativeTheme(theme: string) {
    window.electronAPI?.setNativeTheme(theme);
  }

  async getPdfPath(suggestedName: string): Promise<string | null> {
    return window.electronAPI?.getPdfPath({ suggestedName }) || null;
  }

  async printToPdf(html: string, filePath: string): Promise<FileSaveResult> {
    return window.electronAPI?.printToPdf({ html, filePath }) || { success: false, error: 'Electron API not available' };
  }

  close() {
    window.electronAPI?.close();
  }

  applySizePreset(preset: string) {
    window.electronAPI?.applySizePreset(preset);
  }
}
