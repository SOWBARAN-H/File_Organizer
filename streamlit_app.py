import os

import requests
import streamlit as st

st.set_page_config(page_title="File Organizer Showcase", layout="wide")

st.title("File Organizer Showcase")
st.caption("Demo wrapper for your existing HTML/CSS/JS UI and Node backend")

with st.sidebar:
    st.header("Connections")
    backend_url = st.text_input("Backend URL", value=os.getenv("BACKEND_URL", "http://127.0.0.1:4000"))
    frontend_mode = st.radio("Frontend source", ["Local server", "GitHub Pages"], index=0)

    default_local_ui = os.getenv("LOCAL_UI_URL", "http://127.0.0.1:5500")
    default_pages_ui = os.getenv("PAGES_UI_URL", "https://sowbaran-h.github.io/File_Organizer/")
    ui_url = st.text_input(
        "UI URL",
        value=default_local_ui if frontend_mode == "Local server" else default_pages_ui
    )

    st.markdown("### How to run")
    st.write("1. Start backend in web-organizer-app")
    st.write("2. Start your static UI server")
    st.write("3. Run Streamlit app")

left, right = st.columns([1, 3], gap="large")

with left:
    st.subheader("Backend Health")
    if st.button("Check /api/health", use_container_width=True):
        try:
            response = requests.get(f"{backend_url}/api/health", timeout=6)
            if response.ok:
                st.success("Backend is running")
                st.json(response.json())
            else:
                st.error(f"Backend error: HTTP {response.status_code}")
        except requests.RequestException as exc:
            st.error(f"Cannot reach backend: {exc}")

    st.subheader("Demo Tips")
    st.write("- Use Preview before Organize")
    st.write("- Keep backend running while testing")
    st.write("- If UI does not refresh, hard reload browser")

with right:
    st.subheader("Live UI")
    st.components.v1.iframe(ui_url, height=900, scrolling=True)
