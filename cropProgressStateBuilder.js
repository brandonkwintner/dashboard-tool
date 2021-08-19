import {
    PRIMARY_COLORS,
    COMPARISON_COLORS
} from './constants';

/**
 * State builder for Crop Progress chart
 * @param { primaryData, year } primaryData
 * @param { comparisonData, comparisonYear } comparisonData
 * @param { Date[] } labels
 * @author Brandon Kwintner
 */
export const datasetStateBuilder = (primaryData, comparisonData, labels) => {
    const { primaryDataset, year } = primaryData;
    var datasets = [];

    if (comparisonData) {
        var { comparisonDataset, comparisonYear } = comparisonData;
    }
    
    const colors = colorMap(primaryDataset.keys(), comparisonData ? comparisonDataset.keys() : null);
    
    for ( const [stage, data] of primaryDataset) {
        const { filteredData } = data;

        const color = colors.get(stage)[0];
        datasets = [
            ...datasets,
            {
                label: comparisonData ? `${stage} ${year}` : stage,
                data: filteredData.data,
                fill: false,
                borderWidth: 2, 
                borderColor: color,
                pointBackgroundColor: color,
                spanGaps: true
            }
        ];
    }

    var state = {
        primary: primaryDataset,
        datasets: datasets,
        labels: labels
    };

    // Determines if comparison data exists
    if (comparisonData && year !== comparisonYear) {

        for ( const [stage, data] of comparisonDataset) {
            const { filteredData } = data;
            const color = colors.get(stage).length === 1 ? colors.get(stage)[0] : colors.get(stage)[1];
    
            datasets = [
                ...datasets,
                {
                    label: `${stage} ${comparisonYear}`,
                    data: filteredData.data,
                    fill: false,
                    borderWidth: 2, 
                    borderColor: color,
                    pointBackgroundColor: color,
                    borderDash: [3, 1.5],
                    spanGaps: true
                }
            ];
        }
        state = {
            ...state,
            comparison: comparisonDataset,
            datasets: datasets
        };
    }
    return state;
}

/**
 * Ensures that primary and comparison datasets sync up with legend colors
 * @param { String[] } primaryStages
 * @param { String[] } comparisonStages
 * @returns { Map<String, String[]> }
 * @author Brandon Kwintner
 * 
 * IN FUTURE, REFACTOR SO SMALLER OF TWO LISTS COMES FIRST
 */
const colorMap = (primaryStages, comparisonStages) => {
    var colors = new Map();
    var idx = 0;

    if (comparisonStages) {
        for (const stage of primaryStages) {
            colors.set(stage, [PRIMARY_COLORS[idx], COMPARISON_COLORS[idx]]);
            idx++;
        }
    
        for (const stage of comparisonStages) {
            if (colors.has(stage)) {
                continue;
            }
            colors.set(stage, [COMPARISON_COLORS[idx++]]);
        }
        return colors;
    }
    else {
        for (const stage of primaryStages) {
            colors.set(stage, [PRIMARY_COLORS[idx++]]);
        }
        return colors;
    }
}