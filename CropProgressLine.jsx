import React, { 
    useEffect,
    useState,
} from 'react';
import { 
    CircularProgress,
    Typography 
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import axios from 'axios';

import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-crosshair';

import { generateData } from '../../utils/Dashboard/CropProgress_Tool/dataFiltering';
import { datasetStateBuilder } from '../../utils/Dashboard/CropProgress_Tool/cropProgressStateBuilder';
import { 
    STATE,
    URL 
} from '../../utils/Dashboard/CropProgress_Tool/constants';
import { getDates } from '../../utils/Dashboard/generic_functions/index';

/**
 * Line Graph to display crop progress over the growing season
 * @param { Object } params 
 * @author Brandon Kwintner
 */
const CropProgressLine = ({ params }) => {
    const classes = useStyles();

    const [cropProgressData, setCropProgressData] = useState(null);
    const [flag, setFlag] = useState(true);

    /** 
     * Fetches primary and, when applicable, comparison data. Maps and displays appropriate date range.
     */
    useEffect(() => {
        const fetchAPI = async () => {
            // Params data
            const crop = params.crop.value;
            const year = params.year.value;
            const comparisonYear = params.comparisonYear.value;
            const startDate = `${year}-${params.date.start}`;
            const endDate = `${year}-${params.date.end}`;
            const labels = getDates(startDate, endDate, year, 'day');

            const primaryResponse = await axios.get(`${URL}progressData/${crop}/${STATE}/${year}/PLANTED`);
            const comparisonResponse = comparisonYear >= 2014 ? await axios.get(`${URL}progressData/${crop}/${STATE}/${comparisonYear}/PLANTED`) : null;
            
            // Determine if data exists
            if (!primaryResponse.data) {
                setCropProgressData(null);
                return;
            }

            const { stages } = primaryResponse.data;

            // Generate mapped and filtered data
            const primaryDataset = await generateData(crop, stages, STATE, year, startDate, endDate).then(res => res);
            const primaryData = { primaryDataset, year };

            // Determine if comparison data exists
            if (comparisonResponse) {
                const { stages: comparisonStages } = comparisonResponse.data;
                const comparisonDataset = await generateData(crop, comparisonStages, STATE, comparisonYear, startDate, endDate).then(res => res);
                var comparisonData = { comparisonDataset, comparisonYear };
            }

            const state = datasetStateBuilder(primaryData, comparisonData ? comparisonData : null, labels);
            setCropProgressData(state);
            setFlag(false);
        }
        fetchAPI();
    }, [params]);

    return (
        <>
            {cropProgressData ?
            <Line
                data={{
                    labels: cropProgressData.labels,
                    datasets: cropProgressData.datasets
                }}
                type='line'
                options={{
                    interpolation: true,
                    responsive: true,
                    tooltips: {
                        mode:'index',
                        intersect: false
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
                    },
                    hover: {
                        mode: 'index',
                        intersect: false
                    },
                    title: {
                    display: true,
                    text: [`DAWN Crop Progress Tool for ${params.crop.name}`, params.comparisonYear.value >= 2014 &&  params.comparisonYear.value !== params.year.value ? `Displaying ${params.year.value} Compared to ${params.comparisonYear.value}`: `Displaying ${params.year.value}`],
                    },
                    legend: {
                        labels: {
                            /**
                             * Only displays legend items of comparison years, as guaranteed to include ALL stages.
                             * Strips year from legend text.
                             */
                            filter: function(legendItem, data) {

                                // Helps handle edge case where primary and comparison year are same
                                const offset = Math.min(...data.datasets.reduce((acc, curr) => {
                                    const { label } = curr;
                                    const split = label.split(" ");
                                    if (split.length === 1 || params.year.value === params.comparisonYear.value) {
                                        return acc;
                                    }
                                    split[1] === String(params.year.value) ? acc[0]++ : acc[1]++;
                                    return acc;
                                }, [0, 0]));

                                const split = legendItem.text.split(" ");
                                legendItem.text = split[0];

                                if (split.length === 1) {
                                    return true;
                                }
                                if (split[1] === String(params.year.value) && legendItem.datasetIndex < offset) {
                                    return false;
                                }
                                return true;
                            },
                        },
                        /**
                         * If comparison dataset exists, the corresponding legend item will hide both lines (given primary exists)
                         */
                        onClick: function(_, legendItem) { 
                            const index = legendItem.datasetIndex;
                            const ci = this.chart;
                            const alreadyHidden = (ci.getDatasetMeta(index).hidden === null) ? false : ci.getDatasetMeta(index).hidden;
                            const meta = ci.getDatasetMeta(index);

                            const offset = Math.min(...ci.data.datasets.reduce((acc, curr) => {
                                const { label } = curr;
                                const split = label.split(" ");
                                if (split.length === 1 || params.year.value === params.comparisonYear.value) {
                                    return acc;
                                }
                                split[1] === String(params.year.value) ? acc[0]++ : acc[1]++;
                                return acc;
                            }, [0, 0]));
                            
                            if (index < 2 * offset) {
                                const meta_low = ci.getDatasetMeta(index - offset);
                                meta_low.hidden = alreadyHidden ? false : true;
                            }
                            meta.hidden = alreadyHidden ? false : true;
                            ci.update();
                        },
                    },
                    scales: {
                        xAxes: [{
                            display: true,
                            gridLines: {
                                drawOnChartArea: false
                            },
                        }],
                        yAxes: [{
                            display: true,
                            scaleLabel: {
                                display: true,
                                labelString: 'Percentage'
                            },
                            ticks: {
                                beginAtZero: true,
                                steps: 10,
                                stepValue: 5,
                                max: 100
                            }
                        }]
                    },
                }}   
            /> :
            (flag ?
                <div className={classes.spinner}>
                    <CircularProgress/>
                </div>
            :
                <Typography variant="caption" id="last-updated" gutterBottom>
                            [Crop Progress Data Unavailable for Selected Options]
                </Typography>
            )}
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

export default CropProgressLine;
