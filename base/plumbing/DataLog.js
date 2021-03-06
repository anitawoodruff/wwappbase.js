// TODO DataLog results handling

// See also log.js for data input

import md5 from 'md5';
import { assert } from '../utils/assert';
import { encURI } from '../utils/miscutils';
import pivot from 'data-pivot';

/**
 * @param {Object} p
 * @param {String} p.q
 * @param {String} p.dataspace
 * @param {?String[]} p.breakdowns - e.g. ['campaign'] will result in by_campaign results.
 * NB: the server parameter is currently `breakdown` (no -s).
 * Eventually we want to standardise on `breakdowns` as it's more intuitive for an array type,
 * but making the change server-side is expected to be very involved.
 * @param {?String|Date} p.start Date/time of oldest results (natural language eg '1 week ago' is OK). Default: 1 month ago
 * @param {?String|Date} p.end Date/time of oldest results
 * @param {?String} p.name Just for debugging - makes it easy to spot in the network tab
 * @returns PromiseValue "ElasticSearch format" (buckets with a key)
 */
const getDataLogData = ({q,breakdowns,start="1 month ago",end="now",name,dataspace=ServerIO.DATALOG_DATASPACE}) => {
	let dspec = md5(JSON.stringify({q, start, end, breakdowns}));
	const dlpath = ['misc', 'DataLog', dataspace, dspec];

	return DataStore.fetch(dlpath, () => {
		// NB: the server doesnt want an -s on breakdown
		const glreq = {q, start, end, breakdown:breakdowns, name, dataspace};		
		let endpoint = ServerIO.DATALOG_ENDPOINT;
		// This stats data is _usually_ non essential, so swallow errors.
		const params = {data: glreq, swallow:true};
		const url = endpoint + (name ? `?name=${encURI(name)}` : '');
		return ServerIO.load(url, params);
	});
};

/**
 * Convert from "ElasticSearch format" (buckets with a key) into `{key: value}` format
 * @param {Object} data Output from getDataLogData()
 * @param {!String[]} breakdowns e.g. ["event","day"]
 * @returns e.g. {myevent: {monday:1, tuesday:2, total:3}}
 */
const pivotDataLogData = (data, breakdowns) => {
	// HACK 1/2 only
	assert(breakdowns.length===1 || breakdowns.length===2, breakdowns);
	const b0 = breakdowns[0];
	if (breakdowns.length===1) {
		let pivoted = pivot(data, `by_${b0}.buckets.$bi.{key, count}`, '$key.$count');
		return pivoted;
	}
	// unpick double-breakdown
	const b1 = breakdowns[1];
	let din = `by_${b0}_${b1}.buckets.$bi.{key, by_${b1}.buckets.$bi2.$bucket}`;
	let data2 = pivot(data, din, '$key.$bi2.$bucket');
	let data3 = pivot(data2, '$bkey0.$bi2.{key, count}', '$bkey0.$key.$count');
	// add in single-breakdown totals -- if present (i.e. if the user requested it)
	if ( ! data["by_"+b0]) {
		return data3; // just kkv, no totals
	}
	let evttotaldata = pivot(data, `by_${b0}.buckets.$bi.{key, count}`, '$key.total.$count');
	let data4 = _.merge(data3, evttotaldata);
	return data4;
}


export {
	getDataLogData, pivotDataLogData
}
