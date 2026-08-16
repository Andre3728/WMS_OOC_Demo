/**
 * SuperDates WMS - Inbound Receiving & Directed Putaway Modal Component
 * Handles container check-in, FEFO lot/expiry capture, QC inspection, and automated bin putaway.
 */

import { store } from '../mock/mockStore.js';
import { sound } from './wms-audio.js';

class WmsInboundModal extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.asnId = null;
  }

  connectedCallback() {
    this.render();
  }

  open(asnId) {
    this.asnId = asnId;
    this.isOpen = true;
    sound.play('click');
    this.render();
  }

  close() {
    this.isOpen = false;
    this.render();
  }

  render() {
    if (!this.isOpen || !this.asnId) {
      this.innerHTML = '';
      return;
    }

    const asn = store.getItem('asn_shipments', this.asnId);
    if (!asn) {
      this.innerHTML = '';
      return;
    }

    const asnItems = (store.getTable('asn_items') || []).filter(ai => ai.asn_id === asn.id);
    const putawayTasks = (store.getTable('putaway_tasks') || []).filter(pt => pt.asn_id === asn.id);
    const skus = store.getTable('master_skus') || [];

    const isCompleted = asn.status === 'COMPLETED';

    this.innerHTML = `
      <div class="wms-modal-backdrop open" id="inbound-modal-backdrop">
        <div class="wms-modal-card" style="max-width: 860px;">
          <!-- Modal Header -->
          <div class="modal-header">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="badge badge-primary" style="font-size:10px;">INBOUND DOCK</div>
              <h3 style="font-size:16px; font-weight:800; color:var(--text-main);">${asn.asn_number}</h3>
              <span class="badge ${this.getAsnBadgeClass(asn.status)}">${asn.status}</span>
            </div>
            <button id="btn-close-inbound-modal" class="sim-btn" style="padding:4px 8px; border:none; cursor:pointer;" title="Close Modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
            
            <!-- Summary Info Grid -->
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; background:#ffffff; padding:12px; border-radius:var(--radius-md); border:1px solid #e2e8f0; width:100%; box-sizing:border-box;">
              <div>
                <div style="font-size:10.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Supplier & PO</div>
                <div style="font-size:12.5px; font-weight:700; color:var(--text-main); margin-top:2px;">${asn.supplier_name}</div>
                <div class="mono" style="font-size:10.5px; color:var(--text-dim);">${asn.po_number}</div>
              </div>
              <div>
                <div style="font-size:10.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Dock & Vehicle</div>
                <div style="font-size:12.5px; font-weight:700; color:var(--primary); margin-top:2px;">${asn.dock_bin_id}</div>
                <div class="mono" style="font-size:10.5px; color:var(--text-muted);">${asn.truck_plate_number} • ${asn.container_number}</div>
              </div>
              <div>
                <div style="font-size:10.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Progress (Received / Expected)</div>
                <div class="mono" style="font-size:13px; font-weight:800; color:#059669; margin-top:2px;">
                  ${(asn.received_good_count || 0) + (asn.received_damaged_count || 0)} / ${asn.expected_items_count} units
                </div>
                <div style="font-size:10.5px; color:var(--text-dim);">Good: ${asn.received_good_count || 0} | Damage: ${asn.received_damaged_count || 0}</div>
              </div>
              <div>
                <div style="font-size:10.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Arrived / ETA</div>
                <div style="font-size:12px; font-weight:600; color:var(--text-main); margin-top:2px;">${asn.arrived_at ? asn.arrived_at.split('T')[0] : 'In Transit'}</div>
                <div style="font-size:10.5px; color:var(--text-dim);">${asn.completed_at ? 'Unloading Complete' : 'Active Receiving'}</div>
              </div>
            </div>

            <!-- Inbound Receiving & Lot Capture Workbench -->
            ${!isCompleted ? `
              <div style="background:#ffffff; padding:16px; border-radius:var(--radius-md); border:1px solid #c7d2fe; box-shadow:0 1px 3px rgba(79, 70, 229, 0.08); display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="font-size:12px; font-weight:800; color:var(--primary); text-transform:uppercase; display:flex; align-items:center; gap:6px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                    <span>Receive SKU & FEFO Lot Registration</span>
                  </div>
                  <span class="badge badge-purple" style="font-size:9.5px;">DIRECTED PUTAWAY ACTIVE</span>
                </div>

                <div style="display:grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap:10px;">
                  <div>
                    <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Select SKU Item</label>
                    <select id="inbound-sku-select" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:6px 8px; font-size:12px; font-weight:600; color:var(--text-main);">
                      ${skus.map(s => `
                        <option value="${s.id}">${s.name} (${s.sku_code})</option>
                      `).join('')}
                    </select>
                  </div>

                  <div>
                    <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Batch / Lot No.</label>
                    <input type="text" id="inbound-lot-input" value="LOT-2026-AJW-02" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:6px 8px; font-size:12px; font-weight:700; font-family:var(--font-mono); color:var(--text-main);" />
                  </div>

                  <div>
                    <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Expiry Date (FEFO)</label>
                    <input type="date" id="inbound-expiry-input" value="2027-12-31" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:5px 8px; font-size:12px; font-weight:600; color:var(--text-main);" />
                  </div>

                  <div>
                    <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Suggested Bin</label>
                    <select id="inbound-target-bin" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:6px 8px; font-size:12px; font-weight:700; color:var(--primary);">
                      <option value="bin-pick-b01">ZN01-A01-R01-L01-B01 (Cold Pick)</option>
                      <option value="bin-pick-b02">ZN01-A01-R01-L01-B02 (Cold Pick)</option>
                      <option value="bin-bulk-01">BULK-R01-PALLET-01 (Bulk Pallet)</option>
                    </select>
                  </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr 2fr; gap:10px; align-items:flex-end;">
                  <div>
                    <label style="font-size:11px; font-weight:700; color:#059669; text-transform:uppercase;">Good Qty (Units)</label>
                    <input type="number" id="inbound-qty-good" value="50" min="1" max="1000" style="width:100%; margin-top:4px; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:var(--radius-sm); padding:6px 8px; font-size:13px; font-weight:800; font-family:var(--font-mono); color:#065f46;" />
                  </div>

                  <div>
                    <label style="font-size:11px; font-weight:700; color:#dc2626; text-transform:uppercase;">Damaged Qty</label>
                    <input type="number" id="inbound-qty-damage" value="0" min="0" max="100" style="width:100%; margin-top:4px; background:#fef2f2; border:1px solid #fecaca; border-radius:var(--radius-sm); padding:6px 8px; font-size:13px; font-weight:800; font-family:var(--font-mono); color:#991b1b;" />
                  </div>

                  <button class="btn btn-primary" id="btn-execute-inbound-receive" style="padding:9px 14px; font-size:12.5px; font-weight:700;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Receive & Execute Putaway</span>
                  </button>
                </div>
              </div>
            ` : ''}

            <!-- ASN Item Lines Table -->
            <div style="background:#ffffff; padding:14px; border-radius:var(--radius-md); border:1px solid #e2e8f0; display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Manifest Item Lines</div>
              <div class="modal-table-container">
                <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:11.5px; width:100%;">
                  <thead>
                    <tr style="background:#f8fafc;">
                      <th style="padding:8px 10px;">Master SKU</th>
                      <th style="text-align:center; padding:8px 10px;">Expected</th>
                      <th style="text-align:center; padding:8px 10px;">Received Good</th>
                      <th style="text-align:center; padding:8px 10px;">Damaged / QC Fail</th>
                      <th style="padding:8px 10px;">Lot Number</th>
                      <th style="padding:8px 10px;">Expiry Date</th>
                      <th style="padding:8px 10px;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${asnItems.map(it => {
                      const sku = store.getItem('master_skus', it.master_sku_id);
                      return `
                        <tr>
                          <td style="padding:8px 10px;">
                            <div style="font-weight:700; color:var(--text-main);">${sku ? sku.name : it.master_sku_id}</div>
                            <div class="mono" style="font-size:10px; color:var(--text-dim);">${sku ? sku.sku_code : ''}</div>
                          </td>
                          <td class="mono" style="text-align:center; font-weight:700; padding:8px 10px;">${it.expected_qty}</td>
                          <td class="mono" style="text-align:center; font-weight:700; color:#059669; padding:8px 10px;">${it.received_good_qty}</td>
                          <td class="mono" style="text-align:center; font-weight:700; color:${it.received_damaged_qty > 0 ? '#dc2626' : 'var(--text-dim)'}; padding:8px 10px;">${it.received_damaged_qty}</td>
                          <td class="mono" style="padding:8px 10px; font-weight:600;">${it.lot_number || 'PENDING'}</td>
                          <td class="mono" style="padding:8px 10px; color:var(--text-dim);">${it.expiry_date || '-'}</td>
                          <td style="padding:8px 10px;"><span class="badge ${this.getAsnBadgeClass(it.status)}">${it.status}</span></td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Putaway Task Log -->
            <div style="background:#ffffff; padding:14px; border-radius:var(--radius-md); border:1px solid #e2e8f0; display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Directed Putaway Tasks Completed</div>
              ${putawayTasks.length === 0 ? `
                <div style="font-size:11.5px; color:var(--text-dim);">No putaway tasks recorded for this ASN yet.</div>
              ` : `
                <div style="display:flex; flex-direction:column; gap:6px;">
                  ${putawayTasks.map(pt => `
                    <div style="display:flex; align-items:center; justify-content:space-between; background:#f8fafc; padding:8px 12px; border-radius:var(--radius-sm); border:1px solid #f1f5f9; font-size:11.5px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span class="mono" style="font-weight:700; color:var(--primary);">${pt.task_number}</span>
                        <span><b>${pt.quantity} units</b> moved: <span class="mono" style="color:var(--text-dim);">${pt.from_bin_id}</span> &rarr; <span class="mono" style="font-weight:700; color:var(--primary);">${pt.target_bin_id}</span></span>
                      </div>
                      <span class="badge badge-success" style="font-size:9.5px;">${pt.status}</span>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-close-inbound-footer" style="font-size:12px;">
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEvents(asn);
  }

  attachEvents(asn) {
    const backdrop = this.querySelector('#inbound-modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
    }

    const closeBtn = this.querySelector('#btn-close-inbound-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const footerCloseBtn = this.querySelector('#btn-close-inbound-footer');
    if (footerCloseBtn) footerCloseBtn.addEventListener('click', () => this.close());

    const receiveBtn = this.querySelector('#btn-execute-inbound-receive');
    if (receiveBtn) {
      receiveBtn.addEventListener('click', () => {
        const skuId = this.querySelector('#inbound-sku-select').value;
        const lotNumber = this.querySelector('#inbound-lot-input').value || `LOT-${Date.now()}`;
        const expiryDate = this.querySelector('#inbound-expiry-input').value || '2027-12-31';
        const targetBinId = this.querySelector('#inbound-target-bin').value;
        const qtyGood = parseInt(this.querySelector('#inbound-qty-good').value || '0', 10);
        const qtyDamaged = parseInt(this.querySelector('#inbound-qty-damage').value || '0', 10);

        if (qtyGood <= 0 && qtyDamaged <= 0) {
          alert('Please enter valid received quantities.');
          return;
        }

        sound.play('success');
        store.receiveInboundItem({
          asnId: asn.id,
          masterSkuId: skuId,
          lotNumber,
          expiryDate,
          qtyGood,
          qtyDamaged,
          targetBinId
        });

        alert(`Successfully received ${qtyGood} good units into ${targetBinId} (and ${qtyDamaged} damaged units to quarantine)! Double-entry ledger updated.`);
        this.render();
      });
    }
  }

  getAsnBadgeClass(status) {
    if (['COMPLETED', 'RECEIVED'].includes(status)) return 'badge-success';
    if (['RECEIVING', 'RECEIVING_IN_PROGRESS', 'ARRIVED_AT_DOCK'].includes(status)) return 'badge-warning';
    if (['CANCELLED', 'REJECTED'].includes(status)) return 'badge-danger';
    return 'badge-info';
  }
}

customElements.define('wms-inbound-modal', WmsInboundModal);
