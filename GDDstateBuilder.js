import {
    PRIMARY_COLOR,
    COMPARISON_COLOR,
    NORMAL_COLOR,
    EXTREMES_BACKGROUND_COLOR,
    FREEZING_COLOR,
    ANALOG_COLOR,
    CFS_COLOR
} from './constants';

/**
 * Builds the state for the GDD tool
 * 
 * @param { { data, primaryMappedData, primaryFilteredData, primaryYear } } primaryData
 * @param { { comparison, comparisonMappedData, comparisonFilteredData, comparisonYear } } comparisonData
 * @param { { analog, analogMappedData, analogFilteredData, analogYear } } analogData
 * @param { { normal, thirtyYearMappedData, thirtyYearFilteredData } } thirtyYearData
 * @param { { minimum, minimumMappedData, minimumFilteredData } } minimumData
 * @param { { maximum, maximumMappedData, maximumFilteredData } } maximumData
 * @param { { first_freezing_dates, firstFreezingMappedData, firstFreezingFilteredData } } firstFreezingData
 * @param { { last_freezing_dates, lastFreezingMappedData, lastFreezingFilteredData } } lastFreezingData
 * @param { { gefs, gefsMappedData, gefsFilteredData } } gefsData
 * @param { { cfs, cfsMappedData, cfsFilteredData } } cfsData
 * @param { { interval, closest_lat, closest_lng } } dataProperties
 * @param { Number } ci_interval
 * @param { Date[] } labels
 * @param { String } crop
 * 
 * @author Brandon Kwintner
 */
