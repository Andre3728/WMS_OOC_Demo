/**
 * SuperDates WMS - Packing Bench & 100x150mm Thermal Shipping Label Spooler (Phase 6)
 * Real-time item-by-item BOM scan verification, packaging box selection, scale weight capture, and carrier label rendering.
 */

import { store } from '../mock/mockStore.js';
import { sound } from './wms-audio.js';

class WmsPackModal extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.orderId = null;
    this.scannedItems = new Set();
    this.selectedPackaging = 'BOX_MEDIUM';
    this.actualWeightKg = 0.65;
  }

  connectedCallback() {
    this.render();
  }

  open(orderId = 'ord-001') {
    this.orderId = orderId;
    this.isOpen = true;
    this.scannedItems.clear();
    this.selectedPackaging = 'BOX_MEDIUM';
    this.actualWeightKg = 0.65;
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

    const order = store.getItem('orders', this.orderId) || store.getTable('orders')[0];
    const items = (store.getTable('order_items') || []).filter(oi => oi.order_id === (order ? order.id : null));
    const courier = store.getItem('couriers', order ? order.courier_id : null);
    const storeAccount = store.getItem('marketplace_stores', order ? order.store_id : null);

    const allItemsScanned = items.length > 0 && items.every(it => this.scannedItems.has(it.id));

    this.innerHTML = `
      <div class="wms-modal-backdrop open" id="pack-modal-backdrop">
        <div class="wms-modal-card" style="max-width: 960px;">
          <!-- Modal Header -->
          <div class="modal-header">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="badge badge-purple" style="font-size:10px;">PACKING BENCH #02</div>
              <h3 style="font-size:16px; font-weight:800; color:var(--text-main);">${order ? order.order_code : 'Packing Station'}</h3>
              <span class="badge badge-info" style="font-size:10px;">${order ? order.merchant_name : 'SuperDates Store'}</span>
            </div>
            <button id="btn-close-pack-modal" class="sim-btn" style="padding:4px 8px; border:none; cursor:pointer;" title="Close Modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Modal Body: 2-Column Split (Left: BOM & Scale | Right: 100x150mm Label) -->
          <div class="modal-body" style="display:grid; grid-template-columns: 1.15fr 0.85fr; gap:18px;">
            
            <!-- Left Column: BOM Verification, Packaging & Scale -->
            <div style="display:flex; flex-direction:column; gap:14px;">
              
              <!-- 1. Order Summary Card -->
              <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:12px 14px; box-shadow:var(--shadow-xs); display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Recipient & Destination</div>
                  <div style="font-size:13.5px; font-weight:800; color:var(--text-main);">${order.recipient_name}</div>
                  <div style="font-size:11px; color:var(--text-dim);">${order.recipient_city} • ${order.sla_tier}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Carrier & AWB</div>
                  <div style="font-size:13px; font-weight:800; color:var(--primary);">${courier ? courier.name : order.courier_id}</div>
                  <div class="mono" style="font-size:11px; color:var(--text-dim);">${order.awb_number || 'PENDING'}</div>
                </div>
              </div>

              <!-- 2. Item-by-Item BOM Scan Verification -->
              <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:14px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="font-size:11px; font-weight:800; color:var(--text-main); text-transform:uppercase; display:flex; align-items:center; gap:6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span>Bill of Materials (BOM) Scan Check</span>
                  </div>
                  <span class="badge ${allItemsScanned ? 'badge-success' : 'badge-warning'}" style="font-size:9.5px;">
                    ${this.scannedItems.size} of ${items.length} Items Verified
                  </span>
                </div>

                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${items.map(it => {
                    const isScanned = this.scannedItems.has(it.id);
                    const sku = store.getItem('master_skus', it.master_sku_id);
                    return `
                      <div style="background:${isScanned ? '#ecfdf5' : '#f8fafc'}; border:1px solid ${isScanned ? '#a7f3d0' : '#e2e8f0'}; border-radius:var(--radius-md); padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                          <div style="display:flex; align-items:center; gap:6px;">
                            <span class="mono" style="font-weight:800; color:${isScanned ? '#065f46' : 'var(--primary)'}; font-size:12px;">${it.ordered_qty}x</span>
                            <span style="font-weight:700; color:var(--text-main); font-size:12.5px;">${it.item_name}</span>
                          </div>
                          <div class="mono" style="font-size:10.5px; color:var(--text-dim); margin-top:2px;">
                            Barcode: ${sku ? sku.sku_code : '8991001234561'} • Lot: LOT-2026-AJW-01
                          </div>
                        </div>

                        ${isScanned ? `
                          <div style="display:flex; align-items:center; gap:4px; color:#059669; font-weight:800; font-size:11.5px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>VERIFIED</span>
                          </div>
                        ` : `
                          <button class="btn btn-secondary" style="padding:4px 10px; font-size:11.5px; font-weight:700;" onclick="window.wmsPackModal.handleScanBomItem('${it.id}')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                              <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                            <span>Scan SKU</span>
                          </button>
                        `}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- 3. Packaging Box Selector & Digital Scale Weight -->
              <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:14px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:10px;">
                <div style="font-size:11px; font-weight:800; color:var(--text-main); text-transform:uppercase;">
                  Packaging Material & Scale Weight
                </div>

                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:8px;">
                  <div class="filter-chip-card ${this.selectedPackaging === 'BOX_MEDIUM' ? 'active' : ''}" data-pkg="BOX_MEDIUM" style="padding:8px 10px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                    <div>
                      <div style="font-weight:700;">Box Medium (M)</div>
                      <div style="font-size:10px; color:var(--text-dim);">20 x 15 x 10 cm</div>
                    </div>
                  </div>

                  <div class="filter-chip-card ${this.selectedPackaging === 'THERMAL_COOLER' ? 'active-purple' : ''}" data-pkg="THERMAL_COOLER" style="padding:8px 10px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <div>
                      <div style="font-weight:700;">Cold Chain Pouch</div>
                      <div style="font-size:10px; color:var(--text-dim);">Thermal Foil 15°C</div>
                    </div>
                  </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:10px 14px; border-radius:var(--radius-md); border:1px solid #e2e8f0; margin-top:4px;">
                  <div>
                    <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Digital Bench Scale</div>
                    <div class="mono" style="font-size:18px; font-weight:800; color:#059669;">${this.actualWeightKg} kg</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Volumetric Weight</div>
                    <div class="mono" style="font-size:14px; font-weight:700; color:var(--text-muted);">0.58 kg</div>
                  </div>
                </div>
              </div>

            </div>

            <!-- Right Column: High-Resolution 100x150mm Thermal Shipping Label -->
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div style="font-size:11px; font-weight:800; color:var(--text-dim); text-transform:uppercase; display:flex; justify-content:space-between; align-items:center;">
                <span>100x150mm Thermal Shipping Label</span>
                <span class="badge badge-info" style="font-size:9px;">203 DPI PREVIEW</span>
              </div>

              <!-- Thermal Shipping Label Frame -->
              <div style="background:#ffffff; border:2px solid #0f172a; border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:8px; font-family:var(--font-sans); color:#000000; box-shadow:var(--shadow-md);">
                
                <!-- Label Header: Carrier Logo & SLA -->
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000000; padding-bottom:6px;">
                  <div style="font-weight:900; font-size:15px; letter-spacing:-0.02em;">
                    ${courier ? courier.name.toUpperCase() : 'SPX STANDARD'}
                  </div>
                  <div style="font-weight:800; font-size:11px; border:2px solid #000000; padding:2px 6px; border-radius:4px;">
                    ${order.sla_tier === 'INSTANT_2H' ? 'INSTANT' : (order.sla_tier === 'CARGO_BULKY' ? 'CARGO' : 'REGULER')}
                  </div>
                </div>

                <!-- 1D Barcode Simulation & AWB Number -->
                <div style="display:flex; flex-direction:column; align-items:center; padding:6px 0; border-bottom:1px solid #000000;">
                  <!-- Barcode Visual Bars -->
                  <div style="display:flex; gap:2px; height:46px; align-items:stretch; width:92%; justify-content:center;">
                    <span style="width:3px; background:#000;"></span><span style="width:1px; background:#fff;"></span><span style="width:4px; background:#000;"></span>
                    <span style="width:2px; background:#000;"></span><span style="width:1px; background:#fff;"></span><span style="width:2px; background:#000;"></span>
                    <span style="width:5px; background:#000;"></span><span style="width:2px; background:#fff;"></span><span style="width:3px; background:#000;"></span>
                    <span style="width:2px; background:#000;"></span><span style="width:1px; background:#fff;"></span><span style="width:4px; background:#000;"></span>
                    <span style="width:3px; background:#000;"></span><span style="width:2px; background:#fff;"></span><span style="width:2px; background:#000;"></span>
                    <span style="width:4px; background:#000;"></span><span style="width:1px; background:#fff;"></span><span style="width:5px; background:#000;"></span>
                    <span style="width:2px; background:#000;"></span><span style="width:2px; background:#fff;"></span><span style="width:3px; background:#000;"></span>
                    <span style="width:3px; background:#000;"></span><span style="width:1px; background:#fff;"></span><span style="width:4px; background:#000;"></span>
                  </div>
                  <div class="mono" style="font-weight:800; font-size:13px; letter-spacing:0.08em; margin-top:3px;">
                    ${order.awb_number || 'SPXID029910012345'}
                  </div>
                </div>

                <!-- Recipient & Destination Box -->
                <div style="border-bottom:1px solid #000000; padding-bottom:6px; font-size:11px;">
                  <div style="font-weight:700; font-size:9.5px; text-transform:uppercase;">Penerima (To):</div>
                  <div style="font-weight:800; font-size:13px; margin:1px 0;">${order.recipient_name}</div>
                  <div>0812-9876-XXXX</div>
                  <div style="margin-top:2px; font-size:10.5px; line-height:1.3;">
                    Jl. Kebon Jeruk Raya No. 45, RT 02 / RW 05, Kebon Jeruk, Jakarta Barat, DKI Jakarta, 11530
                  </div>
                </div>

                <!-- Sender Merchant Box & COD Indicator -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #000000; padding-bottom:6px; font-size:10.5px;">
                  <div>
                    <div style="font-weight:700; font-size:9px; text-transform:uppercase;">Pengirim (From):</div>
                    <div style="font-weight:800;">${order.merchant_name || 'SuperDates Store'}</div>
                    <div style="font-size:10px;">Jakarta Hub DC (WH-JKT-01)</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-weight:800; font-size:11.5px; border:1.5px solid #000000; padding:2px 6px; border-radius:3px;">
                      ${order.is_cod ? `COD: Rp ${(order.total_order_amount || 0).toLocaleString('id-ID')}` : 'NON-COD'}
                    </div>
                    <div style="font-size:9.5px; margin-top:2px;">Berat: ${this.actualWeightKg} kg</div>
                  </div>
                </div>

                <!-- SKU Summary Footer on Label -->
                <div style="font-size:9.5px;">
                  <div style="font-weight:700; text-transform:uppercase;">Order Items:</div>
                  ${items.map(it => `
                    <div>&bull; ${it.ordered_qty}x ${it.item_name}</div>
                  `).join('')}
                </div>

              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-close-pack-footer" style="font-size:12px;">
              Close
            </button>
            <button class="btn btn-primary" id="btn-confirm-pack-and-print" ${allItemsScanned ? '' : 'disabled'} style="font-size:12.5px; font-weight:800;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              <span>${allItemsScanned ? 'Print Label & Seal Parcel (Ready for 3PL)' : 'Scan All Items to Enable Print'}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  handleScanBomItem(itemId) {
    sound.play('scan');
    this.scannedItems.add(itemId);
    this.render();
  }

  attachEvents() {
    const backdrop = this.querySelector('#pack-modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
    }

    const closeBtn = this.querySelector('#btn-close-pack-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const footerCloseBtn = this.querySelector('#btn-close-pack-footer');
    if (footerCloseBtn) footerCloseBtn.addEventListener('click', () => this.close());

    // Packaging Material Selection
    this.querySelectorAll('[data-pkg]').forEach(chip => {
      chip.addEventListener('click', () => {
        this.selectedPackaging = chip.getAttribute('data-pkg');
        sound.play('click');
        this.render();
      });
    });

    const printBtn = this.querySelector('#btn-confirm-pack-and-print');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        sound.play('success');

        store.completeOrderPacking({
          orderId: this.orderId,
          packagingBox: this.selectedPackaging,
          actualWeightKg: this.actualWeightKg
        });

        alert(`Thermal Shipping Label spooled to Zebra ZT411 Printer! Order packed and staged at CHUTE-SPX.`);
        this.close();
      });
    }
  }
}

customElements.define('wms-pack-modal', WmsPackModal);
window.wmsPackModal = new WmsPackModal();
