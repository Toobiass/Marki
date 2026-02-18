# Marki

**Marki** is a modern, high-performance desktop application built with **Angular** and **Electron**, designed for users who value speed and aesthetic clarity.

## The Vision

The core philosophy behind Marki is to eliminate the friction between thought and digital ink. Most editors are cluttered or visually unappealing; Marki provides a distraction-free environment to jot down information instantly.

While fully mouse-compatible, the app is **keyboard-first**. Every essential action is mapped to intuitive shortcuts, allowing power users to navigate, edit, and manage their notes without ever lifting their hands from the home row.

## Key Features

* **Split View:** Real-time side-by-side synchronization for instant feedback.

### Future Features
* **Dual-Engine Interface:** Seamlessly switch between a dedicated **Markdown Editor** and a high-fidelity **Live Preview**.
* **Flexible Layouts:** Choose the workflow that fits your focus:
* **Editor Only:** For deep-work writing sessions.
* **Preview Only:** For a clean reading experience.


## Setup & Installation

### 1. Prerequisites
Ensure that **Node.js** (latest LTS version) is installed on your system.

### 2. Install Dependencies
Clone the repository and run the following command in the root directory:
```bash
npm install
```
*This will automatically install Angular, Electron, CodeMirror, Marked, and all other necessary packages defined in `package.json`.*

### 3. Start Application (Development Mode)
To start the app in development mode with live build:
```bash
npm start
```
*Note: This command builds the Angular app in the background and automatically launches the Electron window once ready.*

### 4. Create Installer (EXE)
To generate a production-ready installer (`.exe`) for Windows:
```bash
npm run make-installer
```
*The installer will be generated in the `/release` folder.*

---

## ⌨️ Shortcut Table

| Shortcut        | Action                          |
|-----------------|---------------------------------|
| **Ctrl + S**    | Save document                   |
| **Ctrl + O**    | Open document                   |
| **Ctrl + N**    | Create new document             |
| **Ctrl + P**    | Set default folder              |
| **Ctrl + ,**    | Open Settings                   |

---

## 🛠 Tech Stack
*   **Frontend:** Angular
*   **Runtime:** Electron
*   **Editor Engine:** CodeMirror 6
*   **Markdown Rendering:** Marked