# Streamlit Showcase Setup

## 1) Install Python packages

```powershell
pip install -r requirements-streamlit.txt
```

## 2) Start backend (Node)

```powershell
cd web-organizer-app
npm start
```

## 3) Start frontend static server

Use your existing method (for example VS Code Live Server on port 5500), then open:

- http://127.0.0.1:5500

## 4) Run Streamlit wrapper

From project root:

```powershell
streamlit run streamlit_app.py
```

## Optional environment variables

- BACKEND_URL (default: http://127.0.0.1:4000)
- LOCAL_UI_URL (default: http://127.0.0.1:5500)
- PAGES_UI_URL (default: https://sowbaran-h.github.io/File_Organizer/)
