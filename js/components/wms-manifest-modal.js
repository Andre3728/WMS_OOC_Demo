/**
 * SuperDates WMS - Digital Handover Manifest (BAST - Berita Acara Serah Terima) Modal (Phase 7)
 * Complete with carrier driver verification, itemized parcel manifest, dual digital signature pads, and 3PL dispatch.
 */

import { store } from '../mock/mockStore.js';
import { sound } from './wms-audio.js';

class WmsManifestModal extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.courierId = 'courier-spx';
    this.manifestData = null;
    this.supervisorSigned = false;
    this.driverSigned = false;
  }

  connectedCallback() {
    this.render();
  }

  open(courierId = 'courier-spx') {
    this.courierId = courierId;
    this.isOpen = true;
    this.supervisorSigned = false;
    this.driverSigned = false;

    const courier = store.getItem('couriers', courierId);
    const driverName = courierId === 'courier-spx' ? 'Eko Santoso' : (courierId === 'courier-jnt' ? 'Bambang Irawan' : (courierId === 'courier-gosend' ? 'Rudi Hermawan (GoSend)' : 'Ferry Pratama'));
    const plate = courierId === 'courier-spx' ? 'B 9842 UDF' : (courierId === 'courier-jnt' ? 'B 4120 JKT' : (courierId === 'courier-gosend' ? 'B 3345 GOS' : 'B 7781 SIC'));
    const chute = courierId === 'courier-spx' ? 'CHUTE-SPX-01' : (courierId === 'courier-jnt' ? 'CHUTE-JNT-01' : (courierId === 'courier-gosend' ? 'CHUTE-INST-01' : 'CHUTE-SIC-01'));

    this.manifestData = store.createManifest({
      courierId,
      driverName,
      truckPlate: plate,
      chuteId: chute
    });

    sound.play('click');
    this.render();
    this.initCanvasPads();
  }

  close() {
    this.isOpen = false;
    this.render();
  }

  render() {
    if (!this.isOpen || !this.manifestData) {
      this.innerHTML = '';
      return;
    }

    const { manifest, orders } = this.manifestData;
    const courier = store.getItem('couriers', manifest.courier_id);

    this.innerHTML = `
      <div class="wms-modal-backdrop open" id="manifest-modal-backdrop">
        <div class="wms-modal-card" style="max-width: 920px;">
          <!-- Modal Header -->
          <div class="modal-header">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="badge badge-success" style="font-size:10px;">3PL DIGITAL MANIFEST (BAST)</div>
              <h3 style="font-size:16px; font-weight:800; color:var(--text-main);">${manifest.manifest_number}</h3>
              <span class="badge badge-info" style="font-size:10px;">${courier ? courier.name : manifest.courier_id}</span>
            </div>
            <button id="btn-close-manifest-modal" class="sim-btn" style="padding:4px 8px; border:none; cursor:pointer;" title="Close Modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body" style="display:flex; flex-direction:column; gap:14px;">
            
            <!-- 1. Handover Header Summary Card -->
            <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:14px 16px; box-shadow:var(--shadow-xs); display:grid; grid-template-columns: repeat(4, 1fr); gap:12px;">
              <div>
                <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Carrier & Chute</div>
                <div style="font-size:13.5px; font-weight:800; color:var(--primary); margin-top:2px;">${courier ? courier.name : manifest.courier_id}</div>
                <div class="mono" style="font-size:11px; color:var(--text-dim);">${manifest.chute_id}</div>
              </div>

              <div>
                <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Driver & Vehicle Plate</div>
                <div style="font-size:13px; font-weight:800; color:var(--text-main); margin-top:2px;">${manifest.driver_name}</div>
                <div class="mono" style="font-size:11px; color:var(--text-dim);">${manifest.truck_plate_number}</div>
              </div>

              <div>
                <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Total Handover Count</div>
                <div class="mono" style="font-size:16px; font-weight:800; color:#059669; margin-top:2px;">${manifest.total_parcels} Parcels</div>
                <div style="font-size:10.5px; color:var(--text-muted);">${manifest.total_weight_kg} kg Actual Weight</div>
              </div>

              <div>
                <div style="font-size:10px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Total COD Value</div>
                <div class="mono" style="font-size:15px; font-weight:800; color:#d97706; margin-top:2px;">Rp ${manifest.total_cod_amount.toLocaleString('id-ID')}</div>
                <div style="font-size:10.5px; color:var(--text-muted);">Reconciliation Active</div>
              </div>
            </div>

            <!-- 2. Itemized Manifest Table -->
            <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:12px 14px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:11px; font-weight:800; color:var(--text-main); text-transform:uppercase;">
                Itemized Handover Parcel List (${orders.length} Parcels)
              </div>

              <div class="table-scroll-container" style="max-height:160px; overflow-y:auto;">
                <table class="spreadsheet-table" style="font-family:var(--font-sans); font-size:11.5px;">
                  <thead>
                    <tr style="background:#f8fafc;">
                      <th style="padding:6px 10px;">#</th>
                      <th>AWB Number</th>
                      <th>Order Code</th>
                      <th>Destination</th>
                      <th>Recipient</th>
                      <th style="text-align:center;">Weight</th>
                      <th style="text-align:right;">COD Amount</th>
                      <th style="text-align:center;">Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${orders.map((o, idx) => `
                      <tr>
                        <td class="mono" style="padding:6px 10px; color:var(--text-dim);">${idx + 1}</td>
                        <td class="mono" style="font-weight:700; color:var(--primary);">${o.awb_number || 'SPXID029910012345'}</td>
                        <td class="mono" style="font-weight:600;">${o.order_code}</td>
                        <td>${o.recipient_city}</td>
                        <td style="font-weight:600;">${o.recipient_name}</td>
                        <td class="mono" style="text-align:center;">${o.actual_weight_kg || 0.65} kg</td>
                        <td class="mono" style="text-align:right; font-weight:700;">${o.is_cod ? `Rp ${(o.total_order_amount || 0).toLocaleString('id-ID')}` : '-'}</td>
                        <td style="text-align:center;"><span class="badge badge-success" style="font-size:9px;">SCANNED</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 3. Dual Digital Signature Canvas Pads -->
            <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:14px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:10px;">
              <div style="font-size:11px; font-weight:800; color:var(--text-main); text-transform:uppercase; display:flex; justify-content:space-between; align-items:center;">
                <span>Dual Digital Sign-Off Authorization</span>
                <span style="font-size:10.5px; color:var(--text-dim); font-weight:500;">Touch / Mouse to Sign</span>
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
                <!-- Box 1: Warehouse Supervisor -->
                <div style="border:1px solid #e2e8f0; border-radius:var(--radius-md); padding:10px; background:#f8fafc; display:flex; flex-direction:column; gap:6px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:700; font-size:11.5px; color:var(--text-main);">1. WMS Dispatch Supervisor</div>
                    <span class="badge ${this.supervisorSigned ? 'badge-success' : 'badge-warning'}" style="font-size:9px;">
                      ${this.supervisorSigned ? 'SIGNED' : 'REQUIRED'}
                    </span>
                  </div>
                  <div style="font-size:10.5px; color:var(--text-dim);">Andi Pratama (Outbound Lead)</div>
                  
                  <div style="background:#ffffff; border:1px dashed var(--border-muted); border-radius:4px; height:80px; position:relative; overflow:hidden;">
                    <canvas id="canvas-supervisor-sign" width="380" height="80" style="width:100%; height:100%; display:block; cursor:crosshair;"></canvas>
                    ${!this.supervisorSigned ? `
                      <div id="sup-hint" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; font-size:10.5px; color:var(--text-dim);">
                        Draw signature here
                      </div>
                    ` : ''}
                  </div>

                  <button class="btn btn-secondary" id="btn-auto-sign-supervisor" style="padding:3px 8px; font-size:10.5px; align-self:flex-start;">
                    Auto-Sign Supervisor
                  </button>
                </div>

                <!-- Box 2: Courier Driver -->
                <div style="border:1px solid #e2e8f0; border-radius:var(--radius-md); padding:10px; background:#f8fafc; display:flex; flex-direction:column; gap:6px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:700; font-size:11.5px; color:var(--text-main);">2. 3PL Courier Driver</div>
                    <span class="badge ${this.driverSigned ? 'badge-success' : 'badge-warning'}" style="font-size:9px;">
                      ${this.driverSigned ? 'SIGNED' : 'REQUIRED'}
                    </span>
                  </div>
                  <div style="font-size:10.5px; color:var(--text-dim);">${manifest.driver_name} (${manifest.truck_plate_number})</div>
                  
                  <div style="background:#ffffff; border:1px dashed var(--border-muted); border-radius:4px; height:80px; position:relative; overflow:hidden;">
                    <canvas id="canvas-driver-sign" width="380" height="80" style="width:100%; height:100%; display:block; cursor:crosshair;"></canvas>
                    ${!this.driverSigned ? `
                      <div id="drv-hint" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; font-size:10.5px; color:var(--text-dim);">
                        Driver touch sign here
                      </div>
                    ` : ''}
                  </div>

                  <button class="btn btn-secondary" id="btn-auto-sign-driver" style="padding:3px 8px; font-size:10.5px; align-self:flex-start;">
                    Auto-Sign Driver
                  </button>
                </div>
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-close-manifest-footer" style="font-size:12px;">
              Close
            </button>
            <button class="btn btn-primary" id="btn-confirm-manifest-handover" ${this.supervisorSigned && this.driverSigned ? '' : 'disabled'} style="font-size:12.5px; font-weight:800; background:#059669;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>${this.supervisorSigned && this.driverSigned ? 'Execute Driver Handover (State -> SHIPPED)' : 'Both Signatures Required'}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  initCanvasPads() {
    setTimeout(() => {
      this.setupCanvas('canvas-supervisor-sign', () => {
        this.supervisorSigned = true;
        const hint = this.querySelector('#sup-hint');
        if (hint) hint.remove();
        this.updateConfirmButton();
      });

      this.setupCanvas('canvas-driver-sign', () => {
        this.driverSigned = true;
        const hint = this.querySelector('#drv-hint');
        if (hint) hint.remove();
        this.updateConfirmButton();
      });
    }, 50);
  }

  setupCanvas(canvasId, onSigned) {
    const canvas = this.querySelector(`#${canvasId}`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a';
    ctx.lineCap = 'round';

    let drawing = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    const startDraw = (e) => {
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const stopDraw = () => {
      if (drawing) {
        drawing = false;
        onSigned();
      }
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDraw);
  }

  drawSimulatedSignature(canvasId, name) {
    const canvas = this.querySelector(`#${canvasId}`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'italic 26px "Plus Jakarta Sans", cursive, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(name, 30, 48);

    ctx.beginPath();
    ctx.moveTo(25, 54);
    ctx.bezierCurveTo(80, 60, 200, 45, 260, 56);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  updateConfirmButton() {
    const btn = this.querySelector('#btn-confirm-manifest-handover');
    if (btn) {
      if (this.supervisorSigned && this.driverSigned) {
        btn.removeAttribute('disabled');
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Execute Driver Handover (State &rarr; SHIPPED)</span>
        `;
      }
    }
  }

  attachEvents() {
    const backdrop = this.querySelector('#manifest-modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
    }

    const closeBtn = this.querySelector('#btn-close-manifest-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const footerCloseBtn = this.querySelector('#btn-close-manifest-footer');
    if (footerCloseBtn) footerCloseBtn.addEventListener('click', () => this.close());

    const autoSupBtn = this.querySelector('#btn-auto-sign-supervisor');
    if (autoSupBtn) {
      autoSupBtn.addEventListener('click', () => {
        sound.play('click');
        this.drawSimulatedSignature('canvas-supervisor-sign', 'Andi Pratama');
        this.supervisorSigned = true;
        const hint = this.querySelector('#sup-hint');
        if (hint) hint.remove();
        this.updateConfirmButton();
      });
    }

    const autoDrvBtn = this.querySelector('#btn-auto-sign-driver');
    if (autoDrvBtn) {
      autoDrvBtn.addEventListener('click', () => {
        sound.play('click');
        this.drawSimulatedSignature('canvas-driver-sign', this.manifestData.manifest.driver_name);
        this.driverSigned = true;
        const hint = this.querySelector('#drv-hint');
        if (hint) hint.remove();
        this.updateConfirmButton();
      });
    }

    const confirmBtn = this.querySelector('#btn-confirm-manifest-handover');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        sound.play('success');

        const result = store.signAndHandoverManifest({
          manifestId: this.manifestData.manifest.id,
          supervisorSignature: 'SIGN_ANDI_PRATAMA',
          driverSignature: `SIGN_${this.manifestData.manifest.driver_name.toUpperCase()}`
        });

        alert(`Digital BAST Signed! ${result.shippedOrdersCount} Orders transitioned to SHIPPED and handed over to driver ${this.manifestData.manifest.driver_name}.`);
        this.close();
      });
    }
  }
}

customElements.define('wms-manifest-modal', WmsManifestModal);
window.wmsManifestModal = new WmsManifestModal();
