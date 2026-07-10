# Forecast Specification

## Purpose

The forecast capability fetches weather for the active location selected by
city-search and renders the first data-rich view: seven daily cards, a 48-hour
temperature chart, and today's sunrise/sunset note.

## Requirements

### Requirement: Seven-day forecast fetch

The system SHALL fetch a 7-day forecast from the Open-Meteo forecast API after a
location is selected (`FR-FORECAST-01`).

#### Scenario: Active location starts forecast request

- **GIVEN** the visitor selects a city with latitude and longitude
- **WHEN** the forecast panel renders
- **THEN** it requests `https://api.open-meteo.com/v1/forecast`
- **AND** the request includes daily weather code, hi/lo temperature,
  precipitation probability, wind speed, sunrise, and sunset
- **AND** the request includes hourly temperature for the next 48 hours

### Requirement: Seven day cards

The system SHALL render 7 day cards with weekday name, hi/lo °C, weather icon,
precipitation probability %, and wind speed (`FR-FORECAST-02`).

#### Scenario: Forecast cards summarize each day

- **GIVEN** a successful 7-day forecast response
- **WHEN** the forecast panel renders
- **THEN** exactly 7 day cards are shown
- **AND** each card includes weekday, hi/lo temperature, icon, precipitation
  probability, and wind speed

### Requirement: Hourly temperature chart

The system SHALL render an hourly temperature line chart for the next 48 hours
using Recharts (`FR-FORECAST-03`).

#### Scenario: Next 48 hours are charted

- **GIVEN** hourly forecast data is available
- **WHEN** the chart renders
- **THEN** it uses the first 48 hourly points
- **AND** it shows temperature in °C over time

### Requirement: Sunrise and sunset note

The system SHALL show today's sunrise and sunset as small text under the hourly
chart (`FR-FORECAST-04`).

#### Scenario: Today's sun times render

- **GIVEN** daily sunrise and sunset data is available
- **WHEN** the forecast panel renders
- **THEN** the panel shows today's sunrise time
- **AND** it shows today's sunset time

### Requirement: Refetch and memory cache

The system SHALL re-fetch when the active location changes and cache the last
successful response in memory until the next location switch (`FR-FORECAST-05`).

#### Scenario: Same location uses memory cache

- **GIVEN** a forecast response was fetched successfully for a location
- **WHEN** the same location is requested again
- **THEN** the cached response is reused

#### Scenario: New location fetches fresh forecast

- **GIVEN** a forecast response was fetched for one location
- **WHEN** the active location changes to another location
- **THEN** a new forecast request is made

### Requirement: Comfort data integration

The system SHALL include comfort badge and weekend highlight data from the
existing comfort-score helpers when daily forecast data is available
(`FR-COMFORT-04`, `FR-COMFORT-05`).

#### Scenario: Day cards include comfort badge data

- **GIVEN** daily forecast data contains apparent temperature, precipitation,
  wind, UV index, and weather code
- **WHEN** day cards are normalized
- **THEN** each card includes a comfort score, badge tier, and rationale

#### Scenario: Weekend highlight is derived from forecast days

- **GIVEN** Saturday and Sunday forecast days are available
- **WHEN** the forecast panel renders
- **THEN** the weekend highlight uses the existing `weekendComfortHighlight`
  helper
