/**
 * SuperDates WMS - Wave Batching Generator Modal Component (v2.4)
 * Properly Formatted Centered Overlay with Contained Tables and Zero Overflow
 */

import { store } from '../mock/mockStore.js';
import { sound } from './wms-audio.js';

class WmsWaveModal extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.selectedOrderIds = new Set();
  }

  connectedCallback() {
    this.render();
  }

  open(preSelectedOrderIds = null) {
    this.isOpen = true;
    const allocatedOrders = store.getTable('orders').filter(o => o.wms_status === 'ALLOCATED');
    if (preSelectedOrderIds && preSelectedOrderIds.length > 0) {
      this.selectedOrderIds = new Set(preSelectedOrderIds);
    } else {
      this.selectedOrderIds = new Set(allocatedOrders.map(o => o.id));
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

    const allocatedOrders = store.getTable('orders').filter(o => o.wms_status === 'ALLOCATED');
    const couriers = store.getTable('couriers');

    this.innerHTML = `
      <div class="wms-modal-backdrop open" id="wave-modal-backdrop">
        <div class="wms-modal-card" style="max-width: 860px;">
          <!-- Modal Header -->
          <div class="modal-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12h20"></path>
                <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"></path>
              </svg>
              <h3 style="font-size:16px; font-weight:800; color:var(--text-main);">Generate Wave Batch & Pick List</h3>
            </div>
            <button id="btn-close-wave-modal" class="sim-btn" style="padding:4px 8px; border:none; cursor:pointer;" title="Close Modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
            
            <!-- Wave Configuration Grid (Properly Boxed) -->
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; background:#ffffff; padding:14px; border-radius:var(--radius-md); border:1px solid #e2e8f0; width:100%; box-sizing:border-box;">
              <div>
                <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Carrier Grouping</label>
                <select id="wave-courier-select" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:6px 8px; font-size:12px; font-weight:600; color:var(--text-main);">
                  <option value="ALL">All Couriers (Consolidated)</option>
                  ${couriers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
              </div>

              <div>
                <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Pick Path Strategy</label>
                <select id="wave-strategy-select" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:6px 8px; font-size:12px; font-weight:600; color:var(--text-main);">
                  <option value="S_SHAPE">S-Shape Optimized Aisle Traversal</option>
                  <option value="CHEVRON">Chevron Shortest Path</option>
                  <option value="ZONE">Zone Consolidation</option>
                </select>
              </div>

              <div>
                <label style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Assign Floor Picker</label>
                <select id="wave-picker-select" style="width:100%; margin-top:4px; background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:6px 8px; font-size:12px; font-weight:600; color:var(--text-main);">
                  <option value="usr-pick-01">Budi Setiawan (PDA #04)</option>
                  <option value="usr-pick-02">Andi Prasetyo (PDA #05)</option>
                </select>
              </div>
            </div>

            <!-- Candidate Orders Selection List (Contained Scrollable Table) -->
            <div style="background:#ffffff; padding:14px; border-radius:var(--radius-md); border:1px solid #e2e8f0; display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">
                  Candidate Orders for Wave Batch (${allocatedOrders.length} Available)
                </div>
                <span style="font-size:11px; color:var(--primary); font-weight:700;">
                  ${this.selectedOrderIds.size} Orders Selected
                </span>
              </div>

              ${allocatedOrders.length === 0 ? `
                <div style="text-align:center; padding:20px; color:var(--text-dim); font-size:12px;">
                  No orders currently in ALLOCATED status ready for batching.
                </div>
              ` : `
                <div class="modal-table-container">
                  <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:11.5px; width:100%;">
                    <thead>
                      <tr style="background:#f8fafc;">
                        <th style="width:36px; text-align:center; padding:8px;">
                          <input type="checkbox" id="check-all-wave-orders" ${this.selectedOrderIds.size === allocatedOrders.length ? 'checked' : ''} />
                        </th>
                        <th style="padding:8px 10px;">Order Code</th>
                        <th style="padding:8px 10px;">Store / Merchant</th>
                        <th style="padding:8px 10px;">Courier & SLA</th>
                        <th style="padding:8px 10px;">Items (BOM)</th>
                        <th style="padding:8px 10px;">Destination</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${allocatedOrders.map(o => {
                        const isChecked = this.selectedOrderIds.has(o.id);
                        const items = store.getTable('order_items').filter(oi => oi.order_id === o.id);
                        const courier = store.getItem('couriers', o.courier_id);
                        return `
                          <tr>
                            <td style="text-align:center; padding:8px;">
                              <input type="checkbox" class="wave-order-check" data-order-id="${o.id}" ${isChecked ? 'checked' : ''} />
                            </td>
                            <td class="mono" style="font-weight:700; color:var(--primary); padding:8px 10px;">${o.order_code}</td>
                            <td style="padding:8px 10px; font-weight:600; max-width:180px; overflow:hidden; text-overflow:ellipsis;">${o.merchant_name}</td>
                            <td style="padding:8px 10px; white-space:nowrap;">
                              <span>${courier ? courier.name : o.courier_id}</span>
                              <span class="badge ${o.sla_tier === 'INSTANT_2H' ? 'badge-purple' : (o.sla_tier === 'CARGO_BULKY' ? 'badge-warning' : 'badge-info')}" style="font-size:9px; padding:1px 4px; margin-left:4px;">${o.sla_tier}</span>
                            </td>
                            <td style="padding:8px 10px; font-size:11px;">
                              ${items.map(it => `<div><b>${it.ordered_qty}x</b> ${it.item_name}</div>`).join('')}
                            </td>
                            <td style="padding:8px 10px; color:var(--text-dim);">${o.recipient_city}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>

            <!-- Route Optimization Sequence Preview -->
            <div style="background:#f1f5f9; padding:12px 14px; border-radius:var(--radius-md); border:1px solid #e2e8f0; display:flex; align-items:center; gap:12px; width:100%; box-sizing:border-box;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="flex-shrink:0;">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              <div style="font-size:11.5px; overflow:hidden;">
                <div style="font-weight:700; color:var(--text-main);">S-Shape Traversal Sequence Ready:</div>
                <div style="color:var(--text-muted); font-family:var(--font-mono); margin-top:2px; white-space:normal;">
                  Zone COLD &rarr; Aisle A01 (Bins B01, B02, B03) &rarr; Handover Staging STAGE-A-04
                </div>
              </div>
            </div>

          </div>

          <!-- Modal Footer Actions -->
          <div class="modal-footer">
            <div style="font-size:11.5px; color:var(--text-dim); margin-right:auto;">
              Generates Pick Tasks on Mobile PDA & updates order statuses to <b>BATCHED_IN_WAVE</b>.
            </div>

            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary" id="btn-cancel-wave-modal" style="font-size:12px;">
                Cancel
              </button>
              <button class="btn btn-primary" id="btn-confirm-release-wave" style="font-size:12px;" ${this.selectedOrderIds.size === 0 ? 'disabled' : ''}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                <span>Release Wave to PDA (${this.selectedOrderIds.size} Orders)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents(allocatedOrders);
  }

  attachEvents(allocatedOrders) {
    const backdrop = this.querySelector('#wave-modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
    }

    const closeBtn = this.querySelector('#btn-close-wave-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const cancelBtn = this.querySelector('#btn-cancel-wave-modal');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());

    const checkAll = this.querySelector('#check-all-wave-orders');
    if (checkAll) {
      checkAll.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.selectedOrderIds = new Set(allocatedOrders.map(o => o.id));
        } else {
          this.selectedOrderIds.clear();
        }
        this.render();
      });
    }

    this.querySelectorAll('.wave-order-check').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const orderId = chk.getAttribute('data-order-id');
        if (e.target.checked) {
          this.selectedOrderIds.add(orderId);
        } else {
          this.selectedOrderIds.delete(orderId);
        }
        this.render();
      });
    });

    const releaseBtn = this.querySelector('#btn-confirm-release-wave');
    if (releaseBtn) {
      releaseBtn.addEventListener('click', () => {
        const orderIds = Array.from(this.selectedOrderIds);
        if (!orderIds.length) return;

        const courierId = this.querySelector('#wave-courier-select').value;
        const strategy = this.querySelector('#wave-strategy-select').value;
        const pickerId = this.querySelector('#wave-picker-select').value;

        sound.play('success');
        const result = store.createWave({
          orderIds,
          courierId: courierId === 'ALL' ? 'courier-spx' : courierId,
          waveStrategy: strategy,
          pickerUserId: pickerId,
          toteId: 'TOTE-001'
        });

        this.close();

        if (result) {
          alert(`Wave ${result.wave.wave_number} generated with ${result.ordersCount} orders! Dispatched to Picker's PDA with S-Shape route traversal.`);
        }
      });
    }
  }
}

customElements.define('wms-wave-modal', WmsWaveModal);
