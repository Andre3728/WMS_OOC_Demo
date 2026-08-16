/**
 * SuperDates WMS - Mobile PDA Handheld Picking & 3PL Sortation Terminal (v4.0)
 * Upgraded Features:
 * 1. Native Integration with Existing Assignment Logic (createWave & assignManualPick):
 *    - Subscribes directly to 'pick_tasks' store entity.
 *    - Whenever orders are batched into a wave or manually dispatched in WMS, PDA automatically receives the task in real-time, chimes, and triggers the Incoming Task Assignment Confirmation Modal.
 *    - Floating Pending Task FAB / Banner safely holds unconfirmed tasks if the modal is dismissed or during network lag.
 *    - Mandatory Physical Tote Barcode scan gate before starting pick sequence.
 * 2. Continuous 3PL Chute Sorting Loop (Zero-Friction UX):
 *    - Scanning AWB barcode auto-triggers immediate Chute Validation Modal Popup.
 *    - Prompts target chute location (e.g. CHUTE-SPX-01).
 *    - Scanning correct chute auto-closes popup and resets input ready for next parcel.
 *    - Scanning mismatched chute triggers audible error buzzer & prominent Reject Warning Display.
 * 3. Manual Route Card List UX:
 *    - Tapping card opens 2-step verification modal (Rack Scan + SKU Barcode Scan + Picked Qty Input).
 *    - Auto-closes on confirm and updates card status to '✓ PICKED'.
 * 4. Real-time In-Flight Marketplace Cancel Intercept Engine.
 */

import { store } from '../mock/mockStore.js';
import { sound } from './wms-audio.js';

class WmsPdaTerminal extends HTMLElement {
  constructor() {
    super();

    // Navigation Tab: 'picking' | 'sortation'
    this.pdaTab = 'picking';

    // Route Mode: 'system_batch' | 'manual_route'
    this.pickingRouteMode = 'manual_route';

    // Manual Route Pick Modal State
    this.showManualPickModal = false;
    this.selectedManualItem = null;
    this.manualPickedQty = 1;
    this.manualRackScanned = false;
    this.manualSkuScanned = false;

    // Task Confirmation & Tote Gate
    this.showTaskAssignmentModal = false;
    this.pendingTasks = [
      {
        id: 'pt-001',
        taskCode: 'PT-2026-08-001',
        waveCode: 'WV-2026-08-001',
        orderCode: 'ORD-2026-08-0001',
        ordersCount: 3,
        itemsCount: 48,
        zone: 'Cold Storage ZN-01',
        priority: 'NORMAL',
        courier: 'Shopee Xpress / Tokopedia',
        confirmed: true
      }
    ];
    this.selectedTaskIds = new Set(['pt-001']);
    this.scannedToteBarcode = '';
    this.activeTote = 'TOTE-001';
    this.isTaskConfirmed = true;

    // Picking Sequence Items
    this.pickItems = [
      {
        id: 'item-1',
        seq: 10,
        binCode: 'ZN01-A01-R01-L01-B01',
        binBarcode: 'LOC-A01-R01-L01',
        aisle: 'Aisle A01 • Cold Storage (Left Rack)',
        skuId: 'sku-ajwa-500g',
        skuName: 'Kurma Ajwa Madinah Premium 500g',
        skuBarcode: '8991001234561',
        lotNumber: 'LOT-2026-AJW-01',
        qtyToPick: 24,
        isPicked: false
      },
      {
        id: 'item-2',
        seq: 20,
        binCode: 'ZN01-A01-R01-L01-B02',
        binBarcode: 'LOC-A01-R01-L02',
        aisle: 'Aisle A01 • Cold Storage (Right Rack)',
        skuId: 'sku-sukari-1kg',
        skuName: 'Kurma Sukari Al Qassim Basah 1kg',
        skuBarcode: '8991001234578',
        lotNumber: 'LOT-2026-SUK-01',
        qtyToPick: 18,
        isPicked: false
      },
      {
        id: 'item-3',
        seq: 30,
        binCode: 'ZN01-A01-R01-L02-B03',
        binBarcode: 'LOC-A01-R01-L03',
        aisle: 'Aisle A02 • Cold Storage (Left Rack)',
        skuId: 'sku-medjool-1kg',
        skuName: 'Kurma Medjool Jumbo California 1kg',
        skuBarcode: '8991001234585',
        lotNumber: 'LOT-2026-MED-01',
        qtyToPick: 6,
        isPicked: false
      }
    ];

    this.activeItemIndex = 0;
    this.binVerified = false;
    this.activeCancelIntercept = null;

    // Continuous 3PL Sortation State on PDA
    this.sortState = {
      pendingParcelsCount: 14,
      todaySortedCount: 28,
      scannedAwb: '',
      parcelData: null,
      showChuteValidationModal: false,
      mismatchError: null,
      lastSortedMessage: '',
      chuteLoads: {
        'CHUTE-SPX-01': 18,
        'CHUTE-JNT-01': 12,
        'CHUTE-INST-01': 4,
        'CHUTE-SIC-01': 6
      }
    };

    this.sampleParcels = [
      { awb: 'SPXID029910012345', courier: 'Shopee Xpress Standard', chuteId: 'CHUTE-SPX-01', bay: 'Bay 01 (SPX Outbound)', orderCode: 'ORD-2026-08-0001', buyer: 'Rian Hidayat (Jakarta Selatan)' },
      { awb: 'JNT984729103819', courier: 'J&T Express EZ', chuteId: 'CHUTE-JNT-01', bay: 'Bay 02 (J&T Regular)', orderCode: 'ORD-2026-08-0002', buyer: 'Dewi Lestari (Bandung)' },
      { awb: 'GOSEND-VIP-8812', courier: 'GoSend VIP Instant', chuteId: 'CHUTE-INST-01', bay: 'Bay 03 (Instant 2h SLA)', orderCode: 'ORD-2026-08-0005', buyer: 'Bambang Soediro (Jakarta Pusat)' },
      { awb: 'SIC-GOKIL-44102', courier: 'SiCepat Cargo Gokil', chuteId: 'CHUTE-SIC-01', bay: 'Bay 04 (Cargo Bulky)', orderCode: 'ORD-2026-08-0003', buyer: 'Ahmad Fauzi (Surabaya)' }
    ];
  }

  connectedCallback() {
    // 1. In-Flight Cancel Intercept Subscriber
    this.unsubscribeCancel = store.onInFlightCancel((payload) => {
      this.activeCancelIntercept = payload;
      sound.play('error');
      this.render();
    });

    // 2. Real-Time Pick Task Assignment Subscriber (Hooks into existing createWave and assignManualPick)
    this.unsubscribePickTasks = store.subscribe('pick_tasks', (action, pickTask) => {
      if (action === 'INSERT' && pickTask) {
        this.handleIncomingPickTask(pickTask);
      }
    });

    this.render();
  }

