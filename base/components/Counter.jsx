/**
 * A counter where the numbers spin up to the actual figure.
 */

 // TODO support for more precise than 3 sig figs

/* Possible TODO MAYBE! use react-spring for smoother, less expensive animations?? Should be default tool?? */

import React, {useState, useEffect, useRef} from 'react';
import { space } from '../utils/miscutils';
import printer from '../utils/printer';
import {useDoesIfVisible} from './CustomHooks';
import Money from '../data/Money';

/**
 * Use a bezier for a slow start/end, fast middle easing
 * @param t [0,1] 0 = start of curve, 1 = end of curve
 * @returns [0,1]
 */
const bezierSlide = (x = 0) => {
	if (x <= 0) return 0;
	if (x >= 1) return 1;
	// ref https://en.wikipedia.org/wiki/B%C3%A9zier_curve#Cubic_B%C3%A9zier_curves
	// This probably wants tweaking! And/or I may have got the equation wrong ^Dan
	/*
		RM: I graphed this with the old values (p1y = 0.1, p2y = 0.9) on https://www.desmos.com/calculator
		...and based on playing with that for a few seconds, changed the control points to y = 0 and 1.
		Which simplified the equation a LOT!
		Also, just to be a pain, I changed the parametric t to x - so if you paste it in, it'll graph cleanly and you can see what I'm talking about.
		const p1y = 0.1, p2y = 0.9;
		const y = 3*(1-t)*(1-t)*t*p1y + 3*(1-t)*t*t*p2y + t*t*t;
	*/
	return 3*x*x - 2*x*x*x;
};

/**
 * NB The useState version of setState() doesn't merge partial state objects onto the old state
 * ...so we grab the state object AND the members we need, and call setState({ ...state, { new partial state } })
 * @param {Number} value Final value to display
 * @param {Number} initial Value to start counting from
 * @param {Number} animationLength Time (msec) to reach final number
 * @param {Number} fps frames per second
 * @param {String} currencySymbol
 * @param {Money} amount - Convenient way to set value + currencySymbol
 * @param {Number} sigFigs Round value. 3 by default for non-Money inputs.
 * @param {Boolean} preservePennies Preserves 2 digits on the pennies count. This overrides sigFigs. True by default for money.
 * @param {Boolean} centerText Centers the text when counting up in the animation.
 */
const Counter = ({value, amount, initial = 0, animationLength = 3000, fps = 20, currencySymbol = '', pretty = true, sigFigs, preservePennies, centerText=false}) => 
{
	if (amount) {
		value = Money.value(amount);
		currencySymbol = Money.currencySymbol(amount);
	}
	if ( ! value) {	// paranoia
		console.warn("Counter - No value or amount");
		return null;
	}
	const [state, setState] = useState({displayValue: initial});
	const [done, setDone] = useState();
	const {startTime, displayValue} = state;
	const ref = useRef();	

	// Number Formatting
	const options = {};
	// ...set default value for preservePennies and sigFigs (but not both)
	if (preservePennies===undefined && ! sigFigs && (amount || currencySymbol)) {
		preservePennies = true;				
	}
	if (sigFigs===undefined) {
		sigFigs = preservePennies? false : 3;
	}
	if (sigFigs) options.maximumSignificantDigits = sigFigs;
	if (preservePennies) {
		options.minimumFractionDigits = 2;
		options.maximumFractionDigits = 2;
	}
	const formatNum = x => {		
		try {
			return new Intl.NumberFormat('en-GB', options).format(x);
		} catch(er) {
			console.warn("Counter.jsx formatNumber "+er); // Handle the weird Intl undefined bug, seen Oct 2019, possibly caused by a specific phone type
			return ""+x;	
		}	
	};

	// Start animation the FIRST time the component enters the viewport
	useDoesIfVisible(() => {
		if (!startTime) setState({...state, startTime: new Date().getTime()});
	}, ref);

	// Is the component visible & not yet done animating?
	if (startTime && ! done) {
		const elapsed = new Date().getTime() - startTime;
		// Display fraction of final amount based on "bezier curve"
		// Aim to show roughly 20 frames per second
		window.setTimeout(() => {
			const displayVal = initial + (bezierSlide(elapsed / animationLength) * (value - initial));
			setState({...state, displayValue: displayVal});
		}, animationLength / fps);
		// Have we passed the end of the animation duration? Don't update again after this.
		if (elapsed >= animationLength) {
			setDone(true); // NB: done was mixed into state, but this made it easy to have bugs which lost the done flag
		}
	}

	let disp = pretty? formatNum(displayValue) : displayValue.toString();	

	// Get the total value in pretty penny form too, for preserving the size
	let totalVal = pretty ? formatNum(value) : value.toString();
	
	// Make sure the display value is no longer than the end size
	disp = disp.substr(0, totalVal.length);

	// To avoid having the surrounding text jitter, we fix the size.
	// using an invisible final value to get the sizing right.
	// Text is aligned by absolute position of span, right:0 = right alignment by default
	// If centerText is set, width is set to 100 and text-center does the job
	// When centerText is set, the container div gets some extra horizontal padding to stop text overflow
	return (
		<div className="position-relative d-inline-block" style={{padding: "0 " + (centerText ? "0.1rem" : "0")}}>
			<span className="invisible text-center" style={{width: centerText ? "100%" : "auto"}}>{currencySymbol + totalVal}</span>
			<span className="position-absolute text-center" style={{right: 0, width: centerText ? "100%" : "auto"}} ref={ref}>{currencySymbol + disp}</span>
		</div>
	);
};

export default Counter;
