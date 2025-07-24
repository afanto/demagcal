// Refactored main application module
// Uses ES6 modules for better organization and maintainability

import { UI_CONFIG, CALCULATION_CONSTRAINTS } from './config.js';
import { PerformanceMonitor, debounce, safeRequestIdleCallback } from './utils.js';
import { inputHandler } from './input-handler.js';
import { calculator } from './calculator-engine.js';

// Global state
const appState = {
    performanceMonitor: new PerformanceMonitor(),
    calculationTimeout: null,
    currentGeometry: 'cylinder',
    easyAxisInPlane: false, // false = out-of-plane (default), true = in-plane
    showAdvanced: false // false = basic view (default), true = advanced view
};

// Make appState globally available for UI components
window.appState = appState;



// Immediate geometry calculation
function immediateGeometryCalculation() {
    const start = performance.now();
    
    calculator.calculate();
    
    // Ensure MathJax re-renders
    setTimeout(() => {
        if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
            MathJax.typesetPromise().catch((err) => {});
        }
    }, 10);
    
    const end = performance.now();
    const stats = appState.performanceMonitor.record('Geometry', end - start);
    appState.performanceMonitor.updateUI(end - start);
}

// Debounced calculation
const debouncedGeometryCalculation = debounce(immediateGeometryCalculation, CALCULATION_CONSTRAINTS.DEBOUNCE_DELAY);

// Setup event listeners
function setupEventListeners() {
    const eventOptions = { passive: true };
    
    // Magnetic property inputs
    const magneticInputs = ['ms-value', 'ku-value', 'exchange-value', 'temperature-value'];
    magneticInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', debouncedGeometryCalculation, eventOptions);
        }
    });
    
    // Geometry dimension inputs
    const geometryInputs = [
        'prism-a', 'prism-b', 'prism-c',
        'cylinder-thickness', 'cylinder-diameter',
        'sphere-diameter', 'thin-film-thickness'
    ];
    
    geometryInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', debouncedGeometryCalculation, eventOptions);
        }
    });
    
    // Thermal stability input
    const thermalStabilityInput = document.getElementById('thermal-stability');
    if (thermalStabilityInput) {
        thermalStabilityInput.addEventListener('input', debouncedGeometryCalculation, eventOptions);
    }
}

// Initialize theory tabs
function initializeTheoryTabs() {
    const tabs = document.querySelectorAll('.theory-tab');
    const panels = document.querySelectorAll('.theory-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetPanel = this.getAttribute('data-tab');
            
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(targetPanel + '-panel').classList.add('active');
            
            if (window.MathJax) {
                MathJax.typesetPromise()
                    .then(() => {})
                    .catch((err) => {});
            }
        });
    });
}

// Initialize geometry selector
function initializeGeometry() {
    const geometrySelector = document.getElementById('geometry-selector');
    if (geometrySelector) {
        geometrySelector.addEventListener('change', function() {
            changeGeometry(this.value);
        });
    }
    
    const defaultGeometry = 'cylinder';
    if (geometrySelector) {
        geometrySelector.value = defaultGeometry;
    }
    changeGeometry(defaultGeometry);
}

