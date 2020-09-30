import React, {useState, useEffect} from 'react';

import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Tooltip from "@material-ui/core/Tooltip";
import {makeStyles} from '@material-ui/core/styles';

import {getChart, getAllCharts} from './ChartRegistry';

import './CustomTab.css';

const useStyles = makeStyles((theme) => ({
    formControl: {
        margin: theme.spacing(0.5),
        minWidth: 240,
    },
    selectEmpty: {
        marginTop: theme.spacing(1),
    },
}));

function ChartAdder(props) {
    const classes = useStyles();
    const added = props.charts.map(chart => chart.name);
    const onAdd = event => props.onAdd(event.target.value);

    const allCharts = getAllCharts();
    const makeItem = chart => {
        if (added.includes(chart.name))
            return null;
        return (
            <MenuItem key={chart.name} value={chart.name}>
                <Tooltip title={<span className='chartDesc'>{chart.description}</span>} placement='right'>
                    <span>{chart.name}</span>
                </Tooltip>
            </MenuItem>
        );
    }
    const chartList = allCharts.map(makeItem);

    return (    
        <FormControl className={classes.formControl}>
            <InputLabel id='add-chart'>Add Chart...</InputLabel>
            <Select value='' onChange={onAdd} labelId='add-chart'>
                {chartList}
            </Select>
        </FormControl>
    );   
}

function CustomTab(props) {
    const data = props.data;
    const [charts, setCharts] = useState([]); // TODO - load from save, have default
    const [renderedCharts, setRenderedCharts] = useState([]);

    const onAdd = chart => {
        setCharts([...charts, {name: chart, size: 4}]);
    };
    const onDelete = chart => {
        setCharts(charts.reduce((keptCharts, cChart) => {
            if (cChart.name !== chart)
                return [...keptCharts, cChart];
            return keptCharts;
        }, []));
    };
    const onResize = (chart, larger) => {
        setCharts(charts.reduce((newCharts, cChart) => {
            if (cChart.name === chart) {
                cChart.size += larger ? 1 : -1;
            }
            return [...newCharts, cChart];
        }, []));
    };
    const onMove = (chart, higher) => {
        const i = charts.findIndex(cChart => cChart.name === chart);
        if (i >= 0) {
            let newCharts = charts.slice();
            const newI = higher ? i - 1 : i + 1;
            if (newI >= 0 && newI < charts.length) {
                [newCharts[i], newCharts[newI]] = [newCharts[newI], newCharts[i]];
                setCharts(newCharts);
            }
        }
    };

    const makeOverlay = chart => {
        return {
            onDelete: () => onDelete(chart),
            onResize: larger => onResize(chart, larger),
            onMove: higher => onMove(chart, higher)
        };
    }

    useEffect(() => {
        let rendered = [];
        for (let i in charts) {
            const chart = charts[i];
            const className = 'mb-3 col-' + chart.size;
            const Chart = getChart(chart.name).component;
            rendered.push(
                <div className={className} key={chart.name}>
                    <Chart data={data} height={250} overlay={makeOverlay(chart.name)}/>
                </div>
            );
        }
        setRenderedCharts(rendered);
    }, [charts]);

    return (
        <div className='customTab'>
            <ChartAdder onAdd={onAdd} charts={charts}/>
            <div className='row'>
                {renderedCharts}
            </div>
        </div>
    );
}

export default CustomTab;
