import _ from 'lodash';
import { assert } from "./assert";

export const randomPick = function<T>(array : T[]) : T
{
	if ( ! array) return null;
	let r = Math.floor(array.length*Math.random());
	return array[r];
};

export const sum = (array : number[]) : number => array.reduce((acc, a) => acc + a, 0);

export const isMobile = ()  => {		
	const userAgent = navigator.userAgent || navigator.vendor || window.opera;
	let _isMobile = userAgent.match('/mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i');
	return !! _isMobile;
};

/**  */
export const isPortraitMobile = () => window.matchMedia("only screen and (max-width: 768px)").matches && window.matchMedia("(orientation: portrait)").matches;


/**
 * @returns true if share was invoked, false if copy-to-clipboard was invoked
 */
export const doShare = ({href,title,text}) => {
	if ( ! navigator.share) {
		console.warn("No share function");				
		copyTextToClipboard(href);
		return false;
	}
	navigator.share({url:href,title,text});
	return true;
};

function fallbackCopyTextToClipboard(text : string) {
	var textArea = document.createElement("textarea");
	textArea.value = text;
	
	// Avoid scrolling to bottom
	textArea.style.top = "0";
	textArea.style.left = "0";
	textArea.style.position = "fixed";
  
	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();
  
	try {
	  var successful = document.execCommand('copy');
	  var msg = successful ? 'successful' : 'unsuccessful';
	  console.log('Fallback: Copying text command was ' + msg);
	} catch (err) {
	  console.error('Fallback: Oops, unable to copy', err);
	}
  
	document.body.removeChild(textArea);
  }

export function copyTextToClipboard(text : string) {
	if (!navigator.clipboard) {
		fallbackCopyTextToClipboard(text);
		return;
	}
	navigator.clipboard.writeText(text).then(function() {
		console.log('Async: Copying to clipboard was successful!');
	}, function(err) {
		console.error('Async: Could not copy text: ', err);
	});
}

/**
 * Convenience for spacing base-css-class + optional-extra-css-class.
 * Skips falsy, so you can do e.g. `space(test && "value")`.
 * Recursive, so you can pass an arg list or an array OR multiple arrays.
 * @returns {!string}
 */
export const space = (...strings :string[]) => {
	let js = '';
	if ( ! strings) return js;
	strings.forEach(s => {
		if ( ! s) return;
		if (s.forEach && typeof(s) !== 'string') {
			// recurse
			s = space(...s);
			if ( ! s) return;
		}
		js += ' '+s;
	});
	return js.trim();
};

/**
 * @param unescapedHash e.g. "foo=bar"
 * This must be the whole post-hash state.
 */
const setHash = function(unescapedHash :string) {
	assert(unescapedHash[0] !== '#', "No leading # please on "+unescapedHash);	
	if (history && history.pushState) {
		let oldURL = ""+window.location;
		history.pushState(null, null, '#'+encURI(unescapedHash));
		fireHashChangeEvent({oldURL});
	} else {
		// fallback for old browsers
		location.hash = '#'+encURI(unescapedHash);
	}
};
/**
 * Note: params are always string valued, e.g. "1" not 1
 * No path will return as []
 */
export const parseHash = function(hash = window.location.hash) {
	let params = getUrlVars(hash);
	// Pop the # and peel off eg publisher/myblog NB: this works whether or not "?"" is present
	let page = hash.substring(1).split('?')[0];
	const path = page.length? page.split('/') : [];
	return {path, params};
}

/**
 * @param {?String[]} newpath Can be null for no-change
 * @param {?Object} newparams Can be null for no-change
 * @param {?Boolean} returnOnly If true, do not modify the hash -- just return what the new value would be (starting with #)
 */
export const modifyHash = function(newpath:string[], newparams, returnOnly:boolean) {
	const {path, params} = parseHash();
	let allparams = (params || {});
	allparams = Object.assign(allparams, newparams);
	if ( ! newpath) newpath = path || [];
	let hash = encURI(newpath.join('/'));
	if (yessy(allparams)) {
		let kvs = mapkv(allparams, (k,v) => encURI(k)+"="+(v===null||v===undefined? '' : encURI(v)) );
		hash += "?" + kvs.join('&');
	}	
	if (returnOnly) {
		return '#'+hash;
	}
	if (history && history.pushState) {
		let oldURL = ""+window.location;
		history.pushState(null, null, '#'+hash);
		// generate the hashchange event
		fireHashChangeEvent({oldURL});
	} else {
		// fallback for old browsers
		location.hash = '#'+hash;
	}	
};

let fireHashChangeEvent = function({oldURL}) {
	// NB IE9+ on mobile
	// https://developer.mozilla.org/en-US/docs/Web/API/HashChangeEvent
	let e = new HashChangeEvent('hashchange', {
		newURL: ""+window.location,
		oldURL: oldURL
	});	
  	window.dispatchEvent(e);
};

