"""成分表(第2章データ)のExcelから foods.json を作る。標準ライブラリのみ使用。

使い方: python build_foods.py  -> ../foods.json
"""
import json
import re
import zipfile
import xml.etree.ElementTree as ET

SRC = "mext_table2.xlsx"
OUT = "../foods.json"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

# Excelの列 -> JSONのキー (すべて可食部100gあたり)
COLS = {"G": "kcal", "J": "p", "M": "f", "U": "c", "BI": "salt"}


def num(text):
    """'(11.3)'は括弧を外して数値化。'Tr'・'-'・空は0。"""
    t = (text or "").strip().strip("()")
    try:
        return round(float(t), 2)
    except ValueError:
        return 0.0


z = zipfile.ZipFile(SRC)
strings = [
    "".join(t.text or "" for t in si.iter("{%s}t" % NS["m"]))
    for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS)
]
rows = (
    ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    .find("m:sheetData", NS)
    .findall("m:row", NS)
)


def cells(row):
    out = {}
    for c in row.findall("m:c", NS):
        v = c.find("m:v", NS)
        if v is None:
            continue
        out[re.match(r"[A-Z]+", c.get("r")).group()] = (
            strings[int(v.text)] if c.get("t") == "s" else v.text
        )
    return out


foods = []
for row in rows:
    c = cells(row)
    # 食品番号は5桁の数字。ヘッダー行などは読み飛ばす
    if not re.fullmatch(r"\d{5}", c.get("B", "")):
        continue
    item = {"id": c["B"], "name": c["D"]}
    for col, key in COLS.items():
        item[key] = num(c.get(col))
    foods.append(item)

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(foods, f, ensure_ascii=False, separators=(",", ":"))
print(len(foods), "foods")
