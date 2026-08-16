# SuperDates - Enterprise Warehouse Management System (WMS)
## Product Requirement Document (PRD) v2.0

---

## 1. Executive Summary & Vision
**SuperDates WMS** is an enterprise-grade, omnichannel Warehouse Management System tailored for Indonesian high-throughput e-commerce operations. It unifies order management, multi-channel inventory synchronization (Tokopedia, Shopee, Lazada, TikTok Shop, Bukalapak, Blibli), warehouse inbound/outbound fulfillment, batch wave picking, and automated 3PL carrier sortation into a single, high-performance, real-time platform.

The system serves both high-level administrative personnel on desktop displays and warehouse floor operators (Pickers, Packers, Inbound Receivers) using mobile handhelds/PDAs with barcode scanners.

---

## 2. System Architecture & Topology

```mermaid
flowchart TD
    subgraph Marketplaces ["Marketplaces"]
        TK["Tokopedia API"]
        SP["Shopee API"]
        TT["TikTok Shop API"]
        LZ["Lazada API"]
        BK["Bukalapak API"]
    end

    subgraph Integration ["Channel Integration Layer"]
        OMS["Centralized OMS & Webhook Gateway"]
        SYNC["Inventory Sync Engine (Double-Entry Ledger)"]
    end

    subgraph WMS_CORE ["SuperDates WMS Core (FastAPI + PostgreSQL + Redis)"]
        AUTH["RBAC & JWT Session Auth"]
        WAVE["Wave & Batch Optimization Engine"]
        INV["Real-Time Multi-Location Inventory Engine"]
        EVENT["Event-Driven WebSocket Hub"]
        PRINT["Print Spooler & Hardware Gateway"]
    end

    subgraph Clients ["Client Applications"]
        DESK["Desktop Web App (Supervisor / Admin Portal)"]
        PDA["Mobile / PDA Web App (Picker / Packer / Inbound)"]
    end

    TK & SP & TT & LZ & BK <-->|Webhooks / REST API| OMS
    OMS <--> SYNC
    SYNC <--> INV
    AUTH & WAVE & INV & PRINT --- DESK & PDA
    EVENT -->|Real-Time Push| DESK
    EVENT -->|Real-Time Alerts| PDA
```

---

## 3. Core Feature Specifications

### 3.1. Master Data & Warehouse Topology Management
- **Multi-Warehouse Support**: Manage multiple physical warehouses and virtual staging zones.
- **Location Hierarchy**: `Warehouse` $\rightarrow$ `Zone` (Ambient, Cold, Bulk, Fast-Moving) $\rightarrow$ `Aisle` $\rightarrow$ `Rack` $\rightarrow$ `Shelf` $\rightarrow$ `Bin`.
- **Bin Categorization**:
  - `PICK`: Active picking bins with min-max replenishment thresholds.
  - `BULK`: Reserve / Overstock storage bins.
  - `STAGE`: Picker-to-Packer handover staging racks.
  - `CHUTE/SORT`: 3PL carrier sortation bins.
  - `QUARANTINE`: Damaged, expired, or RMA inspection bins.
- **Master SKU & Bundle Engine**:
  - 1:N Channel SKU mapping (Multiple marketplace SKUs linked to 1 Master SKU).
  - Bundle/Kit decomposition (e.g., 1 "Kurma Combo Pack" auto-deducts 1x SKU-A and 2x SKU-B).
  - Barcode standards: EAN-13, Code 128, QR Code, and custom generated Warehouse SKUs.

---

### 3.2. Omnichannel Order Management System (OMS)
- **Real-Time Ingestion**: Webhook listeners + 60-second fallback polling for Tokopedia, Shopee, TikTok Shop, Lazada, and Bukalapak.
- **Order Classification & Tagging**:
  - **SLA Tier**: Instant (GoSend/GrabExpress 2-hour SLA), Sameday, Regular Next Day, Cargo/Bulky, COD.
  - **Order Profile**: Single-Item Single-SKU (Fast Track), Multi-Item Single-SKU, Multi-Item Multi-SKU (Complex Mix).
