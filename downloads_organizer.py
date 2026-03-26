import argparse
import shutil
from pathlib import Path
from typing import Callable, Dict, Optional

DOWNLOADS_DIR = Path.home() / "Downloads"
CATEGORY_FOLDERS = ("Images", "Videos", "Documents", "Audio", "Programs", "Others")

FILE_TYPES = {
    "Images": [".jpg", ".png", ".jpeg", ".gif"],
    "Videos": [".mp4", ".mkv", ".avi"],
    "Documents": [".pdf", ".docx", ".txt"],
    "Audio": [".mp3", ".wav"],
    "Programs": [".exe", ".msi"],
}

EXTENSION_TO_CATEGORY = {
    extension: category
    for category, extensions in FILE_TYPES.items()
    for extension in extensions
}


Logger = Callable[[str], None]


def _emit(logger: Optional[Logger], message: str) -> None:
    if logger:
        logger(message)
    else:
        print(message)


def resolve_target_dir(base_dir: Optional[Path]) -> Path:
    return base_dir if base_dir is not None else DOWNLOADS_DIR


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Organize or restore files in Downloads by category"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview file moves without changing anything",
    )
    parser.add_argument(
        "--restore",
        action="store_true",
        help="Move files from category folders back to Downloads",
    )
    return parser.parse_args()


def unique_destination(destination_dir: Path, original_name: str) -> Path:
    """Return a destination path that avoids overwriting existing files."""
    candidate = destination_dir / original_name
    if not candidate.exists():
        return candidate

    source = Path(original_name)
    stem = source.stem
    suffix = source.suffix
    counter = 1

    while True:
        candidate = destination_dir / f"{stem}_{counter}{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


def organize_files(
    dry_run: bool = False,
    logger: Optional[Logger] = None,
    base_dir: Optional[Path] = None,
) -> Dict[str, int]:
    """Move files from Downloads root into category folders."""
    target_dir = resolve_target_dir(base_dir)

    if not target_dir.exists() or not target_dir.is_dir():
        _emit(logger, f"Folder not found: {target_dir}")
        return {"moved": 0, "skipped": 0, "errors": 1}

    moved_count = 0
    skipped_count = 0
    error_count = 0

    for item in sorted(target_dir.iterdir(), key=lambda current: current.name.lower()):
        # Organize only files that are directly in the Downloads root.
        if not item.is_file():
            continue

        try:
            category = EXTENSION_TO_CATEGORY.get(item.suffix.lower(), "Others")
            destination_dir = target_dir / category
            destination = destination_dir / item.name

            if destination.exists():
                skipped_count += 1
                _emit(logger, f"Skipped {item.name}: {destination} already exists")
                continue

            if dry_run:
                _emit(logger, f"[DRY-RUN] {item.name} -> {category}/{item.name}")
                moved_count += 1
                continue

            destination_dir.mkdir(parents=True, exist_ok=True)
            shutil.move(str(item), str(destination))
            moved_count += 1
            _emit(logger, f"Moved {item.name} -> {category}/{item.name}")
        except OSError as exc:
            error_count += 1
            _emit(logger, f"Error processing {item.name}: {exc}")

    action = "Preview complete" if dry_run else "Organization complete"
    _emit(
        logger,
        f"{action}. Files processed: {moved_count}, skipped: {skipped_count}, errors: {error_count}",
    )
    return {"moved": moved_count, "skipped": skipped_count, "errors": error_count}


def remove_empty_directories(root: Path, logger: Optional[Logger] = None) -> None:
    """Remove empty directories in deepest-first order under root."""
    directories = [path for path in root.rglob("*") if path.is_dir()]
    directories.sort(key=lambda path: len(path.parts), reverse=True)

    for directory in directories:
        try:
            directory.rmdir()
            _emit(logger, f"Removed empty folder: {directory}")
        except OSError:
            pass


def restore_files(
    dry_run: bool = False,
    logger: Optional[Logger] = None,
    base_dir: Optional[Path] = None,
) -> Dict[str, int]:
    """Move files from category folders back into Downloads root."""
    target_dir = resolve_target_dir(base_dir)

    if not target_dir.exists() or not target_dir.is_dir():
        _emit(logger, f"Folder not found: {target_dir}")
        return {"restored": 0, "errors": 1}

    restored_count = 0
    error_count = 0

    for category in CATEGORY_FOLDERS:
        category_dir = target_dir / category
        if not category_dir.exists() or not category_dir.is_dir():
            continue

        # Recursively restore files from nested folders inside each category.
        for source_file in sorted(category_dir.rglob("*"), key=lambda path: (len(path.parts), path.name.lower())):
            if not source_file.is_file():
                continue

            try:
                destination = unique_destination(target_dir, source_file.name)

                if dry_run:
                    _emit(logger, f"[DRY-RUN] Restored: {source_file.name} -> {destination.name}")
                    restored_count += 1
                    continue

                shutil.move(str(source_file), str(destination))
                restored_count += 1
                _emit(logger, f"Restored: {source_file.name} -> {destination.name}")
            except OSError as exc:
                error_count += 1
                _emit(logger, f"Error restoring {source_file}: {exc}")

        if not dry_run:
            remove_empty_directories(category_dir, logger=logger)
            try:
                category_dir.rmdir()
                _emit(logger, f"Removed empty folder: {category_dir}")
            except OSError:
                pass

    action = "Restore preview complete" if dry_run else "Restore complete"
    _emit(logger, f"{action}. Files restored: {restored_count}, errors: {error_count}")
    return {"restored": restored_count, "errors": error_count}


def main() -> None:
    args = parse_args()
    if args.restore:
        restore_files(dry_run=args.dry_run)
    else:
        organize_files(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
