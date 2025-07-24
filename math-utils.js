// Mathematical utilities for demagnetization calculations

/**
 * Elliptic integral approximations (simplified for web use)
 */
function ellipticK(m) {
    // Approximation for complete elliptic integral of first kind
    // Check for valid input range
    if (m < 0 || m >= 1) {
        throw new Error(`Invalid parameter for ellipticK: m=${m} (must be 0 ≤ m < 1)`);
    }
    
    // Handle edge cases
    if (m === 0) return Math.PI / 2;
    if (m > 0.99999) return Math.log(4 / Math.sqrt(1 - m)); // Asymptotic form
    
    const a0 = 1.38629436112;
    const a1 = 0.09666344259;
    const a2 = 0.03590092383;
    const a3 = 0.03742563713;
    const a4 = 0.01451196212;
    
    const b0 = 0.5;
    const b1 = 0.12498593597;
    const b2 = 0.06880248576;
    const b3 = 0.03328355346;
    const b4 = 0.00441787012;
    
    const m1 = 1 - m;
    const lnm1 = Math.log(m1);
    
    const result = (a0 + a1*m1 + a2*m1*m1 + a3*m1*m1*m1 + a4*m1*m1*m1*m1) - 
                   (b0 + b1*m1 + b2*m1*m1 + b3*m1*m1*m1 + b4*m1*m1*m1*m1) * lnm1;
    
    if (!isFinite(result)) {
        throw new Error("ellipticK calculation resulted in non-finite value");
    }
    
    return result;
}

function ellipticE(m) {
    // Approximation for complete elliptic integral of second kind
    // Check for valid input range
    if (m < 0 || m >= 1) {
        throw new Error(`Invalid parameter for ellipticE: m=${m} (must be 0 ≤ m < 1)`);
    }
    
    // Handle edge cases
    if (m === 0) return Math.PI / 2;
    if (m > 0.99999) return 1.0; // Asymptotic form
    
    const a1 = 0.44325141463;
    const a2 = 0.06260601220;
    const a3 = 0.04757383546;
    const a4 = 0.01736506451;
    
    const b1 = 0.24998368310;
    const b2 = 0.09200180037;
    const b3 = 0.04069697526;
    const b4 = 0.00526449639;
    
    const m1 = 1 - m;
    const lnm1 = Math.log(m1);
    
    const result = 1 + (a1*m1 + a2*m1*m1 + a3*m1*m1*m1 + a4*m1*m1*m1*m1) - 
                   (b1*m1 + b2*m1*m1 + b3*m1*m1*m1 + b4*m1*m1*m1*m1) * lnm1;
    
    if (!isFinite(result)) {
        throw new Error("ellipticE calculation resulted in non-finite value");
    }
    
    return result;
}

/**
 * Incomplete elliptic integral of the first kind F(k,θ)
 * F(k,θ) = ∫[0 to θ] dφ / √(1 - k²sin²φ)
 */
function ellipticFInc(k, theta) {
    if (k < 0 || k >= 1) {
        throw new Error(`Invalid parameter for ellipticFInc: k=${k} (must be 0 ≤ k < 1)`);
    }
    
    if (theta === 0) return 0;
    if (Math.abs(theta) >= Math.PI/2) {
        return ellipticK(k * k) * Math.sign(theta);
    }
    
    // Use Carlson's elliptic integral algorithm
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    const k2 = k * k;
    
    // Series expansion for moderate values
    let result = theta;
    const sinTheta2 = sinTheta * sinTheta;
    const k2sin2 = k2 * sinTheta2;
    
    if (k2sin2 < 0.9) {
        // Series expansion: F(k,θ) ≈ θ + (k²/2)sin(θ)cos(θ) + ...
        result += (k2 / 2) * sinTheta * cosTheta;
        result += (k2 * k2 / 8) * sinTheta * cosTheta * (2 + sinTheta2);
        result += (k2 * k2 * k2 / 48) * sinTheta * cosTheta * (8 + 6 * sinTheta2 + sinTheta2 * sinTheta2);
    } else {
        // Use more accurate method for larger k
        const n = 20; // Number of integration steps
        const dt = theta / n;
        result = 0;
        
        for (let i = 0; i < n; i++) {
            const t = (i + 0.5) * dt;
            const sint = Math.sin(t);
            const denom = Math.sqrt(1 - k2 * sint * sint);
            result += dt / denom;
        }
    }
    
    if (!isFinite(result)) {
        throw new Error("ellipticFInc calculation resulted in non-finite value");
    }
    
    return result;
}

/**
 * Incomplete elliptic integral of second kind E(k,θ)
 * E(k,θ) = ∫[0 to θ] √(1 - k²sin²φ) dφ
 */
