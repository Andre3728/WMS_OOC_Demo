/**
 * SuperDates WMS - Order Inspector Modal Component (v2.4)
 * Contained Centered Modal with Zero Overflow Clipping
 */

import { store } from '../mock/mockStore.js';
import { sound } from './wms-audio.js';

class WmsOrderModal extends HTMLElement {
  constructor() {
    super();
    this.orderId = null;
    this.isOpen = false;
  }

  connectedCallback() {
    this.render();
  }

  open(orderId) {
    this.orderId = orderId;
    this.isOpen = true;
    sound.play('click');
    this.render();
  }

  close() {
    this.isOpen = false;
    this.render();
  }

  render() {
    if (!this.isOpen || !this.orderId) {
      this.innerHTML = '';
      return;
    }

    const order = store.getItem('orders', this.orderId);
    if (!order) {
      this.innerHTML = '';
      return;
    }

    const items = store.getTable('order_items').filter(oi => oi.order_id === order.id);
    const courier = store.getItem('couriers', order.courier_id);
    const ledgerEvents = (store.getTable('inventory_ledger') || []).filter(
      l => l.reference_doc_id === order.order_code || l.reference_doc_id === order.id
    );

    this.innerHTML = `
      <div class="wms-modal-backdrop open" id="order-modal-backdrop">
        <div class="wms-modal-card" style="max-width: 820px;">
          <!-- Modal Header -->
          <div class="modal-header">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="badge badge-info" style="font-size:10px;">${order.channel_id.replace('chn-', '').toUpperCase()}</div>
              <h3 style="font-size:16px; font-weight:800; color:var(--text-main);">${order.order_code}</h3>
              <span class="badge ${this.getStatusBadgeClass(order.wms_status)}">${order.wms_status}</span>
            </div>
            <button id="btn-close-order-modal" class="sim-btn" style="padding:4px 8px; border:none; cursor:pointer;" title="Close Modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
            
            <!-- Summary Info Grid -->
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; background:#ffffff; padding:14px; border-radius:var(--radius-md); border:1px solid #e2e8f0; width:100%; box-sizing:border-box;">
              <div>
                <div style="font-size:10.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Merchant Shop</div>
                <div style="font-size:12.5px; font-weight:700; color:var(--text-main); margin-top:2px;">${order.merchant_name || 'SuperDates Store'}</div>
                <div style="font-size:10.5px; color:var(--text-dim);">${order.external_order_sn || order.external_order_id}</div>
              </div>
              <div>
                <div style="font-size:10.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Courier & SLA</div>
                <div style="font-size:12.5px; font-weight:700; color:var(--text-main); margin-top:2px;">${courier ? courier.name : order.courier_id}</div>
                <div class="mono" style="font-size:10.5px; color:var(--primary); font-weight:600;">${order.awb_number || 'PENDING AWB'}</div>
              </div>
              <div>
                <div style="font-size:10.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Total Amount</div>
                <div class="mono" style="font-size:13px; font-weight:800; color:#059669; margin-top:2px;">Rp ${(order.total_order_amount || 0).toLocaleString('id-ID')}</div>
                <div style="font-size:10.5px; color:var(--text-dim);">${order.is_cod ? 'Cash on Delivery (COD)' : 'Prepaid (Non-COD)'}</div>
              </div>
            </div>

            <!-- Recipient & Delivery Address -->
            <div style="background:#ffffff; padding:14px; border-radius:var(--radius-md); border:1px solid #e2e8f0; width:100%; box-sizing:border-box;">
              <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase; margin-bottom:4px;">Delivery Destination</div>
              <div style="font-size:12.5px; font-weight:700; color:var(--text-main);">${order.recipient_name} • ${order.recipient_phone || '0812-xxxx-xxxx'}</div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${order.recipient_address || 'Jl. Daan Mogot KM 12, Cengkareng, Jakarta Barat'}</div>
            </div>

            <!-- Ordered Items & Bin Allocation BOM -->
            <div style="background:#ffffff; padding:14px; border-radius:var(--radius-md); border:1px solid #e2e8f0; display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Order Items & Physical Bin Reservation</div>
              <div class="modal-table-container">
                <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:11.5px; width:100%;">
                  <thead>
                    <tr style="background:#f8fafc;">
                      <th style="padding:8px 10px;">SKU Name</th>
                      <th style="text-align:center; padding:8px 10px;">Ordered</th>
                      <th style="text-align:center; padding:8px 10px;">Allocated</th>
                      <th style="padding:8px 10px;">Reserved Bin</th>
                      <th style="padding:8px 10px;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items.map(it => {
                      const sku = store.getItem('master_skus', it.master_sku_id);
                      const binCode = sku && sku.sku_code.includes('AJWA') ? 'ZN01-A01-R01-L01-B01' : 'ZN01-A01-R01-L01-B02';
                      return `
                        <tr>
                          <td style="padding:8px 10px;">
                            <div style="font-weight:700; color:var(--text-main);">${it.item_name}</div>
                            <div class="mono" style="font-size:10px; color:var(--text-dim);">${sku ? sku.sku_code : it.master_sku_id}</div>
                          </td>
                          <td class="mono" style="text-align:center; font-weight:700; padding:8px 10px;">${it.ordered_qty}</td>
                          <td class="mono" style="text-align:center; font-weight:700; color:#059669; padding:8px 10px;">${it.allocated_qty}</td>
                          <td class="mono" style="font-weight:700; color:var(--primary); padding:8px 10px;">${binCode}</td>
                          <td style="padding:8px 10px;"><span class="badge badge-success">${it.status}</span></td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Double-Entry Audit Ledger Events for this Order -->
            <div style="background:#ffffff; padding:14px; border-radius:var(--radius-md); border:1px solid #e2e8f0; width:100%; box-sizing:border-box;">
              <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase; margin-bottom:8px;">Associated Double-Entry Ledger Transactions</div>
              ${ledgerEvents.length === 0 ? `
                <div style="font-size:11.5px; color:var(--text-dim);">No direct ledger records yet.</div>
              ` : `
                <div style="display:flex; flex-direction:column; gap:6px;">
                  ${ledgerEvents.map(l => `
                    <div style="display:flex; align-items:center; justify-content:space-between; background:#f8fafc; padding:8px 12px; border-radius:var(--radius-sm); border:1px solid #f1f5f9; font-size:11.5px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span class="badge badge-purple" style="font-size:9.5px;">${l.transaction_type}</span>
                        <span class="mono" style="font-weight:600;">Qty: ${l.quantity} (${l.from_state} &rarr; ${l.to_state})</span>
                      </div>
                      <span class="mono" style="color:var(--text-dim); font-size:11px;">${l.created_at.split('T')[1] || l.created_at}</span>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

          </div>

          <!-- Modal Footer Actions -->
          <div class="modal-footer">
            <div style="margin-right:auto;">
              ${order.wms_status !== 'CANCELLED' && order.wms_status !== 'SHIPPED' ? `
                <button class="btn btn-danger" id="btn-modal-cancel-order" style="font-size:12px; padding:6px 12px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Cancel Order (Restock)</span>
                </button>
              ` : ''}
            </div>

            <div style="display:flex; gap:8px;">
              ${order.wms_status === 'PENDING_ALLOCATION' ? `
                <button class="btn btn-primary" id="btn-modal-allocate-order" style="font-size:12px;">
                  <span>Allocate Stock Now</span>
                </button>
              ` : ''}
              <button class="btn btn-secondary" id="btn-modal-close" style="font-size:12px;">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents(order);
  }

  attachEvents(order) {
    const backdrop = this.querySelector('#order-modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
    }

    const closeBtn = this.querySelector('#btn-close-order-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const footerCloseBtn = this.querySelector('#btn-modal-close');
    if (footerCloseBtn) footerCloseBtn.addEventListener('click', () => this.close());

    const allocateBtn = this.querySelector('#btn-modal-allocate-order');
    if (allocateBtn) {
      allocateBtn.addEventListener('click', () => {
        sound.play('success');
        store.allocatePendingOrder(order.id);
        alert(`Stock successfully reserved for ${order.order_code}!`);
        this.render();
      });
    }

    const cancelBtn = this.querySelector('#btn-modal-cancel-order');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (confirm(`Cancel order ${order.order_code} and return stock to RESTOCK_STAGING?`)) {
          sound.play('alarm');
          store.simulateCancelIntercept(order.id);
          alert(`Order ${order.order_code} cancelled. Stock safely routed to restock staging.`);
          this.render();
        }
      });
    }
  }

  getStatusBadgeClass(status) {
    if (['ALLOCATED', 'COMPLETED', 'PASSED', 'APPROVED', 'SHIPPED'].includes(status)) return 'badge-success';
    if (['PENDING', 'PENDING_ALLOCATION', 'IN_PROGRESS', 'PICKING', 'PACKING'].includes(status)) return 'badge-warning';
    if (['CANCELLED', 'REJECTED', 'DAMAGED'].includes(status)) return 'badge-danger';
    if (['INSTANT_2H', 'BATCHED_IN_WAVE'].includes(status)) return 'badge-purple';
    return 'badge-info';
  }
}

customElements.define('wms-order-modal', WmsOrderModal);
