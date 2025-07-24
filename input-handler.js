// Input handling and validation module

import { POSITIVE_ONLY_FIELDS, UI_CONFIG } from './config.js';

export class InputHandler {
    constructor() {
        this.inputElements = new Map();
        this.validators = new Map();
    }

    // Register an input element with its validator
    register(elementId, validator = null) {
        const element = document.getElementById(elementId);
        if (element) {
            this.inputElements.set(elementId, element);
            if (validator) {
                this.validators.set(elementId, validator);
            }
        }
        return element;
    }

    // Get value from input with validation
    getValue(elementId, defaultValue = 0) {
        const element = this.inputElements.get(elementId) || document.getElementById(elementId);
        if (!element) return defaultValue;

        const value = parseFloat(element.value);
        if (isNaN(value)) return defaultValue;

        const validator = this.validators.get(elementId);
        if (validator) {
            return validator(value, defaultValue);
        }

        return value;
    }

    // Set value for input
    setValue(elementId, value) {
        const element = this.inputElements.get(elementId) || document.getElementById(elementId);
        if (element) {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // Validate input length and format
    validateInputLength(input) {
        const value = input.value;
        const digitsOnly = value.replace(/[^\d]/g, '');
        const shouldBePositive = POSITIVE_ONLY_FIELDS.includes(input.id);

        // Prevent negative values for positive-only fields
        if (shouldBePositive && value.includes('-')) {
            input.value = value.replace('-', '');
            return;
        }

        // Check minimum values
        const numValue = parseFloat(input.value);
        if (!isNaN(numValue) && shouldBePositive && numValue <= 0) {
            if (['exchange-value', 'temperature-value'].includes(input.id)) {
                input.value = '0.01';
            } else {
                input.value = '0.1';
            }
            return;
        }

        // Limit to max digits
        if (digitsOnly.length > UI_CONFIG.MAX_INPUT_DIGITS) {
            const decimalIndex = value.indexOf('.');
            
            if (decimalIndex !== -1) {
                const beforeDecimal = value.substring(0, decimalIndex).replace(/[^\d-]/g, '');
                const afterDecimal = value.substring(decimalIndex + 1).replace(/[^\d]/g, '');
                const totalDigits = beforeDecimal.replace('-', '').length + afterDecimal.length;
                
                if (totalDigits > UI_CONFIG.MAX_INPUT_DIGITS) {
                    const allowedAfterDecimal = Math.max(0, UI_CONFIG.MAX_INPUT_DIGITS - beforeDecimal.replace('-', '').length);
                    input.value = beforeDecimal + '.' + afterDecimal.substring(0, allowedAfterDecimal);
                }
            } else {
                const sign = value.indexOf('-') !== -1 && !shouldBePositive ? '-' : '';
                const digits = value.replace(/[^\d]/g, '').substring(0, UI_CONFIG.MAX_INPUT_DIGITS);
                input.value = sign + digits;
            }
        }

        // Check maximum value
        const finalNumValue = parseFloat(input.value);
        if (finalNumValue > 9999999999) {
            input.value = '9999999999';
        }
    }

    // Setup validation listeners for an input
    setupValidation(elementId) {
        const input = this.inputElements.get(elementId) || document.getElementById(elementId);
        if (!input || input.type !== 'number') return;

        const shouldBePositive = POSITIVE_ONLY_FIELDS.includes(elementId);

        // Real-time validation
        input.addEventListener('input', () => this.validateInputLength(input));

        // Paste validation
        input.addEventListener('paste', () => {
            setTimeout(() => this.validateInputLength(input), 0);
        });

        // Blur validation for minimum values
        input.addEventListener('blur', () => {
            const value = parseFloat(input.value);
            
            if (shouldBePositive && (isNaN(value) || value <= 0)) {
                if (['exchange-value', 'temperature-value'].includes(elementId)) {
                    input.value = '0.01';
                } else if (elementId === 'ms-value') {
                    input.value = '1';
                } else {
                    input.value = '0.1';
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        // Keypress validation
        input.addEventListener('keypress', (e) => {
            const value = input.value;
            const digitsOnly = value.replace(/[^\d]/g, '');

            // Allow control keys
            if (e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey) {
                return true;
            }

            // Allow decimal point if not present
            if (e.key === '.' && value.indexOf('.') === -1) {
                return true;
            }

            // Prevent minus sign for positive-only fields
            if (e.key === '-') {
                if (shouldBePositive) {
                    e.preventDefault();
                    return false;
                }
                // Allow minus only at beginning
                if (input.selectionStart !== 0 || value.indexOf('-') !== -1) {
                    e.preventDefault();
                    return false;
                }
            }

            // Prevent more than max digits
            if (/\d/.test(e.key) && digitsOnly.length >= UI_CONFIG.MAX_INPUT_DIGITS) {
                e.preventDefault();
                return false;
            }
        });
    }

    // Setup all input validations
    setupAllValidations() {
        const numberInputs = document.querySelectorAll('input[type="number"]');
        numberInputs.forEach(input => {
            this.register(input.id);
            this.setupValidation(input.id);
        });
    }

    // Get magnetic properties from inputs
    getMagneticProperties() {
        return {
            Ms: this.getValue('ms-value', 800) * 1000, // Convert kA/m to A/m
            Ku: this.getValue('ku-value', 0.5) * 1e6,  // Convert MJ/m³ to J/m³
            A: this.getValue('exchange-value', 15) * 1e-12, // Convert pJ/m to J/m
            T: this.getValue('temperature-value', 300) // Temperature in K
        };
    }

    // Get geometry dimensions
    getGeometryDimensions(geometryType) {
        switch (geometryType) {
            case 'prism':
                return {
                    a: this.getValue('prism-a', UI_CONFIG.DEFAULT_VALUES.prism.a),
                    b: this.getValue('prism-b', UI_CONFIG.DEFAULT_VALUES.prism.b),
                    c: this.getValue('prism-c', UI_CONFIG.DEFAULT_VALUES.prism.c)
                };
            case 'cylinder':
                return {
                    thickness: this.getValue('cylinder-thickness', UI_CONFIG.DEFAULT_VALUES.cylinder.thickness),
                    diameter: this.getValue('cylinder-diameter', UI_CONFIG.DEFAULT_VALUES.cylinder.diameter)
                };
            case 'sphere':
                return {
                    diameter: this.getValue('sphere-diameter', UI_CONFIG.DEFAULT_VALUES.sphere.diameter)
                };
            default:
                return {};
        }
    }
}

// Export singleton instance
export const inputHandler = new InputHandler();

export default InputHandler;