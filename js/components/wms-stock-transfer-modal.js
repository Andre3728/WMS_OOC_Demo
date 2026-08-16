/**
 * SuperDates WMS - Internal Stock Transfer & Replenishment Modal Component
 * Moves inventory between bins (e.g. Bulk Reserve -> Cold Pick Face) with atomic ledger audit.
 */

import { store } from '../mock/mockStore.js';
import { sound } from './wms-audio.js';

class WmsStockTransferModal extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.initialSkuId = null;
    this.initialFromBinId = null;
  }

  connectedCallback() {
    this.render();
  }

  open({ skuId = null, fromBinId = null } = {}) {
    this.initialSkuId = skuId;
    this.initialFromBinId = fromBinId;
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

    const defaultSku = this.initialSkuId || (skus[0] ? skus[0].id : '');
    const defaultFromBin = this.initialFromBinId || 'bin-bulk-01';

    // Find current stock in default source bin
    const currentSourceBal = balances.find(b => b.bin_id === defaultFromBin && b.master_sku_id === defaultSku);
    const availableQty = currentSourceBal ? currentSourceBal.qty_available : 0;

    this.innerHTML = `
      <div class="wms-modal-backdrop open" id="stock-transfer-backdrop">
        <div class="wms-modal-card" style="max-width: 680px;">
          <!-- Modal Header -->
          <div class="modal-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
              <h3 style="font-size:16px; font-weight:800; color:var(--text-main);">Internal Stock Relocation & Replenishment</h3>
            </div>
            <button id="btn-close-transfer-modal" class="sim-btn" style="padding:4px 8px; border:none; cursor:pointer;" title="Close Modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
            
            <div style="background:#eef2ff; border:1px solid #c7d2fe; padding:12px 14px; border-radius:var(--radius-md); display:flex; align-items:center; justify-content:space-between;">
              <div>
                <div style="font-weight:700; color:var(--primary); font-size:13px;">Bin-to-Bin Stock Transfer</div>
                <div style="font-size:11.5px; color:#4338ca; margin-top:2px;">
                  Replenishes active pick bins from bulk reserve or performs internal warehouse re-slotting.
                </div>
              </div>
              <span class="badge badge-purple" style="font-size:10px;">REPLENISHMENT</span>
            </div>

            <!-- Transfer Configuration Form -->
            <div style="background:#ffffff; padding:16px; border-radius:var(--radius-md); border:1px solid #e2e8f0; display:flex; flex-direction:column; gap:12px;">
              
              <div>
                <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Master SKU Item</label>
                <select id="transfer-sku-select" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:7px 10px; font-size:12.5px; font-weight:600; color:var(--text-main);">
                  ${skus.map(s => `
                    <option value="${s.id}" ${s.id === defaultSku ? 'selected' : ''}>${s.name} (${s.sku_code})</option>
                  `).join('')}
                </select>
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                <div>
                  <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">From Source Bin</label>
                  <select id="transfer-from-bin-select" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:7px 10px; font-size:12px; font-weight:600; color:var(--text-main);">
                    ${bins.map(b => `
                      <option value="${b.id}" ${b.id === defaultFromBin ? 'selected' : ''}>${b.bin_code} (${b.bin_type})</option>
                    `).join('')}
                  </select>
                  <div style="font-size:11px; color:#059669; font-weight:700; margin-top:4px;" id="transfer-available-hint">
                    Available in Bin: ${availableQty} units
                  </div>
                </div>

                <div>
                  <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">To Destination Bin</label>
                  <select id="transfer-to-bin-select" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:7px 10px; font-size:12px; font-weight:700; color:var(--primary);">
                    ${bins.map(b => `
                      <option value="${b.id}" ${b.id === 'bin-pick-b01' ? 'selected' : ''}>${b.bin_code} (${b.bin_type})</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1.5fr; gap:12px;">
                <div>
                  <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Transfer Quantity</label>
                  <input type="number" id="transfer-qty-input" value="25" min="1" max="${availableQty || 100}" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:7px 10px; font-size:13px; font-weight:800; font-family:var(--font-mono); color:var(--text-main);" />
                </div>

                <div>
                  <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Movement Reason</label>
                  <select id="transfer-reason-select" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:7px 10px; font-size:12px; font-weight:600; color:var(--text-main);">
                    <option value="REPLENISHMENT_PICK_FACE">Replenishment to Pick Face</option>
                    <option value="INTERNAL_BIN_RELOCATION">Storage Capacity Re-Slotting</option>
                    <option value="DEFECT_TO_QUARANTINE">Move Damaged to Quarantine</option>
                  </select>
                </div>
              </div>

            </div>

          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-cancel-transfer" style="font-size:12px;">
              Cancel
            </button>
            <button class="btn btn-primary" id="btn-confirm-transfer" style="font-size:12px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Execute Transfer Movement</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const backdrop = this.querySelector('#stock-transfer-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
    }

    const closeBtn = this.querySelector('#btn-close-transfer-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const cancelBtn = this.querySelector('#btn-cancel-transfer');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());

    const skuSelect = this.querySelector('#transfer-sku-select');
    const fromBinSelect = this.querySelector('#transfer-from-bin-select');
    const hint = this.querySelector('#transfer-available-hint');
    const qtyInput = this.querySelector('#transfer-qty-input');

    const updateAvailable = () => {
      const skuId = skuSelect.value;
      const binId = fromBinSelect.value;
      const balances = store.getTable('inventory_balances') || [];
      const bal = balances.find(b => b.bin_id === binId && b.master_sku_id === skuId);
      const avail = bal ? bal.qty_available : 0;
      if (hint) hint.textContent = `Available in Bin: ${avail} units`;
      if (qtyInput) qtyInput.max = avail;
    };

    if (skuSelect) skuSelect.addEventListener('change', updateAvailable);
    if (fromBinSelect) fromBinSelect.addEventListener('change', updateAvailable);

    const confirmBtn = this.querySelector('#btn-confirm-transfer');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const skuId = skuSelect.value;
        const fromBinId = fromBinSelect.value;
        const toBinId = this.querySelector('#transfer-to-bin-select').value;
        const quantity = parseInt(qtyInput.value || '0', 10);
        const reason = this.querySelector('#transfer-reason-select').value;

        if (fromBinId === toBinId) {
          alert('Source and destination bins cannot be the same!');
          return;
        }

        if (quantity <= 0) {
          alert('Please specify a positive quantity to transfer.');
          return;
        }

        sound.play('success');
        const res = store.transferStock({
          masterSkuId: skuId,
          fromBinId,
          toBinId,
          quantity,
          reason,
          userId: 'usr-admin'
        });

        this.close();
        if (res) {
          alert(`Transfer ${res.transfer_number} completed: ${quantity} units moved from ${fromBinId} to ${toBinId}. Ledger updated!`);
        }
      });
    }
  }
}

customElements.define('wms-stock-transfer-modal', WmsStockTransferModal);
