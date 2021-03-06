
/**
 * 
 * TODO refactor other select-options-from-a-list controls from PropControl into here
 * 
 */

import React from 'react';

import PropControl, {registerControl, DSsetValue} from './PropControl';
import DataStore from '../plumbing/DataStore';
import { Badge, Form, FormGroup, Input, Label } from 'reactstrap';
import CloseButton from './CloseButton';
import { useState } from 'react';
import { asArray, labeller } from '../utils/miscutils';

/**
 * A list-of-strings editor, where the strings are drawn as discrete "pills"
 * @param {Object} p
 * @param {String[]} p.value
 * @param {String[] | Function | Object} p.labels Optional value-to-string convertor.
 */
const PropControlCheckboxes = ({rawValue, storeValue, setRawValue, modelValueFromInput, path, prop, proppath, type, options, labels, tooltips, inline, fcolor, saveFn}) => {
	assert(options, `PropControl: no options for radio ${prop}`);
	assert(options.map, `PropControl: radio options for ${prop} not an array: ${options}`);

	const listValue = asArray(storeValue);

	// Make an option -> nice label function
	// the labels prop can be a map or a function
	let labelFn = labeller(options, labels);
	let tooltipFn = tooltips && labeller(options, tooltips);

	// convert value to String[] for checkboxes
	const onChange = e => {
		console.log("onchange", e); // minor TODO DataStore.onchange recognise and handle events
		const val = e && e.target && e.target.value;			
		// toggle on/off
		let newList;
		if (listValue.includes(val)) {
			newList = listValue.filter(v => v !== val);
		} else {
			newList = listValue.concat(val);
		}
		let newList2 = modelValueFromInput? modelValueFromInput(newList, type, e) : newList;
		DSsetValue(proppath, newList2);
		if (saveFn) saveFn({ event: e, path, prop, value: newList2});
	};
	const isChecked = x => listValue.includes(x);
	return <Checkboxes {...{options, inline, prop, isChecked, onChange, labelFn, tooltipFn}} />;
}; // ./radio
registerControl({type:'checkboxes', $Widget: PropControlCheckboxes});
registerControl({type:'checkboxArray', $Widget: PropControlCheckboxes});

/**
 * 
 * @param {Object} p
 */
const Checkboxes = ({options, inline, prop, isChecked, onChange, labelFn, tooltipFn}) => options.map(option => 
	(
		<FormGroup check inline={inline} key={option} title={tooltipFn && tooltipFn(option)}>
			<Input type='checkbox' key={`option_${option}`}
				className="form-check-input"
				name={prop} value={option}
				checked={ !! isChecked(option)}
				onChange={onChange} />
			<Label check>
				{labelFn(option)}
			</Label>
		</FormGroup>
	));


/**
 * A list-of-strings editor, where the strings are drawn as discrete "pills"
 * @param {Object} p
 * @param {{String:Boolean}} p.value
 * @param {String[] | Function | Object} p.labels Optional value-to-string convertor.
 */
const PropControlCheckboxObject = ({rawValue, storeValue, setRawValue, modelValueFromInput, path, prop, proppath, type, options, labels, tooltips, inline, fcolor, saveFn}) => {
	assert(options, `PropControl: no options for ${prop}`);
	assert(options.map, `PropControl: options for ${prop} not an array: ${options}`);

	const objValue = storeValue || {};

	// Make an option -> nice label function
	// the labels prop can be a map or a function
	let labelFn = labeller(options, labels);
	let tooltipFn = tooltips && labeller(options, tooltips);

	// convert value to String[] for checkboxes
	const onChange = e => {
		const val = e && e.target && e.target.value;			
		// toggle on/off
		objValue[val] = ! objValue[val];
		DSsetValue(proppath, objValue, true);
		if (saveFn) saveFn({ event: e, path, prop, value: objValue});
	};
	const isChecked = x => objValue[x];

	return <Checkboxes {...{options, inline, prop, isChecked, onChange, labelFn, tooltipFn}} />;
};
registerControl({type:'checkboxObject', $Widget: PropControlCheckboxObject});

// This is not really for use
const PropControlSelection = PropControlCheckboxes;
export default PropControlSelection;

