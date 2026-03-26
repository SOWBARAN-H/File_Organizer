import os
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import requests
import streamlit as st


def build_iframe_url(base_url: str, backend_base: str) -> str:
    parsed = urlparse(base_url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))

    cleaned_backend = backend_base.strip().rstrip("/")
    if cleaned_backend:
        query["apiBase"] = cleaned_backend
    else:
        query.pop("apiBase", None)

    return urlunparse(parsed._replace(query=urlencode(query)))

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
        response = None
        last_error = None

        # Render free instances may need extra time to wake up from sleep.
        for timeout_seconds in (8, 25):
            try:
                response = requests.get(f"{backend_url}/api/health", timeout=timeout_seconds)
                last_error = None
                break
            except requests.Timeout as exc:
                last_error = exc
            except requests.RequestException as exc:
                last_error = exc
                break

        if response is None:
            if isinstance(last_error, requests.Timeout):
                st.error(
                    "Backend timed out. If using Render free tier, the service may be sleeping. "
                    "Wait 20-40 seconds and try again."
                )
            else:
                st.error(f"Cannot reach backend: {last_error}")
        elif not response.ok:
            st.error(f"Backend error: HTTP {response.status_code}")
        else:
            data = None
            try:
                data = response.json()
            except ValueError:
                data = None

            if isinstance(data, dict) and data.get("success") is True:
                st.success("Backend is running")
                st.json(data)
            elif data is not None:
                st.warning("Backend responded, but health payload format is unexpected.")
                st.json(data)
            else:
                st.warning("Backend responded, but /api/health did not return JSON.")

    st.subheader("Demo Tips")
    st.write("- Use Preview before Organize")
    st.write("- Keep backend running while testing")
    st.write("- If UI does not refresh, hard reload browser")

with right:
    st.subheader("Live UI")
    iframe_url = build_iframe_url(ui_url, backend_url)
    st.components.v1.iframe(iframe_url, height=900, scrolling=True)
