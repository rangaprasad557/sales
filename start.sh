#!/usr/bin/env bash
echo "===================================================================="
echo " Apex Inventory & Sales Management System"
echo " Multi-Batch Costing, Lowest-Cost Billing & Granular Profit Engine"
echo "===================================================================="
echo ""
echo "Initializing database..."
python3 db.py || python db.py

echo "Starting Web Server at http://localhost:8000 ..."
python3 server.py 8000 || python server.py 8000
