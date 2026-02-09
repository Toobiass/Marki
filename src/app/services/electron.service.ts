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
}
