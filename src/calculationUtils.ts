// Water Harvesting System Cost Calculator Utilities
// Ported from FastAPI backend to eliminate server dependency

export interface RainwaterCalculatorRequest {
  roof_area_sqft: number;
  annual_rainfall_inches: number;
  piping_length_feet: number;
  potable?: boolean;
  storage_gallons?: number;
  // Advanced Material selections
  roof_type?: string;
  gutter_material?: string;
  piping_material?: string;
  tank_material?: string;
  pump_size?: string;
  include_excavation?: boolean;
  include_pressure_tank?: boolean;
}

export interface HVACCalculatorRequest {
  num_units: number;
  tons_per_unit: number;
  days_per_year: number;
  piping_length_feet: number;
  potable?: boolean;
  storage_gallons?: number;
  // Advanced Material selections
  piping_material?: string;
  tank_type?: string;
  pump_type?: string;
}

export interface CalculatorResponse {
  cost_range_min: number;
  cost_range_max: number;
  annual_water_collection: number;
  tank_size: number;
  breakdown: {
    gutter_cost?: number;  // Rainwater only
    tank_cost: number;
    piping_cost: number;
    filter_cost: number;
    pump_cost: number;
    pressure_tank_cost?: number;  // Rainwater only
    misc_cost: number;
    excavation_cost?: number;  // Rainwater only
    hvac_unit_cost?: number;  // HVAC only
    total: number;
  };
}

// === CALCULATION CONSTANTS ===

// Roof types and their runoff efficiency factors
const ROOF_EFFICIENCY: Record<string, number> = {
  "asphalt_shingles": 0.85,  // Most common, good efficiency
  "metal": 0.90,            // Excellent runoff, highest efficiency
  "tile": 0.80              // Good but some absorption
};

// 🌧️ RAINWATER COLLECTION SYSTEM COSTS

// Gutters & Downspouts (per foot)
const GUTTER_COSTS: Record<string, any> = {
  "vinyl": { material_min: 3.0, material_max: 5.0, labor_min: 4.0, labor_max: 8.0 },
  "aluminum": { material_min: 5.0, material_max: 9.0, labor_min: 4.0, labor_max: 8.0 },
  "galvanized_steel": { material_min: 8.0, material_max: 12.0, labor_min: 4.0, labor_max: 8.0 }
};

// Piping & Fittings (per foot)
const PIPING_COSTS: Record<string, any> = {
  "pvc": { material_min: 1.50, material_max: 3.0, labor_min: 3.0, labor_max: 6.0, fittings: 1.75 },
  "hdpe": { material_min: 2.0, material_max: 4.0, labor_min: 3.0, labor_max: 6.0, fittings: 1.75 },
  "copper": { material_min: 6.0, material_max: 10.0, labor_min: 3.0, labor_max: 6.0, fittings: 1.75 }
};

// Storage Tank (per gallon)
const TANK_COSTS: Record<string, any> = {
  "polyethylene_above_ground": { min: 0.60, max: 1.00 },
  "fiberglass": { min: 1.50, max: 2.50 },
  "concrete_underground": { min: 2.50, max: 5.00 }
};

// Filtration & Treatment
const FILTRATION: Record<string, any> = {
  "sediment_housing": { min: 50, max: 150 },
  "sediment_cartridge": { min: 20, max: 50 },
  "carbon_filter": { min: 150, max: 300 },
  "uv_disinfection": { min: 800, max: 1200 },
  "first_flush_diverter": { min: 30, max: 100 }
};

// Pump & Pressure Tank
const PUMP_SYSTEMS: Record<string, any> = {
  "small_booster": { pump_min: 300, pump_max: 600, install_min: 500, install_max: 1000 },
  "mid_sized_whole_house": { pump_min: 800, pump_max: 1500, install_min: 500, install_max: 1000 }
};

const PRESSURE_TANK_COSTS = { min: 200, max: 500 };

// Miscellaneous Rainwater Costs
const RAINWATER_MISC: Record<string, any> = {
  "valves_unions_brackets_electrical": { min: 300, max: 600 },
  "permitting_inspection": { min: 100, max: 400 },
  "excavation_underground": { min: 1000, max: 5000 }
};

// ❄️ HVAC CONDENSATE COLLECTION SYSTEM COSTS

// Condensate Drain Piping (per foot)
const HVAC_PIPING_COSTS: Record<string, any> = {
  "pvc_tubing": { material_min: 0.50, material_max: 1.50, labor_min: 2.0, labor_max: 4.0, fittings: 1.25 },
  "flexible_condensate": { material_min: 0.70, material_max: 2.0, labor_min: 2.0, labor_max: 4.0, fittings: 1.25 },
  "copper_rare": { material_min: 5.0, material_max: 8.0, labor_min: 2.0, labor_max: 4.0, fittings: 1.25 }
};