- **Stock Reservation Engine**:
  - Instant stock allocation on order creation (`Available` $\rightarrow$ `Allocated`).
  - Channel buffer stock configuration to prevent flash-sale overselling.
  - Automatic inventory feedback push to all marketplaces on stock change.

---

### 3.3. Inbound Management & Putaway
- **Advance Shipping Notice (ASN) / Purchase Order Receiving**:
  - Barcode scanning of incoming pallets/boxes.
  - QC Inspection: Record Good Qty, Damaged Qty, and Discrepancies.
  - Expiry Date & Batch/Lot Number recording (FEFO tracking).
- **Directed Putaway Recommendation**:
  - Smart bin suggestion based on SKU velocity (ABC classification), existing bin stock, and volume capacity.
  - Inter-Warehouse Transfer (IWT) tracking with In-Transit status verification.

---

### 3.4. Inventory Management & Integrity
- **5-State Double-Entry Inventory Ledger**:
  $$\text{Stock on Hand (SOH)} = \text{Available} + \text{Allocated} + \text{Picked} + \text{Packed/Staged} + \text{Quarantine}$$
- **Stock Movements & Transfers**: Track full audit history of every item movement with User ID and timestamp.
- **Cycle Count & Stock Opname**:
  - Scheduled blind counts by zone/aisle.
  - Zero-stock trigger counts (initiated when a picker finds an empty bin).
- **Stock Replenishment Engine**:
  - Automated triggers to move stock from `BULK` to `PICK` bins when pick bin reaches reorder point.

---

### 3.5. Outbound Fulfillment (Wave $\rightarrow$ Pick $\rightarrow$ Pack $\rightarrow$ Ship)
- **Wave & Batch Creation Engine**:
  - Grouping by carrier cut-off time, delivery method, and order profile.
  - Route-optimized Pick Path (S-Shape / Chevron path navigation).
- **Picking Execution (Mobile/PDA)**:
  - Hands-free Bluetooth / 2D Scanner support.
  - Two-step barcode validation: Scan Bin $\rightarrow$ Scan Item Barcode.
  - In-flight cancellation interceptor (instantly freezes picking if buyer cancels).
- **Packing & Weight Validation Bench**:
  - Scan Invoice / Tote Barcode $\rightarrow$ Item-by-item SKU scan verification.
  - Dual Print Mode: Pre-print label scan or Instant Scan-to-Print thermal shipping label (100x150mm).
  - Polymailer seal confirmation and instant physical stock ledger deduction.
- **3PL Sortation & Redundant Scanning Manifest**:
  - Carrier scan (Shopee Xpress, J&T, SiCepat, JNE, NinjaVan, Anteraja, LionParcel).
  - Two-stage verification (Scan Label AWB $\rightarrow$ Scan Sortation Chute).
  - Bulk dispatch manifest generation (Surat Jalan / BAST) with 3PL driver signature.

---

### 3.6. Reverse Logistics (RMA & RTS)
- **Return to Sender (RTS - Failed Delivery)**: Bulky AWB return scan $\rightarrow$ Automatic order status update $\rightarrow$ Directed restock or quarantine.
- **Customer Return (RMA - Dispute/Wrong Item)**: Unboxing photo/video upload $\rightarrow$ QC grading (Restockable / Damaged / Supplier Claim) $\rightarrow$ Restock to Bin.

---

### 3.7. Dashboards & Real-Time Analytics
- **Live Fulfillment Monitor**: Real-time throughput (Orders/Hour), SLA countdown timers, bottleneck alert (Picking backlog, Packing bottleneck, Manifest queue).
- **Operator Productivity Dashboard**: Leaderboard for Pickers (Picks/Hour, Accuracy %), Packers (Packs/Hour), and Inbound Receivers.
- **Marketplace Health Dashboard**: Sync latency, API error rate, out-of-stock cancellation rate.

---

## 4. UI/UX Design System & Technology Stack

### 4.1. Design System & Frontend Architecture
- **Look & Feel**: Enterprise-grade dark/light mode, high-density data tables, high-contrast touch interfaces for mobile/PDA, glassmorphism status cards, and zero decorative emojis (replaced with Lucide/Phosphor vector icons).
- **Component Architecture**: Native Vanilla JS Web Components (`customElements.define`) utilizing Shadow DOM for style isolation and reusable custom elements:
  - `<wms-header>`, `<wms-sidebar>`, `<wms-datatable>`
  - `<wms-stat-card>`, `<wms-modal>`, `<wms-toast>`
  - `<wms-scanner-input>`, `<wms-audio-feedback>`
