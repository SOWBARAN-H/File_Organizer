# File Organizer

A local web application that organizes files into category subfolders and restores them accurately using metadata. Built with Node.js, Express, and vanilla HTML/CSS/JS.

## Live Demo (UI Preview)

The static UI is hosted on GitHub Pages:  
**https://sowbaran-h.github.io/File_Organizer/**

> **Note:** The live demo only shows the interface. All file operations require the server running on your own machine (see [Local Setup](#local-setup) below), because the app reads and writes files on your local file system.

## Features

- Organize files in any folder into category subfolders: Images, Videos, Documents, Audio, Archives, Others
- Restore files to their original locations using saved metadata
- Undo / Redo last organize action
- Preview planned moves before committing
- In-app folder browser modal with security scope restrictions
- Drag-and-drop folder path helper
- Real-time status badges and progress indicator

## Local Setup

### Requirements

- [Node.js](https://nodejs.org/) v18 or later

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/SOWBARAN-H/File_Organizer.git
cd File_Organizer/web-organizer-app

# 2. Install dependencies
npm install

# 3. (Optional) Copy and edit environment settings
cp .env.example .env

# 4. Start the server
npm start
```

Then open your browser at **http://127.0.0.1:4000**

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Server port |
| `HOST` | `127.0.0.1` | Server host |
| `BROWSER_SCOPE_HOME_ONLY` | `true` | Restrict folder browser to user home directory |

## How to Use

1. Enter a folder path in the **Folder Path** input (e.g., `C:/Users/you/Downloads`), or use **Browse Folder**.
2. Click **Preview** to see what files will move and where.
3. Click **Organize Files** to move files into category subfolders.  
   A `.file_organizer_metadata.json` file is saved in the folder to enable restore.
4. Click **Restore Files** to move all files back to their original locations.
5. Use **Undo Last Action** / **Redo Last Undo** to step through history.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (no framework)
- **Backend:** Node.js + Express
- **File operations:** Node.js `fs/promises`

## Project Structure

```
File_Organizer/
├── index.html                  # GitHub Pages entry point (redirects to client)
├── 404.html                    # GitHub Pages 404 handler
├── downloads_organizer.py      # Standalone Python CLI organizer
├── downloads_ui.py             # Python UI helper
├── restore_downloads.py        # Python CLI restore script
└── web-organizer-app/
    ├── client/
    │   ├── index.html
    │   ├── styles.css
    │   └── app.js
    └── server/
        ├── app.js
        ├── config.js
        ├── middlewares/
        ├── routes/
        ├── services/
        └── utils/
```

## Security

- Server-side path validation prevents directory traversal
- Folder browser restricted to the user's home directory by default (`BROWSER_SCOPE_HOME_ONLY`)
- Unique destination filenames prevent accidental overwrites
- Metadata-backed restore ensures deterministic recovery

## Cross-Platform

Supports Windows, macOS, and Linux via Node.js `path` and `fs` APIs.

## License

MIT
