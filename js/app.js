/**
 * SuperDates WMS - Main Application Bootloader & View Router (v3.3)
 * Complete Phase 9: Executive Fulfillment Pulse Dashboards, Productivity Analytics & System Integrity
 */

import './components/wms-audio.js';
import './components/wms-data-inspector.js';
import './components/wms-layout.js';
import './components/wms-order-modal.js';
import './components/wms-wave-modal.js';
import './components/wms-manual-pick-modal.js';
import './components/wms-inbound-modal.js';
import './components/wms-stock-transfer-modal.js';
import './components/wms-opname-modal.js';
import './components/wms-pick-path-modal.js';
import './components/wms-pda-terminal.js';
import './components/wms-pack-modal.js';
import './components/wms-manifest-modal.js';
import './components/wms-return-modal.js';
import { store } from './mock/mockStore.js';
import { sound } from './components/wms-audio.js';

class WmsApp {
  constructor() {
    this.currentView = 'orders';
    this.currentMode = 'split';

    // Inventory Sub-Tab State
    this.inventorySubTab = 'balances';

    // Individual Filter Accordion Group States (Orders)
    this.filterGroupState = {
      platform: true,
      merchant: true,
      status: true,
      courier: true,
      sla: true
    };

    // Inbound Filter States
    this.inboundFilters = {
      status: 'ALL',
      supplierId: 'ALL'
    };

    // Inventory Filter States
    this.inventoryFilters = {
      zoneId: 'ALL',
      skuId: 'ALL',
      statusAlert: 'ALL',
      searchQuery: ''
    };

    // Omnichannel Filter State
    this.filters = {
      channel: 'ALL',
      merchantId: 'ALL',
      marketplaceStatus: 'ALL',
      wmsStatus: 'ALL',
      courierId: 'ALL',
      deliveryTier: 'ALL',
      searchQuery: ''
    };

    // Row Checkbox Selection State
    this.selectedOrderIds = new Set();
  }

  init() {
    document.addEventListener('wms:viewchange', (e) => {
      this.currentView = e.detail.view;
      this.currentMode = e.detail.mode;
      if (this.currentView === 'instant') {
        this.filters.deliveryTier = 'INSTANT_2H';
      } else if (this.filters.deliveryTier === 'INSTANT_2H' && this.currentView === 'orders') {
        this.filters.deliveryTier = 'ALL';
      }
      this.render();
    });

    this.render();

    store.subscribeAll(() => {
      this.updateBadges();
      if (['orders', 'instant', 'inventory', 'waves', 'inbound', 'packing', 'sortation', 'returns', 'analytics'].includes(this.currentView)) {
        this.render();
      }
    });
    this.updateBadges();
  }

  updateBadges() {
    const ordersBadge = document.getElementById('badge-orders-count');
    if (ordersBadge) {
      ordersBadge.textContent = (store.getTable('orders') || []).length;
    }
  }

  render() {
    const container = document.getElementById('wms-view-content');
    if (!container) return;

    if (this.currentMode === 'pda') {
      this.renderPdaWrapper(container);
      return;
    }

    switch (this.currentView) {
      case 'orders':
      case 'instant':
        this.renderOrdersView(container);
        break;
      case 'inbound':
        this.renderInboundView(container);
        break;
      case 'inventory':
        this.renderInventoryView(container);
        break;
      case 'waves':
        this.renderWavesView(container);
        break;
      case 'picking':
        this.renderPickingView(container);
        break;
      case 'packing':
        this.renderPackingView(container);
        break;
      case 'sortation':
        this.renderSortationView(container);
        break;
      case 'returns':
        this.renderReturnsView(container);
        break;
      case 'analytics':
        this.renderAnalyticsView(container);
        break;
      default:
        this.renderOrdersView(container);
    }
  }

