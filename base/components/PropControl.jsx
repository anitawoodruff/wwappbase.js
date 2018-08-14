/** PropControl provides inputs linked to DataStore.
 */
import React from 'react';

// FormControl removed in favour of basic <inputs> as that helped with input lag
// TODO remove the rest of these
import { Checkbox, InputGroup, DropdownButton, MenuItem} from 'react-bootstrap';

import {assert, assMatch} from 'sjtest';
import _ from 'lodash';
import Enum from 'easy-enums';
import Misc from './Misc';
// import { setHash, XId, addScript} from 'wwutils';
import PV from 'promise-value';
import Dropzone from 'react-dropzone';

import DataStore from '../plumbing/DataStore';
import ServerIO from '../plumbing/ServerIOBase';
// import ActionMan from '../plumbing/ActionManBase';
import printer from '../utils/printer';
import C from '../CBase';
import BS from './BS';
import Money from '../data/Money';
import Autocomplete from 'react-autocomplete';
// // import I18n from 'easyi18n';
import {getType, getId, nonce} from '../data/DataClass';
import md5 from 'md5';


/**
 * Input bound to DataStore.
 * aka Misc.PropControl
 * 
 * @param saveFn {Function} {path, prop, item, value} You are advised to wrap this with e.g. _.debounce(myfn, 500).
 * NB: we cant debounce here, cos it'd be a different debounce fn each time.
 * label {?String}
 * @param path {String[]} The DataStore path to item, e.g. [data, NGO, id]
 * @param item The item being edited. Can be null, and it will be fetched by path.
 * @param prop The field being edited 
 * @param dflt {?Object} default value Beware! This may not get saved if the user never interacts.
 * @param modelValueFromInput {?Function} See standardModelValueFromInput
 * @param required {?Boolean} If set, this field should be filled in before a form submit. 
* 		TODO mark that somehow
* @param validator {?(value, rawValue) => String} Generate an error message if invalid
* @param inline {?Boolean} If set, this is an inline form, so add some spacing to the label.
* @param https {?Boolean} if true, urls must use https not http (recommended)
 */
