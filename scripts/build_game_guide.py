"""Publish every authored capstone file inside the complete tutorial."""

from pathlib import Path


def build_game_guide(root: Path) -> None:
    project = root / "examples/guessing-game"
    template = root / "content/tutorials/guessing-game.template.md"
    ignored = {".flaxon", "__pycache__", ".pytest_cache", ".venv", "data", "backups"}
    languages = {".py": "python", ".ts": "typescript", ".html": "html", ".yaml": "yaml"}
    sections = []

    for file in sorted(project.rglob("*")):
        if not file.is_file() or file.name == "README.md":
            continue
        if any(part in ignored for part in file.relative_to(project).parts):
            continue
        name = file.relative_to(project).as_posix()
        source = file.read_text().rstrip()
        language = languages.get(file.suffix, "text")
        note = "Create this as an empty file.\n\n" if not source else ""
        sections.append(f"### `{name}`\n\n{note}```{language}\n{source}\n```\n")

    guide = template.read_text().replace("<!-- PROJECT_FILES -->", "\n".join(sections))
    (root / "content/tutorials/guessing-game.md").write_text(guide)
    (project / "README.md").write_text(guide)


if __name__ == "__main__":
    build_game_guide(Path(__file__).resolve().parents[1])