function ellipticEInc(k, theta) {
    if (k < 0 || k >= 1) {
        throw new Error(`Invalid parameter for ellipticEInc: k=${k} (must be 0 ≤ k < 1)`);
    }
    
    if (theta === 0) return 0;
    if (Math.abs(theta) >= Math.PI/2) {
        return ellipticE(k * k) * Math.sign(theta);
    }
    
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    const k2 = k * k;
    const sinTheta2 = sinTheta * sinTheta;
    
    // Series expansion: E(k,θ) ≈ θ - (k²/2)sin(θ)cos(θ) - ...
    let result = theta;
    result -= (k2 / 2) * sinTheta * cosTheta;
    result -= (k2 * k2 / 8) * sinTheta * cosTheta * sinTheta2;
    result -= (k2 * k2 * k2 / 48) * sinTheta * cosTheta * sinTheta2 * (2 + sinTheta2);
    
    if (!isFinite(result)) {
        throw new Error("ellipticEInc calculation resulted in non-finite value");
    }
    
    return result;
}


/**
 * Calculate demagnetization factor for rectangular prism
 * @param {number} a - Length dimension
 * @param {number} b - Width dimension
 * @param {number} c - Height dimension
 * @returns {number} Demagnetization factor along the specified axis
 */
function N_prism(a, b, c) {
    if (a <= 0 || b <= 0 || c <= 0) {
        throw new Error("All dimensions must be positive");
    }
    
    // Add reasonable bounds checking to prevent numerical instability
    const MIN_DIMENSION = 0.01; // 0.01 nm minimum
    const MAX_DIMENSION = 1000000; // 1 mm maximum
    const MAX_ASPECT_RATIO = 10000000; // Maximum aspect ratio (10 million)
    
    if (a < MIN_DIMENSION || b < MIN_DIMENSION || c < MIN_DIMENSION) {
        throw new Error(`Dimensions must be at least ${MIN_DIMENSION} nm`);
    }
    
    if (a > MAX_DIMENSION || b > MAX_DIMENSION || c > MAX_DIMENSION) {
        throw new Error(`Dimensions must be less than ${MAX_DIMENSION} nm`);
    }
    
    // Check aspect ratios
    const max_dim = Math.max(a, b, c);
    const min_dim = Math.min(a, b, c);
    const aspect_ratio = max_dim / min_dim;
    
    if (aspect_ratio > MAX_ASPECT_RATIO) {
        throw new Error(`Aspect ratio too extreme (>${MAX_ASPECT_RATIO}). Use thin film or infinite rod models instead.`);
    }
    
    // Handle limiting cases analytically to avoid numerical issues
    // Very thin film case (one dimension much smaller than others)
    if (c < 1e-6 * Math.max(a, b)) {
        return 1.0; // Thin film limit: N_z ≈ 1
    }
    if (a < 1e-6 * Math.max(b, c)) {
        return 0.0; // Thin film limit: N_x ≈ 0
    }
    if (b < 1e-6 * Math.max(a, c)) {
        return 0.0; // Thin film limit: N_y ≈ 0
    }
    
    // Very long rod case (one dimension much larger than others)
    if (c > 1e6 * Math.min(a, b)) {
        return 0.0; // Long rod limit: N_z ≈ 0
    }
    if (a > 1e6 * Math.min(b, c)) {
        return 0.5; // Long rod limit: N_x ≈ 0.5
    }
    if (b > 1e6 * Math.min(a, c)) {
        return 0.5; // Long rod limit: N_y ≈ 0.5
    }
    
    // Convert to half semi-axes for calculation
    const a_half = 0.5 * a;
    const b_half = 0.5 * b;
    const c_half = 0.5 * c;
    
    const a2 = a_half * a_half;
    const b2 = b_half * b_half;
    const c2 = c_half * c_half;
    const abc = a_half * b_half * c_half;
    const ab = a_half * b_half;
    const ac = a_half * c_half;
    const bc = b_half * c_half;
    
    // Check for potential division by zero
    if (abc === 0 || ab === 0 || ac === 0 || bc === 0) {
        throw new Error("Invalid dimensions causing division by zero");
    }
    
    const r_abc = Math.sqrt(a2 + b2 + c2);
    const r_ab = Math.sqrt(a2 + b2);
    const r_bc = Math.sqrt(b2 + c2);
    const r_ac = Math.sqrt(a2 + c2);
    
    try {
        // Check for potential log argument issues
        const log_args = [
            (r_abc - a_half) / (r_abc + a_half),
            (r_abc - b_half) / (r_abc + b_half),
            (r_ab + a_half) / (r_ab - a_half),
            (r_ab + b_half) / (r_ab - b_half),
            (r_bc - b_half) / (r_bc + b_half),
            (r_ac - a_half) / (r_ac + a_half)
        ];
        
        for (let arg of log_args) {
            if (arg <= 0 || !isFinite(arg)) {
                throw new Error("Invalid logarithm argument in prism calculation");
            }
        }
        
        const pi_N = ((b2 - c2) / (2 * bc)) * Math.log((r_abc - a_half) / (r_abc + a_half)) +
                    ((a2 - c2) / (2 * ac)) * Math.log((r_abc - b_half) / (r_abc + b_half)) +
                    (b_half / (2 * c_half)) * Math.log((r_ab + a_half) / (r_ab - a_half)) +
                    (a_half / (2 * c_half)) * Math.log((r_ab + b_half) / (r_ab - b_half)) +
                    (c_half / (2 * a_half)) * Math.log((r_bc - b_half) / (r_bc + b_half)) +
                    (c_half / (2 * b_half)) * Math.log((r_ac - a_half) / (r_ac + a_half)) +
                    2 * Math.atan2(ab, c_half * r_abc) +
                    (a2 * a_half + b2 * b_half - 2 * c2 * c_half) / (3 * abc) +
                    ((a2 + b2 - 2 * c2) / (3 * abc)) * r_abc +
                    (c_half / ab) * (r_ac + r_bc) -
                    (r_ab * r_ab * r_ab + r_bc * r_bc * r_bc + r_ac * r_ac * r_ac) / (3 * abc);
        
        const result = pi_N / Math.PI;
        
        // Ensure result is physically meaningful (0 ≤ N ≤ 1)
        if (!isFinite(result) || result < 0 || result > 1) {
            throw new Error("Unphysical demagnetization factor calculated for prism");
        }
        
        return result;
        
    } catch (error) {
        throw new Error(`Prism calculation failed: ${error.message}`);
    }
}

