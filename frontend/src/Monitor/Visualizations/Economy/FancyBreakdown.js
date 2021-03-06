import React, {useState, useEffect} from 'react';

import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import {makeStyles} from '@material-ui/core/styles';

import AreaChart from 'Monitor/Charts/AreaChart';
import {selectNested, findKeysOverSeries, getDataColors} from 'Monitor/Charts/Util';
import {registerChart} from 'Monitor/Charts/ChartRegistry';
import Chart from 'Monitor/Charts/Chart';
import {translate} from 'Translator';

import './Economy.css';

const Name = 'Resource Spending/Income Drilldowns';

const DataTypes = Object.freeze({'Income': 'Income', 'Spending': 'Spending'});
const DataKeys = Object.freeze({[DataTypes.Income]: 'income', [DataTypes.Spending]: 'spending'});
const ResourceNames = Object.freeze({
    'society_research': 'Society Research',
    'energy': 'Energy Credit',
    'minerals': 'Mineral',
    'food': 'Food',
    'physics_research': 'Physics Research',
    'engineering_research': 'Engineering Research',
    'influence': 'Influence',
    'unity': 'Unity',
    'alloys': 'Alloy',
    'consumer_goods': 'Consumer Good',
    'volatile_motes': 'Volatile Mote',
    'rare_crystals': 'Rare Crystal',
    'exotic_gases': 'Exotic Gas',
    'sr_dark_matter': 'Dark Matter',
    'nanites': 'Nanite',
    'sr_zro': 'Zro',
    'sr_living_metal': 'Living Metal'
});
const ResourceLookup = Object.entries(ResourceNames).reduce(
    (obj, entry) => {
        return {
            ...obj,
            [entry[1]]: entry[0]        
        };
    }, {}
);

const useStyles = makeStyles((theme) => ({
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
}));

function buildKey(dataType, resourceType, breakdownLevel) {
    const breakdownPrefix = breakdownLevel.length > 0 ? '/breakdown/' : '';
    const breakdownKey = breakdownPrefix + breakdownLevel.join('/breakdown/');
    return `economy/${DataKeys[dataType]}/${ResourceLookup[resourceType]}${breakdownKey}`;
}

function BreadCrumbs(props) {
    const nestedCats = props.breakdown;
    const setDrilldown = props.onNavigate;

    const renderDrilldown = (label, index) => {
        const onClick = () => setDrilldown(nestedCats.slice(0, index + 1));
        return (
            <div className='breadcrumb' key={label}>
                {index >= 0 && <p className='breadcrumbArrow'>-&gt;</p>}
                <p className='breadcrumb' onClick={onClick}>{label}</p>
            </div>
        );
    };
    const renderedDrilldowns = [renderDrilldown('All', -1), ...nestedCats.map(renderDrilldown)];

    return (
        <div className='breadcrumbBox'>
            {nestedCats.length > 0 && <p className='breadcrumbLabel'>{translate('Drilldown:')}</p>}
            {nestedCats.length > 0 && renderedDrilldowns}
            {nestedCats.length === 0 && <p className='drilldownHint'>{translate('Click legend to drill down')}</p>}
        </div>
    );
}

