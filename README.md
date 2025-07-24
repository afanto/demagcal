# Demagcal - Demagnetization Factor Calculator

🔗 **[Try the Live App](http://pnmdtools.phys.sfu.ca/demagcal/)**

Web-based tool for calculating demagnetization factors and magnetic properties of nanostructures.

## Features

- **Multiple Geometries**: Calculate demagnetization factors for:
  - Rectangular Prisms
  - Circular Cylinders
  - Spheres
  - Thin Films
  - Infinite Rods

- **Comprehensive Analysis**:
  - Demagnetization factors (Nx, Ny, Nz)
  - Shape anisotropy
  - Effective anisotropy
  - Coercive field
  - Thermal stability
  - Exchange length
  - Anisotropy classification

- **Advanced Features**:
  - Real-time calculations
  - Input validation
  - Keyboard shortcuts
  - Scientific formula rendering with MathJax

## Usage

### Option 1: Using Python (simplest)
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

### Option 2: Using Node.js
```bash
npx serve
```
Then open the URL shown in the terminal (usually `http://localhost:3000`).

### Option 3: Using any static file server
This is a static web application, so you can use any HTTP server to serve the files.

### Using the Calculator
1. Select your geometry type
2. Enter dimensions and magnetic properties
3. Results calculate automatically

### Keyboard Shortcuts

- `1-5`: Switch between geometry types
- `Ctrl/Cmd + Enter`: Recalculate
- `Esc`: Clear input focus

## Technical Details

### Calculations

- **Rectangular Prism**: Exact solution from Aharoni (1998)  
  *J. Appl. Phys. 83, 3432–3434*

- **Circular Cylinder**: Exact solution from Joseph (1966)  
  *J. Appl. Phys. 37, 4639–4643*

- **Sphere, Thin Film, and Infinite Rod**: Exact analytical solutions

### Input Parameters

- **Saturation Magnetization (Ms)**: in kA/m
- **Uniaxial Anisotropy (Ku)**: in MJ/m³
- **Exchange Stiffness (Aex)**: in pJ/m
- **Temperature**: in Kelvin

## Development

Built with vanilla JavaScript, CSS3, and HTML5. No framework dependencies.

### File Structure

```
Demagcal/
├── index.html          # Main application
├── styles.css          # Styling with design tokens
├── app.js             # Application logic
├── calculator-engine.js # Core calculations
├── input-handler.js    # Input validation
├── ui-components.js    # UI rendering
├── demag-factors.js    # Demagnetization formulas
├── utils.js           # Utility functions
└── config.js          # Configuration constants
```

## Author

Created by Afan • July 2025

Questions, feedback, or suggestions? Email: ata159@sfu.ca

## License

This project is licensed under the MIT License.
