const PDFDocument = require('pdfkit');
const path = require('path');

function generatePDF(task) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = 50;

    doc.fontSize(20).font('Helvetica-Bold')
      .text('Optical System Design Analysis Report', { align: 'center' });
    y += 30;
    doc.fontSize(10).font('Helvetica')
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    y += 30;

    doc.fontSize(14).font('Helvetica-Bold').text('1. Task Overview', 50, y);
    y += 20;
    doc.fontSize(10).font('Helvetica');

    const statusMap = {
      pending: 'Pending', parsing: 'Parsing', tracing: 'Ray Tracing',
      calculating: 'Aberration Calculating', optimizing: 'Optimizing',
      completed: 'Completed', error: 'Error', paused: 'Paused'
    };

    const overview = [
      ['Task Name', task.name || 'Untitled'],
      ['Status', statusMap[task.status] || task.status],
      ['Iterations', `${task.iterations || 0}`],
      ['Quality Score', `${task.quality_score || 0}`],
      ['Meets Requirements', task.meets_requirements ? 'Yes' : 'No'],
      ['RMS Threshold', `${task.rms_threshold} λ`],
      ['MTF Threshold', `${task.mtf_threshold} lp/mm`],
      ['Created', task.created_at],
      ['Completed', task.completed_at || 'N/A']
    ];

    overview.forEach(([label, value]) => {
      doc.text(label, 60, y, { width: 150 });
      doc.text(String(value), 220, y, { width: 300 });
      y += 16;
    });

    y += 15;

    if (task.analysis_results) {
      if (y > 650) { doc.addPage(); y = 50; }
      doc.fontSize(14).font('Helvetica-Bold').text('2. Optical Performance', 50, y);
      y += 20;
      doc.fontSize(10).font('Helvetica');

      const overall = task.analysis_results.overall;
      const perfData = [
        ['Wavefront RMS', `${overall.avgRmsWavefront.toFixed(4)} λ`],
        ['MTF Cutoff', `${overall.avgMTFCutoff.toFixed(1)} lp/mm`],
        ['Spot RMS', `${overall.avgRmsSpot.toFixed(3)} µm`],
        ['On-axis RMS', `${overall.onAxisRms.toFixed(4)} λ`],
        ['Full-field RMS', `${overall.fullFieldRms.toFixed(4)} λ`]
      ];
      perfData.forEach(([label, value]) => {
        doc.text(label, 60, y, { width: 150 });
        doc.text(value, 220, y, { width: 300 });
        y += 16;
      });
      y += 15;
    }

    if (task.lens_data && task.lens_data.surfaces) {
      if (y > 600) { doc.addPage(); y = 50; }
      doc.fontSize(14).font('Helvetica-Bold').text('3. Lens Parameters', 50, y);
      y += 20;
      doc.fontSize(9).font('Helvetica-Bold');
      const headers = ['#', 'Radius(mm)', 'Thickness(mm)', 'n', 'Dia(mm)'];
      const colX = [60, 80, 170, 260, 330];
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += 14;
      doc.font('Helvetica');

      task.lens_data.surfaces.forEach((s, i) => {
        if (y > 720) { doc.addPage(); y = 50; }
        const row = [
          i + 1,
          isFinite(s.radius) ? s.radius.toFixed(2) : 'Inf',
          s.thickness.toFixed(3),
          s.refractiveIndex.toFixed(3),
          s.diameter.toFixed(1)
        ];
        row.forEach((v, ci) => doc.text(String(v), colX[ci], y));
        y += 13;
      });
      y += 15;
    }

    const logs = task.optimization_logs || [];
    if (logs.length > 0) {
      if (y > 600) { doc.addPage(); y = 50; }
      doc.fontSize(14).font('Helvetica-Bold').text('4. Optimization History', 50, y);
      y += 20;
      doc.fontSize(9).font('Helvetica-Bold');
      const logHeaders = ['Iter', 'RMS(λ)', 'MTF(lp/mm)', 'Improved', 'Adjustment'];
      const logX = [60, 100, 180, 260, 320];
      logHeaders.forEach((h, i) => doc.text(h, logX[i], y));
      y += 14;
      doc.font('Helvetica');

      logs.slice(-20).forEach(log => {
        if (y > 720) { doc.addPage(); y = 50; }
        const row = [log.iteration, log.rms?.toFixed(4) || '-', log.mtf?.toFixed(1) || '-', log.improved ? 'Yes' : 'No', log.adjustment_type || '-'];
        row.forEach((v, ci) => doc.text(String(v), logX[ci], y, { width: 80 }));
        y += 13;
      });
    }

    if (task.analysis_results) {
      doc.addPage(); y = 50;
      doc.fontSize(14).font('Helvetica-Bold').text('5. Aberration Analysis', 50, y);
      y += 20;
      doc.fontSize(10).font('Helvetica');

      const aberrations = task.analysis_results.aberrations || {};
      const abNames = { spherical: 'Spherical', coma: 'Coma', astigmatism: 'Astigmatism', fieldCurvature: 'Field Curvature', distortion: 'Distortion' };

      Object.keys(aberrations).forEach(angle => {
        if (y > 700) { doc.addPage(); y = 50; }
        doc.fontSize(11).font('Helvetica-Bold').text(`Field Angle: ${angle}°`, 60, y);
        y += 18;
        doc.fontSize(10).font('Helvetica');
        const ab = aberrations[angle];
        Object.keys(abNames).forEach(key => {
          doc.text(abNames[key], 70, y, { width: 150 });
          doc.text(`${ab[key]?.toFixed(2) || 0}%`, 230, y);
          y += 14;
        });
        y += 10;
      });
    }

    doc.fontSize(8).font('Helvetica')
      .text('--- End of Report ---', { align: 'center' });

    doc.end();
  });
}

module.exports = { generatePDF };
