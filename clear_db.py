"""
clear_db.py - Utility to clear all data from Apex Multi-Batch Inventory & Sales Database.

Usage:
    python clear_db.py
"""

import db

if __name__ == "__main__":
    print("Clearing all data from Apex Inventory & Sales Database...")
    db.init_db(seed_if_empty=False)
    db.clear_all_data()
    print("Done! You can now start adding fresh products, customers, procurements, and sales.")
