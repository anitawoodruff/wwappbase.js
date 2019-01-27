/**
 * JSend ajax wrapper. A simple format:
 * 
 * {
 * 	status: {String} "success" | "fail" | "error"
 * 	message: {?String} error message
 * 	data: {?Object} the data/value/cargo
 * }
 * 
 * This file supports BOTH JSend and Winterwell's JsonResponse format, and jQuery responses.
 */

import Enum from 'easy-enums';

/**
 * @typedef {String} KAjaxStatus
 */
const KAjaxStatus = new Enum("success fail error");

class JSend {
	/**
	 * @type {KAjaxStatus}
	 */
	status;	
	/** Usually set on error
	 * @type {String} */
	message;
	/**
	 * The payload, can be unset if the call failed
	 */
	data;
}
export default JSend;

/**
 * 
 * @return {!Boolean} true if the input is a JSend or WW's JsonResponse object
 */
const isa = jobj => {
	if ( ! jobj) return false;
	if (jobj.cargo) return true;
	let s = JSend.success(jobj);
	if (s === null) return false;
	return true;	
};
JSend.isa = isa;

/**
 * 
 * @param {JSend} jobj 
 * @return {KAjaxStatus} success | error | fail
 */
const status = jobj => jobj.status 
	|| (jobj.success===true && 'success') || (jobj.success===false && 'error'); // WW's JsonResponse format
JSend.status = status;

/**
 * Boolean alternative to status
 * @return {?Boolean} null if the success is not provided
 */
JSend.success = jobj => {	
	if (jobj.success===true) return true;
	if (jobj.success===false) return false;

	if (jobj.status===KAjaxStatus.success) return true;
	if (jobj.status===KAjaxStatus.fail || jobj.status===KAjaxStatus.error) return false;

	// a jQuery response
	if (typeof(jobj.status)==='number') {
		console.warn("JSend handed a jQuery response - bad form old chap", jobj);
		if (jobj.status === 200) return true;
		// 300 redirect??
		return false;
	}

	console.warn("JSend: status unknown", jobj);
	return null;
};

/**
 * Optional error message
 * @return {?String}
 */
JSend.message = jobj => {
	if (jobj.message) return jobj.message;

	// WW's JsonResponse format
	if (jobj.errors) {
		let m = jobj.errors[0];
		if (typeof(m)==='string') return m;
		return m.text || JSON.stringify(m);
	} 

	// jQuery response
	if (jobj.responseText) {
		return jobj.responseText;
	}
	
	return null;
};

/**
 * @return the data|cargo from a jsend response, or null
 */
JSend.data = jobj => {
	return jobj.data 
		|| jobj.cargo; // WW's JsonResponse format
};
