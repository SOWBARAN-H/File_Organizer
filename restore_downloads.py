import argparse
import shutil
from pathlib import Path


CATEGORY_FOLDERS = ("Images", "Videos", "Documents", "Audio", "Programs", "Others")
DOWNLOADS_DIR = Path.home() / "Downloads"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Restore files from organizer folders back to Downloads"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview restores without moving files",
    )
    return parser.parse_args()


def iter_category_files(category_dir: Path):
    for current in sorted(category_dir.rglob("*"), key=lambda path: (len(path.parts), path.name.lower())):
        if current.is_file():
            yield current


def remove_empty_directories(root: Path) -> None:
    directories = [p for p in root.rglob("*") if p.is_dir()]
    directories.sort(key=lambda p: len(p.parts), reverse=True)

    for directory in directories:
        try:
            directory.rmdir()
            print(f"Removed empty folder: {directory}")
        except OSError:
            pass


def restore_files_to_downloads(dry_run: bool = False) -> None:
    if not DOWNLOADS_DIR.exists() or not DOWNLOADS_DIR.is_dir():
        print(f"Downloads folder not found: {DOWNLOADS_DIR}")
        return

    restored_count = 0
    skipped_count = 0
    error_count = 0

    for category in CATEGORY_FOLDERS:
        category_dir = DOWNLOADS_DIR / category
        if not category_dir.exists() or not category_dir.is_dir():
            continue

        for source_file in iter_category_files(category_dir):
            destination = DOWNLOADS_DIR / source_file.name

            try:
                if destination.exists():
                    skipped_count += 1
                    print(f"Skipped: {source_file} (already exists as {destination.name})")
                    continue

                if dry_run:
                    print(f"[DRY-RUN] Restored: {source_file} -> {destination}")
                    restored_count += 1
                    continue

                shutil.move(str(source_file), str(destination))
                restored_count += 1
                print(f"Restored: {source_file} -> {destination}")
            except OSError as exc:
                error_count += 1
                print(f"Error restoring {source_file}: {exc}")

        if not dry_run:
            remove_empty_directories(category_dir)
        try:
            if not dry_run:
                category_dir.rmdir()
                print(f"Removed empty folder: {category_dir}")
        except OSError:
            pass

    action = "Preview complete" if dry_run else "Restore complete"
    print(
        f"{action}. Files restored: {restored_count}, skipped: {skipped_count}, errors: {error_count}"
    )


if __name__ == "__main__":
    args = parse_args()
    restore_files_to_downloads(dry_run=args.dry_run)
