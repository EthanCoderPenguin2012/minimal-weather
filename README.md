# Minimal Weather

A beautiful, modern weather application built with React featuring liquid glass design, animated weather effects, and comprehensive weather data visualization.

## Features

- **Real-time Weather Data** - Current conditions, 5-day forecast, and detailed metrics
- **Interactive Weather Maps** - Precipitation, temperature, and wind pattern visualization
- **Liquid Glass UI** - Modern glassmorphism design with smooth animations
- **Responsive Design** - Optimized for both mobile and desktop
- **Weather Animations** - Dynamic sun, clouds, rain, and snow effects
- **Comprehensive Charts** - Temperature trends, yearly statistics, and data visualization
- **Accessibility Features** - High contrast, large text, and reduced motion options
- **Customizable Settings** - Default location, units, themes, and preferences

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Get an API key from [OpenWeatherMap](https://openweathermap.org/api)
4. Create a `.env` file in the root directory:
   ```
   REACT_APP_OPENWEATHER_API_KEY=your_api_key_here
   ```
5. Start the development server: `npm start`

## GitHub Pages Deployment

1. Fork or clone this repository to your GitHub account
2. Update the `homepage` field in `package.json` with your GitHub username:
   ```json
   "homepage": "https://yourusername.github.io/minimal-weather"
   ```
3. Go to your repository Settings → Secrets and variables → Actions
4. Add a new repository secret:
   - **Name:** `REACT_APP_OPENWEATHER_API_KEY`
   - **Value:** Your OpenWeatherMap API key
5. Push to the `main` branch - the app will automatically deploy to GitHub Pages
6. Enable GitHub Pages in repository Settings → Pages → Source: GitHub Actions

## Technologies Used

- React 18
- Tailwind CSS
- Lucide React Icons
- OpenWeatherMap API

## License

MIT License