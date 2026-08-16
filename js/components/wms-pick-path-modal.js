/**
 * SuperDates WMS - S-Shape Pick Path Engine & Warehouse Floor Visualizer (v2.9)
 * Features Realistic Aisle Routing, Animated Traveling Picker Cart Motion, and Dynamic Strategy Comparison.
 */

import { store } from '../mock/mockStore.js';
import { sound } from './wms-audio.js';

class WmsPickPathModal extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.waveId = null;
    this.routingStrategy = 'S_SHAPE'; // 'S_SHAPE' | 'MID_POINT' | 'LARGEST_GAP'
  }

  connectedCallback() {
    this.render();
  }

  open(waveId = 'wv-001') {
    this.waveId = waveId;
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

    const wave = store.getItem('waves', this.waveId) || store.getTable('waves')[0];

    // Dynamic Route Statistics & Accurate Path Geometry based on Routing Algorithm
    let distance = 142;
    let duration = "4.2 mins";
    let savings = "49% Travel Reduction";
    let pathD = "M 130 360 L 130 150 L 130 100 L 130 50 C 130 30 290 30 290 50 L 290 200 L 290 330 C 290 360 475 360 475 330 L 475 180 L 610 180";

    if (this.routingStrategy === 'MID_POINT') {
      distance = 210;
      duration = "6.1 mins";
      savings = "25% Travel Reduction";
      // Mid-point return: enters Aisle 1 up to midpoint, turns back down, walks around bottom to Aisle 2, returns down
      pathD = "M 130 360 L 130 150 L 130 100 L 130 150 L 130 360 C 130 375 290 375 290 360 L 290 200 L 290 360 C 290 375 475 375 475 360 L 475 180 L 610 180";
    } else if (this.routingStrategy === 'LARGEST_GAP') {
      distance = 165;
      duration = "5.0 mins";
      savings = "41% Travel Reduction";
      pathD = "M 130 360 L 130 150 L 130 100 L 130 70 C 130 40 290 40 290 70 L 290 200 L 290 290 C 290 350 475 350 475 290 L 475 180 L 610 180";
    }

    this.innerHTML = `
      <div class="wms-modal-backdrop open" id="pick-path-backdrop">
        <div class="wms-modal-card" style="max-width: 920px;">
          <!-- Modal Header -->
          <div class="modal-header">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="badge badge-purple" style="font-size:10px;">S-SHAPE PICK PATH ENGINE</div>
              <h3 style="font-size:16px; font-weight:800; color:var(--text-main);">${wave ? wave.wave_number : 'Wave Pick Path Visualizer'}</h3>
              <span class="badge badge-info" style="font-size:10px;">${wave ? wave.wave_type : 'BATCH_PICK'}</span>
            </div>
            <button id="btn-close-pick-path-modal" class="sim-btn" style="padding:4px 8px; border:none; cursor:pointer;" title="Close Modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
            
            <!-- Strategy Selector & Route Savings Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:12px 16px; border-radius:var(--radius-md); border:1px solid #e2e8f0;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:11.5px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Routing Strategy:</span>
                <div class="filter-chip-card ${this.routingStrategy === 'S_SHAPE' ? 'active' : ''}" data-route-strat="S_SHAPE">
                  <span>S-Shape Serpentine</span>
                </div>
                <div class="filter-chip-card ${this.routingStrategy === 'MID_POINT' ? 'active' : ''}" data-route-strat="MID_POINT">
                  <span>Mid-Point Return</span>
                </div>
                <div class="filter-chip-card ${this.routingStrategy === 'LARGEST_GAP' ? 'active' : ''}" data-route-strat="LARGEST_GAP">
                  <span>Largest Gap</span>
                </div>
              </div>

              <div style="display:flex; gap:16px; align-items:center;">
                <div>
                  <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Est. Distance</div>
                  <div class="mono" style="font-size:15px; font-weight:800; color:var(--primary);">${distance} Meters</div>
                </div>
                <div>
                  <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Est. Pick Time</div>
                  <div class="mono" style="font-size:15px; font-weight:800; color:#059669;">${duration}</div>
                </div>
                <span class="badge badge-success" style="font-size:10.5px;">${savings}</span>
              </div>
            </div>

            <!-- Warehouse Floor 2D Vector Schematic (SVG) -->
            <div class="floor-map-container" style="padding:14px; background:#ffffff;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="font-size:11.5px; font-weight:800; color:var(--text-main); text-transform:uppercase; display:flex; align-items:center; gap:6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                  </svg>
                  <span>Floor Routing Schematic (Cold Room & Staging Dropoff)</span>
                </div>
                <div style="display:flex; gap:10px; font-size:11px; color:var(--text-dim);">
                  <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; background:#c7d2fe; border-radius:2px;"></span> Storage Racks</span>
                  <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; background:#4f46e5; border-radius:50%;"></span> Pick Stop</span>
                  <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; background:#10b981; border-radius:2px;"></span> Staging Bay</span>
                </div>
              </div>

              <div class="floor-svg-wrapper">
                <svg viewBox="0 0 800 400" style="width:100%; height:320px; display:block;">
                  <!-- Grid Pattern Background -->
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="1" />
                    </pattern>
                  </defs>
                  <rect width="800" height="400" fill="url(#grid)" />

                  <!-- Zone 1: Cold Storage Area (Left) -->
                  <rect x="20" y="20" width="540" height="360" rx="8" fill="#f5f3ff" stroke="#ddd6fe" stroke-width="1.5" stroke-dasharray="4 2" />
                  <text x="35" y="42" font-family="Inter, sans-serif" font-size="11.5" font-weight="800" fill="#6d28d9">ZONE COLD-01 (Dates & Fresh Storage 15°C)</text>

                  <!-- Zone 2: Staging & Sortation Hub (Right) -->
                  <rect x="580" y="20" width="200" height="360" rx="8" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1.5" />
                  <text x="595" y="42" font-family="Inter, sans-serif" font-size="11.5" font-weight="800" fill="#047857">STAGING & 3PL DISPATCH</text>

                  <!-- Aisle Indicators -->
                  <text x="110" y="380" font-family="JetBrains Mono" font-size="11" font-weight="800" fill="#4f46e5">AISLE A01</text>
                  <text x="270" y="380" font-family="JetBrains Mono" font-size="11" font-weight="800" fill="#4f46e5">AISLE A02</text>
                  <text x="455" y="380" font-family="JetBrains Mono" font-size="11" font-weight="800" fill="#4f46e5">AISLE A03</text>

                  <!-- Racks Layout - Aisle A01 -->
                  <!-- Rack A01-Left -->
                  <rect x="50" y="70" width="55" height="240" rx="4" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1.5" />
                  <text x="55" y="90" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#3730a3">A01-L01</text>
                  <text x="55" y="160" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#3730a3">A01-L02</text>
                  <text x="55" y="230" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#3730a3">A01-L03</text>

                  <!-- Rack A01-Right -->
                  <rect x="155" y="70" width="55" height="240" rx="4" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1.5" />
                  <text x="160" y="90" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#3730a3">A01-R01</text>
                  <text x="160" y="160" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#3730a3">A01-R02</text>
                  <text x="160" y="230" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#3730a3">A01-R03</text>

                  <!-- Racks Layout - Aisle A02 -->
                  <rect x="210" y="70" width="55" height="240" rx="4" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1.5" />
                  <text x="215" y="90" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#3730a3">A02-L01</text>
                  <text x="215" y="210" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#3730a3">A02-L02</text>

                  <rect x="315" y="70" width="55" height="240" rx="4" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1.5" />
                  <text x="320" y="90" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#3730a3">A02-R01</text>
                  <text x="320" y="210" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#3730a3">A02-R02</text>

                  <!-- Racks Layout - Aisle A03 -->
                  <rect x="395" y="70" width="55" height="240" rx="4" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1.5" />
                  <text x="400" y="90" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#3730a3">A03-L01</text>

                  <rect x="500" y="70" width="55" height="240" rx="4" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1.5" />
                  <text x="505" y="90" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#3730a3">A03-R01</text>

                  <!-- Staging Bay Locations -->
                  <rect x="610" y="140" width="140" height="80" rx="6" fill="#d1fae5" stroke="#10b981" stroke-width="2" />
                  <text x="635" y="175" font-family="JetBrains Mono" font-size="12" font-weight="800" fill="#065f46">STAGE-A-04</text>
                  <text x="630" y="195" font-family="Inter, sans-serif" font-size="10" font-weight="600" fill="#047857">Staging / Packing Infeed</text>

                  <rect x="610" y="250" width="140" height="70" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
                  <text x="635" y="285" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="#64748b">CHUTE-SPX-01</text>

                  <!-- 1. Background Route Guide Path (Solid Light Indigo) -->
                  <path id="route-path-track" d="${pathD}" fill="none" stroke="#c7d2fe" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />

                  <!-- 2. Animated Flowing Dashed Path -->
                  <path d="${pathD}" fill="none" stroke="#4f46e5" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="animated-pick-path" />

                  <!-- Start Point Marker -->
                  <circle cx="130" cy="360" r="12" fill="#0f172a" stroke="#ffffff" stroke-width="2" />
                  <text x="126" y="364" font-family="Inter, sans-serif" font-size="10" font-weight="800" fill="#ffffff">S</text>

                  <!-- Pick Stop 1: Ajwa 500g (Aisle A01, Bin ZN01-A01-R01-L01-B01) -->
                  <g class="beacon-pulse" transform="translate(130, 150)">
                    <circle cx="0" cy="0" r="13" fill="#4f46e5" stroke="#ffffff" stroke-width="2" />
                    <text x="-4" y="4" font-family="Inter, sans-serif" font-size="10.5" font-weight="800" fill="#ffffff">1</text>
                  </g>
                  <line x1="117" y1="150" x2="105" y2="150" stroke="#4f46e5" stroke-width="1.5" stroke-dasharray="2 2" />
                  <rect x="145" y="140" width="100" height="20" rx="4" fill="#ffffff" stroke="#e2e8f0" />
                  <text x="150" y="154" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#4f46e5">Stop 1: Ajwa (24x)</text>

                  <!-- Pick Stop 2: Sukari 1kg (Aisle A01, Bin ZN01-A01-R01-L01-B02) -->
                  <g class="beacon-pulse" transform="translate(130, 100)">
                    <circle cx="0" cy="0" r="13" fill="#4f46e5" stroke="#ffffff" stroke-width="2" />
                    <text x="-4" y="4" font-family="Inter, sans-serif" font-size="10.5" font-weight="800" fill="#ffffff">2</text>
                  </g>
                  <line x1="143" y1="100" x2="155" y2="100" stroke="#4f46e5" stroke-width="1.5" stroke-dasharray="2 2" />
                  <rect x="145" y="90" width="105" height="20" rx="4" fill="#ffffff" stroke="#e2e8f0" />
                  <text x="150" y="104" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#4f46e5">Stop 2: Sukari (18x)</text>

                  <!-- Pick Stop 3: Medjool 1kg (Aisle A02, Bin ZN01-A01-R01-L02-B03) -->
                  <g class="beacon-pulse" transform="translate(290, 200)">
                    <circle cx="0" cy="0" r="13" fill="#4f46e5" stroke="#ffffff" stroke-width="2" />
                    <text x="-4" y="4" font-family="Inter, sans-serif" font-size="10.5" font-weight="800" fill="#ffffff">3</text>
                  </g>
                  <line x1="277" y1="200" x2="265" y2="200" stroke="#4f46e5" stroke-width="1.5" stroke-dasharray="2 2" />
                  <rect x="305" y="190" width="115" height="20" rx="4" fill="#ffffff" stroke="#e2e8f0" />
                  <text x="310" y="204" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="#4f46e5">Stop 3: Medjool (6x)</text>

                  <!-- Final Destination Marker -->
                  <circle cx="610" cy="180" r="12" fill="#10b981" stroke="#ffffff" stroke-width="2" />
                  <text x="606" y="184" font-family="Inter, sans-serif" font-size="10" font-weight="800" fill="#ffffff">E</text>

                  <!-- 3. Animated Traveling Picker Cart on the Path -->
                  <g>
                    <circle r="9" fill="#0f172a" stroke="#ffffff" stroke-width="2">
                      <animateMotion path="${pathD}" dur="6s" repeatCount="indefinite" />
                    </circle>
                    <circle r="4" fill="#38bdf8">
                      <animateMotion path="${pathD}" dur="6s" repeatCount="indefinite" />
                    </circle>
                  </g>
                </svg>
              </div>
            </div>

            <!-- Step-by-Step Pick Sequence Waypoints -->
            <div style="background:#ffffff; padding:14px; border-radius:var(--radius-md); border:1px solid #e2e8f0; display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Optimized Pick Path Waypoints</div>
              
              <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px;">
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:var(--radius-md); padding:10px; display:flex; flex-direction:column; gap:4px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="badge badge-primary" style="font-size:9.5px;">STOP 1 (Seq #10)</span>
                    <span class="mono" style="font-size:11px; font-weight:800; color:#059669;">24 units</span>
                  </div>
                  <div class="mono" style="font-weight:700; font-size:12px; color:var(--text-main);">ZN01-A01-R01-L01-B01</div>
                  <div style="font-size:11px; color:var(--text-muted);">Kurma Ajwa Madinah 500g</div>
                  <div style="font-size:10px; color:var(--text-dim);">Aisle A01 • Left Rack</div>
                </div>

                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:var(--radius-md); padding:10px; display:flex; flex-direction:column; gap:4px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="badge badge-primary" style="font-size:9.5px;">STOP 2 (Seq #20)</span>
                    <span class="mono" style="font-size:11px; font-weight:800; color:#059669;">18 units</span>
                  </div>
                  <div class="mono" style="font-weight:700; font-size:12px; color:var(--text-main);">ZN01-A01-R01-L01-B02</div>
                  <div style="font-size:11px; color:var(--text-muted);">Kurma Sukari Al Qassim 1kg</div>
                  <div style="font-size:10px; color:var(--text-dim);">Aisle A01 • Right Rack</div>
                </div>

                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:var(--radius-md); padding:10px; display:flex; flex-direction:column; gap:4px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="badge badge-primary" style="font-size:9.5px;">STOP 3 (Seq #30)</span>
                    <span class="mono" style="font-size:11px; font-weight:800; color:#059669;">6 units</span>
                  </div>
                  <div class="mono" style="font-weight:700; font-size:12px; color:var(--text-main);">ZN01-A01-R01-L02-B03</div>
                  <div style="font-size:11px; color:var(--text-muted);">Kurma Medjool Jumbo 1kg</div>
                  <div style="font-size:10px; color:var(--text-dim);">Aisle A02 • Left Rack</div>
                </div>

                <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:var(--radius-md); padding:10px; display:flex; flex-direction:column; gap:4px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="badge badge-success" style="font-size:9.5px;">FINAL DROP</span>
                    <span class="mono" style="font-size:11px; font-weight:800; color:#059669;">TOTE-001</span>
                  </div>
                  <div class="mono" style="font-weight:800; font-size:12px; color:#065f46;">STAGE-A-04</div>
                  <div style="font-size:11px; color:#047857;">Staging Rack to Packing</div>
                  <div style="font-size:10px; color:#059669;">Ready for BOM Verification</div>
                </div>
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-close-pick-path-footer" style="font-size:12px;">
              Close
            </button>
            <button class="btn btn-primary" id="btn-dispatch-pda-from-path" style="font-size:12px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              <span>Transmit Pick Sequence to Floor PDA</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const backdrop = this.querySelector('#pick-path-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
    }

    const closeBtn = this.querySelector('#btn-close-pick-path-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const footerCloseBtn = this.querySelector('#btn-close-pick-path-footer');
    if (footerCloseBtn) footerCloseBtn.addEventListener('click', () => this.close());

    // Routing Strategy Chips
    this.querySelectorAll('[data-route-strat]').forEach(chip => {
      chip.addEventListener('click', () => {
        this.routingStrategy = chip.getAttribute('data-route-strat');
        sound.play('click');
        this.render();
      });
    });

    const dispatchBtn = this.querySelector('#btn-dispatch-pda-from-path');
    if (dispatchBtn) {
      dispatchBtn.addEventListener('click', () => {
        sound.play('success');
        this.close();
        alert('Pick sequence waypoints transmitted to PDA Handheld #04 via WebSocket! Floor picker notified.');
      });
    }
  }
}

customElements.define('wms-pick-path-modal', WmsPickPathModal);
