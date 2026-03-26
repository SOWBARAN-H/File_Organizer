from __future__ import annotations

import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, ttk

from downloads_organizer import CATEGORY_FOLDERS, DOWNLOADS_DIR, organize_files, restore_files


class DownloadsOrganizerUI:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Downloads Organizer")
        self.root.geometry("820x560")
        self.root.minsize(720, 480)

        self.dry_run = tk.BooleanVar(value=False)
        self.status_text = tk.StringVar(value="Ready")
        self.target_dir = tk.StringVar(value=str(DOWNLOADS_DIR))

        self._build_layout()
        self.refresh_summary()

    def _build_layout(self) -> None:
        main_frame = ttk.Frame(self.root, padding=12)
        main_frame.pack(fill=tk.BOTH, expand=True)

        controls = ttk.Frame(main_frame)
        controls.pack(fill=tk.X)

        folder_row = ttk.Frame(main_frame)
        folder_row.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(folder_row, text="Target folder:").pack(side=tk.LEFT)
        self.folder_entry = ttk.Entry(folder_row, textvariable=self.target_dir)
        self.folder_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(8, 8))
        ttk.Button(folder_row, text="Browse", command=self.choose_folder).pack(side=tk.LEFT)

        ttk.Checkbutton(
            controls,
            text="Dry run",
            variable=self.dry_run,
        ).pack(side=tk.LEFT)

        self.organize_btn = ttk.Button(
            controls,
            text="Organize Downloads",
            command=self.run_organize,
        )
        self.organize_btn.pack(side=tk.LEFT, padx=(10, 6))

        self.restore_btn = ttk.Button(
            controls,
            text="Restore Files",
            command=self.run_restore,
        )
        self.restore_btn.pack(side=tk.LEFT, padx=6)

        ttk.Button(
            controls,
            text="Refresh Summary",
            command=self.refresh_summary,
        ).pack(side=tk.LEFT, padx=6)

        ttk.Button(
            controls,
            text="Clear Log",
            command=self.clear_log,
        ).pack(side=tk.LEFT, padx=6)

        summary_box = ttk.LabelFrame(main_frame, text="Downloads Summary", padding=10)
        summary_box.pack(fill=tk.X, pady=(12, 8))

        self.summary_label = ttk.Label(summary_box, justify=tk.LEFT)
        self.summary_label.pack(anchor=tk.W)

        log_box = ttk.LabelFrame(main_frame, text="Activity Log", padding=10)
        log_box.pack(fill=tk.BOTH, expand=True)

        self.log_widget = tk.Text(log_box, wrap=tk.WORD, height=16)
        self.log_widget.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.log_widget.configure(state=tk.DISABLED)

        scrollbar = ttk.Scrollbar(log_box, orient=tk.VERTICAL, command=self.log_widget.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.log_widget.configure(yscrollcommand=scrollbar.set)

        status = ttk.Label(main_frame, textvariable=self.status_text, relief=tk.SUNKEN, anchor=tk.W)
        status.pack(fill=tk.X, pady=(8, 0))

    def _append_log(self, message: str) -> None:
        self.log_widget.configure(state=tk.NORMAL)
        self.log_widget.insert(tk.END, f"{message}\n")
        self.log_widget.see(tk.END)
        self.log_widget.configure(state=tk.DISABLED)

    def log(self, message: str) -> None:
        self.root.after(0, self._append_log, message)

    def set_busy(self, is_busy: bool, message: str) -> None:
        state = tk.DISABLED if is_busy else tk.NORMAL
        self.organize_btn.configure(state=state)
        self.restore_btn.configure(state=state)
        self.folder_entry.configure(state="disabled" if is_busy else "normal")
        self.status_text.set(message)

    def selected_path(self) -> Path:
        return Path(self.target_dir.get()).expanduser()

    def choose_folder(self) -> None:
        chosen = filedialog.askdirectory(initialdir=str(self.selected_path()))
        if chosen:
            self.target_dir.set(chosen)
            self.refresh_summary()

    def _run_in_thread(self, action_name: str, operation) -> None:
        dry_run = self.dry_run.get()
        selected_dir = self.selected_path()
        self.set_busy(True, f"Running {action_name}...")
        self.log(f"Starting {action_name} in {selected_dir} (dry_run={dry_run})")

        def worker() -> None:
            try:
                result = operation(dry_run=dry_run, logger=self.log, base_dir=selected_dir)
                self.root.after(
                    0,
                    self.status_text.set,
                    f"{action_name} finished | result: {result}",
                )
            except Exception as exc:  # Defensive guard for UI stability
                self.root.after(0, self.status_text.set, f"{action_name} failed: {exc}")
                self.log(f"Error: {exc}")
            finally:
                self.root.after(0, self.set_busy, False, "Ready")
                self.root.after(0, self.refresh_summary)

        threading.Thread(target=worker, daemon=True).start()

    def run_organize(self) -> None:
        self._run_in_thread("organize", organize_files)

    def run_restore(self) -> None:
        self._run_in_thread("restore", restore_files)

    def clear_log(self) -> None:
        self.log_widget.configure(state=tk.NORMAL)
        self.log_widget.delete("1.0", tk.END)
        self.log_widget.configure(state=tk.DISABLED)

    def refresh_summary(self) -> None:
        selected_dir = self.selected_path()
        summary_lines = [f"Target folder: {selected_dir}"]

        if not selected_dir.exists() or not selected_dir.is_dir():
            summary_lines.append("Folder does not exist.")
            self.summary_label.configure(text="\n".join(summary_lines))
            return

        root_files = sum(1 for item in selected_dir.iterdir() if item.is_file())
        summary_lines.append(f"Files in folder root: {root_files}")

        for category in CATEGORY_FOLDERS:
            category_dir = selected_dir / category
            count = 0
            if category_dir.exists() and category_dir.is_dir():
                count = sum(1 for path in category_dir.rglob("*") if path.is_file())
            summary_lines.append(f"{category}: {count}")

        self.summary_label.configure(text="\n".join(summary_lines))


def main() -> None:
    root = tk.Tk()
    DownloadsOrganizerUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