/**
 * Calculate demagnetization factor for circular cylinder
 * @param {number} thickness - Cylinder thickness
 * @param {number} diameter - Cylinder diameter
 * @returns {number} Demagnetization factor along the thickness axis
 */
function N_cylinder(thickness, diameter) {
    if (thickness <= 0 || diameter <= 0) {
        throw new Error("Thickness and diameter must be positive");
    }
    
    // Add reasonable bounds checking to prevent numerical instability
    const MIN_DIMENSION = 0.01; // 0.01 nm minimum
    const MAX_DIMENSION = 1000000; // 1 mm maximum
    const MAX_ASPECT_RATIO = 10000000; // Maximum aspect ratio (10 million)
    
    if (thickness < MIN_DIMENSION || diameter < MIN_DIMENSION) {
        throw new Error(`Dimensions must be at least ${MIN_DIMENSION} nm`);
    }
    
    if (thickness > MAX_DIMENSION || diameter > MAX_DIMENSION) {
        throw new Error(`Dimensions must be less than ${MAX_DIMENSION} nm`);
    }
    
    const p = thickness / diameter;
    const aspect_ratio = Math.max(p, 1/p);
    
    if (aspect_ratio > MAX_ASPECT_RATIO) {
        throw new Error(`Aspect ratio too extreme (>${MAX_ASPECT_RATIO}). Use thin film or infinite rod models instead.`);
    }
    
    // Handle limiting cases analytically to avoid numerical issues
    if (p < 1e-6) {
        // Very thin disk: N_z ≈ 1 - (2t/πd) for t << d
        return 1.0 - (2.0 * p / Math.PI);
    }
    
    if (p > 1e6) {
        // Very long rod: N_z ≈ 0
        return 0.0;
    }
    
    // Normal calculation for reasonable aspect ratios
    const k2 = 1.0 / (1.0 + 0.25 * p * p);
    
    // Check if k2 is in valid range for elliptic integrals
    if (k2 <= 0 || k2 >= 1) {
        throw new Error("Invalid parameter for elliptic integrals");
    }
    
    const k = Math.sqrt(k2);
    
    try {
        const K = ellipticK(k2);
        const E = ellipticE(k2);
        
        // Check for NaN or infinite results
        if (!isFinite(K) || !isFinite(E)) {
            throw new Error("Elliptic integral calculation failed");
        }
        
        const result = 1.0 - (2.0 / Math.PI) * (p / k) * (K - E);
        
        // Ensure result is physically meaningful (0 ≤ N_z ≤ 1)
        if (!isFinite(result) || result < 0 || result > 1) {
            throw new Error("Unphysical demagnetization factor calculated");
        }
        
        return result;
        
    } catch (error) {
        throw new Error(`Cylinder calculation failed: ${error.message}`);
    }
}

