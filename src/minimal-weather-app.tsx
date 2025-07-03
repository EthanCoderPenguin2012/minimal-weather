import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Eye, Droplets, Thermometer, MapPin, Search, Loader, Settings, ArrowLeft, Map } from 'lucide-react';

const WeatherApp = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cities, setCities] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('weather');
  const [selectedDay, setSelectedDay] = useState(null);
  const [settings, setSettings] = useState({
    defaultLocation: 'London',
    units: 'metric',
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    autoRefresh: true,
    notifications: false,
    darkMode: true,
    showAnimations: true,
    refreshInterval: '5',
    theme: 'auto'
  });

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

  const API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;

  const mapWeatherCondition = (weatherId) => {
    if (weatherId >= 200 && weatherId < 600) return 'rainy';
    if (weatherId >= 600 && weatherId < 700) return 'snowy';
    if (weatherId >= 700 && weatherId < 800) return 'cloudy';
    if (weatherId === 800) return 'sunny';
    return 'cloudy';
  };

  const fetchWeatherData = async (city) => {
    const [currentResponse, forecastResponse] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`)
    ]);
    
    if (!currentResponse.ok) throw new Error('City not found');
    
    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();
    
    const forecast = forecastData.list
      .filter((_, index) => index % 8 === 0)
      .slice(0, 5)
      .map((item, index) => ({
        day: index === 0 ? 'Today' : new Date(item.dt * 1000).toLocaleDateString('en', { weekday: 'short' }),
        high: Math.round(item.main.temp_max),
        low: Math.round(item.main.temp_min),
        condition: mapWeatherCondition(item.weather[0].id)
      }));
    
    const hourlyForecast = forecastData.list
      .slice(0, 24)
      .map(item => ({
        time: new Date(item.dt * 1000).getHours(),
        temperature: Math.round(item.main.temp),
        condition: mapWeatherCondition(item.weather[0].id),
        humidity: item.main.humidity
      }));
    
    const now = new Date();
    const isAprilFools = now.getMonth() === 3 && now.getDate() === 1;
    
    if (isAprilFools) {
      return {
        city: currentData.name,
        country: currentData.sys.country,
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
        hourlyForecast: Array(12).fill().map((_, i) => ({ time: i, temperature: 999, condition: 'snowy', humidity: 420 }))
      };
    }
    
    return {
      city: currentData.name,
      country: currentData.sys.country,
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
      hourlyForecast
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
    switch(condition) {
      case 'sunny': return 'from-amber-400 via-orange-500 to-red-500';
      case 'cloudy': return 'from-slate-400 via-slate-500 to-slate-600';
      case 'rainy': return 'from-slate-600 via-blue-600 to-blue-700';
      case 'snowy': return 'from-slate-300 via-blue-400 to-blue-500';
      default: return 'from-blue-400 via-blue-500 to-blue-600';
    }
  };

  const searchWeather = async (city = location) => {
    if (!city.trim()) return;
    
    setLoading(true);
    setError('');
    setShowSuggestions(false);
    
    try {
      const weatherData = await fetchWeatherData(city);
      setWeather(weatherData);
      setLocation('');
    } catch (error) {
      setError('City not found or API error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    try {
      const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`);
      const data = await response.json();
      const suggestions = data.map(item => ({
        name: item.name,
        country: item.country,
        state: item.state,
        display: `${item.name}${item.state ? ', ' + item.state : ''}, ${item.country}`
      }));
      setSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setLocation(value);
    fetchSuggestions(value);
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
      try {
        const weatherData = await fetchWeatherData(settings.defaultLocation);
        setWeather(weatherData);
      } catch (error) {
        setError('Failed to load weather data');
      }
    };
    
    loadSettings();
    
    loadCities();
    loadInitialWeather();
  }, []);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${weather ? getGradientBackground(weather.condition) : 'from-blue-400 via-blue-500 to-blue-600'} transition-all duration-1000 ease-in-out animate-gradient-x`} style={{'--tw-gradient-stops': 'var(--tw-gradient-from), var(--tw-gradient-to, rgba(59, 130, 246, 0))'}}>
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm">
        {weather && weather.condition === 'sunny' && (
          <div className="absolute inset-0">
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
          {[...Array(20)].map((_, i) => (
            <div key={i} className={`absolute w-2 h-2 bg-white/20 rounded-full animate-float`} style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
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
              className="w-full px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base bg-white/10 backdrop-blur-xl rounded-2xl text-white placeholder-white/60 border border-white/20 shadow-lg focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all duration-300 transform hover:scale-105 focus:animate-pulse" style={{backdropFilter: 'blur(16px) saturate(150%)'}}
            />
            <button
              onClick={() => searchWeather()}
              disabled={loading}
              className="absolute right-2 top-2 p-2 bg-white/15 backdrop-blur-lg rounded-xl shadow-md hover:bg-white/25 hover:scale-110 hover:rotate-12 transition-all duration-300 transform active:scale-95" style={{backdropFilter: 'blur(12px) saturate(140%)'}}
            >
              {loading ? (
                <Loader className="w-5 h-5 text-white animate-spin animate-pulse" />
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
            <p className="text-center text-white/80 mt-3 bg-white/20 rounded-lg py-2 max-w-md mx-auto animate-in fade-in slide-in-from-top-1 duration-300">
              {error}
            </p>
          )}
          </div>
        )}

        {currentScreen === 'weather' && weather && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-8 mb-6 sm:mb-8 border border-white/20 shadow-2xl hover:bg-white/15 hover:border-white/30 transition-all duration-300 transform hover:scale-[1.02] hover:rotate-1 hover:shadow-3xl animate-fade-in-up" style={{backdropFilter: 'blur(20px) saturate(180%)'}}>
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
                  <div className="animate-bounce-slow hover:animate-spin-slow transition-all duration-500">
                    {getWeatherIcon(weather.condition, 'w-16 h-16')}
                  </div>
                  <div>
                    <div className="text-4xl sm:text-6xl font-ultralight text-white mb-2 animate-number-count hover:animate-pulse text-center sm:text-left">
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
                <div key={index} className="bg-white/8 backdrop-blur-xl rounded-2xl p-4 border border-white/15 shadow-lg hover:bg-white/12 hover:border-white/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 hover:rotate-2 animate-in fade-in slide-in-from-bottom-2 duration-300 hover:shadow-xl" style={{animationDelay: `${index * 100}ms`, backdropFilter: 'blur(16px) saturate(150%)'}}>
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
                    <div key={index} className="flex-shrink-0 text-center bg-white/10 rounded-2xl p-3 min-w-[70px] hover:bg-white/15 transition-all duration-300">
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
                  <div key={index} onClick={() => setSelectedDay({...day, index})} className="text-center hover:bg-white/10 rounded-xl p-3 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-2 duration-300 hover:shadow-md cursor-pointer" style={{animationDelay: `${300 + index * 100}ms`}}>
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
                    <defs>
                      <linearGradient id="tempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                      </linearGradient>
                    </defs>
                    {weather.forecast.map((day, index) => {
                      const x = (index * 60) + 30;
                      const highY = 120 - ((day.high - 10) * 2);
                      const lowY = 120 - ((day.low - 10) * 2);
                      return (
                        <g key={index}>
                          <circle cx={x} cy={highY} r="4" fill="#ff6b6b" className="animate-chart-point" style={{animationDelay: `${index * 200}ms`}} />
                          <circle cx={x} cy={lowY} r="4" fill="#4ecdc4" className="animate-chart-point" style={{animationDelay: `${index * 200 + 100}ms`}} />
                          {index < weather.forecast.length - 1 && (
                            <>
                              <line x1={x} y1={highY} x2={(index + 1) * 60 + 30} y2={120 - ((weather.forecast[index + 1].high - 10) * 2)} stroke="#ff6b6b" strokeWidth="3" opacity="0.8" className="animate-draw-line" style={{animationDelay: `${index * 300}ms`}} />
                              <line x1={x} y1={lowY} x2={(index + 1) * 60 + 30} y2={120 - ((weather.forecast[index + 1].low - 10) * 2)} stroke="#4ecdc4" strokeWidth="3" opacity="0.8" className="animate-draw-line" style={{animationDelay: `${index * 300 + 150}ms`}} />
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
                <h3 className="text-white/90 text-lg font-light mb-6">Weather Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Humidity</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-white/10 backdrop-blur-sm rounded-full overflow-hidden border border-white/20">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-800" style={{width: `${weather.humidity}%`}}></div>
                      </div>
                      <span className="text-white text-sm">{weather.humidity}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Wind Speed</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-white/10 backdrop-blur-sm rounded-full overflow-hidden border border-white/20">
                        <div className="h-full bg-green-500 rounded-full transition-all duration-800" style={{width: `${Math.min(weather.windSpeed * 2, 100)}%`}}></div>
                      </div>
                      <span className="text-white text-sm">{weather.windSpeed} km/h</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Visibility</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-white/10 backdrop-blur-sm rounded-full overflow-hidden border border-white/20">
                        <div className="h-full bg-purple-500 rounded-full transition-all duration-800" style={{width: `${Math.min(weather.visibility * 10, 100)}%`}}></div>
                      </div>
                      <span className="text-white text-sm">{weather.visibility} km</span>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <div className="text-white/70 text-sm mb-4 text-center">Pressure</div>
                    <div className="relative w-32 h-32 mx-auto">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                        <circle cx="60" cy="60" r="45" fill="none" stroke="url(#pressureGradient)" strokeWidth="6" strokeDasharray="283" strokeDashoffset={283 - (((weather.pressure - 980) / 60) * 283)} strokeLinecap="round" className="animate-pressure-dial" />
                        <defs>
                          <linearGradient id="pressureGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="50%" stopColor="#eab308" />
                            <stop offset="100%" stopColor="#ef4444" />
                          </linearGradient>
                        </defs>
                        <g className="animate-dial-needle" style={{'--pressure-angle': `${((weather.pressure - 980) / 60) * 180 - 90}deg`}}>
                          <line x1="60" y1="60" x2="60" y2="25" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                          <circle cx="60" cy="60" r="4" fill="#ffffff" />
                        </g>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center mt-8">
                          <div className="text-white text-lg font-light">{weather.pressure}</div>
                          <div className="text-white/60 text-xs">hPa</div>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 text-xs text-white/50">Low</div>
                      <div className="absolute bottom-2 right-2 text-xs text-white/50">High</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-6 sm:mt-8">
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: '600ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Humidity</h3>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="45" fill="none" stroke="url(#humidityGradient)" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - ((weather.humidity / 100) * 283)} strokeLinecap="round" className="animate-pressure-dial" />
                    <defs>
                      <linearGradient id="humidityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="50%" stopColor="#0891b2" />
                        <stop offset="100%" stopColor="#0e7490" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-white text-xl font-light">{weather.humidity}%</div>
                      <div className="text-white/60 text-xs">Humidity</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: '650ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">UV Index</h3>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="45" fill="none" stroke="url(#uvGradient)" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - ((Math.max(weather.uvIndex, 1) / 11) * 283)} strokeLinecap="round" className="animate-pressure-dial" style={{animationDelay: '0.2s'}} />
                    <defs>
                      <linearGradient id="uvGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="30%" stopColor="#eab308" />
                        <stop offset="60%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-white text-xl font-light">{Math.max(weather.uvIndex, 1)}</div>
                      <div className="text-white/60 text-xs">
                        {weather.uvIndex <= 2 ? 'Low' : weather.uvIndex <= 5 ? 'Moderate' : weather.uvIndex <= 7 ? 'High' : weather.uvIndex <= 10 ? 'Very High' : 'Extreme'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: '700ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Hourly Forecast</h3>
                <div className="relative h-24">
                  <svg className="w-full h-full" viewBox="0 0 240 80">
                    <defs>
                      <linearGradient id="hourlyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                      </linearGradient>
                    </defs>
                    {[...Array(6)].map((_, index) => {
                      const x = index * 40 + 20;
                      const temp = weather.temperature + Math.sin(index) * 3;
                      const y = 80 - ((temp - weather.temperature + 10) * 2);
                      return (
                        <g key={index}>
                          <rect x={x-15} y={80} width="30" height={80-y} fill="url(#hourlyGradient)" rx="4" className="animate-bar-grow hover:animate-bounce" style={{animationDelay: `${index * 150}ms`}} />
                          <text x={x} y="75" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8">{index * 3}h</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
              
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: '800ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Wind Speed</h3>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="45" fill="none" stroke="url(#windGradient)" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - ((Math.min(weather.windSpeed, 50) / 50) * 283)} strokeLinecap="round" className="animate-pressure-dial" style={{animationDelay: '0.4s'}} />
                    <defs>
                      <linearGradient id="windGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="50%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-white text-lg font-light">{weather.windSpeed}</div>
                      <div className="text-white/60 text-xs">km/h</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: '850ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Air Quality</h3>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="45" fill="none" stroke="url(#airGradient)" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - ((weather.visibility / 15) * 283)} strokeLinecap="round" className="animate-pressure-dial" style={{animationDelay: '0.6s'}} />
                    <defs>
                      <linearGradient id="airGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#dc2626" />
                        <stop offset="50%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-white text-lg font-light">{weather.visibility}</div>
                      <div className="text-white/60 text-xs">km vis</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: '900ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Weekly Overview</h3>
                <div className="relative h-40">
                  <svg className="w-full h-full" viewBox="0 0 350 150">
                    <defs>
                      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(78, 205, 196, 0.3)" />
                        <stop offset="100%" stopColor="rgba(78, 205, 196, 0.1)" />
                      </linearGradient>
                    </defs>
                    {weather.forecast.map((day, index) => {
                      const x = index * 70 + 35;
                      const highY = 30 + ((35 - day.high) * 2);
                      const lowY = 30 + ((35 - day.low) * 2);
                      return (
                        <g key={index}>
                          <rect x={x-20} y={lowY} width="40" height={0} fill="url(#areaGradient)" rx="4" className="animate-area-fill" style={{animationDelay: `${index * 200}ms`, '--final-height': `${lowY - highY}px`, '--final-y': `${highY}px`}} />
                          <circle cx={x} cy={highY} r="5" fill="#ff6b6b" className="animate-chart-point" style={{animationDelay: `${index * 250}ms`}} />
                          <circle cx={x} cy={lowY} r="5" fill="#4ecdc4" className="animate-chart-point" style={{animationDelay: `${index * 250 + 100}ms`}} />
                          <text x={x} y="145" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="10">{day.day.slice(0, 3)}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
              
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: '1000ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Comfort Index</h3>
                <div className="space-y-6">
                  <div className="relative">
                    <div className="flex justify-between text-sm text-white/70 mb-2">
                      <span>Temperature</span>
                      <span>{weather.temperature}°</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 backdrop-blur-sm rounded-full overflow-hidden border border-white/20">
                      <div className="h-full bg-orange-500 rounded-full transition-all duration-800" style={{width: `${((weather.temperature + 10) / 50) * 100}%`}}></div>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="flex justify-between text-sm text-white/70 mb-2">
                      <span>Feels Like</span>
                      <span>{weather.feelsLike}°</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 backdrop-blur-sm rounded-full overflow-hidden border border-white/20">
                      <div className="h-full bg-yellow-500 rounded-full transition-all duration-800" style={{width: `${((weather.feelsLike + 10) / 50) * 100}%`}}></div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-white/10 rounded-xl">
                    <div className="text-center">
                      <div className="text-2xl font-light text-white mb-1">
                        {weather.humidity > 70 ? 'High' : weather.humidity > 40 ? 'Moderate' : 'Low'}
                      </div>
                      <div className="text-white/60 text-sm">Comfort Level</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 duration-500 liquid-glass" style={{animationDelay: '1200ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Yearly Temperature</h3>
                <div className="relative h-40">
                  <svg className="w-full h-full" viewBox="0 0 360 150">
                    {[...Array(12)].map((_, index) => {
                      const x = index * 30 + 15;
                      const temp = weather.temperature + Math.sin((index - 6) * Math.PI / 6) * 15;
                      const y = 150 - ((temp + 20) * 2);
                      return (
                        <g key={index}>
                          <circle cx={x} cy={y} r="3" fill={temp > weather.temperature ? '#ef4444' : '#3b82f6'} className="animate-chart-point" style={{animationDelay: `${index * 100}ms`}} />
                          {index < 11 && (
                            <line x1={x} y1={y} x2={(index + 1) * 30 + 15} y2={150 - ((weather.temperature + Math.sin(((index + 1) - 6) * Math.PI / 6) * 15 + 20) * 2)} stroke="#ffffff" strokeWidth="2" opacity="0.6" className="animate-draw-line" style={{animationDelay: `${index * 150}ms`}} />
                          )}
                          <text x={x} y="145" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8">{['J','F','M','A','M','J','J','A','S','O','N','D'][index]}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-red-400 font-light">Hottest</div>
                    <div className="text-white">July: {Math.round(weather.temperature + 15)}°</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-light">Coldest</div>
                    <div className="text-white">January: {Math.round(weather.temperature - 15)}°</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 duration-500 liquid-glass" style={{animationDelay: '1300ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Precipitation & Wind</h3>
                <div className="relative h-40">
                  <svg className="w-full h-full" viewBox="0 0 360 150">
                    {[...Array(12)].map((_, index) => {
                      const x = index * 30 + 15;
                      const rain = 20 + Math.sin(index * Math.PI / 3) * 15;
                      const wind = weather.windSpeed + Math.cos(index * Math.PI / 4) * 8;
                      const rainY = 150 - (rain * 2);
                      const windY = 150 - (wind * 3);
                      return (
                        <g key={index}>
                          <rect x={x-8} y={rainY} width="16" height={150-rainY} fill="rgba(59, 130, 246, 0.6)" rx="2" className="animate-bar-grow" style={{animationDelay: `${index * 100}ms`}} />
                          <circle cx={x} cy={windY} r="2" fill="#10b981" className="animate-chart-point" style={{animationDelay: `${index * 120}ms`}} />
                          <text x={x} y="145" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8">{['J','F','M','A','M','J','J','A','S','O','N','D'][index]}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-blue-400 font-light">Rainiest</div>
                    <div className="text-white">March: 35mm</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-400 font-light">Windiest</div>
                    <div className="text-white">November: {Math.round(weather.windSpeed + 8)} km/h</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 duration-500 liquid-glass" style={{animationDelay: '1400ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Climate Averages</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Avg Temperature</span>
                    <span className="text-white font-light">{weather.temperature}°</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 backdrop-blur-sm rounded-full overflow-hidden border border-white/20">
                    <div className="h-full bg-red-500 rounded-full transition-all duration-800" style={{width: `${((weather.temperature + 20) / 60) * 100}%`}}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Avg Humidity</span>
                    <span className="text-white font-light">{weather.humidity}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 backdrop-blur-sm rounded-full overflow-hidden border border-white/20">
                    <div className="h-full bg-cyan-500 rounded-full transition-all duration-800" style={{width: `${weather.humidity}%`}}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Avg Wind</span>
                    <span className="text-white font-light">{weather.windSpeed} km/h</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 backdrop-blur-sm rounded-full overflow-hidden border border-white/20">
                    <div className="h-full bg-teal-500 rounded-full transition-all duration-800" style={{width: `${Math.min(weather.windSpeed * 2, 100)}%`}}></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 duration-500 liquid-glass" style={{animationDelay: '1500ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Seasonal Breakdown</h3>
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#22c55e" strokeWidth="8" strokeDasharray="71 212" strokeLinecap="round" className="animate-pressure-dial" />
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#eab308" strokeWidth="8" strokeDasharray="71 212" strokeDashoffset="-71" strokeLinecap="round" className="animate-pressure-dial" style={{animationDelay: '0.2s'}} />
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#f97316" strokeWidth="8" strokeDasharray="71 212" strokeDashoffset="-142" strokeLinecap="round" className="animate-pressure-dial" style={{animationDelay: '0.4s'}} />
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray="70 213" strokeDashoffset="-213" strokeLinecap="round" className="animate-pressure-dial" style={{animationDelay: '0.6s'}} />
                  </svg>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-white/80">Spring 25%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-white/80">Summer 25%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-white/80">Autumn 25%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-white/80">Winter 25%</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/8 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-xl hover:bg-white/12 hover:border-white/25 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 duration-500 liquid-glass" style={{animationDelay: '1600ms', backdropFilter: 'blur(18px) saturate(160%)'}}>
                <h3 className="text-white/90 text-lg font-light mb-6">Weather Records</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <div className="text-red-400 text-sm font-light">Highest Temp</div>
                    <div className="text-white text-lg">{Math.round(weather.temperature + 25)}°</div>
                    <div className="text-white/60 text-xs">July 2023</div>
                  </div>
                  
                  <div className="p-3 bg-white/10 rounded-xl">
                    <div className="text-blue-400 text-sm font-light">Lowest Temp</div>
                    <div className="text-white text-lg">{Math.round(weather.temperature - 25)}°</div>
                    <div className="text-white/60 text-xs">January 2022</div>
                  </div>
                  
                  <div className="p-3 bg-white/10 rounded-xl">
                    <div className="text-green-400 text-sm font-light">Max Wind</div>
                    <div className="text-white text-lg">{Math.round(weather.windSpeed + 35)} km/h</div>
                    <div className="text-white/60 text-xs">March 2023</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {currentScreen === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
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
              <h2 className={`text-lg font-light text-white mb-4 ${settings.largeText ? 'text-xl' : ''}`}>Temperature Units</h2>
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
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 transform ${settings.reducedMotion ? 'translate-x-6' : 'translate-x-0'}`}></div>
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
              <button className="bg-white/20 backdrop-blur-lg rounded-3xl p-6 border border-white/30 hover:bg-white/25 transition-all duration-300 text-left">
                <h3 className="text-white text-lg font-light mb-2">Precipitation</h3>
                <p className="text-white/70 text-sm">View rainfall and snow patterns</p>
              </button>
              
              <button className="bg-white/20 backdrop-blur-lg rounded-3xl p-6 border border-white/30 hover:bg-white/25 transition-all duration-300 text-left">
                <h3 className="text-white text-lg font-light mb-2">Temperature</h3>
                <p className="text-white/70 text-sm">See temperature variations</p>
              </button>
              
              <button className="bg-white/20 backdrop-blur-lg rounded-3xl p-6 border border-white/30 hover:bg-white/25 transition-all duration-300 text-left">
                <h3 className="text-white text-lg font-light mb-2">Wind Patterns</h3>
                <p className="text-white/70 text-sm">Track wind speed and direction</p>
              </button>
            </div>
            
            <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-6 border border-white/30">
              <h3 className="text-white text-lg font-light mb-4">Interactive Weather Map</h3>
              <div className="bg-white/10 rounded-2xl h-96 flex items-center justify-center border border-white/20">
                <div className="text-center">
                  <Map className="w-16 h-16 text-white/50 mx-auto mb-4" />
                  <p className="text-white/70">Weather map integration coming soon</p>
                  <p className="text-white/50 text-sm mt-2">Connect with mapping service for live weather data</p>
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