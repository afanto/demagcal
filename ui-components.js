// UI component functions for rendering results

import { PHYSICS_CONSTANTS } from './config.js';
import { safeRequestIdleCallback } from './utils.js';

// Format demagnetization values based on geometry type
export function formatDemagnetizationValue(value, geometryType) {
    if (geometryType === 'sphere') {
        return value.toFixed(4);
    } else if (geometryType === 'thin-film') {
        if (Math.abs(value) < 1e-10) return "0";
        if (Math.abs(value - 1) < 1e-10) return "1";
        return value.toFixed(4);
    } else if (geometryType === 'infinite-rod') {
        if (Math.abs(value) < 1e-10) return "0";
        if (Math.abs(value - 0.5) < 1e-10) return "0.5";
        return value.toFixed(4);
    }
    return value.toFixed(4);
}

// Format shape anisotropy values
export function formatShapeAnisotropyValue(value, geometryType) {
    if (geometryType === 'sphere' && Math.abs(value) < 1e-10) {
        return "0";
    }
    return (value/1e6).toFixed(3);
}


// Render axis labels
export function renderAxisLabels(N_x, N_y, N_z, N_easy, N_hard) {
    const tolerance = 1e-6;
    
    const getAxisLabel = (axisValue) => {
        const isEasy = Math.abs(axisValue - N_easy) < tolerance;
        const isHard = Math.abs(axisValue - N_hard) < tolerance;
        
        if (isEasy) return '<span class="axis-label-small easy-axis">Easy</span>';
        if (isHard) return '<span class="axis-label-small hard-axis">Hard</span>';
        return '';
    };
    
    return {
        xLabel: getAxisLabel(N_x),
        yLabel: getAxisLabel(N_y),
        zLabel: getAxisLabel(N_z)
    };
}

// Render property card
export function renderPropertyCard(cardClass, title, symbol, value, unit, formula, extraContent = '') {
    return `
        <div class="property-card ${cardClass}">
            <div class="property-header">
                <h5>${title}</h5>
                ${extraContent || `<span class="property-symbol">${symbol}</span>`}
            </div>
            <div class="property-value">
                <span class="main-value">${value}</span>
                <span class="unit">${unit}</span>
            </div>
            <div class="property-formula">
                ${formula}
            </div>
        </div>
    `;
}

// Render coercive field toggle
export function renderCoerciveFieldToggle(geometryType) {
    return `
        <div class="header-controls">
            <label class="toggle-label-header">
                <input type="checkbox" id="hc-unit-toggle-${geometryType}" onchange="toggleHcUnits('${geometryType}')">
                <span class="toggle-text-header">mT</span>
            </label>
            <span class="property-symbol">H<sub>c</sub></span>
        </div>
    `;
}