const PropControl = (props) => {
	let {type="text", path, prop, label, help, tooltip, error, validator, recursing, inline, ...stuff} = props;
	assMatch(prop, "String|Number");
	assMatch(path, Array);
	const proppath = path.concat(prop);

	// HACK: catch bad dates and make an error message
	// TODO generalise this with a validation function
	if (Misc.ControlTypes.isdate(type) && ! validator) {
		validator = (v, rawValue) => {
			if ( ! v) {
				// raw but no date suggests the server removed it
				if (rawValue) return 'Please use the date format yyyy-mm-dd';
				return null;
			}
			try {
				let sdate = "" + new Date(v);
				if (sdate === 'Invalid Date') {
					return 'Please use the date format yyyy-mm-dd';
				}
			} catch (er) {
				return 'Please use the date format yyyy-mm-dd';
			}
		};
	} // date
	// url: https
	if (stuff.https !== false && (Misc.ControlTypes.isurl(type) || Misc.ControlTypes.isimg(type) || Misc.ControlTypes.isimgUpload(type))
			&& ! validator)
	{
		validator = v => {
			if (v && v.substr(0,5) === 'http:') {
				return "Please use https for secure urls";
			}
			return null;
		};
	}
	// validate!
	if (validator) {
		const value = DataStore.getValue(proppath);
		const rawPath = path.concat(prop+"_raw");
		const rawValue = DataStore.getValue(rawPath);
		error = validator(value, rawValue);
	}

	// label / help? show it and recurse
	// NB: Checkbox has a different html layout :( -- handled below
	if ((label || help || tooltip || error) && ! Misc.ControlTypes.ischeckbox(type) && ! recursing) {
		// Minor TODO help block id and aria-described-by property in the input
		const labelText = label || '';
		const helpIcon = tooltip ? <Misc.Icon glyph='question-sign' title={tooltip} /> : '';
		// NB: The label and PropControl are on the same line to preserve the whitespace in between for inline forms.
		// NB: pass in recursing error to avoid an infinite loop with the date error handling above.
		return (
			<div className={'form-group' + (error? ' has-error' : '')}>
				{label || tooltip? <label htmlFor={stuff.name}>{labelText} {helpIcon}</label> : null}
				{inline? ' ' : null}
				<PropControl
					type={type} path={path} prop={prop} error={error} {...stuff} recursing 
				/>
				{help? <span className="help-block">{help}</span> : null}
				{error? <span className="help-block">{error}</span> : null}
			</div>
		);
	}

	// unpack
	let {item, bg, dflt, saveFn, modelValueFromInput, ...otherStuff} = stuff;
	if ( ! modelValueFromInput) modelValueFromInput = standardModelValueFromInput;
	assert( ! type || Misc.ControlTypes.has(type), 'Misc.PropControl: '+type);
	assert(_.isArray(path), 'Misc.PropControl: not an array:'+path);
	assert(path.indexOf(null)===-1 && path.indexOf(undefined)===-1, 'Misc.PropControl: null in path '+path);
	// // item ought to match what's in DataStore - but this is too noisy when it doesn't
	// if (item && item !== DataStore.getValue(path)) {
	// 	console.warn("Misc.PropControl item != DataStore version", "path", path, "item", item);
	// }
	if ( ! item) {
		item = DataStore.getValue(path) || {};
	}
	let value = item[prop]===undefined? dflt : item[prop];

	// Checkbox?
	if (Misc.ControlTypes.ischeckbox(type)) {
		const onChange = e => {
			// console.log("onchange", e); // minor TODO DataStore.onchange recognise and handle events
			const val = e && e.target && e.target.checked;
			DataStore.setValue(proppath, val);
			if (saveFn) saveFn({path, prop, item, value: val});		
		};
		if (value===undefined) value = false;
		const helpIcon = tooltip ? <Misc.Icon glyph='question-sign' title={tooltip} /> : null;
		return (<div>
			<Checkbox checked={value} onChange={onChange} {...otherStuff}>{label} {helpIcon}</Checkbox>
			{help? <span className="help-block">{help}</span> : null}
			{error? <span className="help-block">{error}</span> : null}
		</div>);
	} // ./checkbox

	// HACK: Yes-no (or unset) radio buttons? (eg in the Gift Aid form)
	if (type === 'yesNo') {
		const onChange = e => {
			// console.log("onchange", e); // minor TODO DataStore.onchange recognise and handle events
			const val = e && e.target && e.target.value && e.target.value !== 'false';
			DataStore.setValue(proppath, val);
			if (saveFn) saveFn({path, prop, item, value: val});		
		};

		// Null/undefined doesn't mean "no"! Don't check either option until we have a value.
		const noChecked = value !== null && value !== undefined && !value;

		return (
			<div className='form-group'>
				<BS.Radio value name={prop} onChange={onChange} checked={value} inline label='Yes' />
				<BS.Radio value={false} name={prop} onChange={onChange} checked={noChecked} inline label='No' />
			</div>
		);
	}


	if (value===undefined) value = '';

	// £s
	// NB: This is a bit awkward code -- is there a way to factor it out nicely?? The raw vs parsed/object form annoyance feels like it could be a common case.
	if (type === 'Money') {
		let acprops = {prop, value, path, proppath, item, bg, dflt, saveFn, modelValueFromInput, ...otherStuff};
		return <PropControlMoney {...acprops} />;
	} // ./£
	// text based
	const onChange = e => {
		console.log("event", e, e.type);
		// TODO a debounced property for "do ajax stuff" to hook into. HACK blur = do ajax stuff
		DataStore.setValue(['transient', 'doFetch'], e.type==='blur');	
		let mv = modelValueFromInput(e.target.value, type, e.type);
		DataStore.setValue(proppath, mv);
		if (saveFn) saveFn({path, value:mv});
		e.preventDefault();
		e.stopPropagation();
	};

	if (type === 'arraytext') {
		// Pretty hacky: Value stored as ["one", "two", "three"] but displayed as "one two three"
		// Currently used for entering list of unit-variants for publisher
		const arrayChange = e => {
			const oldString = DataStore.getValue(proppath);
			const newString = e.target.value;

			// Split into space-separated tokens
			let newValue = newString.split(' ');
			// Remove falsy entries, if deleting (ie newString is substring of oldString) but not if adding
			// allows us to go 'one' (['one']) -> "one " ('one', '') -> "one two" ('one', 'two')
			if (oldString.indexOf(newString) >= 0) {
				newValue = newValue.filter(val => val);
			}
			
			DataStore.setValue(proppath, newValue);
			if (saveFn) saveFn({path});
			e.preventDefault();
			e.stopPropagation();
		};
		return <Misc.FormControl type={type} name={prop} value={value.join(' ')} onChange={arrayChange} {...otherStuff} />;
	}

	if (type==='textarea') {
		return <textarea className="form-control" name={prop} onChange={onChange} {...otherStuff} value={value} />;
	}
	if (type==='json') {
		let spath = ['transient'].concat(proppath);
		let svalue = DataStore.getValue(spath) || JSON.stringify(value);
		const onJsonChange = e => {
			console.log("event", e.target && e.target.value, e, e.type);
			DataStore.setValue(spath, e.target.value);
			try {				
				let vnew = JSON.parse(e.target.value);
				DataStore.setValue(proppath, vnew);
				if (saveFn) saveFn({path:path});
			} catch(err) {
				console.warn(err);
				// TODO show error feedback
			}			
			e.preventDefault();
			e.stopPropagation();
		};
		return <textarea className="form-control" name={prop} onChange={onJsonChange} {...otherStuff} value={svalue} />;
	}

	if (type==='img') {
		delete otherStuff.https;
		return (<div>
				<Misc.FormControl type='url' name={prop} value={value} onChange={onChange} {...otherStuff} />
			<div className='pull-right' style={{background: bg, padding:bg?'20px':'0'}}><Misc.ImgThumbnail url={value} style={{background:bg}} /></div>
				<div className='clearfix' />
			</div>);
	}

	if (type === 'imgUpload') {
		delete otherStuff.https;
		const uploadAccepted = (accepted, rejected) => {
			const progress = (event) => console.log('UPLOAD PROGRESS', event.loaded);
			const load = (event) => console.log('UPLOAD SUCCESS', event);
	
			accepted.forEach(file => {
				ServerIO.upload(file, progress, load)
					.done(response => {
						let imgurl = response.cargo.url;
						DataStore.setValue(path.concat(prop), imgurl);
					});
			});
	
			rejected.forEach(file => {
				// TODO Inform the user that their file had a Problem
			});
		};

		return (
			<div>
				<Misc.FormControl type='url' name={prop} value={value} onChange={onChange} {...otherStuff} />
				<div className='pull-left'>
					<Dropzone
						className='DropZone'
						accept='image/jpeg, image/png, image/svg+xml'
						style={{}}
						onDrop={uploadAccepted}
					>
						Drop a JPG, PNG, or SVG image here
					</Dropzone>
				</div>
				<div className='pull-right' style={{background: bg, padding:bg?'20px':'0'}}><Misc.ImgThumbnail style={{background: bg}} url={value} /></div>
				<div className='clearfix' />
			</div>
		);
	} // ./imgUpload

	if (type==='url') {
		delete otherStuff.https;
		return (<div>
			<Misc.FormControl type='url' name={prop} value={value} onChange={onChange} onBlur={onChange} {...otherStuff} />
			<div className='pull-right'><small>{value? <a href={value} target='_blank'>open in a new tab</a> : null}</small></div>
			<div className='clearfix' />
		</div>);
	}

	// date
	// NB dates that don't fit the mold yyyy-MM-dd get ignored by the date editor. But we stopped using that
	//  && value && ! value.match(/dddd-dd-dd/)
	if (Misc.ControlTypes.isdate(type)) {
		const acprops = {prop, item, value, onChange, ...otherStuff};
		return <PropControlDate {...acprops} />;
	}

	if (type==='radio' || type==='checkboxes') {
		return <PropControlRadio value={value} {...props} />
	}
	if (type==='select') {
		const { options, defaultValue, labels, ...rest} = otherStuff;

		assert(options, 'Misc.PropControl: no options for select '+[prop, otherStuff]);
		assert(options.map, 'Misc.PropControl: options not an array '+options);
		// Make an option -> nice label function
		// the labels prop can be a map or a function
		let labeller = v => v;
		if (labels) {
			if (_.isArray(labels)) {
				labeller = v => labels[options.indexOf(v)] || v;
			} else if (_.isFunction(labels)) {
				labeller = labels;				
			} else {
				// map
				labeller = v => labels[v] || v;
			}
		}
		// make the options html
		let domOptions = options.map(option => <option key={"option_"+option} value={option} >{labeller(option)}</option>);
		let sv = value || defaultValue;
		return (
			<select className='form-control' name={prop} value={sv} onChange={onChange} {...rest} >
				{sv? null : <option></option>}
				{domOptions}
			</select>
		);
	}
	if (type==='autocomplete') {
		let acprops ={prop, value, path, proppath, item, bg, dflt, saveFn, modelValueFromInput, ...otherStuff};
		return <PropControlAutocomplete {...acprops} />;
	}
	// normal
	// NB: type=color should produce a colour picker :)
	return <Misc.FormControl type={type} name={prop} value={value} onChange={onChange} {...otherStuff} />;
}; //./PropControl