function FancyBreakdown(props) {
    const classes = useStyles();
    const name = props.name ? props.name : 'fancybreakdown';
    const data = props.data;

    const [dataType, setDataType] = useState(props.spending ? DataTypes.Spending : DataTypes.Income);
    const [resourceType, setResourceType] = useState('');
    const [breakdownLevel, setBreakdownLevel] = useState([]);

    useEffect(() => {
        const savedType = window.localStorage.getItem(`${name}-datatype`);
        const savedDrilldown = window.localStorage.getItem(`${name}-drilldown`);
        if (savedType !== null) {
            setDataType(JSON.parse(savedType));
        }
        if (savedDrilldown !== null) {
            setBreakdownLevel(JSON.parse(savedDrilldown));
        }
    }, [name]);
    useEffect(() => {
        if (dataType)
            window.localStorage.setItem(`${name}-datatype`, JSON.stringify(dataType));
    }, [dataType, name]);
    useEffect(() => {
        if (resourceType)
            window.localStorage.setItem(`${name}-resource`, JSON.stringify(resourceType));
    }, [resourceType, name]);
    useEffect(() => {
        if (breakdownLevel)
            window.localStorage.setItem(`${name}-drilldown`, JSON.stringify(breakdownLevel));
    }, [breakdownLevel, name]);

    const onAreaClick = label => {
        if (breakdownLevel.length > 0) {
            const key = buildKey(dataType, resourceType, breakdownLevel);
            const cats = findKeysOverSeries(data, `${key}/breakdown`);
            if (cats.length === 0)
                return;
        }
        setBreakdownLevel([...breakdownLevel, label]);
    };
    const onDataTypeChange = event => {
        setBreakdownLevel([]);
        setDataType(event.target.value);
    };
    const onResourceTypeChange = event => {
        setBreakdownLevel([]);
        setResourceType(event.target.value);
    };

    // Determine resource types present in data
    const [resourceTypes, setResourceTypes] = useState([]);
    useEffect(() => {
        let types = [];
        [DataTypes.Income, DataTypes.Spending].forEach(dtype => {
            types = [...types, ...findKeysOverSeries(data, `economy/${DataKeys[dtype]}`)];
        });
        types = [...new Set(types)];
        setResourceTypes(types.map(type => {
            if (ResourceNames.hasOwnProperty(type))
                return ResourceNames[type];
            return type;
        }));
    }, [data]);

    // Render dropdown for top level types
    const renderResourceType = type => <MenuItem key={type} value={type}>{translate(type)}</MenuItem>;
    const renderedResourceTypes = resourceTypes.map(renderResourceType);

    // Manage label colors to keep consistent when drilling down
    const [labelColors, setLabelColors] = useState({});
    const [shuffledColors, setShuffledColors] = useState(null);
    const recurseDataKeys = (data, prefix) => {
        const keys = findKeysOverSeries(data, `${prefix}/breakdown`);
        return keys.reduce((acc, key) => {
            const lowKeys = recurseDataKeys(data, `${prefix}/breakdown/${key}`);
            return [...acc, key, ...lowKeys];
        }, []);
    };
    useEffect(() => {
        if (data.length > 0) {
            let labels = [];
            ['income', 'spending'].forEach(dtype => {
                const prefix = `economy/${dtype}`;
                const keys = findKeysOverSeries(data, prefix);
                keys.forEach(key => {
                    labels = [...labels, ...recurseDataKeys(data, `${prefix}/${key}`)];
                });
            });
            labels = [...new Set(labels)];
            let [newColors, shuffled] = getDataColors(labels, shuffledColors);
            setLabelColors(newColors);
            setShuffledColors(shuffled);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    // Rendered areas on chart
    const [chartAreas, setChartAreas] = useState([]);
    useEffect(() => {
        if (data.length === 0) return;
        const resourceKey = buildKey(dataType, resourceType, breakdownLevel);
        const cats = findKeysOverSeries(data, `${resourceKey}/breakdown`);
        let newChartAreas = [];
        if (cats.length > 0) {
            newChartAreas = cats.map(cat => {
                return {
                    label: cat,
                    selector: snap => selectNested(`${resourceKey}/breakdown/${cat}/total`, snap)
                };
            });
        }
        else if (breakdownLevel.length > 0) {
            newChartAreas = [{
                label: breakdownLevel[breakdownLevel.length - 1],
                selector: snap => selectNested(`${resourceKey}/total`, snap)
            }];
        }
        setChartAreas(newChartAreas);
    }, [data, resourceType, dataType, breakdownLevel]);

    // Material Select is stupid, have to trick it
    useEffect(() => {
        const savedResource = window.localStorage.getItem(`${name}-resource`);
        if (savedResource !== null) {
            const resource = JSON.parse(savedResource);
            if (!resourceType && resourceTypes.includes(resource)) {
                setResourceType(resource);
            }
        }
        else if (!resourceType && resourceTypes.includes('Energy Credit')) {
            setResourceType('Energy Credit'); // TODO - refactor to make less janky. use keys in breakdown, not labels
        }
    }, [data, resourceType, resourceTypes, name]);

    return (
        <Chart name={Name} overlay={props.overlay} title={`${resourceType} ${dataType} Drilldowns`} titleColor='#ded140'>
            <div className='fancyChartForm'>
                <div className='fancyChartInner'>
                    <FormControl className={classes.formControl}>
                        <Select value={resourceType} onChange={onResourceTypeChange}>
                            {renderedResourceTypes}
                        </Select>
                    </FormControl>
                    <FormControl className={classes.formControl}>
                        <Select value={dataType} onChange={onDataTypeChange}>
                            <MenuItem value={DataTypes.Income}>{translate('Income')}</MenuItem>
                            <MenuItem value={DataTypes.Spending}>{translate('Spending')}</MenuItem>
                        </Select>
                    </FormControl>
                    <BreadCrumbs onNavigate={setBreakdownLevel} breakdown={breakdownLevel}/>
                </div>
            </div>
            <div className='fancyBreakdownChart'>
                <AreaChart
                    data={data}
                    areas={chartAreas}
                    onAreaClick={onAreaClick}
                    allowIsolation={false}
                    stack={true}
                    labelColors={labelColors}
                />
            </div>
        </Chart>
    );
}

registerChart(
    Name,
    'Detailed breakdown of income or spending of any resource with multiple drilldown levels',
    FancyBreakdown
);

export default FancyBreakdown;