// Storage Tank
const HVAC_TANK_COSTS: Record<string, any> = {
  "small_poly_100_500": { min: 150, max: 700 },
  "large_poly_1000_plus": { per_gallon_min: 0.70, per_gallon_max: 1.00 },
  "indoor_sump": { min: 200, max: 500 }
};

// HVAC Filtration & Treatment
const HVAC_FILTRATION: Record<string, any> = {
  "sediment_filter": { min: 50, max: 150 },
  "carbon_filter_optional": { min: 150, max: 300 },
  "uv_if_potable": { min: 700, max: 1200 }
};

// Pump System
const HVAC_PUMP_SYSTEMS: Record<string, any> = {
  "small_condensate": { pump_min: 80, pump_max: 200, install_min: 300, install_max: 700 },
  "sump_transfer": { pump_min: 200, pump_max: 500, install_min: 300, install_max: 700 }
};

// HVAC Miscellaneous
const HVAC_MISC: Record<string, any> = {
  "mounting_brackets_electrical": { min: 150, max: 300 },
  "valves_unions_overflow": { min: 100, max: 300 },
  "permitting_plumbing_tie_in": { min: 50, max: 200 }
};

// HVAC condensate production estimates (gallons/day per ton of cooling)
const CONDENSATE_PER_TON_PER_DAY = 3; // average US humidity

// === CALCULATION FUNCTIONS ===

export function estimateRainwaterCollectionCost(
  roof_area_sqft: number,
  annual_rainfall_inches: number,
  piping_length_feet: number,
  potable: boolean = false,
  storage_gallons?: number,
  roof_type: string = "asphalt_shingles",
  gutter_material: string = "aluminum",
  piping_material: string = "pvc",
  tank_material: string = "polyethylene_above_ground",
  pump_size: string = "mid_sized_whole_house",
  include_excavation: boolean = false,
  include_pressure_tank: boolean = true
): CalculatorResponse {
  // 1. Calculate water collection with roof-specific efficiency
  const roof_efficiency = ROOF_EFFICIENCY[roof_type] || 0.85;
  const rainfall_gallons = roof_area_sqft * annual_rainfall_inches * 0.623 * roof_efficiency;
  const tank_size = storage_gallons || Math.min(5000, Math.max(1000, rainfall_gallons));
  
  // 2. Gutters & Downspouts cost calculation
  const gutter_length = Math.pow(roof_area_sqft, 0.5) * 4; // Rough perimeter estimate
  const gutter_specs = GUTTER_COSTS[gutter_material] || GUTTER_COSTS["aluminum"];
  const gutter_cost_min = gutter_length * (gutter_specs.material_min + gutter_specs.labor_min);
  const gutter_cost_max = gutter_length * (gutter_specs.material_max + gutter_specs.labor_max);
  const gutter_cost_avg = (gutter_cost_min + gutter_cost_max) / 2;
  
  // 3. Piping & Fittings cost calculation
  const piping_specs = PIPING_COSTS[piping_material] || PIPING_COSTS["pvc"];
  const piping_cost_min = piping_length_feet * (piping_specs.material_min + piping_specs.labor_min + piping_specs.fittings);
  const piping_cost_max = piping_length_feet * (piping_specs.material_max + piping_specs.labor_max + piping_specs.fittings);
  const piping_cost_avg = (piping_cost_min + piping_cost_max) / 2;
  
  // 4. Storage Tank cost calculation
  const tank_specs = TANK_COSTS[tank_material] || TANK_COSTS["polyethylene_above_ground"];
  const tank_cost_min = tank_size * tank_specs.min;
  const tank_cost_max = tank_size * tank_specs.max;
  const tank_cost_avg = (tank_cost_min + tank_cost_max) / 2;
  
  // 5. Filtration & Treatment cost calculation
  let filter_cost_min = (
    FILTRATION["sediment_housing"].min + 
    FILTRATION["sediment_cartridge"].min + 
    FILTRATION["first_flush_diverter"].min
  );
  let filter_cost_max = (
    FILTRATION["sediment_housing"].max + 
    FILTRATION["sediment_cartridge"].max + 
    FILTRATION["first_flush_diverter"].max
  );
  
  // Add potable water treatment if requested
  if (potable) {
    filter_cost_min += FILTRATION["uv_disinfection"].min + FILTRATION["carbon_filter"].min;
    filter_cost_max += FILTRATION["uv_disinfection"].max + FILTRATION["carbon_filter"].max;
  }
  
  const filter_cost_avg = (filter_cost_min + filter_cost_max) / 2;
  
  // 6. Pump & Pressure Tank cost calculation
  const pump_specs = PUMP_SYSTEMS[pump_size] || PUMP_SYSTEMS["mid_sized_whole_house"];
  let pump_cost_min = pump_specs.pump_min + pump_specs.install_min;
  let pump_cost_max = pump_specs.pump_max + pump_specs.install_max;
  
  // Add pressure tank if included
  if (include_pressure_tank) {
    pump_cost_min += PRESSURE_TANK_COSTS.min;
    pump_cost_max += PRESSURE_TANK_COSTS.max;
  }
  
  const pump_cost_avg = (pump_cost_min + pump_cost_max) / 2;
  
  // 7. Miscellaneous costs
  const misc_base_min = RAINWATER_MISC["valves_unions_brackets_electrical"].min + RAINWATER_MISC["permitting_inspection"].min;
  const misc_base_max = RAINWATER_MISC["valves_unions_brackets_electrical"].max + RAINWATER_MISC["permitting_inspection"].max;
  
  // Add excavation cost if underground tank
  const excavation_cost_min = include_excavation ? RAINWATER_MISC["excavation_underground"].min : 0;
  const excavation_cost_max = include_excavation ? RAINWATER_MISC["excavation_underground"].max : 0;
  
  const misc_cost_min = misc_base_min + excavation_cost_min;
  const misc_cost_max = misc_base_max + excavation_cost_max;
  const misc_cost_avg = (misc_cost_min + misc_cost_max) / 2;
  
  // Total system cost calculation
  const total_min = gutter_cost_min + piping_cost_min + tank_cost_min + filter_cost_min + pump_cost_min + misc_cost_min;
  const total_max = gutter_cost_max + piping_cost_max + tank_cost_max + filter_cost_max + pump_cost_max + misc_cost_max;
  const total_avg = (total_min + total_max) / 2;
  
  // Detailed breakdown using average costs
  const breakdown = {
    gutter_cost: Math.round(gutter_cost_avg),
    tank_cost: Math.round(tank_cost_avg),
    piping_cost: Math.round(piping_cost_avg),
    filter_cost: Math.round(filter_cost_avg),
    pump_cost: Math.round(pump_cost_avg),
    pressure_tank_cost: include_pressure_tank ? Math.round((PRESSURE_TANK_COSTS.min + PRESSURE_TANK_COSTS.max) / 2) : 0,
    misc_cost: Math.round(misc_cost_avg - (excavation_cost_min + excavation_cost_max) / 2),
    excavation_cost: Math.round((excavation_cost_min + excavation_cost_max) / 2),
    total: Math.round(total_avg)
  };
  
  return {
    cost_range_min: Math.round(total_min),
    cost_range_max: Math.round(total_max),
    annual_water_collection: Math.round(rainfall_gallons * 10) / 10,
    tank_size: Math.round(tank_size * 10) / 10,
    breakdown
  };
}