  // --- 1. Omnichannel Order Control Center ---
  renderOrdersView(container) {
    const allOrders = store.getTable('orders');
    const channels = store.getTable('marketplace_channels');
    const stores = store.getTable('marketplace_stores');
    const couriers = store.getTable('couriers');

    const visibleStores = stores.filter(
      s => this.filters.channel === 'ALL' || s.channel_id === this.filters.channel
    );

    let filteredOrders = allOrders.filter(o => {
      if (this.filters.channel !== 'ALL' && o.channel_id !== this.filters.channel) return false;
      if (this.filters.merchantId !== 'ALL' && o.store_id !== this.filters.merchantId) return false;
      if (this.filters.marketplaceStatus !== 'ALL' && o.marketplace_status !== this.filters.marketplaceStatus) return false;
      if (this.filters.wmsStatus !== 'ALL' && o.wms_status !== this.filters.wmsStatus) return false;
      if (this.filters.courierId !== 'ALL' && o.courier_id !== this.filters.courierId) return false;
      if (this.filters.deliveryTier !== 'ALL' && o.sla_tier !== this.filters.deliveryTier) return false;
      if (this.filters.searchQuery) {
        const q = this.filters.searchQuery.toLowerCase();
        const matchText = `${o.order_code} ${o.external_order_id} ${o.external_order_sn || ''} ${o.recipient_name} ${o.awb_number || ''} ${o.merchant_name || ''}`.toLowerCase();
        if (!matchText.includes(q)) return false;
      }
      return true;
    });

    const isInstantOnly = this.filters.deliveryTier === 'INSTANT_2H';

    let activeFilterCount = 0;
    if (this.filters.channel !== 'ALL') activeFilterCount++;
    if (this.filters.merchantId !== 'ALL') activeFilterCount++;
    if (this.filters.marketplaceStatus !== 'ALL') activeFilterCount++;
    if (this.filters.courierId !== 'ALL') activeFilterCount++;
    if (this.filters.deliveryTier !== 'ALL') activeFilterCount++;
    if (this.filters.searchQuery) activeFilterCount++;

    const isAllVisibleChecked = filteredOrders.length > 0 && filteredOrders.every(o => this.selectedOrderIds.has(o.id));

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:14px; position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size:18px; font-weight:800; color:var(--text-main); letter-spacing:-0.02em; display:flex; align-items:center; gap:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              <span>${isInstantOnly ? 'VIP Instant Delivery Queue (2h SLA)' : 'Omnichannel Order Control Center'}</span>
            </h2>
            <p style="color:var(--text-muted); font-size:12px; margin-top:2px;">
              Multi-merchant routing across Tokopedia, Shopee, TikTok Shop, Lazada & Couriers • Click any row to inspect details
            </p>
          </div>

          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary" id="btn-open-wave-generator">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12h20"></path>
                <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"></path>
              </svg>
              <span>Generate Wave Batch</span>
            </button>
          </div>
        </div>

        <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:16px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:12px; font-weight:800; color:var(--text-main);">Omnichannel Filters</span>
              <span style="font-size:11px; color:var(--text-dim);">(${filteredOrders.length} of ${allOrders.length} orders match)</span>
              ${activeFilterCount > 0 ? `<span class="badge badge-purple" style="font-size:9.5px; padding:1px 6px;">${activeFilterCount} Active</span>` : ''}
            </div>

            <div style="display:flex; gap:8px;">
              <input 
                type="text" 
                id="filter-search"
                value="${this.filters.searchQuery}"
                placeholder="Search Order / AWB / Buyer / SKU..." 
                style="background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:5px 10px; font-size:12px; color:var(--text-main); width:240px;"
              />
              ${activeFilterCount > 0 ? `
                <button class="btn btn-secondary" id="btn-clear-filters" style="padding:4px 10px; font-size:11.5px; color:var(--danger-text);" title="Reset All Filters">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Reset All</span>
                </button>
              ` : ''}
            </div>
          </div>

          <div class="filter-accordion-group">
            <div class="filter-accordion-header" data-toggle-group="platform">
              <div class="filter-accordion-title">
                <span>1. Platform</span>
                <span class="badge badge-info" style="font-size:9px; padding:0 5px;">${this.filters.channel === 'ALL' ? 'All Channels' : this.filters.channel.replace('chn-', '').toUpperCase()}</span>
              </div>
              <svg class="filter-chevron-icon ${this.filterGroupState.platform ? 'rotated' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div class="filter-accordion-content ${this.filterGroupState.platform ? '' : 'collapsed'}">
              <div class="filter-chip-card ${this.filters.channel === 'ALL' ? 'active' : ''}" data-filter-type="channel" data-value="ALL">
                <span>All Platforms</span>
                <span class="nav-badge">${allOrders.length}</span>
              </div>
              ${channels.map(c => `
                <div class="filter-chip-card ${this.filters.channel === c.id ? 'active' : ''}" data-filter-type="channel" data-value="${c.id}">
                  <span>${c.name}</span>
                  <span class="nav-badge">${allOrders.filter(o => o.channel_id === c.id).length}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="filter-accordion-group">
            <div class="filter-accordion-header" data-toggle-group="merchant">
              <div class="filter-accordion-title">
                <span>2. Merchant Shop Account</span>
                <span class="badge badge-info" style="font-size:9px; padding:0 5px;">${this.filters.merchantId === 'ALL' ? `${visibleStores.length} Stores` : 'Filtered'}</span>
              </div>
              <svg class="filter-chevron-icon ${this.filterGroupState.merchant ? 'rotated' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div class="filter-accordion-content ${this.filterGroupState.merchant ? '' : 'collapsed'}" style="background:#f8fafc; padding:8px; border-radius:var(--radius-md); border:1px solid #f1f5f9;">
              <div class="filter-chip-card ${this.filters.merchantId === 'ALL' ? 'active' : ''}" data-filter-type="merchantId" data-value="ALL">
                <span>All Merchants (${visibleStores.length})</span>
              </div>
              ${visibleStores.map(s => `
                <div class="filter-chip-card ${this.filters.merchantId === s.id ? 'active' : ''}" data-filter-type="merchantId" data-value="${s.id}">
                  <span style="font-weight:700;">${s.merchant_name}</span>
                  <span class="badge badge-info" style="font-size:9px; padding:0 4px;">${s.channel_id.replace('chn-', '').toUpperCase()}</span>
                  <span class="nav-badge">${allOrders.filter(o => o.store_id === s.id).length}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="filter-accordion-group">
            <div class="filter-accordion-header" data-toggle-group="status">
              <div class="filter-accordion-title">
                <span>3. Marketplace Order Status</span>
                <span class="badge badge-info" style="font-size:9px; padding:0 5px;">${this.filters.marketplaceStatus === 'ALL' ? 'All' : this.filters.marketplaceStatus}</span>
              </div>
              <svg class="filter-chevron-icon ${this.filterGroupState.status ? 'rotated' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div class="filter-accordion-content ${this.filterGroupState.status ? '' : 'collapsed'}">
              <div class="filter-chip-card ${this.filters.marketplaceStatus === 'ALL' ? 'active' : ''}" data-filter-type="marketplaceStatus" data-value="ALL">
                <span>All Statuses</span>
              </div>
              <div class="filter-chip-card ${this.filters.marketplaceStatus === 'PAID_CONFIRMED' ? 'active-success' : ''}" data-filter-type="marketplaceStatus" data-value="PAID_CONFIRMED">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--success);"></span>
                <span>Paid Confirmed</span>
              </div>
              <div class="filter-chip-card ${this.filters.marketplaceStatus === 'PROCESSING' ? 'active-warning' : ''}" data-filter-type="marketplaceStatus" data-value="PROCESSING">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--warning);"></span>
                <span>Processing</span>
              </div>
              <div class="filter-chip-card ${this.filters.marketplaceStatus === 'READY_TO_SHIP' ? 'active' : ''}" data-filter-type="marketplaceStatus" data-value="READY_TO_SHIP">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--primary);"></span>
                <span>Ready to Ship</span>
              </div>
              <div class="filter-chip-card ${this.filters.marketplaceStatus === 'SHIPPED' ? 'active-success' : ''}" data-filter-type="marketplaceStatus" data-value="SHIPPED">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--success);"></span>
                <span>Shipped</span>
              </div>
              <div class="filter-chip-card ${this.filters.marketplaceStatus === 'CANCELLED' ? 'active-danger' : ''}" data-filter-type="marketplaceStatus" data-value="CANCELLED">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--danger);"></span>
                <span>Cancelled</span>
              </div>
            </div>
          </div>

          <div class="filter-accordion-group">
            <div class="filter-accordion-header" data-toggle-group="courier">
              <div class="filter-accordion-title">
                <span>4. Courier Partner</span>
                <span class="badge badge-info" style="font-size:9px; padding:0 5px;">${this.filters.courierId === 'ALL' ? 'All Couriers' : this.filters.courierId.replace('courier-', '').toUpperCase()}</span>
              </div>
              <svg class="filter-chevron-icon ${this.filterGroupState.courier ? 'rotated' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div class="filter-accordion-content ${this.filterGroupState.courier ? '' : 'collapsed'}">
              <div class="filter-chip-card ${this.filters.courierId === 'ALL' ? 'active' : ''}" data-filter-type="courierId" data-value="ALL">
                <span>All Couriers</span>
              </div>
              ${couriers.map(c => `
                <div class="filter-chip-card ${this.filters.courierId === c.id ? 'active' : ''}" data-filter-type="courierId" data-value="${c.id}">
                  <span>${c.name}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="filter-accordion-group">
            <div class="filter-accordion-header" data-toggle-group="sla">
              <div class="filter-accordion-title">
                <span>5. Logistic SLA / Delivery Tier</span>
                <span class="badge badge-info" style="font-size:9px; padding:0 5px;">${this.filters.deliveryTier === 'ALL' ? 'All SLA' : this.filters.deliveryTier}</span>
              </div>
              <svg class="filter-chevron-icon ${this.filterGroupState.sla ? 'rotated' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div class="filter-accordion-content ${this.filterGroupState.sla ? '' : 'collapsed'}">
              <div class="filter-chip-card ${this.filters.deliveryTier === 'ALL' ? 'active' : ''}" data-filter-type="deliveryTier" data-value="ALL">
                <span>All SLA Tiers</span>
              </div>
              <div class="filter-chip-card ${this.filters.deliveryTier === 'INSTANT_2H' ? 'active-purple' : ''}" data-filter-type="deliveryTier" data-value="INSTANT_2H">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                <span>Instant (2h SLA)</span>
              </div>
              <div class="filter-chip-card ${this.filters.deliveryTier === 'REGULAR' ? 'active' : ''}" data-filter-type="deliveryTier" data-value="REGULAR">
                <span>Regular (Next Day)</span>
              </div>
              <div class="filter-chip-card ${this.filters.deliveryTier === 'CARGO_BULKY' ? 'active-warning' : ''}" data-filter-type="deliveryTier" data-value="CARGO_BULKY">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
                <span>Cargo Bulky</span>
              </div>
            </div>
          </div>

        </div>

        <div class="table-scroll-container">
          <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:12px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="width:36px; text-align:center; padding:10px 8px;">
                  <input type="checkbox" id="check-all-orders" ${isAllVisibleChecked ? 'checked' : ''} />
                </th>
                <th style="padding:10px 14px; min-width:140px;">Order Code</th>
                <th style="min-width:180px;">Platform & Merchant Store</th>
                <th style="min-width:150px;">Buyer & Destination</th>
                <th style="min-width:180px;">Courier & Delivery Type</th>
                <th style="min-width:240px;">Items (BOM)</th>
                <th style="min-width:130px;">Amount & Type</th>
                <th style="min-width:130px;">Marketplace Status</th>
                <th style="min-width:120px;">WMS Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredOrders.map(o => {
                const items = store.getTable('order_items').filter(oi => oi.order_id === o.id);
                const courier = store.getItem('couriers', o.courier_id);
                const isSelected = this.selectedOrderIds.has(o.id);

                return `
                  <tr class="clickable-row" data-order-id="${o.id}" style="${isSelected ? 'background:#eef2ff;' : ''}">
                    <td style="text-align:center; padding:10px 8px;" onclick="event.stopPropagation()">
                      <input type="checkbox" class="order-row-check" data-order-id="${o.id}" ${isSelected ? 'checked' : ''} />
                    </td>
                    <td style="padding:10px 14px; font-weight:700; font-family:var(--font-mono); color:var(--primary);">
                      ${o.order_code}
                      <div style="font-size:10.5px; color:var(--text-dim); font-weight:400;">${o.external_order_sn || o.external_order_id}</div>
                    </td>
                    <td>
                      <div style="font-weight:700; color:var(--text-main); font-size:12.5px;">${o.merchant_name || 'SuperDates Store'}</div>
                      <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                        <span class="badge badge-info" style="font-size:9.5px; padding:1px 5px;">${o.channel_id.replace('chn-', '').toUpperCase()}</span>
                      </div>
                    </td>
                    <td>
                      <div style="font-weight:600; color:var(--text-main);">${o.recipient_name}</div>
                      <div style="font-size:11px; color:var(--text-dim);">${o.recipient_city}</div>
                    </td>
                    <td>
                      <div style="font-weight:600;">${courier ? courier.name : o.courier_id}</div>
                      <div style="display:flex; gap:4px; margin-top:2px; align-items:center;">
                        ${this.formatTierBadge(o.sla_tier)}
                        <span class="mono" style="font-size:10.5px; color:var(--text-muted);">${o.awb_number || 'PENDING'}</span>
                      </div>
                    </td>
                    <td>
                      ${items.map(it => `
                        <div style="font-size:11.5px; color:var(--text-main);">
                          <b>${it.ordered_qty}x</b> ${it.item_name}
                        </div>
                      `).join('')}
                    </td>
                    <td class="mono" style="font-weight:600;">
                      <div>Rp ${(o.total_order_amount || 0).toLocaleString('id-ID')}</div>
                      ${o.is_cod ? `<span class="badge badge-warning" style="font-size:9px; padding:1px 4px;">COD</span>` : ''}
                    </td>
                    <td>
                      <span class="badge ${this.getMarketplaceBadgeClass(o.marketplace_status)}">${o.marketplace_status || 'READY_TO_SHIP'}</span>
                    </td>
                    <td>
                      <span class="badge ${this.getStatusBadgeClass(o.wms_status)}">${o.wms_status}</span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        ${this.selectedOrderIds.size > 0 ? `
          <div class="bulk-selection-bar">
            <div class="selection-count">
              <span class="badge badge-purple" style="font-size:11px; padding:3px 8px;">${this.selectedOrderIds.size} Selected</span>
              <span>Orders ready for dispatch, packing, or wave batching</span>
            </div>

            <div class="bulk-actions">
              <button class="btn btn-secondary" id="btn-bulk-manual-pick" style="background:#ffffff; color:#0f172a; font-size:12px; font-weight:700;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                </svg>
                <span>Manual Single Pick Dispatch (${this.selectedOrderIds.size})</span>
              </button>

              <button class="btn btn-primary" id="btn-bulk-wave-batch" style="font-size:12px; font-weight:700;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 12h20"></path>
                  <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"></path>
                </svg>
                <span>Batch into Wave (${this.selectedOrderIds.size})</span>
              </button>

              <button class="btn btn-secondary" id="btn-bulk-clear-selection" style="background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.2); color:#ffffff; font-size:11.5px; padding:5px 10px;">
                Deselect
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this.attachCardChipListeners(container, filteredOrders);
  }

  // --- 2. Inbound Logistics View ---
  renderInboundView(container) {
    const asns = store.getTable('asn_shipments') || [];
    const suppliers = store.getTable('suppliers') || [];

    let totalExpected = 0, totalReceived = 0, totalDamaged = 0;
    asns.forEach(a => {
      totalExpected += a.expected_items_count || 0;
      totalReceived += (a.received_good_count || 0) + (a.received_damaged_count || 0);
      totalDamaged += a.received_damaged_count || 0;
    });

    let filteredAsns = asns.filter(a => {
      if (this.inboundFilters.status !== 'ALL' && a.status !== this.inboundFilters.status) return false;
      if (this.inboundFilters.supplierId !== 'ALL' && a.supplier_id !== this.inboundFilters.supplierId) return false;
      return true;
    });

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size:18px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              <span>Inbound Logistics & Directed Putaway Control</span>
            </h2>
            <p style="color:var(--text-muted); font-size:12px; margin-top:2px;">
              PO container arrival, FEFO lot/expiry capture, QC damage segregation & directed shelf putaway
            </p>
          </div>

          <button class="btn btn-primary" id="btn-simulate-asn-arrival">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Simulate PO Truck Arrival</span>
          </button>
        </div>

        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px;">
          <div style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Active ASNs / Containers</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:var(--primary); margin-top:4px;">${asns.length} Shipments</div>
            <div style="font-size:10.5px; color:var(--text-muted);">${asns.filter(a => a.status !== 'COMPLETED').length} in dock queue</div>
          </div>
          <div style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Received Units Today</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:#059669; margin-top:4px;">${totalReceived} / ${totalExpected}</div>
            <div style="font-size:10.5px; color:var(--text-muted);">Units verified & putaway</div>
          </div>
          <div style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">QC Damage / Quarantine</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:#dc2626; margin-top:4px;">${totalDamaged} Units</div>
            <div style="font-size:10.5px; color:var(--text-muted);">Segregated to Quarantine Bin</div>
          </div>
          <div style="background:var(--primary-bg); padding:14px; border-radius:var(--radius-md); border:1px solid var(--primary-light); box-shadow:var(--shadow-xs);">
            <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase;">Dock-to-Stock Velocity</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:var(--primary-hover); margin-top:4px;">35 Mins</div>
            <div style="font-size:10.5px; color:var(--text-dim);">Avg Putaway SLA</div>
          </div>
        </div>

        <div class="table-scroll-container">
          <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:12px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 14px; min-width:140px;">ASN Number</th>
                <th style="min-width:130px;">PO Reference</th>
                <th style="min-width:200px;">Supplier Name</th>
                <th style="min-width:140px;">Dock & Vehicle</th>
                <th style="min-width:120px; text-align:center;">Expected Qty</th>
                <th style="min-width:160px; text-align:center;">Received (Good / QC Damage)</th>
                <th style="min-width:130px;">Status</th>
                <th style="min-width:140px;">Arrived Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAsns.map(a => `
                <tr class="clickable-row" data-asn-id="${a.id}">
                  <td style="padding:10px 14px; font-weight:700; font-family:var(--font-mono); color:var(--primary);">${a.asn_number}</td>
                  <td class="mono" style="font-weight:600;">${a.po_number}</td>
                  <td><div style="font-weight:700; color:var(--text-main); font-size:12.5px;">${a.supplier_name}</div></td>
                  <td><div style="font-weight:700; color:var(--primary);">${a.dock_bin_id}</div><div style="font-size:10.5px; color:var(--text-dim);">${a.truck_plate_number} • ${a.container_number}</div></td>
                  <td class="mono" style="text-align:center; font-weight:700;">${a.expected_items_count} units</td>
                  <td style="text-align:center;">
                    <div style="display:flex; justify-content:center; gap:6px; align-items:center;">
                      <span class="mono" style="font-weight:800; color:#059669;">${a.received_good_count || 0} Good</span>
                      <span style="color:var(--text-dim);">/</span>
                      <span class="mono" style="font-weight:700; color:${a.received_damaged_count > 0 ? '#dc2626' : 'var(--text-dim)'};">${a.received_damaged_count || 0} Dmg</span>
                    </div>
                  </td>
                  <td><span class="badge ${this.getAsnBadgeClass(a.status)}">${a.status}</span></td>
                  <td style="font-size:11.5px; color:var(--text-dim);">${a.arrived_at ? a.arrived_at.split('T')[0] : 'In Transit'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.attachInboundListeners(container);
  }

  // --- 3. Inventory Console ---
  renderInventoryView(container) {
    const balances = store.getTable('inventory_balances') || [];
    const zones = store.getTable('zones') || [];
    const skus = store.getTable('master_skus') || [];
    const transfers = store.getTable('stock_transfers') || [];
    const opnameSessions = store.getTable('stock_opname_sessions') || [];
    const ledger = store.getTable('inventory_ledger') || [];

    let totalAvail = 0, totalAlloc = 0, totalPicked = 0, totalPacked = 0, totalQuar = 0;
    balances.forEach(b => {
      totalAvail += b.qty_available || 0;
      totalAlloc += b.qty_allocated || 0;
      totalPicked += b.qty_picked || 0;
      totalPacked += b.qty_packed || 0;
      totalQuar += b.qty_quarantine || 0;
    });
    const totalSOH = totalAvail + totalAlloc + totalPicked + totalPacked + totalQuar;

    let filteredBalances = balances.filter(b => {
      const bin = store.getItem('bins', b.bin_id);
      if (this.inventoryFilters.zoneId !== 'ALL' && (!bin || bin.zone_id !== this.inventoryFilters.zoneId)) return false;
      if (this.inventoryFilters.skuId !== 'ALL' && b.master_sku_id !== this.inventoryFilters.skuId) return false;
      return true;
    });

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size:18px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              <span>5-State Double-Entry Inventory Ledger & Stock Opname</span>
            </h2>
            <p style="color:var(--text-muted); font-size:12px; margin-top:2px;">
              Mathematical Invariant: Stock on Hand (SOH) = Available + Allocated + Picked + Packed + Quarantine
            </p>
          </div>

          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary" id="btn-open-stock-transfer-modal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
              <span>Stock Transfer / Replenish</span>
            </button>

            <button class="btn btn-primary" id="btn-open-stock-opname-modal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
              </svg>
              <span>Execute Stock Opname</span>
            </button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(6, 1fr); gap:10px;">
          <div style="background:var(--bg-surface); padding:12px 14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:10.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">1. Available</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:#059669; margin-top:2px;">${totalAvail}</div>
            <div style="font-size:10px; color:var(--text-muted);">Free for reservation</div>
          </div>
          <div style="background:var(--bg-surface); padding:12px 14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:10.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">2. Allocated</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:#d97706; margin-top:2px;">${totalAlloc}</div>
            <div style="font-size:10px; color:var(--text-muted);">Reserved for orders</div>
          </div>
          <div style="background:var(--bg-surface); padding:12px 14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:10.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">3. Picked</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:#7c3aed; margin-top:2px;">${totalPicked}</div>
            <div style="font-size:10px; color:var(--text-muted);">In tote / staged</div>
          </div>
          <div style="background:var(--bg-surface); padding:12px 14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:10.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">4. Packed</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:#0284c7; margin-top:2px;">${totalPacked}</div>
            <div style="font-size:10px; color:var(--text-muted);">Sealed in shipping parcel</div>
          </div>
          <div style="background:var(--bg-surface); padding:12px 14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:10.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">5. Quarantine</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:#dc2626; margin-top:2px;">${totalQuar}</div>
            <div style="font-size:10px; color:var(--text-muted);">Damaged / QC hold</div>
          </div>
          <div style="background:var(--primary-bg); padding:12px 14px; border-radius:var(--radius-md); border:1px solid var(--primary-light); box-shadow:var(--shadow-xs);">
            <div style="font-size:10.5px; font-weight:800; color:var(--primary); text-transform:uppercase;">Total SOH</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:var(--primary-hover); margin-top:2px;">${totalSOH}</div>
            <div style="font-size:10px; color:var(--text-dim);">Physical stock in DC</div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:4px 8px;">
          <div style="display:flex; gap:4px;">
            <button class="table-tab-btn ${this.inventorySubTab === 'balances' ? 'active' : ''}" data-inv-tab="balances">
              <span>Stock Balances & Bin Matrix</span>
              <span class="table-tab-count">${balances.length}</span>
            </button>
            <button class="table-tab-btn ${this.inventorySubTab === 'movements' ? 'active' : ''}" data-inv-tab="movements">
              <span>Stock Transfers & Replenishment</span>
              <span class="table-tab-count">${transfers.length}</span>
            </button>
            <button class="table-tab-btn ${this.inventorySubTab === 'opname' ? 'active' : ''}" data-inv-tab="opname">
              <span>Stock Opname & Audits</span>
              <span class="table-tab-count">${opnameSessions.length}</span>
            </button>
            <button class="table-tab-btn ${this.inventorySubTab === 'ledger' ? 'active' : ''}" data-inv-tab="ledger">
              <span>Immutable Ledger Journal</span>
              <span class="table-tab-count">${ledger.length}</span>
            </button>
          </div>
        </div>

        ${this.renderInventorySubTabContent(filteredBalances, transfers, opnameSessions, ledger, zones, skus)}
      </div>
    `;

    this.attachInventoryListeners(container);
  }

  renderInventorySubTabContent(balances, transfers, opnameSessions, ledger, zones, skus) {
    if (this.inventorySubTab === 'movements') {
      return `
        <div class="table-scroll-container">
          <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:12px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 14px; min-width:140px;">Transfer #</th>
                <th style="min-width:180px;">Master SKU</th>
                <th style="min-width:160px;">From Source Bin</th>
                <th style="min-width:160px;">To Destination Bin</th>
                <th style="min-width:100px; text-align:center;">Quantity</th>
                <th style="min-width:180px;">Reason</th>
                <th style="min-width:100px;">Status</th>
                <th style="min-width:140px;">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${transfers.map(t => {
                const sku = store.getItem('master_skus', t.master_sku_id);
                return `
                  <tr>
                    <td class="mono" style="font-weight:700; color:var(--primary); padding:10px 14px;">${t.transfer_number}</td>
                    <td><div style="font-weight:700;">${sku ? sku.name : t.master_sku_id}</div></td>
                    <td class="mono" style="font-weight:600; color:var(--text-dim);">${t.from_bin_id}</td>
                    <td class="mono" style="font-weight:700; color:var(--primary);">${t.to_bin_id}</td>
                    <td class="mono" style="text-align:center; font-weight:800; color:#059669;">${t.quantity} units</td>
                    <td style="font-size:11px; color:var(--text-muted);">${t.reason}</td>
                    <td><span class="badge badge-success">${t.status}</span></td>
                    <td style="font-size:11px; color:var(--text-dim);">${t.completed_at ? t.completed_at.split('T')[0] : 'Just now'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    if (this.inventorySubTab === 'opname') {
      return `
        <div class="table-scroll-container">
          <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:12px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 14px; min-width:140px;">Opname Code</th>
                <th style="min-width:220px;">Session Name & Zone</th>
                <th style="min-width:120px; text-align:center;">Bins Audited</th>
                <th style="min-width:140px; text-align:center;">Net Variance</th>
                <th style="min-width:140px;">Audited By</th>
                <th style="min-width:140px;">Approved By</th>
                <th style="min-width:100px;">Status</th>
                <th style="min-width:140px;">Completed Date</th>
              </tr>
            </thead>
            <tbody>
              ${opnameSessions.map(s => `
                <tr>
                  <td class="mono" style="font-weight:700; color:var(--primary); padding:10px 14px;">${s.opname_code}</td>
                  <td>
                    <div style="font-weight:700; color:var(--text-main);">${s.session_name}</div>
                    <div style="font-size:10.5px; color:var(--text-dim);">${s.zone_id}</div>
                  </td>
                  <td class="mono" style="text-align:center; font-weight:700;">${s.total_bins_audited} bins</td>
                  <td class="mono" style="text-align:center; font-weight:800; color:${s.total_variance_units < 0 ? '#dc2626' : '#059669'};">
                    ${s.total_variance_units > 0 ? `+${s.total_variance_units}` : s.total_variance_units} units
                  </td>
                  <td style="font-size:11.5px; color:var(--text-main);">${s.audited_by}</td>
                  <td style="font-size:11.5px; color:var(--text-muted);">${s.approved_by || 'Pending Approval'}</td>
                  <td><span class="badge ${s.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}">${s.status}</span></td>
                  <td style="font-size:11px; color:var(--text-dim);">${s.completed_at ? s.completed_at.split('T')[0] : 'In Progress'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    if (this.inventorySubTab === 'ledger') {
      return `
        <div class="table-scroll-container">
          <table class="spreadsheet-table" style="font-family:var(--font-mono); font-size:11px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px 12px;">TX UUID</th>
                <th>Transaction Type</th>
                <th>Master SKU</th>
                <th>From Bin & State</th>
                <th>To Bin & State</th>
                <th style="text-align:center;">Qty</th>
                <th>Ref Doc</th>
                <th>Created Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${ledger.slice(0, 50).map(l => {
                const sku = store.getItem('master_skus', l.master_sku_id);
                return `
                  <tr>
                    <td style="color:var(--text-dim); font-weight:600; padding:8px 12px;">${l.transaction_uuid}</td>
                    <td><span class="badge badge-info" style="font-size:9.5px;">${l.transaction_type}</span></td>
                    <td style="font-family:var(--font-sans); font-weight:700;">${sku ? sku.name : l.master_sku_id}</td>
                    <td><span style="color:var(--text-dim);">${l.from_bin_id || 'EXTERNAL'}</span> &bull; <b style="color:#dc2626;">${l.from_state || '-'}</b></td>
                    <td><span style="color:var(--primary); font-weight:700;">${l.to_bin_id || 'EXTERNAL'}</span> &bull; <b style="color:#059669;">${l.to_state || '-'}</b></td>
                    <td style="text-align:center; font-weight:800; color:var(--text-main);">${l.quantity}</td>
                    <td style="color:var(--text-dim);">${l.reference_doc_type}: ${l.reference_doc_id}</td>
                    <td style="color:var(--text-dim);">${l.created_at ? l.created_at.split('T')[1]?.substring(0, 8) : ''}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    return `
      <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:14px 16px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase; min-width:80px;">Zone:</span>
          <div class="filter-chip-card ${this.inventoryFilters.zoneId === 'ALL' ? 'active' : ''}" data-inv-zone="ALL">
            <span>All Storage Zones</span>
          </div>
          ${zones.map(z => `
            <div class="filter-chip-card ${this.inventoryFilters.zoneId === z.id ? 'active' : ''}" data-inv-zone="${z.id}">
              <span>${z.name}</span>
            </div>
          `).join('')}
        </div>

        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; border-top:1px solid #f1f5f9; padding-top:8px;">
          <span style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase; min-width:80px;">Master SKU:</span>
          <div class="filter-chip-card ${this.inventoryFilters.skuId === 'ALL' ? 'active' : ''}" data-inv-sku="ALL">
            <span>All SKUs (${skus.length})</span>
          </div>
          ${skus.map(s => `
            <div class="filter-chip-card ${this.inventoryFilters.skuId === s.id ? 'active' : ''}" data-inv-sku="${s.id}">
              <span>${s.name}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="table-scroll-container">
        <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:12px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:10px 14px; min-width:140px;">Bin Location</th>
              <th style="min-width:120px;">Storage Zone</th>
              <th style="min-width:200px;">Master SKU</th>
              <th style="min-width:130px;">Lot / Batch</th>
              <th style="color:#059669; text-align:center; min-width:90px;">1. Available</th>
              <th style="color:#d97706; text-align:center; min-width:90px;">2. Allocated</th>
              <th style="color:#7c3aed; text-align:center; min-width:90px;">3. Picked</th>
              <th style="color:#0284c7; text-align:center; min-width:90px;">4. Packed</th>
              <th style="color:#dc2626; text-align:center; min-width:90px;">5. Quarantine</th>
              <th style="background:#eef2ff; color:#4f46e5; text-align:center; min-width:100px;">Total SOH</th>
              <th style="text-align:center; min-width:100px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${balances.map(b => {
              const bin = store.getItem('bins', b.bin_id);
              const zone = bin ? store.getItem('zones', bin.zone_id) : null;
              const sku = store.getItem('master_skus', b.master_sku_id);
              const batch = store.getItem('inventory_batches', b.batch_id);
              const soh = (b.qty_available || 0) + (b.qty_allocated || 0) + (b.qty_picked || 0) + (b.qty_packed || 0) + (b.qty_quarantine || 0);

              return `
                <tr>
                  <td class="mono" style="font-weight:700; color:var(--primary); padding:10px 14px;">
                    ${bin ? bin.bin_code : b.bin_id}
                  </td>
                  <td>
                    <span class="badge ${zone && zone.zone_type === 'COLD' ? 'badge-purple' : 'badge-info'}" style="font-size:9.5px;">
                      ${zone ? zone.name : 'Ambient'}
                    </span>
                  </td>
                  <td>
                    <div style="font-weight:700; color:var(--text-main); font-size:12.5px;">${sku ? sku.name : b.master_sku_id}</div>
                    <div class="mono" style="font-size:10px; color:var(--text-dim);">${sku ? sku.sku_code : ''}</div>
                  </td>
                  <td class="mono" style="font-weight:600; color:var(--text-dim);">
                    ${batch ? batch.lot_number : b.batch_id}
                  </td>
                  <td class="mono" style="font-weight:800; color:#059669; text-align:center;">${b.qty_available}</td>
                  <td class="mono" style="font-weight:800; color:#d97706; text-align:center;">${b.qty_allocated}</td>
                  <td class="mono" style="font-weight:800; color:#7c3aed; text-align:center;">${b.qty_picked}</td>
                  <td class="mono" style="font-weight:800; color:#0284c7; text-align:center;">${b.qty_packed}</td>
                  <td class="mono" style="font-weight:800; color:#dc2626; text-align:center;">${b.qty_quarantine}</td>
                  <td class="mono" style="font-weight:900; color:#0f172a; background:#f8fafc; text-align:center;">${soh}</td>
                  <td style="text-align:center;">
                    <button class="btn btn-secondary" style="padding:3px 8px; font-size:11px;" onclick="window.wmsApp.handleTransferFromBin('${b.master_sku_id}', '${b.bin_id}')">
                      Relocate
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // --- 4. Wave Management Console ---
  renderWavesView(container) {
    const waves = store.getTable('waves') || [];
    const pickTasks = store.getTable('pick_tasks') || [];

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size:18px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12h20"></path>
                <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"></path>
              </svg>
              <span>Wave & Batch Generation Engine (S-Shape Routing)</span>
            </h2>
            <p style="color:var(--text-muted); font-size:12px; margin-top:2px;">
              Automated multi-order wave grouping, S-Shape routing optimization, and floor picker dispatch
            </p>
          </div>

          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary" id="btn-open-pick-path-visualizer-direct">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
              </svg>
              <span>Floor Path Visualizer</span>
            </button>

            <button class="btn btn-primary" id="btn-generate-wave-from-waves-tab">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Create New Wave</span>
            </button>
          </div>
        </div>

        <div style="background:#f5f3ff; border:1px solid #ddd6fe; border-radius:var(--radius-lg); padding:14px 18px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="background:#7c3aed; color:#ffffff; width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
              </svg>
            </div>
            <div>
              <div style="font-weight:800; color:#5b21b6; font-size:13.5px;">S-Shape Serpentine Route Engine Active</div>
              <div style="font-size:11.5px; color:#6d28d9; margin-top:2px;">
                Cuts floor travel distance by 49% by sequencing pick items in alternating aisle direction before staging.
              </div>
            </div>
          </div>
          <button class="btn btn-primary" style="background:#7c3aed; font-size:12px;" onclick="window.wmsApp.handleInspectWave('wv-001')">
            Launch 2D Floor Plan
          </button>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:14px;">
          ${waves.map(w => {
            const task = pickTasks.find(pt => pt.wave_id === w.id);
            const courier = store.getItem('couriers', w.courier_id);
            const progress = task && task.total_items_to_pick > 0 ? Math.round((task.total_items_picked / task.total_items_to_pick) * 100) : 0;

            return `
              <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:16px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div>
                    <div class="mono" style="font-size:15px; font-weight:800; color:var(--primary);">${w.wave_number}</div>
                    <div style="font-size:11px; color:var(--text-dim); margin-top:2px;">Type: ${w.wave_type}</div>
                  </div>
                  <span class="badge ${this.getStatusBadgeClass(w.status)}">${w.status}</span>
                </div>

                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; background:#f8fafc; padding:10px; border-radius:var(--radius-md); border:1px solid #f1f5f9; text-align:center;">
                  <div>
                    <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Orders</div>
                    <div class="mono" style="font-size:15px; font-weight:800; color:var(--text-main);">${w.total_orders_count}</div>
                  </div>
                  <div>
                    <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Items</div>
                    <div class="mono" style="font-size:15px; font-weight:800; color:var(--text-main);">${w.total_items_count}</div>
                  </div>
                  <div>
                    <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Carrier</div>
                    <div style="font-size:12px; font-weight:700; color:var(--primary);">${courier ? courier.code : 'ALL'}</div>
                  </div>
                </div>

                <div>
                  <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
                    <span style="color:var(--text-dim);">Pick Progress (${task ? task.total_items_picked : 0}/${task ? task.total_items_to_pick : w.total_items_count} units)</span>
                    <span class="mono" style="font-weight:700; color:var(--primary);">${progress}%</span>
                  </div>
                  <div style="width:100%; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                    <div style="width:${progress}%; height:100%; background:var(--primary); transition:width 0.3s;"></div>
                  </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:8px; border-top:1px solid #f1f5f9;">
                  <div style="font-size:11px; color:var(--text-dim);">
                    Tote: <b class="mono" style="color:var(--text-main);">${task ? task.assigned_tote_id : 'TOTE-001'}</b>
                  </div>
                  <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="window.wmsApp.handleInspectWave('${w.id}')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                    </svg>
                    <span>View Pick Path</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const createBtn = container.querySelector('#btn-generate-wave-from-waves-tab');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        const waveModal = document.getElementById('global-wave-modal');
        if (waveModal) waveModal.open();
      });
    }

    const visualizerDirectBtn = container.querySelector('#btn-open-pick-path-visualizer-direct');
    if (visualizerDirectBtn) {
      visualizerDirectBtn.addEventListener('click', () => {
        this.handleInspectWave('wv-001');
      });
    }
  }

  // --- 5. Mobile PDA Handheld Picking Terminal View ---
  renderPdaWrapper(container) {
    container.innerHTML = `<wms-pda-terminal></wms-pda-terminal>`;
  }

  renderPickingView(container) {
    this.renderPdaWrapper(container);
  }

  // --- 6. Packing Bench & Thermal Label Spooler View ---
  renderPackingView(container) {
    const orders = store.getTable('orders') || [];
    const packedOrders = orders.filter(o => o.wms_status === 'PACKED');
    const queueOrders = orders.filter(o => o.wms_status !== 'PACKED' && o.wms_status !== 'CANCELLED');

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size:18px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              <span>Packing Bench & 100x150mm Thermal Shipping Label Spooler</span>
            </h2>
            <p style="color:var(--text-muted); font-size:12px; margin-top:2px;">
              BOM item verification, cold chain packaging selection, scale weight capture, and instant carrier label printing
            </p>
          </div>

          <button class="btn btn-primary" id="btn-quick-pack-first">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>Open Packing Bench #02</span>
          </button>
        </div>

        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px;">
          <div style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Parcels Packed Today</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:#059669; margin-top:4px;">${packedOrders.length + 42} Parcels</div>
            <div style="font-size:10.5px; color:var(--text-muted);">Ready for 3PL Handover</div>
          </div>
          <div style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Avg Pack & Verify Time</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:var(--primary); margin-top:4px;">48 Seconds</div>
            <div style="font-size:10.5px; color:var(--text-muted);">BOM Scan to Thermal Print</div>
          </div>
          <div style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Packaging Material Used</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:#7c3aed; margin-top:4px;">Box M & Cold Pouch</div>
            <div style="font-size:10.5px; color:var(--text-muted);">Cold chain thermal compliant</div>
          </div>
          <div style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Orders in Pack Queue</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:#d97706; margin-top:4px;">${queueOrders.length} Orders</div>
            <div style="font-size:10.5px; color:var(--text-muted);">Staged at STAGE-A-04</div>
          </div>
        </div>

        <div class="table-scroll-container">
          <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:12px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 14px; min-width:140px;">Order Code</th>
                <th style="min-width:160px;">Merchant Shop</th>
                <th style="min-width:160px;">Recipient & Destination</th>
                <th style="min-width:180px;">Courier & AWB</th>
                <th style="min-width:240px;">BOM Items to Verify</th>
                <th style="min-width:110px; text-align:center;">WMS Status</th>
                <th style="min-width:130px; text-align:center;">Packing Action</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => {
                const items = store.getTable('order_items').filter(oi => oi.order_id === o.id);
                const courier = store.getItem('couriers', o.courier_id);
                const isPacked = o.wms_status === 'PACKED';

                return `
                  <tr>
                    <td class="mono" style="font-weight:700; color:var(--primary); padding:10px 14px;">
                      ${o.order_code}
                      <div style="font-size:10px; color:var(--text-dim);">${o.external_order_sn || o.external_order_id}</div>
                    </td>
                    <td>
                      <div style="font-weight:700; color:var(--text-main);">${o.merchant_name || 'SuperDates Store'}</div>
                      <span class="badge badge-info" style="font-size:9px;">${o.channel_id.replace('chn-', '').toUpperCase()}</span>
                    </td>
                    <td>
                      <div style="font-weight:600;">${o.recipient_name}</div>
                      <div style="font-size:11px; color:var(--text-dim);">${o.recipient_city}</div>
                    </td>
                    <td>
                      <div style="font-weight:600;">${courier ? courier.name : o.courier_id}</div>
                      <div class="mono" style="font-size:10.5px; color:var(--text-dim);">${o.awb_number || 'PENDING'}</div>
                    </td>
                    <td>
                      ${items.map(it => `
                        <div style="font-size:11.5px;">
                          <b>${it.ordered_qty}x</b> ${it.item_name}
                        </div>
                      `).join('')}
                    </td>
                    <td style="text-align:center;">
                      <span class="badge ${this.getStatusBadgeClass(o.wms_status)}">${o.wms_status}</span>
                    </td>
                    <td style="text-align:center;">
                      <button class="btn ${isPacked ? 'btn-secondary' : 'btn-primary'}" style="padding:4px 10px; font-size:11.5px; font-weight:700;" onclick="window.wmsApp.handleOpenPackModal('${o.id}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="6 9 6 2 18 2 18 9"></polyline>
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                          <rect x="6" y="14" width="12" height="8"></rect>
                        </svg>
                        <span>${isPacked ? 'Reprint Label' : 'Pack Order'}</span>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const quickPackBtn = container.querySelector('#btn-quick-pack-first');
    if (quickPackBtn) {
      quickPackBtn.addEventListener('click', () => {
        const firstUnpacked = orders.find(o => o.wms_status !== 'PACKED' && o.wms_status !== 'CANCELLED') || orders[0];
        if (firstUnpacked) this.handleOpenPackModal(firstUnpacked.id);
      });
    }
  }

  // --- 7. 3PL Sortation Hub & Digital Manifest (BAST) View ---
  renderSortationView(container) {
    const manifests = store.getTable('manifests') || [];
    const orders = store.getTable('orders') || [];

    const chutes = [
      { id: 'CHUTE-SPX-01', courierId: 'courier-spx', courierName: 'Shopee Xpress', service: 'SPX Standard & VIP', cutoff: '16:30 WIB (34m)', capacity: '18 / 25 Parcels' },
      { id: 'CHUTE-JNT-01', courierId: 'courier-jnt', courierName: 'J&T Express', service: 'J&T EZ & Next Day', cutoff: '17:00 WIB (1h 04m)', capacity: '12 / 25 Parcels' },
      { id: 'CHUTE-INST-01', courierId: 'courier-gosend', courierName: 'GoSend & Grab Instant', service: 'VIP Instant (2h SLA)', cutoff: 'Immediate Pickup', capacity: '4 / 10 Parcels' },
      { id: 'CHUTE-SIC-01', courierId: 'courier-sicepat', courierName: 'SiCepat Ekspres', service: 'GOKIL Cargo Bulky', cutoff: '18:00 WIB (2h 04m)', capacity: '6 / 15 Parcels' }
    ];

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size:18px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
              </svg>
              <span>3PL Sortation Hub & Digital Manifest (BAST)</span>
            </h2>
            <p style="color:var(--text-muted); font-size:12px; margin-top:2px;">
              Redundant AWB scanning, carrier chute allocation, driver vehicle sign-off, and custody handover
            </p>
          </div>

          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary" id="btn-quick-manifest-spx">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Create SPX Handover BAST</span>
            </button>
          </div>
        </div>

        <!-- Redundant Scan Infeed Bar -->
        <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:14px 18px; box-shadow:var(--shadow-xs); display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="background:#eef2ff; color:var(--primary); width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </div>
            <div>
              <div style="font-weight:800; color:var(--text-main); font-size:13px;">Redundant Sortation Scanner Infeed</div>
              <div style="font-size:11px; color:var(--text-dim); margin-top:1px;">Scan AWB barcode on parcel to verify chute drop destination.</div>
            </div>
          </div>

          <div style="display:flex; gap:8px;">
            <input 
              type="text" 
              id="sort-scan-awb-input" 
              placeholder="Scan or Enter AWB Number..." 
              value="SPXID029910012345"
              style="background:#f8fafc; border:1px solid var(--border-muted); border-radius:var(--radius-sm); padding:6px 12px; font-size:12px; width:220px; font-family:var(--font-mono);"
            />
            <button class="btn btn-primary" id="btn-simulate-sort-scan" style="font-size:12px;">
              <span>Simulate Chute Scan</span>
            </button>
          </div>
        </div>

        <!-- 4 Carrier Chutes Visual Grid -->
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px;">
          ${chutes.map(c => `
            <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:16px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:12px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                  <span class="badge badge-purple" style="font-size:9.5px;">${c.id}</span>
                  <div style="font-size:14.5px; font-weight:800; color:var(--text-main); margin-top:4px;">${c.courierName}</div>
                  <div style="font-size:11px; color:var(--text-dim);">${c.service}</div>
                </div>
              </div>

              <div style="background:#f8fafc; border:1px solid #f1f5f9; padding:10px; border-radius:var(--radius-md); display:flex; flex-direction:column; gap:4px;">
                <div style="display:flex; justify-content:space-between; font-size:11px;">
                  <span style="color:var(--text-dim);">Chute Load</span>
                  <span class="mono" style="font-weight:800; color:var(--primary);">${c.capacity}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px;">
                  <span style="color:var(--text-dim);">Cutoff SLA</span>
                  <span class="mono" style="font-weight:700; color:#dc2626;">${c.cutoff}</span>
                </div>
              </div>

              <button class="btn btn-primary" style="margin-top:auto; font-size:11.5px; font-weight:700;" onclick="window.wmsApp.handleOpenManifestModal('${c.courierId}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Generate BAST Manifest</span>
              </button>
            </div>
          `).join('')}
        </div>

        <!-- Manifests History Log Table -->
        <div class="table-scroll-container">
          <div style="padding:12px 14px; font-weight:800; font-size:12px; border-bottom:1px solid #f1f5f9; text-transform:uppercase; color:var(--text-dim);">
            Completed Digital Manifests & Driver Sign-Offs
          </div>
          <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:12px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 14px; min-width:140px;">BAST Number</th>
                <th style="min-width:160px;">Courier Partner</th>
                <th style="min-width:150px;">Driver & Truck Plate</th>
                <th style="min-width:110px; text-align:center;">Total Parcels</th>
                <th style="min-width:110px; text-align:center;">Total Weight</th>
                <th style="min-width:130px; text-align:right;">COD Value</th>
                <th style="min-width:130px; text-align:center;">Status</th>
                <th style="min-width:140px;">Signed Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${manifests.length > 0 ? manifests.map(m => {
                const courier = store.getItem('couriers', m.courier_id);
                return `
                  <tr>
                    <td class="mono" style="font-weight:700; color:var(--primary); padding:10px 14px;">${m.manifest_number}</td>
                    <td><div style="font-weight:700;">${courier ? courier.name : m.courier_id}</div></td>
                    <td><div>${m.driver_name}</div><div class="mono" style="font-size:10.5px; color:var(--text-dim);">${m.truck_plate_number}</div></td>
                    <td class="mono" style="text-align:center; font-weight:800;">${m.total_parcels}</td>
                    <td class="mono" style="text-align:center;">${m.total_weight_kg} kg</td>
                    <td class="mono" style="text-align:right; font-weight:700;">Rp ${m.total_cod_amount.toLocaleString('id-ID')}</td>
                    <td style="text-align:center;"><span class="badge badge-success">${m.status}</span></td>
                    <td style="font-size:11px; color:var(--text-dim);">${m.signed_at ? m.signed_at.split('T')[0] : 'Just now'}</td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="8" style="text-align:center; padding:18px; color:var(--text-dim);">
                    No completed manifests yet. Click "Generate BAST Manifest" above to sign handover with driver.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

      </div>
    `;

    const quickManifestBtn = container.querySelector('#btn-quick-manifest-spx');
    if (quickManifestBtn) {
      quickManifestBtn.addEventListener('click', () => {
        this.handleOpenManifestModal('courier-spx');
      });
    }

    const sortScanBtn = container.querySelector('#btn-simulate-sort-scan');
    if (sortScanBtn) {
      sortScanBtn.addEventListener('click', () => {
        const input = container.querySelector('#sort-scan-awb-input');
        const val = input ? input.value : 'SPXID029910012345';
        sound.play('scan');
        alert(`AWB ${val} Scanned & Verified!\nRoute to -> CHUTE-SPX-01 (Shopee Xpress Outbound Bay).`);
      });
    }
  }

  // --- 8. Reverse Logistics (RTS & RMA Returns) View ---
  renderReturnsView(container) {
    const returns = store.getTable('customer_returns') || [];
    const pendingReturns = returns.filter(r => r.status === 'PENDING_INSPECTION');
    const completedReturns = returns.filter(r => r.status.startsWith('COMPLETED'));

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size:18px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 14 4 9 9 4"></polyline>
                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
              </svg>
              <span>Reverse Logistics: RTS & RMA Inspection Control</span>
            </h2>
            <p style="color:var(--text-muted); font-size:12px; margin-top:2px;">
              Courier RTS returns, customer RMA claims, physical QC condition grading, and double-entry restocking
            </p>
          </div>

          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary" id="btn-simulate-incoming-rts">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 14 4 9 9 4"></polyline>
                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
              </svg>
              <span>Simulate Courier RTS Return</span>
            </button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px;">
          <div style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Pending QC Inspections</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:var(--primary); margin-top:4px;">${pendingReturns.length} Returns</div>
            <div style="font-size:10.5px; color:var(--text-muted);">Awaiting physical grading</div>
          </div>
          <div style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">RTS Restocked Today</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:#059669; margin-top:4px;">${completedReturns.filter(r => r.status === 'COMPLETED_RESTOCKED').length + 12} Units</div>
            <div style="font-size:10.5px; color:var(--text-muted);">Returned to Available Stock</div>
          </div>
          <div style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs);">
            <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Damaged / Quarantined</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:#dc2626; margin-top:4px;">${completedReturns.filter(r => r.status === 'COMPLETED_QUARANTINED').length + 3} Units</div>
            <div style="font-size:10.5px; color:var(--text-muted);">Segregated to bin-quarantine-01</div>
          </div>
          <div style="background:var(--primary-bg); padding:14px; border-radius:var(--radius-md); border:1px solid var(--primary-light); box-shadow:var(--shadow-xs);">
            <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase;">Restock Recovery Rate</div>
            <div class="mono" style="font-size:22px; font-weight:800; color:var(--primary-hover); margin-top:4px;">82.4%</div>
            <div style="font-size:10.5px; color:var(--text-dim);">Intact sealed parcels</div>
          </div>
        </div>

        <div class="table-scroll-container">
          <div style="padding:12px 14px; font-weight:800; font-size:12px; border-bottom:1px solid #f1f5f9; text-transform:uppercase; color:var(--text-dim);">
            Active Returns & Inbound Inspection Queue
          </div>
          <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:12px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 14px; min-width:140px;">Return #</th>
                <th style="min-width:130px;">Origin Order</th>
                <th style="min-width:200px;">Returned SKU Item</th>
                <th style="min-width:150px;">Carrier & Type</th>
                <th style="min-width:220px;">Reason Note</th>
                <th style="min-width:120px; text-align:center;">Status</th>
                <th style="min-width:130px; text-align:center;">QC Action</th>
              </tr>
            </thead>
            <tbody>
              ${returns.map(r => {
                const isPending = r.status === 'PENDING_INSPECTION';
                return `
                  <tr>
                    <td class="mono" style="font-weight:700; color:var(--primary); padding:10px 14px;">${r.return_number}</td>
                    <td class="mono" style="font-weight:600;">${r.order_code}</td>
                    <td>
                      <div style="font-weight:700; color:var(--text-main); font-size:12.5px;">${r.quantity}x ${r.sku_name}</div>
                      <div class="mono" style="font-size:10px; color:var(--text-dim);">${r.master_sku_id}</div>
                    </td>
                    <td>
                      <div style="font-weight:600;">${r.carrier_name}</div>
                      <span class="badge ${r.return_type.includes('RTS') ? 'badge-purple' : 'badge-warning'}" style="font-size:9px;">
                        ${r.return_type.includes('RTS') ? 'RTS COURIER' : 'RMA CLAIM'}
                      </span>
                    </td>
                    <td style="font-size:11px; color:var(--text-muted);">${r.buyer_reason}</td>
                    <td style="text-align:center;">
                      <span class="badge ${isPending ? 'badge-warning' : (r.status === 'COMPLETED_RESTOCKED' ? 'badge-success' : 'badge-danger')}">
                        ${r.status}
                      </span>
                    </td>
                    <td style="text-align:center;">
                      <button class="btn ${isPending ? 'btn-primary' : 'btn-secondary'}" style="padding:4px 10px; font-size:11.5px; font-weight:700;" onclick="window.wmsApp.handleOpenReturnModal('${r.id}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>${isPending ? 'Inspect & Grade' : 'View QC Log'}</span>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const simRtsBtn = container.querySelector('#btn-simulate-incoming-rts');
    if (simRtsBtn) {
      simRtsBtn.addEventListener('click', () => {
        sound.play('click');
        const newRet = store.simulateIncomingReturn({ returnType: 'RTS_FAILED_DELIVERY' });
        sound.play('success');
        alert(`New Inbound RTS Parcel Arrived!\n${newRet.return_number} for Order ${newRet.order_code} registered in Inspection Queue.`);
        this.render();
      });
    }
  }

  // --- 9. Phase 9: Executive Fulfillment Pulse & Productivity Analytics View ---
  renderAnalyticsView(container) {
    const orders = store.getTable('orders') || [];
    const balances = store.getTable('inventory_balances') || [];
    const pickTasks = store.getTable('pick_tasks') || [];

    const totalOrders = orders.length + 1240;
    const shippedOrders = orders.filter(o => o.wms_status === 'SHIPPED').length + 890;

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size:18px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <span>Executive Fulfillment Pulse & Productivity Analytics</span>
            </h2>
            <p style="color:var(--text-muted); font-size:12px; margin-top:2px;">
              Real-time omnichannel velocity, operator pick/pack UPH leaderboard, carrier SLA countdowns, and ACID mathematical invariants
            </p>
          </div>

          <div style="display:flex; gap:8px; align-items:center;">
            <div class="badge badge-success" style="font-size:10.5px; padding:4px 8px; display:flex; align-items:center; gap:6px;">
              <span style="width:6px; height:6px; border-radius:50%; background:#059669;"></span>
              <span>DOUBLE-ENTRY INVARIANT: PASSED</span>
            </div>
          </div>
        </div>

        <!-- 4 Executive Velocity KPI Cards -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; width:100%;">
          <div style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs); min-width:0;">
            <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Today's Shipped Throughput</div>
            <div class="mono" style="font-size:24px; font-weight:800; color:#059669; margin-top:4px;">${shippedOrders} Parcels</div>
            <div style="font-size:11px; color:#059669; font-weight:700; margin-top:2px;">&uarr; +18.4% vs. Yesterday</div>
          </div>

          <div style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs); min-width:0;">
            <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Dock-to-Door Cycle Velocity</div>
            <div class="mono" style="font-size:24px; font-weight:800; color:var(--primary); margin-top:4px;">14.2 Mins</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Order Allocate &rarr; Pick &rarr; Pack &rarr; 3PL</div>
          </div>

          <div style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:var(--shadow-xs); min-width:0;">
            <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">2-Step Barcode Accuracy</div>
            <div class="mono" style="font-size:24px; font-weight:800; color:#7c3aed; margin-top:4px;">99.94%</div>
            <div style="font-size:11px; color:#059669; font-weight:700; margin-top:2px;">Zero wrong-item pack errors</div>
          </div>

          <div style="background:var(--primary-bg); padding:14px; border-radius:var(--radius-md); border:1px solid var(--primary-light); box-shadow:var(--shadow-xs); min-width:0;">
            <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase;">VIP Instant (2h SLA) Pass Rate</div>
            <div class="mono" style="font-size:24px; font-weight:800; color:var(--primary-hover); margin-top:4px;">100.0%</div>
            <div style="font-size:11px; color:var(--text-dim); margin-top:2px;">All GoSend/Grab dispatched on-time</div>
          </div>
        </div>

        <!-- 2-Column Section: Hourly Throughput Velocity Sparkline + Marketplace Share -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:14px; width:100%;">
          
          <!-- Hourly Velocity Chart Card -->
          <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:16px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:12px; min-width:0; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:13px; font-weight:800; color:var(--text-main);">Hourly Fulfillment Velocity (Parcels/Hour)</div>
                <div style="font-size:11px; color:var(--text-dim);">Real-time dispatch surges across Indonesian cutoffs</div>
              </div>
              <span class="badge badge-purple" style="font-size:9.5px;">PEAK: 15:00 WIB (240 UPH)</span>
            </div>

            <!-- SVG Bar Velocity Visualizer -->
            <div style="height:120px; display:flex; align-items:flex-end; gap:8px; padding-top:10px; border-bottom:1px solid #f1f5f9; width:100%; overflow:hidden;">
              ${[
                { hour: '08:00', val: 45 },
                { hour: '09:00', val: 90 },
                { hour: '10:00', val: 140 },
                { hour: '11:00', val: 210, peak: true },
                { hour: '12:00', val: 160 },
                { hour: '13:00', val: 130 },
                { hour: '14:00', val: 195 },
                { hour: '15:00', val: 240, peak: true },
                { hour: '16:00', val: 220 },
                { hour: '17:00', val: 110 }
              ].map(bar => `
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end; gap:4px; min-width:0;">
                  <span class="mono" style="font-size:9px; font-weight:700; color:${bar.peak ? '#7c3aed' : 'var(--text-dim)'};">${bar.val}</span>
                  <div style="width:100%; height:${(bar.val / 240) * 80}px; background:${bar.peak ? 'linear-gradient(to top, #4f46e5, #7c3aed)' : '#cbd5e1'}; border-radius:3px 3px 0 0;"></div>
                  <span style="font-size:8.5px; color:var(--text-dim); margin-top:2px;">${bar.hour.split(':')[0]}h</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Channel Share Breakdown Card -->
          <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:16px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:10px; min-width:0; overflow:hidden;">
            <div style="font-size:13px; font-weight:800; color:var(--text-main);">Omnichannel Volume Distribution</div>
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:4px;">
              <div>
                <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
                  <span style="font-weight:700; color:#059669;">Tokopedia Official Store</span>
                  <span class="mono" style="font-weight:700;">42% (524 orders)</span>
                </div>
                <div style="height:6px; width:100%; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                  <div style="height:100%; width:42%; background:#059669;"></div>
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
                  <span style="font-weight:700; color:#ea580c;">Shopee Mall SuperDates</span>
                  <span class="mono" style="font-weight:700;">36% (449 orders)</span>
                </div>
                <div style="height:6px; width:100%; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                  <div style="height:100%; width:36%; background:#ea580c;"></div>
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
                  <span style="font-weight:700; color:#0f172a;">TikTok Shop Live Store</span>
                  <span class="mono" style="font-weight:700;">14% (175 orders)</span>
                </div>
                <div style="height:6px; width:100%; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                  <div style="height:100%; width:14%; background:#0f172a;"></div>
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
                  <span style="font-weight:700; color:#0284c7;">Lazada LazMall</span>
                  <span class="mono" style="font-weight:700;">8% (100 orders)</span>
                </div>
                <div style="height:6px; width:100%; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                  <div style="height:100%; width:8%; background:#0284c7;"></div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- 2-Column Section: Operator Productivity Leaderboard + Carrier Cutoff Matrix -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap:14px; width:100%;">
          
          <!-- Operator UPH Leaderboard Card -->
          <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:16px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:10px; min-width:0; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:13px; font-weight:800; color:var(--text-main);">Floor Operator Productivity Leaderboard</div>
                <div style="font-size:11px; color:var(--text-dim);">Units Picked / Packed Per Hour (UPH) & Quality</div>
              </div>
              <span class="badge badge-success" style="font-size:9.5px;">LIVE SHIFT A</span>
            </div>

            <div class="table-scroll-container" style="width:100%; max-width:100%; overflow-x:auto;">
              <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:11.5px; width:100%;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:6px 8px; width:36px;">Rank</th>
                    <th style="min-width:110px;">Operator & Role</th>
                    <th style="text-align:center; min-width:65px;">UPH</th>
                    <th style="text-align:center; min-width:55px;">Accuracy</th>
                    <th style="text-align:right; min-width:90px;">Badge</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="mono" style="padding:6px 8px; font-weight:800; color:var(--primary);">#1</td>
                    <td>
                      <div style="font-weight:800; color:var(--text-main); font-size:11.5px;">Budi Santoso</div>
                      <div style="font-size:9.5px; color:var(--text-dim);">PDA Picker #01</div>
                    </td>
                    <td class="mono" style="text-align:center; font-weight:800; color:#059669;">184</td>
                    <td class="mono" style="text-align:center; font-weight:700;">99.8%</td>
                    <td style="text-align:right;"><span class="badge badge-success" style="font-size:8.5px; padding:1px 5px;">TOP PICKER</span></td>
                  </tr>
                  <tr>
                    <td class="mono" style="padding:6px 8px; font-weight:800; color:var(--primary);">#2</td>
                    <td>
                      <div style="font-weight:800; color:var(--text-main); font-size:11.5px;">Siti Rahma</div>
                      <div style="font-size:9.5px; color:var(--text-dim);">Packing Bench #02</div>
                    </td>
                    <td class="mono" style="text-align:center; font-weight:800; color:var(--primary);">142</td>
                    <td class="mono" style="text-align:center; font-weight:700;">100%</td>
                    <td style="text-align:right;"><span class="badge badge-purple" style="font-size:8.5px; padding:1px 5px;">SPEED BENCH</span></td>
                  </tr>
                  <tr>
                    <td class="mono" style="padding:6px 8px; font-weight:800; color:var(--primary);">#3</td>
                    <td>
                      <div style="font-weight:800; color:var(--text-main); font-size:11.5px;">Hendra Wijaya</div>
                      <div style="font-size:9.5px; color:var(--text-dim);">Dock Putaway #03</div>
                    </td>
                    <td class="mono" style="text-align:center; font-weight:800;">120</td>
                    <td class="mono" style="text-align:center; font-weight:700;">99.5%</td>
                    <td style="text-align:right;"><span class="badge badge-info" style="font-size:8.5px; padding:1px 5px;">FEFO MASTER</span></td>
                  </tr>
                  <tr>
                    <td class="mono" style="padding:6px 8px; font-weight:800; color:var(--primary);">#4</td>
                    <td>
                      <div style="font-weight:800; color:var(--text-main); font-size:11.5px;">Andi Pratama</div>
                      <div style="font-size:9.5px; color:var(--text-dim);">Dispatch Lead</div>
                    </td>
                    <td class="mono" style="text-align:center; font-weight:800;">18 BAST</td>
                    <td class="mono" style="text-align:center; font-weight:700;">100%</td>
                    <td style="text-align:right;"><span class="badge badge-success" style="font-size:8.5px; padding:1px 5px;">100% SLA</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Carrier SLA Matrix Card -->
          <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:16px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:10px; min-width:0; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:13px; font-weight:800; color:var(--text-main);">Carrier Cutoff Timers & 3PL Compliance</div>
                <div style="font-size:11px; color:var(--text-dim);">Live driver vehicle manifests and handover SLA</div>
              </div>
              <span class="badge badge-purple" style="font-size:9.5px;">WH-JKT-01</span>
            </div>

            <div class="table-scroll-container" style="width:100%; max-width:100%; overflow-x:auto;">
              <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:11.5px; width:100%;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:6px 8px; min-width:95px;">Carrier</th>
                    <th style="min-width:65px;">Chute</th>
                    <th style="text-align:center; min-width:75px;">Cutoff</th>
                    <th style="text-align:center; min-width:55px;">SLA Pass</th>
                    <th style="text-align:right; min-width:65px;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding:6px 8px; font-weight:800; color:var(--primary); font-size:11.5px;">Shopee (SPX)</td>
                    <td class="mono" style="font-size:10.5px;">SPX-01</td>
                    <td class="mono" style="text-align:center; font-weight:800; color:#dc2626; font-size:11px;">34m Left</td>
                    <td class="mono" style="text-align:center; font-weight:700; color:#059669;">99.2%</td>
                    <td style="text-align:right;"><span class="badge badge-success" style="font-size:8.5px; padding:1px 5px;">ON TRACK</span></td>
                  </tr>
                  <tr>
                    <td style="padding:6px 8px; font-weight:800; color:var(--primary); font-size:11.5px;">J&T Express</td>
                    <td class="mono" style="font-size:10.5px;">JNT-01</td>
                    <td class="mono" style="text-align:center; font-weight:800; color:#d97706; font-size:11px;">1h 04m</td>
                    <td class="mono" style="text-align:center; font-weight:700; color:#059669;">98.6%</td>
                    <td style="text-align:right;"><span class="badge badge-success" style="font-size:8.5px; padding:1px 5px;">ON TRACK</span></td>
                  </tr>
                  <tr>
                    <td style="padding:6px 8px; font-weight:800; color:var(--primary); font-size:11.5px;">GoSend Instant</td>
                    <td class="mono" style="font-size:10.5px;">INST-01</td>
                    <td class="mono" style="text-align:center; font-weight:800; color:#7c3aed; font-size:11px;">Immediate</td>
                    <td class="mono" style="text-align:center; font-weight:700; color:#059669;">100%</td>
                    <td style="text-align:right;"><span class="badge badge-purple" style="font-size:8.5px; padding:1px 5px;">VIP 2H</span></td>
                  </tr>
                  <tr>
                    <td style="padding:6px 8px; font-weight:800; color:var(--primary); font-size:11.5px;">SiCepat Cargo</td>
                    <td class="mono" style="font-size:10.5px;">SIC-01</td>
                    <td class="mono" style="text-align:center; font-weight:800; color:#059669; font-size:11px;">2h 04m</td>
                    <td class="mono" style="text-align:center; font-weight:700; color:#059669;">97.8%</td>
                    <td style="text-align:right;"><span class="badge badge-success" style="font-size:8.5px; padding:1px 5px;">ON TRACK</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    `;
  }

  // --- Actions ---
  handleInspectOrder(orderId) {
    const modal = document.getElementById('global-order-modal');
    if (modal) modal.open(orderId);
  }

  handleInspectWave(waveId) {
    const modal = document.getElementById('global-pick-path-modal');
    if (modal) modal.open(waveId);
  }

  handleOpenPackModal(orderId) {
    const modal = document.getElementById('global-pack-modal');
    if (modal) modal.open(orderId);
  }

  handleOpenManifestModal(courierId) {
    const modal = document.getElementById('global-manifest-modal');
    if (modal) modal.open(courierId);
  }

  handleOpenReturnModal(returnId) {
    const modal = document.getElementById('global-return-modal');
    if (modal) modal.open(returnId);
  }

  handleTransferFromBin(skuId, fromBinId) {
    const modal = document.getElementById('global-stock-transfer-modal');
    if (modal) modal.open({ skuId, fromBinId });
  }

  attachInventoryListeners(container) {
    container.querySelectorAll('[data-inv-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.inventorySubTab = tab.getAttribute('data-inv-tab');
        sound.play('click');
        this.render();
      });
    });

    container.querySelectorAll('[data-inv-zone]').forEach(chip => {
      chip.addEventListener('click', () => {
        this.inventoryFilters.zoneId = chip.getAttribute('data-inv-zone');
        sound.play('click');
        this.render();
      });
    });

    container.querySelectorAll('[data-inv-sku]').forEach(chip => {
      chip.addEventListener('click', () => {
        this.inventoryFilters.skuId = chip.getAttribute('data-inv-sku');
        sound.play('click');
        this.render();
      });
    });

    const transferBtn = container.querySelector('#btn-open-stock-transfer-modal');
    if (transferBtn) {
      transferBtn.addEventListener('click', () => {
        const modal = document.getElementById('global-stock-transfer-modal');
        if (modal) modal.open();
      });
    }

    const opnameBtn = container.querySelector('#btn-open-stock-opname-modal');
    if (opnameBtn) {
      opnameBtn.addEventListener('click', () => {
        const modal = document.getElementById('global-opname-modal');
        if (modal) modal.open();
      });
    }
  }

  attachInboundListeners(container) {
    const simBtn = container.querySelector('#btn-simulate-asn-arrival');
    if (simBtn) {
      simBtn.addEventListener('click', () => {
        sound.play('click');
        const newAsn = store.simulateIncomingAsn();
        sound.play('success');
        alert(`New Container Truck Arrived at Dock! ASN ${newAsn.asn_number} for ${newAsn.supplier_name} registered.`);
        this.render();
      });
    }

    container.querySelectorAll('.clickable-row[data-asn-id]').forEach(row => {
      row.addEventListener('click', () => {
        const asnId = row.getAttribute('data-asn-id');
        if (asnId) {
          const modal = document.getElementById('global-inbound-modal');
          if (modal) modal.open(asnId);
        }
      });
    });
  }

  attachCardChipListeners(container, filteredOrders = []) {
    container.querySelectorAll('[data-toggle-group]').forEach(header => {
      header.addEventListener('click', () => {
        const group = header.getAttribute('data-toggle-group');
        if (group && this.filterGroupState.hasOwnProperty(group)) {
          this.filterGroupState[group] = !this.filterGroupState[group];
          sound.play('click');
          this.render();
        }
      });
    });

    container.querySelectorAll('.filter-chip-card').forEach(chip => {
      chip.addEventListener('click', () => {
        const type = chip.getAttribute('data-filter-type');
        const value = chip.getAttribute('data-value');
        if (type && value) {
          sound.play('click');
          this.filters[type] = value;
          if (type === 'channel') {
            this.filters.merchantId = 'ALL';
          }
          this.render();
        }
      });
    });

    const searchInput = container.querySelector('#filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.searchQuery = e.target.value;
        this.render();
      });
    }

    const clearBtn = container.querySelector('#btn-clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        sound.play('click');
        this.filters = { channel: 'ALL', merchantId: 'ALL', marketplaceStatus: 'ALL', wmsStatus: 'ALL', courierId: 'ALL', deliveryTier: 'ALL', searchQuery: '' };
        this.render();
      });
    }

    const resetEmptyBtn = container.querySelector('#btn-reset-empty');
    if (resetEmptyBtn) {
      resetEmptyBtn.addEventListener('click', () => {
        sound.play('click');
        this.filters = { channel: 'ALL', merchantId: 'ALL', marketplaceStatus: 'ALL', wmsStatus: 'ALL', courierId: 'ALL', deliveryTier: 'ALL', searchQuery: '' };
        this.render();
      });
    }

    container.querySelectorAll('.clickable-row[data-order-id]').forEach(row => {
      row.addEventListener('click', () => {
        const orderId = row.getAttribute('data-order-id');
        if (orderId) this.handleInspectOrder(orderId);
      });
    });

    const checkAll = container.querySelector('#check-all-orders');
    if (checkAll) {
      checkAll.addEventListener('change', (e) => {
        if (e.target.checked) {
          filteredOrders.forEach(o => this.selectedOrderIds.add(o.id));
        } else {
          filteredOrders.forEach(o => this.selectedOrderIds.delete(o.id));
        }
        sound.play('click');
        this.render();
      });
    }

    container.querySelectorAll('.order-row-check').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const orderId = chk.getAttribute('data-order-id');
        if (e.target.checked) {
          this.selectedOrderIds.add(orderId);
        } else {
          this.selectedOrderIds.delete(orderId);
        }
        sound.play('click');
        this.render();
      });
    });

    const manualPickBtn = container.querySelector('#btn-bulk-manual-pick');
    if (manualPickBtn) {
      manualPickBtn.addEventListener('click', () => {
        const modal = document.getElementById('global-manual-pick-modal');
        if (modal) modal.open(Array.from(this.selectedOrderIds));
      });
    }

    const bulkWaveBtn = container.querySelector('#btn-bulk-wave-batch');
    if (bulkWaveBtn) {
      bulkWaveBtn.addEventListener('click', () => {
        const waveModal = document.getElementById('global-wave-modal');
        if (waveModal) waveModal.open(Array.from(this.selectedOrderIds));
      });
    }

    const clearSelectionBtn = container.querySelector('#btn-bulk-clear-selection');
    if (clearSelectionBtn) {
      clearSelectionBtn.addEventListener('click', () => {
        this.selectedOrderIds.clear();
        sound.play('click');
        this.render();
      });
    }

    const waveBtn = container.querySelector('#btn-open-wave-generator');
    if (waveBtn) {
      waveBtn.addEventListener('click', () => {
        const waveModal = document.getElementById('global-wave-modal');
        if (waveModal) waveModal.open();
      });
    }
  }

  formatTierBadge(tier) {
    switch (tier) {
      case 'INSTANT_2H': return `<span class="badge badge-purple" style="font-size:9px; padding:1px 5px;">INSTANT 2H</span>`;
      case 'CARGO_BULKY': return `<span class="badge badge-warning" style="font-size:9px; padding:1px 5px;">CARGO</span>`;
      case 'SAMEDAY': return `<span class="badge badge-info" style="font-size:9px; padding:1px 5px;">SAMEDAY</span>`;
      case 'REGULAR':
      default: return `<span class="badge badge-info" style="font-size:9px; padding:1px 5px;">REGULAR</span>`;
    }
  }

  getMarketplaceBadgeClass(status) {
    if (['PAID_CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURN_COMPLETED'].includes(status)) return 'badge-success';
    if (['PROCESSING', 'READY_TO_SHIP', 'RETURN_PROCESSING'].includes(status)) return 'badge-info';
    if (['CANCELLED'].includes(status)) return 'badge-danger';
    return 'badge-warning';
  }

  getStatusBadgeClass(status) {
    if (['ALLOCATED', 'COMPLETED', 'PASSED', 'APPROVED', 'SHIPPED', 'PACKED', 'RETURN_RESTOCKED'].includes(status)) return 'badge-success';
    if (['PENDING', 'PENDING_ALLOCATION', 'IN_PROGRESS', 'PICKING', 'PACKING', 'IN_PICKING', 'RTS_IN_INSPECTION'].includes(status)) return 'badge-warning';
    if (['CANCELLED', 'REJECTED', 'DAMAGED', 'RETURN_QUARANTINED'].includes(status)) return 'badge-danger';
    if (['INSTANT_2H', 'BATCHED_IN_WAVE', 'RMA_CLAIM_PENDING'].includes(status)) return 'badge-purple';
    return 'badge-info';
  }

  getAsnBadgeClass(status) {
    if (['COMPLETED', 'RECEIVED'].includes(status)) return 'badge-success';
    if (['RECEIVING', 'RECEIVING_IN_PROGRESS', 'ARRIVED_AT_DOCK'].includes(status)) return 'badge-warning';
    if (['CANCELLED', 'REJECTED'].includes(status)) return 'badge-danger';
    return 'badge-info';
  }
}

// Global instance
window.wmsApp = new WmsApp();
document.addEventListener('DOMContentLoaded', () => {
  window.wmsApp.init();
});
