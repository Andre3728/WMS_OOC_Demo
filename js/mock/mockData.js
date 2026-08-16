/**
 * SuperDates WMS - Seed Master & Transactional Mock Dataset (v2.6)
 * Supports Multi-Merchant OMS, Inbound Logistics, Stock Movements, Stock Opname, and 5-State Balances
 */

export const SEED_DATA = {
  // 1. Warehouses
  warehouses: [
    {
      id: "wh-jkt-01",
      code: "WH-JKT-01",
      name: "Main Jakarta Distribution Hub",
      address_line1: "Kawasan Industri Daan Mogot KM 12",
      city: "Jakarta Barat",
      province: "DKI Jakarta",
      postal_code: "11840",
      latitude: -6.1554,
      longitude: 106.7321,
      is_active: true
    },
    {
      id: "wh-sby-01",
      code: "WH-SBY-01",
      name: "East Java Regional Hub",
      address_line1: "Rungkut Industri III No. 45",
      city: "Surabaya",
      province: "Jawa Timur",
      postal_code: "60293",
      latitude: -7.3211,
      longitude: 112.7654,
      is_active: true
    }
  ],

  // 2. Zones
  zones: [
    { id: "zn-amb-01", warehouse_id: "wh-jkt-01", code: "ZN-AMB-01", name: "Ambient Storage Zone", zone_type: "AMBIENT", is_temperature_controlled: false, is_active: true },
    { id: "zn-cold-01", warehouse_id: "wh-jkt-01", code: "ZN-COLD-01", name: "Cold Room (Dates & Fresh)", zone_type: "COLD", is_temperature_controlled: true, is_active: true },
    { id: "zn-bulk-01", warehouse_id: "wh-jkt-01", code: "ZN-BULK-01", name: "Bulk Reserve Pallets", zone_type: "BULK_STORAGE", is_temperature_controlled: false, is_active: true },
    { id: "zn-stage-01", warehouse_id: "wh-jkt-01", code: "ZN-STAGE-01", name: "Packing Staging Zone", zone_type: "STAGING", is_temperature_controlled: false, is_active: true },
    { id: "zn-sort-01", warehouse_id: "wh-jkt-01", code: "ZN-SORT-01", name: "3PL Sortation Hub", zone_type: "SORTATION", is_temperature_controlled: false, is_active: true }
  ],

  // 3. Bins (Physical & Virtual Locations)
  bins: [
    { id: "bin-dock-01", warehouse_id: "wh-jkt-01", zone_id: "zn-amb-01", bin_code: "INBOUND-DOCK-01", barcode: "LOC-INBOUND-01", bin_type: "INBOUND_DOCK", pick_sequence: 1, is_locked: false, is_active: true },
    { id: "bin-dock-02", warehouse_id: "wh-jkt-01", zone_id: "zn-amb-01", bin_code: "INBOUND-DOCK-02", barcode: "LOC-INBOUND-02", bin_type: "INBOUND_DOCK", pick_sequence: 2, is_locked: false, is_active: true },
    { id: "bin-pick-b01", warehouse_id: "wh-jkt-01", zone_id: "zn-cold-01", bin_code: "ZN01-A01-R01-L01-B01", barcode: "LOC-A01-R01-L01", bin_type: "PICK", pick_sequence: 10, is_locked: false, is_active: true },
    { id: "bin-pick-b02", warehouse_id: "wh-jkt-01", zone_id: "zn-cold-01", bin_code: "ZN01-A01-R01-L01-B02", barcode: "LOC-A01-R01-L02", bin_type: "PICK", pick_sequence: 20, is_locked: false, is_active: true },
    { id: "bin-pick-b03", warehouse_id: "wh-jkt-01", zone_id: "zn-cold-01", bin_code: "ZN01-A01-R01-L02-B03", barcode: "LOC-A01-R01-L03", bin_type: "PICK", pick_sequence: 30, is_locked: false, is_active: true },
    { id: "bin-bulk-01", warehouse_id: "wh-jkt-01", zone_id: "zn-bulk-01", bin_code: "BULK-R01-PALLET-01", barcode: "LOC-BULK-01", bin_type: "BULK", pick_sequence: 900, is_locked: false, is_active: true },
    { id: "bin-stage-a04", warehouse_id: "wh-jkt-01", zone_id: "zn-stage-01", bin_code: "STAGE-A-04", barcode: "LOC-STAGE-A04", bin_type: "STAGE", pick_sequence: 950, is_locked: false, is_active: true },
    { id: "bin-chute-spx01", warehouse_id: "wh-jkt-01", zone_id: "zn-sort-01", bin_code: "CHUTE-SPX-01", barcode: "LOC-CHUTE-SPX", bin_type: "CHUTE_SORT", pick_sequence: 980, is_locked: false, is_active: true },
    { id: "bin-chute-jnt01", warehouse_id: "wh-jkt-01", zone_id: "zn-sort-01", bin_code: "CHUTE-JNT-01", barcode: "LOC-CHUTE-JNT", bin_type: "CHUTE_SORT", pick_sequence: 981, is_locked: false, is_active: true },
    { id: "bin-restock-01", warehouse_id: "wh-jkt-01", zone_id: "zn-stage-01", bin_code: "RESTOCK-STAGE-01", barcode: "LOC-RESTOCK-01", bin_type: "RESTOCK_STAGING", pick_sequence: 990, is_locked: false, is_active: true },
    { id: "bin-quarantine-01", warehouse_id: "wh-jkt-01", zone_id: "zn-amb-01", bin_code: "ZN01-QUARANTINE-01", barcode: "LOC-QUARANTINE-01", bin_type: "QUARANTINE", pick_sequence: 999, is_locked: false, is_active: true }
  ],

  // 4. Categories & Master SKUs
  categories: [
    { id: "cat-dates", code: "CAT-DATES", name: "Premium Kurma / Dates", is_active: true },
    { id: "cat-honey", code: "CAT-HONEY", name: "Herbal & Pure Honey", is_active: true },
    { id: "cat-olive", code: "CAT-OLIVE", name: "Extra Virgin Olive Oil", is_active: true }
  ],

  master_skus: [
    {
      id: "sku-ajwa-500g",
      sku_code: "KRM-AJWA-500G",
      barcode: "8991001234561",
      name: "Kurma Ajwa Madinah Premium 500g",
      category_id: "cat-dates",
      uom: "BOX",
      weight_kg: 0.550,
      min_stock_threshold: 20, max_stock_threshold: 500, reorder_point: 40,
      abc_classification: "A",
      is_active: true
    },
    {
      id: "sku-sukari-1kg",
      sku_code: "KRM-SUKARI-1KG",
      barcode: "8991001234578",
      name: "Kurma Sukari Al Qassim Basah 1kg",
      category_id: "cat-dates",
      uom: "BOX",
      weight_kg: 1.100,
      min_stock_threshold: 15, max_stock_threshold: 400, reorder_point: 30,
      abc_classification: "A",
      is_active: true
    },
    {
      id: "sku-medjool-1kg",
      sku_code: "KRM-MEDJOOL-1KG",
      barcode: "8991001234585",
      name: "Kurma Medjool Jumbo California 1kg",
      category_id: "cat-dates",
      uom: "BOX",
      weight_kg: 1.150,
      min_stock_threshold: 10, max_stock_threshold: 200, reorder_point: 25,
      abc_classification: "B",
      is_active: true
    },
    {
      id: "sku-khalas-500g",
      sku_code: "KRM-KHALAS-500G",
      barcode: "8991001234592",
      name: "Kurma Khalas Saad Vacuum 500g",
      category_id: "cat-dates",
      uom: "PACK",
      weight_kg: 0.520,
      min_stock_threshold: 25, max_stock_threshold: 600, reorder_point: 50,
      abc_classification: "C",
      is_active: true
    }
  ],

  // 5. Inbound Suppliers, Purchase Orders & ASNs
  suppliers: [
    { id: "sup-01", code: "SUP-MADINAH-EXP", name: "Al-Madinah Date Exporters LLC", country: "Saudi Arabia", contact_person: "Tariq Mansoor", is_active: true },
    { id: "sup-02", code: "SUP-CALIF-FARM", name: "California Premium Palms Co.", country: "United States", contact_person: "John Sterling", is_active: true },
    { id: "sup-03", code: "SUP-EMIRATES-PKG", name: "Emirates Dates Packaging Hub", country: "UAE", contact_person: "Rashid Al-Nuaimi", is_active: true }
  ],

  asn_shipments: [
    {
      id: "asn-001",
      asn_number: "ASN-2026-08-001",
      po_number: "PO-2026-07-089",
      supplier_id: "sup-01",
      supplier_name: "Al-Madinah Date Exporters LLC",
      warehouse_id: "wh-jkt-01",
      dock_bin_id: "bin-dock-01",
      container_number: "MSKU-882910-1",
      truck_plate_number: "B-9281-UDF",
      expected_items_count: 500,
      received_good_count: 495,
      received_damaged_count: 5,
      status: "COMPLETED",
      eta: "2026-08-17 07:30:00+07",
      arrived_at: "2026-08-17 07:45:00+07",
      completed_at: "2026-08-17 08:30:00+07"
    },
    {
      id: "asn-002",
      asn_number: "ASN-2026-08-002",
      po_number: "PO-2026-07-092",
      supplier_id: "sup-02",
      supplier_name: "California Premium Palms Co.",
      warehouse_id: "wh-jkt-01",
      dock_bin_id: "bin-dock-02",
      container_number: "CMAU-119283-0",
      truck_plate_number: "B-9104-TEX",
      expected_items_count: 300,
      received_good_count: 120,
      received_damaged_count: 0,
      status: "RECEIVING_IN_PROGRESS",
      eta: "2026-08-17 08:00:00+07",
      arrived_at: "2026-08-17 08:15:00+07",
      completed_at: null
    },
    {
      id: "asn-003",
      asn_number: "ASN-2026-08-003",
      po_number: "PO-2026-08-005",
      supplier_id: "sup-03",
      supplier_name: "Emirates Dates Packaging Hub",
      warehouse_id: "wh-jkt-01",
      dock_bin_id: "bin-dock-01",
      container_number: "TGHU-990182-4",
      truck_plate_number: "B-9472-PDF",
      expected_items_count: 600,
      received_good_count: 0,
      received_damaged_count: 0,
      status: "ARRIVED_AT_DOCK",
      eta: "2026-08-17 09:30:00+07",
      arrived_at: "2026-08-17 09:25:00+07",
      completed_at: null
    }
  ],

  asn_items: [
    { id: "asni-001", asn_id: "asn-001", master_sku_id: "sku-ajwa-500g", expected_qty: 500, received_good_qty: 495, received_damaged_qty: 5, lot_number: "LOT-2026-AJW-01", expiry_date: "2027-12-31", status: "RECEIVED" },
    { id: "asni-002", asn_id: "asn-002", master_sku_id: "sku-medjool-1kg", expected_qty: 300, received_good_qty: 120, received_damaged_qty: 0, lot_number: "LOT-2026-MED-01", expiry_date: "2027-08-15", status: "RECEIVING" },
    { id: "asni-003", asn_id: "asn-003", master_sku_id: "sku-sukari-1kg", expected_qty: 600, received_good_qty: 0, received_damaged_qty: 0, lot_number: null, expiry_date: null, status: "PENDING" }
  ],

  putaway_tasks: [
    { id: "pat-001", task_number: "PUT-2026-08-001", asn_id: "asn-001", master_sku_id: "sku-ajwa-500g", batch_id: "batch-lot-01", from_bin_id: "bin-dock-01", target_bin_id: "bin-pick-b01", quantity: 495, status: "COMPLETED", assigned_user_id: "usr-dock-01", completed_at: "2026-08-17 08:30:00+07" },
    { id: "pat-002", task_number: "PUT-2026-08-002", asn_id: "asn-002", master_sku_id: "sku-medjool-1kg", batch_id: "batch-lot-03", from_bin_id: "bin-dock-02", target_bin_id: "bin-pick-b03", quantity: 120, status: "IN_PROGRESS", assigned_user_id: "usr-dock-01", completed_at: null }
  ],

  // 6. Stock Movements & Opname Audit Sessions (Phase 3)
  stock_transfers: [
    {
      id: "txfr-001",
      transfer_number: "MVT-2026-08-001",
      warehouse_id: "wh-jkt-01",
      master_sku_id: "sku-ajwa-500g",
      batch_id: "batch-lot-01",
      from_bin_id: "bin-bulk-01",
      to_bin_id: "bin-pick-b01",
      quantity: 50,
      reason: "REPLENISHMENT_PICK_FACE",
      status: "COMPLETED",
      requested_by: "usr-admin",
      completed_at: "2026-08-17 08:15:00+07"
    }
  ],

  stock_opname_sessions: [
    {
      id: "opn-001",
      opname_code: "OPN-2026-08-001",
      warehouse_id: "wh-jkt-01",
      zone_id: "zn-cold-01",
      session_name: "Monthly Cold Room Cycle Count",
      status: "COMPLETED",
      total_bins_audited: 3,
      total_variance_units: -2,
      audited_by: "usr-dock-01",
      approved_by: "usr-supervisor-01",
      created_at: "2026-08-17 07:00:00+07",
      completed_at: "2026-08-17 08:00:00+07"
    }
  ],

  stock_opname_items: [
    {
      id: "opni-001",
      opname_id: "opn-001",
      bin_id: "bin-pick-b01",
      master_sku_id: "sku-ajwa-500g",
      batch_id: "batch-lot-01",
      system_qty: 120,
      physical_qty: 118,
      variance_qty: -2,
      reason_code: "SHRINKAGE_SAMPLED",
      status: "ADJUSTED_TO_LEDGER"
    }
  ],

  // 7. Marketplace Channels & Multiple Merchant Stores
  marketplace_channels: [
    { id: "chn-tkpd", code: "TOKOPEDIA", name: "Tokopedia", is_active: true },
    { id: "chn-shopee", code: "SHOPEE", name: "Shopee Indonesia", is_active: true },
    { id: "chn-tiktok", code: "TIKTOK", name: "TikTok Shop", is_active: true },
    { id: "chn-lazada", code: "LAZADA", name: "Lazada ID", is_active: true },
    { id: "chn-blibli", code: "BLIBLI", name: "Blibli", is_active: true }
  ],

  marketplace_stores: [
    { id: "store-tkpd-01", channel_id: "chn-tkpd", store_code: "TKPD-OFFICIAL", merchant_name: "SuperDates Official Store", is_active: true },
    { id: "store-tkpd-02", channel_id: "chn-tkpd", store_code: "TKPD-GROSIR-JKT", merchant_name: "SuperDates Grosir Jakarta", is_active: true },
    { id: "store-shopee-01", channel_id: "chn-shopee", store_code: "SP-MALL", merchant_name: "SuperDates Mall Shopee", is_active: true },
    { id: "store-shopee-02", channel_id: "chn-shopee", store_code: "SP-STAR-MADINAH", merchant_name: "Kurma Madinah Star Seller", is_active: true },
    { id: "store-tiktok-01", channel_id: "chn-tiktok", store_code: "TT-LIVE-OFFICIAL", merchant_name: "SuperDates TikTok Live Mall", is_active: true },
    { id: "store-tiktok-02", channel_id: "chn-tiktok", store_code: "TT-RESELLER-HUB", merchant_name: "SuperDates Reseller Express", is_active: true },
    { id: "store-lazada-01", channel_id: "chn-lazada", store_code: "LZD-FLAGSHIP", merchant_name: "SuperDates Flagship Store", is_active: true }
  ],

  // 8. Couriers & Courier Services
  couriers: [
    { id: "courier-spx", code: "SPX", name: "Shopee Xpress", is_instant: false, is_active: true },
    { id: "courier-jnt", code: "JNT", name: "J&T Express", is_instant: false, is_active: true },
    { id: "courier-sicepat", code: "SICEPAT", name: "SiCepat Ekspres", is_instant: false, is_active: true },
    { id: "courier-jne", code: "JNE", name: "JNE Express", is_instant: false, is_active: true },
    { id: "courier-gosend", code: "GOSEND", name: "GoSend Instant", is_instant: true, is_active: true },
    { id: "courier-grab", code: "GRAB", name: "GrabExpress", is_instant: true, is_active: true }
  ],

  courier_services: [
    { id: "srv-spx-std", courier_id: "courier-spx", service_code: "SPX-STD", service_name: "SPX Standard", delivery_tier: "REGULAR", sla_hours: 24 },
    { id: "srv-spx-inst", courier_id: "courier-spx", service_code: "SPX-INST", service_name: "SPX Instant 2H", delivery_tier: "INSTANT_2H", sla_hours: 2 },
    { id: "srv-jnt-ez", courier_id: "courier-jnt", service_code: "JNT-EZ", service_name: "J&T Regular EZ", delivery_tier: "REGULAR", sla_hours: 24 },
    { id: "srv-jnt-cargo", courier_id: "courier-jnt", service_code: "JNT-CARGO", service_name: "J&T Cargo Bulky", delivery_tier: "CARGO_BULKY", sla_hours: 72 },
    { id: "srv-sicepat-gokil", courier_id: "courier-sicepat", service_code: "SICEPAT-GOKIL", service_name: "SiCepat Cargo (GOKIL)", delivery_tier: "CARGO_BULKY", sla_hours: 72 },
    { id: "srv-gosend-inst", courier_id: "courier-gosend", service_code: "GOSEND-INST", service_name: "GoSend Instant 2 Jam", delivery_tier: "INSTANT_2H", sla_hours: 2 },
    { id: "srv-grab-sameday", courier_id: "courier-grab", service_code: "GRAB-SAMEDAY", service_name: "GrabExpress Sameday (6h)", delivery_tier: "SAMEDAY", sla_hours: 6 }
  ],

  // 9. Inventory Batches
  inventory_batches: [
    { id: "batch-lot-01", warehouse_id: "wh-jkt-01", master_sku_id: "sku-ajwa-500g", lot_number: "LOT-2026-AJW-01", manufacture_date: "2026-06-01", expiry_date: "2027-12-31", qc_status: "APPROVED" },
    { id: "batch-lot-02", warehouse_id: "wh-jkt-01", master_sku_id: "sku-sukari-1kg", lot_number: "LOT-2026-SUK-01", manufacture_date: "2026-07-15", expiry_date: "2027-10-30", qc_status: "APPROVED" },
    { id: "batch-lot-03", warehouse_id: "wh-jkt-01", master_sku_id: "sku-medjool-1kg", lot_number: "LOT-2026-MED-01", manufacture_date: "2026-05-20", expiry_date: "2027-08-15", qc_status: "APPROVED" },
    { id: "batch-lot-04", warehouse_id: "wh-jkt-01", master_sku_id: "sku-khalas-500g", lot_number: "LOT-2026-KHL-01", manufacture_date: "2026-04-10", expiry_date: "2027-11-20", qc_status: "APPROVED" }
  ],

  // 10. 5-State Balances
  inventory_balances: [
    { id: "bal-01", warehouse_id: "wh-jkt-01", bin_id: "bin-pick-b01", master_sku_id: "sku-ajwa-500g", batch_id: "batch-lot-01", qty_available: 118, qty_allocated: 17, qty_picked: 5, qty_packed: 0, qty_quarantine: 0, version: 1, last_movement_at: "2026-08-17 08:30:00+07" },
    { id: "bal-02", warehouse_id: "wh-jkt-01", bin_id: "bin-pick-b02", master_sku_id: "sku-sukari-1kg", batch_id: "batch-lot-02", qty_available: 84, qty_allocated: 11, qty_picked: 0, qty_packed: 0, qty_quarantine: 0, version: 1, last_movement_at: "2026-08-17 08:30:00+07" },
    { id: "bal-03", warehouse_id: "wh-jkt-01", bin_id: "bin-pick-b03", master_sku_id: "sku-medjool-1kg", batch_id: "batch-lot-03", qty_available: 44, qty_allocated: 6, qty_picked: 0, qty_packed: 0, qty_quarantine: 0, version: 1, last_movement_at: "2026-08-17 08:30:00+07" },
    { id: "bal-04", warehouse_id: "wh-jkt-01", bin_id: "bin-bulk-01", master_sku_id: "sku-ajwa-500g", batch_id: "batch-lot-01", qty_available: 500, qty_allocated: 0, qty_picked: 0, qty_packed: 0, qty_quarantine: 0, version: 1, last_movement_at: "2026-08-17 08:00:00+07" },
    { id: "bal-05", warehouse_id: "wh-jkt-01", bin_id: "bin-stage-a04", master_sku_id: "sku-ajwa-500g", batch_id: "batch-lot-01", qty_available: 0, qty_allocated: 0, qty_picked: 5, qty_packed: 0, qty_quarantine: 0, version: 1, last_movement_at: "2026-08-17 09:15:00+07" }
  ],

  // 11. Immutable Double-Entry Ledger
  inventory_ledger: [
    { id: "ledg-init-01", transaction_uuid: "tx-init-001", warehouse_id: "wh-jkt-01", master_sku_id: "sku-ajwa-500g", batch_id: "batch-lot-01", from_bin_id: "bin-dock-01", to_bin_id: "bin-pick-b01", from_state: "EXTERNAL_SUPPLIER", to_state: "AVAILABLE", quantity: 140, transaction_type: "PUTAWAY", reference_doc_type: "ASN", reference_doc_id: "ASN-2026-08-001", created_at: "2026-08-17 08:00:00+07" },
    { id: "ledg-init-02", transaction_uuid: "tx-init-002", warehouse_id: "wh-jkt-01", master_sku_id: "sku-ajwa-500g", batch_id: "batch-lot-01", from_bin_id: "bin-pick-b01", to_bin_id: "bin-pick-b01", from_state: "AVAILABLE", to_state: "ALLOCATED", quantity: 20, transaction_type: "ORDER_RESERVE", reference_doc_type: "ORDER", reference_doc_id: "ORD-2026-08-0001", created_at: "2026-08-17 08:45:00+07" }
  ],

  // 12. Multi-Merchant Orders Dataset
  orders: [
    {
      id: "ord-001",
      order_code: "ORD-2026-08-0001",
      store_id: "store-tkpd-01",
      channel_id: "chn-tkpd",
      merchant_name: "SuperDates Official Store",
      warehouse_id: "wh-jkt-01",
      external_order_id: "TKPD-99881122",
      external_order_sn: "INV/20260817/MPL/391001",
      marketplace_status: "READY_TO_SHIP",
      wms_status: "ALLOCATED",
      order_profile: "SINGLE_ITEM_SINGLE_SKU",
      sla_tier: "REGULAR",
      priority_level: 3,
      recipient_name: "Ahmad Fauzi",
      recipient_city: "Jakarta Barat",
      courier_id: "courier-spx",
      courier_service_id: "srv-spx-std",
      awb_number: "SPXID0299881122",
      is_cod: false,
      total_order_amount: 190000,
      allocated_at: "2026-08-17 09:00:00+07",
      created_at: "2026-08-17 08:58:30+07"
    },
    {
      id: "ord-002",
      order_code: "ORD-2026-08-0002",
      store_id: "store-shopee-01",
      channel_id: "chn-shopee",
      merchant_name: "SuperDates Mall Shopee",
      warehouse_id: "wh-jkt-01",
      external_order_id: "SP-260817-A109",
      external_order_sn: "260817ABCDEF1",
      marketplace_status: "READY_TO_SHIP",
      wms_status: "BATCHED_IN_WAVE",
      order_profile: "MULTI_ITEM_SINGLE_SKU",
      sla_tier: "REGULAR",
      priority_level: 3,
      recipient_name: "Siti Rahmawati",
      recipient_city: "Jakarta Selatan",
      courier_id: "courier-spx",
      courier_service_id: "srv-spx-std",
      awb_number: "SPXID0299881133",
      is_cod: false,
      total_order_amount: 270000,
      allocated_at: "2026-08-17 09:05:00+07",
      created_at: "2026-08-17 09:02:10+07"
    },
    {
      id: "ord-003",
      order_code: "ORD-2026-08-0003",
      store_id: "store-tkpd-02",
      channel_id: "chn-tkpd",
      merchant_name: "SuperDates Grosir Jakarta",
      warehouse_id: "wh-jkt-01",
      external_order_id: "TKPD-INST-4433",
      external_order_sn: "INV/20260817/MPL/391002",
      marketplace_status: "PROCESSING",
      wms_status: "PICKING",
      order_profile: "SINGLE_ITEM_SINGLE_SKU",
      sla_tier: "INSTANT_2H",
      priority_level: 1,
      recipient_name: "Bambang Sudibyo",
      recipient_city: "Jakarta Barat",
      courier_id: "courier-gosend",
      courier_service_id: "srv-gosend-inst",
      awb_number: "GK-99228811",
      is_cod: false,
      total_order_amount: 135000,
      allocated_at: "2026-08-17 09:10:00+07",
      created_at: "2026-08-17 09:09:00+07"
    },
    {
      id: "ord-004",
      order_code: "ORD-2026-08-0004",
      store_id: "store-tiktok-01",
      channel_id: "chn-tiktok",
      merchant_name: "SuperDates TikTok Live Mall",
      warehouse_id: "wh-jkt-01",
      external_order_id: "TT-577889901",
      external_order_sn: "TTS-20260817-004",
      marketplace_status: "PAID_CONFIRMED",
      wms_status: "PENDING_ALLOCATION",
      order_profile: "MULTI_ITEM_MIXED_SKU",
      sla_tier: "REGULAR",
      priority_level: 3,
      recipient_name: "Dewi Lestari",
      recipient_city: "Jakarta Selatan",
      courier_id: "courier-jnt",
      courier_service_id: "srv-jnt-ez",
      awb_number: "JNT9988221100",
      is_cod: true,
      total_order_amount: 325000,
      created_at: "2026-08-17 09:12:00+07"
    },
    {
      id: "ord-005",
      order_code: "ORD-2026-08-0005",
      store_id: "store-shopee-02",
      channel_id: "chn-shopee",
      merchant_name: "Kurma Madinah Star Seller",
      warehouse_id: "wh-jkt-01",
      external_order_id: "SP-260817-CRG01",
      external_order_sn: "260817CARGO01",
      marketplace_status: "READY_TO_SHIP",
      wms_status: "ALLOCATED",
      order_profile: "MULTI_ITEM_SINGLE_SKU",
      sla_tier: "CARGO_BULKY",
      priority_level: 4,
      recipient_name: "Hj. Mahfudz",
      recipient_city: "Tangerang",
      courier_id: "courier-sicepat",
      courier_service_id: "srv-sicepat-gokil",
      awb_number: "SICGOKIL8811",
      is_cod: false,
      total_order_amount: 1350000,
      allocated_at: "2026-08-17 09:14:00+07",
      created_at: "2026-08-17 09:13:00+07"
    }
  ],

  order_items: [
    { id: "oi-001", order_id: "ord-001", master_sku_id: "sku-ajwa-500g", item_name: "Kurma Ajwa Madinah Premium 500g", ordered_qty: 2, allocated_qty: 2, picked_qty: 0, packed_qty: 0, unit_price: 95000, status: "ALLOCATED" },
    { id: "oi-002", order_id: "ord-002", master_sku_id: "sku-sukari-1kg", item_name: "Kurma Sukari Al Qassim Basah 1kg", ordered_qty: 2, allocated_qty: 2, picked_qty: 0, packed_qty: 0, unit_price: 135000, status: "ALLOCATED" },
    { id: "oi-003", order_id: "ord-003", master_sku_id: "sku-sukari-1kg", item_name: "Kurma Sukari Al Qassim Basah 1kg", ordered_qty: 1, allocated_qty: 1, picked_qty: 1, packed_qty: 0, unit_price: 135000, status: "PICKED" },
    { id: "oi-004", order_id: "ord-004", master_sku_id: "sku-ajwa-500g", item_name: "Kurma Ajwa Madinah Premium 500g", ordered_qty: 1, allocated_qty: 0, picked_qty: 0, packed_qty: 0, unit_price: 95000, status: "PENDING" },
    { id: "oi-005", order_id: "ord-004", master_sku_id: "sku-medjool-1kg", item_name: "Kurma Medjool Jumbo California 1kg", ordered_qty: 1, allocated_qty: 0, picked_qty: 0, packed_qty: 0, unit_price: 230000, status: "PENDING" },
    { id: "oi-006", order_id: "ord-005", master_sku_id: "sku-sukari-1kg", item_name: "Kurma Sukari Al Qassim Basah 1kg", ordered_qty: 10, allocated_qty: 10, picked_qty: 0, packed_qty: 0, unit_price: 135000, status: "ALLOCATED" }
  ],

  // 13. Waves & Tasks
  waves: [
    { id: "wv-001", wave_number: "WV-2026-08-0001", warehouse_id: "wh-jkt-01", wave_type: "CARRIER_CUTOFF_BATCH", courier_id: "courier-spx", delivery_tier: "REGULAR", total_orders_count: 25, total_items_count: 48, status: "IN_PICKING", wave_strategy: "S_SHAPE", created_at: "2026-08-17 09:00:00+07" }
  ],

  pick_tasks: [
    { id: "pt-001", task_number: "PT-2026-08-001", wave_id: "wv-001", warehouse_id: "wh-jkt-01", picker_user_id: "usr-pick-01", assigned_tote_id: "TOTE-001", status: "IN_PROGRESS", total_items_to_pick: 48, total_items_picked: 24, created_at: "2026-08-17 09:05:00+07" }
  ]
};
