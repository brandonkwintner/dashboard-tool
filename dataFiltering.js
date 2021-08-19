import axios from 'axios';
import moment from 'moment';

import { getFilteredData } from '../generic_functions/index';
import { URL } from './constants';

/**
 * Takes initial data and maps it to (date, value) for ALL days of the year
 * @param { Date[] } dates
 * @param { Number[] } values
 * @returns { Map<Date, Number> }
 * @author Brandon Kwintner
 */
export const mapData = (dates, values) => {
    var currentDate = moment(`2021-01-01`);
    const parsedData = {};

    for (var idx = 0; idx < dates.length; idx++) {
        const date = moment(dates[idx]).format('MMM DD');
        const value = values[idx];
        parsedData[date] = value;
    }

    var mappedData = new Map();
    
    for(idx = 0; idx < 365; idx++) {
        const date = currentDate.format('MMM DD');
        date in parsedData ? mappedData.set(date, parsedData[date]) : mappedData.set(date, NaN);
        currentDate = moment(currentDate).add(1, 'days');
    }

    return mappedData;
}

/**
 * Generates mapped and filtered data for Crop Progress chart
 * @param { String } crop
 * @param { String[] } stages
 * @param { String } state
 * @param { Number } year
 * @param { Date } startDate
 * @param { Date } endDate
 * @returns { Map<String, Object> }
 * @author Brandon Kwintner
 */
export const generateData = async (crop, stages, state, year, startDate, endDate) => {
    const data = new Map();
    for (const stage of stages) {
        const response = await axios.get(`${URL}progressData/${crop}/${state}/${year}/${stage}`);
        const { dates, values} = response.data;

        // Data for the stage does not exist yet
        if (dates.length === 0) {
            continue;
        }

        const mappedData = mapData(dates, values);
        const filteredData = getFilteredData(startDate, endDate, year, 'days', mappedData);

        // Transforms all caps into first letter caps, rest lowerstage
        const formattedStage = stage.toLowerCase().split(' ').map(stage => stage.charAt(0).toUpperCase() + stage.slice(1)).join(' ');
        
        const initialData = {
            data: values,
            mappedData: mappedData
        };
        const packaged = { initialData, filteredData };
        data.set(formattedStage, packaged)
    }
    return data;
}

/**
 * TO-DO FIGURE OUT HOW TO SEND DATA TO STATE BUILDER WHERE IT CAN BE PROPERLY ITERATED / BUILD IT IN HERE
 */
