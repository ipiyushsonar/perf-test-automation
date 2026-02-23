// ============================================
// Confluence Report Page Template
// ============================================

interface TemplateData {
    reportName: string;
    testDate: string;
    currentVersion?: string;
    previousVersion?: string;
    scenarioName?: string;
    testType?: string;
    overallStatus?: string;
    totalTransactions?: number;
    improvedCount?: number;
    degradedCount?: number;
    criticalCount?: number;
    transactions?: Array<{
        name: string;
        sampleCount: number;
        errorPercent: number;
        mean: number;
        p90: number;
        p95: number;
        throughput: number;
        status: string;
        baselineP90?: number;
        changePercent?: number;
    }>;
    grafanaImageFileNames?: string[];
}

/**
 * Build Confluence storage format (XHTML) for a test report page
 */
export function buildTestReportPage(data: TemplateData): string {
    const statusColor = getStatusColor(data.overallStatus);
    const statusEmoji = getStatusEmoji(data.overallStatus);

    let html = `
<ac:layout>
  <ac:layout-section ac:type="single">
    <ac:layout-cell>
      <h1>${escapeHtml(data.reportName)}</h1>
      <ac:structured-macro ac:name="info">
        <ac:rich-text-body>
          <p><strong>Test Date:</strong> ${escapeHtml(data.testDate)}</p>
          ${data.currentVersion ? `<p><strong>Current Version:</strong> ${escapeHtml(data.currentVersion)}</p>` : ''}
          ${data.previousVersion ? `<p><strong>Previous Version:</strong> ${escapeHtml(data.previousVersion)}</p>` : ''}
          ${data.scenarioName ? `<p><strong>Scenario:</strong> ${escapeHtml(data.scenarioName)}</p>` : ''}
          ${data.testType ? `<p><strong>Test Type:</strong> ${escapeHtml(data.testType)}</p>` : ''}
        </ac:rich-text-body>
      </ac:structured-macro>
    </ac:layout-cell>
  </ac:layout-section>

  <ac:layout-section ac:type="single">
    <ac:layout-cell>
      <h2>Summary</h2>
      <ac:structured-macro ac:name="${data.overallStatus === 'fail' ? 'warning' : 'info'}">
        <ac:rich-text-body>
          <p>${statusEmoji} <strong>Overall Status:</strong> <span style="color: ${statusColor};">${(data.overallStatus || 'N/A').toUpperCase()}</span></p>
          <p><strong>Total Transactions:</strong> ${data.totalTransactions ?? 'N/A'}</p>
          <p><strong>Improved:</strong> ${data.improvedCount ?? 0} | <strong>Degraded:</strong> ${data.degradedCount ?? 0} | <strong>Critical:</strong> ${data.criticalCount ?? 0}</p>
        </ac:rich-text-body>
      </ac:structured-macro>
    </ac:layout-cell>
  </ac:layout-section>`;

    // Transaction results table
    if (data.transactions && data.transactions.length > 0) {
        html += `
  <ac:layout-section ac:type="single">
    <ac:layout-cell>
      <h2>Per-Transaction Results</h2>
      <table>
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Samples</th>
            <th>Error %</th>
            <th>Mean (ms)</th>
            <th>P90 (ms)</th>
            <th>P95 (ms)</th>
            <th>TPS</th>
            ${data.previousVersion ? '<th>Baseline P90</th><th>Change %</th>' : ''}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>`;

        for (const tx of data.transactions) {
            const rowColor = getStatusColor(tx.status);
            html += `
          <tr>
            <td>${escapeHtml(tx.name)}</td>
            <td>${tx.sampleCount}</td>
            <td>${tx.errorPercent.toFixed(2)}%</td>
            <td>${tx.mean}</td>
            <td>${tx.p90}</td>
            <td>${tx.p95}</td>
            <td>${tx.throughput.toFixed(2)}</td>
            ${data.previousVersion ? `<td>${tx.baselineP90 ?? 'N/A'}</td><td style="color: ${rowColor};">${tx.changePercent != null ? `${tx.changePercent > 0 ? '+' : ''}${tx.changePercent.toFixed(1)}%` : 'N/A'}</td>` : ''}
            <td style="color: ${rowColor};">${escapeHtml(tx.status)}</td>
          </tr>`;
        }

        html += `
        </tbody>
      </table>
    </ac:layout-cell>
  </ac:layout-section>`;
    }

    // Grafana images
    if (data.grafanaImageFileNames && data.grafanaImageFileNames.length > 0) {
        html += `
  <ac:layout-section ac:type="single">
    <ac:layout-cell>
      <h2>Grafana Dashboard Screenshots</h2>`;

        for (const fileName of data.grafanaImageFileNames) {
            html += `
      <p><ac:image ac:width="800"><ri:attachment ri:filename="${escapeHtml(fileName)}" /></ac:image></p>`;
        }

        html += `
    </ac:layout-cell>
  </ac:layout-section>`;
    }

    html += `
</ac:layout>`;

    return html;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getStatusColor(status?: string | null): string {
    switch (status) {
        case 'pass':
        case 'improved':
        case 'stable':
            return '#36B37E';
        case 'warning':
        case 'minor':
        case 'moderate':
            return '#FF991F';
        case 'fail':
        case 'critical':
        case 'degraded':
            return '#FF5630';
        default:
            return '#6B778C';
    }
}

function getStatusEmoji(status?: string | null): string {
    switch (status) {
        case 'pass': return '✅';
        case 'warning': return '⚠️';
        case 'fail': return '❌';
        default: return 'ℹ️';
    }
}
