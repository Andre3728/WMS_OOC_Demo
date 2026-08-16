/**
 * SuperDates WMS - Reactive ACID Mock Store (v3.2)
 * Phase 8: Reverse Logistics (RTS Undelivered & RMA Customer Returns), QC Grading & Double-Entry Ledger Restocking
 */

import { SEED_DATA } from './mockData.js';

const STORAGE_KEY = 'SUPERDATES_WMS_STATE_V3_2';

class MockStore {
  constructor() {
    this.subscribers = new Map();
    this.globalSubscribers = new Set();
    this.lastMutation = null;
    this.inFlightCancelCallbacks = new Set();
    this.init();
  }

  init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.state = JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved state, loading default seed.', e);
        this.state = JSON.parse(JSON.stringify(SEED_DATA));
      }
    } else {
      this.state = JSON.parse(JSON.stringify(SEED_DATA));
    }

    // Ensure returns table exists in state
    if (!this.state.customer_returns) {
      this.state.customer_returns = [
        {
          id: 'ret-001',
          return_number: 'RET-2026-08-0091',
          order_id: 'ord-002',
          order_code: 'ORD-2026-08-0002',
          master_sku_id: 'sku-sukari-1kg',
          sku_name: 'Kurma Sukari Al Qassim Premium 1kg',
          quantity: 1,
          return_type: 'RTS_FAILED_DELIVERY',
          carrier_id: 'courier-jnt',
          carrier_name: 'J&T Express',
          buyer_reason: 'Buyer unreachable at delivery destination (3x Attempt Failed)',
          qc_grade: 'SEALED_PRISTINE',
          disposition_action: 'RESTOCK_AVAILABLE',
          status: 'PENDING_INSPECTION',
          created_at: '2026-08-16T14:30:00Z'
        },
        {
          id: 'ret-002',
          return_number: 'RET-2026-08-0092',
          order_id: 'ord-001',
          order_code: 'ORD-2026-08-0001',
          master_sku_id: 'sku-ajwa-500g',
          sku_name: 'Kurma Ajwa Madinah Aliyah 500g',
          quantity: 1,
          return_type: 'RMA_CUSTOMER_CLAIM',
          carrier_id: 'courier-spx',
          carrier_name: 'Shopee Xpress',
          buyer_reason: 'Outer packaging crushed during transit, item leaking vacuum seal',
          qc_grade: 'DAMAGED_CRUSHED',
          disposition_action: 'QUARANTINE_DEFECT',
          status: 'PENDING_INSPECTION',
          created_at: '2026-08-16T15:10:00Z'
        }
      ];
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  reset() {
    this.state = JSON.parse(JSON.stringify(SEED_DATA));
    this.init();
    this.save();
    this.notifyAll('RESET', { timestamp: new Date().toISOString() });
  }

  // --- Reactive Pub/Sub ---
  subscribe(tableName, callback) {
    if (!this.subscribers.has(tableName)) {
      this.subscribers.set(tableName, new Set());
    }
    this.subscribers.get(tableName).add(callback);
    return () => this.subscribers.get(tableName).delete(callback);
  }

  subscribeAll(callback) {
    this.globalSubscribers.add(callback);
    return () => this.globalSubscribers.delete(callback);
  }

  onInFlightCancel(callback) {
    this.inFlightCancelCallbacks.add(callback);
    return () => this.inFlightCancelCallbacks.delete(callback);
  }

  notify(tableName, action, data) {
    this.lastMutation = { tableName, rowId: data?.id, action, timestamp: Date.now() };
    this.save();

    if (this.subscribers.has(tableName)) {
      this.subscribers.get(tableName).forEach(cb => {
        try { cb(action, data); } catch (e) { console.error(e); }
      });
    }

    this.globalSubscribers.forEach(cb => {
      try { cb(tableName, action, data, this.lastMutation); } catch (e) { console.error(e); }
    });
  }

  notifyAll(action, data) {
    this.globalSubscribers.forEach(cb => {
      try { cb('*', action, data); } catch (e) { console.error(e); }
    });
  }

  // --- Query Helpers ---
  getTable(tableName) {
    return this.state[tableName] || [];
  }

  getItem(tableName, id) {
    const table = this.getTable(tableName);
    return table.find(r => r.id === id) || null;
  }

  // --- Strict ACID Double-Entry Inventory Mutation Engine ---
  mutateInventory({
    masterSkuId,
    batchId = null,
    fromBinId = null,
    toBinId = null,
    fromState = null,
    toState = null,
    quantity,
    transactionType,
    referenceDocType,
    referenceDocId,
    userId = 'usr-admin'
  }) {
    if (quantity <= 0) return null;

    const txUuid = 'tx-' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    // 1. Debit from source balance if applicable
    if (fromBinId && fromState && !fromState.startsWith('EXTERNAL')) {
      const stateProp = `qty_${fromState.toLowerCase()}`;
      let fromBal = this.state.inventory_balances.find(
        b => b.bin_id === fromBinId && b.master_sku_id === masterSkuId
      );
      if (fromBal) {
        fromBal[stateProp] = Math.max(0, (fromBal[stateProp] || 0) - quantity);
        fromBal.version = (fromBal.version || 1) + 1;
        fromBal.last_movement_at = now;
      }
    }

    // 2. Credit to destination balance if applicable
    if (toBinId && toState && !toState.startsWith('EXTERNAL')) {
      const stateProp = `qty_${toState.toLowerCase()}`;
      let toBal = this.state.inventory_balances.find(
        b => b.bin_id === toBinId && b.master_sku_id === masterSkuId
      );
      if (!toBal) {
        toBal = {
          id: 'bal-' + Math.random().toString(36).substr(2, 9),
          warehouse_id: 'wh-jkt-01',
          bin_id: toBinId,
          master_sku_id: masterSkuId,
          batch_id: batchId || 'batch-lot-01',
          qty_available: 0,
          qty_allocated: 0,
          qty_picked: 0,
          qty_packed: 0,
          qty_quarantine: 0,
          version: 1,
          last_movement_at: now
        };
        this.state.inventory_balances.push(toBal);
      }
      toBal[stateProp] = (toBal[stateProp] || 0) + quantity;
      toBal.version = (toBal.version || 1) + 1;
      toBal.last_movement_at = now;
    }

    // 3. Write immutable record to inventory_ledger
    const ledgerEntry = {
      id: 'ledg-' + Math.random().toString(36).substr(2, 9),
      transaction_uuid: txUuid,
      warehouse_id: 'wh-jkt-01',
      master_sku_id: masterSkuId,
      batch_id: batchId || 'batch-lot-01',
      from_bin_id: fromBinId,
      to_bin_id: toBinId,
      from_state: fromState,
      to_state: toState,
      quantity,
      transaction_type: transactionType,
      reference_doc_type: referenceDocType,
      reference_doc_id: referenceDocId,
      user_id: userId,
      created_at: now
    };

    if (!this.state.inventory_ledger) this.state.inventory_ledger = [];
    this.state.inventory_ledger.unshift(ledgerEntry);

    this.notify('inventory_balances', 'UPDATE', { masterSkuId });
    this.notify('inventory_ledger', 'INSERT', ledgerEntry);

    return ledgerEntry;
  }

  // --- Phase 8: Reverse Logistics (RTS & RMA) Engine ---
  simulateIncomingReturn({
    orderId = null,
    returnType = 'RTS_FAILED_DELIVERY'
  }) {
    let order = orderId ? this.getItem('orders', orderId) : this.state.orders[0];
    if (!order) order = this.state.orders[0];

    const num = Math.floor(100 + Math.random() * 900);
    const returnNumber = `RET-2026-08-${num}`;
    const now = new Date().toISOString();

    const items = (this.state.order_items || []).filter(oi => oi.order_id === order.id);
    const firstItem = items[0] || { master_sku_id: 'sku-ajwa-500g', item_name: 'Kurma Ajwa Madinah 500g', ordered_qty: 1 };
    const courier = this.getItem('couriers', order.courier_id);

    const isRts = returnType === 'RTS_FAILED_DELIVERY';

    const newReturn = {
      id: 'ret-' + Math.random().toString(36).substr(2, 9),
      return_number: returnNumber,
      order_id: order.id,
      order_code: order.order_code,
      master_sku_id: firstItem.master_sku_id,
      sku_name: firstItem.item_name,
      quantity: firstItem.ordered_qty || 1,
      return_type: returnType,
      carrier_id: order.courier_id,
      carrier_name: courier ? courier.name : order.courier_id,
      buyer_reason: isRts 
        ? 'Recipient uncontactable / delivery address incomplete (3 attempts)'
        : 'Customer report: Package seal crushed during delivery',
      qc_grade: isRts ? 'SEALED_PRISTINE' : 'DAMAGED_CRUSHED',
      disposition_action: isRts ? 'RESTOCK_AVAILABLE' : 'QUARANTINE_DEFECT',
      status: 'PENDING_INSPECTION',
      created_at: now
    };

    if (!this.state.customer_returns) this.state.customer_returns = [];
    this.state.customer_returns.unshift(newReturn);

    order.wms_status = isRts ? 'RTS_IN_INSPECTION' : 'RMA_CLAIM_PENDING';
    order.marketplace_status = 'RETURN_PROCESSING';

    this.notify('customer_returns', 'INSERT', newReturn);
    this.notify('orders', 'UPDATE', order);

    return newReturn;
  }

  processReturnDisposition({
    returnId,
    qcGrade = 'SEALED_PRISTINE',
    dispositionAction = 'RESTOCK_AVAILABLE',
    targetBinId = 'bin-pick-b01',
    inspectorUserId = 'usr-qc-01'
  }) {
    const ret = this.getItem('customer_returns', returnId);
    if (!ret) return null;

    const now = new Date().toISOString();
    ret.qc_grade = qcGrade;
    ret.disposition_action = dispositionAction;
    ret.status = dispositionAction === 'RESTOCK_AVAILABLE' ? 'COMPLETED_RESTOCKED' : 'COMPLETED_QUARANTINED';
    ret.inspected_at = now;
    ret.inspected_by = inspectorUserId;

    const order = this.getItem('orders', ret.order_id);
    if (order) {
      order.wms_status = dispositionAction === 'RESTOCK_AVAILABLE' ? 'RETURN_RESTOCKED' : 'RETURN_QUARANTINED';
      order.marketplace_status = 'RETURN_COMPLETED';
      this.notify('orders', 'UPDATE', order);
    }

    if (dispositionAction === 'RESTOCK_AVAILABLE') {
      // Double-entry debit EXTERNAL_3PL_CARRIER -> credit AVAILABLE in target bin
      this.mutateInventory({
        masterSkuId: ret.master_sku_id,
        batchId: 'batch-lot-01',
        fromBinId: null,
        toBinId: targetBinId,
        fromState: 'EXTERNAL_3PL_CARRIER',
        toState: 'AVAILABLE',
        quantity: ret.quantity,
        transactionType: 'RTS_RESTOCK_CREDIT',
        referenceDocType: 'RETURN_DISPOSITION',
        referenceDocId: ret.return_number,
        userId: inspectorUserId
      });
    } else {
      // Double-entry debit EXTERNAL_3PL_CARRIER -> credit QUARANTINE
      this.mutateInventory({
        masterSkuId: ret.master_sku_id,
        batchId: 'batch-lot-01',
        fromBinId: null,
        toBinId: 'bin-quarantine-01',
        fromState: 'EXTERNAL_3PL_CARRIER',
        toState: 'QUARANTINE',
        quantity: ret.quantity,
        transactionType: 'RMA_DAMAGE_QUARANTINE',
        referenceDocType: 'RETURN_DISPOSITION',
        referenceDocId: ret.return_number,
        userId: inspectorUserId
      });
    }

    this.notify('customer_returns', 'UPDATE', ret);
    return ret;
  }

  // --- Phase 7: 3PL Manifest Handover (BAST) ---
  createManifest({
    courierId = 'courier-spx',
    driverName = 'Eko Santoso',
    truckPlate = 'B 9842 UDF',
    chuteId = 'CHUTE-SPX-01',
    orderIds = []
  }) {
    const num = Math.floor(1000 + Math.random() * 9000);
    const manifestCode = `BAST-2026-08-${num}`;
    const now = new Date().toISOString();

    const selectedOrders = orderIds.length > 0 
      ? this.state.orders.filter(o => orderIds.includes(o.id))
      : this.state.orders.filter(o => o.courier_id === courierId && ['PACKED', 'ALLOCATED'].includes(o.wms_status));

    let totalWeight = 0;
    let totalCod = 0;

    selectedOrders.forEach(o => {
      totalWeight += o.actual_weight_kg || 0.65;
      if (o.is_cod) totalCod += o.total_order_amount || 0;
    });

    const newManifest = {
      id: 'mnf-' + Math.random().toString(36).substr(2, 9),
      manifest_number: manifestCode,
      warehouse_id: 'wh-jkt-01',
      courier_id: courierId,
      driver_name: driverName,
      truck_plate_number: truckPlate,
      chute_id: chuteId,
      total_parcels: selectedOrders.length,
      total_weight_kg: Number(totalWeight.toFixed(2)),
      total_cod_amount: totalCod,
      status: 'PENDING_SIGNATURE',
      created_at: now,
      signed_at: null,
      supervisor_signature: null,
      driver_signature: null
    };

    if (!this.state.manifests) this.state.manifests = [];
    this.state.manifests.unshift(newManifest);
    this.notify('manifests', 'INSERT', newManifest);

    return { manifest: newManifest, orders: selectedOrders };
  }

  signAndHandoverManifest({
    manifestId,
    supervisorSignature = 'DATA_SIG_SUPERVISOR',
    driverSignature = 'DATA_SIG_DRIVER',
    supervisorUserId = 'usr-supervisor-01'
  }) {
    const manifest = (this.state.manifests || []).find(m => m.id === manifestId);
    if (!manifest) return null;

    const now = new Date().toISOString();
    manifest.status = 'HANDED_OVER_SHIPPED';
    manifest.signed_at = now;
    manifest.supervisor_signature = supervisorSignature;
    manifest.driver_signature = driverSignature;

    const ordersToShip = this.state.orders.filter(
      o => o.courier_id === manifest.courier_id && ['PACKED', 'ALLOCATED', 'READY_TO_SHIP'].includes(o.wms_status)
    );

    ordersToShip.forEach(o => {
      o.wms_status = 'SHIPPED';
      o.marketplace_status = 'SHIPPED';
      o.shipped_at = now;

      const items = (this.state.order_items || []).filter(oi => oi.order_id === o.id);
      items.forEach(it => {
        it.status = 'SHIPPED';

        // Mutate inventory: PACKED -> EXTERNAL_3PL_CARRIER
        this.mutateInventory({
          masterSkuId: it.master_sku_id,
          batchId: 'batch-lot-01',
          fromBinId: 'bin-stage-a04',
          toBinId: null,
          fromState: 'PACKED',
          toState: 'EXTERNAL_3PL_CARRIER',
          quantity: it.ordered_qty,
          transactionType: '3PL_DISPATCH_HANDOVER',
          referenceDocType: 'MANIFEST_BAST',
          referenceDocId: manifest.manifest_number,
          userId: supervisorUserId
        });
      });

      this.notify('orders', 'UPDATE', o);
    });

    this.notify('manifests', 'UPDATE', manifest);
    return { manifest, shippedOrdersCount: ordersToShip.length };
  }

  // --- Phase 6: Packing Bench & BOM Verification ---
  completeOrderPacking({
    orderId,
    packagingBox = 'BOX_MEDIUM',
    actualWeightKg = 0.65,
    packerUserId = 'usr-packer-02'
  }) {
    const order = this.getItem('orders', orderId);
    if (!order) return null;

    const now = new Date().toISOString();
    order.wms_status = 'PACKED';
    order.marketplace_status = 'READY_TO_SHIP';
    order.packed_at = now;
    order.packaging_box = packagingBox;
    order.actual_weight_kg = actualWeightKg;

    const items = (this.state.order_items || []).filter(oi => oi.order_id === order.id);
    items.forEach(it => {
      it.status = 'PACKED';
      it.packed_qty = it.ordered_qty;

      // Mutate inventory: PICKED -> PACKED
      this.mutateInventory({
        masterSkuId: it.master_sku_id,
        batchId: 'batch-lot-01',
        fromBinId: 'bin-stage-a04',
        toBinId: 'bin-stage-a04',
        fromState: 'PICKED',
        toState: 'PACKED',
        quantity: it.ordered_qty,
        transactionType: 'PACK_VERIFICATION',
        referenceDocType: 'ORDER',
        referenceDocId: order.order_code,
        userId: packerUserId
      });
    });

    this.notify('orders', 'UPDATE', order);
    return order;
  }

  // --- Phase 5: PDA Handheld Picking Execution ---
  completePdaPickItem({
    taskId = 'pt-001',
    skuId = 'sku-ajwa-500g',
    binId = 'bin-pick-b01',
    qtyPicked = 24
  }) {
    const task = this.getItem('pick_tasks', taskId) || this.state.pick_tasks[0];
    if (!task) return null;

    task.total_items_picked = Math.min(task.total_items_to_pick, (task.total_items_picked || 0) + qtyPicked);
    if (task.total_items_picked >= task.total_items_to_pick) {
      task.status = 'PICKED';
    }

    // Mutate state: ALLOCATED -> PICKED
    this.mutateInventory({
      masterSkuId: skuId,
      batchId: 'batch-lot-01',
      fromBinId: binId,
      toBinId: binId,
      fromState: 'ALLOCATED',
      toState: 'PICKED',
      quantity: qtyPicked,
      transactionType: 'PICK_EXECUTION',
      referenceDocType: 'PICK_TASK',
      referenceDocId: task.task_number,
      userId: 'usr-pick-01'
    });

    this.notify('pick_tasks', 'UPDATE', task);
    return { task, qtyPicked };
  }

  handoverPdaToStaging({
    taskId = 'pt-001',
    stagingBinId = 'bin-stage-a04'
  }) {
    const task = this.getItem('pick_tasks', taskId) || this.state.pick_tasks[0];
    if (!task) return null;

    task.status = 'HANDED_OVER_STAGING';

    if (task.wave_id) {
      const wave = this.getItem('waves', task.wave_id);
      if (wave) {
        wave.status = 'READY_TO_PACK';
        this.notify('waves', 'UPDATE', wave);
      }
    }

    // Move from pick bins to STAGE-A-04
    this.mutateInventory({
      masterSkuId: 'sku-ajwa-500g',
      batchId: 'batch-lot-01',
      fromBinId: 'bin-pick-b01',
      toBinId: stagingBinId,
      fromState: 'PICKED',
      toState: 'PICKED',
      quantity: 5,
      transactionType: 'STAGING_HANDOVER',
      referenceDocType: 'PICK_TASK',
      referenceDocId: task.task_number,
      userId: 'usr-pick-01'
    });

    this.notify('pick_tasks', 'UPDATE', task);
    return task;
  }

  // --- Phase 5: In-Flight Cancel Intercept Trigger ---
  simulateCancelIntercept(orderId = null) {
    let order = orderId ? this.getItem('orders', orderId) : this.state.orders.find(o => ['ALLOCATED', 'BATCHED_IN_WAVE', 'PICKING'].includes(o.wms_status));
    if (!order) order = this.state.orders[0];
    if (!order) return null;

    const previousStatus = order.wms_status;
    order.wms_status = 'CANCELLED';
    order.marketplace_status = 'CANCELLED';
    order.is_in_flight_cancelled = true;
    order.cancel_reason = 'Cancelled by Buyer on Marketplace (In-Flight Intercept)';

    const item = (this.state.order_items || []).find(oi => oi.order_id === order.id);
    const qty = item ? item.ordered_qty : 1;
    const skuId = item ? item.master_sku_id : 'sku-ajwa-500g';
    const sku = this.getItem('master_skus', skuId);

    // Atomic double-entry release to RESTOCK-STAGE-01
    this.mutateInventory({
      masterSkuId: skuId,
      batchId: 'batch-lot-01',
      fromBinId: 'bin-pick-b01',
      toBinId: 'bin-restock-01',
      fromState: previousStatus === 'PICKING' ? 'PICKED' : 'ALLOCATED',
      toState: 'AVAILABLE',
      quantity: qty,
      transactionType: 'IN_FLIGHT_CANCEL_RESTOCK',
      referenceDocType: 'ORDER',
      referenceDocId: order.order_code,
      userId: 'usr-pda-04'
    });

    const cancelPayload = {
      order,
      item,
      sku,
      previousStatus,
      qty,
      toteId: 'TOTE-001',
      restockBin: 'RESTOCK-STAGE-01'
    };

    this.notify('orders', 'UPDATE', order);

    this.inFlightCancelCallbacks.forEach(cb => {
      try { cb(cancelPayload); } catch (e) { console.error(e); }
    });

    return cancelPayload;
  }

  // --- Phase 3: Stock Movement & Opname ---
  transferStock({
    masterSkuId,
    batchId = 'batch-lot-01',
    fromBinId,
    toBinId,
    quantity,
    reason = 'REPLENISHMENT_PICK_FACE',
    userId = 'usr-admin'
  }) {
    if (quantity <= 0 || fromBinId === toBinId) return null;

    const transferNum = `MVT-2026-08-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    this.mutateInventory({
      masterSkuId,
      batchId,
      fromBinId,
      toBinId,
      fromState: 'AVAILABLE',
      toState: 'AVAILABLE',
      quantity,
      transactionType: reason === 'REPLENISHMENT_PICK_FACE' ? 'REPLENISHMENT_TRANSFER' : 'INTERNAL_BIN_RELOCATION',
      referenceDocType: 'STOCK_TRANSFER',
      referenceDocId: transferNum,
      userId
    });

    const newTransfer = {
      id: 'txfr-' + Math.random().toString(36).substr(2, 9),
      transfer_number: transferNum,
      warehouse_id: 'wh-jkt-01',
      master_sku_id: masterSkuId,
      batch_id: batchId,
      from_bin_id: fromBinId,
      to_bin_id: toBinId,
      quantity,
      reason,
      status: 'COMPLETED',
      requested_by: userId,
      completed_at: now
    };

    if (!this.state.stock_transfers) this.state.stock_transfers = [];
    this.state.stock_transfers.unshift(newTransfer);
    this.notify('stock_transfers', 'INSERT', newTransfer);

    return newTransfer;
  }

  createOpnameSession({
    zoneId = 'zn-cold-01',
    sessionName = 'Routine Cycle Count Audit',
    auditedBy = 'usr-dock-01'
  }) {
    const code = `OPN-2026-08-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const newSession = {
      id: 'opn-' + Math.random().toString(36).substr(2, 9),
      opname_code: code,
      warehouse_id: 'wh-jkt-01',
      zone_id: zoneId,
      session_name: sessionName,
      status: 'IN_PROGRESS',
      total_bins_audited: 0,
      total_variance_units: 0,
      audited_by: auditedBy,
      approved_by: null,
      created_at: now,
      completed_at: null
    };

    if (!this.state.stock_opname_sessions) this.state.stock_opname_sessions = [];
    this.state.stock_opname_sessions.unshift(newSession);
    this.notify('stock_opname_sessions', 'INSERT', newSession);

    return newSession;
  }

  submitOpnameCount({
    opnameId,
    binId,
    masterSkuId,
    batchId = 'batch-lot-01',
    physicalCount,
    reasonCode = 'SHRINKAGE_SAMPLED',
    approvedBy = 'usr-supervisor-01'
  }) {
    const session = this.getItem('stock_opname_sessions', opnameId);
    if (!session) return null;

    const currentBal = (this.state.inventory_balances || []).find(
      b => b.bin_id === binId && b.master_sku_id === masterSkuId
    );
    const systemQty = currentBal ? currentBal.qty_available : 0;
    const variance = physicalCount - systemQty;
    const now = new Date().toISOString();

    if (variance !== 0) {
      if (variance < 0) {
        this.mutateInventory({
          masterSkuId,
          batchId,
          fromBinId: binId,
          toBinId: null,
          fromState: 'AVAILABLE',
          toState: 'EXTERNAL_ADJUSTMENT_LOSS',
          quantity: Math.abs(variance),
          transactionType: 'OPNAME_VARIANCE_SHRINKAGE',
          referenceDocType: 'STOCK_OPNAME',
          referenceDocId: session.opname_code,
          userId: approvedBy
        });
      } else {
        this.mutateInventory({
          masterSkuId,
          batchId,
          fromBinId: null,
          toBinId: binId,
          fromState: 'EXTERNAL_ADJUSTMENT_FOUND',
          toState: 'AVAILABLE',
          quantity: variance,
          transactionType: 'OPNAME_VARIANCE_SURPLUS',
          referenceDocType: 'STOCK_OPNAME',
          referenceDocId: session.opname_code,
          userId: approvedBy
        });
      }
    }

    const opnameItem = {
      id: 'opni-' + Math.random().toString(36).substr(2, 9),
      opname_id: session.id,
      bin_id: binId,
      master_sku_id: masterSkuId,
      batch_id: batchId,
      system_qty: systemQty,
      physical_qty: physicalCount,
      variance_qty: variance,
      reason_code: reasonCode,
      status: 'ADJUSTED_TO_LEDGER'
    };

    if (!this.state.stock_opname_items) this.state.stock_opname_items = [];
    this.state.stock_opname_items.unshift(opnameItem);

    session.total_bins_audited = (session.total_bins_audited || 0) + 1;
    session.total_variance_units = (session.total_variance_units || 0) + variance;
    session.status = 'COMPLETED';
    session.approved_by = approvedBy;
    session.completed_at = now;

    this.notify('stock_opname_items', 'INSERT', opnameItem);
    this.notify('stock_opname_sessions', 'UPDATE', session);

    return { opnameItem, variance, session };
  }

  // --- Inbound Logistics Methods ---
  receiveInboundItem({
    asnId,
    masterSkuId,
    lotNumber,
    manufactureDate = '2026-07-01',
    expiryDate = '2027-12-31',
    qtyGood = 0,
    qtyDamaged = 0,
    targetBinId = 'bin-pick-b01',
    userId = 'usr-dock-01'
  }) {
    const asn = this.getItem('asn_shipments', asnId);
    if (!asn) return null;

    const now = new Date().toISOString();

    let batch = (this.state.inventory_batches || []).find(
      b => b.master_sku_id === masterSkuId && b.lot_number === lotNumber
    );
    if (!batch) {
      batch = {
        id: 'batch-' + Math.random().toString(36).substr(2, 9),
        warehouse_id: 'wh-jkt-01',
        master_sku_id: masterSkuId,
        lot_number: lotNumber,
        manufacture_date: manufactureDate,
        expiry_date: expiryDate,
        qc_status: 'APPROVED'
      };
      if (!this.state.inventory_batches) this.state.inventory_batches = [];
      this.state.inventory_batches.push(batch);
      this.notify('inventory_batches', 'INSERT', batch);
    }

    const dockBinId = asn.dock_bin_id || 'bin-dock-01';

    if (qtyGood > 0) {
      this.mutateInventory({
        masterSkuId,
        batchId: batch.id,
        fromBinId: null,
        toBinId: dockBinId,
        fromState: 'EXTERNAL_SUPPLIER',
        toState: 'AVAILABLE',
        quantity: qtyGood,
        transactionType: 'INBOUND_RECEIVE',
        referenceDocType: 'ASN',
        referenceDocId: asn.asn_number,
        userId
      });

      this.mutateInventory({
        masterSkuId,
        batchId: batch.id,
        fromBinId: dockBinId,
        toBinId: targetBinId,
        fromState: 'AVAILABLE',
        toState: 'AVAILABLE',
        quantity: qtyGood,
        transactionType: 'PUTAWAY',
        referenceDocType: 'ASN',
        referenceDocId: asn.asn_number,
        userId
      });

      const putawayTask = {
        id: 'pat-' + Math.random().toString(36).substr(2, 9),
        task_number: `PUT-2026-08-${Math.floor(100 + Math.random() * 900)}`,
        asn_id: asn.id,
        master_sku_id: masterSkuId,
        batch_id: batch.id,
        from_bin_id: dockBinId,
        target_bin_id: targetBinId,
        quantity: qtyGood,
        status: 'COMPLETED',
        assigned_user_id: userId,
        completed_at: now
      };
      if (!this.state.putaway_tasks) this.state.putaway_tasks = [];
      this.state.putaway_tasks.unshift(putawayTask);
      this.notify('putaway_tasks', 'INSERT', putawayTask);
    }

    if (qtyDamaged > 0) {
      this.mutateInventory({
        masterSkuId,
        batchId: batch.id,
        fromBinId: null,
        toBinId: 'bin-quarantine-01',
        fromState: 'EXTERNAL_SUPPLIER',
        toState: 'QUARANTINE',
        quantity: qtyDamaged,
        transactionType: 'INBOUND_DAMAGE_QUARANTINE',
        referenceDocType: 'ASN',
        referenceDocId: asn.asn_number,
        userId
      });
    }

    let asnItem = (this.state.asn_items || []).find(
      ai => ai.asn_id === asn.id && ai.master_sku_id === masterSkuId
    );
    if (!asnItem) {
      asnItem = {
        id: 'asni-' + Math.random().toString(36).substr(2, 9),
        asn_id: asn.id,
        master_sku_id: masterSkuId,
        expected_qty: qtyGood + qtyDamaged,
        received_good_qty: 0,
        received_damaged_qty: 0,
        lot_number: lotNumber,
        expiry_date: expiryDate,
        status: 'RECEIVING'
      };
      if (!this.state.asn_items) this.state.asn_items = [];
      this.state.asn_items.push(asnItem);
    }

    asnItem.received_good_qty = (asnItem.received_good_qty || 0) + qtyGood;
    asnItem.received_damaged_qty = (asnItem.received_damaged_qty || 0) + qtyDamaged;
    asnItem.lot_number = lotNumber;
    asnItem.expiry_date = expiryDate;
    asnItem.status = asnItem.received_good_qty + asnItem.received_damaged_qty >= asnItem.expected_qty ? 'RECEIVED' : 'RECEIVING';

    asn.received_good_count = (asn.received_good_count || 0) + qtyGood;
    asn.received_damaged_count = (asn.received_damaged_count || 0) + qtyDamaged;
    asn.status = asn.received_good_count + asn.received_damaged_count >= asn.expected_items_count ? 'COMPLETED' : 'RECEIVING_IN_PROGRESS';
    if (asn.status === 'COMPLETED') asn.completed_at = now;

    this.notify('asn_items', 'UPDATE', asnItem);
    this.notify('asn_shipments', 'UPDATE', asn);

    return { asn, batch, qtyGood, qtyDamaged };
  }

  simulateIncomingAsn() {
    const sup = this.state.suppliers[Math.floor(Math.random() * this.state.suppliers.length)];
    const sku = this.state.master_skus[Math.floor(Math.random() * this.state.master_skus.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const now = new Date().toISOString();

    const newAsn = {
      id: 'asn-' + Math.random().toString(36).substr(2, 9),
      asn_number: `ASN-2026-08-${num}`,
      po_number: `PO-2026-08-${num + 20}`,
      supplier_id: sup.id,
      supplier_name: sup.name,
      warehouse_id: 'wh-jkt-01',
      dock_bin_id: Math.random() > 0.5 ? 'bin-dock-01' : 'bin-dock-02',
      container_number: `MSKU-${Math.floor(100000 + Math.random() * 900000)}-${Math.floor(Math.random() * 9)}`,
      truck_plate_number: `B-${Math.floor(1000 + Math.random() * 9000)}-${['UDF', 'TEX', 'PDF', 'JKT'][Math.floor(Math.random() * 4)]}`,
      expected_items_count: 200,
      received_good_count: 0,
      received_damaged_count: 0,
      status: 'ARRIVED_AT_DOCK',
      eta: now,
      arrived_at: now,
      completed_at: null
    };

    const newAsnItem = {
      id: 'asni-' + Math.random().toString(36).substr(2, 9),
      asn_id: newAsn.id,
      master_sku_id: sku.id,
      expected_qty: 200,
      received_good_qty: 0,
      received_damaged_qty: 0,
      lot_number: `LOT-2026-${sku.sku_code.substring(4, 7)}-${num}`,
      expiry_date: '2027-12-31',
      status: 'PENDING'
    };

    if (!this.state.asn_shipments) this.state.asn_shipments = [];
    if (!this.state.asn_items) this.state.asn_items = [];

    this.state.asn_shipments.unshift(newAsn);
    this.state.asn_items.unshift(newAsnItem);

    this.notify('asn_shipments', 'INSERT', newAsn);
    this.notify('asn_items', 'INSERT', newAsnItem);

    return newAsn;
  }

  // --- Manual Discrete Pick Assignment ---
  assignManualPick({
    orderIds = [],
    pickerUserId = 'usr-pick-01',
    toteId = 'TOTE-004'
  }) {
    if (!orderIds.length) return null;

    const taskNum = Math.floor(1000 + Math.random() * 9000);
    const taskId = 'pt-' + Math.random().toString(36).substr(2, 9);
    const taskNumber = `PT-MANUAL-${taskNum}`;
    const now = new Date().toISOString();

    let totalItems = 0;
    const selectedOrders = this.state.orders.filter(o => orderIds.includes(o.id));
    selectedOrders.forEach(o => {
      o.wms_status = 'PICKING';
      const items = this.state.order_items.filter(oi => oi.order_id === o.id);
      items.forEach(it => {
        totalItems += it.ordered_qty;
        it.status = 'PICKING';
      });
    });

    const courierName = this.getItem('couriers', selectedOrders[0]?.courier_id)?.name || 'Multi-Carrier';
    const isVip = selectedOrders.some(o => o.sla_tier === 'INSTANT_2H');

    const newPickTask = {
      id: taskId,
      task_number: taskNumber,
      taskCode: taskNumber,
      wave_id: null,
      waveCode: 'DISCRETE-PICK',
      orderCode: selectedOrders.length === 1 ? selectedOrders[0].order_code : `${selectedOrders.length} Orders (${selectedOrders[0].order_code})`,
      warehouse_id: 'wh-jkt-01',
      task_type: 'MANUAL_DISCRETE_PICK',
      picker_user_id: pickerUserId,
      assigned_tote_id: toteId,
      status: 'IN_PROGRESS',
      confirmed: false,
      ordersCount: selectedOrders.length,
      itemsCount: totalItems,
      total_items_to_pick: totalItems,
      total_items_picked: 0,
      zone: 'Cold Storage ZN-01',
      priority: isVip ? 'VIP_INSTANT' : 'NORMAL',
      courier: courierName,
      created_at: now
    };

    if (!this.state.pick_tasks) this.state.pick_tasks = [];
    this.state.pick_tasks.unshift(newPickTask);

    this.notify('pick_tasks', 'INSERT', newPickTask);
    this.notify('orders', 'UPDATE', selectedOrders[0]);

    return { pickTask: newPickTask, ordersCount: selectedOrders.length, totalItems };
  }

  // --- Wave Generation Engine ---
  createWave({
    warehouseId = 'wh-jkt-01',
    waveType = 'CARRIER_CUTOFF_BATCH',
    courierId = 'courier-spx',
    deliveryTier = 'REGULAR',
    orderIds = [],
    waveStrategy = 'S_SHAPE',
    pickerUserId = 'usr-pick-01',
    toteId = 'TOTE-001'
  }) {
    if (!orderIds.length) {
      const allocated = this.state.orders.filter(o => o.wms_status === 'ALLOCATED');
      orderIds = allocated.map(o => o.id);
    }

    if (!orderIds.length) return null;

    const waveNum = Math.floor(1000 + Math.random() * 9000);
    const waveId = 'wv-' + Math.random().toString(36).substr(2, 9);
    const waveNumber = `WV-2026-08-${waveNum}`;
    const now = new Date().toISOString();

    let totalItems = 0;
    const selectedOrders = this.state.orders.filter(o => orderIds.includes(o.id));
    selectedOrders.forEach(o => {
      o.wms_status = 'BATCHED_IN_WAVE';
      const items = this.state.order_items.filter(oi => oi.order_id === o.id);
      items.forEach(it => totalItems += it.ordered_qty);
    });

    const newWave = {
      id: waveId,
      wave_number: waveNumber,
      warehouse_id: warehouseId,
      wave_type: waveType,
      courier_id: courierId,
      delivery_tier: deliveryTier,
      total_orders_count: selectedOrders.length,
      total_items_count: totalItems,
      status: 'IN_PICKING',
      wave_strategy: waveStrategy,
      created_at: now
    };

    const taskId = 'pt-' + Math.random().toString(36).substr(2, 9);
    const taskNumber = `PT-2026-08-${waveNum}`;
    const courierObj = this.getItem('couriers', courierId);
    const isVip = selectedOrders.some(o => o.sla_tier === 'INSTANT_2H');

    const newPickTask = {
      id: taskId,
      task_number: taskNumber,
      taskCode: taskNumber,
      wave_id: waveId,
      waveCode: waveNumber,
      orderCode: selectedOrders.length === 1 ? selectedOrders[0].order_code : `${selectedOrders.length} Orders (${selectedOrders[0].order_code})`,
      warehouse_id: warehouseId,
      picker_user_id: pickerUserId,
      assigned_tote_id: toteId,
      status: 'IN_PROGRESS',
      confirmed: false,
      ordersCount: selectedOrders.length,
      itemsCount: totalItems,
      total_items_to_pick: totalItems,
      total_items_picked: 0,
      zone: 'Cold Storage ZN-01',
      priority: isVip ? 'VIP_INSTANT' : 'NORMAL',
      courier: courierObj ? courierObj.name : 'Multi-Carrier',
      created_at: now
    };

    if (!this.state.waves) this.state.waves = [];
    if (!this.state.pick_tasks) this.state.pick_tasks = [];

    this.state.waves.unshift(newWave);
    this.state.pick_tasks.unshift(newPickTask);

    this.notify('waves', 'INSERT', newWave);
    this.notify('pick_tasks', 'INSERT', newPickTask);
    this.notify('orders', 'UPDATE', selectedOrders[0]);

    return { wave: newWave, pickTask: newPickTask, ordersCount: selectedOrders.length };
  }

  simulateIncomingOrder(channelCode = null) {
    const stores = this.state.marketplace_stores;
    let selectedStore = channelCode 
      ? stores.find(s => s.channel_id.toLowerCase().includes(channelCode.toLowerCase()))
      : stores[Math.floor(Math.random() * stores.length)];

    if (!selectedStore) selectedStore = stores[0];

    const orderNum = Math.floor(1000 + Math.random() * 9000);
    const orderId = 'ord-' + Math.random().toString(36).substr(2, 9);
    const orderCode = `ORD-2026-08-${orderNum}`;
    const extOrderId = `${selectedStore.store_code}-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const now = new Date().toISOString();

    const isInstant = Math.random() > 0.75;
    const isCargo = !isInstant && Math.random() > 0.8;
    const isCod = Math.random() > 0.6;
    const sku = Math.random() > 0.5 ? this.state.master_skus[0] : this.state.master_skus[1];
    const qty = isCargo ? Math.floor(5 + Math.random() * 10) : Math.floor(1 + Math.random() * 3);

    const courierId = isInstant ? 'courier-gosend' : (isCargo ? 'courier-sicepat' : (Math.random() > 0.5 ? 'courier-spx' : 'courier-jnt'));
    const serviceId = isInstant ? 'srv-gosend-inst' : (isCargo ? 'srv-sicepat-gokil' : (courierId === 'courier-spx' ? 'srv-spx-std' : 'srv-jnt-ez'));

    const newOrder = {
      id: orderId,
      order_code: orderCode,
      store_id: selectedStore.id,
      channel_id: selectedStore.channel_id,
      merchant_name: selectedStore.merchant_name,
      warehouse_id: 'wh-jkt-01',
      external_order_id: extOrderId,
      external_order_sn: `INV/20260817/${selectedStore.store_code}/${orderNum}`,
      marketplace_status: 'READY_TO_SHIP',
      wms_status: 'ALLOCATED',
      order_profile: qty > 1 ? 'MULTI_ITEM_SINGLE_SKU' : 'SINGLE_ITEM_SINGLE_SKU',
      sla_tier: isInstant ? 'INSTANT_2H' : (isCargo ? 'CARGO_BULKY' : 'REGULAR'),
      priority_level: isInstant ? 1 : (isCargo ? 4 : 3),
      recipient_name: ['Hendra Wijaya', 'Rina Marlina', 'Agus Setiawan', 'Putri Diana', 'Budi Hartono', 'Novi Safitri'][Math.floor(Math.random() * 6)],
      recipient_city: ['Jakarta Barat', 'Jakarta Selatan', 'Tangerang', 'Bekasi', 'Depok'][Math.floor(Math.random() * 5)],
      courier_id: courierId,
      courier_service_id: serviceId,
      awb_number: isInstant ? `GK-${Math.floor(10000000 + Math.random() * 90000000)}` : (isCargo ? `SICGOKIL${Math.floor(1000000 + Math.random() * 9000000)}` : `SPXID02${Math.floor(10000000 + Math.random() * 90000000)}`),
      is_cod: isCod,
      total_order_amount: (sku.weight_kg > 1 ? 135000 : 95000) * qty,
      allocated_at: now,
      created_at: now
    };

    const newOrderItem = {
      id: 'oi-' + Math.random().toString(36).substr(2, 9),
      order_id: orderId,
      master_sku_id: sku.id,
      item_name: sku.name,
      ordered_qty: qty,
      allocated_qty: qty,
      picked_qty: 0,
      packed_qty: 0,
      unit_price: sku.weight_kg > 1 ? 135000 : 95000,
      status: 'ALLOCATED'
    };

    this.state.orders.unshift(newOrder);
    this.state.order_items.push(newOrderItem);

    this.mutateInventory({
      masterSkuId: sku.id,
      fromBinId: sku.id === 'sku-ajwa-500g' ? 'bin-pick-b01' : 'bin-pick-b02',
      toBinId: sku.id === 'sku-ajwa-500g' ? 'bin-pick-b01' : 'bin-pick-b02',
      fromState: 'AVAILABLE',
      toState: 'ALLOCATED',
      quantity: qty,
      transactionType: 'ORDER_RESERVE',
      referenceDocType: 'ORDER',
      referenceDocId: orderCode
    });

    this.notify('orders', 'INSERT', newOrder);
    this.notify('order_items', 'INSERT', newOrderItem);

    return newOrder;
  }

  // --- Real-Time PDA Order Dispatch Bridge ---
  assignOrderToPda(orderIdOrCode, pickerId = 'pda-04') {
    let order = typeof orderIdOrCode === 'string' && orderIdOrCode.startsWith('ord-')
      ? this.getItem('orders', orderIdOrCode)
      : this.state.orders.find(o => o.order_code === orderIdOrCode || o.id === orderIdOrCode);

    if (!order) order = this.state.orders[0];

    const taskNum = Math.floor(100 + Math.random() * 900);
    const taskCode = `PT-2026-08-${taskNum}`;
    const items = (this.state.order_items || []).filter(oi => oi.order_id === order.id);
    const totalQty = items.reduce((acc, it) => acc + (it.allocated_qty || it.ordered_qty || 1), 0);
    const courier = this.getItem('couriers', order.courier_id);

    const taskPayload = {
      id: 'pt-' + Math.random().toString(36).substr(2, 9),
      taskCode,
      waveCode: `WV-2026-08-${taskNum}`,
      orderId: order.id,
      orderCode: order.order_code,
      ordersCount: 1,
      itemsCount: totalQty || 1,
      zone: 'Cold Storage ZN-01',
      priority: order.sla_tier === 'INSTANT_2H' ? 'VIP_INSTANT' : 'NORMAL',
      courier: courier ? courier.name : (order.courier_id || 'Shopee Xpress'),
      pickerId: pickerId,
      assignedAt: new Date().toISOString()
    };

    order.wms_status = 'WAVED';
    this.notify('orders', 'UPDATE', order);
    this.notify('pda_task_assigned', 'INSERT', taskPayload);

    return taskPayload;
  }

  onOrderAssignedToPda(callback) {
    return this.subscribe((entity, op, payload) => {
      if (entity === 'pda_task_assigned') {
        callback(payload);
      }
    });
  }
}

export const store = new MockStore();