// Render complete results
export function renderResults(demagFactors, analysis, geometryType, extraParams = {}) {
    const [N_x, N_y, N_z] = demagFactors;
    const { N_easy, N_hard, K_shape, K_eff, H_c, delta, anisotropy_type, anisotropy_color } = analysis;
    const { Ms, Ku, A, showAdvanced = false } = extraParams;
    
    const labels = renderAxisLabels(N_x, N_y, N_z, N_easy, N_hard);
    
    
    return `
        <div class="compact-results">
            <div class="results-header" style="margin-bottom: 16px;">
                <h4 style="margin: 0; color: #374151; font-size: 16px;">Calculation Results</h4>
            </div>
            <div class="demagnetization-summary">
                <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">Demagnetization Factors</h4>
                <div class="demag-values-enhanced">
                    <div class="demag-item-enhanced">
                        <strong>Nx: ${formatDemagnetizationValue(N_x, geometryType)}</strong>
                        ${labels.xLabel}
                    </div>
                    <div class="demag-item-enhanced">
                        <strong>Ny: ${formatDemagnetizationValue(N_y, geometryType)}</strong>
                        ${labels.yLabel}
                    </div>
                    <div class="demag-item-enhanced">
                        <strong>Nz: ${formatDemagnetizationValue(N_z, geometryType)}</strong>
                        ${labels.zLabel}
                    </div>
                </div>
            </div>
            
            <div class="properties-container">
                <div class="critical-properties-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: ${showAdvanced ? '16px' : '20px'};">
                    ${renderPropertyCard(
                        'shape-anisotropy',
                        'Shape Anisotropy',
                        'K<sub>shape</sub>',
                        formatShapeAnisotropyValue(K_shape, geometryType),
                        'MJ/m³',
                        '$K_{shape} = \\frac{1}{2}\\mu_0 M_s^2 (N_{hard} - N_{easy})$'
                    )}
                    
                    ${renderPropertyCard(
                        'effective-anisotropy',
                        'Effective Anisotropy',
                        'K<sub>eff</sub>',
                        `<span style="color: ${K_eff > 0 ? '#27ae60' : '#e74c3c'};">${(K_eff/1e6).toFixed(3)}</span>`,
                        'MJ/m³',
                        K_shape === 0 ? '$K_{eff} = K_u$' : `$K_{eff} = K_u ${analysis.crystallineEasyAxis === 'Out-of-plane' ? (analysis.easy_axis.name === 'z' ? '+' : '-') : (analysis.easy_axis.name === 'z' ? '-' : '+')} K_{shape}$`
                    )}
                </div>
                
                ${showAdvanced ? `
                <div class="critical-properties-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 20px;">
                    ${renderPropertyCard(
                        'coercive-field',
                        'Coercive Field',
                        '',
                        `<span id="hc-value-${geometryType}">${(H_c/1000).toFixed(1)}</span>`,
                        `<span id="hc-unit-${geometryType}">kA/m</span>`,
                        `<span id="hc-formula-${geometryType}">$H_c = \\frac{2K_{eff}}{\\mu_0 M_s}$</span>`,
                        renderCoerciveFieldToggle(geometryType)
                    )}
                    
                    ${renderPropertyCard(
                        'thermal-stability',
                        'Thermal Stability',
                        'Δ',
                        typeof delta === 'number' ? delta.toFixed(1) : 'N/A',
                        typeof delta === 'number' ? (delta > 60 ? 'Stable' : 'Unstable') : 'Volume-dependent',
                        '$\\Delta = \\frac{K_{eff} V}{k_B T}$'
                    )}
                    
                    ${renderPropertyCard(
                        'exchange-length',
                        'Exchange Length',
                        'δ',
                        ((Math.sqrt(A / Math.abs(K_eff))) * 1e9).toFixed(1),
                        'nm',
                        '$\\delta = \\sqrt{\\frac{A}{K_{eff}}}$'
                    )}
                </div>
                ` : ''}
            </div>
            
            <div class="dominance-summary">
                <span class="dominance-info" style="color: ${anisotropy_color};">
                    ${anisotropy_type}
                </span>
                ${analysis.preferred_direction ? `
                <div class="preferred-magnetization">
                    <strong>Preferred magnetization:</strong> ${analysis.preferred_direction}
                    ${analysis.crystallineEasyAxis ? `<br><small>(Crystalline easy axis: ${analysis.crystallineEasyAxis})</small>` : ''}
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Update result element with MathJax rendering
export function updateResultElement(elementId, html, addGlow = true) {
    const resultElement = document.getElementById(elementId);
    if (!resultElement) return;
    
    resultElement.innerHTML = html;
    
    if (addGlow) {
        // Glow effect disabled as per original code
        // resultElement.classList.add('glow');
        // setTimeout(() => resultElement.classList.remove('glow'), 2000);
    }
    
    // Defer MathJax rendering
    if (window.MathJax) {
        safeRequestIdleCallback(() => {
            MathJax.typesetPromise([resultElement])
                .then(() => {})
                .catch((err) => {});
        });
    }
}


// Export all UI components
export default {
    formatDemagnetizationValue,
    formatShapeAnisotropyValue,
    renderAxisLabels,
    renderPropertyCard,
    renderCoerciveFieldToggle,
    renderResults,
    updateResultElement
};