export type DepinScanMetrics = {
    date: string;
    total_projects: string;
    market_cap: string;
    total_device: string;
};

export type DepinScanProject = {
    project_name: string;
    slug: string;
    token: string;
    layer_1: string[];
    categories: string[];
    market_cap: string;
    token_price: string;
    total_devices: string;
    avg_device_cost: string;
    days_to_breakeven: string;
    estimated_daily_earnings: string;
    chainid: string;
    coingecko_id: string;
    fully_diluted_valuation: string;
};

export type WeatherData = {
    latitude: number;
    longitude: number;
    temperature: number;
    condition: string;
    condition_desc: string;
    condition_code: number;
    temperature_min: number;
    temperature_max: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    wind_speed: number;
    wind_scale: number;
    wind_direction: number;
    uv: number;
    luminance: number;
    elevation: number;
    rain: number;
    wet_bulb: number;
    timestamp: number;
    parsed_timestamp: string;
    timezone: number;
    location_name: string;
    address: string;
    source: string;
    tag: string;
    is_online: boolean;
    is_malfunction: boolean;
};

export type WeatherForecast = WeatherForcastDP[];

export type WeatherForcastDP = {
    latitude: number;
    longitude: number;
    temperature: number;
    condition: string;
    condition_desc: string;
    condition_code: number;
    temperature_min: number;
    temperature_max: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    wind_speed: number;
    wind_direction: number;
    uv: number;
    luminance: number;
    sea_level: number;
    rain: number;
    wet_bulb: number;
    timestamp: number;
    parsed_timestamp: string;
    timezone: number;
    location_name: string;
    source: string;
    tag: string;
};
