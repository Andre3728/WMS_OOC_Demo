/**
 * SuperDates WMS - Master Application Layout Component (Light Theme & SVG Vector Icons)
 * Complete with Draggable Horizontal Split Resizer, WMS + PDA Split, and Live Pane Sizing.
 */

import { store } from '../mock/mockStore.js';
import { sound } from './wms-audio.js';

class WmsLayout extends HTMLElement {
  constructor() {
    super();
    this.currentView = 'orders';
    this.currentMode = 'split'; // 'split' | 'split-pda' | 'full-wms' | 'full-data' | 'pda'
    this.rightPaneSubView = 'data'; // 'data' | 'pda'
    this.leftPaneWidthPx = null; // Custom dragged width
  }

  connectedCallback() {
    this.render();
    this.startClock();
    this.attachEventListeners();
    this.initDraggableResizer();
  }

  render() {
    this.innerHTML = `
      <!-- Top Navigation Bar -->
      <header class="wms-topbar">
        <div class="topbar-brand">
          <div class="brand-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <span>SUPERDATES</span>
          </div>
          <div class="brand-title">
            WMS-OCC Module
            <span>Jakarta DC (WH-JKT-01)</span>
          </div>
        </div>

        <!-- Center View / Layout Mode Switcher -->
        <div class="topbar-center">
          <div class="layout-mode-group">
            <button class="mode-btn ${this.currentMode === 'split' ? 'active' : ''}" data-mode="split" title="WMS Portal + Live Database Studio">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="12" y1="3" x2="12" y2="21"></line>
              </svg>
              <span>WMS + Data</span>
            </button>
            <button class="mode-btn ${this.currentMode === 'split-pda' ? 'active' : ''}" data-mode="split-pda" title="WMS Portal + Mobile PDA Handheld Side-by-Side">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="14" y1="3" x2="14" y2="21"></line>
                <rect x="16" y="7" width="4" height="10" rx="1"></rect>
              </svg>
              <span>WMS + PDA Split</span>
            </button>
            <button class="mode-btn ${this.currentMode === 'full-wms' ? 'active' : ''}" data-mode="full-wms" title="Full WMS Portal">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              </svg>
              <span>Full WMS</span>
            </button>
            <button class="mode-btn ${this.currentMode === 'full-data' ? 'active' : ''}" data-mode="full-data" title="Full Database Studio">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
              <span>Data Studio</span>
            </button>
          </div>
        </div>

        <!-- Simulation Toolbar & Actions -->
        <div class="topbar-actions">
          <div class="sim-toolbar">
            <span style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.04em; padding-right:4px;">Demo Sim:</span>
            <button id="btn-sim-order" class="sim-btn sim-pulse" title="Simulate Incoming Webhook Order">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <span>+1 Order (Tokopedia)</span>
            </button>
            <button id="btn-sim-cancel" class="sim-btn" style="border-color:var(--danger-border); color:var(--danger-text);" title="Simulate In-Flight Buyer Cancellation">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Cancel Intercept</span>
            </button>
            <button id="btn-reset-db" class="sim-btn" style="color:var(--text-dim);" title="Reset Database to Default Seed">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              <span>Reset DB</span>
            </button>
          </div>

          <div class="mono" style="font-size:12px; color:var(--text-muted); background:#f1f5f9; padding:5px 10px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); display:flex; align-items:center; gap:6px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span id="live-clock">--:--:-- WIB</span>
          </div>
        </div>
      </header>

      <!-- Main Workspace Viewport -->
      <main class="wms-main-viewport ${this.getModeClass()}" id="wms-main-viewport">
        <div class="wms-split-container" id="wms-split-container">
          <!-- Left Operational Pane -->
          <section class="wms-pane-left" id="wms-left-pane">
            <!-- Sidebar -->
            <aside class="wms-sidebar">
              <nav class="sidebar-nav">
                <div class="nav-section-title">Omnichannel OMS</div>
                <a class="nav-item ${this.currentView === 'orders' ? 'active' : ''}" data-view="orders">
                  <div class="nav-item-content">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <span>Order Control Center</span>
                  </div>
                  <span class="nav-badge" id="badge-orders-count">4</span>
                </a>
                <a class="nav-item ${this.currentView === 'instant' ? 'active' : ''}" data-view="instant">
                  <div class="nav-item-content">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                    <span>VIP Instant (2h SLA)</span>
                  </div>
                  <span class="badge badge-purple" style="font-size:9px;">VIP</span>
                </a>

                <div class="nav-section-title">Inbound & Storage</div>
                <a class="nav-item ${this.currentView === 'inbound' ? 'active' : ''}" data-view="inbound">
                  <div class="nav-item-content">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Inbound & Putaway</span>
                  </div>
                </a>
                <a class="nav-item ${this.currentView === 'inventory' ? 'active' : ''}" data-view="inventory">
                  <div class="nav-item-content">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                    <span>5-State Inventory Ledger</span>
                  </div>
                </a>

                <div class="nav-section-title">Outbound Fulfillment</div>
                <a class="nav-item ${this.currentView === 'waves' ? 'active' : ''}" data-view="waves">
                  <div class="nav-item-content">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M2 12h20"></path>
                      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"></path>
                    </svg>
                    <span>Wave Batching</span>
                  </div>
                </a>
                <a class="nav-item ${this.currentView === 'picking' ? 'active' : ''}" data-view="picking">
                  <div class="nav-item-content">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                    <span>Mobile PDA Picking</span>
                  </div>
                </a>
                <a class="nav-item ${this.currentView === 'packing' ? 'active' : ''}" data-view="packing">
                  <div class="nav-item-content">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                    <span>Packing Bench & Labels</span>
                  </div>
                </a>
                <a class="nav-item ${this.currentView === 'sortation' ? 'active' : ''}" data-view="sortation">
                  <div class="nav-item-content">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="16 3 21 3 21 8"></polyline>
                      <line x1="4" y1="20" x2="21" y2="3"></line>
                      <polyline points="21 16 21 21 16 21"></polyline>
                      <line x1="15" y1="15" x2="21" y2="21"></line>
                    </svg>
                    <span>3PL Sortation & BAST</span>
                  </div>
                </a>

                <div class="nav-section-title">Reverse Logistics</div>
                <a class="nav-item ${this.currentView === 'returns' ? 'active' : ''}" data-view="returns">
                  <div class="nav-item-content">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 14 4 9 9 4"></polyline>
                      <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                    </svg>
                    <span>RTS & RMA Returns</span>
                  </div>
                  <span class="badge badge-purple" style="font-size:9px;">QC</span>
                </a>

                <div class="nav-section-title">Analytics</div>
                <a class="nav-item ${this.currentView === 'analytics' ? 'active' : ''}" data-view="analytics">
                  <div class="nav-item-content">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                    <span>Live Fulfillment Pulse</span>
                  </div>
                </a>
              </nav>

              <!-- Footer Facility Badge -->
              <div style="padding:12px 14px; border-top:1px solid var(--border-subtle); display:flex; align-items:center; gap:8px;">
                <div style="width:7px; height:7px; border-radius:50%; background:var(--success);"></div>
                <div style="font-size:11px;">
                  <div style="font-weight:700; color:var(--text-main);">WebSocket Connected</div>
                  <div style="color:var(--text-dim);">Latency: 12ms</div>
                </div>
              </div>
            </aside>

            <!-- Dynamic Operational View Container -->
            <div class="wms-content-area" id="wms-view-content"></div>
          </section>

          <!-- Draggable Resizer Gutter Bar -->
          <div class="wms-split-resizer" id="wms-split-resizer" title="Drag horizontally to resize panes">
            <div class="resizer-handle-grip"></div>
          </div>

          <!-- Right Pane: Live Reactive Spreadsheet Data View / Mobile PDA Simulator -->
          <section class="wms-pane-right" id="wms-right-pane-container">
            <!-- Right Pane Header Sub-View Switcher -->
            <div class="right-pane-header">
              <div class="right-pane-tabs">
                <button class="right-pane-tab-btn ${this.rightPaneSubView === 'data' && this.currentMode !== 'split-pda' ? 'active' : ''}" id="btn-right-tab-data">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                  </svg>
                  <span>Database Studio</span>
                </button>
                <button class="right-pane-tab-btn ${this.rightPaneSubView === 'pda' || this.currentMode === 'split-pda' ? 'active' : ''}" id="btn-right-tab-pda">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                  </svg>
                  <span>PDA Handheld #04</span>
                </button>
              </div>

              <div style="display:flex; align-items:center; gap:6px;">
                <span class="badge badge-success" style="font-size:9px;">SYNCED</span>
              </div>
            </div>

            <!-- Dynamic Right Pane Viewport -->
            <div id="right-pane-content" style="flex:1; display:flex; flex-direction:column; overflow:hidden; position:relative;">
              ${this.renderRightPaneContent()}
            </div>
          </section>
        </div>
      </main>

      <!-- Toast Container -->
      <div id="toast-container"></div>
    `;

    this.renderActiveView();
    this.attachRightPaneEvents();
    this.applyPaneWidth();
  }

