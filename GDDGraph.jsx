import React, { 
    useEffect,
    useRef,
    useState 
} from 'react';
import { CircularProgress } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import axios from 'axios';
import qs from 'qs';

import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-crosshair';

import {  
    isConnectionDate,
    mapForecastData,
    mapFreezingData,
    transformForCsv
} from '../../utils/Dashboard/GDD_Tool/dataFiltering';
import { 
    getFilteredData,
    mapData
} from '../../utils/Dashboard/generic_functions/index';
import { datasetStateBuilder } from '../../utils/Dashboard/GDD_Tool/GDDstateBuilder';
import { URL } from '../../utils/Dashboard/GDD_Tool/constants';

/**
 * GDD Multi-type / multi-axis graph to display relevant data
 * @param { { Number, Number, String } } location
 * @param { Object } params
 * @param { () => void } setParams
 * @author Brandon Kwintner
 */
const GDDGraph = ({ location, params, setParams }) => {
    const classes = useStyles();

    const { lat, lng, address } = location;
    const chart = useRef();
    const [GDDdata, setGDDdata] = useState({});

    /** ** ONLY HOOK TO RUN ON INITIAL RENDER **
     * Runs everytime crop or freezing temp is updated
     * Modifies primary, comparison, CFS, GEFS, normal, min / max, analog and freezing datasets
     */
     useEffect(() => {
        const fetchAPI = async () => {     
            const callParams = {
                "latitude": lat,
                "longitude": lng,
            }               
            const confidenceCallParams = {
                "latitude": lat,
                "longitude": lng,
                "confidence_interval": params.range.value
            }           
            const primaryResponse = await axios.post(`${URL}${params.crop.value}/daily/${params.year.value}/accumulated`, callParams);
            const normalResponse = await axios.post(`${URL}${params.crop.value}/normal/accumulated`, callParams);
            const extremesResponse = await axios.post(`${URL}${params.crop.value}/confidence`, confidenceCallParams);
            const freezingResponse = await axios.post(`${URL}freezing/${params.temperature.value}`, callParams);
            const comparisonResponse = params.comparisonYear.value === 0 ? null : await axios.post(`${URL}${params.crop.value}/daily/${params.comparisonYear.value}/accumulated`, callParams);
            const gefsResponse = await axios.post(`${URL}${params.crop.value}/gefs/accumulated`, callParams);
            const cfsResponse = await axios.post(`${URL}${params.crop.value}/cfs/accumulated`, callParams);

            const { analog_year, closest_lat, closest_lng, data } = primaryResponse.data;
            const { data: normal } = normalResponse.data;
            const { minimum, maximum } = extremesResponse.data;
            const { first_freezing_dates, last_freezing_dates } = freezingResponse.data;

            // Format start date, end date, and determine interval
            const year = params.year.value;
            const comparisonYear = params.comparisonYear.value;
            const startDate = `${year}-${params.date.start}`;
            const endDate = `${year}-${params.date.end}`;
            const interval = GDDdata.dataProperties ? GDDdata.dataProperties.interval : 'days';

            // Generate mapped data and filtered data to be displayed
            const primaryMappedData = mapData(data);
            const primaryFilteredData = getFilteredData(startDate, endDate, year, interval, primaryMappedData);
            const thirtyYearMappedData = mapData(normal);
            const thirtyYearFilteredData = getFilteredData(startDate, endDate, year, interval, thirtyYearMappedData);
            const minimumMappedData = mapData(minimum);
            const minimumFilteredData = getFilteredData(startDate, endDate, year, interval, minimumMappedData); 
            const maximumMappedData = mapData(maximum);
            const maximumFilteredData = getFilteredData(startDate, endDate, year, interval, maximumMappedData); 
            const firstFreezingMappedData = mapFreezingData(first_freezing_dates);
            const firstFreezingFilteredData = getFilteredData(startDate, endDate, year, interval, firstFreezingMappedData);
            const lastFreezingMappedData = mapFreezingData(last_freezing_dates);
            const lastFreezingFilteredData = getFilteredData(startDate, endDate, year, interval, lastFreezingMappedData);

            // Packs up data to be sent to state generator
            const primaryData = { data, primaryMappedData, primaryFilteredData, year };
            const thirtyYearData = { normal, thirtyYearMappedData, thirtyYearFilteredData };
            const minimumData = { minimum, minimumMappedData, minimumFilteredData };
            const maximumData = { maximum, maximumMappedData, maximumFilteredData };
            const firstFreezingData = { first_freezing_dates, firstFreezingMappedData, firstFreezingFilteredData };
            const lastFreezingData = { last_freezing_dates, lastFreezingMappedData, lastFreezingFilteredData };
            const dataProperties = { interval, closest_lat, closest_lng };
            const labels = primaryFilteredData.dates;
            const crop = params.crop.name;

            // Determines if analog year exists
            if (analog_year !== -1) {
                const analogResponse = await axios.post(`${URL}${params.crop.value}/daily/${analog_year}/accumulated`, callParams);
                const { data: analog } = analogResponse.data;
                const analogMappedData = mapData(analog);
                const analogFilteredData = getFilteredData(startDate, endDate, analog_year, interval, analogMappedData);
                var analogData = { analog, analogMappedData, analogFilteredData, analog_year };
            }
            setParams({
                ...params,
                analog_year: analog_year
            });

            // Determines if a comparison year exists
            if (comparisonResponse) {
                const {data: comparison } = comparisonResponse.data;
                const comparisonMappedData = mapData(comparison);
                const comparisonFilteredData = getFilteredData(startDate, endDate, params.comparisonYear.value, interval, comparisonMappedData);
                var comparisonData = { comparison, comparisonMappedData, comparisonFilteredData, comparisonYear };
            } 

            // Determines if CFS / GEFS data need to be displayed
            if (year === 2021 || comparisonYear === 2021) {
                const { data: gefs, base_date } = gefsResponse.data;
                const { data: cfs } = cfsResponse.data;

                const gefsMappedData = mapForecastData(gefs, base_date, primaryMappedData);
                const gefsFilteredData = getFilteredData(startDate, endDate, year, interval, gefsMappedData);
                const cfsMappedData = mapForecastData(cfs, base_date, primaryMappedData);
                const cfsFilteredData = getFilteredData(startDate, endDate, year, interval, cfsMappedData);

                var gefsData = { gefs, gefsMappedData, gefsFilteredData };
                var cfsData = { cfs, cfsMappedData, cfsFilteredData };
            }

            const state = datasetStateBuilder(primaryData, comparisonData ? comparisonData : null, analogData ? analogData : null, thirtyYearData, minimumData, maximumData, firstFreezingData, lastFreezingData, gefsData ? gefsData : null, cfsData ? cfsData : null, dataProperties, params.range.value, labels, crop);
            setGDDdata(state);
        }
        fetchAPI();
    }, [params.crop, params.temperature]);

    /** ** DOES NOT RUN ON INITIAL RENDER **
     * Runs everytime year, comparison year, or confidence interval is updated
     * Modifies primary, comparison, analog, and extremes datasets
     */
    useEffect(() => {
        const fetchAPI = async () => {   
            const callParams = {
                "latitude": lat,
                "longitude": lng,
            }               
            const confidenceCallParams = {
                "latitude": lat,
                "longitude": lng,
                "confidence_interval": params.range.value
            }    
            const primaryResponse = await axios.post(`${URL}${params.crop.value}/daily/${params.year.value}/accumulated`, callParams);
            const comparisonResponse = params.comparisonYear.value === 0 ? null : await axios.post(`${URL}${params.crop.value}/daily/${params.comparisonYear.value}/accumulated`, callParams);            
            const extremesResponse = await axios.post(`${URL}${params.crop.value}/confidence`, confidenceCallParams);

            const { analog_year, data } = primaryResponse.data;
            const normal = GDDdata.thirtyYear.initialData.data;
            const { minimum, maximum } = extremesResponse.data;
            const first_freezing_dates = GDDdata.freezing.first.initialData.data;
            const last_freezing_dates = GDDdata.freezing.last.initialData.data;

            // Format start date, end date, and determine interval / lat, lng
            const year = params.year.value;
            const comparisonYear = params.comparisonYear.value;
            const startDate = `${year}-${params.date.start}`;
            const endDate = `${year}-${params.date.end}`;
            const interval = GDDdata.dataProperties.interval;
            const { closest_lat, closest_lng } = GDDdata.dataProperties.coords;

            // Generate mapped data and filtered data to be displayed
            const primaryMappedData = mapData(data);
            const primaryFilteredData = getFilteredData(startDate, endDate, year, interval, primaryMappedData);
            const thirtyYearMappedData = GDDdata.thirtyYear.initialData.mappedData;
            const thirtyYearFilteredData = GDDdata.thirtyYear.filteredData;
            const minimumMappedData = mapData(minimum);
            const minimumFilteredData = getFilteredData(startDate, endDate, year, interval, minimumMappedData); 
            const maximumMappedData = mapData(maximum);
            const maximumFilteredData = getFilteredData(startDate, endDate, year, interval, maximumMappedData); 
            const firstFreezingMappedData = GDDdata.freezing.first.initialData.mappedData;
            const firstFreezingFilteredData = GDDdata.freezing.first.filteredData;
            const lastFreezingMappedData = GDDdata.freezing.last.initialData.mappedData;
            const lastFreezingFilteredData = GDDdata.freezing.last.filteredData;

            // Packs up data to be sent to state generator
            var primaryData = { data, primaryMappedData, primaryFilteredData, year };
            const thirtyYearData = { normal, thirtyYearMappedData, thirtyYearFilteredData };
            const minimumData = { minimum, minimumMappedData, minimumFilteredData };
            const maximumData = { maximum, maximumMappedData, maximumFilteredData };
            const firstFreezingData = { first_freezing_dates, firstFreezingMappedData, firstFreezingFilteredData };
            const lastFreezingData = { last_freezing_dates, lastFreezingMappedData, lastFreezingFilteredData };
            const dataProperties = { interval, closest_lat, closest_lng };
            const labels = primaryFilteredData.dates;
            const crop = params.crop.name;

            // Determines if analog year exists
            if (analog_year !== -1) {
                const analogResponse = await axios.post(`${URL}${params.crop.value}/daily/${analog_year}/accumulated`, callParams);
                const { data: analog } = analogResponse.data;
                const analogMappedData = mapData(analog);
                const analogFilteredData = getFilteredData(startDate, endDate, analog_year, interval, analogMappedData);
                var analogData = { analog, analogMappedData, analogFilteredData, analog_year };
            }
            setParams({
                ...params,
                analog_year: analog_year
            });

            // Comparison dataset exists and not same year as primary year.
            if (comparisonResponse && year !== comparisonYear) {

                const {data: comparison } = comparisonResponse.data;
                const comparisonMappedData = mapData(comparison);
                const comparisonFilteredData = getFilteredData(startDate, endDate, comparisonYear, interval, comparisonMappedData);
                var comparisonData = { comparison, comparisonMappedData, comparisonFilteredData, comparisonYear };
            } 

            // Determines if CFS / GEFS data need to be displayed
            if (year === 2021 || comparisonYear === 2021) {

                const gefsResponse = await axios.post(`${URL}${params.crop.value}/gefs/accumulated`, callParams);
                const cfsResponse = await axios.post(`${URL}${params.crop.value}/cfs/accumulated`, callParams);

                const { data: gefs, base_date } = gefsResponse.data;
                const { data: cfs } = cfsResponse.data;

                const gefsMappedData = mapForecastData(gefs, base_date, primaryMappedData);
                const gefsFilteredData = getFilteredData(startDate, endDate, year, interval, gefsMappedData);
                const cfsMappedData = mapForecastData(cfs, base_date, primaryMappedData);
                const cfsFilteredData = getFilteredData(startDate, endDate, year, interval, cfsMappedData);

                var gefsData = { gefs, gefsMappedData, gefsFilteredData };
                var cfsData = { cfs, cfsMappedData, cfsFilteredData };
            }

            const state = datasetStateBuilder(primaryData, comparisonResponse ? comparisonData : null, analogData ? analogData : null, thirtyYearData, minimumData, maximumData, firstFreezingData, lastFreezingData, gefsData ? gefsData : null, cfsData ? cfsData : null, dataProperties, params.range.value, labels, crop);
            setGDDdata(state);
        }
        if ( GDDdata.primary ) {
            fetchAPI();
        }
    }, [params.year, params.comparisonYear, params.range]);

    /** ** DOES NOT RUN ON INITIAL RENDER **
     * Runs whenever dates is modified 
     * Modifies start and end date
     */
    useEffect(() => {

        // Does NOT run on initial load (label is NOT defined)
        if ( !GDDdata.primary ) {
            return;
        }

        // initial datasets
        const data = GDDdata.primary.initialData.data;
        const normal = GDDdata.thirtyYear.initialData.data;
        const minimum = GDDdata.minimum.initialData.data;
        const maximum = GDDdata.maximum.initialData.data;
        const first_freezing_dates = GDDdata.freezing.first.initialData.data;
        const last_freezing_dates = GDDdata.freezing.last.initialData.data;

        // Format start date, end date, and determine interval / lat, lng
        const year = params.year.value;
        const comparisonYear = params.comparisonYear.value;
        const startDate = `${year}-${params.date.start}`;
        const endDate = `${year}-${params.date.end}`;
        const interval = GDDdata.dataProperties.interval;
        const { closest_lat, closest_lng } = GDDdata.dataProperties.coords;

        // Generate mapped data and filtered data to be displayed
        const primaryMappedData = GDDdata.primary.initialData.mappedData;
        const primaryFilteredData = getFilteredData(startDate, endDate, year, interval, primaryMappedData);
        const thirtyYearMappedData = GDDdata.thirtyYear.initialData.mappedData;
        const thirtyYearFilteredData = getFilteredData(startDate, endDate, year, interval, thirtyYearMappedData);
        const minimumMappedData = GDDdata.minimum.initialData.mappedData;
        const minimumFilteredData = getFilteredData(startDate, endDate, year, interval, minimumMappedData); 
        const maximumMappedData = GDDdata.maximum.initialData.mappedData;
        const maximumFilteredData = getFilteredData(startDate, endDate, year, interval, maximumMappedData);
        const firstFreezingMappedData = GDDdata.freezing.first.initialData.mappedData;
        const firstFreezingFilteredData = getFilteredData(startDate, endDate, year, interval, firstFreezingMappedData);
        const lastFreezingMappedData = GDDdata.freezing.last.initialData.mappedData;
        const lastFreezingFilteredData = getFilteredData(startDate, endDate, year, interval, lastFreezingMappedData);

        // Packs up data to be sent to state generator
        var primaryData = { data, primaryMappedData, primaryFilteredData, year };
        const thirtyYearData = { normal, thirtyYearMappedData, thirtyYearFilteredData };
        const minimumData = { minimum, minimumMappedData, minimumFilteredData };
        const maximumData = { maximum, maximumMappedData, maximumFilteredData };
        const firstFreezingData = { first_freezing_dates, firstFreezingMappedData, firstFreezingFilteredData };
        const lastFreezingData = { last_freezing_dates, lastFreezingMappedData, lastFreezingFilteredData };
        const dataProperties = { interval, closest_lat, closest_lng };
        const labels = primaryFilteredData.dates;
        const crop = params.crop.name;

        // Determine if analog year, gefs, and cfs data needs to be displayed.
        if (year === 2021) {
            const analog = GDDdata.analog.initialData.data;
            const gefs = GDDdata.gefs.initialData.data;
            const cfs = GDDdata.cfs.initialData.data;

            const analogMappedData = GDDdata.analog.initialData.mappedData;
            const analogFilteredData = GDDdata.analog.filteredData;
            const gefsMappedData = GDDdata.gefs.initialData.mappedData;
            const gefsFilteredData = getFilteredData(startDate, endDate, year, interval, gefsMappedData);
            const cfsMappedData = GDDdata.cfs.initialData.mappedData;
            const cfsFilteredData = getFilteredData(startDate, endDate, year, interval, cfsMappedData);

            const analog_year = params.analog_year;
            var analogData = { analog, analogMappedData, analogFilteredData, analog_year };
            var gefsData = { gefs, gefsMappedData, gefsFilteredData };
            var cfsData = { cfs, cfsMappedData, cfsFilteredData };
        }

        // Comparison dataset exists and not same year as primary year.
        if (GDDdata.comparison) {

            const comparison = GDDdata.comparison.initialData.data;
            const comparisonMappedData = GDDdata.comparison.initialData.mappedData;
            const comparisonFilteredData = getFilteredData(startDate, endDate, comparisonYear, interval, comparisonMappedData);
            var comparisonData = { comparison, comparisonMappedData, comparisonFilteredData, comparisonYear };
        } 

        const state = datasetStateBuilder(primaryData, comparisonData ? comparisonData : null, analogData ? analogData : null, thirtyYearData, minimumData, maximumData, firstFreezingData, lastFreezingData, gefsData ? gefsData : null, cfsData ? cfsData : null, dataProperties, params.range.value, labels, crop);
        setGDDdata(state);
        
    }, [params.date]);

    return (
        <>
            {/* Displays spinner while graph is loading */}
            {GDDdata.datasets ? 
                    <Line
                        ref={chart}
                        type= "line"
                        data={{
                            labels: GDDdata.labels,
                            datasets: GDDdata.datasets
                        }}  
                        options={{
                            scales: {
                                yAxes: [
                                    {
                                        id: "Left Scale",
                                        scaleLabel: {
                                            display: true,
                                            labelString: 'Accumulated Growing Degree Days (°F)'
                                        },
                                        ticks: GDDdata.rightScale,
                                    },
                                    {
                                        id: "Right Scale",
                                        position: "right",
                                        scaleLabel: {
                                            display: true,
                                            labelString: 'Last Spring / First Fall Freezing Temperatures (# of Years)'
                                        },
                                        ticks: {
                                            beginAtZero: true,
                                            steps: 10,
                                            stepSize: 1,
                                            max: 10
                                        },
                                    },
                                ],
                                xAxes : [{
                                    gridLines: {
                                        drawOnChartArea: false
                                    },
                                }]
                            },
                            title: {
                                display: true,
                                text: [`DAWN GDD Tool for ${params.crop.name}`, `${address}`, `(${lat}, ${lng})`],
                            },
                            tooltips: {
                                mode: 'index',
                                intersect: false,
                                callbacks: {  
                                    /*                                  
                                    title: (tooltipItems) => {
                                        // Handles GEFS data and Freezing prediction
                                        const title = tooltipItems[0].xLabel;

                                        if (title === "Apr 29" || title === "May 01" || title === "May 03" || title === "May 04") {
                                            return `${title} - 80% Chance of Freezing Day`;
                                        }
                                        return title;
                                    },
                                    */
                                    label: (tooltipItem, data) => {
                                        const label = data.datasets[tooltipItem.datasetIndex].label || '';
                                        const value = Math.round(tooltipItem.yLabel);

                                        // Handles "connection" day of primary GDD data and CFS / GEFS
                                        if (params.year.value === 2021 && (label === "GEFS Data" || label === "CFS Data") && isConnectionDate(value, GDDdata.primary.initialData.mappedData)) {
                                            return null;
                                        }

                                        // Handles displaying Last Freezing Days
                                        if (label === "Freezing Days" && !isNaN(value)) {
                                            return `Last Freezing Days: ${value}`;
                                        }

                                        // Handles displaying Interquantile Range boundaries, with shortened text
                                        if (label === `${params.range.value}% Interquantile Range`) {
                                            const xLabel = tooltipItem.xLabel;
                                            const lower = Math.round(GDDdata.minimum.initialData.mappedData.get(xLabel));
                                            
                                            return `${params.range.value}% Interquantile Range: (${lower}, ${value})`;
                                        }
                                        // Already displayed
                                        if (label === "Interquantile Range Lower Boundary") {
                                            return null;
                                        }
                                        
                                        // Handles not displaying NaN when one / both freezing days do not have data
                                        if ( (label === "First Freezing Days" || label === "Freezing Days") && isNaN(value)) {
                                            return null;
                                        }
                                        return `${label}: ${value}`
                                    }
                                }
                            },
                            hover: {
                                mode: 'index',
                                intersect: false
                            },
                            legend: {
                                labels: {
                                    // Change legend item titles when Silvia gives new name
                                    filter: function(legendItem) {
                                        return ! (legendItem.text === "First Freezing Days" || legendItem.text === "Interquantile Range Lower Boundary");
                                    },
                                },
                                onClick: function(_, legendItem) { 
                                    const index = legendItem.datasetIndex;
                                    const ci = this.chart;
                                    const alreadyHidden = (ci.getDatasetMeta(index).hidden === null) ? false : ci.getDatasetMeta(index).hidden;
                                    const meta = ci.getDatasetMeta(index);
                                    
                                    // Hide +1 dataset only for CI
                                    if (legendItem.text === `${params.range.value}% Interquantile Range` || legendItem.text === "Freezing Days") {
                                        const meta_high = ci.getDatasetMeta(index + 1);
                                        meta_high.hidden = alreadyHidden ? false : true;
                                    }
                                    meta.hidden = alreadyHidden ? false : true;
                                    ci.update();
                                },
                            },
                            plugins: {
                                crosshair: {
                                    line: {
                                        color: 'black',
                                        width: 0.5,
                                        dashPattern: [5,5],
                                    },
                                    sync: {
                                        enabled: true,            // enable trace line syncing with other charts
                                        group: 1,                 // chart group
                                        suppressTooltips: false   // suppress tooltips when showing a synced tracer
                                      },
                                    zoom: {
                                        enabled: false
                                    }
                                }
                            }
                        }}  
                    />
                :
                <div className={classes.spinner}>
                    <CircularProgress/>
                </div>}
                {/* Download button for .csv file */}
                <button onClick={async () => {
                    const [keys, values] = transformForCsv(GDDdata);
                    const csvFile = await axios.post("http://localhost:5000/api/v1/dataCsvConversion/convertToCsv", {
                        keys: keys,
                        values: values,
                        id: Date.now()
                    })
                        .then(async (res) => {
                            console.log(res)
                            const { data } = res;
                            const cleanUp = await axios.get("http://localhost:5000/api/v1/dataCsvConversion/cleanUpCsv");
                            console.log(cleanUp);
                            return data;
                        });

                    var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
                    if (navigator.msSaveBlob) { // IE 10+
                        navigator.msSaveBlob(blob, 'gdd_data.csv');
                    } else {
                        var link = document.createElement("a");
                        if (link.download !== undefined) { // feature detection
                            // Browsers that support HTML5 download attribute
                            var url = global.URL.createObjectURL(blob);
                            link.setAttribute("href", url);
                            link.setAttribute("download", 'gdd_data.csv');
                            link.style.visibility = 'hidden';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }
                    }
                }}> 
                    Download .csv file
                </button>
        </>
    );
}

const useStyles = makeStyles(theme => ({
    spinner: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    }
}));

export default GDDGraph;