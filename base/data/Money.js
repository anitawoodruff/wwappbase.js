/**
	Money NB: based on the thing.org type MonetaryAmount
	TODO It'd be nice to make this immutable (can we use Object.freeze to drive that thrgough??)
*/
import { assert, assMatch } from '../utils/assert';
import {asNum} from '../utils/miscutils';
import DataClass, {getType} from './DataClass';
import C from '../CBase';
import Settings from '../Settings';
import Enum from 'easy-enums';

/**
 * 
 * e.g. new Money({currency:GBP, value:10}) = £10
 * 
*/
class Money extends DataClass {

	/** @type {?String} An optional name for this money */
	name;

	/** @type {Number} 1/100 of a penny, so £1 = 10,000.
	 * Integer to avoid floating point issues (if a float is input, it will be rounded). */
	value100p;

	/** @type {?String} raw string version -- potentially for audit trails */
	raw;

	/** @type {!String} */
	currency = 'GBP'; // default

	/**
	 * @param {?Money|String|Number} base
	 */
	constructor(base) {
		// allow `new Money("£10")`
		if (typeof(base)==='string') {
			base = {raw: base};
			if (base.raw[0]==='$') base.currency = 'USD'; // HACK! A look up from CURRENCY would be better
			else if (base.raw[0]==='£') base.currency = 'GBP';
		} else if (typeof(base)==='number') {
			base = {value: base};
		}
		// normal new
		super(base);
		Object.assign(this, base);
		this['@type'] = 'Money';
		Money.value(this); // init v100p from value
	};

	/** duck type: needs a value or currency */
	static isa(obj) {
		if ( ! obj) return false;
		if (super.isa(obj)) return true;
		// OLD format
		if (getType(obj) === 'MonetaryAmount') return true;
		if (obj.value100p) return true;
		if (obj.value100) return true;
			// allow blank values
		if (isNumeric(obj.value) || obj.value==='') return true;
		if (obj.currency) return true;
		return false;
	}

} // ./Money
DataClass.register(Money, "Money");

const This = Money;
export default Money;

/* 

{
	currency: {String}
	value: {String|Number} The Java backend stores values as String and uses BigDecimal to avoid numerical issues.
	The front end generally handles them as Number, but sometimes as String.
}

*/
// ref: https://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric
const isNumeric = value => {
	return ! isNaN(value - parseFloat(value));
};

/**
 * 
 * @param {?Money} ma If null, returns 0
 * @return {Number}
 */
Money.value = ma => {
	// if(ma && ma.value === '') return '';
	return v100p(ma) / 10000;
};

/**
 * @param {?Money} m
 * @returns {Boolean} true if value is set (including 0)
 */
Money.hasValue = m => {
	if ( ! m) return false;
	return m.value || m.value === 0 || m.v100p || m.v100p === 0;
};

/**
 * 
 * @param {!Money} m
 * @param {!Number|falsy} newVal Can be null or '' for unset -- which will produce a value of 0
 * @return {Money} value and value100p set to newVal
 */
Money.setValue = (m, newVal) => {
	Money.assIsa(m);
	if (newVal) assMatch(newVal, Number, "Money.js - setValue() "+newVal);
	m.value = newVal;
	m.value100p = newVal? Math.round(newVal * 10000) : 0; // NB: null x Number = 0 nut undefined x Number = NaN. So let's standardise on 0
	// remove the raw field 'cos otherwise v100p() will use it to overwrite the new value!
	delete m.raw;
	// if (Money.value(m) != newVal) { // this can trigger for floating point rounding issues which probably should be ignored
	// 	console.warn("Money.js - setValue() mismatch "+newVal+" != "+Money.value(m), m);
	// }
	return m;
};

/**
 * @param m If null, return 0. The canonical field is `value100p` but this method will also read `value`
 * @return {Number} in hundredth of a penny. Defaults to 0.
 */
const v100p = m => {
	if ( ! m) return 0;
	// Patch old server data? TODO remove Q2 2020
	if (m.value100) {
		if ( ! m.value100p && ! m.raw) m.value100p = Math.round(m.value100 * 100);
		delete m.value100; // remove so it cant cause confusion esp if value becomes 0
	}
	// historical bug, seen April 2018 in SoGive: value edits lost! But preserved in .raw
	if (m.raw) {
		try {
			let v = asNum(m.raw);
			if (v===null || v===undefined) {
				m.error = new Error("Cannot parse: "+m.raw);
			}
			m.value = v;
			m.value100p = v? Math.round(v*10000) : 0;
		} catch(err) {
			console.warn("Money.js", err, m);
		}
	}
	// end of patching
	if (m.value100p) {
		return m.value100p;
	}
	if (m.value) {
		let v = parseFloat(m.value); // string or number
		m.value100p = Math.round(v * 10000);
		return m.value100p;
	}
	return 0;
};



Money.str = obj => (Money.CURRENCY[obj.currency]||'') + Money.value(obj);

/**
 * e.g. £1 = £1 != $1 != £1.50
 */
Money.eq = (a, b) => {
	if (a===b) return true;
	return a && b
		&& v100p(a) === v100p(b)
		&& (a.currency === b.currency || ! a.currency || ! b.currency);
};

/**
 * @deprecated (dont use externally) currency code to everyday symbol
 */
// could we use an enum instead??
Money.CURRENCY = {
	GBP: "£",
	USD: "$",
	AUD: "A$"
};
/**
 * ISO3166 two-letter code, e.g. "US" to three-letter currency code.
 */
Money.CURRENCY_FOR_COUNTRY = {
	GB: "GBP", UK: "GBP", // "UK" is wrong, not an iso 3166 code, but handle it anyway
	US: "USD",
	AU: "AUD"
}

