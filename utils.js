// Utility functions for the magnetic calculator

import { CALCULATION_CONSTRAINTS, UI_CONFIG } from './config.js';

// Cache management
export class CalculationCache {
    constructor(maxSize = CALCULATION_CONSTRAINTS.MAX_CACHE_SIZE, expiryMs = CALCULATION_CONSTRAINTS.CACHE_EXPIRY) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.expiryMs = expiryMs;
    }

    generateKey(type, params) {
        return `${type}-${JSON.stringify(params)}`;
    }

    get(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.expiryMs) {
            return cached.result;
        }
        this.cache.delete(cacheKey);
        return null;
    }

    set(cacheKey, result) {
        this.cache.set(cacheKey, {
            result: result,
            timestamp: Date.now()
        });

        // Limit cache size
        if (this.cache.size > this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    clear() {
        this.cache.clear();
    }

    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.expiryMs) {
                this.cache.delete(key);
            }
        }
    }

    get size() {
        return this.cache.size;
    }
}

// Performance monitoring
export class PerformanceMonitor {
    constructor() {
        this.stats = {
            calculationCount: 0,
            totalTime: 0,
            lastCalculationTime: 0
        };
    }

    record(calculationType, time) {
        this.stats.calculationCount++;
        this.stats.totalTime += time;
        this.stats.lastCalculationTime = time;

        // Log performance periodically
        if (this.stats.calculationCount % UI_CONFIG.PERFORMANCE_LOG_INTERVAL === 0) {
        }

        return this.stats;
    }

    updateUI(time) {
        const calcCount = document.getElementById('calc-count');
        const lastTime = document.getElementById('last-time');
        const cpuStatus = document.getElementById('cpu-status');

        if (calcCount) calcCount.textContent = this.stats.calculationCount;
        if (lastTime) lastTime.textContent = time.toFixed(1) + 'ms';

        if (cpuStatus) {
            if (time < 50) {
                cpuStatus.innerHTML = '🟢 Cool';
                cpuStatus.style.color = '#4ade80';
            } else if (time < 200) {
                cpuStatus.innerHTML = '🟡 Warm';
                cpuStatus.style.color = '#fbbf24';
            } else {
                cpuStatus.innerHTML = '🔴 Hot';
                cpuStatus.style.color = '#f87171';
            }
        }
    }
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Safe requestIdleCallback with fallback
export function safeRequestIdleCallback(callback, options = {}) {
    if (window.requestIdleCallback) {
        return window.requestIdleCallback(callback, options);
    } else {
        return setTimeout(callback, 0);
    }
}


// Error message formatting
export function formatError(error, context = '') {
    let errorMessage = error.message;
    let suggestion = "";

    if (error.message.includes("Aspect ratio too extreme")) {
        suggestion = "<br><strong>Suggestion:</strong> For very thin films, use the 'Thin Film' calculator. For very long rods, use the 'Infinite Rod' calculator.";
    } else if (error.message.includes("must be at least")) {
        suggestion = "<br><strong>Suggestion:</strong> Use dimensions larger than 0.01 nm for reliable calculations.";
    } else if (error.message.includes("must be less than")) {
        suggestion = "<br><strong>Suggestion:</strong> For very large structures, consider using analytical approximations.";
    } else if (error.message.includes("don't sum to 1")) {
        suggestion = "<br><strong>Suggestion:</strong> This usually indicates extreme aspect ratios. Try using more balanced dimensions or specialized calculators.";
    }

    return `
        <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); 
                    border: 1px solid #f87171; 
                    border-radius: 12px; 
                    padding: 20px; 
                    margin: 10px 0;">
            <h4 style="color: #dc2626; margin: 0 0 10px 0; display: flex; align-items: center;">
                ⚠️ ${context ? context + ' ' : ''}Calculation Error
            </h4>
            <p style="margin: 0; color: #991b1b;">
                ${errorMessage}${suggestion}
            </p>
            <small style="color: #7f1d1d; margin-top: 10px; display: block;">
                Valid ranges: 0.01 nm - 1,000,000 nm, aspect ratio < 10,000,000
            </small>
        </div>
    `;
}

// Export all utilities
export default {
    CalculationCache,
    PerformanceMonitor,
    debounce,
    safeRequestIdleCallback,
    formatError
};