  renderRightPaneContent() {
    if (this.currentMode === 'split-pda' || this.rightPaneSubView === 'pda') {
      return `<wms-pda-terminal></wms-pda-terminal>`;
    }
    return `<wms-data-inspector></wms-data-inspector>`;
  }

  getModeClass() {
    switch (this.currentMode) {
      case 'full-wms': return 'mode-full-wms';
      case 'full-data': return 'mode-full-data';
      case 'split-pda': return 'mode-split-pda';
      case 'pda': return 'mode-pda';
      case 'split':
      default: return 'mode-split';
    }
  }

  applyPaneWidth() {
    const leftPane = this.querySelector('#wms-left-pane');
    if (!leftPane) return;

    if (this.currentMode === 'full-wms' || this.currentMode === 'full-data') {
      leftPane.style.width = '';
      leftPane.style.flex = '';
      return;
    }

    if (this.leftPaneWidthPx) {
      leftPane.style.width = `${this.leftPaneWidthPx}px`;
      leftPane.style.flex = `0 0 ${this.leftPaneWidthPx}px`;
    }
  }

  initDraggableResizer() {
    const resizer = this.querySelector('#wms-split-resizer');
    const container = this.querySelector('#wms-split-container');
    const leftPane = this.querySelector('#wms-left-pane');

    if (!resizer || !container || !leftPane) return;

    let isDragging = false;

    const onMouseDown = (e) => {
      e.preventDefault();
      isDragging = true;
      resizer.classList.add('is-resizing');
      document.body.classList.add('resizing-active');

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;

      const containerRect = container.getBoundingClientRect();
      let newLeftWidth = e.clientX - containerRect.left;

      const minLeftWidth = 420;
      const minRightWidth = 340;
      const maxLeftWidth = containerRect.width - minRightWidth - 10;

      if (newLeftWidth < minLeftWidth) newLeftWidth = minLeftWidth;
      if (newLeftWidth > maxLeftWidth) newLeftWidth = maxLeftWidth;

      this.leftPaneWidthPx = Math.round(newLeftWidth);
      leftPane.style.width = `${this.leftPaneWidthPx}px`;
      leftPane.style.flex = `0 0 ${this.leftPaneWidthPx}px`;
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      resizer.classList.remove('is-resizing');
      document.body.classList.remove('resizing-active');

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    resizer.addEventListener('mousedown', onMouseDown);
  }

  attachRightPaneEvents() {
    const dataTabBtn = this.querySelector('#btn-right-tab-data');
    const pdaTabBtn = this.querySelector('#btn-right-tab-pda');
    const content = this.querySelector('#right-pane-content');

    if (dataTabBtn && content) {
      dataTabBtn.addEventListener('click', () => {
        this.rightPaneSubView = 'data';
        if (this.currentMode === 'split-pda') this.currentMode = 'split';
        this.querySelector('.wms-main-viewport').className = `wms-main-viewport ${this.getModeClass()}`;
        this.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-mode') === this.currentMode));
        dataTabBtn.classList.add('active');
        if (pdaTabBtn) pdaTabBtn.classList.remove('active');
        content.innerHTML = `<wms-data-inspector></wms-data-inspector>`;
        this.applyPaneWidth();
        sound.play('click');
      });
    }

    if (pdaTabBtn && content) {
      pdaTabBtn.addEventListener('click', () => {
        this.rightPaneSubView = 'pda';
        this.currentMode = 'split-pda';
        this.querySelector('.wms-main-viewport').className = `wms-main-viewport ${this.getModeClass()}`;
        this.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-mode') === 'split-pda'));
        pdaTabBtn.classList.add('active');
        if (dataTabBtn) dataTabBtn.classList.remove('active');
        content.innerHTML = `<wms-pda-terminal></wms-pda-terminal>`;
        this.applyPaneWidth();
        sound.play('click');
      });
    }
  }

  attachEventListeners() {
    // Mode Switcher Listeners
    this.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentMode = btn.getAttribute('data-mode');
        if (this.currentMode === 'split-pda') {
          this.rightPaneSubView = 'pda';
        } else if (this.currentMode === 'split') {
          this.rightPaneSubView = 'data';
        }

        this.querySelector('.wms-main-viewport').className = `wms-main-viewport ${this.getModeClass()}`;
        this.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b === btn));