/**
 * Convenience for getting the symbol for a Money object
 * @param {?Money} money
 * @returns {?String} e.g. "£" -- which you may need to html encode
 */
Money.currencySymbol = money => {
	return money && Money.CURRENCY[money.currency];
};

/**
 * @deprecated -- use new Money()
 * @param base e.g. £1 is {currency:'GBP', value:1}
 * WARNING - only pass in one definition of value, or you may get odd behaviour!
 */
Money.make = (base = {}) => {
	let item = new Money(base);
	return item;
};

/**
 * Check currencies match. Case insensitive.
 */
const assCurrencyEq = (a, b, msg) => {
	const m = "Money.js assCurrencyEq "+(msg||'')+" a:"+JSON.stringify(a)+"  b:"+JSON.stringify(b);
	Money.assIsa(a, m);
	Money.assIsa(b, m);
	// allow no-currency to pad
	if ( ! a.currency || ! b.currency) {
		return true;
	}
	assert(typeof(a.currency) === 'string' && typeof(b.currency) === 'string', m);
	assert(a.currency.toUpperCase() === b.currency.toUpperCase(), m);
};

/** Will fail if not called on 2 Moneys of the same currency
 * @return {Money} a fresh object
 */
Money.add = (amount1, amount2) => {
	Money.assIsa(amount1);
	Money.assIsa(amount2);
	assCurrencyEq(amount1, amount2, "add()");
	const b100p = v100p(amount1) + v100p(amount2);
	return moneyFromv100p(b100p, amount1.currency || amount2.currency);
};

/**
 * Convenience to process the results from arithmetic ops, without the gotchas of make() keeping bits of stale data
 * @param {*} b100p
 * @param {*} currency
 */
const moneyFromv100p = (b100p, currency) => {
	const res = {
		currency: currency,
		value: b100p/10000,
		value100p: b100p
	};
	const m = new Money(res);
	return m;
};

/**
 * 
 * @param {Money[]} amounts Can include nulls
 */
Money.total = amounts => {
	// assMatch(amounts, "Money[]", "Money.js - total()");
	let zero = new Money();
	Money.assIsa(zero);
	let ttl = amounts.reduce( (acc, m) => {
		if ( ! m) return acc; // skip nulls
		if ( ! Money.isa(m)) {
			console.warn(new Error("Money.total() - Not Money? "+JSON.stringify(m)), amounts);
			return acc;
		}
		return Money.add(acc, m);
	}, zero);
	return ttl;
};

/** 
 * Subtract.
 * Will fail if not called on 2 Moneys of the same currency
 * @param {!Money} amount1
 * @param {!Money} amount2
 * @returns {!Money} amount1 minues amount2
 *  */
Money.sub = (amount1, amount2) => {
	Money.assIsa(amount1);
	Money.assIsa(amount2);
	assCurrencyEq(amount1, amount2, "sub");
	const b100p = v100p(amount1) - v100p(amount2);
	return moneyFromv100p(b100p, amount1.currency || amount2.currency);
};

/** Multiply
 * @param {Money} amount
 * @param {Number} multiplier
 * @return {Money}
*/
const mul = (amount, multiplier) => {
	Money.assIsa(amount);
	assert(isNumeric(multiplier), "Money.js - mul() "+multiplier);
	// TODO Assert that multiplier is numeric (kind of painful in JS)
	const b100p = v100p(amount) * multiplier;
	return moneyFromv100p(b100p, amount.currency);
};
Money.mul = mul;

/**
 * Called on two Moneys
 * @return {Number} total / part
 */
Money.divide = (total, part) => {
	Money.assIsa(total);
	Money.assIsa(part);
	assCurrencyEq(total, part);
	return Money.value(total) / Money.value(part);
};

/**
 * get/set an explanation text
 * This is transient - it is NOT saved by Money.java
 * @return {?String}
 */
Money.explain = (money, expln) => {
	Money.assIsa(money);
	if (expln) money.explain = expln;
	return money.explain;
};

/**
 * Money span, falsy displays as 0
 * 
 * Converts monetary value in to properly formatted string (29049 -> 29,049.00)
 * 
 * @param amount {?Money|Number}
 */
Money.prettyString = ({amount, minimumFractionDigits, maximumFractionDigits=2, maximumSignificantDigits}) => {
	if ( ! amount) amount = 0;
	// NB: isNumber fails for numeric-string e.g. "1" but isString will catch that, so its OK.
	if (_.isNumber(amount) || _.isString(amount)) {
		amount = {value: amount, currency:'GBP'};
	}
	let value = amount? amount.value : 0;
	if (isNaN(value)) value = 0; // avoid ugly NaNs
	if (maximumFractionDigits===0) { // because if maximumSignificantDigits is also set, these two can conflict
		value = Math.round(value);
	}
	let snum = new Intl.NumberFormat(Settings.locale,
		{maximumFractionDigits, minimumFractionDigits, maximumSignificantDigits}
	).format(value);

	if ( ! minimumFractionDigits) {
		// remove .0 and .00
		if (snum.substr(snum.length-2) === '.0') snum = snum.substr(0, snum.length-2);
		if (snum.substr(snum.length-3) === '.00') snum = snum.substr(0, snum.length-3);
	}
	// pad .1 to .10
	if (snum.match(/\.\d$/)) snum += '0';

	return snum;
};

/**
 * e.g. for use in sort()
 * @throws Error if currencies are not the same
 * @returns {!Number} negative if a < b, 0 if equal, positive if a > b
 */
Money.compare = (a,b) => {
	Money.assIsa(a);
	Money.assIsa(b);
	assCurrencyEq(a, b, "Money.compare() "+a+" "+b);
	return v100p(a) - v100p(b);
};