// Change geometry
function changeGeometry(geometryType) {
    const geometryContent = document.querySelector('.geometry-content');
    if (!geometryContent) return;

    // Hide all panels
    document.querySelectorAll('.geometry-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    // Show selected panel
    const newPanel = document.getElementById(`${geometryType}-panel`);
    if (!newPanel) return;

    newPanel.classList.add('active');
    appState.currentGeometry = geometryType;
    
    updatePageTitle(geometryType);
    
    // Trigger calculation
    switch (geometryType) {
        case 'prism':
            calculator.calculatePrism();
            break;
        case 'cylinder':
            calculator.calculateCylinder();
            break;
        case 'sphere':
            calculator.calculateSphere();
            break;
        case 'thin-film':
            calculator.calculateThinFilm();
            break;
        case 'infinite-rod':
            calculator.calculateInfiniteRod();
            break;
    }
}

// Make changeGeometry globally available
window.changeGeometry = changeGeometry;

// Update easy axis direction
function updateEasyAxisDirection() {
    const selectedRadio = document.querySelector('input[name="easy-axis"]:checked');
    const description = document.getElementById('easy-axis-description');
    
    if (selectedRadio) {
        appState.easyAxisInPlane = selectedRadio.value === 'in-plane';
        
        // Pass the easy axis state to calculator
        calculator.setEasyAxisDirection(appState.easyAxisInPlane);
        
        // Recalculate with new easy axis
        immediateGeometryCalculation();
    }
}

// Make updateEasyAxisDirection globally available
window.updateEasyAxisDirection = updateEasyAxisDirection;

// Toggle advanced options (inputs and properties)
function toggleAdvancedOptions() {
    const toggle = document.getElementById('show-advanced');
    const advancedSection = document.getElementById('advanced-settings');
    
    if (toggle && advancedSection) {
        appState.showAdvanced = toggle.checked;
        
        // Show/hide advanced inputs
        advancedSection.style.display = toggle.checked ? 'block' : 'none';
        
        
        // Clear the entire cache to force fresh calculation
        calculator.cache.clear();
        
        // Get the active geometry panel
        const activePanel = document.querySelector('.geometry-panel.active');
        if (activePanel) {
            const geometryType = activePanel.id.replace('-panel', '');
            
            // Call the specific calculate function
            switch (geometryType) {
                case 'prism':
                    calculator.calculatePrism();
                    break;
                case 'cylinder':
                    calculator.calculateCylinder();
                    break;
                case 'sphere':
                    calculator.calculateSphere();
                    break;
                case 'thin-film':
                    calculator.calculateThinFilm();
                    break;
                case 'infinite-rod':
                    calculator.calculateInfiniteRod();
                    break;
            }
        }
    }
}

// Make toggleAdvancedOptions globally available
window.toggleAdvancedOptions = toggleAdvancedOptions;



// Update page title
function updatePageTitle(geometryType) {
    const titleElement = document.getElementById('page-title');
    if (!titleElement) return;
    
    const geometryNames = {
        'cylinder': 'Circular Cylinder',
        'prism': 'Rectangular Prism',
        'sphere': 'Sphere',
        'thin-film': 'Thin Film',
        'infinite-rod': 'Infinite Rod'
    };
    
    const geometryName = geometryNames[geometryType] || 'Unknown Geometry';
    titleElement.textContent = `Demagnetization Calculator - ${geometryName}`;
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter or Cmd+Enter to calculate
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            immediateGeometryCalculation();
        }
        
        // Number keys 1-5 to switch geometry
        if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            // Only activate if not typing in an input
            if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
                const geometryMap = {
                    '1': 'cylinder',
                    '2': 'prism', 
                    '3': 'sphere',
                    '4': 'thin-film',
                    '5': 'infinite-rod'
                };
                
                if (geometryMap[e.key]) {
                    e.preventDefault();
                    const selector = document.getElementById('geometry-selector');
                    if (selector) {
                        selector.value = geometryMap[e.key];
                        changeGeometry(geometryMap[e.key]);
                    }
                }
            }
        }
        
        // Arrow keys to navigate geometry when selector is focused
        if (document.activeElement.id === 'geometry-selector') {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const selector = document.getElementById('geometry-selector');
                const options = Array.from(selector.options);
                const currentIndex = selector.selectedIndex;
                
                if (e.key === 'ArrowLeft' && currentIndex > 0) {
                    selector.selectedIndex = currentIndex - 1;
                } else if (e.key === 'ArrowRight' && currentIndex < options.length - 1) {
                    selector.selectedIndex = currentIndex + 1;
                }
                
                changeGeometry(selector.value);
            }
        }
        
        
        // Esc to clear focus
        if (e.key === 'Escape') {
            document.activeElement.blur();
        }
        
        // ? to show keyboard shortcuts help
        if (e.key === '?' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            showKeyboardShortcutsHelp();
        }
    });
}

// Show keyboard shortcuts help
function showKeyboardShortcutsHelp() {
    alert(`Keyboard Shortcuts:
    
1-5: Switch geometry types
Ctrl/Cmd + Enter: Recalculate
Arrow Keys: Navigate geometry selector
Esc: Clear focus
?: Show this help`);
}

// Toggle coercive field units
window.toggleHcUnits = function(geometryType) {
    const checkbox = document.getElementById(`hc-unit-toggle-${geometryType}`);
    const valueElement = document.getElementById(`hc-value-${geometryType}`);
    const unitElement = document.getElementById(`hc-unit-${geometryType}`);
    const formulaElement = document.getElementById(`hc-formula-${geometryType}`);
    
    if (!checkbox || !valueElement || !unitElement || !formulaElement) return;
    
    // Get current value and convert
    const currentValue = parseFloat(valueElement.textContent);
    
    if (checkbox.checked) {
        // Convert kA/m to mT
        const mT = currentValue * 1.2566371;
        valueElement.textContent = mT.toFixed(1);
        unitElement.textContent = 'mT';
        formulaElement.innerHTML = '$H_c = \\frac{2K_{eff}}{\\mu_0 M_s} \\cdot \\mu_0 = \\frac{2K_{eff}}{M_s}$';
    } else {
        // Convert mT to kA/m
        const kAm = currentValue / 1.2566371;
        valueElement.textContent = kAm.toFixed(1);
        unitElement.textContent = 'kA/m';
        formulaElement.innerHTML = '$H_c = \\frac{2K_{eff}}{\\mu_0 M_s}$';
    }
    
    // Re-render MathJax
    if (window.MathJax) {
        MathJax.typesetPromise([formulaElement]).catch((err) => {});
    }
};

// Cleanup function
function cleanupCaches() {
    calculator.cleanup();
}


// Initialize application
function initializeApp() {
    
    // Initialize theory tabs
    initializeTheoryTabs();
    
    // Initialize geometry
    initializeGeometry();
    
    
    // Setup input validation
    inputHandler.setupAllValidations();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Perform initial calculation for default geometry
    calculator.calculateCylinder();
    
    
    // Defer MathJax rendering
    safeRequestIdleCallback(() => {
        if (window.MathJax) {
            MathJax.typesetPromise()
                .then(() => {})
                .catch((err) => {});
        }
    });
    
    // Setup periodic cleanup
    setInterval(cleanupCaches, CALCULATION_CONSTRAINTS.CACHE_EXPIRY);
}

// DOM ready event
document.addEventListener('DOMContentLoaded', initializeApp);

// Legacy support
window.onload = initializeApp;

// Export for debugging
window.appState = appState;
window.calculator = calculator;
window.inputHandler = inputHandler;