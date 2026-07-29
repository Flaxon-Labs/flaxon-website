# Contributing to Flaxon

Thank you for your interest in contributing to Flaxon! 🎉

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Report a Bug

1. Check if the bug is already reported in [Issues](https://github.com/flaxon/flaxon/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (OS, Python version, Flaxon version)

### Suggest a Feature

1. Check if the feature is already requested
2. Create a feature request with:
   - Clear description of the feature
   - Why it's valuable
   - Potential implementation approach

### Submit Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with tests
4. Run the test suite: `pytest`
5. Run linting: `ruff check .`
6. Run type checking: `mypy .`
7. Commit with clear messages
8. Push and open a Pull Request

## Development Setup

```bash
# Clone the repository
git clone https://github.com/flaxon/flaxon.git
cd flaxon

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install in development mode with all extras
pip install -e ".[standard,dev]"

# Run tests
pytest

# Run tests with coverage
pytest --cov=flaxon --cov-report=term-missing

# Run linting
ruff check .

# Run type checking
mypy .

Code Style
Follow PEP 8

Use type hints for all function signatures

Write docstrings for public APIs

Keep functions focused and small

Prefer async/await for I/O operations

Linting Configuration
Flaxon uses ruff for linting and formatting. Configuration is in ruff.toml.

Type Checking
Flaxon uses mypy for static type checking. Configuration is in mypy.ini.

Testing
Unit tests in tests/unit/ — Test individual components

Integration tests in tests/integration/ — Test component interactions

Security tests in tests/security/ — Test security properties

Performance tests in tests/performance/ — Benchmark performance

Writing Tests
python
# tests/unit/test_example.py
from flaxon import Flaxon
from flaxon.testing import TestClient

def test_route():
    app = Flaxon("test")

    @app.get("/")
    async def home():
        return {"message": "hello"}

    response = TestClient(app).get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "hello"}
Pull Request Process
Update the CHANGELOG.md with your changes

Update documentation if necessary

Ensure all tests pass

Get at least one maintainer review

Squash commits before merging

Release Process
Update version in src/flaxon/__init__.py

Update CHANGELOG.md

Tag the release: git tag v0.1.0

Push tags: git push --tags

GitHub Actions will build and publish to PyPI

Maintainers
Aldane Hutchinson (@aldane)

Questions?
Open an issue for bugs or feature requests

Join our Discord for community support

Email: maintainers@flaxon.dev

Thank you for contributing to Flaxon! 🚀