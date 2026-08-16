/**
 * SuperDates WMS - Live Reactive Data Inspector (Spreadsheet / Database Studio - Light Theme)
 * Visualizes live relational tables and animates ACID mutations in real time with zero emojis.
 */

import { store } from '../mock/mockStore.js';

class WmsDataInspector extends HTMLElement {
  constructor() {
    super();
    this.activeTable = 'orders';
    this.searchQuery = '';
    this.unsubscribe = null;
    this.mutatedRowIds = new Set();
  }

  connectedCallback() {
    this.render();
    this.unsubscribe = store.subscribeAll((tableName, action, data, lastMutation) => {
      if (lastMutation && lastMutation.rowId) {
        this.mutatedRowIds.add(lastMutation.rowId);
        setTimeout(() => this.mutatedRowIds.delete(lastMutation.rowId), 3000);
      }
      this.updateTabs();
      this.renderTableContent();
    });
  }

  disconnectedCallback() {
    if (this.unsubscribe) this.unsubscribe();
  }

  getTables() {
    return [
      { key: 'orders', label: 'orders' },
      { key: 'order_items', label: 'order_items' },
      { key: 'inventory_balances', label: 'inventory_balances' },
      { key: 'inventory_ledger', label: 'inventory_ledger' },
      { key: 'master_skus', label: 'master_skus' },
      { key: 'bins', label: 'bins' },
      { key: 'waves', label: 'waves' },
      { key: 'pick_tasks', label: 'pick_tasks' },
      { key: 'shipping_manifests', label: 'shipping_manifests' }
    ];
  }

  render() {
    this.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%; width:100%; background:#ffffff;">
        <!-- Inspector Header -->
        <div class="data-inspector-header">
          <div class="inspector-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            <span>Live Database Inspector (PostgreSQL 16)</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <input 
              type="text" 
              id="inspector-search" 
              placeholder="Search table rows..." 
              style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:4px; padding:4px 8px; font-size:11.5px; color:#0f172a; font-family:var(--font-mono); width:150px;"
            />
            <button id="btn-refresh-data" class="sim-btn" title="Refresh">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Table Selector Tabs -->
        <div class="table-tabs-container" id="inspector-tabs"></div>

        <!-- Spreadsheet Grid Content -->
        <div class="spreadsheet-grid-wrapper" id="inspector-table-container"></div>
      </div>
    `;

    this.updateTabs();
    this.renderTableContent();

    // Attach Search Listener
    const searchInput = this.querySelector('#inspector-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.renderTableContent();
      });
    }

    const refreshBtn = this.querySelector('#btn-refresh-data');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.updateTabs();
        this.renderTableContent();
      });
    }
  }

  updateTabs() {
    const tabsContainer = this.querySelector('#inspector-tabs');
    if (!tabsContainer) return;

    const tables = this.getTables();
    tabsContainer.innerHTML = tables.map(t => {
      const count = (store.getTable(t.key) || []).length;
      const isActive = t.key === this.activeTable;
      return `
        <button class="table-tab-btn ${isActive ? 'active' : ''}" data-table="${t.key}">
          <span>${t.label}</span>
          <span class="table-tab-count">${count}</span>
        </button>
      `;
    }).join('');

    tabsContainer.querySelectorAll('.table-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTable = btn.getAttribute('data-table');
        this.updateTabs();
        this.renderTableContent();
      });
    });
  }

  renderTableContent() {
    const container = this.querySelector('#inspector-table-container');
    if (!container) return;

    let rows = store.getTable(this.activeTable) || [];

    // Filter by search query if any
    if (this.searchQuery) {
      rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(this.searchQuery));
    }

    if (rows.length === 0) {
      container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-dim); font-family:var(--font-mono); font-size:12px;">
          No records found in table '${this.activeTable}'.
        </div>
      `;
      return;
    }

    // Get all column keys from the dataset
    const columns = Object.keys(rows[0]);

    let html = `
      <table class="spreadsheet-table">
        <thead>
          <tr>
            <th style="width: 35px; text-align:center;">#</th>
            ${columns.map(col => `<th>${col}</th>`).join('')}
            ${this.activeTable === 'inventory_balances' ? `<th style="background:#eef2ff; color:#4f46e5;">SOH (Computed)</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, idx) => {
            const isMutated = this.mutatedRowIds.has(row.id);
            const soh = this.activeTable === 'inventory_balances' 
              ? (row.qty_available || 0) + (row.qty_allocated || 0) + (row.qty_picked || 0) + (row.qty_packed || 0) + (row.qty_quarantine || 0)
              : null;

            return `
              <tr class="${isMutated ? 'row-new' : ''}">
                <td style="color:#94a3b8; text-align:center;">${idx + 1}</td>
                ${columns.map(col => {
                  let val = row[col];
                  let displayVal = val;
                  let cellClass = isMutated ? 'cell-mutated' : '';

                  if (typeof val === 'boolean') {
                    displayVal = val ? `<span class="badge badge-success">TRUE</span>` : `<span class="badge badge-danger">FALSE</span>`;
                  } else if (col.includes('status') || col === 'wms_status') {
                    displayVal = this.formatStatusBadge(val);
                  } else if (typeof val === 'number' && (col.includes('amount') || col.includes('price'))) {
                    displayVal = `Rp ${val.toLocaleString('id-ID')}`;
                  } else if (val === null || val === undefined) {
                    displayVal = `<span style="color:#94a3b8;">NULL</span>`;
                  } else if (typeof val === 'object') {
                    displayVal = `<span style="color:#4f46e5;">${JSON.stringify(val)}</span>`;
                  }

                  return `<td class="${cellClass}" title="${String(val)}">${displayVal}</td>`;
                }).join('')}
                ${this.activeTable === 'inventory_balances' ? `
                  <td style="font-weight:700; color:#059669; background:#ecfdf5; text-align:center;">
                    ${soh}
                  </td>
                ` : ''}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  }

  formatStatusBadge(status) {
    if (!status) return `<span style="color:#94a3b8;">NULL</span>`;
    status = String(status);

    if (['ALLOCATED', 'COMPLETED', 'PASSED', 'APPROVED', 'SHIPPED', 'SYNCED'].includes(status)) {
      return `<span class="badge badge-success">${status}</span>`;
    }
    if (['PENDING', 'PENDING_ALLOCATION', 'IN_PROGRESS', 'PICKING', 'PACKING', 'OPEN_BUILDING'].includes(status)) {
      return `<span class="badge badge-warning">${status}</span>`;
    }
    if (['CANCELLED', 'REJECTED', 'DAMAGED', 'LOST', 'FAILED'].includes(status)) {
      return `<span class="badge badge-danger">${status}</span>`;
    }
    if (['INSTANT_2H', 'VIP', 'BATCHED_IN_WAVE'].includes(status)) {
      return `<span class="badge badge-purple">${status}</span>`;
    }
    return `<span class="badge badge-info">${status}</span>`;
  }
}

customElements.define('wms-data-inspector', WmsDataInspector);
