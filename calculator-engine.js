// Main calculator engine module

import { PHYSICS_CONSTANTS, CALCULATION_CONSTRAINTS } from './config.js';
import { CalculationCache, formatError } from './utils.js';
import { updateResultElement, renderResults } from './ui-components.js';
import { inputHandler } from './input-handler.js';
import {
    memoizedDemagFactors,
    memoizedNCylinder,
    memoizedNSphere,
    memoizedNThinFilm,
    memoizedNInfiniteRod
} from './math-utils.js';

export class MagneticCalculator {
    constructor() {
        this.cache = new CalculationCache();
        this.currentGeometry = 'cylinder';
        this.easyAxisInPlane = false; // false = out-of-plane (default), true = in-plane
    }

    // Set easy axis direction
    setEasyAxisDirection(inPlane) {
        this.easyAxisInPlane = inPlane;
        // Clear cache when easy axis changes
        this.cache.clear();
    }

    // Analyze magnetic anisotropy
    analyzeAnisotropy(factors, Ms, Ku, V, T) {
        const sortedFactors = [...factors].sort((a, b) => a.value - b.value);
        
        const easy_axis = sortedFactors[0];
        const hard_axis = sortedFactors[sortedFactors.length - 1];
        const N_easy = easy_axis.value;
        const N_hard = hard_axis.value;
        
        // Calculate shape anisotropy
        const K_shape = 0.5 * PHYSICS_CONSTANTS.MU0 * Ms * Ms * (N_hard - N_easy);
        
        // Determine effective anisotropy based on easy axis direction
        let K_eff;
        if (this.easyAxisInPlane) {
            // Easy axis in-plane: shape and crystalline anisotropies compete
            // If shape prefers out-of-plane (z) and crystal prefers in-plane, they oppose
            K_eff = (easy_axis.name === 'z') ? Ku - K_shape : Ku + K_shape;
        } else {
            // Easy axis out-of-plane (default): shape and crystalline anisotropies align/compete normally
            K_eff = (easy_axis.name === 'z') ? Ku + K_shape : Ku - K_shape;
        }
        
        const H_c = (2 * Math.abs(K_eff)) / (PHYSICS_CONSTANTS.MU0 * Ms);
        
        // Thermal stability
        const delta = Math.abs(K_eff) * V / (PHYSICS_CONSTANTS.KB * T);
        
        // Classification
        let anisotropy_type = "";
        let anisotropy_color = "";
        let preferred_direction = "";
        
        if (Math.abs(K_eff) < 0.01e6) { // Near zero effective anisotropy
            anisotropy_type = "Isotropic (K_eff ≈ 0)";
            anisotropy_color = "#6b7280";
            preferred_direction = "None";
        } else if (K_eff > 0) {
            anisotropy_type = "Magnetocrystalline-dominated";
            anisotropy_color = "#27ae60";
            preferred_direction = this.easyAxisInPlane ? "In-plane" : "Out-of-plane";
        } else {
            anisotropy_type = "Shape-dominated";
            anisotropy_color = "#e74c3c";
            // When K_eff < 0, shape anisotropy wins over crystalline
            preferred_direction = (easy_axis.name === 'z') ? "Out-of-plane" : "In-plane";
        }
        
        return {
            easy_axis,
            hard_axis,
            N_easy,
            N_hard,
            K_shape,
            K_eff,
            H_c,
            delta,
            anisotropy_type,
            anisotropy_color,
            preferred_direction,
            crystallineEasyAxis: this.easyAxisInPlane ? "In-plane" : "Out-of-plane"
        };
    }

    // Calculate prism demagnetization
    calculatePrism() {
        try {
            const dims = inputHandler.getGeometryDimensions('prism');
            const { a, b, c } = dims;
            
            // Validate inputs
            if (isNaN(a) || isNaN(b) || isNaN(c)) {
                throw new Error("Please enter valid numeric values for all dimensions");
            }
            
            if (a <= 0 || b <= 0 || c <= 0) {
                throw new Error("All dimensions must be positive values");
            }
            
            const { Ms, Ku, A, T } = inputHandler.getMagneticProperties();
            
            // Check cache
            const cacheKey = this.cache.generateKey('prism', { a, b, c, Ms, Ku, A, T });
            const cachedResult = this.cache.get(cacheKey);
            if (cachedResult) {
                updateResultElement('prism-result', cachedResult);
                return;
            }
            
            // Calculate volume
            const V = (a * 1e-9) * (b * 1e-9) * (c * 1e-9);
            const V_nm3 = a * b * c;
            
            // Calculate demagnetization factors
            const [N_x, N_y, N_z] = memoizedDemagFactors(a, b, c);
            
            // Validate factors
            if (!isFinite(N_x) || !isFinite(N_y) || !isFinite(N_z) || 
                N_x < 0 || N_x > 1 || N_y < 0 || N_y > 1 || N_z < 0 || N_z > 1) {
                throw new Error("Invalid demagnetization factors calculated");
            }
            
            const sum = N_x + N_y + N_z;
            if (Math.abs(sum - 1.0) > 0.01) {
                throw new Error(`Demagnetization factors don't sum to 1 (sum = ${sum.toFixed(4)})`);
            }
            
            // Analyze anisotropy
            const factors = [
                {name: 'x', value: N_x},
                {name: 'y', value: N_y},
                {name: 'z', value: N_z}
            ];
            
            const analysis = this.analyzeAnisotropy(factors, Ms, Ku, V, T);
            const showAdvanced = window.appState && window.appState.showAdvanced;
            const resultHTML = renderResults([N_x, N_y, N_z], analysis, 'prism', { Ms, Ku, A, showAdvanced });
            
            // Cache and display result
            this.cache.set(cacheKey, resultHTML);
            updateResultElement('prism-result', resultHTML);
            
        } catch (error) {
            console.error('Prism calculation error:', error);
            updateResultElement('prism-result', formatError(error, 'Prism'));
        }
    }