/**
 * 
 * TODO buttons style
 * 
 * TODO radio buttons
 * 
 * @param labels {String[] | Function | Object} Optional value-to-string convertor.
 */
const PropControlRadio = ({type, prop, value, path, item, dflt, saveFn, options, labels, inline, defaultValue, ...otherStuff}) => {
	assert(options, 'PropControl: no options for radio '+prop);
	assert(options.map, 'PropControl: radio options for '+prop+' not an array '+options);
	// Make an option -> nice label function
	// the labels prop can be a map or a function
	let labeller = v => v;
	if (labels) {
		if (_.isArray(labels)) {
			labeller = v => labels[options.indexOf(v)] || v;
		} else if (_.isFunction(labels)) {
			labeller = labels;				
		} else {
			// map
			labeller = v => labels[v] || v;
		}
	}
	// make the options html
	const onChange = e => {
		// console.log("onchange", e); // minor TODO DataStore.onchange recognise and handle events
		const val = e && e.target && e.target.value;
		DataStore.setValue(path.concat(prop), val);
		if (saveFn) saveFn({path, prop, item, value: val});		
	};

	const Check = type==='checkboxes'? BS.Checkbox : BS.Radio;

	return (
		<div className='form-group' >
			{options.map(option => (			
				<Check key={"option_"+option} name={prop} value={option} 
						checked={option == value} 
						onChange={onChange} {...otherStuff} 
						label={labeller(option)}
						inline={inline} />)
			)}
		</div>
	);	
}; // ./radio


