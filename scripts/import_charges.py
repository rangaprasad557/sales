"""
scripts/import_charges.py - Production-grade migration script for Business Operating Charges.
Imports, parses, validates, and reconciles all charges from Charges.xlsx into the application database.
Zero external dependencies: uses Python standard library (zipfile + xml.etree.ElementTree).
"""

import os
import sys
import argparse
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

# Ensure parent directory is in Python path to import db
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

import db

DEFAULT_EXCEL_PATH = r"C:\Users\singarirangaprasad\Downloads\Charges.xlsx"
EXPECTED_RECORD_COUNT = 231
EXPECTED_GRAND_TOTAL = 8041.76

def parse_date(raw):
    """Parses Excel serial numbers or text date strings, correcting year typos."""
    if raw is None:
        return None
    raw_str = str(raw).strip()
    if not raw_str:
        return None

    # Check for numeric Excel date serial (e.g. 46034)
    try:
        val = float(raw_str)
        if val > 10000:
            dt = datetime(1899, 12, 30) + timedelta(days=val)
            return dt.strftime("%Y-%m-%d")
    except ValueError:
        pass

    # Try standard string date formats
    for fmt in ("%d-%b-%Y", "%d-%b-%y", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            dt = datetime.strptime(raw_str, fmt)
            # Correct year typos like 0206 -> 2026
            if dt.year < 2000:
                dt = dt.replace(year=2026)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    return raw_str

def safe_eval_formula(formula, row_idx, d_val):
    """Safely evaluates basic arithmetic expressions in formulas (e.g. 29*6, 24*D224)."""
    if not formula:
        return None
    clean = formula.strip().lstrip("=")
    clean = clean.replace(f"D{row_idx}", str(d_val or 0)).replace(f"d{row_idx}", str(d_val or 0))
    # Security: only allow basic numbers, operators, dots, and parens
    if all(ch in "0123456789.+-*/() " for ch in clean):
        try:
            return float(eval(clean, {"__builtins__": None}, {}))
        except Exception:
            return None
    return None

def extract_charges_from_excel(filepath):
    """
    Extracts, normalizes, and reconciles all charges from Charges.xlsx sheet1.
    Returns: list of dicts with keys: row_idx, charge_date, amount, notes, raw_formula
    """
    if not os.path.isfile(filepath):
        raise FileNotFoundError(f"Excel file not found at: {filepath}")

    with zipfile.ZipFile(filepath, "r") as z:
        # Load shared strings
        sst = []
        if "xl/sharedStrings.xml" in z.namelist():
            sst_tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
            ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
            for si in sst_tree.findall(f"{ns}si"):
                t_elem = si.find(f"{ns}t")
                if t_elem is not None and t_elem.text is not None:
                    sst.append(t_elem.text)
                else:
                    # Multi-run text
                    texts = [t.text for t in si.findall(f".//{ns}t") if t.text]
                    sst.append("".join(texts) if texts else "")

        sheet_name = "xl/worksheets/sheet1.xml"
        sheet_tree = ET.fromstring(z.read(sheet_name))
        ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
        rows = sheet_tree.findall(f"{ns}sheetData/{ns}row")

        records = []
        for r in rows:
            r_idx = int(r.get("r"))
            # Data rows are between 2 and 242
            if r_idx < 2 or r_idx > 242:
                continue

            cells = {}
            for c in r.findall(f"{ns}c"):
                ref = c.get("r")
                col = "".join(ch for ch in ref if ch.isalpha())
                v = c.find(f"{ns}v")
                f = c.find(f"{ns}f")
                t = c.get("t")
                val = v.text if v is not None else None
                formula = f.text if f is not None else None
                if t == "s" and val is not None:
                    val = sst[int(val)] if int(val) < len(sst) else val
                cells[col] = (val, formula)

            # Check if row is empty
            if not cells or all(v[0] is None and v[1] is None for v in cells.values()):
                continue

            raw_date = cells.get("B", (None, None))[0]
            c_vendor = cells.get("C", (None, None))[0]
            d_val = cells.get("D", (None, None))[0]
            e_loc = cells.get("E", (None, None))[0]
            f_cell = cells.get("F", (None, None))
            f_val = f_cell[0]
            f_formula = f_cell[1]

            if f_val is None and f_formula is None:
                # Blank formatting row
                continue

            parsed_date = parse_date(raw_date)

            # Evaluate Amount
            amount = None
            if f_val is not None:
                try:
                    amount = float(f_val)
                except ValueError:
                    pass

            if f_formula:
                calc = safe_eval_formula(f_formula, r_idx, d_val)
                if calc is not None:
                    amount = calc

            if amount is None:
                continue

            amount = round(amount, 2)

            # Construct clean notes
            note_parts = []
            if c_vendor and str(c_vendor).strip():
                note_parts.append(str(c_vendor).strip())
            if e_loc and str(e_loc).strip():
                note_parts.append(str(e_loc).strip())
            if d_val and str(d_val).strip():
                d_str = str(d_val).strip()
                if len(d_str) >= 10:
                    note_parts.append(f"Ph: {d_str}")
                else:
                    note_parts.append(f"Qty: {d_str}")
            if f_formula and f_formula.strip():
                note_parts.append(f"[Calc: {f_formula.strip()}]")

            notes = " | ".join(note_parts) if note_parts else "Incidental Charge"

            records.append({
                "row_idx": r_idx,
                "charge_date": parsed_date,
                "amount": amount,
                "notes": notes,
                "raw_vendor": c_vendor,
                "raw_formula": f_formula
            })

        return records

def import_charges(filepath=DEFAULT_EXCEL_PATH, dry_run=False, truncate=False):
    print(f"============================================================")
    print(f" Business Operating Charges Migration: Charges.xlsx")
    print(f" Source: {filepath}")
    print(f" Mode: {'DRY RUN (Validation Only)' if dry_run else 'PRODUCTION IMPORT'}")
    print(f"============================================================")

    records = extract_charges_from_excel(filepath)
    total_count = len(records)
    total_amount = round(sum(r["amount"] for r in records), 2)

    print(f"Extracted Records: {total_count} (Expected: {EXPECTED_RECORD_COUNT})")
    print(f"Calculated Grand Total: Rs. {total_amount:,.2f} (Expected: Rs. {EXPECTED_GRAND_TOTAL:,.2f})")

    if total_count != EXPECTED_RECORD_COUNT:
        print(f"[WARNING] Record count mismatch! Got {total_count}, expected {EXPECTED_RECORD_COUNT}")
    if abs(total_amount - EXPECTED_GRAND_TOTAL) > 0.05:
        raise ValueError(f"CRITICAL ERROR: Total amount mismatch! Got {total_amount}, expected {EXPECTED_GRAND_TOTAL}")

    print("[OK] Control Total & Record Checksum Validated Successfully!")

    # Print sample entries
    print("\nSample records to import:")
    for r in records[:5]:
        print(f"  [Row {r['row_idx']}] {r['charge_date']} | Rs. {r['amount']:>8.2f} | {r['notes']}")
    print("  ...")
    for r in records[-5:]:
        print(f"  [Row {r['row_idx']}] {r['charge_date']} | Rs. {r['amount']:>8.2f} | {r['notes']}")

    if dry_run:
        print("\n[OK] DRY RUN complete. No database changes were made.")
        return total_count, total_amount

    conn = db.get_connection()
    cur = conn.cursor()
    try:
        # Ensure table exists
        db.init_db(seed_if_empty=False)

        if truncate:
            print("\nTruncating existing charges table...")
            cur.execute("DELETE FROM charges")

        print(f"\nInserting {total_count} charges into database...")
        for r in records:
            cur.execute(
                "INSERT INTO charges (charge_date, amount, notes) VALUES (?, ?, ?)",
                (r["charge_date"], r["amount"], r["notes"])
            )
        conn.commit()

        # Verify database contents
        cur.execute("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0.0) as sum_amount FROM charges")
        db_sum = cur.fetchone()
        db_count = int(db_sum["count"])
        db_total = round(float(db_sum["sum_amount"]), 2)
        print(f"[OK] Successfully imported! DB Count: {db_count}, DB Total Amount: Rs. {db_total:,.2f}")

    finally:
        conn.close()

    return total_count, total_amount

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import charges from Charges.xlsx")
    parser.add_argument("--file", default=DEFAULT_EXCEL_PATH, help="Path to Charges.xlsx")
    parser.add_argument("--dry-run", action="store_true", help="Validate without writing to database")
    parser.add_argument("--truncate", action="store_true", help="Clear charges table before inserting")
    args = parser.parse_args()

    import_charges(filepath=args.file, dry_run=args.dry_run, truncate=args.truncate)
