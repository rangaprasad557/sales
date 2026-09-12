# PR-016: Next.js Proxy Fix, Master Form Save Resiliency & Procurement Intake Integration

## Executive Summary
This Pull Request resolves critical form submission issues where master entity forms (Catalogue, Category, Customer, Supplier) were unresponsive, and enhances the Stock Intake (Procurement) screen to integrate directly with live Catalogue and Supplier data.

---

## 1. Problem Identification & Root Causes
1. **Next.js Backend Proxy Mismatch (
ext.config.mjs)**:
   - Next.js development server on port 3000 was rewriting \/api/:path*\ to \http://localhost:4000/api/:path*\.
   - The active Python backend runs on **Port 8000**. Port 4000 was inactive, causing all frontend browser API requests to return ŀ Internal Server Error (ECONNREFUSED)\.
2. **Missing Form Submission Feedback**:
   - Save buttons across Catalogue, Categories, Customers, and Suppliers lacked loading indicators and disabled states during network requests.
   - Strict manual input requirements (such as SKU and Category Code) lacked fallback generation, causing forms to fail silently when users omitted optional fields.
3. **Procurement Intake Screen Disconnect**:
   - The Record Intake drawer had plain text inputs for Product and Supplier rather than pulling from registered catalogue products and suppliers.
   - Batch Code was treated as a required input rather than optional/auto-generated.
   - Form submission only appended to in-memory state without persisting to \POST /api/procurements\.

---

## 2. Scope of Modifications

### 2.1 Proxy Target Fix (\rontend/next.config.mjs\)
- Updated API rewrite destination to dynamically target \http://localhost:\/api/:path*\ where \ackendPort\ defaults to **8000** (or \process.env.BACKEND_PORT\).

### 2.2 Master Form Resiliency & Visual Feedback
- **Product Catalogue (\rontend/app/catalogue/page.tsx\)**:
  - Added \isSubmitting\ state to disable the save button during network calls.
  - Auto-generated SKU fallback from product name if SKU is left blank.
  - Added toast notifications on validation errors.
- **Categories (\rontend/app/categories/page.tsx\)**:
  - Added \isSubmitting\ state and loading indicator.
  - Auto-derived category code fallback from category name.
- **Customers (\rontend/app/customers/page.tsx\)**:
  - Added \isSubmitting\ state, validation notifications, and button loading state.
- **Suppliers (\rontend/app/suppliers/page.tsx\)**:
  - Added \isSubmitting\ state, validation notifications, and button loading state.

### 2.3 Procurement Intake Direct Integration (\rontend/app/procurement/page.tsx\)
- **Product Item Selection**: Replaced free-text input with a \<select>\ dropdown populated directly from Catalogue (\GET /api/products\).
- **Supplier Selection**: Replaced free-text input with a \<select>\ dropdown populated directly from Suppliers (\GET /api/suppliers\). Selecting a supplier auto-selects their procurement channel.
- **Batch Code Optional**: Clarified batch code as optional (\Batch Code (not required - auto-generated if left blank)\). If left blank, the backend auto-generates \LOT-<id>-<num>\.
- **Database Persistence**: Submitting intake now executes \POST /api/procurements\, creating real inventory lots and updating product stock valuations.
- **Clean Empty State**: Added an accessible empty state with icon and descriptive text when 0 intakes exist.

### 2.4 Point of Sale Finalization (\rontend/app/sales/page.tsx\)
- Submitting sales checkout now persists the order to \POST /api/sales\, deducting inventory lots in the database and triggering catalogue stock refresh.

---

## 3. Verification & Quality Gate Evidence
- **Frontend Unit & Integration Tests (Jest)**: 116/116 passed (100%).
- **Backend End-to-End Suite (\	est_suite.py\)**: 40/40 passed (100%).
- **TypeScript Type Check (px tsc --noEmit\)**: 0 compile/type errors.
- **Live HTTP Flow Verification**:
  - Categories: POST / PUT / DELETE verified (200/201).
  - Products: POST / PUT / DELETE verified (200/201).
  - Customers: POST / PUT / DELETE verified (200/201).
  - Suppliers: POST / PUT / DELETE verified (200/201).
  - Procurement Intake: POST /api/procurements verified with lot creation and stock update.
