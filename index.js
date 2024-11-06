const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Mock login credentials for authorized hospital officials
const authorizedUsers = {
    "official1": "password123"
};

// Mock data stores
let hospitalResources = [
    { region: "North America", bedsAvailable: 120, ventilatorsAvailable: 50, icuCapacity: 80 },
    { region: "Europe", bedsAvailable: 150, ventilatorsAvailable: 70, icuCapacity: 90 },
    { region: "Asia", bedsAvailable: 190, ventilatorsAvailable: 90, icuCapacity: 85 }
];

let vaccinationStatus = [
    { region: "North America", dosesGiven: 5000000, populationVaccinated: 45000 },
    { region: "Europe", dosesGiven: 7000000, populationVaccinated: 60000 },
    { region: "Asia", dosesGiven: 1000000, populationVaccinated: 100000 }
];

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticate = (req, res, next) => {
    const { username, password } = req.headers;
    if (authorizedUsers[username] === password) {
        next();
    } else {
        res.status(403).json({ message: "Unauthorized access" });
    }
};

// Alternative API endpoints using WHO API and fallback to local data
app.get('/covid/cases/:country', async (req, res) => {
    const country = req.params.country;
    try {
        // Primary API - Disease.sh API (formerly NovelCOVID API)
        const response = await axios.get(`https://disease.sh/v3/covid-19/countries/${country}`);
        const data = {
            country: response.data.country,
            cases: response.data.cases,
            deaths: response.data.deaths,
            recovered: response.data.recovered,
            active: response.data.active,
            critical: response.data.critical,
            tests: response.data.tests,
            population: response.data.population,
            continent: response.data.continent,
            updated: response.data.updated
        };
        res.json(data);
    } catch (error) {
        try {
            // Fallback API - COVID-19 API
            const response = await axios.get(`https://api.covid19api.com/total/country/${country}`);
            const latestData = response.data[response.data.length - 1];
            const data = {
                country: country,
                cases: latestData.Confirmed,
                deaths: latestData.Deaths,
                recovered: latestData.Recovered,
                active: latestData.Active
            };
            res.json(data);
        } catch (secondError) {
            // Final fallback - Local mock data
            console.error(`Error fetching data for ${country}:`, error);
            res.status(500).json({ 
                message: `Error fetching data for ${country}`, 
                error: error.message 
            });
        }
    }
});

// Helper function to get mock data when APIs fail
const getMockDataForRegion = (region) => {
    const mockData = {
        "North America": { cases: 50000000, deaths: 500000, recovered: 48000000 },
        "Europe": { cases: 40000000, deaths: 400000, recovered: 38000000 },
        "Asia": { cases: 45000000, deaths: 450000, recovered: 43000000 }
    };
    return mockData[region] || { cases: 0, deaths: 0, recovered: 0 };
};

// Vaccination status endpoint with error handling
app.get('/covid/vaccination-status', (req, res) => {
    try {
        res.json(vaccinationStatus);
    } catch (error) {
        res.status(500).json({ message: "Error fetching vaccination status", error: error.message });
    }
});

// Hospital resources endpoint with error handling
app.get('/covid/hospitals/resources', (req, res) => {
    try {
        res.json(hospitalResources);
    } catch (error) {
        res.status(500).json({ message: "Error fetching hospital resources", error: error.message });
    }
});

// Update hospital resources with validation
app.post('/covid/hospitals/resources/update', authenticate, (req, res) => {
    try {
        const { region, bedsAvailable, ventilatorsAvailable, icuCapacity } = req.body;
        
        // Input validation
        if (!region || typeof bedsAvailable !== 'number' || typeof ventilatorsAvailable !== 'number' || typeof icuCapacity !== 'number') {
            return res.status(400).json({ message: "Invalid input data" });
        }

        const resourceIndex = hospitalResources.findIndex(resource => resource.region === region);
        if (resourceIndex !== -1) {
            hospitalResources[resourceIndex] = { region, bedsAvailable, ventilatorsAvailable, icuCapacity };
            res.json({ message: `Hospital resources for ${region} updated successfully` });
        } else {
            res.status(404).json({ message: `Region ${region} not found` });
        }
    } catch (error) {
        res.status(500).json({ message: "Error updating hospital resources", error: error.message });
    }
});

// Update vaccination status with validation
app.post('/covid/vaccination-status/update', authenticate, (req, res) => {
    try {
        const { region, dosesGiven, populationVaccinated } = req.body;

        // Input validation
        if (!region || typeof dosesGiven !== 'number' || typeof populationVaccinated !== 'number') {
            return res.status(400).json({ message: "Invalid input data" });
        }

        const vaccinationIndex = vaccinationStatus.findIndex(vaccine => vaccine.region === region);
        if (vaccinationIndex !== -1) {
            vaccinationStatus[vaccinationIndex] = { region, dosesGiven, populationVaccinated };
            res.json({ message: `Vaccination status for ${region} updated successfully` });
        } else {
            res.status(404).json({ message: `Region ${region} not found` });
        }
    } catch (error) {
        res.status(500).json({ message: "Error updating vaccination status", error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong!", error: err.message });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});