from __future__ import annotations

import csv
import json
import shutil
import sys
from pathlib import Path

from openpyxl import Workbook

HEADERS = ["擂台", "角色", "IP", "得票数", "结果", "头像"]
ROOT = Path(__file__).resolve().parents[1]
PARTICIPANT_MAP_PATH = ROOT / "data" / "characters" / "participant-map.json"
CHARACTERS_CACHE_PATH = ROOT / ".cache" / "characters-data.json"
IP_CACHE_PATH = ROOT / ".cache" / "ip-data.json"


def load_catalogs() -> tuple[dict[str, str], dict[str, dict], dict[str, dict]]:
    participant_map = json.loads(PARTICIPANT_MAP_PATH.read_text(encoding="utf-8"))
    characters = json.loads(CHARACTERS_CACHE_PATH.read_text(encoding="utf-8"))
    ips = json.loads(IP_CACHE_PATH.read_text(encoding="utf-8"))
    return participant_map, characters, ips


def load_rows(json_path: Path) -> list[list[object]]:
    participant_map, characters, ips = load_catalogs()
    payload = json.loads(json_path.read_text(encoding="utf-8"))
    rows = []
    for match in payload.get("data", []):
        for contestant in match.get("contestants", []):
            participant_id = contestant["participantId"]
            character_id = participant_map[participant_id]
            character = characters[character_id]
            ip = ips[str(character["ip_id"])]
            rows.append([
                f"擂台{match['match']}",
                character.get("name", ""),
                ip.get("name", ""),
                contestant.get("votes", ""),
                "胜者" if contestant.get("result") == "win" else "败者",
                character.get("avatar", "") or "",
            ])
    return rows


def write_exports(json_path: Path, export_root: Path | None = None) -> None:
    rows = load_rows(json_path)
    output_base = (export_root / "stellar" / json_path.parent.name / json_path.stem) if export_root else json_path.with_suffix("")
    output_base.parent.mkdir(parents=True, exist_ok=True)
    csv_path = output_base.with_suffix(".csv")
    xlsx_path = output_base.with_suffix(".xlsx")
    json_output_path = output_base.with_suffix(".json")
    shutil.copyfile(json_path, json_output_path)

    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(HEADERS)
        writer.writerows(rows)

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "第一阶段"
    sheet.append(HEADERS)
    for row in rows:
        sheet.append(row)
    workbook.save(xlsx_path)
    print(f"已生成: {json_output_path}")
    print(f"已生成: {csv_path}")
    print(f"已生成: {xlsx_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("用法: python scripts/build-phase1-exports.py <json> [...] [--export-root <path>]")
    arguments = sys.argv[1:]
    export_root = None
    if "--export-root" in arguments:
        index = arguments.index("--export-root")
        export_root = Path(arguments[index + 1])
        arguments = arguments[:index]
    for argument in arguments:
        write_exports(Path(argument), export_root)