  disconnectedCallback() {
    if (this.unsubscribeCancel) this.unsubscribeCancel();
    if (this.unsubscribePickTasks) this.unsubscribePickTasks();
  }

  // --- Real-time Handler for Task Assigned in WMS ---
  handleIncomingPickTask(pickTask) {
    const formattedTask = {
      id: pickTask.id || ('pt-' + Math.random().toString(36).substr(2, 9)),
      taskCode: pickTask.taskCode || pickTask.task_number || 'PT-2026-08-001',
      waveCode: pickTask.waveCode || (pickTask.wave_id ? `WV-${pickTask.wave_id.substring(3, 7)}` : 'DISCRETE-PICK'),
      orderCode: pickTask.orderCode || 'Assigned Order',
      ordersCount: pickTask.ordersCount || 1,
      itemsCount: pickTask.itemsCount || pickTask.total_items_to_pick || 12,
      zone: pickTask.zone || 'Cold Storage ZN-01',
      priority: pickTask.priority || 'NORMAL',
      courier: pickTask.courier || 'Shopee Xpress / Tokopedia',
      confirmed: false
    };

    // Insert task into pending queue
    this.pendingTasks.unshift(formattedTask);
    this.selectedTaskIds.clear();
    this.selectedTaskIds.add(formattedTask.id);

    // Switch tab & trigger immediate confirmation popup on PDA
    this.pdaTab = 'picking';
    this.showTaskAssignmentModal = true;
    this.scannedToteBarcode = '';

    sound.play('scan');
    this.render();
  }