/**
 * Calculate demagnetization factors for sphere
 * @param {number} diameter - Sphere diameter
 * @returns {Array<number>} [N_x, N_y, N_z] demagnetization factors (all equal to 1/3)
 */
function N_sphere(diameter) {
    if (diameter <= 0) {
        throw new Error("Diameter must be positive");
    }
    
    // For a perfect sphere, all demagnetization factors are equal to 1/3
    const N = 1.0 / 3.0;
    return [N, N, N];
}

/**
 * Calculate demagnetization factors for thin film
 * @param {number} thickness - Film thickness
 * @returns {Array<number>} [N_x, N_y, N_z] demagnetization factors for infinite thin film
 */
function N_thin_film(thickness) {
    if (thickness <= 0) {
        throw new Error("Thickness must be positive");
    }
    
    // For an infinite thin film (thickness << lateral dimensions)
    // All demagnetization is out-of-plane
    const N_z = 1.0;  // Out-of-plane (through thickness)
    const N_x = 0.0;  // In-plane
    const N_y = 0.0;  // In-plane
    
    return [N_x, N_y, N_z];
}

/**
 * Calculate demagnetization factors for infinite rod
 * @param {number} diameter - Rod diameter (cross-sectional dimension)
 * @returns {Array<number>} [N_x, N_y, N_z] demagnetization factors for infinite rod
 */
function N_infinite_rod(diameter) {
    if (diameter <= 0) {
        throw new Error("Diameter must be positive");
    }
    
    // For an infinite rod (length >> diameter)
    // No demagnetization along the rod axis, equal demagnetization perpendicular to it
    const N_z = 0.0;  // Along rod axis (infinite length direction)
    const N_x = 0.5;  // Perpendicular to rod axis  
    const N_y = 0.5;  // Perpendicular to rod axis
    
    return [N_x, N_y, N_z];
}

/**
 * Calculate all three demagnetization factors for a rectangular prism
 * @param {number} a - Length dimension
 * @param {number} b - Width dimension  
 * @param {number} c - Height dimension
 * @returns {Array<number>} [N_x, N_y, N_z] demagnetization factors
 */
function demag_factors(a, b, c) {
    const N_z = N_prism(a, b, c);          // axis along c
    const N_x = N_prism(b, c, a);          // rotate: (a,b,c) -> (b,c,a)
    const N_y = 1.0 - N_x - N_z;           // ensure exact sum = 1.0
    return [N_x, N_y, N_z];
}

// Memoization for expensive mathematical operations
const mathCache = new Map();

// Helper function to manage cache size
function addToCache(key, value, cache = mathCache, maxSize = 100) {
    cache.set(key, value);
    
    // Limit cache size
    if (cache.size > maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
}

/**
 * Memoized version of demagnetization factor calculation for prism
 */
function memoizedDemagFactors(a, b, c) {
    const key = `${a}-${b}-${c}`;
    if (mathCache.has(key)) {
        return mathCache.get(key);
    }
    
    const result = demag_factors(a, b, c);
    addToCache(key, result);
    return result;
}


/**
 * Memoized version of cylinder calculation
 */
function memoizedNCylinder(thickness, diameter) {
    const key = `${thickness}-${diameter}`;
    const cacheKey = `cylinder-${key}`;
    
    if (mathCache.has(cacheKey)) {
        return mathCache.get(cacheKey);
    }
    
    const result = N_cylinder(thickness, diameter);
    addToCache(cacheKey, result);
    return result;
}

/**
 * Memoized version of sphere calculation
 */
function memoizedNSphere(diameter) {
    const key = `sphere-${diameter}`;
    
    if (mathCache.has(key)) {
        return mathCache.get(key);
    }
    
    const result = N_sphere(diameter);
    addToCache(key, result);
    return result;
}

/**
 * Memoized version of thin film calculation
 */
function memoizedNThinFilm(thickness) {
    const key = `thin-film-${thickness}`;
    
    if (mathCache.has(key)) {
        return mathCache.get(key);
    }
    
    const result = N_thin_film(thickness);
    addToCache(key, result);
    return result;
}

/**
 * Memoized version of infinite rod calculation
 */
function memoizedNInfiniteRod(diameter) {
    const key = `infinite-rod-${diameter}`;
    
    if (mathCache.has(key)) {
        return mathCache.get(key);
    }
    
    const result = N_infinite_rod(diameter);
    addToCache(key, result);
    return result;
}


// ES6 module exports
export {
    memoizedDemagFactors,
    memoizedNCylinder,
    memoizedNSphere,
    memoizedNThinFilm,
    memoizedNInfiniteRod,
    mathCache
};
