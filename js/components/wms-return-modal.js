/**
 * SuperDates WMS - Reverse Logistics (RTS & RMA Returns) Inspection & Disposition Modal (Phase 8)
 * QC grading, photo evidence inspection, and double-entry restock/quarantine ledger execution.
 */

import { store } from '../mock/mockStore.js';
import { sound } from './wms-audio.js';

class WmsReturnModal extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.returnId = null;
    this.qcGrade = 'SEALED_PRISTINE';
    this.dispositionAction = 'RESTOCK_AVAILABLE';
    this.targetBinId = 'bin-pick-b01';
  }

  connectedCallback() {
    this.render();
  }

  open(returnId = 'ret-001') {
    this.returnId = returnId;
    this.isOpen = true;
    const ret = store.getItem('customer_returns', returnId);
    if (ret) {
      this.qcGrade = ret.qc_grade || 'SEALED_PRISTINE';
      this.dispositionAction = ret.disposition_action || 'RESTOCK_AVAILABLE';
    }
    sound.play('click');
    this.render();
  }

  close() {
    this.isOpen = false;
    this.render();
  }

  render() {
    if (!this.isOpen) {
      this.innerHTML = '';
      return;
    }

    const ret = store.getItem('customer_returns', this.returnId) || (store.getTable('customer_returns') || [])[0];
    if (!ret) {
      this.innerHTML = '';
      return;
    }

    const order = store.getItem('orders', ret.order_id);
    const isRestock = this.dispositionAction === 'RESTOCK_AVAILABLE';

    this.innerHTML = `
      <div class="wms-modal-backdrop open" id="return-modal-backdrop">
        <div class="wms-modal-card" style="max-width: 860px;">
          <!-- Modal Header -->
          <div class="modal-header">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="badge ${ret.return_type.includes('RTS') ? 'badge-purple' : 'badge-warning'}" style="font-size:10px;">
                ${ret.return_type.includes('RTS') ? 'RTS (RETURN TO SENDER)' : 'RMA (CUSTOMER CLAIM)'}
              </div>
              <h3 style="font-size:16px; font-weight:800; color:var(--text-main);">${ret.return_number}</h3>
              <span class="badge badge-info" style="font-size:10px;">Ref: ${ret.order_code}</span>
            </div>
            <button id="btn-close-return-modal" class="sim-btn" style="padding:4px 8px; border:none; cursor:pointer;" title="Close Modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body" style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:16px;">
            
            <!-- Left Column: Item & QC Inspection Details -->
            <div style="display:flex; flex-direction:column; gap:14px;">
              
              <!-- 1. Origin Order & Return Reason Card -->
              <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:12px 14px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div>
                    <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Returned Item & Quantity</div>
                    <div style="font-size:13.5px; font-weight:800; color:var(--text-main); margin-top:2px;">
                      ${ret.quantity}x ${ret.sku_name}
                    </div>
                    <div class="mono" style="font-size:11px; color:var(--text-dim);">SKU: ${ret.master_sku_id} • Lot: LOT-2026-AJW-01</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Carrier Inbound</div>
                    <div style="font-size:12px; font-weight:700; color:var(--primary);">${ret.carrier_name}</div>
                  </div>
                </div>

                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:var(--radius-sm); padding:8px 10px; font-size:11px;">
                  <span style="font-weight:700; color:var(--text-dim); text-transform:uppercase; font-size:9.5px; display:block; margin-bottom:2px;">Return Reason / Delivery Note:</span>
                  <span style="color:var(--text-main); font-weight:600;">"${ret.buyer_reason}"</span>
                </div>
              </div>

              <!-- 2. QC Condition Grading -->
              <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:14px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:10px;">
                <div style="font-size:11px; font-weight:800; color:var(--text-main); text-transform:uppercase;">
                  Physical QC Condition Grading
                </div>

                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:8px;">
                  <div class="filter-chip-card ${this.qcGrade === 'SEALED_PRISTINE' ? 'active-success' : ''}" data-qc-grade="SEALED_PRISTINE" style="padding:10px;">
                    <div style="width:8px; height:8px; border-radius:50%; background:#059669;"></div>
                    <div>
                      <div style="font-weight:800; font-size:12px;">Sealed & Pristine</div>
                      <div style="font-size:10px; color:var(--text-dim);">Original seal intact, valid shelf life</div>
                    </div>
                  </div>

                  <div class="filter-chip-card ${this.qcGrade === 'DAMAGED_CRUSHED' ? 'active-danger' : ''}" data-qc-grade="DAMAGED_CRUSHED" style="padding:10px;">
                    <div style="width:8px; height:8px; border-radius:50%; background:#dc2626;"></div>
                    <div>
                      <div style="font-weight:800; font-size:12px;">Damaged / Broken</div>
                      <div style="font-size:10px; color:var(--text-dim);">Crushed carton or broken seal</div>
                    </div>
                  </div>

                  <div class="filter-chip-card ${this.qcGrade === 'TEMP_ABUSE_MELTED' ? 'active-warning' : ''}" data-qc-grade="TEMP_ABUSE_MELTED" style="padding:10px;">
                    <div style="width:8px; height:8px; border-radius:50%; background:#d97706;"></div>
                    <div>
                      <div style="font-weight:800; font-size:12px;">Cold Chain Breach</div>
                      <div style="font-size:10px; color:var(--text-dim);">Exceeded 25°C ambient temp</div>
                    </div>
                  </div>

                  <div class="filter-chip-card ${this.qcGrade === 'WRONG_ITEM_SWAPPED' ? 'active-purple' : ''}" data-qc-grade="WRONG_ITEM_SWAPPED" style="padding:10px;">
                    <div style="width:8px; height:8px; border-radius:50%; background:#7c3aed;"></div>
                    <div>
                      <div style="font-weight:800; font-size:12px;">Fraud / Wrong Item</div>
                      <div style="font-size:10px; color:var(--text-dim);">Contents swapped by buyer</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 3. Target Disposition Location -->
              <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:14px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:10px;">
                <div style="font-size:11px; font-weight:800; color:var(--text-main); text-transform:uppercase;">
                  Inventory Ledger Disposition Action
                </div>

                <div style="display:flex; flex-direction:column; gap:8px;">
                  <label style="display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid ${isRestock ? 'var(--primary)' : '#e2e8f0'}; background:${isRestock ? '#eef2ff' : '#f8fafc'}; border-radius:var(--radius-md); cursor:pointer;">
                    <input type="radio" name="disposition-choice" value="RESTOCK_AVAILABLE" ${isRestock ? 'checked' : ''} />
                    <div>
                      <div style="font-weight:800; font-size:12.5px; color:var(--text-main);">Restock to Active Available Inventory</div>
                      <div style="font-size:10.5px; color:var(--text-dim);">Credit to Pick Bin (bin-pick-b01) • Ready for new marketplace order allocations</div>
                    </div>
                  </label>

                  <label style="display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid ${!isRestock ? '#dc2626' : '#e2e8f0'}; background:${!isRestock ? '#fef2f2' : '#f8fafc'}; border-radius:var(--radius-md); cursor:pointer;">
                    <input type="radio" name="disposition-choice" value="QUARANTINE_DEFECT" ${!isRestock ? 'checked' : ''} />
                    <div>
                      <div style="font-weight:800; font-size:12.5px; color:#dc2626;">Segregate to Quarantine Hold Bin</div>
                      <div style="font-size:10.5px; color:var(--text-dim);">Credit to Quarantine (bin-quarantine-01) • Locked from sale pending supplier scrap claim</div>
                    </div>
                  </label>
                </div>
              </div>

            </div>

            <!-- Right Column: Visual Evidence & Double-Entry Ledger Preview -->
            <div style="display:flex; flex-direction:column; gap:12px;">
              
              <!-- Evidence Photo Simulation -->
              <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:14px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:8px;">
                <div style="font-size:11px; font-weight:800; color:var(--text-dim); text-transform:uppercase; display:flex; justify-content:space-between;">
                  <span>Physical Evidence Photo</span>
                  <span class="badge badge-info" style="font-size:9px;">HD CAPTURE</span>
                </div>

                <div style="background:#0f172a; border-radius:var(--radius-sm); height:140px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; text-align:center; padding:12px; border:1px solid #1e293b;">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <div style="font-weight:700; color:#f8fafc; font-size:11.5px; margin-top:6px;">Inbound Return Package Scan</div>
                  <div style="font-size:10px; color:#94a3b8;">AWB: ${order ? order.awb_number : 'SPXID029910012345'} • Verified By Siti (QC)</div>
                </div>
              </div>

              <!-- Double-Entry Transaction Ledger Preview -->
              <div style="background:#f8fafc; border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:14px; display:flex; flex-direction:column; gap:8px;">
                <div style="font-size:10.5px; font-weight:800; color:var(--text-dim); text-transform:uppercase;">
                  ACID Double-Entry Movement
                </div>

                <div class="mono" style="font-size:11px; display:flex; flex-direction:column; gap:6px; background:#ffffff; padding:10px; border-radius:4px; border:1px solid #e2e8f0;">
                  <div style="display:flex; justify-content:space-between;">
                    <span style="color:var(--text-dim);">Source (Debit):</span>
                    <span style="color:#dc2626; font-weight:700;">EXTERNAL_3PL_CARRIER</span>
                  </div>
                  <div style="display:flex; justify-content:space-between;">
                    <span style="color:var(--text-dim);">Destination (Credit):</span>
                    <span style="color:${isRestock ? '#059669' : '#dc2626'}; font-weight:800;">
                      ${isRestock ? 'AVAILABLE (bin-pick-b01)' : 'QUARANTINE (bin-quarantine-01)'}
                    </span>
                  </div>
                  <div style="display:flex; justify-content:space-between; border-top:1px solid #f1f5f9; padding-top:4px;">
                    <span style="color:var(--text-dim);">Quantity:</span>
                    <span style="font-weight:800;">${ret.quantity} unit(s)</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-close-return-footer" style="font-size:12px;">
              Cancel
            </button>
            <button class="btn btn-primary" id="btn-confirm-return-disposition" style="font-size:12.5px; font-weight:800; background:${isRestock ? 'var(--primary)' : '#dc2626'};">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>${isRestock ? 'Execute Return to Stock (Credit Available)' : 'Segregate & Quarantine Damaged Stock'}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const backdrop = this.querySelector('#return-modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
    }

    const closeBtn = this.querySelector('#btn-close-return-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const footerCloseBtn = this.querySelector('#btn-close-return-footer');
    if (footerCloseBtn) footerCloseBtn.addEventListener('click', () => this.close());

    // QC Grade Selection
    this.querySelectorAll('[data-qc-grade]').forEach(chip => {
      chip.addEventListener('click', () => {
        this.qcGrade = chip.getAttribute('data-qc-grade');
        if (this.qcGrade === 'SEALED_PRISTINE') {
          this.dispositionAction = 'RESTOCK_AVAILABLE';
        } else {
          this.dispositionAction = 'QUARANTINE_DEFECT';
        }
        sound.play('click');
        this.render();
      });
    });

    // Disposition Radio Buttons
    this.querySelectorAll('input[name="disposition-choice"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.dispositionAction = e.target.value;
        sound.play('click');
        this.render();
      });
    });

    // Execute Disposition
    const confirmBtn = this.querySelector('#btn-confirm-return-disposition');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        sound.play('success');

        const result = store.processReturnDisposition({
          returnId: this.returnId,
          qcGrade: this.qcGrade,
          dispositionAction: this.dispositionAction,
          targetBinId: this.targetBinId
        });

        alert(`Reverse Logistics Disposition Processed!\nAction: ${this.dispositionAction}\nInventory Ledger Updated.`);
        this.close();
      });
    }
  }
}

customElements.define('wms-return-modal', WmsReturnModal);
window.wmsReturnModal = new WmsReturnModal();