/**
 * Strip commas £/$/euro and parse float
 * @param {*} v 
 * @returns Number. undefined/null are returned as-is.
 */
const numFromAnything = v => {
	if (v===undefined || v===null) return v;
	if (_.isNumber(v)) return v;
	// strip any commas, e.g. 1,000
	if (_.isString(v)) {
		v = v.replace(/,/g, "");
		// £ / $ / euro
		v = v.replace(/^(-)?[£$\u20AC]/, "$1");
	}
	return parseFloat(v);
};

const PropControlMoney = ({prop, value, path, proppath, 
									item, bg, dflt, saveFn, modelValueFromInput, ...otherStuff}) => {
		// special case, as this is an object.
	// Which stores its value in two ways, straight and as a x100 no-floats format for the backend
	// Convert null and numbers into MA objects
	if ( ! value || _.isString(value) || _.isNumber(value)) {
		value = Money.make({value});
	}
	// prefer raw, so users can type incomplete answers!
	let v = value.raw || value.value;
	if (v===undefined || v===null || _.isNaN(v)) { // allow 0, which is falsy
		v = '';
	}
	//Money.assIsa(value); // type can be blank
	// handle edits
	const onMoneyChange = e => {
		// TODO move more of this into Money.js as Money.setValue()
		// keep blank as blank (so we can have unset inputs), otherwise convert to number/undefined		
		let newVal = numFromAnything(e.target.value);
		value = Money.setValue(value, newVal);
		value.raw = e.target.value; // Store raw, so we can display blank strings
		DataStore.setValue(proppath, value, true); // force update 'cos editing the object makes this look like a no-op
		// console.warn("£", value, proppath);
		if (saveFn) saveFn({path, value});
	};
	let curr = Money.CURRENCY[value && value.currency] || <span>&pound;</span>;
	let currency;
	let changeCurrency = otherStuff.changeCurrency !== false;
	if (changeCurrency) {
		// TODO other currencies
		currency = (
			<DropdownButton disabled={otherStuff.disabled} title={curr} componentClass={InputGroup.Button} id={'input-dropdown-addon-'+JSON.stringify(proppath)}>
				<MenuItem key="1">{curr}</MenuItem>
			</DropdownButton>
		);
	} else {
		currency = <InputGroup.Addon>{curr}</InputGroup.Addon>;
	}
	delete otherStuff.changeCurrency;
	assert(v === 0 || v || v==='', [v, value]);
	// make sure all characters are visible
	let minWidth = ((""+v).length / 1.5)+"em";
	return (<InputGroup>
		{currency}
		<FormControl name={prop} value={v} onChange={onMoneyChange} {...otherStuff} style={{minWidth}}/>
	</InputGroup>);
}; // ./£