export function estimateHVACCondensateSystemCost(
  num_units: number,
  tons_per_unit: number,
  days_per_year: number,
  piping_length_feet: number,
  potable: boolean = false,
  storage_gallons?: number,
  piping_material: string = "pvc_tubing",
  tank_type: string = "small_poly_100_500",
  pump_type: string = "small_condensate"
): CalculatorResponse {
  // 1. Calculate condensate production
  const total_condensate = num_units * tons_per_unit * CONDENSATE_PER_TON_PER_DAY * days_per_year;
  const tank_size = storage_gallons || Math.min(2000, Math.max(100, total_condensate / 365 * 7)); // Week supply
  
  // 2. Condensate Drain Piping cost calculation
  const piping_specs = HVAC_PIPING_COSTS[piping_material] || HVAC_PIPING_COSTS["pvc_tubing"];
  const piping_cost_min = piping_length_feet * (piping_specs.material_min + piping_specs.labor_min + piping_specs.fittings);
  const piping_cost_max = piping_length_feet * (piping_specs.material_max + piping_specs.labor_max + piping_specs.fittings);
  const piping_cost_avg = (piping_cost_min + piping_cost_max) / 2;
  
  // 3. Storage Tank cost calculation
  const tank_specs = HVAC_TANK_COSTS[tank_type] || HVAC_TANK_COSTS["small_poly_100_500"];
  let tank_cost_min: number, tank_cost_max: number;
  
  if (tank_specs.per_gallon_min !== undefined) { // For large_poly_1000_plus type
    tank_cost_min = tank_size * tank_specs.per_gallon_min;
    tank_cost_max = tank_size * tank_specs.per_gallon_max;
  } else { // For fixed cost tanks (small_poly_100_500, indoor_sump)
    tank_cost_min = tank_specs.min;
    tank_cost_max = tank_specs.max;
  }
  
  const tank_cost_avg = (tank_cost_min + tank_cost_max) / 2;
  
  // 4. Filtration & Treatment cost calculation
  let filter_cost_min = HVAC_FILTRATION["sediment_filter"].min;
  let filter_cost_max = HVAC_FILTRATION["sediment_filter"].max;
  
  // Add optional carbon filter and UV if potable
  if (potable) {
    filter_cost_min += HVAC_FILTRATION["carbon_filter_optional"].min + HVAC_FILTRATION["uv_if_potable"].min;
    filter_cost_max += HVAC_FILTRATION["carbon_filter_optional"].max + HVAC_FILTRATION["uv_if_potable"].max;
  }
  
  const filter_cost_avg = (filter_cost_min + filter_cost_max) / 2;
  
  // 5. Pump System cost calculation
  const pump_specs = HVAC_PUMP_SYSTEMS[pump_type] || HVAC_PUMP_SYSTEMS["small_condensate"];
  const pump_cost_min = pump_specs.pump_min + pump_specs.install_min;
  const pump_cost_max = pump_specs.pump_max + pump_specs.install_max;
  const pump_cost_avg = (pump_cost_min + pump_cost_max) / 2;
  
  // 6. Miscellaneous costs
  const misc_cost_min = (
    HVAC_MISC["mounting_brackets_electrical"].min + 
    HVAC_MISC["valves_unions_overflow"].min + 
    HVAC_MISC["permitting_plumbing_tie_in"].min
  );
  const misc_cost_max = (
    HVAC_MISC["mounting_brackets_electrical"].max + 
    HVAC_MISC["valves_unions_overflow"].max + 
    HVAC_MISC["permitting_plumbing_tie_in"].max
  );
  const misc_cost_avg = (misc_cost_min + misc_cost_max) / 2;
  
  // HVAC unit connection costs (estimated per unit)
  const hvac_unit_cost = num_units * 75; // Average connection cost per unit
  
  // Total system cost calculation
  const total_min = piping_cost_min + tank_cost_min + filter_cost_min + pump_cost_min + misc_cost_min + hvac_unit_cost;
  const total_max = piping_cost_max + tank_cost_max + filter_cost_max + pump_cost_max + misc_cost_max + hvac_unit_cost;
  const total_avg = (total_min + total_max) / 2;
  
  // Detailed breakdown using average costs
  const breakdown = {
    tank_cost: Math.round(tank_cost_avg),
    piping_cost: Math.round(piping_cost_avg),
    filter_cost: Math.round(filter_cost_avg),
    pump_cost: Math.round(pump_cost_avg),
    hvac_unit_cost: Math.round(hvac_unit_cost),
    misc_cost: Math.round(misc_cost_avg),
    total: Math.round(total_avg)
  };
  
  return {
    cost_range_min: Math.round(total_min),
    cost_range_max: Math.round(total_max),
    annual_water_collection: Math.round(total_condensate * 10) / 10,
    tank_size: Math.round(tank_size * 10) / 10,
    breakdown
  };
}

