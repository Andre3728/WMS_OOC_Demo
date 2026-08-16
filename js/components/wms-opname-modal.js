/**
 * SuperDates WMS - Stock Opname & Physical Cycle Count Audit Modal Component
 * Performs physical count vs system balance reconciliation, variance analysis, and ledger auto-adjustment.
 */

import { store } from '../mock/mockStore.js';
import { sound } from './wms-audio.js';

class WmsOpnameModal extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.targetBinId = null;
    this.targetSkuId = null;
  }

  connectedCallback() {
    this.render();
  }

  open({ binId = 'bin-pick-b01', skuId = 'sku-ajwa-500g' } = {}) {
    this.targetBinId = binId;
    this.targetSkuId = skuId;
    this.isOpen = true;
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

    const skus = store.getTable('master_skus') || [];
    const bins = store.getTable('bins') || [];
    const balances = store.getTable('inventory_balances') || [];

    const defaultSku = this.targetSkuId || (skus[0] ? skus[0].id : '');
    const defaultBin = this.targetBinId || 'bin-pick-b01';

    const currentBal = balances.find(b => b.bin_id === defaultBin && b.master_sku_id === defaultSku);
    const systemQty = currentBal ? currentBal.qty_available : 0;

    this.innerHTML = `
      <div class="wms-modal-backdrop open" id="opname-backdrop">
        <div class="wms-modal-card" style="max-width: 720px;">
          <!-- Modal Header -->
          <div class="modal-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <h3 style="font-size:16px; font-weight:800; color:var(--text-main);">Stock Opname & Physical Cycle Count Audit</h3>
            </div>
            <button id="btn-close-opname-modal" class="sim-btn" style="padding:4px 8px; border:none; cursor:pointer;" title="Close Modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
            
            <div style="background:#fffbeb; border:1px solid #fde68a; padding:12px 14px; border-radius:var(--radius-md); display:flex; align-items:center; justify-content:space-between;">
              <div>
                <div style="font-weight:700; color:#b45309; font-size:13px;">Blind Physical Verification & Variance Ledger Sync</div>
                <div style="font-size:11.5px; color:#92400e; margin-top:2px;">
                  Audits shelf inventory against system records. Variances trigger an immediate double-entry adjusting entry.
                </div>
              </div>
              <span class="badge badge-warning" style="font-size:10px;">CYCLE COUNT</span>
            </div>

            <!-- Location & SKU Selection -->
            <div style="display:grid; grid-template-columns: 1fr 1.2fr; gap:12px; background:#ffffff; padding:14px; border-radius:var(--radius-md); border:1px solid #e2e8f0;">
              <div>
                <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Bin Location to Audit</label>
                <select id="opname-bin-select" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:7px 10px; font-size:12px; font-weight:700; color:var(--primary);">
                  ${bins.map(b => `
                    <option value="${b.id}" ${b.id === defaultBin ? 'selected' : ''}>${b.bin_code} (${b.bin_type})</option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Master SKU</label>
                <select id="opname-sku-select" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:7px 10px; font-size:12px; font-weight:600; color:var(--text-main);">
                  ${skus.map(s => `
                    <option value="${s.id}" ${s.id === defaultSku ? 'selected' : ''}>${s.name} (${s.sku_code})</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <!-- Count & Real-Time Variance Calculation Grid -->
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; background:#ffffff; padding:16px; border-radius:var(--radius-md); border:1px solid #e2e8f0; text-align:center;">
              <div style="background:#f8fafc; padding:12px; border-radius:var(--radius-md); border:1px solid #f1f5f9;">
                <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">1. System Balance</div>
                <div class="mono" id="opname-system-qty" style="font-size:24px; font-weight:800; color:var(--text-main); margin-top:4px;">${systemQty}</div>
                <div style="font-size:10.5px; color:var(--text-dim);">Recorded Available Qty</div>
              </div>

              <div style="background:#f8fafc; padding:12px; border-radius:var(--radius-md); border:1px solid #f1f5f9;">
                <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">2. Physical Scan Count</div>
                <input type="number" id="opname-physical-input" value="${systemQty}" min="0" max="2000" style="width:80%; margin:4px auto 0; text-align:center; font-size:22px; font-weight:800; font-family:var(--font-mono); background:#ffffff; border:2px solid var(--primary); border-radius:var(--radius-sm); padding:2px 8px; color:var(--text-main);" />
                <div style="font-size:10.5px; color:var(--text-dim); margin-top:2px;">Verified on shelf</div>
              </div>

              <div style="background:#f8fafc; padding:12px; border-radius:var(--radius-md); border:1px solid #f1f5f9;">
                <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">3. Net Variance</div>
                <div class="mono" id="opname-variance-display" style="font-size:24px; font-weight:800; color:#059669; margin-top:4px;">0</div>
                <div style="font-size:10.5px; color:var(--text-dim);" id="opname-variance-label">Perfect Match (0 units)</div>
              </div>
            </div>

            <!-- Variance Reason & Supervisor Sign-off -->
            <div style="display:grid; grid-template-columns: 1.5fr 1fr; gap:12px; background:#ffffff; padding:14px; border-radius:var(--radius-md); border:1px solid #e2e8f0;">
              <div>
                <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Discrepancy Reason Code</label>
                <select id="opname-reason-select" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:7px 10px; font-size:12px; font-weight:600; color:var(--text-main);">
                  <option value="ROUTINE_CYCLE_COUNT">Routine Count (Match)</option>
                  <option value="SHRINKAGE_SAMPLED">Marketing / QA Sampling Discrepancy</option>
                  <option value="DAMAGE_EXPIRATION">Damaged on Shelf / Expiry Loss</option>
                  <option value="MISPLACED_BIN_FOUND">Misplaced Stock Found on Bin</option>
                  <option value="COUNTING_DATA_CORRECTION">Manual Inventory Recount Correction</option>
                </select>
              </div>

              <div>
                <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Audited & Approved By</label>
                <input type="text" id="opname-approver-input" value="Bambang (WMS Supervisor #01)" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:7px 10px; font-size:12px; font-weight:600; color:var(--text-main);" readonly />
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-cancel-opname" style="font-size:12px;">
              Cancel
            </button>
            <button class="btn btn-primary" id="btn-confirm-opname" style="font-size:12px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Approve & Post Ledger Adjustment</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const backdrop = this.querySelector('#opname-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
    }

    const closeBtn = this.querySelector('#btn-close-opname-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const cancelBtn = this.querySelector('#btn-cancel-opname');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());

    const binSelect = this.querySelector('#opname-bin-select');
    const skuSelect = this.querySelector('#opname-sku-select');
    const systemQtyEl = this.querySelector('#opname-system-qty');
    const physicalInput = this.querySelector('#opname-physical-input');
    const varianceDisplay = this.querySelector('#opname-variance-display');
    const varianceLabel = this.querySelector('#opname-variance-label');

    const updateVariance = () => {
      const binId = binSelect.value;
      const skuId = skuSelect.value;
      const balances = store.getTable('inventory_balances') || [];
      const bal = balances.find(b => b.bin_id === binId && b.master_sku_id === skuId);
      const sysQty = bal ? bal.qty_available : 0;
      systemQtyEl.textContent = sysQty;

      const physQty = parseInt(physicalInput.value || '0', 10);
      const variance = physQty - sysQty;

      if (variance === 0) {
        varianceDisplay.textContent = '0';
        varianceDisplay.style.color = '#059669';
        varianceLabel.textContent = 'Perfect Match (0 units)';
      } else if (variance < 0) {
        varianceDisplay.textContent = `${variance}`;
        varianceDisplay.style.color = '#dc2626';
        varianceLabel.textContent = `Shrinkage Loss (${Math.abs(variance)} units)`;
      } else {
        varianceDisplay.textContent = `+${variance}`;
        varianceDisplay.style.color = '#0284c7';
        varianceLabel.textContent = `Surplus Found (+${variance} units)`;
      }
    };

    if (binSelect) binSelect.addEventListener('change', updateVariance);
    if (skuSelect) skuSelect.addEventListener('change', updateVariance);
    if (physicalInput) physicalInput.addEventListener('input', updateVariance);

    const confirmBtn = this.querySelector('#btn-confirm-opname');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const binId = binSelect.value;
        const skuId = skuSelect.value;
        const physicalCount = parseInt(physicalInput.value || '0', 10);
        const reasonCode = this.querySelector('#opname-reason-select').value;

        sound.play('success');

        // Create or get active opname session
        const session = store.createOpnameSession({
          zoneId: 'zn-cold-01',
          sessionName: 'Shelf Cycle Count Audit',
          auditedBy: 'usr-supervisor-01'
        });

        const res = store.submitOpnameCount({
          opnameId: session.id,
          binId,
          masterSkuId: skuId,
          physicalCount,
          reasonCode,
          approvedBy: 'usr-supervisor-01'
        });

        this.close();
        if (res) {
          alert(`Stock Opname audit posted! Balance in ${binId} adjusted to ${physicalCount} units (Variance: ${res.variance}). Ledger updated.`);
        }
      });
    }
  }
}

customElements.define('wms-opname-modal', WmsOpnameModal);
