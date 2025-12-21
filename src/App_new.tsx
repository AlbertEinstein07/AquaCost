import React, { useState, useEffect } from 'react';
import './App.css';
import GettingStarted from './GettingStarted';

const API_BASE_URL = 'http://localhost:8000';

interface CalculatorResult {
  cost_range_min: number;
  cost_range_max: number;
  annual_water_collection: number;
  tank_size: number;
  breakdown: {
    tank_cost: number;
    piping_cost: number;
    filter_cost: number;
    pump_cost: number;
    labor_cost: number;
    misc_cost: number;
    hvac_unit_cost?: number;
    total: number;
  };
}

function App() {
  const [currentPage, setCurrentPage] = useState<'calculator' | 'getting-started'>('calculator');
  const [activeTab, setActiveTab] = useState<'rainwater' | 'hvac'>('rainwater');
  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  // Rainwater form state
  const [rainwaterForm, setRainwaterForm] = useState({
    roof_area_sqft: '',
    annual_rainfall_inches: '',
    piping_length_feet: '',
    potable: false,
    storage_gallons: ''
  });

  // HVAC form state
  const [hvacForm, setHvacForm] = useState({
    num_units: '',
    tons_per_unit: '',
    days_per_year: '',
    piping_length_feet: '',
    potable: false,
    storage_gallons: ''
  });

  useEffect(() => {
    checkApiHealth();
  }, []);

  // Auto-scroll to results when calculation completes
  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100); // Small delay to ensure the component has rendered
    }
  }, [result]);

  const checkApiHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (response.ok) {
        const data = await response.json();
        setApiStatus(data.message);
      } else {
        setApiStatus('API Error');
      }
    } catch (error) {
      setApiStatus('API Offline');
    }
  };

  const handleRainwaterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const requestData = {
        roof_area_sqft: parseFloat(rainwaterForm.roof_area_sqft),
        annual_rainfall_inches: parseFloat(rainwaterForm.annual_rainfall_inches),
        piping_length_feet: parseFloat(rainwaterForm.piping_length_feet),
        potable: rainwaterForm.potable,
        storage_gallons: rainwaterForm.storage_gallons ? parseFloat(rainwaterForm.storage_gallons) : null
      };

      const response = await fetch(`${API_BASE_URL}/api/calculate/rainwater`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        console.error('Calculation failed');
      }
    } catch (error) {
      console.error('Error calculating:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHvacSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const requestData = {
        num_units: parseInt(hvacForm.num_units),
        tons_per_unit: parseFloat(hvacForm.tons_per_unit),
        days_per_year: parseInt(hvacForm.days_per_year),
        piping_length_feet: parseFloat(hvacForm.piping_length_feet),
        potable: hvacForm.potable,
        storage_gallons: hvacForm.storage_gallons ? parseFloat(hvacForm.storage_gallons) : null
      };

      const response = await fetch(`${API_BASE_URL}/api/calculate/hvac`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        console.error('Calculation failed');
      }
    } catch (error) {
      console.error('Error calculating:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>💧 AquaCost Calculator</h1>
          <p className="subtitle">Advanced water harvesting system cost estimator</p>
          
          <nav className="main-navigation">
            <button 
              className={`nav-button ${currentPage === 'calculator' ? 'active' : ''}`}
              onClick={() => setCurrentPage('calculator')}
            >
              🧮 Calculator
            </button>
            <button 
              className={`nav-button ${currentPage === 'getting-started' ? 'active' : ''}`}
              onClick={() => setCurrentPage('getting-started')}
            >
              📚 Getting Started
            </button>
          </nav>
          
          <div className="api-status">
            <span className="status-label">System Status:</span>
            <span className={apiStatus === 'API is running' ? 'status-ok' : 'status-error'}>
              {apiStatus}
            </span>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-number">15+</span>
              <span className="stat-label">Cost Variables</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">±15%</span>
              <span className="stat-label">Accuracy</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">2</span>
              <span className="stat-label">System Types</span>
            </div>
          </div>
        </div>
      </header>
      
      <main className="App-main">
        {currentPage === 'getting-started' ? (
          <GettingStarted />
        ) : (
          <div className="calculator-container">
            <div className="tab-navigation">
              <button 
                className={`tab-button ${activeTab === 'rainwater' ? 'active' : ''}`}
                onClick={() => { setActiveTab('rainwater'); setResult(null); }}
              >
                <span className="tab-icon">🌧️</span>
                Rainwater Harvesting
              </button>
              <button 
                className={`tab-button ${activeTab === 'hvac' ? 'active' : ''}`}
                onClick={() => { setActiveTab('hvac'); setResult(null); }}
              >
                <span className="tab-icon">❄️</span>
                HVAC Condensate
              </button>
            </div>

            <div className="calculator-content">
              <div className="calculator-form">
                {activeTab === 'rainwater' ? (
                  <div className="form-section">
                    <h2 className="form-title">Rainwater Harvesting System</h2>
                    <p className="form-description">
                      Calculate costs for collecting and storing rainwater from your roof surface.
                    </p>
                    
                    <form onSubmit={handleRainwaterSubmit}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label htmlFor="roof_area">Roof Area (sq ft)</label>
                          <input
                            type="number"
                            id="roof_area"
                            value={rainwaterForm.roof_area_sqft}
                            onChange={(e) => setRainwaterForm({...rainwaterForm, roof_area_sqft: e.target.value})}
                            placeholder="e.g., 2000"
                            required
                            min="0"
                            step="0.1"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="rainfall">Annual Rainfall (inches)</label>
                          <input
                            type="number"
                            id="rainfall"
                            value={rainwaterForm.annual_rainfall_inches}
                            onChange={(e) => setRainwaterForm({...rainwaterForm, annual_rainfall_inches: e.target.value})}
                            placeholder="e.g., 32"
                            required
                            min="0"
                            step="0.1"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="piping">Piping Length (feet)</label>
                          <input
                            type="number"
                            id="piping"
                            value={rainwaterForm.piping_length_feet}
                            onChange={(e) => setRainwaterForm({...rainwaterForm, piping_length_feet: e.target.value})}
                            placeholder="e.g., 100"
                            required
                            min="0"
                            step="0.1"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="storage">Storage Tank Size (gallons)</label>
                          <input
                            type="number"
                            id="storage"
                            value={rainwaterForm.storage_gallons}
                            onChange={(e) => setRainwaterForm({...rainwaterForm, storage_gallons: e.target.value})}
                            placeholder="Auto-calculated if empty"
                            min="0"
                            step="0.1"
                          />
                        </div>
                      </div>
                      
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={rainwaterForm.potable}
                            onChange={(e) => setRainwaterForm({...rainwaterForm, potable: e.target.checked})}
                          />
                          <span className="checkmark"></span>
                          Potable water system (includes UV filtration)
                        </label>
                      </div>
                      
                      <button type="submit" className="btn-calculate" disabled={loading}>
                        {loading ? 'Calculating...' : '💧 Calculate Rainwater System'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="form-section">
                    <h2 className="form-title">HVAC Condensate Recovery</h2>
                    <p className="form-description">
                      Calculate costs for capturing and reusing water from HVAC condensate.
                    </p>
                    
                    <form onSubmit={handleHvacSubmit}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label htmlFor="num_units">Number of HVAC Units</label>
                          <input
                            type="number"
                            id="num_units"
                            value={hvacForm.num_units}
                            onChange={(e) => setHvacForm({...hvacForm, num_units: e.target.value})}
                            placeholder="e.g., 2"
                            required
                            min="1"
                            step="1"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="tons_per_unit">Tons per Unit</label>
                          <input
                            type="number"
                            id="tons_per_unit"
                            value={hvacForm.tons_per_unit}
                            onChange={(e) => setHvacForm({...hvacForm, tons_per_unit: e.target.value})}
                            placeholder="e.g., 3"
                            required
                            min="0.1"
                            step="0.1"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="days_per_year">Operating Days/Year</label>
                          <input
                            type="number"
                            id="days_per_year"
                            value={hvacForm.days_per_year}
                            onChange={(e) => setHvacForm({...hvacForm, days_per_year: e.target.value})}
                            placeholder="e.g., 200"
                            required
                            min="1"
                            max="365"
                            step="1"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="hvac_piping">Piping Length (feet)</label>
                          <input
                            type="number"
                            id="hvac_piping"
                            value={hvacForm.piping_length_feet}
                            onChange={(e) => setHvacForm({...hvacForm, piping_length_feet: e.target.value})}
                            placeholder="e.g., 80"
                            required
                            min="0"
                            step="0.1"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="hvac_storage">Storage Tank Size (gallons)</label>
                          <input
                            type="number"
                            id="hvac_storage"
                            value={hvacForm.storage_gallons}
                            onChange={(e) => setHvacForm({...hvacForm, storage_gallons: e.target.value})}
                            placeholder="Auto-calculated if empty"
                            min="0"
                            step="0.1"
                          />
                        </div>
                      </div>
                      
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={hvacForm.potable}
                            onChange={(e) => setHvacForm({...hvacForm, potable: e.target.checked})}
                          />
                          <span className="checkmark"></span>
                          Potable water system (includes UV filtration)
                        </label>
                      </div>
                      
                      <button type="submit" className="btn-calculate" disabled={loading}>
                        {loading ? 'Calculating...' : '❄️ Calculate HVAC System'}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {result && (
                <div className="results-section" ref={resultsRef}>
                  <h3 className="results-title">💰 Cost Estimate</h3>
                  
                  <div className="cost-range">
                    <div className="cost-primary">
                      {formatCurrency(result.cost_range_min)} - {formatCurrency(result.cost_range_max)}
                    </div>
                    <div className="cost-note">
                      Estimated total system cost (±15% variation)
                    </div>
                  </div>
                  
                  <div className="results-grid">
                    <div className="result-card">
                      <div className="result-value">{result.annual_water_collection.toLocaleString()}</div>
                      <div className="result-label">Gallons/Year</div>
                    </div>
                    
                    <div className="result-card">
                      <div className="result-value">{result.tank_size.toLocaleString()}</div>
                      <div className="result-label">Tank Size (gal)</div>
                    </div>
                  </div>
                  
                  <div className="breakdown-section">
                    <h4 className="breakdown-title">Cost Breakdown</h4>
                    <div className="breakdown-grid">
                      <div className="breakdown-item">
                        <span>Tank & Installation</span>
                        <span>{formatCurrency(result.breakdown.tank_cost)}</span>
                      </div>
                      <div className="breakdown-item">
                        <span>Piping & Installation</span>
                        <span>{formatCurrency(result.breakdown.piping_cost)}</span>
                      </div>
                      <div className="breakdown-item">
                        <span>Filtration System</span>
                        <span>{formatCurrency(result.breakdown.filter_cost)}</span>
                      </div>
                      <div className="breakdown-item">
                        <span>Pump System</span>
                        <span>{formatCurrency(result.breakdown.pump_cost)}</span>
                      </div>
                      {result.breakdown.hvac_unit_cost && (
                        <div className="breakdown-item">
                          <span>HVAC Connections</span>
                          <span>{formatCurrency(result.breakdown.hvac_unit_cost)}</span>
                        </div>
                      )}
                      <div className="breakdown-item">
                        <span>Labor</span>
                        <span>{formatCurrency(result.breakdown.labor_cost)}</span>
                      </div>
                      <div className="breakdown-item">
                        <span className="breakdown-label-with-tooltip">
                          Miscellaneous
                          <span className="tooltip">
                            <span className="tooltip-icon">ⓘ</span>
                            <span className="tooltip-text">
                              {activeTab === 'rainwater' 
                                ? "Includes basic PVC fittings, first-flush diverter, mounting hardware, and minor electrical for pump/filter connections."
                                : "Includes fittings for HVAC drain taps, mounting brackets, condensate tubing adapters, and basic electrical for pump hookup."}
                            </span>
                          </span>
                        </span>
                        <span>{formatCurrency(result.breakdown.misc_cost)}</span>
                      </div>
                      <div className="breakdown-item breakdown-total">
                        <span><strong>Total</strong></span>
                        <span><strong>{formatCurrency(result.breakdown.total)}</strong></span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Dedicated Cost Display Section */}
                  <div className="final-cost-display">
                    <div className="cost-label">
                      {activeTab === 'rainwater' ? 'rainwater_cost' : 'hvac_cost'}
                    </div>
                    <div className="cost-value">
                      {formatCurrency(result.breakdown.total)}
                    </div>
                    <div className="cost-range-display">
                      Range: {formatCurrency(result.cost_range_min)} - {formatCurrency(result.cost_range_max)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