  render() {
    const totalItems = this.pickItems.reduce((acc, it) => acc + it.qtyToPick, 0);
    const pickedItems = this.pickItems.filter(it => it.isPicked).reduce((acc, it) => acc + it.qtyToPick, 0);
    const isAllPicked = this.pickItems.every(it => it.isPicked);
    const progressPct = totalItems > 0 ? Math.round((pickedItems / totalItems) * 100) : 0;

    const currentItem = this.pickItems[this.activeItemIndex] || this.pickItems[0];
    const unconfirmedTasks = this.pendingTasks.filter(t => !t.confirmed);

    this.innerHTML = `
      <div class="pda-frame-container">
        <div class="pda-device">
          <!-- Notch -->
          <div class="pda-notch">
            <div class="pda-camera"></div>
            <div class="pda-speaker"></div>
          </div>

          <!-- PDA Screen Viewport -->
          <div class="pda-screen">
            
            <!-- Handheld System Topbar -->
            <div class="pda-header">
              <div style="font-size:12px; font-weight:800; color:var(--primary); display:flex; align-items:center; gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
                <span>PDA #04 &bull; Budi S.</span>
              </div>

              <div style="display:flex; align-items:center; gap:6px;">
                <span class="badge badge-success" style="font-size:8.5px; padding:1px 5px;">ONLINE</span>
                <span class="mono" style="font-size:10px; font-weight:700; color:var(--text-muted);">94% ⚡</span>
              </div>
            </div>

            <!-- PDA Mode Switcher Tabs -->
            <div class="pda-nav-tabs">
              <button class="pda-nav-tab ${this.pdaTab === 'picking' ? 'active' : ''}" id="pda-tab-picking">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <span>Wave Picking</span>
              </button>

              <button class="pda-nav-tab ${this.pdaTab === 'sortation' ? 'active' : ''}" id="pda-tab-sortation">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="16 3 21 3 21 8"></polyline>
                  <line x1="4" y1="20" x2="21" y2="3"></line>
                  <polyline points="21 16 21 21 16 21"></polyline>
                  <line x1="15" y1="15" x2="21" y2="21"></line>
                </svg>
                <span>3PL Chute Sort</span>
              </button>
            </div>

            <!-- Floating Unconfirmed Pending Task Safety Banner (Handles Exception / Dismissal) -->
            ${unconfirmedTasks.length > 0 && !this.showTaskAssignmentModal ? `
              <div class="pda-floating-pending-banner" id="btn-reopen-pending-tasks" style="position:absolute; top:84px; left:10px; right:10px; background:#fffbeb; border:1.5px solid #f59e0b; border-radius:10px; padding:7px 10px; box-shadow:0 8px 15px -3px rgba(245, 158, 11, 0.25); display:flex; justify-content:space-between; align-items:center; z-index:800; cursor:pointer; animation:toastSlideIn 0.3s ease;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="pda-pulse-badge" style="background:#d97706; color:#ffffff; font-size:9px; font-weight:900; padding:2px 6px; border-radius:6px;">
                    ⚡ ${unconfirmedTasks.length} PENDING
                  </span>
                  <span style="font-size:10.5px; font-weight:800; color:#92400e;">Unconfirmed Task(s)</span>
                </div>
                <span style="font-size:10px; font-weight:700; color:#b45309; text-decoration:underline;">Tap to Confirm &rarr;</span>
              </div>
            ` : ''}

            <!-- Task Assignment Notification Popup Modal -->
            ${this.showTaskAssignmentModal ? this.renderTaskAssignmentModal() : ''}

            <!-- Continuous Chute Validation Popup Modal -->
            ${this.sortState.showChuteValidationModal && this.sortState.parcelData ? this.renderChuteValidationModal() : ''}

            <!-- Manual Route Card Click 2-Step Pick Verification Modal -->
            ${this.showManualPickModal && this.selectedManualItem ? this.renderManualPickModal() : ''}

            <!-- In-Flight Cancel Intercept Overlay Modal -->
            ${this.activeCancelIntercept ? this.renderCancelInterceptModal() : ''}

            <!-- Main Screen Body Content -->
            <div style="flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:10px;">
              ${this.pdaTab === 'picking' ? this.renderPickingTab(totalItems, pickedItems, isAllPicked, progressPct, currentItem) : this.renderSortationTab()}
            </div>

            <!-- Bottom Action Footer -->
            <div style="background:#ffffff; border-top:1px solid #e2e8f0; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
              <button class="btn btn-secondary" id="btn-pda-trigger-task-notif" style="padding:4px 8px; font-size:10.5px; display:flex; align-items:center; gap:4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span>Simulate Task</span>
              </button>

              <button class="btn btn-secondary" id="btn-pda-trigger-cancel" style="padding:4px 8px; font-size:10.5px; color:#dc2626; border-color:#fecaca; background:#fff1f2;">
                <span>Sim Cancel</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  // --- 1. Picking Tab (System Serpentine vs Manual Route) ---
  renderPickingTab(totalItems, pickedItems, isAllPicked, progressPct, currentItem) {
    const activeTask = this.pendingTasks.find(t => t.confirmed) || this.pendingTasks[0] || { taskCode: 'PT-2026-08-001', waveCode: 'WV-001' };

    return `
      <!-- Active Task Header -->
      <div style="background:#ffffff; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0; box-shadow:var(--shadow-xs);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-size:9.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Confirmed Pick Task</div>
            <div class="mono" style="font-size:14px; font-weight:800; color:var(--text-main);">${activeTask.taskCode}</div>
          </div>
          <div style="text-align:right;">
            <span class="badge badge-purple" style="font-size:9px; font-weight:800;">${this.activeTote}</span>
            <div style="font-size:9.5px; color:var(--text-dim); margin-top:2px;">${activeTask.waveCode}</div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:10.5px; margin-top:6px; margin-bottom:3px;">
          <span style="color:var(--text-dim);">Pick Progress (${pickedItems}/${totalItems} units)</span>
          <span class="mono" style="font-weight:700; color:var(--primary);">${progressPct}%</span>
        </div>
        <div style="width:100%; height:5px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
          <div style="width:${progressPct}%; height:100%; background:var(--primary); transition:width 0.3s;"></div>
        </div>
      </div>

      <!-- Route Mode Switcher Toolbar -->
      <div style="display:flex; background:#f1f5f9; padding:3px; border-radius:8px; gap:4px;">
        <button class="btn ${this.pickingRouteMode === 'manual_route' ? 'btn-primary' : 'btn-secondary'}" id="btn-mode-manual-route" style="flex:1; padding:4px 6px; font-size:10.5px; font-weight:700;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>Manual Route (Cards)</span>
        </button>

        <button class="btn ${this.pickingRouteMode === 'system_batch' ? 'btn-primary' : 'btn-secondary'}" id="btn-mode-system-batch" style="flex:1; padding:4px 6px; font-size:10.5px; font-weight:700;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
          </svg>
          <span>S-Shape Batch</span>
        </button>
      </div>

      <!-- Content based on pickingRouteMode -->
      ${isAllPicked ? `
        <!-- Completed Handover to Staging -->
        <div style="background:#ecfdf5; border:1px solid #a7f3d0; padding:14px; border-radius:10px; display:flex; flex-direction:column; gap:8px; text-align:center;">
          <div style="width:38px; height:38px; background:#059669; color:#ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div style="font-weight:800; color:#065f46; font-size:13.5px;">All Wave Items Picked (${totalItems}/${totalItems} Units)</div>
          <div style="font-size:11px; color:#047857;">
            Transport Tote <b class="mono">${this.activeTote}</b> to Staging Bay <b class="mono">STAGE-A-04</b>.
          </div>
        </div>

        <button class="btn btn-primary" id="btn-pda-handover-staging" style="padding:10px; font-size:12px; font-weight:800; width:100%; background:#059669;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          <span>Complete Staging Dropoff (STAGE-A-04)</span>
        </button>
      ` : (this.pickingRouteMode === 'manual_route' ? this.renderManualRouteCardList() : this.renderSystemBatchGuidedStep(currentItem))}
    `;
  }

  // --- Manual Route View: Card Order List with Location Info ---
  renderManualRouteCardList() {
    return `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:11px; font-weight:800; color:var(--text-main);">Picker-Decided Route Order</div>
          <span style="font-size:10px; color:var(--text-dim);">Tap card to scan & pick</span>
        </div>

        ${this.pickItems.map((item, idx) => `
          <div class="pda-order-card ${item.isPicked ? 'completed' : ''}" data-manual-pick-idx="${idx}" style="position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="badge ${item.isPicked ? 'badge-success' : 'badge-purple'}" style="font-size:9px;">
                  ${item.isPicked ? '✓ PICKED' : `STOP ${idx + 1}`}
                </span>
                <span class="mono" style="font-size:12px; font-weight:800; color:var(--primary);">${item.binCode}</span>
              </div>
              <span class="mono" style="font-size:12.5px; font-weight:900; color:${item.isPicked ? '#059669' : 'var(--text-main)'};">
                ${item.qtyToPick}x Units
              </span>
            </div>

            <!-- Location Rack Info -->
            <div style="display:flex; align-items:center; gap:4px; font-size:10px; color:var(--text-dim);">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${item.aisle}</span>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:6px; margin-top:2px;">
              <div style="font-weight:700; color:var(--text-main); font-size:11.5px;">${item.skuName}</div>
              <span class="mono" style="font-size:9.5px; color:var(--text-muted);">${item.lotNumber}</span>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
              <span style="font-size:9.5px; color:var(--text-dim);">Rack: <b class="mono">${item.binBarcode}</b></span>
              <span style="font-size:9.5px; font-weight:700; color:${item.isPicked ? '#059669' : 'var(--primary)'};">
                ${item.isPicked ? '✓ Completed' : 'Tap to Verify & Pick &rarr;'}
              </span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- Modal: 2-Step Barcode Scan Verification & Picked Qty Input (Auto-close on confirm) ---
  renderManualPickModal() {
    const item = this.selectedManualItem;
    const canConfirm = this.manualRackScanned && this.manualSkuScanned && this.manualPickedQty > 0;

    return `
      <div style="position:absolute; inset:0; background:rgba(15, 23, 42, 0.85); z-index:9999; display:flex; align-items:center; justify-content:center; padding:12px; animation:toastSlideIn 0.2s ease;">
        <div style="background:#ffffff; border-radius:16px; border:2px solid var(--primary); box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); padding:14px; width:100%; display:flex; flex-direction:column; gap:10px; max-height:94%; overflow-y:auto;">
          
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <span class="badge badge-purple" style="font-size:9px;">2-STEP PICK VERIFICATION</span>
              <div style="font-weight:900; color:var(--text-main); font-size:13px; margin-top:2px;">${item.skuName}</div>
              <div style="font-size:10px; color:var(--text-dim);">Lot: <b class="mono">${item.lotNumber}</b> &bull; Target: <b class="mono">${item.qtyToPick}x Units</b></div>
            </div>
            <button class="btn btn-secondary" id="btn-close-manual-modal" style="padding:2px 6px; font-size:11px;">✕</button>
          </div>

          <!-- Step 1: Scan Location Rack -->
          <div style="background:#f8fafc; border:1px solid ${this.manualRackScanned ? '#a7f3d0' : 'var(--primary)'}; padding:9px; border-radius:10px; display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="font-size:10px; font-weight:800; color:${this.manualRackScanned ? '#059669' : 'var(--primary)'}; text-transform:uppercase;">
                ${this.manualRackScanned ? '✓ 1. Location Rack Verified' : '1. Scan Location Rack Barcode'}
              </div>
              <span class="mono" style="font-size:10px; font-weight:800; color:var(--primary);">${item.binCode}</span>
            </div>

            <div style="font-size:9.5px; color:var(--text-dim);">${item.aisle}</div>

            ${!this.manualRackScanned ? `
              <button class="btn btn-primary" id="btn-pda-scan-rack-manual" style="width:100%; margin-top:4px; font-size:11px; font-weight:700;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                <span>Scan Rack (${item.binBarcode})</span>
              </button>
            ` : `
              <div style="background:#ecfdf5; border:1px solid #a7f3d0; padding:4px 8px; border-radius:6px; font-size:10px; color:#065f46; font-weight:700;">
                ✓ Verified Rack: ${item.binBarcode}
              </div>
            `}
          </div>

          <!-- Step 2: Scan SKU Item Barcode -->
          <div style="background:#f8fafc; border:1px solid ${this.manualSkuScanned ? '#a7f3d0' : (this.manualRackScanned ? 'var(--primary)' : '#e2e8f0')}; opacity:${this.manualRackScanned ? '1' : '0.6'}; padding:9px; border-radius:10px; display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="font-size:10px; font-weight:800; color:${this.manualSkuScanned ? '#059669' : 'var(--text-main)'}; text-transform:uppercase;">
                ${this.manualSkuScanned ? '✓ 2. SKU Barcode Verified' : '2. Scan SKU Item Barcode'}
              </div>
              <span class="mono" style="font-size:10px; color:var(--text-dim);">${item.skuBarcode}</span>
            </div>

            <div style="font-size:9.5px; color:var(--text-dim);">Verify item barcode matches order SKU</div>

            ${!this.manualSkuScanned ? `
              <button class="btn btn-primary" id="btn-pda-scan-sku-manual" ${this.manualRackScanned ? '' : 'disabled'} style="width:100%; margin-top:4px; font-size:11px; font-weight:700;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Scan SKU Barcode (${item.skuBarcode})</span>
              </button>
            ` : `
              <div style="background:#ecfdf5; border:1px solid #a7f3d0; padding:4px 8px; border-radius:6px; font-size:10px; color:#065f46; font-weight:700;">
                ✓ Verified Item Match: ${item.skuName}
              </div>
            `}
          </div>

          <!-- Step 3: Input Picked Quantity -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; opacity:${this.manualSkuScanned ? '1' : '0.6'}; padding:9px; border-radius:10px; display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:10px; font-weight:800; color:var(--text-main); text-transform:uppercase;">
                3. Input Picked Quantity
              </span>
              <span style="font-size:9.5px; color:var(--text-dim);">Target: <b class="mono">${item.qtyToPick}x</b></span>
            </div>

            <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:2px;">
              <button class="btn btn-secondary" id="btn-qty-minus" ${this.manualSkuScanned ? '' : 'disabled'} style="width:34px; height:34px; font-size:16px; font-weight:800; padding:0;">-</button>
              
              <input 
                type="number" 
                id="input-manual-picked-qty" 
                value="${this.manualPickedQty}" 
                min="1" 
                max="${item.qtyToPick}"
                ${this.manualSkuScanned ? '' : 'disabled'}
                style="width:70px; height:34px; text-align:center; font-size:17px; font-weight:900; font-family:var(--font-mono); border:1px solid var(--border-muted); border-radius:6px; background:#ffffff; color:var(--primary);"
              />

              <button class="btn btn-secondary" id="btn-qty-plus" ${this.manualSkuScanned ? '' : 'disabled'} style="width:34px; height:34px; font-size:16px; font-weight:800; padding:0;">+</button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display:flex; gap:6px; margin-top:2px;">
            <button class="btn btn-secondary" id="btn-cancel-manual-pick" style="flex:1; padding:8px; font-size:11px;">
              Cancel
            </button>

            <button class="btn btn-primary" id="btn-confirm-manual-pick" ${canConfirm ? '' : 'disabled'} style="flex:2; padding:8px; font-size:11.5px; font-weight:800; background:${canConfirm ? '#059669' : ''};">
              <span>Confirm Pick & Close</span>
            </button>
          </div>

        </div>
      </div>
    `;
  }

  // --- Guided S-Shape Serpentine Route View ---
  renderSystemBatchGuidedStep(currentItem) {
    return `
      <!-- Step 1: Scan Bin Location -->
      <div style="background:#ffffff; padding:12px; border-radius:10px; border:${this.binVerified ? '1px solid #a7f3d0' : '2px dashed var(--primary)'}; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:10px; font-weight:800; color:${this.binVerified ? '#059669' : 'var(--primary)'}; text-transform:uppercase;">
            ${this.binVerified ? '✓ Bin Location Verified' : `Serpentine Stop ${this.activeItemIndex + 1} of ${this.pickItems.length}: Scan Bin`}
          </div>
          <span class="badge badge-info" style="font-size:8.5px;">Seq #${currentItem.seq}</span>
        </div>

        <div class="mono" style="font-size:15px; font-weight:800; color:var(--text-main);">${currentItem.binCode}</div>
        <div style="font-size:10.5px; color:var(--text-dim);">${currentItem.aisle}</div>

        ${!this.binVerified ? `
          <button class="btn btn-secondary" id="btn-pda-scan-bin" style="width:100%; margin-top:4px; font-size:11.5px; font-weight:700;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            <span>Simulate Scan Bin Barcode</span>
          </button>
        ` : ''}
      </div>

      <!-- Step 2: Scan SKU Item Barcode -->
      <div style="background:#ffffff; padding:12px; border-radius:10px; border:${this.binVerified ? '2px dashed var(--primary)' : '1px solid #e2e8f0'}; opacity:${this.binVerified ? '1' : '0.6'}; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:10px; font-weight:800; color:var(--text-dim); text-transform:uppercase;">Scan SKU Barcode</div>
          <span class="mono" style="font-size:11px; font-weight:800; color:#059669;">Pick ${currentItem.qtyToPick}x Units</span>
        </div>

        <div style="font-weight:700; color:var(--text-main); font-size:12px;">${currentItem.skuName}</div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:10.5px; color:var(--text-dim);">
          <span>Barcode: <b class="mono">${currentItem.skuBarcode}</b></span>
          <span>Lot: <b class="mono">${currentItem.lotNumber}</b></span>
        </div>

        <button class="btn btn-primary" id="btn-pda-scan-sku" ${this.binVerified ? '' : 'disabled'} style="width:100%; margin-top:4px; font-size:11.5px; font-weight:700;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Scan SKU & Confirm Pick (${currentItem.qtyToPick}x)</span>
        </button>
      </div>
    `;
  }

  // --- 2. Upgraded Continuous 3PL Chute Sortation Tab on PDA ---
  renderSortationTab() {
    return `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <!-- Quick Glance KPI Summary Cards -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
          <div style="background:#ffffff; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0; box-shadow:var(--shadow-xs);">
            <div style="font-size:9.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Pending Parcels</div>
            <div class="mono" style="font-size:18px; font-weight:900; color:#d97706; margin-top:2px;">
              ${this.sortState.pendingParcelsCount} Queue
            </div>
            <div style="font-size:9px; color:var(--text-muted); margin-top:1px;">Infeed conveyor queue</div>
          </div>

          <div style="background:#ffffff; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0; box-shadow:var(--shadow-xs);">
            <div style="font-size:9.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Sorted Parcels</div>
            <div class="mono" style="font-size:18px; font-weight:900; color:#059669; margin-top:2px;">
              ${this.sortState.todaySortedCount} Done
            </div>
            <div style="font-size:9px; color:#059669; font-weight:700; margin-top:1px;">100% Chute Accuracy</div>
          </div>
        </div>

        <!-- Chute Capacity Status Strip -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:8px 10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:9.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Chutes:</div>
          <div style="display:flex; gap:6px; font-size:9.5px;">
            <span class="mono">SPX: <b>${this.sortState.chuteLoads['CHUTE-SPX-01']}/25</b></span>
            <span style="color:#cbd5e1;">|</span>
            <span class="mono">J&T: <b>${this.sortState.chuteLoads['CHUTE-JNT-01']}/25</b></span>
            <span style="color:#cbd5e1;">|</span>
            <span class="mono">INST: <b>${this.sortState.chuteLoads['CHUTE-INST-01']}/10</b></span>
          </div>
        </div>

        <!-- Continuous Scan Infeed: Scan Parcel AWB Barcode -->
        <div style="background:#ffffff; padding:12px; border-radius:10px; border:2px dashed var(--primary); box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:10.5px; font-weight:800; color:var(--primary); text-transform:uppercase;">
              Scan Parcel AWB Barcode
            </div>
            <span class="badge badge-purple" style="font-size:8.5px;">CONTINUOUS SCAN</span>
          </div>

          <div style="display:flex; gap:6px;">
            <input 
              type="text" 
              id="pda-sort-awb-input" 
              placeholder="Scan or enter AWB..." 
              value="${this.sortState.scannedAwb}"
              autofocus
              style="flex:1; background:#f8fafc; border:1px solid var(--border-muted); border-radius:6px; padding:7px 10px; font-size:12px; font-family:var(--font-mono); font-weight:700;"
            />
            <button class="btn btn-primary" id="btn-pda-scan-awb-action" style="padding:6px 10px; font-size:11px; font-weight:700;">
              <span>Scan & Pop</span>
            </button>
          </div>

          <!-- Quick Sample AWB Chips for Instant 1-Touch Simulation -->
          <div style="display:flex; flex-direction:column; gap:4px; margin-top:2px;">
            <div style="font-size:9.5px; color:var(--text-dim);">Tap sample AWB to simulate laser scan & auto-popup:</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
              ${this.sampleParcels.map(p => `
                <button class="btn btn-secondary sample-awb-chip" data-awb="${p.awb}" style="padding:5px 6px; font-size:9.5px; font-family:var(--font-mono); text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; border-color:var(--primary-light);">
                  <b>${p.courier.split(' ')[0]}</b>: ${p.awb.substring(0, 10)}...
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        ${this.sortState.lastSortedMessage ? `
          <div style="background:#ecfdf5; border:1px solid #a7f3d0; padding:8px 10px; border-radius:8px; font-size:11px; color:#065f46; display:flex; align-items:center; gap:6px; animation:toastSlideIn 0.2s ease;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>${this.sortState.lastSortedMessage}</span>
          </div>
        ` : ''}

      </div>
    `;
  }

  // --- Immediate Chute Validation Popup Modal (Continuous Scan Loop) ---
  renderChuteValidationModal() {
    const parcel = this.sortState.parcelData;
    const hasMismatch = !!this.sortState.mismatchError;

    return `
      <div style="position:absolute; inset:0; background:rgba(15, 23, 42, 0.88); z-index:9999; display:flex; align-items:center; justify-content:center; padding:12px; animation:toastSlideIn 0.2s ease;">
        <div style="background:#ffffff; border-radius:18px; border:${hasMismatch ? '2.5px solid #dc2626' : '2.5px solid var(--primary)'}; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3); padding:14px; width:100%; display:flex; flex-direction:column; gap:10px; max-height:94%; overflow-y:auto;">
          
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <span class="badge ${hasMismatch ? 'badge-danger' : 'badge-purple'}" style="font-size:9px; font-weight:800;">
                ${hasMismatch ? '⚠️ MISMATCH REJECTED' : 'CHUTE RACK VALIDATION'}
              </span>
              <div style="font-weight:900; color:var(--text-main); font-size:13.5px; margin-top:2px;">${parcel.courier}</div>
              <div class="mono" style="font-size:10px; color:var(--text-dim);">${parcel.awb} &bull; ${parcel.orderCode}</div>
            </div>

            <button class="btn btn-secondary" id="btn-close-chute-modal" style="padding:2px 6px; font-size:11px;">✕</button>
          </div>

          <!-- Prominent Target Chute Destination Prompt -->
          <div style="background:#f5f3ff; border:1.5px solid #ddd6fe; border-radius:12px; padding:12px; text-align:center;">
            <div style="font-size:10px; font-weight:700; color:#6d28d9; text-transform:uppercase;">Drop Parcel Into Chute:</div>
            <div class="mono" style="font-size:22px; font-weight:900; color:#5b21b6; margin-top:2px; letter-spacing:0.02em;">
              ${parcel.chuteId}
            </div>
            <div style="font-size:11px; color:#7c3aed; font-weight:700; margin-top:2px;">${parcel.bay}</div>
          </div>

          <!-- Mismatch Alert Banner (If wrong chute scanned) -->
          ${hasMismatch ? `
            <div style="background:#fff1f2; border:1.5px solid #fecdd3; border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:4px; animation:toastSlideIn 0.2s ease;">
              <div style="display:flex; align-items:center; gap:6px; font-weight:900; color:#dc2626; font-size:11.5px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <span>WRONG CHUTE: ${this.sortState.mismatchError.scannedChute}</span>
              </div>
              <div style="font-size:10px; color:#7f1d1d; line-height:1.3;">
                Carrier mismatch! Do NOT drop parcel here. Re-route to <b>${parcel.chuteId}</b>.
              </div>
            </div>
          ` : ''}

          <!-- Verification Trigger Buttons (Single-Touch Workflow) -->
          <div style="display:flex; flex-direction:column; gap:6px; margin-top:2px;">
            <div style="font-size:10px; font-weight:800; color:var(--text-main); text-transform:uppercase;">
              Scan Chute Barcode to Confirm:
            </div>

            <!-- Instant Match Button (Auto-closes on confirm) -->
            <button class="btn btn-primary" id="btn-scan-match-chute" style="padding:10px; font-size:12px; font-weight:900; background:#059669; width:100%;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Scan Correct Chute: ${parcel.chuteId}</span>
            </button>

            <!-- Wrong Chute Simulation Button (Tests Mismatch Reject) -->
            <button class="btn btn-secondary" id="btn-scan-wrong-chute" style="padding:6px; font-size:10px; color:#dc2626; border-color:#fecaca; background:#fff1f2; width:100%;">
              <span>Simulate Wrong Chute Scan (Test Reject Guard)</span>
            </button>
          </div>

        </div>
      </div>
    `;
  }

  // --- Task Assignment Notification & Confirmation Gate Modal ---
  renderTaskAssignmentModal() {
    const unconfirmedTasks = this.pendingTasks.filter(t => !t.confirmed);
    const displayList = unconfirmedTasks.length > 0 ? unconfirmedTasks : this.pendingTasks;
    const isAllChecked = displayList.length > 0 && displayList.every(t => this.selectedTaskIds.has(t.id));
    const canConfirm = this.selectedTaskIds.size > 0 && this.scannedToteBarcode.trim().length > 0;

    return `
      <div style="position:absolute; inset:0; background:rgba(15, 23, 42, 0.88); z-index:9999; display:flex; align-items:center; justify-content:center; padding:12px; animation:toastSlideIn 0.2s ease;">
        <div style="background:#ffffff; border-radius:18px; border:2.5px solid var(--primary); box-shadow:0 25px 50px -12px rgba(0,0,0,0.3); padding:14px; width:100%; display:flex; flex-direction:column; gap:10px; max-height:92%; overflow-y:auto;">
          
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="background:#eef2ff; color:var(--primary); padding:6px; border-radius:8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </div>
              <div>
                <div style="font-weight:900; color:var(--text-main); font-size:13px; text-transform:uppercase;">Incoming Task Assignment!</div>
                <div style="font-size:10px; color:var(--text-dim);">Assigned via Omnichannel Control Center</div>
              </div>
            </div>

            <button class="btn btn-secondary" id="btn-cancel-task-assignment" style="padding:2px 6px; font-size:11px;">✕</button>
          </div>

          <!-- Select All / Single Checklist -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
            <label style="font-size:11px; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" id="check-all-pda-tasks" ${isAllChecked ? 'checked' : ''} />
              <span>Select All (${displayList.length})</span>
            </label>
            <span class="badge badge-purple" style="font-size:9px;">${this.selectedTaskIds.size} Selected</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px; max-height:160px; overflow-y:auto;">
            ${displayList.map(t => {
              const isChecked = this.selectedTaskIds.has(t.id);
              return `
                <div style="background:${isChecked ? '#f5f3ff' : '#f8fafc'}; border:1px solid ${isChecked ? 'var(--primary-light)' : '#e2e8f0'}; padding:8px 10px; border-radius:8px; display:flex; align-items:center; gap:8px; cursor:pointer;" onclick="window.wmsPdaTerminal.toggleTaskSelection('${t.id}')">
                  <input type="checkbox" class="task-checkbox" data-task-id="${t.id}" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation()" />
                  <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span class="mono" style="font-weight:800; font-size:11.5px; color:var(--primary);">${t.taskCode}</span>
                      <span class="badge ${t.priority === 'VIP_INSTANT' ? 'badge-purple' : 'badge-info'}" style="font-size:8.5px;">${t.priority}</span>
                    </div>
                    <div style="font-size:10px; color:var(--text-dim); margin-top:2px;">
                      ${t.orderCode ? `<b class="mono">${t.orderCode}</b> &bull; ` : ''}${t.ordersCount || 1} Orders &bull; ${t.itemsCount} Units &bull; ${t.courier}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Tote Scan Verification Gate -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; display:flex; flex-direction:column; gap:6px;">
            <div style="font-size:10.5px; font-weight:800; color:var(--text-main); text-transform:uppercase;">
              Scan Physical Tote Barcode <span style="color:#dc2626;">*</span>
            </div>
            
            <div style="display:flex; gap:6px;">
              <input 
                type="text" 
                id="pda-tote-scan-input" 
                placeholder="Scan Tote (e.g. TOTE-001)..." 
                value="${this.scannedToteBarcode}"
                style="flex:1; background:#ffffff; border:1px solid var(--border-muted); border-radius:6px; padding:6px 8px; font-size:11.5px; font-family:var(--font-mono); font-weight:700;"
              />
              <button class="btn btn-secondary" id="btn-quick-scan-tote" style="padding:4px 8px; font-size:10.5px; font-weight:700;">
                <span>Scan TOTE-001</span>
              </button>
            </div>
          </div>

          <div style="display:flex; gap:6px; margin-top:2px;">
            <button class="btn btn-secondary" id="btn-dismiss-task-assignment" style="flex:1; padding:8px; font-size:11px;">
              Later
            </button>

            <button class="btn btn-primary" id="btn-confirm-accept-tasks" ${canConfirm ? '' : 'disabled'} style="flex:2; padding:8px; font-size:11.5px; font-weight:800; background:${canConfirm ? '#059669' : ''};">
              <span>Confirm & Start Picking</span>
            </button>
          </div>

        </div>
      </div>
    `;
  }

  // --- In-Flight Cancel Intercept Modal ---
  renderCancelInterceptModal() {
    return `
      <div style="position:absolute; inset:0; background:rgba(15, 23, 42, 0.85); z-index:9999; display:flex; align-items:center; justify-content:center; padding:14px; animation:toastSlideIn 0.2s ease;">
        <div style="background:#ffffff; border-radius:14px; border:2px solid #dc2626; box-shadow:0 20px 25px -5px rgba(220, 38, 38, 0.3); padding:14px; width:100%; display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="background:#fef2f2; color:#dc2626; padding:6px; border-radius:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <div>
              <div style="font-weight:900; color:#dc2626; font-size:12.5px; text-transform:uppercase;">In-Flight Cancel Intercept!</div>
              <div style="font-size:10px; color:var(--text-dim);">Marketplace Webhook Triggered</div>
            </div>
          </div>

          <div style="background:#fff1f2; border:1px solid #fecdd3; padding:8px; border-radius:8px; font-size:11px; color:#9f1239;">
            <div style="font-weight:700;">Order: ${this.activeCancelIntercept.order.order_code}</div>
            <div style="margin-top:2px;">Buyer cancelled on <b>Tokopedia</b>.</div>
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:8px; border-radius:8px; font-size:10.5px; display:flex; flex-direction:column; gap:3px;">
            <div style="font-weight:700; color:var(--text-dim); text-transform:uppercase; font-size:9.5px;">Required Action:</div>
            <div style="color:var(--text-main); font-weight:700;">Remove 1x ${this.activeCancelIntercept.sku ? this.activeCancelIntercept.sku.name : 'Kurma Ajwa'} from Tote ${this.activeTote}</div>
            <div style="color:var(--primary); font-weight:600;">&rarr; Return to Bin: <b class="mono">RESTOCK-STAGE-01</b></div>
          </div>

          <button class="btn btn-danger" id="btn-confirm-cancel-intercept" style="padding:9px; font-size:11.5px; font-weight:800; width:100%;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Confirm Item Removed & Restocked</span>
          </button>
        </div>
      </div>
    `;
  }

  toggleTaskSelection(taskId) {
    if (this.selectedTaskIds.has(taskId)) {
      this.selectedTaskIds.delete(taskId);
    } else {
      this.selectedTaskIds.add(taskId);
    }
    sound.play('click');
    this.render();
  }

  // --- Attach DOM Events ---
  attachEvents() {
    window.wmsPdaTerminal = this;

    // Tabs
    const pickTab = this.querySelector('#pda-tab-picking');
    if (pickTab) {
      pickTab.addEventListener('click', () => {
        this.pdaTab = 'picking';
        sound.play('click');
        this.render();
      });
    }

    const sortTab = this.querySelector('#pda-tab-sortation');
    if (sortTab) {
      sortTab.addEventListener('click', () => {
        this.pdaTab = 'sortation';
        sound.play('click');
        this.render();
      });
    }

    // Re-open Unconfirmed Pending Task Modal via Floating Banner
    const reopenPendingTasksBtn = this.querySelector('#btn-reopen-pending-tasks');
    if (reopenPendingTasksBtn) {
      reopenPendingTasksBtn.addEventListener('click', () => {
        this.showTaskAssignmentModal = true;
        sound.play('click');
        this.render();
      });
    }

    // Picking Route Mode Switchers
    const manualRouteBtn = this.querySelector('#btn-mode-manual-route');
    if (manualRouteBtn) {
      manualRouteBtn.addEventListener('click', () => {
        this.pickingRouteMode = 'manual_route';
        sound.play('click');
        this.render();
      });
    }

    const systemBatchBtn = this.querySelector('#btn-mode-system-batch');
    if (systemBatchBtn) {
      systemBatchBtn.addEventListener('click', () => {
        this.pickingRouteMode = 'system_batch';
        sound.play('click');
        this.render();
      });
    }

    // Manual Route Card Click -> Open Pick Modal
    this.querySelectorAll('.pda-order-card[data-manual-pick-idx]').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-manual-pick-idx'), 10);
        const item = this.pickItems[idx];
        if (item) {
          this.selectedManualItem = item;
          this.manualPickedQty = item.qtyToPick;
          this.manualRackScanned = false;
          this.manualSkuScanned = false;
          this.showManualPickModal = true;
          sound.play('click');
          this.render();
        }
      });
    });

    // Manual Pick Modal Handlers
    const closeManualModalBtn = this.querySelector('#btn-close-manual-modal');
    if (closeManualModalBtn) {
      closeManualModalBtn.addEventListener('click', () => {
        this.showManualPickModal = false;
        sound.play('click');
        this.render();
      });
    }

    const cancelManualPickBtn = this.querySelector('#btn-cancel-manual-pick');
    if (cancelManualPickBtn) {
      cancelManualPickBtn.addEventListener('click', () => {
        this.showManualPickModal = false;
        sound.play('click');
        this.render();
      });
    }

    const scanRackManualBtn = this.querySelector('#btn-pda-scan-rack-manual');
    if (scanRackManualBtn) {
      scanRackManualBtn.addEventListener('click', () => {
        sound.play('scan');
        this.manualRackScanned = true;
        this.render();
      });
    }

    const scanSkuManualBtn = this.querySelector('#btn-pda-scan-sku-manual');
    if (scanSkuManualBtn) {
      scanSkuManualBtn.addEventListener('click', () => {
        sound.play('scan');
        this.manualSkuScanned = true;
        this.render();
      });
    }

    const qtyMinusBtn = this.querySelector('#btn-qty-minus');
    if (qtyMinusBtn) {
      qtyMinusBtn.addEventListener('click', () => {
        if (this.manualPickedQty > 1) {
          this.manualPickedQty--;
          sound.play('click');
          const input = this.querySelector('#input-manual-picked-qty');
          if (input) input.value = this.manualPickedQty;
        }
      });
    }

    const qtyPlusBtn = this.querySelector('#btn-qty-plus');
    if (qtyPlusBtn) {
      qtyPlusBtn.addEventListener('click', () => {
        if (this.selectedManualItem && this.manualPickedQty < this.selectedManualItem.qtyToPick) {
          this.manualPickedQty++;
          sound.play('click');
          const input = this.querySelector('#input-manual-picked-qty');
          if (input) input.value = this.manualPickedQty;
        }
      });
    }

    const qtyInput = this.querySelector('#input-manual-picked-qty');
    if (qtyInput) {
      qtyInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1) {
          this.manualPickedQty = Math.min(val, this.selectedManualItem ? this.selectedManualItem.qtyToPick : 999);
        }
      });
    }

    const confirmManualPickBtn = this.querySelector('#btn-confirm-manual-pick');
    if (confirmManualPickBtn) {
      confirmManualPickBtn.addEventListener('click', () => {
        const item = this.selectedManualItem;
        if (item && this.manualRackScanned && this.manualSkuScanned) {
          sound.play('success');

          store.completePdaPickItem({
            taskId: 'pt-001',
            skuId: item.skuId,
            binId: item.binCode.includes('B01') ? 'bin-pick-b01' : (item.binCode.includes('B02') ? 'bin-pick-b02' : 'bin-pick-b03'),
            qtyPicked: this.manualPickedQty
          });

          item.isPicked = true;
          this.showManualPickModal = false;
          this.selectedManualItem = null;

          this.render();
        }
      });
    }

    // S-Shape Batch 2-Step Pick Scanners
    const scanBinBtn = this.querySelector('#btn-pda-scan-bin');
    if (scanBinBtn) {
      scanBinBtn.addEventListener('click', () => {
        sound.play('scan');
        this.binVerified = true;
        this.render();
      });
    }

    const scanSkuBtn = this.querySelector('#btn-pda-scan-sku');
    if (scanSkuBtn) {
      scanSkuBtn.addEventListener('click', () => {
        const item = this.pickItems[this.activeItemIndex];
        sound.play('success');

        store.completePdaPickItem({
          taskId: 'pt-001',
          skuId: item.skuId,
          binId: item.binCode.includes('B01') ? 'bin-pick-b01' : (item.binCode.includes('B02') ? 'bin-pick-b02' : 'bin-pick-b03'),
          qtyPicked: item.qtyToPick
        });

        item.isPicked = true;
        this.binVerified = false;

        const nextUnpicked = this.pickItems.findIndex(it => !it.isPicked);
        if (nextUnpicked !== -1) {
          this.activeItemIndex = nextUnpicked;
        }

        this.render();
      });
    }

    // Staging Handover
    const handoverBtn = this.querySelector('#btn-pda-handover-staging');
    if (handoverBtn) {
      handoverBtn.addEventListener('click', () => {
        sound.play('success');
        store.handoverPdaToStaging({
          taskId: 'pt-001',
          stagingBinId: 'bin-stage-a04'
        });

        alert(`Wave successfully handed over to STAGE-A-04 with Tote ${this.activeTote}! Packing bench notified.`);
        this.pickItems.forEach(it => it.isPicked = false);
        this.activeItemIndex = 0;
        this.binVerified = false;
        this.render();
      });
    }

    // Task Assignment Modal Events
    const triggerNotifBtn = this.querySelector('#btn-pda-trigger-task-notif');
    if (triggerNotifBtn) {
      triggerNotifBtn.addEventListener('click', () => {
        this.showTaskAssignmentModal = true;
        this.scannedToteBarcode = '';
        sound.play('scan');
        this.render();
      });
    }

    const checkAllTasks = this.querySelector('#check-all-pda-tasks');
    if (checkAllTasks) {
      checkAllTasks.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.pendingTasks.forEach(t => this.selectedTaskIds.add(t.id));
        } else {
          this.selectedTaskIds.clear();
        }
        sound.play('click');
        this.render();
      });
    }

    const taskCheckboxes = this.querySelectorAll('.task-checkbox');
    taskCheckboxes.forEach(chk => {
      chk.addEventListener('change', (e) => {
        const taskId = chk.getAttribute('data-task-id');
        if (e.target.checked) {
          this.selectedTaskIds.add(taskId);
        } else {
          this.selectedTaskIds.delete(taskId);
        }
        sound.play('click');
        this.render();
      });
    });

    const toteInput = this.querySelector('#pda-tote-scan-input');
    if (toteInput) {
      toteInput.addEventListener('input', (e) => {
        this.scannedToteBarcode = e.target.value;
        const confirmBtn = this.querySelector('#btn-confirm-accept-tasks');
        if (confirmBtn) {
          confirmBtn.disabled = !(this.selectedTaskIds.size > 0 && this.scannedToteBarcode.trim().length > 0);
        }
      });
    }

    const quickToteBtn = this.querySelector('#btn-quick-scan-tote');
    if (quickToteBtn) {
      quickToteBtn.addEventListener('click', () => {
        this.scannedToteBarcode = 'TOTE-001';
        sound.play('scan');
        this.render();
      });
    }

    const cancelTaskBtn = this.querySelector('#btn-cancel-task-assignment');
    if (cancelTaskBtn) {
      cancelTaskBtn.addEventListener('click', () => {
        this.showTaskAssignmentModal = false;
        sound.play('click');
        this.render();
      });
    }

    const dismissTaskBtn = this.querySelector('#btn-dismiss-task-assignment');
    if (dismissTaskBtn) {
      dismissTaskBtn.addEventListener('click', () => {
        this.showTaskAssignmentModal = false;
        sound.play('click');
        this.render();
      });
    }

    const confirmTasksBtn = this.querySelector('#btn-confirm-accept-tasks');
    if (confirmTasksBtn) {
      confirmTasksBtn.addEventListener('click', () => {
        this.activeTote = this.scannedToteBarcode || 'TOTE-001';
        
        // Mark all selected tasks as confirmed
        this.pendingTasks.forEach(t => {
          if (this.selectedTaskIds.has(t.id)) {
            t.confirmed = true;
          }
        });

        this.showTaskAssignmentModal = false;
        sound.play('success');
        alert(`Task(s) confirmed! Linked to physical Tote: ${this.activeTote}. Starting pick route!`);
        this.render();
      });
    }

    // In-Flight Cancel Intercept Handlers
    const simCancelBtn = this.querySelector('#btn-pda-trigger-cancel');
    if (simCancelBtn) {
      simCancelBtn.addEventListener('click', () => {
        store.simulateCancelIntercept('ord-003');
      });
    }

    const confirmCancelBtn = this.querySelector('#btn-confirm-cancel-intercept');
    if (confirmCancelBtn) {
      confirmCancelBtn.addEventListener('click', () => {
        sound.play('success');
        alert(`Item returned to RESTOCK-STAGE-01. Order ${this.activeCancelIntercept.order.order_code} ledger released!`);
        this.activeCancelIntercept = null;
        this.render();
      });
    }

    // Continuous 3PL Sortation Handlers on PDA
    const sortAwbInput = this.querySelector('#pda-sort-awb-input');
    if (sortAwbInput) {
      sortAwbInput.addEventListener('input', (e) => {
        this.sortState.scannedAwb = e.target.value;
      });
    }

    const sortVerifyBtn = this.querySelector('#btn-pda-scan-awb-action');
    if (sortVerifyBtn) {
      sortVerifyBtn.addEventListener('click', () => {
        const val = (this.sortState.scannedAwb || 'SPXID029910012345').trim();
        const found = this.sampleParcels.find(p => p.awb.toLowerCase().includes(val.toLowerCase())) || this.sampleParcels[0];
        sound.play('scan');
        this.sortState.parcelData = found;
        this.sortState.showChuteValidationModal = true;
        this.sortState.mismatchError = null;
        this.render();
      });
    }

    // Tap Sample AWB Chip -> Auto-Opens Chute Validation Modal Immediately
    this.querySelectorAll('.sample-awb-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const awb = chip.getAttribute('data-awb');
        this.sortState.scannedAwb = awb;
        const found = this.sampleParcels.find(p => p.awb === awb) || this.sampleParcels[0];
        sound.play('scan');
        this.sortState.parcelData = found;
        this.sortState.showChuteValidationModal = true;
        this.sortState.mismatchError = null;
        this.render();
      });
    });

    // Close Chute Modal
    const closeChuteModalBtn = this.querySelector('#btn-close-chute-modal');
    if (closeChuteModalBtn) {
      closeChuteModalBtn.addEventListener('click', () => {
        this.sortState.showChuteValidationModal = false;
        this.sortState.parcelData = null;
        this.sortState.scannedAwb = '';
        this.sortState.mismatchError = null;
        sound.play('click');
        this.render();
      });
    }

    // Chute Match Scan Confirmation (Auto-closes modal & resets for next AWB scan)
    const matchChuteBtn = this.querySelector('#btn-scan-match-chute');
    if (matchChuteBtn) {
      matchChuteBtn.addEventListener('click', () => {
        sound.play('success');
        const targetChute = this.sortState.parcelData.chuteId;

        if (this.sortState.chuteLoads[targetChute] !== undefined) {
          this.sortState.chuteLoads[targetChute]++;
        }
        this.sortState.todaySortedCount++;
        if (this.sortState.pendingParcelsCount > 0) {
          this.sortState.pendingParcelsCount--;
        }

        this.sortState.lastSortedMessage = `✓ AWB ${this.sortState.parcelData.awb.substring(0, 10)}... sorted to ${targetChute} successfully! Ready for next scan.`;
        
        // Auto-close modal and reset ready for next scan
        this.sortState.showChuteValidationModal = false;
        this.sortState.parcelData = null;
        this.sortState.scannedAwb = '';
        this.sortState.mismatchError = null;
        
        this.render();
      });
    }

    // Chute Mismatch Test Handler (Displays Reject Warning inside Modal)
    const wrongChuteBtn = this.querySelector('#btn-scan-wrong-chute');
    if (wrongChuteBtn) {
      wrongChuteBtn.addEventListener('click', () => {
        sound.play('error');
        const targetChute = this.sortState.parcelData.chuteId;
        const wrongChute = targetChute === 'CHUTE-SPX-01' ? 'CHUTE-JNT-01' : 'CHUTE-SPX-01';

        this.sortState.mismatchError = {
          expectedChute: targetChute,
          scannedChute: wrongChute,
          message: `Parcel carrier does not match ${wrongChute}. Drop rejected!`
        };

        this.render();
      });
    }
  }
}

customElements.define('wms-pda-terminal', WmsPdaTerminal);