    // Calculate cylinder demagnetization
    calculateCylinder() {
        try {
            const dims = inputHandler.getGeometryDimensions('cylinder');
            const { thickness, diameter } = dims;
            const radius = diameter / 2;
            
            // Validate inputs
            if (isNaN(thickness) || isNaN(diameter)) {
                throw new Error("Please enter valid numeric values for thickness and diameter");
            }
            
            if (thickness <= 0 || diameter <= 0) {
                throw new Error("Thickness and diameter must be positive values");
            }
            
            const { Ms, Ku, A, T } = inputHandler.getMagneticProperties();
            
            // Check cache
            const cacheKey = this.cache.generateKey('cylinder', { thickness, diameter, Ms, Ku, A, T });
            const cachedResult = this.cache.get(cacheKey);
            if (cachedResult) {
                updateResultElement('cylinder-result', cachedResult);
                return;
            }
            
            // Calculate volume
            const V = Math.PI * (radius * 1e-9) * (radius * 1e-9) * (thickness * 1e-9);
            const V_nm3 = Math.PI * radius * radius * thickness;
            
            // Calculate demagnetization factors
            const N_z = memoizedNCylinder(thickness, diameter);
            const N_x = (1 - N_z) / 2;
            const N_y = N_x;
            
            // Validate factors
            if (!isFinite(N_z) || !isFinite(N_x) || N_z < 0 || N_z > 1 || N_x < 0 || N_x > 1) {
                throw new Error("Invalid demagnetization factors calculated");
            }
            
            // Analyze anisotropy
            const factors = [
                {name: 'x,y', value: N_x},
                {name: 'z', value: N_z}
            ];
            
            const analysis = this.analyzeAnisotropy(factors, Ms, Ku, V, T);
            
            // Adjust for display
            const analysisForDisplay = {
                ...analysis,
                easy_axis: { name: N_z < N_x ? 'z' : 'x', value: Math.min(N_x, N_z) },
                hard_axis: { name: N_z > N_x ? 'z' : 'x', value: Math.max(N_x, N_z) },
                N_easy: Math.min(N_x, N_z),
                N_hard: Math.max(N_x, N_z)
            };
            
            const showAdvanced = window.appState && window.appState.showAdvanced;
            const resultHTML = renderResults([N_x, N_y, N_z], analysisForDisplay, 'cylinder', { Ms, Ku, A, showAdvanced });
            
            // Cache and display result
            this.cache.set(cacheKey, resultHTML);
            updateResultElement('cylinder-result', resultHTML);
            
        } catch (error) {
            console.error('Cylinder calculation error:', error);
            updateResultElement('cylinder-result', formatError(error, 'Cylinder'));
        }
    }

    // Calculate sphere demagnetization
    calculateSphere() {
        try {
            const dims = inputHandler.getGeometryDimensions('sphere');
            const { diameter } = dims;
            const radius = diameter / 2;
            
            const { Ms, Ku, A, T } = inputHandler.getMagneticProperties();
            
            // Check cache
            const cacheKey = this.cache.generateKey('sphere', { diameter, Ms, Ku, A, T });
            const cachedResult = this.cache.get(cacheKey);
            if (cachedResult) {
                updateResultElement('sphere-result', cachedResult);
                return;
            }
            
            // Calculate volume
            const V = (4/3) * Math.PI * (radius * 1e-9) * (radius * 1e-9) * (radius * 1e-9);
            const V_nm3 = (4/3) * Math.PI * radius * radius * radius;
            
            const [N_x, N_y, N_z] = memoizedNSphere(diameter);
            
            // Analyze anisotropy (sphere has no shape anisotropy)
            const factors = [
                {name: 'x', value: N_x},
                {name: 'y', value: N_y},
                {name: 'z', value: N_z}
            ];
            
            const analysis = this.analyzeAnisotropy(factors, Ms, Ku, V, T);
            
            // Adjust for sphere
            const analysisForDisplay = {
                ...analysis,
                easy_axis: { name: 'isotropic', value: N_x },
                hard_axis: { name: 'isotropic', value: N_x },
                N_easy: N_x,
                N_hard: N_x,
                K_shape: 0
            };
            
            const showAdvanced = window.appState && window.appState.showAdvanced;
            const resultHTML = renderResults([N_x, N_y, N_z], analysisForDisplay, 'sphere', { Ms, Ku, A, showAdvanced });
            
            // Cache and display result
            this.cache.set(cacheKey, resultHTML);
            updateResultElement('sphere-result', resultHTML);
            
        } catch (error) {
            console.error('Sphere calculation error:', error);
            updateResultElement('sphere-result', formatError(error, 'Sphere'));
        }
    }

