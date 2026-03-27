import type { CertificateTemplate } from '../types';

export interface CertActivity {
    title: string;
    orgName: string;
    date: string | null;
    hours: number;
}

export interface CertificateVerificationMeta {
    certificateId: string;
    verifyUrl: string;
}

function getQrCodeUrl(value: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=96x96&margin=0&data=${encodeURIComponent(value)}`;
}

export function getTemplateStyle(t: CertificateTemplate): 'award' | 'tracking' {
    return t.templateType === 'hours_log' ? 'tracking' : 'award';
}

// ── Award Certificate ─────────────────────────────────────────────
export function buildAwardCertHtml(
    volunteerName: string,
    districtName: string,
    totalHours: number,
    activities: CertActivity[],
    template: CertificateTemplate,
    volunteerSignatureName?: string,
    verification?: CertificateVerificationMeta,
): string {
    const p = template.primaryColor || '#F59E0B';
    const a = template.accentColor || '#EA580C';
    const today = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
    const signatoryName = template.signatoryName?.trim() || districtName;
    const signatoryTitle = template.signatoryTitle?.trim() || 'Authorized Organization Representative';
    const actDesc = activities.length > 0
        ? activities.map(x => x.title).slice(0, 3).join(', ')
        : 'Community Volunteer Service';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Certificate – ${volunteerName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f3f4f6;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Georgia,'Times New Roman',serif}
  @media print{body{background:white;margin:0}.wrap{box-shadow:none!important;margin:0!important}@page{size:A4 landscape;margin:0}}
  .wrap{width:900px;background:white;position:relative;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.18);margin:30px auto}
  .top{height:14px;background:linear-gradient(90deg,${p},${a})}
  .c{position:absolute;width:60px;height:60px}
  .tl{top:14px;left:0;border-top:4px solid ${p};border-left:4px solid ${p}}
  .tr{top:14px;right:0;border-top:4px solid ${p};border-right:4px solid ${p}}
  .bl{bottom:0;left:0;border-bottom:4px solid ${p};border-left:4px solid ${p}}
  .br{bottom:0;right:0;border-bottom:4px solid ${p};border-right:4px solid ${p}}
  .inner{padding:40px 70px 50px}
  .org{font-family:Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${a};text-align:center;margin-bottom:6px}
  .divider{width:80px;height:3px;background:linear-gradient(90deg,${p},${a});margin:0 auto 28px;border-radius:2px}
  .title{font-size:38px;font-weight:bold;color:${p};text-align:center;letter-spacing:2px;line-height:1.15;margin-bottom:6px}
  .sub{font-family:Arial,sans-serif;font-size:12px;letter-spacing:5px;text-transform:uppercase;color:#9ca3af;text-align:center;margin-bottom:32px}
  .pres{font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#6b7280;text-align:center;margin-bottom:6px}
  .vname{font-size:46px;color:#1c1917;text-align:center;margin-bottom:20px;font-style:italic}
  .body{font-family:Arial,sans-serif;font-size:14px;color:#374151;text-align:center;line-height:1.8;max-width:620px;margin:0 auto 20px}
  .badge{display:inline-block;background:linear-gradient(135deg,${p},${a});color:white;font-family:Arial,sans-serif;font-weight:bold;font-size:15px;padding:8px 24px;border-radius:50px;margin-bottom:24px}
  .badge-row{text-align:center;margin-bottom:10px}
  .sig-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px;padding-top:20px;border-top:1px solid #e5e7eb}
  .sig{text-align:center;min-width:180px}
  .sig-line{width:180px;height:1px;background:#374151;margin:0 auto 6px}
  .sig-lbl{font-family:Arial,sans-serif;font-size:11px;color:#6b7280;letter-spacing:1px;text-transform:uppercase}
  .sig-name{font-family:Arial,sans-serif;font-size:13px;color:#1c1917;font-weight:bold;margin-bottom:4px}
  .sig-script{font-family:'Brush Script MT','Lucida Handwriting','Segoe Script',cursive;font-size:26px;color:#1c1917;line-height:1;margin-bottom:4px}
  .seal{width:70px;height:70px;border-radius:50%;border:3px solid ${p};display:flex;align-items:center;justify-content:center;flex-direction:column;color:${p};font-family:Arial,sans-serif;font-size:8px;font-weight:bold;letter-spacing:1px;text-align:center;text-transform:uppercase;line-height:1.3}
  .verify{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:18px}
  .verify-qr{width:82px;height:82px;border:1px solid #d1d5db;border-radius:10px;padding:6px;background:white;object-fit:contain}
  .verify-copy{font-family:Arial,sans-serif;font-size:10px;color:#6b7280;line-height:1.6;text-align:left;max-width:330px}
  .verify-label{font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#111827;margin-bottom:4px}
  .verify strong{color:#111827}
  .bot{height:6px;background:linear-gradient(90deg,${p},${a})}
</style>
</head>
<body>
<div class="wrap">
  <div class="top"></div>
  <div class="c tl"></div><div class="c tr"></div>
  <div class="inner">
    <div class="org">${districtName}</div>
    <div class="divider"></div>
    <div class="title">Certificate</div>
    <div class="sub">of Volunteer Service</div>
    <div class="pres">This certifies that</div>
    <div class="vname">${volunteerName}</div>
    <div class="body">has successfully completed community volunteer service<br/><strong>${actDesc}</strong></div>
    <div class="badge-row"><span class="badge">${totalHours.toFixed(1)} Hours of Service</span></div>
    <div class="sig-row">
      <div class="sig">
        <div class="sig-line"></div>
        ${volunteerSignatureName ? `<div class="sig-script">${volunteerSignatureName}</div>` : ''}
        <div class="sig-name">${signatoryName}</div>
        <div class="sig-lbl">${signatoryTitle}</div>
      </div>
      <div class="seal"><div>✦</div><div>VSMS</div><div>Official</div></div>
      <div class="sig">
        <div class="sig-name">${today}</div>
        <div class="sig-line"></div>
        <div class="sig-lbl">Date Issued</div>
      </div>
    </div>
    ${verification ? `<div class="verify"><img class="verify-qr" src="${getQrCodeUrl(verification.verifyUrl)}" alt="QR code for certificate verification"/><div class="verify-copy"><div class="verify-label">Scan To Verify</div><div><strong>Certificate ID:</strong> ${verification.certificateId}</div><div><strong>Verify:</strong> ${verification.verifyUrl}</div></div></div>` : ''}
  </div>
  <div class="c bl"></div><div class="c br"></div>
  <div class="bot"></div>
</div>
<script>window.onload=function(){window.print()}</script>
</body>
</html>`;
}

