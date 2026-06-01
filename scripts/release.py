#!/usr/bin/env python3
"""
Release script for GitFlow Desktop.

Automates version bump, git tag, and push sequence across three version files:
- src-tauri/Cargo.toml
- src-tauri/tauri.conf.json
- apps/desktop/package.json
"""

import json
import re
import subprocess
import sys
from pathlib import Path


def run_cmd(cmd, check=True):
    """Run a shell command and return output."""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"Error: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    return result.stdout.strip(), result.returncode


def check_working_tree_clean():
    """Abort if working tree has uncommitted changes."""
    output, _ = run_cmd("git status --porcelain", check=False)
    if output:
        print("Error: Working tree has uncommitted changes:", file=sys.stderr)
        for line in output.split("\n"):
            print(f"  {line}", file=sys.stderr)
        sys.exit(1)


def check_on_main():
    """Warn if not on main branch; prompt for confirmation."""
    branch, _ = run_cmd("git rev-parse --abbrev-ref HEAD", check=False)
    if branch != "main":
        print(f"Warning: Current branch is '{branch}', not 'main'", file=sys.stderr)
        response = input("Continue anyway? (y/N): ").strip().lower()
        if response != "y":
            print("Aborted.", file=sys.stderr)
            sys.exit(1)


def read_current_version():
    """Read current version from Cargo.toml."""
    cargo_path = Path("src-tauri/Cargo.toml")
    with open(cargo_path) as f:
        content = f.read()
    match = re.search(r'version\s*=\s*"([^"]+)"', content)
    if not match:
        print("Error: Could not find version in Cargo.toml", file=sys.stderr)
        sys.exit(1)
    return match.group(1)


def validate_semver(version):
    """Validate version is valid semver (MAJOR.MINOR.PATCH)."""
    if not re.match(r"^\d+\.\d+\.\d+$", version):
        print(f"Error: Invalid semver format: {version}", file=sys.stderr)
        sys.exit(1)


def parse_version(version):
    """Parse semver string into (major, minor, patch) tuple."""
    parts = version.split(".")
    return tuple(int(p) for p in parts)


def prompt_new_version(current):
    """Prompt user for new version; validate it's greater than current."""
    current_tuple = parse_version(current)
    while True:
        new_version = input(f"New version (current: {current}): ").strip()
        validate_semver(new_version)
        new_tuple = parse_version(new_version)
        if new_tuple > current_tuple:
            return new_version
        print(f"Error: New version must be greater than {current}", file=sys.stderr)


def check_tag_not_exists(version):
    """Abort if tag v{version} already exists."""
    tag = f"v{version}"
    _, returncode = run_cmd(f"git rev-parse {tag}", check=False)
    if returncode == 0:
        print(f"Error: Tag {tag} already exists", file=sys.stderr)
        sys.exit(1)


def update_cargo_toml(version):
    """Update version in src-tauri/Cargo.toml."""
    cargo_path = Path("src-tauri/Cargo.toml")
    with open(cargo_path) as f:
        content = f.read()
    content = re.sub(
        r'(version\s*=\s*)"[^"]+"',
        rf'\1"{version}"',
        content,
        count=1
    )
    with open(cargo_path, "w") as f:
        f.write(content)


def update_tauri_conf(version):
    """Update version in src-tauri/tauri.conf.json."""
    conf_path = Path("src-tauri/tauri.conf.json")
    with open(conf_path) as f:
        data = json.load(f)
    data["version"] = version
    with open(conf_path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def update_package_json(version):
    """Update version in apps/desktop/package.json."""
    pkg_path = Path("apps/desktop/package.json")
    with open(pkg_path) as f:
        data = json.load(f)
    data["version"] = version
    with open(pkg_path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def main():
    """Main release flow."""
    check_working_tree_clean()
    check_on_main()

    current_version = read_current_version()
    print(f"Current version: {current_version}")

    new_version = prompt_new_version(current_version)
    print(f"New version: {new_version}")

    check_tag_not_exists(new_version)

    print("Updating version files...")
    update_cargo_toml(new_version)
    update_tauri_conf(new_version)
    update_package_json(new_version)

    print("Staging files...")
    run_cmd("git add src-tauri/Cargo.toml src-tauri/tauri.conf.json apps/desktop/package.json")

    print(f"Committing...")
    run_cmd(f'git commit -m "chore(release): v{new_version}"')

    print(f"Tagging v{new_version}...")
    run_cmd(f"git tag v{new_version}")

    print("Pushing to origin...")
    run_cmd("git push origin main --tags")

    print(f"✓ Release v{new_version} complete!")


if __name__ == "__main__":
    main()