    // Calculate thin film (special case)
    calculateThinFilm() {
        try {
            const { Ms, Ku, A, T } = inputHandler.getMagneticProperties();
            
            // Check cache
            const cacheKey = this.cache.generateKey('thin-film', { Ms, Ku, A, T });
            const cachedResult = this.cache.get(cacheKey);
            if (cachedResult) {
                updateResultElement('thin-film-result', cachedResult);
                return;
            }
            
            const [N_x, N_y, N_z] = memoizedNThinFilm(1);
            
            // For thin films, volume is not defined
            const V_dummy = 1e-24;
            
            const factors = [
                {name: 'x', value: N_x},
                {name: 'y', value: N_y},
                {name: 'z', value: N_z}
            ];
            
            const analysis = this.analyzeAnisotropy(factors, Ms, Ku, V_dummy, T);
            
            const analysisForDisplay = {
                ...analysis,
                easy_axis: { name: 'in-plane', value: N_x },
                hard_axis: { name: 'out-of-plane', value: N_z },
                N_easy: N_x,
                N_hard: N_z,
                K_shape: 0.5 * PHYSICS_CONSTANTS.MU0 * Ms * Ms,
                delta: 'N/A'
            };
            
            const showAdvanced = window.appState && window.appState.showAdvanced;
            const resultHTML = renderResults([N_x, N_y, N_z], analysisForDisplay, 'thin-film', { Ms, Ku, A, showAdvanced });
            
            // Cache and display result
            this.cache.set(cacheKey, resultHTML);
            updateResultElement('thin-film-result', resultHTML);
            
        } catch (error) {
            console.error('Thin film calculation error:', error);
            updateResultElement('thin-film-result', formatError(error, 'Thin Film'));
        }
    }

    // Calculate infinite rod (special case)
    calculateInfiniteRod() {
        try {
            const { Ms, Ku, A, T } = inputHandler.getMagneticProperties();
            
            // Check cache
            const cacheKey = this.cache.generateKey('infinite-rod', { Ms, Ku, A, T });
            const cachedResult = this.cache.get(cacheKey);
            if (cachedResult) {
                updateResultElement('infinite-rod-result', cachedResult);
                return;
            }
            
            const [N_x, N_y, N_z] = memoizedNInfiniteRod(1);
            
            // For infinite rods, volume is not defined
            const V_dummy = 1e-24;
            
            const factors = [
                {name: 'x', value: N_x},
                {name: 'y', value: N_y},
                {name: 'z', value: N_z}
            ];
            
            const analysis = this.analyzeAnisotropy(factors, Ms, Ku, V_dummy, T);
            
            const analysisForDisplay = {
                ...analysis,
                easy_axis: { name: 'parallel', value: N_z },
                hard_axis: { name: 'perpendicular', value: N_x },
                N_easy: N_z,
                N_hard: N_x,
                K_shape: 0.25 * PHYSICS_CONSTANTS.MU0 * Ms * Ms,
                delta: 'N/A'
            };
            
            const showAdvanced = window.appState && window.appState.showAdvanced;
            const resultHTML = renderResults([N_x, N_y, N_z], analysisForDisplay, 'infinite-rod', { Ms, Ku, A, showAdvanced });
            
            // Cache and display result
            this.cache.set(cacheKey, resultHTML);
            updateResultElement('infinite-rod-result', resultHTML);
            
        } catch (error) {
            console.error('Infinite rod calculation error:', error);
            updateResultElement('infinite-rod-result', formatError(error, 'Infinite Rod'));
        }
    }

    // Calculate based on current geometry
    calculate() {
        const activePanel = document.querySelector('.geometry-panel.active');
        if (!activePanel) return;
        
        const geometryType = activePanel.id.replace('-panel', '');
        
        switch (geometryType) {
            case 'prism':
                this.calculatePrism();
                break;
            case 'cylinder':
                this.calculateCylinder();
                break;
            case 'sphere':
                this.calculateSphere();
                break;
            case 'thin-film':
                this.calculateThinFilm();
                break;
            case 'infinite-rod':
                this.calculateInfiniteRod();
                break;
        }
    }

    // Cleanup caches
    cleanup() {
        this.cache.cleanup();
    }
}

// Export singleton instance
export const calculator = new MagneticCalculator();

export default MagneticCalculator;