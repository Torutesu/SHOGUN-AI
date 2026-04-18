#!/usr/bin/env python3
"""
Static guard for SHOGUN Hi-Fi action wiring.

Checks:
1) Every action key used in runtime calls exists in action-registry.
2) action-map.md lists all registry keys.
3) Simple signal for button tags missing onClick in JSX files.
"""

from __future__ import annotations

import pathlib
import re
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]

REGISTRY_FILE = ROOT / "lib" / "action-registry.js"
ACTION_MAP_FILE = ROOT / "action-map.md"
JSX_FILES = sorted(ROOT.glob("*.jsx"))


def read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


def extract_registry_keys(content: str) -> set[str]:
    return set(re.findall(r'register\("([^"]+)"', content))


def extract_runtime_keys(content: str) -> set[str]:
    keys = set(re.findall(r"runRuntimeAction[A-Za-z]*\(\s*'([^']+)'", content))
    keys.update(re.findall(r"executeAction\(\s*'([^']+)'", content))
    keys.update(re.findall(r"requestWriteAction\(\s*'([^']+)'", content))
    keys.update(re.findall(r"requestWriteAction[A-Za-z]*\(\s*'([^']+)'", content))
    return keys


def extract_action_map_keys(content: str) -> set[str]:
    return set(re.findall(r"- `([^`]+)`", content))


def detect_buttons_without_onclick(content: str) -> list[tuple[int, str]]:
    misses: list[tuple[int, str]] = []
    idx = 0
    while True:
        start = content.find("<button", idx)
        if start == -1:
            break
        i = start
        in_quote: str | None = None
        brace_depth = 0
        while i < len(content):
            ch = content[i]
            if in_quote:
                if ch == in_quote and content[i - 1] != "\\":
                    in_quote = None
            else:
                if ch in ("'", '"'):
                    in_quote = ch
                elif ch == "{":
                    brace_depth += 1
                elif ch == "}":
                    brace_depth = max(0, brace_depth - 1)
                elif ch == ">" and brace_depth == 0:
                    break
            i += 1
        tag = content[start:i + 1]
        if "onClick=" not in tag and "disabled" not in tag:
            line = content.count("\n", 0, start) + 1
            compact = " ".join(tag.split())
            misses.append((line, compact[:180]))
        idx = i + 1
    return misses


def main() -> int:
    registry_content = read(REGISTRY_FILE)
    action_map_content = read(ACTION_MAP_FILE)

    registry_keys = extract_registry_keys(registry_content)
    runtime_keys: set[str] = set()
    missing_onclick: list[tuple[str, int, str]] = []

    for jsx in JSX_FILES:
        content = read(jsx)
        runtime_keys.update(extract_runtime_keys(content))
        for line, snippet in detect_buttons_without_onclick(content):
            missing_onclick.append((jsx.name, line, snippet))

    mapped_keys = extract_action_map_keys(action_map_content)

    unknown_runtime = sorted(runtime_keys - registry_keys)
    unmapped_registry = sorted(k for k in registry_keys if k not in mapped_keys)

    has_error = False

    print("== SHOGUN action wiring check ==")
    print(f"registry keys: {len(registry_keys)}")
    print(f"runtime keys:  {len(runtime_keys)}")

    if unknown_runtime:
        has_error = True
        print("\n[ERROR] Runtime keys missing in registry:")
        for key in unknown_runtime:
            print(f"  - {key}")

    if unmapped_registry:
        has_error = True
        print("\n[ERROR] Registry keys missing in action-map.md:")
        for key in unmapped_registry:
            print(f"  - {key}")

    # Missing onClick is warning-only because there are intentional display-only buttons.
    if missing_onclick:
        print("\n[WARN] Button tags without onClick (review if intentional):")
        for file_name, line, snippet in missing_onclick:
            print(f"  - {file_name}:{line} :: {snippet}")

    if not has_error:
        print("\nPASS: registry/runtime/action-map are consistent.")
    return 1 if has_error else 0


if __name__ == "__main__":
    sys.exit(main())