// Utility functions for form validation
export function validateRainwaterForm(form: RainwaterCalculatorRequest): string[] {
  const errors: string[] = [];
  
  if (!form.roof_area_sqft || form.roof_area_sqft <= 0) {
    errors.push("Roof area must be greater than 0");
  }
  if (!form.annual_rainfall_inches || form.annual_rainfall_inches <= 0) {
    errors.push("Annual rainfall must be greater than 0");
  }
  if (!form.piping_length_feet || form.piping_length_feet <= 0) {
    errors.push("Piping length must be greater than 0");
  }
  if (form.storage_gallons && form.storage_gallons <= 0) {
    errors.push("Storage gallons must be greater than 0 if specified");
  }
  
  return errors;
}

export function validateHVACForm(form: HVACCalculatorRequest): string[] {
  const errors: string[] = [];
  
  if (!form.num_units || form.num_units <= 0 || form.num_units % 1 !== 0) {
    errors.push("Number of units must be a positive integer");
  }
  if (!form.tons_per_unit || form.tons_per_unit <= 0) {
    errors.push("Tons per unit must be greater than 0");
  }
  if (!form.days_per_year || form.days_per_year <= 0 || form.days_per_year > 365) {
    errors.push("Days per year must be between 1 and 365");
  }
  if (!form.piping_length_feet || form.piping_length_feet <= 0) {
    errors.push("Piping length must be greater than 0");
  }
  if (form.storage_gallons && form.storage_gallons <= 0) {
    errors.push("Storage gallons must be greater than 0 if specified");
  }
  
  return errors;
}