// ── Activity Tracking Form ────────────────────────────────────────
export function buildTrackingFormHtml(
    volunteerName: string,
    districtName: string,
    activities: CertActivity[],
    template: CertificateTemplate,
    volunteerSignatureName?: string,
    verification?: CertificateVerificationMeta,
): string {
    const p = template.primaryColor || '#F59E0B';
    const a = template.accentColor || '#EA580C';
    const totalHours = activities.reduce((s, x) => s + x.hours, 0);
    const today = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
    const signatoryName = template.signatoryName?.trim() || districtName;
    const signatoryTitle = template.signatoryTitle?.trim() || 'Authorized Organization Representative';

    const rows = activities.length > 0
        ? activities.map(x => `
        <tr>
          <td>${x.title}</td>
          <td>${x.orgName}</td>
          <td>${x.date ? new Date(x.date).toLocaleDateString('en-CA') : '—'}</td>
          <td style="text-align:center;font-weight:bold">${x.hours.toFixed(1)}</td>
          <td></td>
        </tr>`).join('')
        : `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:20px">No completed activities recorded yet.</td></tr>`;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Activity Log – ${volunteerName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f3f4f6;font-family:Arial,sans-serif;padding:20px}
  @media print{body{background:white;padding:0}.wrap{box-shadow:none!important;margin:0!important}@page{size:A4 portrait;margin:15mm}}
  .wrap{max-width:780px;background:white;margin:0 auto;box-shadow:0 4px 20px rgba(0,0,0,.15);padding:0}
  .header{background:linear-gradient(135deg,${p},${a});color:white;padding:24px 32px;display:flex;justify-content:space-between;align-items:center}
  .h-title{font-size:22px;font-weight:bold;letter-spacing:1px}
  .h-sub{font-size:11px;opacity:.85;margin-top:3px;letter-spacing:2px;text-transform:uppercase}
  .district{font-size:13px;font-weight:bold;text-align:right;opacity:.9}
  .info-box{padding:20px 32px;border-bottom:2px solid ${p}20;display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .info-row{display:flex;gap:8px;align-items:baseline}
  .info-lbl{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;white-space:nowrap}
  .info-val{font-size:14px;font-weight:bold;color:#1c1917;border-bottom:1px solid #d1d5db;flex:1;padding-bottom:2px}
  .notice{margin:16px 32px;padding:10px 16px;background:${p}15;border-left:4px solid ${p};font-size:12px;color:#374151;line-height:1.5}
  .notice strong{color:${p}}
  table{width:100%;border-collapse:collapse;margin-top:0}
  th{background:${p};color:white;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding:10px 14px;text-align:left}
  td{padding:10px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;color:#374151;vertical-align:top}
  tr:nth-child(even) td{background:#fafafa}
  .total-row td{background:${p}15;font-weight:bold;font-size:14px;border-top:2px solid ${p}40}
  .sig-section{padding:24px 32px;display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:8px}
  .sig-block{text-align:center}
  .sig-line{border-bottom:1px solid #374151;margin-bottom:6px;height:28px}
  .sig-script{font-family:'Brush Script MT','Lucida Handwriting','Segoe Script',cursive;font-size:24px;color:#1c1917;line-height:1;margin-bottom:4px}
  .sig-name{font-size:13px;color:#1c1917;font-weight:bold;margin-bottom:4px}
  .sig-lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px}
  .verify{padding:0 32px 18px;display:flex;align-items:center;justify-content:center;gap:18px}
  .verify-qr{width:82px;height:82px;border:1px solid #d1d5db;border-radius:10px;padding:6px;background:white;object-fit:contain}
  .verify-copy{font-size:10px;color:#6b7280;line-height:1.6;text-align:left;max-width:320px}
  .verify-label{font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#111827;margin-bottom:4px}
  .verify strong{color:#111827}
  .footer{background:${p}10;padding:12px 32px;font-size:10px;color:#9ca3af;text-align:center;border-top:1px solid ${p}20}
  .badge{display:inline-block;background:linear-gradient(135deg,${p},${a});color:white;font-size:13px;font-weight:bold;padding:6px 18px;border-radius:50px}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div>
      <div class="h-title">Community Involvement Activity Log</div>
      <div class="h-sub">Volunteer Service Tracking Record</div>
    </div>
    <div class="district">${districtName}</div>
  </div>

  <div class="info-box">
    <div class="info-row"><span class="info-lbl">Volunteer Name:</span><span class="info-val">${volunteerName}</span></div>
    <div class="info-row"><span class="info-lbl">Date Issued:</span><span class="info-val">${today}</span></div>
    <div class="info-row"><span class="info-lbl">Total Hours:</span><span class="info-val">${totalHours.toFixed(1)} hrs</span></div>
    <div class="info-row"><span class="info-lbl">Issued By:</span><span class="info-val">${districtName}</span></div>
  </div>

  <div class="notice">
    <strong>Important Notice:</strong> Upon completion of the required hours of Community Involvement,
    volunteers are required to submit this tracking record to the appropriate authority.
    All activities listed below have been verified through the VSMS platform.
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:35%">Activity / Opportunity</th>
        <th style="width:25%">Organization</th>
        <th style="width:15%">Date</th>
        <th style="width:10%;text-align:center">Hours</th>
        <th style="width:15%">Supervisor Sign.</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="3" style="text-align:right">Total Hours Completed:</td>
        <td style="text-align:center"><span class="badge">${totalHours.toFixed(1)}</span></td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="sig-section">
    <div class="sig-block">
      <div class="sig-line"></div>
      ${volunteerSignatureName ? `<div class="sig-script">${volunteerSignatureName}</div>` : ''}
      <div class="sig-lbl">Volunteer Signature</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-name">${signatoryName}</div>
      <div class="sig-lbl">${signatoryTitle}</div>
    </div>
  </div>

  ${verification ? `<div class="verify"><img class="verify-qr" src="${getQrCodeUrl(verification.verifyUrl)}" alt="QR code for certificate verification"/><div class="verify-copy"><div class="verify-label">Scan To Verify</div><div><strong>Certificate ID:</strong> ${verification.certificateId}</div><div><strong>Verify:</strong> ${verification.verifyUrl}</div></div></div>` : ''}

  <div class="footer">
    Generated by VSMS · ${districtName} · ${today} · This document confirms volunteer participation recorded in the VSMS platform.
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body>
</html>`;
}
