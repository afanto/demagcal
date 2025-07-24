// Central configuration module for the magnetic calculator

// Physics constants
export const PHYSICS_CONSTANTS = {
    MU0: 4 * Math.PI * 1e-7, // Permeability of free space (H/m)
    KB: 1.380649e-23, // Boltzmann constant (J/K)
    TESLA_TO_GAUSS: 10000,
    AMPERE_TO_OERSTED: 79.5774715459
};

// Calculation constraints
export const CALCULATION_CONSTRAINTS = {
    MIN_DIMENSION: 0.01, // 0.01 nm minimum
    MAX_DIMENSION: 1000000, // 1 mm maximum
    MAX_ASPECT_RATIO: 10000000, // Maximum aspect ratio (10 million)
    CACHE_EXPIRY: 30000, // 30 seconds
    MAX_CACHE_SIZE: 100,
    DEBOUNCE_DELAY: 50 // ms
};

// UI configuration
export const UI_CONFIG = {
    MATERIAL_INFO_DISPLAY_TIME: 3000, // ms
    PERFORMANCE_LOG_INTERVAL: 10, // Log every N calculations
    MAX_INPUT_DIGITS: 10,
    DEFAULT_VALUES: {
        Ms: 1000, // kA/m
        Ku: 0.8, // MJ/m³
        A: 15, // pJ/m
        T: 300, // K
        thermalStability: 60,
        prism: { a: 20, b: 20, c: 2 },
        cylinder: { thickness: 2, diameter: 30 },
        sphere: { diameter: 20 }
    }
};

// Field restrictions for positive values only
export const POSITIVE_ONLY_FIELDS = [
    'ms-value', 'exchange-value', 'temperature-value', 'thermal-stability',
    'cylinder-thickness', 'cylinder-diameter', 
    'prism-a', 'prism-b', 'prism-c',
    'sphere-diameter', 'thin-film-thickness'
];

// Export all configurations
export default {
    PHYSICS_CONSTANTS,
    CALCULATION_CONSTRAINTS,
    UI_CONFIG,
    POSITIVE_ONLY_FIELDS
};