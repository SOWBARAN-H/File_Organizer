const folderPathInput = document.getElementById("folderPath");
const browseBtn = document.getElementById("browseBtn");
const previewBtn = document.getElementById("previewBtn");
const organizeBtn = document.getElementById("organizeBtn");
const restoreBtn = document.getElementById("restoreBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const dropZone = document.getElementById("dropZone");
const folderModal = document.getElementById("folderModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const rootsBtn = document.getElementById("rootsBtn");
const upBtn = document.getElementById("upBtn");
const modalPath = document.getElementById("modalPath");
const folderList = document.getElementById("folderList");
const selectCurrentBtn = document.getElementById("selectCurrentBtn");

const statusBadge = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");
const progressBar = document.getElementById("progressBar");
const previewMeta = document.getElementById("previewMeta");
const previewList = document.getElementById("previewList");

const actionButtons = [previewBtn, organizeBtn, restoreBtn, undoBtn, redoBtn];
const folderState = {
  currentPath: null,
  parentPath: null,
  roots: []
};

function setBusy(isBusy) {
  actionButtons.forEach((button) => {
    button.disabled = isBusy;
  });
}

function setStatus(kind, message) {
  statusBadge.className = "badge";

  if (kind === "loading") {
    statusBadge.classList.add("loading");
    statusBadge.textContent = "Working";
  } else if (kind === "success") {
    statusBadge.classList.add("success");
    statusBadge.textContent = "Completed";
  } else if (kind === "error") {
    statusBadge.classList.add("error");
    statusBadge.textContent = "Error";
  } else {
    statusBadge.textContent = "Idle";
  }

  statusText.textContent = message;
}

function animateProgressStart() {
  progressBar.style.width = "18%";

  let current = 18;
  const timer = setInterval(() => {
    current = Math.min(current + 6, 90);
    progressBar.style.width = `${current}%`;

    if (current >= 90) {
      clearInterval(timer);
    }
  }, 200);

  return timer;
}

function finishProgress(timer, success) {
  clearInterval(timer);
  progressBar.style.width = success ? "100%" : "12%";

  if (success) {
    setTimeout(() => {
      progressBar.style.width = "0";
    }, 600);
  }
}

function getFolderPath() {
  return folderPathInput.value.trim();
}

function ensureFolderPath() {
  const folderPath = getFolderPath();

  if (!folderPath) {
    throw new Error("Please enter a folder path before continuing.");
  }

  return folderPath;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function openModal() {
  folderModal.classList.add("open");
  folderModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  folderModal.classList.remove("open");
  folderModal.setAttribute("aria-hidden", "true");
}

async function loadFolderList(targetPath = null) {
  const result = await postJson("/api/folders/list", { path: targetPath });
  const data = result.data;

  folderState.currentPath = data.currentPath;
  folderState.parentPath = data.parentPath;
  folderState.roots = data.roots || [];

  renderFolderList(data.directories || []);
  modalPath.textContent = folderState.currentPath || "Browse Roots";
  upBtn.disabled = !folderState.parentPath;
  selectCurrentBtn.disabled = !folderState.currentPath;
}

function renderFolderList(directories) {
  folderList.innerHTML = "";

  if (!directories.length) {
    const empty = document.createElement("button");
    empty.className = "folder-item empty";
    empty.textContent = "No subfolders available";
    empty.disabled = true;
    folderList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  directories.forEach((dir) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "folder-item";
    item.textContent = `Folder: ${dir.name}`;
    item.addEventListener("click", () => {
      loadFolderList(dir.path).catch((error) => setStatus("error", error.message));
    });
    fragment.appendChild(item);
  });

  folderList.appendChild(fragment);
}

function renderPreview(items) {
  previewList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = "No files found in folder root to organize.";
    previewList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "preview-item";

    const title = document.createElement("strong");
    title.textContent = `${item.category}: ${item.from.split(/[\\/]/).pop()}`;

    const from = document.createElement("small");
    from.textContent = `From: ${item.from}`;

    const to = document.createElement("small");
    to.textContent = `To: ${item.to}`;

    card.appendChild(title);
    card.appendChild(from);
    card.appendChild(to);

    fragment.appendChild(card);
  });

  previewList.appendChild(fragment);
}

async function runAction(action, endpoint) {
  let timer;

  try {
    const folderPath = ensureFolderPath();
    setBusy(true);
    setStatus("loading", `${action} in progress...`);
    timer = animateProgressStart();

    const result = await postJson(endpoint, { folderPath });

    finishProgress(timer, true);
    setStatus("success", result.message);

    if (action === "Preview") {
      const previewData = result.data;
      previewMeta.textContent = previewData.truncated
        ? `Showing ${previewData.preview.length} of ${previewData.total} files`
        : `Found ${previewData.total} file(s)`;
      renderPreview(previewData.preview);
    } else {
      await refreshPreviewSilently();
    }
  } catch (error) {
    if (timer) {
      finishProgress(timer, false);
    }
    setStatus("error", error.message);
  } finally {
    setBusy(false);
  }
}

async function refreshPreviewSilently() {
  try {
    const folderPath = getFolderPath();
    if (!folderPath) {
      previewMeta.textContent = "No preview yet";
      previewList.innerHTML = "";
      return;
    }

    const result = await postJson("/api/preview", { folderPath });
    const previewData = result.data;

    previewMeta.textContent = previewData.truncated
      ? `Showing ${previewData.preview.length} of ${previewData.total} files`
      : `Found ${previewData.total} file(s)`;
    renderPreview(previewData.preview);
  } catch {
    // Keep silent to avoid noisy UI updates after action completion.
  }
}

previewBtn.addEventListener("click", () => runAction("Preview", "/api/preview"));
organizeBtn.addEventListener("click", () => runAction("Organize", "/api/organize"));
restoreBtn.addEventListener("click", () => runAction("Restore", "/api/restore"));
undoBtn.addEventListener("click", () => runAction("Undo", "/api/undo"));
redoBtn.addEventListener("click", () => runAction("Redo", "/api/redo"));

browseBtn.addEventListener("click", async () => {
  try {
    openModal();
    await loadFolderList(null);
  } catch (error) {
    setStatus("error", error.message);
  }
});

closeModalBtn.addEventListener("click", closeModal);

folderModal.addEventListener("click", (event) => {
  if (event.target?.dataset?.close === "true") {
    closeModal();
  }
});

rootsBtn.addEventListener("click", () => {
  loadFolderList(null).catch((error) => setStatus("error", error.message));
});

upBtn.addEventListener("click", () => {
  if (!folderState.parentPath) {
    return;
  }
  loadFolderList(folderState.parentPath).catch((error) => setStatus("error", error.message));
});

selectCurrentBtn.addEventListener("click", () => {
  if (!folderState.currentPath) {
    return;
  }

  folderPathInput.value = folderState.currentPath;
  closeModal();
  setStatus("success", "Folder selected from browser.");
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
  });
});

dropZone.addEventListener("drop", (event) => {
  const transferItems = Array.from(event.dataTransfer.items || []);

  for (const item of transferItems) {
    const entry = item.webkitGetAsEntry?.();
    if (entry && entry.isDirectory) {
      const droppedName = entry.fullPath?.replace(/^\//, "") || entry.name;
      if (droppedName) {
        folderPathInput.value = folderPathInput.value || droppedName;
        setStatus("idle", "Folder detected from drop. Update full path if needed.");
      }
      return;
    }
  }

  setStatus("error", "Could not detect a folder path from dropped item.");
});
