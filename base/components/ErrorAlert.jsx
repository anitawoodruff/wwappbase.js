import React from 'react';

import { Button, Card, CardBody, Form, Alert } from 'reactstrap';
import { space } from '../utils/miscutils';

/**
 * Show an error as a BS alert.
 * color=danger (red) by default.
 * If error is falsy, show nothing.
 */
const ErrorAlert =({error,color}) => {
	if ( ! error) return null;
	let emsg = _.isString(error)? error : join(error.status, error.statusText);
	let edetails = space(error.statusText, error.responseText, error.details);
	return <Alert color={color||'danger'}>{emsg}</Alert>;
};
export default ErrorAlert;
