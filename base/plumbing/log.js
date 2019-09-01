// NB: simplified and modularised copy of adunit's log.js

import ServerIO from './ServerIOBase';

/** datalog.js: the log-to-server calls
 * 
 * Events can only be logged once per window pane.
 * 
 */

/* eslint-disable no-console */

const noDupes = {};
const nonce = Math.random();
const LBURL = ServerIO.DATALOG_ENDPOINT;

/**
 * @deprecated Better to put the img tag directly in the page's html if you can.
 */
const track = () => {
	if (document.querySelector(`img[src^="${LBURL}/pxl"]`)) return;

	const img = document.createElement('img');
	img.src = LBURL + '/pxl?nonce=' + nonce;
	const style = {
		'z-index': -1,
		position: 'absolute',
		top: '0px',
		left: '0px',
		width: 1,
		height: 1,
		opacity: 0.1
	};

	Object.assign(img.style, style);

	document.body.appendChild(img);
};


/**
 * This will not post an exact duplicate (but any change is enough to qualify for a fresh post)
 * @param eventTag {!String} e.g. minview. This will be lowercased. Parameters can be case sensitive, but event tags are not.
 * @return 
 */
const lgBase = (dataspace, eventTag, eventParams, addTrackingInfo) => {
	eventTag = eventTag.toLowerCase();

	// Pull "count" and "gby" out of eventParams if present (promoting them to Real Params)
	let count, gby, site;
	if (eventParams) {
		count = eventParams.count;
		gby = eventParams.gby;
		site = eventParams.site;
		delete eventParams.count;
		delete eventParams.gby;
	}
	if ( ! site) site = window.location;

	const data = {
		d: dataspace,
		p: JSON.stringify(eventParams),
		r: document.referrer, // If in a SafeFrame, this will be the page url
		s: site, // If in a well-configured DfP ad, this will be the page url
		count, // Promote to root param; used to be member of p:
		gby, // Promote to root param; used to be member of p:
	};

	// dont do standard tracking?
	if (addTrackingInfo === false) {
		data.track = false;
	}

	// No exact duplicates
	try {
		const dupeKey = eventTag + JSON.stringify(data);
		if (noDupes[dupeKey]) {
			return null;
		}
		noDupes[dupeKey] = true;
	} catch(err) { // paranoia
		console.warn(err);
	}

	// log to console
	console.log("datalog", dataspace, eventTag, eventParams);

	// Pull eventTag out of request cargo and make a URL paramater so it's easily seen when debugging
	return post(`${LBURL}/lg?t=${eventTag}`, data);
};


/**
 * Note: will not post an exact duplicate (but any change is enough to qualify for a fresh post).
 * @param glslot Can be null for window-level events (e.g. the adblock test). Otherwise this really should be set!
 * @param eventTag {!String}
 * @param eventParams {?Object}
 * @returns {?Promise}
 */
const lg = (eventTag, eventParams) => {
	if ( ! ServerIO.LOGDATASPACE) {
		console.error("datalog", "No ServerIO.LOGDATASPACE set for logging. Skipping "+eventTag, eventParams);
	}
	// safety check inputs
	// TODO A more descriptive slot-ID than "preact"?
	if (typeof(eventTag) !== 'string') {
		lgError(`Bad lg() inputs! eventTag: ${eventTag} glslot: ${'preact'}`);
	}

	const logPromise = lgBase(ServerIO.LOGDATASPACE, eventTag, eventParams, true);
	if ( ! logPromise) {
		return null; // Tried to log a dupe
	}

	// Return the promise so we can e.g. do some final logging when cleaning up, THEN uninstall, without race conditions.
	return logPromise;
};


/* Error-specific logging methods */

/** General error/warning */
const lgProblem2 = (level, message, params) => {
	const lgParams = {
		message,
		...params,
	};
	return lg(level, lgParams);
};

/**
 * @param message A short description of the event causing the error/warning
 * @param params {} Extra information on the circumstances of the event
 */
const lgError = (message, params) => lgProblem2('error', message, params);
const lgWarning = (message, params) => lgProblem2('warning', message, params);

export { lg, lgError, lgWarning, track };
