import React from 'react';
import { space } from '../utils/miscutils';

/**
 * TODO standardise use of icons and emojis
 */

 /**
  * See https://unicode-table.com/
  */
 const EMOJI = {
	camera: "📷",
	 trashcan: "🗑", //&#x1f5d1;
	 info: "🛈", // ℹ or 🛈
	 ".txt":"🖹",
	 tick: "✔",
 };
 
 /**
  * 
  * @param {Object} p
  * @param {?String} p.color black|white
  * @param {?String} p.size xs|sm|lg|xl
  */
const Icon = ({name,size="sm",className,color,...props}) => {
	if (EMOJI[name]) {
		if (color && ! ['black','white'].includes(color)) {
			console.warn("Icon.jsx color not directly supported: "+color+" Icons can only reliably use a few set colors cross-device.");
		}
		return <span className={space(color&&"emoji-"+color,className)} dangerouslySetInnerHTML={{__html:EMOJI[name]}} {...props} />;
	}
	let url;
	if (name === C.app.service) {
		url = C.app.logo;
	}
	// Social media
	if ('twitter facebook instagram google-sheets'.indexOf(name !== -1)) {
		url = '/img/gl-logo/external/' + name + '-logo.svg';
		if (name === 'instagram') file = '/img/gl-logo/external/instagram-logo.png'; // NB (Instagram's mesh gradient can't be done in SVG)
	}

	let classes = 'rounded logo' + (size ? ' logo-' + size : '');
	if (url) {
		return <img alt={name} data-pin-nopin="true" className={classes} src={url} {...props} />;
	}
};

export default Icon;
