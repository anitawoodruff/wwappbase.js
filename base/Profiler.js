/**
 * Profiler sketch API
 * See also the profiler java code
 * Note: use these wrapped by DataStore.fetch
 */

import ServerIO from './plumbing/ServerIOBase';
import {assert, assMatch, assertMatch} from 'sjtest';
// add funky methods to the "standard" Person data-class
import Person from './data/Person';
import PV from 'promise-value';
import {mapkv, encURI} from 'wwutils';
assert(Person);

// for debug
window.Person = Person;

const Profiler = {};

/**
 * Use with DataStore
 * @return {promise(Person)}
 */
const getProfile = ({xid, fields, status}) => {
	assMatch(xid, String);
	// NB: dont report 404s
	// NB: the "standard" servlet would be /person but it isnt quite ready yet (at which point we should switch to ServerIO.getDataItem)
	return ServerIO.load(`${ServerIO.PROFILER_ENDPOINT}/profile/${ServerIO.dataspace}/${encURI(xid)}`, {data: {fields, status}, swallow:true});
};

/**
 * Convenience method:
 * Fetch the data for all xids. Return the profiles for those that are loaded.
 * @param {String[]} xids 
 * @returns {Person[]} peeps
 */
const getProfilesNow = xids => {
	assert(_.isArray(xids), "Profiler.js getProfilesNow "+xids);
	xids = xids.filter(x => !!x); // no nulls
	const fetcher = xid => DataStore.fetch(['data', 'Person', xid], () => {
		return getProfile({xid});
	});
	let pvsPeep = xids.map(fetcher);	
	let peeps = pvsPeep.filter(pvp => pvp.value).map(pvp => pvp.value);
	return peeps;
};


/** 
 * TODO refactor to work with Claims as they are, with more specific utility methods. 
 * This returns a similar but conflicting data-format for Claims, which cencourages bugs. 
 * 
 * @returns {gender: {value: 'male', permission: 'private'}, locaton: {value: 'who_knows', permission: 'public'}}
 * Example of Claims object as of 18/10/18
 * {"p": ["controller"], "@class": "com.winterwell.profiler.data.Claim", "t": "2018-10-18T11:14:04Z", "v": "This is Peter Pan, a test account for SoGrow...",
	"f": ["mark@winterwell.com@email"], "k": "description", "kv": "description=This is Peter Pan, a test account for SoGrow...","o": "description-mark@winterwell.com@email"
	}
	TODO: change to getClaimsForPerson instead of getClaimsForXId
 */
const getClaimsForXId = xid => {
	const claims = DataStore.getValue(['data', 'Person', xid, 'claims']);

	if( ! claims ) return;

	const formattedClaims = claims.reduce( (obj, claim) => {
		let {k, f, v, p} = claim;

		// If contains "public", set to true
		// set to false ("private") otherwise
		// Reasoning is that default state is "private"/false anyway
		// Change this to "private" if you want all options checked by default
		if(_.isArray(p)) p = p.includes("public");

		// Only allow override if the claim is coming from the user
		if( !obj[k] || f.includes('myloop@app') ) obj[k] = {value: v, permission: p}; 
 
		return obj;
	}, {});
	return _.isEmpty(formattedClaims) ? null : formattedClaims;
};

/**
 * Create UI call for saving claim to back-end
	@param xids {String[]} XId format
	@param claims {Claim[]}
	@returns promise[]
*/ 
const saveProfileClaims = (xids, claims) => {
	if(_.isString(xids)) xids = [xids];

	assMatch(xids, "String[]", "Profiler.js saveProfileClaims xids")
	// assMatch(claims, "Claim[]", "Profiler.js saveProfileClaims() claims");
	
	if( _.isEmpty(claims) ) {
		console.warn('Profiler.js saveProfileClaims -- no claims provided, aborting save');
		return;
	}

	return xids.map( xid => {
		assMatch(xid, String);
		return ServerIO.post(
			`${ServerIO.PROFILER_ENDPOINT}/profile/${ServerIO.dataspace}/${encURI(xid)}`, 
			{claims: JSON.stringify(claims)}
		);
	});
};

/**
 * TODO refactor to use Crud
 * @return PV[]
 */
const saveProfile = (doc) => {
	assert(doc, "Profiler.js - saveProfile "+doc);
	let ids = doc.id || doc.xid;
	// paranoia: ensure array
	if (_.isString(ids)) ids = [ids];
	const pvs = [];
	ids.forEach(xid => {
		assMatch(xid, String, "Profiler.js - saveProfile", doc);		
		let prm = ServerIO.post(`${ServerIO.PROFILER_ENDPOINT}/profile/${ServerIO.dataspace}/${encURI(xid)}`, {action: 'put', doc: JSON.stringify(doc)});			
		pvs.push(PV(prm));
	});
	return pvs;
};

/**
 * The underlying permissions model is rich (it can carry more options and audit info). 
 * We mostly want to work with something simple.
 * 
 * TODO dataspace and fields
 * @returns {String: Boolean} never null, empty = apply sensible defaults
 */
const getPermissions = ({person, dataspace, fields}) => {
	Person.assIsa(person);
	// convert list-of-strings into a true/false map
	let pmap = {};
	let perms = person.p || [];
	perms.forEach(p => {
		// TODO custom?
		// not?
		if (p[0] === "-") {
			p = p.substr(1);
			pmap[p] = false;
		} else {
			pmap[p] = true;
		}
	});
	// done
	return pmap;
};


/**
 * @param permissions {String: Boolean}
 * 
 * Does NOT save
 */
const setPermissions = ({person, dataspace, permissions, fields}) => {
	Person.assIsa(person);
	assert( ! _.isArray(permissions), "Profiler.js use a map: "+permissions);
	// inverse of getPermissions
	let pstrings = mapkv(permissions, (k,v) => {
		return v? k : "-"+k;
	});
	// Audit trail of whats changed? TODO manage that server-side.
	person.p = pstrings;
	return person;
};


/**
 * Call AnalyzeDataServlet to fetch and analyse Twitter data
 */
const requestAnalyzeData = xid => {
	// NB: analyze is always for the gl dataspace
	return ServerIO.load(ServerIO.PROFILER_ENDPOINT + '/analyzedata/gl/' + escape(xid));
};

Person.saveProfileClaims = saveProfileClaims;
Person.getProfile = getProfile;
Person.getProfilesNow = getProfilesNow;
Person.saveProfile = saveProfile;
Person.getPermissions = getPermissions;
Person.setPermissions = setPermissions;

Profiler.requestAnalyzeData = requestAnalyzeData;

export {
	saveProfileClaims,
	getClaimsForXId,
	getProfile,
	getProfilesNow,
	saveProfile,
	getPermissions,
	setPermissions,
	requestAnalyzeData
};
export default Profiler;