const PropControlDate = ({prop, item, value, onChange, ...otherStuff}) => {
	// NB dates that don't fit the mold yyyy-MM-dd get ignored by the native date editor. But we stopped using that.
	// NB: parsing incomplete dates causes NaNs
	let datePreview = null;
	if (value) {
		try {
			let date = new Date(value);
			// use local settings??
			datePreview = date.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'});
		} catch (er) {
			// bad date
			datePreview = 'Invalid date';
		}
	}

	// HACK: also set the raw text in _raw. This is cos the server may have to ditch badly formatted dates.
	// NB: defend against _raw_raw
	const rawProp = prop.substr(prop.length-4, prop.length) === '_raw'? null : prop+'_raw';
	if ( ! value && item && rawProp) value = item[rawProp];
	const onChangeWithRaw = e => {
		if (item && rawProp) {
			item[rawProp] = e.target.value;
		}
		onChange(e);
	};

	// let's just use a text entry box -- c.f. bugs reported https://github.com/winterstein/sogive-app/issues/71 & 72
	// Encourage ISO8601 format
	if ( ! otherStuff.placeholder) otherStuff.placeholder = 'yyyy-mm-dd, e.g. today is '+Misc.isoDate(new Date());
	return (<div>
		<Misc.FormControl type='text' name={prop} value={value} onChange={onChangeWithRaw} {...otherStuff} />
		<div className='pull-right'><i>{datePreview}</i></div>
		<div className='clearfix' />
	</div>);	
};