- **Styling & Animation**:
  - **CSS**: Tailwind CSS via utility classes and CSS custom properties.
  - **Micro-interactions**: **Motion One** (Vanilla JS high-performance animation library) for smooth state transitions and view transitions.
  - **State Graphics**: Lottie-web for status animations (success scans, warning alerts, loading states).

### 4.2. Backend & Data Layer
- **Core Framework**: Python 3.11+ with **FastAPI** (Async ASGI).
- **Real-Time Communication**: Native WebSocket endpoint with Redis Pub/Sub backplane for multi-worker synchronization and instant event push.
- **Primary Database**: PostgreSQL 16 with indexed UUIDs, JSONB for marketplace payloads, and transactional row-level locking (`SELECT ... FOR UPDATE`) to eliminate race conditions during inventory allocation.
- **Cache & Message Broker**: Redis 7+ (Session storage, API rate-limiting tokens, pub/sub channels, wave generation locks).
- **Task Queue**: Celery / ARQ for background marketplace sync and automated PDF label generation.

### 4.3. Hardware Integration
- **Barcode Scanners**: Hardware HID wedge listener + PDA camera scanner fallback (ZXing/Quagga2).
- **Thermal Printers**: ESC/POS, TSPL, and ZPL direct printing via Web Print API / QZ Tray / Local Print Spooler service.
- **Audio/Haptic Engine**: Distinct Web Audio API synthetic beeps (Success: 800Hz chime; Error: 200Hz buzzer) and device vibration for mobile PDA operators.

---

## 5. Security, RBAC, and Compliance

### 5.1. Authentication & Authorization
- **Auth**: Stateless JWT (Access + Refresh Tokens) stored in HttpOnly secure cookies + active session validation in Redis.
- **Role-Based Access Control (RBAC)**:
  - `SUPER_ADMIN`: Full system configuration, integration credentials.
  - `WAREHOUSE_MANAGER`: Stock adjustments, approvals, wave allocation, reporting.
  - `INVENTORY_CONTROLLER`: Stock counts, IWT, bin reallocations.
  - `ORDER_ADMIN`: Order exceptions, manual order approvals.
  - `PICKER`: Dedicated mobile PDA picking interface.
  - `PACKER`: Dedicated desktop/touch packing bench interface.
  - `DISPATCHER`: Manifest scanning and courier handover.

### 5.2. Audit Trail & Data Security
- Immutable audit log table recording every stock mutation: `(timestamp, user_id, action, sku_id, bin_id, delta_qty, previous_qty, new_qty, reference_doc)`.
- AES-256 encryption at rest for sensitive marketplace API keys, tokens, and customer PII (Nama Penerima, No. Telepon, Alamat).
- Automated daily PostgreSQL WAL archiving and backup.

---

## 6. Environment Variables Specification

```env
# Server Configuration
ENVIRONMENT=production
PORT=8000
DEBUG=False
SECRET_KEY=your_super_secret_jwt_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database Configuration
DATABASE_URL=postgresql+asyncpg://wms_user:secure_password@localhost:5432/superdates_wms
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# Redis Cache & PubSub
REDIS_URL=redis://:redis_password@localhost:6379/0

# Hardware & Print Service
PRINT_SPOOLER_URL=http://localhost:9100/print
DEFAULT_LABEL_WIDTH_MM=100
DEFAULT_LABEL_HEIGHT_MM=150

# Marketplace API Credentials (Encrypted Store Reference)
ENCRYPTION_KEY=32_byte_base64_encoded_encryption_key
TOKOPEDIA_APP_ID=xxx
TOKOPEDIA_CLIENT_SECRET=xxx
SHOPEE_PARTNER_ID=xxx
SHOPEE_PARTNER_KEY=xxx
TIKTOK_APP_KEY=xxx
TIKTOK_APP_SECRET=xxx
LAZADA_APP_KEY=xxx
LAZADA_APP_SECRET=xxx
```
