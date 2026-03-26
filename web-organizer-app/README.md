# Web Organizer App

A full-stack local web application to organize files by type and restore them accurately using metadata.

## Features

- Organize files in a folder root into category subfolders:
  - Images
  - Videos
  - Documents
  - Audio
  - Archives
  - Others
- Restore files back to original locations using metadata
- Undo last organization action
- Redo last undo action
- Preview planned file moves before organizing
- Status badges and progress feedback in UI
- Drag-and-drop folder helper in UI
- Secure in-app folder browser modal with root scope restrictions

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- File operations: Node fs/promises

## Project Structure

web-organizer-app/
- client/
  - app.js
  - index.html
  - styles.css
- server/
  - app.js
  - config.js
  - middlewares/
    - errorHandler.js
  - routes/
    - operations.js
  - services/
    - fileOrganizerService.js
  - utils/
    - pathUtils.js
- .env.example
- .gitignore
- package.json
- README.md

## How It Works

1. Enter a folder path in the UI.
2. Click Preview to see what will move.
3. Click Organize Files.
4. App creates a metadata file in that folder:
   - .file_organizer_metadata.json
5. Click Restore Files to bring files back to their original paths.

## API Endpoints

- POST /api/preview
- POST /api/organize
- POST /api/restore
- POST /api/undo
- POST /api/redo
- GET /api/folders/roots
- POST /api/folders/list
- GET /api/health

### Example request body

{
  "folderPath": "C:/Users/your-user/Downloads"
}

## Setup

1. Open terminal in web-organizer-app
2. Install dependencies:

npm install

3. Start server:

npm run dev

or

npm start

4. Open browser:

http://127.0.0.1:4000

## Notes

- This app is intended for local use on your own machine.
- Browser security does not expose full system paths from drag-and-drop in all cases. Path input remains the most reliable method.
- Ensure the Node process has permission to read/write target folders.
- By default, folder browsing is restricted to the current user's home directory for security.

## Security and Reliability

- Validates folder path existence and directory type
- Handles invalid paths and operation errors with structured responses
- Uses unique destination names to avoid accidental overwrite
- Uses metadata operation records for deterministic restore
- Enforces server-side folder browse allowlist boundaries

## Environment

- PORT: server port (default 4000)
- HOST: server host (default 127.0.0.1)
- BROWSER_SCOPE_HOME_ONLY: true or false (default true)

## Cross-Platform

Built with Node path and fs APIs and supports Windows, macOS, and Linux.