/**
* wraps the reactjs autocomplete widget
*/
const PropControlAutocomplete = ({prop, value, options, getItemValue, renderItem, path, proppath, 
	item, bg, dflt, saveFn, modelValueFromInput, ...otherStuff}) => {
		// a place to store the working state of this widget
		let widgetPath = ['widget', 'autocomplete'].concat(path);
		if ( ! getItemValue) getItemValue = s => s;
		if ( ! renderItem) renderItem = a => printer.str(a);
		const type='autocomplete';
		let items = _.isArray(options)? options : DataStore.getValue(widgetPath) || [];
		// NB: typing sends e = an event, clicking an autocomplete sends e = a value
		const onChange2 = (e, optItem) => {
			console.log("event", e, e.type, optItem);
			// TODO a debounced property for "do ajax stuff" to hook into. HACK blur = do ajax stuff
			DataStore.setValue(['transient', 'doFetch'], e.type==='blur');	
			// typing sneds an event, clicking an autocomplete sends a value
			const val = e.target? e.target.value : e;
			let mv = modelValueFromInput(val, type, e.type);
			DataStore.setValue(proppath, mv);
			if (saveFn) saveFn({path:path, value:mv});
			// e.preventDefault();
			// e.stopPropagation();
		};
		const onChange = (e, optItem) => {
			onChange2(e, optItem);
			if ( ! e.target.value) return;
			if ( ! _.isFunction(options)) return;
			let optionsOutput = options(e.target.value);
			let pvo = PV(optionsOutput);
			pvo.promise.then(oo => {
				DataStore.setValue(widgetPath, oo);
				// also save the info in data
				// NB: assumes we use status:published for auto-complete
				oo.forEach(opt => getType(opt) && getId(opt)? DataStore.setValue(getPath(C.KStatus.PUBLISHED,getType(opt),getId(opt)), opt) : null);
			});
			// NB: no action on fail - the user just doesn't get autocomplete		
		};
		
	return (<Autocomplete 
		inputProps={{className: otherStuff.className || 'form-control'}}
		getItemValue={getItemValue}
		items={items}
		renderItem={renderItem}
		value={value}
		onChange={onChange}
		onSelect={onChange2} 
		/>);
}; //./autocomplete
	
	
/**
* Convert inputs (probably text) into the model's format (e.g. numerical)
* @param eventType "change"|"blur" More aggressive edits should only be done on "blur"
* @returns the model value/object to be stored in DataStore
*/
const standardModelValueFromInput = (inputValue, type, eventType) => {
	if ( ! inputValue) return inputValue;
	// numerical?
	if (type==='year') {
		return parseInt(inputValue);
	}
	if (type==='number') {		
		return numFromAnything(inputValue);
	}
	// url: add in https:// if missing
	if (type==='url' && eventType==='blur') {
		if (inputValue.indexOf('://') === -1 && inputValue[0] !== '/' && 'http'.substr(0, inputValue.length) !== inputValue.substr(0,4)) {
			inputValue = 'https://'+inputValue;
		}
	}
	// normalise text
	if (type==='text' || type==='textarea') {
		inputValue = Misc.normalise(inputValue);
	}
	return inputValue;
};

Misc.normalise = s => {
	if ( ! s) return s;
	s = s.replace(/['`’‘’ʼ]/g, "'");
	s = s.replace(/[\"“”„‟❛❜❝❞«»]/g, '"');
	s = s.replace(/[‐‑‒–—―-]/g, '-');
	s = s.replace(/[\u00A0\u2007\u202F\u200B]/g, ' ');
	return s;
};
	

/**
 * This replaces the react-bootstrap version 'cos we saw odd bugs there. 
 * Plus since we're providing state handling, we don't need a full component.
 */
const FormControl = ({value, type, required, ...otherProps}) => {
	if (value===null || value===undefined) value = '';

	if (type==='color' && ! value) { 
		// workaround: this prevents a harmless but annoying console warning about value not being an rrggbb format
		return <input className='form-control' type={type} {...otherProps} />;	
	}
	// add css classes for required fields
	let klass = 'form-control'+ (required? (value? ' form-required' : ' form-required blank') : '');
	// remove stuff intended for other types that will upset input
	delete otherProps.options;
	delete otherProps.labels;
	return <input className={klass} type={type} value={value} {...otherProps} />;
};


const ControlTypes = new Enum("img imgUpload textarea text select radio checkboxes autocomplete password email url color Money checkbox"
							+" yesNo location date year number arraytext address postcode json");


Misc.FormControl = FormControl;
Misc.ControlTypes = ControlTypes;
Misc.PropControl = PropControl;

export {
	FormControl,
	ControlTypes
};
// should we rename it to Input, or StoreInput, ModelInput or some such??
export default PropControl;