        const content = this.querySelector('#right-pane-content');
        if (content) content.innerHTML = this.renderRightPaneContent();

        const dataTabBtn = this.querySelector('#btn-right-tab-data');
        const pdaTabBtn = this.querySelector('#btn-right-tab-pda');
        if (dataTabBtn) dataTabBtn.classList.toggle('active', this.rightPaneSubView === 'data' && this.currentMode !== 'split-pda');
        if (pdaTabBtn) pdaTabBtn.classList.toggle('active', this.rightPaneSubView === 'pda' || this.currentMode === 'split-pda');

        this.applyPaneWidth();
        sound.play('click');
        this.renderActiveView();
      });
    });

    // Navigation Item Listeners
    this.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.currentView = item.getAttribute('data-view');
        this.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i === item));
        sound.play('click');
        this.renderActiveView();
      });
    });

    // Simulation Action: Incoming Order
    const simOrderBtn = this.querySelector('#btn-sim-order');
    if (simOrderBtn) {
      simOrderBtn.addEventListener('click', () => {
        sound.play('success');
        const order = store.simulateIncomingOrder('TOKOPEDIA');
        this.showToast(`New order received: ${order.order_code} (${order.recipient_name} - ${order.awb_number})`, 'success');
      });
    }

    // Simulation Action: In-Flight Cancel
    const simCancelBtn = this.querySelector('#btn-sim-cancel');
    if (simCancelBtn) {
      simCancelBtn.addEventListener('click', () => {
        sound.play('alarm');
        const result = store.simulateCancelIntercept();
        if (result) {
          this.showToast(`CANCEL INTERCEPT: Order ${result.order.order_code} cancelled! Stock routed to RESTOCK_STAGING.`, 'danger');
        } else {
          this.showToast(`No active picking/allocated orders to cancel.`, 'warning');
        }
      });
    }

    // Simulation Action: Reset DB
    const resetBtn = this.querySelector('#btn-reset-db');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset mock database to initial seed state?')) {
          sound.play('click');
          store.reset();
          this.showToast('Database reset to initial state.', 'info');
          this.renderActiveView();
        }
      });
    }
  }

  showToast(message, type = 'info') {
    const container = this.querySelector('#toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast badge-${type}`;
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' :
        type === 'danger' ? '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>' :
          '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
      </svg>
      <div style="font-weight:600;">${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  startClock() {
    const clockEl = this.querySelector('#live-clock');
    if (!clockEl) return;
    const update = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';
    };
    setInterval(update, 1000);
    update();
  }

  renderActiveView() {
    const container = this.querySelector('#wms-view-content');
    if (!container) return;

    const event = new CustomEvent('wms:viewchange', {
      detail: { view: this.currentView, mode: this.currentMode },
      bubbles: true
    });
    this.dispatchEvent(event);
  }
}

customElements.define('wms-layout', WmsLayout);