/**
 * Map fn across the (key, value) properties of obj.
 * 
 * Or you could just use Object.entries directly -- but IE doesn't support it yet (Jan 2019)
 */
export const mapkv = function(obj, fn) {
	return Object.keys(obj).map(k => fn(k, obj[k]));
};

/**
 * Strip commas £/$/euro and parse float.
 * @param {Number|String} v 
 * @returns Number. undefined/null/''/false/NaN are returned as undefined. 
 * Bad inputs also return undefined (this makes for slightly simpler usage code
 *  -- you can't test `if (x)` cos 0 is falsy, but you can test `if (x!==undefined)`)
 */
export const asNum = (v :string|number|null) : number|null => {
	if (v===undefined || v===null || v==='' || v===false || v===true || Number.isNaN(v)) {
		return undefined;
	}
	if (_.isNumber(v)) return v;
	// strip any commas, e.g. 1,000
	if (_.isString(v)) {
		v = v.replace(/,/g, "");
		// £ / $ / euro
		v = v.replace(/^(-)?[£$\u20AC]/, "$1");
	}
	// See https://stackoverflow.com/questions/12227594/which-is-better-numberx-or-parsefloatx
	const nv = +v;
	if (Number.isNaN(nv)) {
		return null; // bad string input
	}
	return nv;
};


/**
 * @param {!string} src url for the script
 * @param {?Function} onload called on-load and on-error
 * @param {?dom-element} domElement append to this, or to document.head
 * NB: copy-pasta of Good-Loop's unit.js addScript()
 */
export const addScript = function({src, async, onload, onerror, domElement}) {
	let script = document.createElement('script');
	script.setAttribute( 'src', src);
	if (onerror) script.addEventListener('error', onerror); 
	if (onload) script.addEventListener('load', onload);
	script.async = async;
	script.type = 'text/javascript';
	// c.f. https://stackoverflow.com/questions/538745/how-to-tell-if-a-script-tag-failed-to-load
	// c.f. https://stackoverflow.com/questions/6348494/addeventlistener-vs-onclick
	if ( ! domElement) {
		let head = document.getElementsByTagName("head")[0];
		domElement = (head || document.body);
	}
	domElement.appendChild(script);
};

/**
	 * A more flexible (and dangerous) version of substring.
	 * 
	 * @param {string} mystring
	 *            Can be null, in which case null will be returned
	 * @param {!number} start
	 *            Inclusive. Can be negative for distance from the end.
	 * @param {?number} end
	 *            Exclusive. Can be null for "up to the end". Can be negative for distance from the end. E.g. -1
	 *            indicates "all but the last character" (zero indicates
	 *            "up to the end"). Can be longer than the actual string, in
	 *            which case it is reduced. If end is negative and too large, an
	 *            empty string will be returned.
	 * @returns {?string} The chopped string. null if the input was null. The empty string
	 *         if the range was invalid.
	 */
export const substr = (mystring:string, _start:number, _end: number) => {
		if ( ! mystring) return mystring;
		// keep the original values around for debugging
		let start = _start;
		let end = _end || 0;
		const len = mystring.length;
		// start from end?
		if (start < 0) {
			start = len + start;
			if (start < 0) {
				start = 0;
			}
		}
		// from end?
		if (end <= 0) {
			end = len + end;
			if (end < start) {
				return "";
			}
		}
		assert(end >= 0, start + " " + end);
		// too long?
		if (end > len) {
			end = len;
		}
		// OK
		if (start == 0 && end == len)
			return mystring;
		if (end < start) {
			console.warn("substr() - Bogus start(" + _start+ ")/end(" + _end + " for " + mystring);
			return "";
		}
		assert(start >= 0 && end >= 0, start + " " + end);
		return mystring.substring(start, end);
	};


/** Parse url arguments
 * @param {?string} url Optional, the string to be parsed, will default to window.location when not provided.
 * @param {?Boolean} lenient If true, if a decoding error is hit, it is swallowed and the raw string is used.
 * Use-case: for parsing urls that may contain adtech macros.
 * @returns a map */
export const getUrlVars = (url:string, lenient:boolean) => {
	url = url || window.location.href;
	// url = url.replace(/#.*/, ''); Why was this here?! DW
	var s = url.indexOf("?");

	if (s == -1 || s == url.length - 1) return {};

	var varstr = url.substring(s + 1);
	var kvs = varstr.split("&");
	var urlVars = {};

	for(var i = 0; i < kvs.length; i++) {
		var kv = kvs[i];
		if ( ! kv) continue; // ignore trailing &
		var e = kv.indexOf("=");
		if (e == -1) {
			continue;
		}
		let k = kv.substring(0, e);
		k = k.replace(/\+/g, ' ');
		k = decURI(k);
		let v = null; //'';
		if (e === kv.length - 1) continue;
		v = kv.substring(e + 1);
		v = v.replace(/\+/g, ' ');
		try {
			v = decURI(v);
		} catch(err) {
			if ( ! lenient) throw err;
			console.warn("const js getUrlVars() decode error for "+kv+" "+err);
		}
		// hack for boolean
		if (v==='true') v = true; if (v==='false') v = false;
		urlVars[k] = v;
	}

	return urlVars;
};

