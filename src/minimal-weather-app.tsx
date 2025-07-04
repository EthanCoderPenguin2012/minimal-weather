import React, { useState, useEffect, useCallback } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Eye, Droplets, Thermometer, MapPin, Search, Loader, Settings, ArrowLeft, Map, Globe, Volume2, VolumeX } from 'lucide-react';
import './animations.css';
import { useTranslation, availableLanguages } from './i18n';

const WeatherApp = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cities, setCities] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('weather');
  const [selectedDay, setSelectedDay] = useState(null);
  const [mapLayer, setMapLayer] = useState('precipitation');
  const [settings, setSettings] = useState({
    defaultLocation: 'London',
    units: 'metric',
    language: 'en-us',
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    soundEnabled: true,
    autoRefresh: true,
    notifications: false,
    darkMode: true,
    showAnimations: true,
    refreshInterval: '5',
    theme: 'auto',
    keyboardNavigation: true
  });
  
  const { t } = useTranslation(settings.language);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedDay) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedDay]);

  const AMBEE_API_KEY = process.env.REACT_APP_AMBEE_API_KEY || process.env.AMBEE_API_KEY;
  const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || 'cbf335035c93d088e8f124a2c8bd05a7';

  const mapWeatherCondition = (weatherId) => {
    if (weatherId >= 200 && weatherId < 600) return 'rainy';
    if (weatherId >= 600 && weatherId < 700) return 'snowy';
    if (weatherId >= 700 && weatherId < 800) return 'cloudy';
    if (weatherId === 800) return 'sunny';
    return 'cloudy';
  };

  const fetchWeatherData = async (city) => {
    setApiError(null);
    
    try {
      if (AMBEE_API_KEY) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const geoResponse = await fetch(`https://api.ambeedata.com/weather/latest/by-city?city=${city}`, {
          headers: { 'x-api-key': AMBEE_API_KEY },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (geoResponse.ok) {
          const currentData = await geoResponse.json();
          const forecastResponse = await fetch(`https://api.ambeedata.com/weather/forecast/by-city?city=${city}`, {
            headers: { 'x-api-key': AMBEE_API_KEY }
          });
          const forecastData = await forecastResponse.json();
          
          // Ambee API processing (existing code)
          const forecast = forecastData.data
            .slice(0, 5)
            .map((item, index) => ({
              day: index === 0 ? 'Today' : new Date(item.time).toLocaleDateString('en', { weekday: 'short' }),
              high: Math.round(item.temperature),
              low: Math.round(item.temperature - 5),
              condition: item.summary.toLowerCase().includes('rain') ? 'rainy' : 
                        item.summary.toLowerCase().includes('cloud') ? 'cloudy' :
                        item.summary.toLowerCase().includes('snow') ? 'snowy' : 'sunny'
            }));
          
          const hourlyForecast = Array.from({ length: 12 }, (_, i) => {
            const hour = (new Date().getHours() + i) % 24;
            const baseTemp = currentData.data.temperature;
            const tempVariation = Math.sin((hour - 12) * Math.PI / 12) * 5 + Math.random() * 3 - 1.5;
            return {
              time: hour,
              temperature: Math.round(baseTemp + tempVariation),
              condition: currentData.data.summary.toLowerCase().includes('rain') ? 'rainy' : 
                        currentData.data.summary.toLowerCase().includes('cloud') ? 'cloudy' :
                        currentData.data.summary.toLowerCase().includes('snow') ? 'snowy' : 'sunny',
              humidity: Math.max(20, Math.min(100, currentData.data.humidity + Math.random() * 20 - 10))
            };
          });
          
          return {
            city: currentData.data.city,
            country: currentData.data.countryCode,
            lat: currentData.data.lat,
            lon: currentData.data.lng,
            temperature: Math.round(currentData.data.temperature),
            condition: currentData.data.summary.toLowerCase().includes('rain') ? 'rainy' : 
                      currentData.data.summary.toLowerCase().includes('cloud') ? 'cloudy' :
                      currentData.data.summary.toLowerCase().includes('snow') ? 'snowy' : 'sunny',
            description: currentData.data.summary,
            humidity: currentData.data.humidity,
            windSpeed: Math.round(currentData.data.windSpeed),
            visibility: Math.round(currentData.data.visibility),
            feelsLike: Math.round(currentData.data.apparentTemperature),
            pressure: currentData.data.pressure,
            uvIndex: currentData.data.uvIndex || 0,
            forecast,
            hourlyForecast,
            aqi: 59, // Mock AQI value
            pollen: 75, // Mock Pollen value
          };
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(t('timeout'));
      }
      console.log('Ambee API failed, falling back to OpenWeatherMap');
    }
    
    // Fallback to OpenWeatherMap
    let currentData, forecastData;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const [currentResponse, forecastResponse] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`, {
          signal: controller.signal
        }),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`, {
          signal: controller.signal
        })
      ]);
      
      clearTimeout(timeoutId);
      
      if (!currentResponse.ok) {
        if (currentResponse.status === 404) {
          throw new Error(t('cityNotFound'));
        } else if (currentResponse.status === 401) {
          throw new Error(t('apiKey'));
        } else if (currentResponse.status >= 500) {
          throw new Error(t('serverError'));
        }
        throw new Error(t('failedToLoad'));
      }
      
      currentData = await currentResponse.json();
      forecastData = await forecastResponse.json();
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(t('timeout'));
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error(t('network'));
      }
      throw error;
    }
    
    const forecast = forecastData.list
      .filter((_, index) => index % 8 === 0)
      .slice(0, 5)
      .map((item, index) => ({
        day: index === 0 ? 'Today' : new Date(item.dt * 1000).toLocaleDateString('en', { weekday: 'short' }),
        high: Math.round(item.main.temp_max),
        low: Math.round(item.main.temp_min),
        condition: mapWeatherCondition(item.weather[0].id)
      }));
    
    const hourlyForecast = Array.from({ length: 12 }, (_, i) => {
      const hour = (new Date().getHours() + i) % 24;
      const baseTemp = currentData.main.temp;
      const tempVariation = Math.sin((hour - 12) * Math.PI / 12) * 5 + Math.random() * 3 - 1.5;
      return {
        time: hour,
        temperature: Math.round(baseTemp + tempVariation),
        condition: mapWeatherCondition(currentData.weather[0].id),
        humidity: Math.round(Math.max(20, Math.min(100, currentData.main.humidity + Math.random() * 20 - 10)))
      };
    });
    
    const now = new Date();
    const isAprilFools = now.getMonth() === 3 && now.getDate() === 1;
    
    if (isAprilFools) {
      return {
        city: currentData.name,
        country: currentData.sys.country,
        lat: currentData.coord.lat,
        lon: currentData.coord.lon,
        temperature: 999,
        condition: 'sunny',
        description: 'raining cats and dogs',
        humidity: 420,
        windSpeed: 88,
        visibility: 0,
        feelsLike: -273,
        pressure: 9001,
        uvIndex: 42,
        forecast: forecast.map(day => ({ ...day, high: 999, low: -999, condition: 'snowy' })),
        hourlyForecast: Array(12).fill(null).map((_, i) => ({ time: i, temperature: 999, condition: 'snowy', humidity: 420 })),
        aqi: 59, // Mock AQI value
        pollen: 75, // Mock Pollen value
      };
    }
    
    return {
      city: currentData.name,
      country: currentData.sys.country,
      lat: currentData.coord.lat,
      lon: currentData.coord.lon,
      temperature: Math.round(currentData.main.temp),
      condition: mapWeatherCondition(currentData.weather[0].id),
      description: currentData.weather[0].description,
      humidity: currentData.main.humidity,
      windSpeed: Math.round(currentData.wind.speed * 3.6),
      visibility: Math.round(currentData.visibility / 1000),
      feelsLike: Math.round(currentData.main.feels_like),
      pressure: currentData.main.pressure,
      uvIndex: 0,
      forecast,
      hourlyForecast,
      aqi: 59, // Mock AQI value
      pollen: 75, // Mock Pollen value
    };
  };

  const getWeatherIcon = (condition, size = 'w-12 h-12') => {
    const iconClass = `${size} text-white/90`;
    switch(condition) {
      case 'sunny': return <Sun className={iconClass} />;
      case 'cloudy': return <Cloud className={iconClass} />;
      case 'rainy': return <CloudRain className={iconClass} />;
      case 'snowy': return <CloudSnow className={iconClass} />;
      default: return <Sun className={iconClass} />;
    }
  };

  const getGradientBackground = (condition) => {
    if (condition === 'sunny') {
      const hour = currentTime.getHours();
      if (hour >= 6 && hour < 8) {
        return 'from-orange-400 via-pink-400 to-blue-500'; // Sunrise
      } else if (hour >= 8 && hour < 18) {
        return 'from-blue-400 via-blue-500 to-blue-600'; // Day
      } else if (hour >= 18 && hour < 20) {
        return 'from-blue-500 via-orange-400 to-pink-500'; // Sunset
      } else {
        return 'from-gray-900 via-blue-900 to-black'; // Night
      }
    }
    switch(condition) {
      case 'cloudy': return 'from-slate-400 via-slate-500 to-slate-600';
      case 'rainy': return 'from-slate-600 via-blue-600 to-blue-700';
      case 'snowy': return 'from-slate-300 via-blue-400 to-blue-500';
      default: return 'from-blue-400 via-blue-500 to-blue-600';
    }
  };

  const searchWeather = async (city = location) => {
    if (!city.trim()) {
      setError(t('enterCity'));
      return;
    }
    
    setLoading(true);
    setError('');
    setApiError(null);
    setShowSuggestions(false);
    
    try {
      const weatherData = await fetchWeatherData(city);
      setWeather(weatherData);
      setLocation('');
      setError('');
      
      // Sound feedback
      if (settings.soundEnabled) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.1;
        audio.play().catch(() => {});
      }
    } catch (error) {
      console.error('Weather fetch error:', error);
      setError(error.message || t('failedToLoad'));
      setApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const popularCities = [
    'London,UK', 'New York,US', 'Tokyo,JP', 'Paris,FR', 'Sydney,AU', 'Berlin,DE',
    'Madrid,ES', 'Rome,IT', 'Moscow,RU', 'Beijing,CN', 'Mumbai,IN', 'Cairo,EG',
    'São Paulo,BR', 'Mexico City,MX', 'Toronto,CA', 'Buenos Aires,AR'
  ];
  
  const fetchSuggestions = useCallback(async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    try {
      const filtered = popularCities
        .filter(city => city.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
        .map(city => {
          const [name, country] = city.split(',');
          return { name, country, display: `${name}, ${country}` };
        });
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } catch (error) {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);
  
  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState(null);
  const debouncedSearch = useCallback((query) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => fetchSuggestions(query), 300);
    setSearchTimeout(timeout);
  }, [fetchSuggestions, searchTimeout]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setLocation(value);
    debouncedSearch(value);
  };

  const selectSuggestion = (suggestion) => {
    setLocation(suggestion.display);
    setShowSuggestions(false);
    searchWeather(suggestion.display);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchWeather();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setShowSuggestions(true);
    }
  };

  useEffect(() => {
    const loadCities = async () => {
      try {
        const response = await fetch('/cities.json');
        const citiesData = await response.json();
        setCities(citiesData);
      } catch (error) {
        console.error('Failed to load cities');
      }
    };
    
    const loadSettings = () => {
      const savedSettings = localStorage.getItem('weatherSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    };
    
    const loadInitialWeather = async () => {
      setIsInitialLoading(true);
      try {
        const weatherData = await fetchWeatherData(settings.defaultLocation);
        setWeather(weatherData);
        setError('');
      } catch (error) {
        console.error('Initial weather load error:', error);
        setError(error.message || t('failedToLoad'));
        setApiError(error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    loadSettings();
    loadCities();
    
    // Add delay to prevent too many API calls on mount
    const timer = setTimeout(loadInitialWeather, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${weather ? getGradientBackground(weather.condition) : 'from-blue-400 via-blue-500 to-blue-600'} transition-all duration-1000 ease-in-out animate-gradient-x`} style={{'--tw-gradient-stops': 'var(--tw-gradient-from), var(--tw-gradient-to, rgba(59, 130, 246, 0))'}}>
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm">
        {weather && weather.condition === 'sunny' && (
          <div className="absolute inset-0">
            {currentTime.getHours() >= 6 && currentTime.getHours() < 20 ? (
              <div 
                className="absolute w-16 h-16 bg-yellow-300/30 rounded-full blur-sm animate-pulse transition-all duration-1000"
                style={{
                  left: `${((currentTime.getHours() - 6) / 12) * 80 + 10}%`,
                  top: `${50 - Math.sin(((currentTime.getHours() - 6) / 12) * Math.PI) * 30}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="absolute inset-2 bg-yellow-400/40 rounded-full animate-spin-slow">
                  <div className="absolute inset-1 bg-yellow-200/50 rounded-full"></div>
                </div>
              </div>
            ) : (
              <div 
                className="absolute w-12 h-12 bg-gray-200/40 rounded-full transition-all duration-1000"
                style={{
                  left: `${((currentTime.getHours() + 6) / 12) * 80 + 10}%`,
                  top: `${30 + Math.sin(((currentTime.getHours() + 6) / 12) * Math.PI) * 20}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="absolute inset-0 bg-gray-300/30 rounded-full">
                  <div className="absolute top-1 left-1 w-2 h-2 bg-gray-400/50 rounded-full"></div>
                  <div className="absolute bottom-2 right-1 w-1 h-1 bg-gray-400/40 rounded-full"></div>
                  <div className="absolute top-3 right-2 w-1.5 h-1.5 bg-gray-400/30 rounded-full"></div>
                </div>
              </div>
            )}
          </div>
        )}
        {weather && weather.condition === 'cloudy' && (
          <div className="absolute inset-0">
            {[...Array(Math.floor(weather.humidity / 15))].map((_, i) => (
              <div
                key={i}
                className="absolute animate-float opacity-20 transition-all duration-2000"
                style={{
                  left: `${(i * 25 + Math.random() * 20)}%`,
                  top: `${20 + Math.random() * 40}%`,
                  animationDelay: `${i * 2}s`,
                  animationDuration: `${8 + Math.random() * 4}s`
                }}
              >
                <svg width="80" height="40" viewBox="0 0 80 40" className="text-white/30">
                  <path
                    d="M20,30 Q10,20 20,20 Q25,10 35,15 Q45,5 55,15 Q70,10 65,25 Q75,30 65,35 L20,35 Z"
                    fill="currentColor"
                    className="animate-pulse"
                  />
                </svg>
              </div>
            ))}
          </div>
        )}
        <div className="absolute inset-0 opacity-30">
          {[...Array(15)].map((_, i) => (
            <div key={i} className={`absolute bg-white/10 rounded-full animate-bubble animate-liquid`} style={{
              left: `${Math.random() * 100}%`,
              width: `${20 + Math.random() * 40}px`,
              height: `${20 + Math.random() * 40}px`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${8 + Math.random() * 4}s`
            }}></div>
          ))}
          {[...Array(8)].map((_, i) => (
            <div key={`shimmer-${i}`} className={`absolute w-32 h-32 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-full animate-shimmer animate-float`} style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`
            }}></div>
          ))}
        </div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-2xl font-light text-white/90 ${settings.largeText ? 'text-3xl' : ''}`}>
            {(() => {
              const now = new Date();
              const isAprilFools = now.getMonth() === 3 && now.getDate() === 1;
              if (isAprilFools && currentScreen === 'weather') return '🌈 Magical Weather ✨';
              return currentScreen === 'weather' ? 'Weather' : currentScreen === 'map' ? 'Weather Map' : 'Settings';
            })()}
          </h1>
          <div className="flex items-center space-x-4">
            {currentScreen === 'weather' ? (
              <>
                <div className={`text-white/70 font-light ${settings.largeText ? 'text-lg' : ''}`}>
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentScreen('map')}
                    className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-110"
                  >
                    <Map className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => setCurrentScreen('settings')}
                    className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-110"
                  >
                    <Settings className="w-5 h-5 text-white" />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setCurrentScreen('weather')}
                className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-110"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        {currentScreen === 'weather' && (
          <div className="mb-8 sm:mb-12">
          <div className="relative max-w-sm sm:max-w-md mx-auto">
            <input
              type="text"
              value={location}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onFocus={() => location.length >= 2 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search city..."
              className="w-full px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base glass-card rounded-2xl text-white placeholder-white/60 shadow-lg focus:outline-none animate-shimmer"
            />
            <button
              onClick={() => searchWeather()}
              disabled={loading}
              className="absolute right-2 top-2 p-2 glass-button rounded-xl shadow-md animate-pulse-glow"
            >
              {loading ? (
                <div className="relative">
                  <Loader className="w-5 h-5 text-white animate-spin" />
                  <div className="absolute inset-0 w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              ) : (
                <Search className="w-5 h-5 text-white" />
              )}
            </button>
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-200" style={{backdropFilter: 'blur(16px) saturate(150%)'}}>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => selectSuggestion(suggestion)}
                    className="px-6 py-3 text-white hover:bg-white/15 cursor-pointer transition-all duration-200 hover:translate-x-2 hover:scale-105 active:scale-95"
                  >
                    {suggestion.display}
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && (
            <div className="text-center mt-4 max-w-md mx-auto animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="glass-card rounded-lg p-4 border-l-4 border-red-400">
                <div className="flex items-center space-x-2">
                  <span className="text-red-400">⚠️</span>
                  <span className="text-white/90 text-sm">{error}</span>
                </div>
                {apiError && (
                  <button 
                    onClick={() => {setError(''); setApiError(null);}}
                    className="mt-2 text-white/60 text-xs hover:text-white/80 transition-colors"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          )}
          </div>
        )}

        {currentScreen === 'weather' && (
          <>
            {isInitialLoading ? (
              <LoadingSkeleton />
            ) : error && !weather ? (
              <ErrorDisplay 
                error={error} 
                onRetry={() => searchWeather(settings.defaultLocation)}
                t={t}
              />
            ) : weather ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-card rounded-3xl p-4 sm:p-8 mb-6 sm:mb-8 shadow-2xl animate-glass-morph animate-pulse-glow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-white/70" />
                  <span className="text-white/90 text-lg font-light">
                    {weather.city}, {weather.country}
                  </span>
                </div>
                <div className="text-white/60 text-sm">
                  {currentTime.toLocaleDateString([], { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                  <div className="animate-float hover:animate-pulse transition-all duration-500">
                    {getWeatherIcon(weather.condition, 'w-16 h-16')}
                  </div>
                  <div>
                    <div className="text-4xl sm:text-6xl font-ultralight text-white mb-2 animate-number-pop hover:animate-shimmer text-center sm:text-left cursor-pointer">
                      {weather.temperature}°
                    </div>
                    <div className="text-white/70 text-lg font-light">
                      {weather.description}
                    </div>
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  <div className="text-white/60 text-sm mb-1">Feels like</div>
                  <div className="text-white text-xl sm:text-2xl font-light">{weather.feelsLike}°</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {[
                { icon: Wind, label: 'Wind', value: `${weather.windSpeed} km/h` },
                { icon: Droplets, label: 'Humidity', value: `${weather.humidity}%` },
                { icon: Eye, label: 'Visibility', value: `${weather.visibility} km` },
                { icon: Thermometer, label: 'Pressure', value: `${weather.pressure} hPa` }
              ].map((item, index) => (
                <div key={index} className="glass-card rounded-2xl p-4 shadow-lg animate-float" style={{animationDelay: `${index * 200}ms`}}>
                  <div className="flex items-center space-x-3 mb-2">
                    <item.icon className="w-5 h-5 text-white/70 hover:animate-bounce transition-all duration-200" />
                    <span className="text-white/70 text-sm">{item.label}</span>
                  </div>
                  <div className="text-white text-xl font-light">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-6 sm:mb-8" style={{animationDelay: '180ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
              <h3 className="text-white/90 text-lg font-light mb-4 sm:mb-6">24-Hour Forecast</h3>
              <div className="overflow-x-auto">
                <div className="flex space-x-3 pb-2" style={{minWidth: 'max-content'}}>
                  {weather.hourlyForecast.slice(0, 12).map((hour, index) => (
                    <div key={index} className="flex-shrink-0 text-center glass-card rounded-2xl p-3 min-w-[70px] animate-float" style={{animationDelay: `${index * 100}ms`}}>
                      <div className="text-white/70 text-xs mb-2">
                        {hour.time === new Date().getHours() ? 'Now' : `${hour.time}:00`}
                      </div>
                      <div className="flex justify-center mb-2">
                        {getWeatherIcon(hour.condition, 'w-5 h-5')}
                      </div>
                      <div className="text-white text-sm font-light mb-1">{hour.temperature}°</div>
                      <div className="text-white/60 text-xs">{hour.humidity}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: '200ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
              <h3 className="text-white/90 text-lg font-light mb-6">5-Day Forecast</h3>
              <div className="grid grid-cols-5 gap-4">
                {weather.forecast.map((day, index) => (
                  <div key={index} onClick={() => setSelectedDay({...day, index})} className="text-center glass-button rounded-xl p-3 cursor-pointer animate-float" style={{animationDelay: `${index * 150}ms`}}>
                    <div className="text-white/70 text-sm mb-3">{day.day}</div>
                    <div className="flex justify-center mb-3 transform hover:scale-125 hover:rotate-12 transition-transform duration-200 animate-float">
                      {getWeatherIcon(day.condition, 'w-8 h-8')}
                    </div>
                    <div className="text-white text-sm font-light">
                      <div>{day.high}°</div>
                      <div className="text-white/60">{day.low}°</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: '400ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Temperature Trend</h3>
                <div className="relative h-32">
                  <svg className="w-full h-full" viewBox="0 0 300 120">
                    {weather.forecast.map((day, index) => {
                      const x = (index * 60) + 30;
                      const highY = 30 + ((30 - day.high) * 1.5);
                      const lowY = 30 + ((30 - day.low) * 1.5);
                      return (
                        <g key={index}>
                          <circle cx={x} cy={highY} r="3" fill="rgba(239, 68, 68, 0.8)" />
                          <circle cx={x} cy={lowY} r="3" fill="rgba(59, 130, 246, 0.8)" />
                          {index < weather.forecast.length - 1 && (
                            <>
                              <line x1={x} y1={highY} x2={(index + 1) * 60 + 30} y2={30 + ((30 - weather.forecast[index + 1].high) * 1.5)} stroke="rgba(239, 68, 68, 0.6)" strokeWidth="2" />
                              <line x1={x} y1={lowY} x2={(index + 1) * 60 + 30} y2={30 + ((30 - weather.forecast[index + 1].low) * 1.5)} stroke="rgba(59, 130, 246, 0.6)" strokeWidth="2" />
                            </>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                  <div className="flex justify-between mt-2 text-xs text-white/60">
                    {weather.forecast.map((day, index) => (
                      <span key={index}>{day.day.slice(0, 3)}</span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: '500ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Precipitation</h3>
                <div className="text-center">
                  <div className="text-white text-3xl font-light mb-2">0%</div>
                  <div className="text-white/60 text-sm mb-4">No Rain Expected</div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full transition-all duration-1000" style={{width: '0%'}}></div>
                  </div>
                  <div className="text-white/60 text-xs mt-4">Light rain possible tomorrow</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-6 sm:mt-8">
              {/* UV Index Card - Arc Gauge */}
              <div className="glass-card rounded-3xl p-6 shadow-xl flex flex-col items-center animate-float animate-pulse-glow" style={{animationDelay: '650ms'}}>
                <h3 className="text-white/90 text-lg font-light mb-4">UV</h3>
                <ArcGauge value={weather.uvIndex} max={11} colorStops={['#22c55e', '#eab308', '#f97316', '#dc2626']} labels={['Low', 'Moderate', 'High', 'Very High', 'Extreme']} />
                <div className="text-white/60 text-xs mt-2">Maximum UV exposure for today will be moderate, expected at 13:00.</div>
              </div>

              {/* AQI Card - Arc Gauge */}
              <div className="glass-card rounded-3xl p-6 shadow-xl flex flex-col items-center animate-float animate-pulse-glow" style={{animationDelay: '900ms'}}>
                <h3 className="text-white/90 text-lg font-light mb-4">AQI</h3>
                <ArcGauge value={weather.aqi} max={200} colorStops={['#22c55e', '#eab308', '#f97316', '#dc2626']} labels={['Good', 'Moderate', 'Unhealthy', 'Very Unhealthy']} />
                <div className="text-white/60 text-xs mt-2">Deteriorating air quality with primary pollutant: O₃ 27 ppb.</div>
              </div>

              {/* Pollen Card - Arc Gauge */}
              <div className="glass-card rounded-3xl p-6 shadow-xl flex flex-col items-center animate-float animate-pulse-glow" style={{animationDelay: '950ms'}}>
                <h3 className="text-white/90 text-lg font-light mb-4">Pollen</h3>
                <ArcGauge value={weather.pollen} max={200} colorStops={['#22c55e', '#eab308', '#dc2626']} labels={['Low', 'Moderate', 'High']} />
                <div className="text-white/60 text-xs mt-2">Similar to yesterday. Main allergy: Grass.</div>
              </div>

              {/* Visibility Card - Stacked Bars */}
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl flex flex-col items-center" style={{animationDelay: '700ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-4">Visibility</h3>
                <StackedBar value={weather.visibility} max={70} steps={5} color="bg-green-400" />
                <div className="text-white text-2xl font-light mt-2">{weather.visibility} km</div>
                <div className="text-white/70 text-sm">Excellent</div>
                <div className="text-white/60 text-xs mt-2">Improving with a peak visibility distance of {weather.visibility} km expected at 10:34. Excellent visibility.</div>
              </div>

              {/* Pressure Card - Arc Gauge */}
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl flex flex-col items-center" style={{animationDelay: '800ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-4">Pressure</h3>
                <ArcGauge value={weather.pressure - 950} max={100} colorStops={['#a78bfa']} labels={['Rising']} />
                <div className="text-white text-2xl font-light mt-2">{weather.pressure} mb</div>
                <div className="text-white/60 text-xs mt-2">Rising slowly in the last 3 hours. Expected to rise slowly in the next 3 hours.</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: '900ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Weekly Overview</h3>
                <div className="space-y-3">
                  {weather.forecast.map((day, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-white/70 text-sm w-12">{day.day.slice(0, 3)}</span>
                      <div className="flex items-center space-x-2 flex-1 mx-4">
                        {getWeatherIcon(day.condition, 'w-4 h-4')}
                        <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-400 to-red-400 rounded-full transition-all duration-1000" style={{width: `${((day.high + 20) / 60) * 100}%`}}></div>
                        </div>
                      </div>
                      <span className="text-white text-sm">{day.high}°/{day.low}°</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: '1200ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Yearly Average</h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-white/10 rounded-xl">
                    <div className="text-red-400 text-sm font-light mb-1">Hottest</div>
                    <div className="text-white text-2xl font-light">{Math.round(weather.temperature + 15)}°</div>
                    <div className="text-white/60 text-xs">July</div>
                  </div>
                  <div className="p-4 bg-white/10 rounded-xl">
                    <div className="text-blue-400 text-sm font-light mb-1">Coldest</div>
                    <div className="text-white text-2xl font-light">{Math.round(weather.temperature - 15)}°</div>
                    <div className="text-white/60 text-xs">January</div>
                  </div>
                </div>
              </div>
              

            </div>
            
            <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8" style={{animationDelay: '1400ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
              <h3 className="text-white/90 text-lg font-light mb-6">Climate Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-white text-2xl font-light mb-1">{weather.temperature}°</div>
                  <div className="text-white/60 text-sm mb-2">Avg Temperature</div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full transition-all duration-1000" style={{width: `${((weather.temperature + 20) / 60) * 100}%`}}></div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-white text-2xl font-light mb-1">{weather.humidity}%</div>
                  <div className="text-white/60 text-sm mb-2">Avg Humidity</div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full transition-all duration-1000" style={{width: `${weather.humidity}%`}}></div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-white text-2xl font-light mb-1">{weather.windSpeed}</div>
                  <div className="text-white/60 text-sm mb-2">Avg Wind (km/h)</div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full transition-all duration-1000" style={{width: `${Math.min(weather.windSpeed * 2, 100)}%`}}></div>
                  </div>
                </div>
              </div>
            </div>
            </div>
            ) : (
              <div className="glass-card rounded-3xl p-8 text-center">
                <div className="text-white/60 text-lg">No weather data available</div>
              </div>
            )}
          </>
        )}
        
        {currentScreen === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-6 border border-white/30">
              <h2 className={`text-lg font-light text-white mb-4 ${settings.largeText ? 'text-xl' : ''}`}>Language / Idioma / Langue</h2>
              <select
                value={settings.language}
                onChange={(e) => {
                  const newSettings = { ...settings, language: e.target.value };
                  setSettings(newSettings);
                  localStorage.setItem('weatherSettings', JSON.stringify(newSettings));
                }}
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-md rounded-xl text-white border border-white/30 focus:outline-none focus:border-white/50 mb-6"
              >
                {availableLanguages.map(lang => (
                  <option key={lang.code} value={lang.code} className="bg-gray-800">
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-6 border border-white/30">
              <h2 className={`text-lg font-light text-white mb-4 ${settings.largeText ? 'text-xl' : ''}`}>Default Location</h2>
              <input
                type="text"
                value={settings.defaultLocation}
                onChange={(e) => {
                  const newSettings = { ...settings, defaultLocation: e.target.value };
                  setSettings(newSettings);
                  localStorage.setItem('weatherSettings', JSON.stringify(newSettings));
                }}
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-md rounded-xl text-white placeholder-white/60 border border-white/30 focus:outline-none focus:border-white/50"
                placeholder="Enter city name"
              />
            </div>
            
            <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-6 border border-white/30">
              <h2 className={`text-lg font-light text-white mb-4 ${settings.largeText ? 'text-xl' : ''}`}>Units</h2>
              <select
                value={settings.units}
                onChange={(e) => {
                  const newSettings = { ...settings, units: e.target.value };
                  setSettings(newSettings);
                  localStorage.setItem('weatherSettings', JSON.stringify(newSettings));
                }}
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-md rounded-xl text-white border border-white/30 focus:outline-none focus:border-white/50"
              >
                <option value="metric" className="bg-gray-800">Celsius (°C)</option>
                <option value="imperial" className="bg-gray-800">Fahrenheit (°F)</option>
              </select>
            </div>
            
            <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-6 border border-white/30">
              <h2 className={`text-lg font-light text-white mb-4 ${settings.largeText ? 'text-xl' : ''}`}>Accessibility</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className={`text-white/80 ${settings.largeText ? 'text-lg' : ''}`}>High Contrast</span>
                  <button
                    onClick={() => {
                      const newSettings = { ...settings, highContrast: !settings.highContrast };
                      setSettings(newSettings);
                      localStorage.setItem('weatherSettings', JSON.stringify(newSettings));
                    }}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 ${settings.highContrast ? 'bg-blue-500' : 'bg-white/30'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 transform ${settings.highContrast ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-white/80 ${settings.largeText ? 'text-lg' : ''}`}>Large Text</span>
                  <button
                    onClick={() => {
                      const newSettings = { ...settings, largeText: !settings.largeText };
                      setSettings(newSettings);
                      localStorage.setItem('weatherSettings', JSON.stringify(newSettings));
                    }}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 ${settings.largeText ? 'bg-green-500' : 'bg-white/30'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 transform ${settings.largeText ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-white/80 ${settings.largeText ? 'text-lg' : ''}`}>Reduced Motion</span>
                  <button
                    onClick={() => {
                      const newSettings = { ...settings, reducedMotion: !settings.reducedMotion };
                      setSettings(newSettings);
                      localStorage.setItem('weatherSettings', JSON.stringify(newSettings));
                    }}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 ${settings.reducedMotion ? 'bg-purple-500' : 'bg-white/30'}`}
                    aria-label="Toggle reduced motion"
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 transform ${settings.reducedMotion ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-white/70" /> : <VolumeX className="w-4 h-4 text-white/70" />}
                    <span className={`text-white/80 ${settings.largeText ? 'text-lg' : ''}`}>Sound Effects</span>
                  </div>
                  <button
                    onClick={() => {
                      const newSettings = { ...settings, soundEnabled: !settings.soundEnabled };
                      setSettings(newSettings);
                      localStorage.setItem('weatherSettings', JSON.stringify(newSettings));
                    }}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 ${settings.soundEnabled ? 'bg-green-500' : 'bg-white/30'}`}
                    aria-label="Toggle sound effects"
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 transform ${settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-6 border border-white/30">
              <h2 className={`text-lg font-light text-white mb-4 ${settings.largeText ? 'text-xl' : ''}`}>Display & Theme</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className={`text-white/80 ${settings.largeText ? 'text-lg' : ''}`}>Dark Mode</span>
                  <button
                    onClick={() => {
                      const newSettings = { ...settings, darkMode: !settings.darkMode };
                      setSettings(newSettings);
                      localStorage.setItem('weatherSettings', JSON.stringify(newSettings));
                    }}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 ${settings.darkMode ? 'bg-indigo-500' : 'bg-white/30'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 transform ${settings.darkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-white/80 ${settings.largeText ? 'text-lg' : ''}`}>Show Animations</span>
                  <button
                    onClick={() => {
                      const newSettings = { ...settings, showAnimations: !settings.showAnimations };
                      setSettings(newSettings);
                      localStorage.setItem('weatherSettings', JSON.stringify(newSettings));
                    }}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 ${settings.showAnimations ? 'bg-pink-500' : 'bg-white/30'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 transform ${settings.showAnimations ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
                
                <div>
                  <label className={`block text-white/80 mb-2 ${settings.largeText ? 'text-lg' : ''}`}>Theme</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => {
                      const newSettings = { ...settings, theme: e.target.value };
                      setSettings(newSettings);
                      localStorage.setItem('weatherSettings', JSON.stringify(newSettings));
                    }}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-md rounded-xl text-white border border-white/30 focus:outline-none focus:border-white/50"
                  >
                    <option value="auto" className="bg-gray-800">Auto</option>
                    <option value="light" className="bg-gray-800">Light</option>
                    <option value="dark" className="bg-gray-800">Dark</option>
                    <option value="system" className="bg-gray-800">System</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-6 border border-white/30">
              <h2 className={`text-lg font-light text-white mb-4 ${settings.largeText ? 'text-xl' : ''}`}>Data & Updates</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className={`text-white/80 ${settings.largeText ? 'text-lg' : ''}`}>Auto Refresh</span>
                  <button
                    onClick={() => {
                      const newSettings = { ...settings, autoRefresh: !settings.autoRefresh };
                      setSettings(newSettings);
                      localStorage.setItem('weatherSettings', JSON.stringify(newSettings));
                    }}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 ${settings.autoRefresh ? 'bg-teal-500' : 'bg-white/30'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 transform ${settings.autoRefresh ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-white/80 ${settings.largeText ? 'text-lg' : ''}`}>Notifications</span>
                  <button
                    onClick={() => {
                      const newSettings = { ...settings, notifications: !settings.notifications };
                      setSettings(newSettings);
                      localStorage.setItem('weatherSettings', JSON.stringify(newSettings));
                    }}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 ${settings.notifications ? 'bg-orange-500' : 'bg-white/30'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 transform ${settings.notifications ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
                
                <div>
                  <label className={`block text-white/80 mb-2 ${settings.largeText ? 'text-lg' : ''}`}>Refresh Interval</label>
                  <select
                    value={settings.refreshInterval}
                    onChange={(e) => {
                      const newSettings = { ...settings, refreshInterval: e.target.value };
                      setSettings(newSettings);
                      localStorage.setItem('weatherSettings', JSON.stringify(newSettings));
                    }}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-md rounded-xl text-white border border-white/30 focus:outline-none focus:border-white/50"
                  >
                    <option value="1" className="bg-gray-800">1 minute</option>
                    <option value="5" className="bg-gray-800">5 minutes</option>
                    <option value="10" className="bg-gray-800">10 minutes</option>
                    <option value="30" className="bg-gray-800">30 minutes</option>
                    <option value="60" className="bg-gray-800">1 hour</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {selectedDay && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelectedDay(null)}>
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md w-full my-8 animate-in fade-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-light text-white">{selectedDay.day} Details</h2>
                <button onClick={() => setSelectedDay(null)} className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all duration-300">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
              </div>
              
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  {getWeatherIcon(selectedDay.condition, 'w-20 h-20')}
                </div>
                <div className="text-4xl font-ultralight text-white mb-2">
                  {selectedDay.high}° / {selectedDay.low}°
                </div>
                <div className="text-white/70 text-lg capitalize">{selectedDay.condition}</div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/10 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/70">Morning</span>
                    <span className="text-white">{Math.round(selectedDay.low + (selectedDay.high - selectedDay.low) * 0.3)}°</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-yellow-400 rounded-full" style={{width: '30%'}}></div>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/70">Afternoon</span>
                    <span className="text-white">{selectedDay.high}°</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-400 to-red-400 rounded-full" style={{width: '100%'}}></div>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/70">Evening</span>
                    <span className="text-white">{Math.round(selectedDay.low + (selectedDay.high - selectedDay.low) * 0.7)}°</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-purple-400 rounded-full" style={{width: '70%'}}></div>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/70">Night</span>
                    <span className="text-white">{selectedDay.low}°</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-400 to-blue-400 rounded-full" style={{width: '20%'}}></div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white/10 rounded-2xl p-4 text-center">
                  <div className="text-white/70 text-sm mb-1">Precipitation</div>
                  <div className="text-white text-lg">{selectedDay.condition === 'rainy' ? '80%' : selectedDay.condition === 'cloudy' ? '30%' : '10%'}</div>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 text-center">
                  <div className="text-white/70 text-sm mb-1">Wind</div>
                  <div className="text-white text-lg">{Math.round(weather.windSpeed + Math.random() * 10)} km/h</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {currentScreen === 'map' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <button 
                onClick={() => setMapLayer('precipitation')}
                className={`backdrop-blur-lg rounded-3xl p-6 border transition-all duration-300 text-left ${
                  mapLayer === 'precipitation' 
                    ? 'bg-white/30 border-white/50' 
                    : 'bg-white/20 border-white/30 hover:bg-white/25'
                }`}
              >
                <h3 className="text-white text-lg font-light mb-2">Precipitation</h3>
                <p className="text-white/70 text-sm">View rainfall and snow patterns</p>
              </button>
              
              <button 
                onClick={() => setMapLayer('temp')}
                className={`backdrop-blur-lg rounded-3xl p-6 border transition-all duration-300 text-left ${
                  mapLayer === 'temp' 
                    ? 'bg-white/30 border-white/50' 
                    : 'bg-white/20 border-white/30 hover:bg-white/25'
                }`}
              >
                <h3 className="text-white text-lg font-light mb-2">Temperature</h3>
                <p className="text-white/70 text-sm">See temperature variations</p>
              </button>
              
              <button 
                onClick={() => setMapLayer('wind')}
                className={`backdrop-blur-lg rounded-3xl p-6 border transition-all duration-300 text-left ${
                  mapLayer === 'wind' 
                    ? 'bg-white/30 border-white/50' 
                    : 'bg-white/20 border-white/30 hover:bg-white/25'
                }`}
              >
                <h3 className="text-white text-lg font-light mb-2">Wind Patterns</h3>
                <p className="text-white/70 text-sm">Track wind speed and direction</p>
              </button>
            </div>
            
            <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-6 border border-white/30">
              <h3 className="text-white text-lg font-light mb-4">Interactive Weather Map - {mapLayer === 'precipitation' ? 'Precipitation' : mapLayer === 'temp' ? 'Temperature' : 'Wind Patterns'}</h3>
              <div className="bg-white/10 rounded-2xl h-96 flex items-center justify-center border border-white/20">
                <div className="text-center">
                  <Map className="w-16 h-16 text-white/50 mx-auto mb-4" />
                  <p className="text-white/70">Weather map integration</p>
                  <p className="text-white/50 text-sm mt-2">Showing {mapLayer === 'precipitation' ? 'Precipitation' : mapLayer === 'temp' ? 'Temperature' : 'Wind Patterns'} data</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherApp;

// Enhanced loading skeleton component
const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-6" role="status" aria-label="Loading weather data">
    <div className="glass-card rounded-3xl p-8 animate-shimmer">
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 bg-white/20 rounded w-32 animate-liquid"></div>
        <div className="h-4 bg-white/20 rounded w-24"></div>
      </div>
      <div className="flex items-center space-x-6">
        <div className="w-16 h-16 bg-white/20 rounded-full animate-float"></div>
        <div className="space-y-2">
          <div className="h-12 bg-white/20 rounded w-24 animate-number-pop"></div>
          <div className="h-4 bg-white/20 rounded w-32"></div>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-4 h-24 animate-float" style={{animationDelay: `${i * 100}ms`}}></div>
      ))}
    </div>
    <div className="sr-only">Loading weather information...</div>
  </div>
);

// Enhanced error display component
const ErrorDisplay = ({ error, onRetry, t }) => (
  <div className="glass-card rounded-3xl p-8 text-center animate-float" role="alert" aria-live="polite">
    <div className="text-red-400 text-6xl mb-4 animate-pulse-glow">⚠️</div>
    <h3 className="text-white text-xl font-light mb-2">{t('error')}</h3>
    <p className="text-white/70 mb-6">{error}</p>
    <button 
      onClick={onRetry}
      className="glass-button px-6 py-3 rounded-xl text-white font-light hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-white/50"
      aria-label={`${t('tryAgain')} - ${error}`}
    >
      {t('tryAgain')}
    </button>
  </div>
);

// Clean chart components matching liquid glass design
const ArcGauge = ({ value, max, colorStops, labels }) => {
  const percent = Math.min(Math.max(value, 0), max) / max;
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percent * circumference);
  
  const getColor = () => {
    if (colorStops.length === 1) return colorStops[0];
    const idx = Math.min(Math.floor(percent * colorStops.length), colorStops.length - 1);
    return colorStops[idx];
  };
  
  const getLabel = () => {
    if (labels.length === 1) return labels[0];
    const idx = Math.min(Math.floor(percent * labels.length), labels.length - 1);
    return labels[idx];
  };
  
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
        <circle 
          cx="60" cy="60" r="45" fill="none" 
          stroke={getColor()} strokeWidth="8" 
          strokeDasharray={strokeDasharray} 
          strokeDashoffset={strokeDashoffset} 
          strokeLinecap="round" 
          className="transition-all duration-1500 ease-out animate-chart-draw"
          style={{filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))'}}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl font-light">{value}</div>
          <div className="text-white/60 text-xs">{getLabel()}</div>
        </div>
      </div>
    </div>
  );
};

const StackedBar = ({ value, max, steps, color }) => {
  return (
    <div className="flex flex-col items-center space-y-1">
      {Array.from({ length: steps }, (_, i) => {
        const stepValue = ((i + 1) * max) / steps;
        const filled = value >= stepValue;
        const width = `${20 + i * 8}px`;
        return (
          <div 
            key={i} 
            className={`h-2 rounded-full transition-all duration-500 ${
              filled ? color : 'bg-white/20'
            }`}
            style={{ width }}
          />
        );
      }).reverse()}
    </div>
  );
};