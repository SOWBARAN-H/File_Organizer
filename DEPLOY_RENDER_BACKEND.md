# Deploy Node backend to Render

## 1. Create service

1. Open Render dashboard.
2. Click New + > Blueprint.
3. Select your GitHub repository: SOWBARAN-H/File_Organizer.
4. Render will detect render.yaml automatically.
5. Click Apply.

## 2. Wait for deploy

After successful deploy, copy your backend URL, for example:

https://file-organizer-backend.onrender.com

## 3. Verify health endpoint

Open:

https://YOUR-RENDER-URL/api/health

Expected response:

{"success":true,"message":"Server is healthy."}

## 4. Connect in Streamlit Cloud

In your Streamlit app sidebar:

- Backend URL = https://YOUR-RENDER-URL
- Frontend source = GitHub Pages

Then click Check /api/health.

## Important limitation

A cloud backend cannot browse your local desktop folders. For real local file operations, keep backend running on your own machine. The cloud backend is best for demonstrating UI and API wiring.