export const datasetStateBuilder = (primaryData, comparisonData, analogData, thirtyYearData, minimumData, maximumData, firstFreezingData, lastFreezingData, gefsData, cfsData, dataProperties, ci_interval, labels, crop) => {

    const { data, primaryMappedData, primaryFilteredData, year: primaryYear } = primaryData;
    const { normal, thirtyYearMappedData, thirtyYearFilteredData } = thirtyYearData;
    const { minimum, minimumMappedData, minimumFilteredData } = minimumData;
    const { maximum, maximumMappedData, maximumFilteredData } = maximumData;
    const { first_freezing_dates, firstFreezingMappedData, firstFreezingFilteredData } = firstFreezingData;
    const { last_freezing_dates, lastFreezingMappedData, lastFreezingFilteredData } = lastFreezingData;
    const { interval, closest_lat, closest_lng } = dataProperties;
    const scale = scaleGenerator(crop);

    /* Builds basic state with all data that is always included */
    var state = {
        primary: {
            initialData: {
                data: data,
                mappedData: primaryMappedData,
            },
            filteredData: primaryFilteredData,
        },
        thirtyYear: {
            initialData: {
                data: normal,
                mappedData: thirtyYearMappedData,
            },
            filteredData: thirtyYearFilteredData,
        },
        minimum: {
            initialData: {
                data: minimum,
                mappedData: minimumMappedData,
            },
            filteredData: minimumFilteredData,
        },
        maximum: {
            initialData: {
                data: maximum,
                mappedData: maximumMappedData,
            },
            filteredData: maximumFilteredData,
        },
        freezing: {
            first: {
                initialData: {
                    data: first_freezing_dates,
                    mappedData: firstFreezingMappedData
                },
                filteredData: firstFreezingFilteredData
            },
            last: {
                initialData: {
                    data: last_freezing_dates,
                    mappedData: lastFreezingMappedData
                },
                filteredData: lastFreezingFilteredData
            }   
        },
        dataProperties: {
            interval: interval,
            coords: {
                closest_lat: closest_lat,
                closest_lng: closest_lng
            }
        },
        datasets: [
            {
                data: primaryFilteredData.data,
                label: `GDD Data for ${primaryYear}`,
                borderColor: PRIMARY_COLOR,
                backgroundColor: PRIMARY_COLOR,
                fill: false,
                pointRadius: 0,
            },
            {
                data: thirtyYearFilteredData.data,
                label: '30 Year Normal Data',
                borderColor: NORMAL_COLOR,
                backgroundColor: NORMAL_COLOR,
                borderWidth: 2,
                fill: false,
                pointRadius: 0
            },
            {
                data: maximumFilteredData.data,
                label: `${ci_interval}% Interquantile Range`, 
                fill: '+1',
                backgroundColor: EXTREMES_BACKGROUND_COLOR,
                borderColor: EXTREMES_BACKGROUND_COLOR,
                pointRadius: 0
            },
            {
                data: minimumFilteredData.data,
                label: 'Interquantile Range Lower Boundary',
                fill: '-1',
                backgroundColor: EXTREMES_BACKGROUND_COLOR,
                borderColor: EXTREMES_BACKGROUND_COLOR,
                pointRadius: 0
            },
            {
                data: lastFreezingFilteredData.data,
                label: 'Freezing Days',
                yAxisID: 'Right Scale',
                backgroundColor: FREEZING_COLOR,
                type: 'bar',
                barThickness: 2
            },
            {
                data: firstFreezingFilteredData.data,
                label: 'First Freezing Days',
                yAxisID: 'Right Scale',
                backgroundColor: FREEZING_COLOR,
                type: 'bar',
                barThickness: 2
            },
        ],
        labels: labels,
        rightScale: scale
    }

    /* Determines which combination of optional data sets should be displayed */
    var extraState = {};
    var extraDatasets = [];

    if (analogData) {
        const { analog, analogMappedData, analogFilteredData, analog_year } = analogData;

        extraState = {
            analog: {
                initialData: {
                    data: analog,
                    mappedData: analogMappedData
                },
                filteredData: analogFilteredData
            }
        };
        extraDatasets = [
            {
                data: analogFilteredData.data,
                label: `GDD Data for Analog Year, ${analog_year}`,
                borderColor: ANALOG_COLOR,
                backgroundColor: ANALOG_COLOR,
                borderWidth: 2,
                fill: false,
                pointRadius: 0,
            },
        ];
    }

    // CFS and GEFS datasets are added later depeneding on whether primary or comparison year is 2021
    if (cfsData && gefsData) {
        const { gefs, gefsMappedData, gefsFilteredData } = gefsData;
        const { cfs, cfsMappedData, cfsFilteredData } = cfsData;

        extraState = {
            ...extraState,
            gefs: {
                initialData: {
                    data: gefs,
                    mappedData: gefsMappedData
                },
                filteredData: gefsFilteredData
            },
            cfs: {
                initialData: {
                    data: cfs,
                    mappedData: cfsMappedData
                },
                filteredData: cfsFilteredData
            },
        }

        var gefsDataset = {
            data: gefsFilteredData.data,
            label: 'GEFS Data',
            borderColor: PRIMARY_COLOR,
            backgroundColor: PRIMARY_COLOR,
            fill: false,
            borderDash: [3, 1.5],
            pointRadius: 0
        }
        var cfsDataset = {
            data: cfsFilteredData.data,
            label: 'CFS Data',
            borderColor: CFS_COLOR,
            backgroundColor: CFS_COLOR,
            fill: false,
            borderDash: [3, 1.5],
            pointRadius: 0
        }
    }
 
    if (comparisonData) {
        const { comparison, comparisonMappedData, comparisonFilteredData, comparisonYear } = comparisonData;

        extraState = {
            ...extraState,
            comparison: {
                initialData: {
                    data: comparison,
                    mappedData: comparisonMappedData,
                },
                filteredData: comparisonFilteredData,
            },
        };
        extraDatasets = [
            ...extraDatasets,
            {
                data: comparisonFilteredData.data,
                label: `GDD Data for ${comparisonYear}`,
                borderColor: COMPARISON_COLOR,
                backgroundColor: COMPARISON_COLOR,
                fill: false,
                pointRadius: 0
            },
        ];

        /* Determines if comparison year is 2021 to display GEFS and CFS data */
        if (comparisonYear === 2021) {
            extraDatasets = [
                {
                    ...gefsDataset,
                    borderColor: COMPARISON_COLOR,
                    backgroundColor: COMPARISON_COLOR,
                },
                cfsDataset,
                ...extraDatasets
            ];
        }
    }

    state = {
        ...state,
        ...extraState,
        datasets: [
            {
                data: primaryFilteredData.data,
                label: `GDD Data for ${primaryYear}`,
                backgroundColor: PRIMARY_COLOR,
                borderColor: PRIMARY_COLOR,
                fill: false,
                pointRadius: 0
            },
            ...extraDatasets,
            {
                data: thirtyYearFilteredData.data,
                label: '30 Year Normal Data',
                backgroundColor: NORMAL_COLOR,
                borderColor: NORMAL_COLOR,
                borderWidth: 2,
                fill: false,
                pointRadius: 0
            },
            {
                data: maximumFilteredData.data,
                label: `${ci_interval}% Interquantile Range`, 
                fill: '+1',
                backgroundColor: EXTREMES_BACKGROUND_COLOR,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                pointRadius: 0
            },
            {
                data: minimumFilteredData.data,
                label: 'Interquantile Range Lower Boundary',
                fill: '-1',
                backgroundColor: EXTREMES_BACKGROUND_COLOR,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                pointRadius: 0
            },
            {
                data: lastFreezingFilteredData.data,
                label: 'Freezing Days',
                yAxisID: 'Right Scale',
                backgroundColor: FREEZING_COLOR,
                type: 'bar',
                barThickness: 2
            },
            {
                data: firstFreezingFilteredData.data,
                label: 'First Freezing Days',
                yAxisID: 'Right Scale',
                backgroundColor: FREEZING_COLOR,
                type: 'bar',
                barThickness: 2
            },
        ],
    };

    /* Determines if primary year is 2021 to display GEFS and CFS data */
    if (primaryYear === 2021) {
        state = {
            ...state,

            datasets: [
                gefsDataset,
                cfsDataset,
                ...state.datasets
            ]
        }
    }

    return state;
}


/**
 * Switches the right scale based on the crop being displayed.
 * 300 / 3000: Cotton
 * 500 / 5000: Corn, Peanut, Soybean, Sugar Beet, Sunflower, Tomato
 * 600 / 6000: Potato, Rice, Sorghum
 * 700 / 7000: Oat, Pea, Wheat
 * 1000 / 10000: Spring Wheat
 * 
 * @param {String} crop 
 * @author Brandon Kwintner
 */
const scaleGenerator = (crop) => {
    var scale = {
        beginAtZero: true,
        steps: 10,
        stepSize: 300,
        max: 3000
    }

    if (crop === "Cotton") {
        scale.stepSize = 300;
        scale.max = 3000;
    } else if (crop === "Corn" || crop === "Peanut" || crop === "Soybean" || crop === "Sugar Beet" || crop === "Sunflower" || crop === "Tomato") {
        scale.stepSize = 500;
        scale.max = 5000;
    } else if (crop === "Potato" || crop === "Rice" || crop === "Sorghum") {
        scale.stepSize = 600;
        scale.max = 6000;
    } else if (crop === "Oat" || crop === "Pea" || crop === "Wheat") {
        scale.stepSize = 700;
        scale.max = 7000;
    } else {
        scale.stepSize = 1000;
        scale.max = 10000;
    }

    return scale;
}