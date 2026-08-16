/**
 * SuperDates WMS - Manual Discrete Pick Dispatch Modal Component
 * Assigns selected orders directly to a floor picker for manual single-order picking without wave batching.
 */

import { store } from '../mock/mockStore.js';
import { sound } from './wms-audio.js';

class WmsManualPickModal extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.selectedOrderIds = [];
  }

  connectedCallback() {
    this.render();
  }

  open(orderIds = []) {
    this.selectedOrderIds = orderIds;
    this.isOpen = true;
    sound.play('click');
    this.render();
  }

  close() {
    this.isOpen = false;
    this.render();
  }

  render() {
    if (!this.isOpen || !this.selectedOrderIds.length) {
      this.innerHTML = '';
      return;
    }

    const selectedOrders = store.getTable('orders').filter(o => this.selectedOrderIds.includes(o.id));
    let totalItems = 0;
    selectedOrders.forEach(o => {
      const items = store.getTable('order_items').filter(oi => oi.order_id === o.id);
      items.forEach(it => totalItems += it.ordered_qty);
    });

    this.innerHTML = `
      <div class="wms-modal-backdrop open" id="manual-pick-backdrop">
        <div class="wms-modal-card" style="max-width: 680px;">
          <!-- Modal Header -->
          <div class="modal-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              <h3 style="font-size:16px; font-weight:800; color:var(--text-main);">Manual Discrete Pick Assignment</h3>
            </div>
            <button id="btn-close-manual-pick-modal" class="sim-btn" style="padding:4px 8px; border:none; cursor:pointer;" title="Close Modal">
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
                <div style="font-weight:700; color:var(--primary); font-size:13px;">Direct Picker Dispatch (Non-Wave)</div>
                <div style="font-size:11.5px; color:#4338ca; margin-top:2px;">
                  Assigns ${selectedOrders.length} selected orders (${totalItems} items) directly to a floor picker's PDA for discrete fulfillment.
                </div>
              </div>
              <span class="badge badge-purple" style="font-size:10px;">DIRECT DISPATCH</span>
            </div>

            <!-- Picker & Tote Form -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; background:#ffffff; padding:14px; border-radius:var(--radius-md); border:1px solid #e2e8f0;">
              <div>
                <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Select Floor Picker</label>
                <select id="manual-picker-select" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:7px 10px; font-size:12px; font-weight:600; color:var(--text-main);">
                  <option value="usr-pick-01">Budi Setiawan (PDA Handheld #04)</option>
                  <option value="usr-pick-02">Andi Prasetyo (PDA Handheld #05)</option>
                  <option value="usr-pick-03">Siti Aminah (PDA Handheld #06)</option>
                </select>
              </div>

              <div>
                <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Assigned Tote Barcode</label>
                <input type="text" id="manual-tote-input" value="TOTE-004" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:7px 10px; font-size:12px; font-weight:700; font-family:var(--font-mono); color:var(--text-main);" />
              </div>
            </div>

            <!-- Selected Orders Preview List -->
            <div style="background:#ffffff; padding:14px; border-radius:var(--radius-md); border:1px solid #e2e8f0; display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Selected Orders to Dispatch</div>
              <div class="modal-table-container">
                <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:11.5px; width:100%;">
                  <thead>
                    <tr style="background:#f8fafc;">
                      <th style="padding:8px 10px;">Order Code</th>
                      <th style="padding:8px 10px;">Merchant Shop</th>
                      <th style="padding:8px 10px;">Courier & SLA</th>
                      <th style="padding:8px 10px;">Items BOM</th>
                      <th style="padding:8px 10px;">Buyer</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${selectedOrders.map(o => {
                      const items = store.getTable('order_items').filter(oi => oi.order_id === o.id);
                      return `
                        <tr>
                          <td class="mono" style="font-weight:700; color:var(--primary); padding:8px 10px;">${o.order_code}</td>
                          <td style="padding:8px 10px; font-weight:600;">${o.merchant_name}</td>
                          <td style="padding:8px 10px;">
                            <span class="badge ${o.sla_tier === 'INSTANT_2H' ? 'badge-purple' : 'badge-info'}" style="font-size:9px;">${o.sla_tier}</span>
                          </td>
                          <td style="padding:8px 10px; font-size:11px;">
                            ${items.map(it => `<div><b>${it.ordered_qty}x</b> ${it.item_name}</div>`).join('')}
                          </td>
                          <td style="padding:8px 10px; color:var(--text-dim);">${o.recipient_name}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-cancel-manual-pick" style="font-size:12px;">
              Cancel
            </button>
            <button class="btn btn-primary" id="btn-confirm-manual-pick" style="font-size:12px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              <span>Dispatch Pick Task to PDA (${selectedOrders.length} Orders)</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const backdrop = this.querySelector('#manual-pick-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
    }

    const closeBtn = this.querySelector('#btn-close-manual-pick-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const cancelBtn = this.querySelector('#btn-cancel-manual-pick');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());

    const confirmBtn = this.querySelector('#btn-confirm-manual-pick');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const pickerId = this.querySelector('#manual-picker-select').value;
        const toteId = this.querySelector('#manual-tote-input').value || 'TOTE-004';

        sound.play('success');
        const res = store.assignManualPick({
          orderIds: this.selectedOrderIds,
          pickerUserId: pickerId,
          toteId
        });

        this.close();

        if (res) {
          alert(`Discrete Pick Task ${res.pickTask.task_number} successfully dispatched to Picker! ${res.ordersCount} orders transitioned to PICKING.`);
        }
      });
    }
  }
}

customElements.define('wms-manual-pick-modal', WmsManualPickModal);