const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
/**
	Validate email addresses using what http://emailregex.com/ assures me is the
	standard regex prescribed by the W3C for <input type="email"> validation.
	https://www.w3.org/TR/html-markup/input.email.html#input.email.attrs.value.single
	NB this is more lax
	@param string A string which may or may not be an email address
	@returns True if the input is a string & a (probably) legitimate email address.
*/
function isEmail(string :string) {
	return !!("string" == typeof(string).toLowerCase() && string.match(emailRegex));
}



/**
Like truthy, but {}, [] amd [''] are also false alongside '', 0 and false.
*/
export const yessy = function(val: any): boolean {
	if ( ! val) return false;
	if (typeof(val) === 'number' || typeof(val) === 'boolean') {
		return true;
	}
	if (typeof(val) === 'object' && val.length === undefined) {
		assert(typeof(val) !== 'function', "yessy(function) indicates a mistake: "+val);
		val = Object.getOwnPropertyNames(val);
	}
	if (val.length === 0) {
		return false;
	}
	if (val.length) {
		for (let i = 0; i < val.length; i++) {
			if (val[i]) return true;
		}
		return false;
	}
	return true;
};

/**
 * convenience for not-null not-undefined (but can be false, 0, or "")
 */
export const is = x => x !== undefined && x !== null;


const getStackTrace = function() {
	try {
		const stack = new Error().stack;
		// stacktrace, chop leading "Error at Object." bit
		let stacktrace = (""+stack).replace(/\s+/g,' ').substr(16);
		return stacktrace;
	} catch(error) {
		// oh well
		return "";
	}
}

/**
 * @return {string} a unique ID
 */
export const uid = function() {
    // A Type 4 RFC 4122 UUID, via http://stackoverflow.com/a/873856/346629
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";
    var uuid = s.join("");
    return uuid;
};

//** String related functions */

/** Uppercase the first letter, lowercase the rest -- e.g. "dan" to "Daniel" */
export const toTitleCase = function(s :string) {
	if ( ! s) return s;
	return s[0].toUpperCase() + s.substr(1).toLowerCase();
}

/**
 * Truncate text length.
 */
export const ellipsize = function(s :string, maxLength :number) {
	if ( ! s) return s;
	if ( ! maxLength) maxLength = 140;
	if (s.length <= maxLength) return s;
	return s.substr(0, maxLength - 2)+' &hellip;';
};

/**
 * e.g. winterwell.com from http://www.winterwell.com/stuff
 */
export const getHost = function(url : string) : string {
    var a = document.createElement('a');
    a.href = url;
    var host = a.hostname;
	if (host.startsWith("www.")) host = host.substr(4);
	return host;
}

/**
 * Make an option -> nice label function
 * @param options 
 * @param {?String[]|Object|Function} labels Can be falsy
 * @returns {Function} option to label
 */
export const labeller = function(options: Object[], labels : any) {
	if ( ! labels) return fIdentity;
	if (_.isArray(labels)) {
		return v => labels[options.indexOf(v)] || v;
	} else if (_.isFunction(labels)) {
		return labels;
	} 
	// map
	return v => labels[v] || v;	
};
const fIdentity = (x : any) => x;

/** 
 * Encoding should ALWAYS be used when making html from json data.
 * 
 * There is also CSS.escape() in the file css.escape.js for css selectors, 
 * which we get from https://developer.mozilla.org/en-US/docs/Web/API/CSS.escape
 * and may become a standard.
 * 
 */

/** Url-encoding: e.g. encode a parameter value so you can append it onto a url.
 * 
 * Why? When there are 2 built in functions:
 * 
 * 1. escape() robust but doesn't handle unicode. 
 * 2. encodeURIComponent() has better unicode handling -- however it doesn't escape 's which makes it dangerous, 
 * and it does unhelpfully encode /s and other legitimate url characters.
 
 This is a super-solid best-of-both.
*/
export const encURI = function(urlPart : string) {
	urlPart = encodeURIComponent(urlPart);
	urlPart = urlPart.replace(/'/g,"%27");
	// Keep some chars which are url safe
	urlPart = urlPart.replace(/%2F/g,"/");
	return urlPart;
}

export const decURI = function(urlPart : string) {
	let decoded = decodeURIComponent(urlPart);
	return decoded;
}


/**
 * preventDefault + stopPropagation
 * @param e {?Event|Object} a non-event is a no-op 
 * @returns true (so it can be chained with &&)
 */
export const stopEvent = (e : Event) => {
	if ( ! e) return true;
	if (e.preventDefault) {
		e.preventDefault();
		e.stopPropagation();
	}
	return true;
};



// DEBUG hack
window.miscutils = {
};
