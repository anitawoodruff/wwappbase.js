import React, { Component } from 'react';
import {ReactDOM} from 'react-dom';
import {SJTest, assMatch} from 'sjtest';
import Login from 'you-again';
import C from '../CBase';
import List from '../data/List';
import Misc from './Misc';
import {stopEvent, join} from 'wwutils';
import DataStore from '../plumbing/DataStore';
import BS from './BS';
import ListLoad from './ListLoad';
import Task from '../data/Task';
// init basic stuff
import ActionMan from '../plumbing/ActionManBase';
import Crud from '../plumbing/Crud';
import MDText from './MDText';


const Modal = BS.Modal;

const taskEditorDialogPath = ['widget','TaskEditorDialog'];

/**
 * The core "show a task on the side" widget
 */
const TaskListItem = ({item}) => {
	// TODO child??
	let path = ['data', 'Task', item.id];
	// glyph fire button?? or a prod button??
//  	

	return (<div>
		<div className='pull-left'>
					<Misc.PropControl path={path} 
				prop='closed' type='checkbox' 				
				saveFn={Misc.publishDraftFn}
			/>
		</div>
		{item.tags && item.tags.length? <div><small><code>{item.tags.join(" ")}</code></small></div> : null}
		<MDText source={item.text} />
		<div>{item.assigned && item.assigned.length? "@"+item.assigned.join(" @") : null}</div>
		{item.url && item.url !== ''+window.location? <div><small><a href={item.url}>{item.url}</a></small></div> : null}
<button className='btn btn-xs' onClick={e => {
 	DataStore.setValue(taskEditorDialogPath.concat('task'), item);
 	DataStore.setValue(taskEditorDialogPath.concat('show'), true);			
 }}>edit</button>

	{item.children? item.children.map(kid => <TaskListItem key={kid.id} item={kid} />) : null}

	{item.parent? null : <QuickTaskMaker parent={item} tags={item.tags} />}
	</div>);
};

/**
 * navbar button to show/hide the task list
 */
const TaskListButton = ({bpath, value, list}) => {
	return (<button type="button" className='btn btn-default navbar-btn navbar-nav' 
		disabled={ ! bpath}
		onClick={e => DataStore.setValue(bpath, ! value)}>Tasks {list? '('+List.total(list)+')' : null}</button>
	);
};

/**
 * called by a Page to set the context
 */
const setTaskTags = (...tags) => {		
	tags = tags.filter(t => t);	
	assMatch(tags, 'String[]', "TaskList.jsx setTaskTags()"); //fails for [] :( TODO fix assMatch
	let oldTags = DataStore.getValue(['widget', 'TaskList', 'tags']);
	if (JSON.stringify(tags) === JSON.stringify(oldTags)) {
		// no-op
		return;
	}
	// we're probably inside a render, so update after the current render
	setTimeout( () => {				
		DataStore.setValue(['widget', 'TaskList', 'tags'], tags);
	}, 1);
};

/**
 * The main side-bar list widget + a navbar button.
 * Goes inside the navbar.
 * Gets tags info via #setTaskTags (not parameters)
 *  - cos its inserted in the NavBar, which hasn't the tags info.
 */
const TaskList = ({}) => {		
	if ( ! Login.isLoggedIn()) {
		return <TaskListButton disabled />
	}
	// where are we? page + id as tags
	let tags = DataStore.getValue('widget', 'TaskList', 'tags');
	if ( ! tags) {
		console.warn("TaskList.jsx: the active Page should call setTaskTags()");
		tags = [];
	}
	// widget settings
	const wpath = ['widget', 'TaskList', tags.join("+") || 'all'];
	const widget = DataStore.getValue(wpath) || {};

	const type = C.TYPES.Task;
	let q = tags.map(t => "tags:"+t).join(" AND ")
		// assigned.map(t => "assigned:"+t).join(" ")

	const status = C.KStatus.ALL_BAR_TRASH;
	// HACK refactor into ListLoad or List.js
	
	let pvItems = ActionMan.list({type, status, q:q});

	// button mode?
	if ( ! widget.show) {
		return <TaskListButton bpath={wpath.concat('show')} list={pvItems.value} />
	}

	return (<div>
		<TaskListButton bpath={wpath.concat('show')} value={true} list={pvItems.value} />
		<TaskEditorDialog />
		<div className='TaskList avoid-navbar' style={{position:'fixed', right:0, top:0}}>
			<h4>Tasks for {tags.join(" ")}</h4>
			<QuickTaskMaker tags={tags} items={pvItems.value} /> 
			<div>&nbsp;</div>
			<ListLoad 
				hasFilter={pvItems.value && pvItems.value.total > 5}
				q={q}
				type={type} 
				status={status} 
				ListItem={TaskListItem}				
				className='DefaultListLoad' 
				canDelete
				/>
	</div></div>);
};

/**
 * @param parent {Task}
 * 
 */
const QuickTaskMaker = ({parent, tags=[], assigned=[], items}) => {		
	if ( ! Login.isLoggedIn()) {
		return null;
	}
	const qpath = ['widget', 'QuickTaskMaker'];
	if (parent) qpath.push('reply-to-'+parent.id);
	const quickTask = e => {
		e.preventDefault();
		// make
		let base = DataStore.getValue(qpath);
		base.tags = tags;
		base.assigned = assigned;
		base.parent = parent;
		let task = Task.make(base);
		// publish
		if (parent) { // if its a child, save the parent
			ActionMan.publishEdits('Task', parent.id, parent);
		} else {
			ActionMan.publishEdits('Task', task.id, task);
		}
		// clear the form
		DataStore.setValue(qpath, null);
		// optimistic add to list
		// NB: Crud will auto-add to published, but it cant handle auto-add to filtered lists
		if (items && ! parent) {
			List.add(task, items);
		}
	};
	const ttext = DataStore.getValue(qpath.concat('text'));
	return (
		<form className={join('QuickTaskMaker form-inline', parent? 'QuickTaskMakerReply' : null)} onSubmit={quickTask}>
			<Misc.PropControl type='text' path={qpath} prop='text' 
				placeholder={parent? 'Reply' : 'Make a new task'} /> 
			&nbsp;
			<button className='btn btn-primary' disabled={ ! ttext} type='submit'>Add</button>			
		</form>);
};

/**
 * a whole page editor
 */
const TaskEditorDialog = () => {
	assert(Modal, "No BS?");
	console.log("Modal", Modal);
	const widget = DataStore.getValue(taskEditorDialogPath) || {};
	if ( ! widget.show) return null;
	if ( ! widget.task) return null;
	
	return (
		<Modal show={widget.show} className="TaskEditorModal" 
			onHide={() => DataStore.setValue(taskEditorDialogPath.concat('show'), false)} >
			<Modal.Header closeButton>
				<Modal.Title>
					Edit Task	
				</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				{JSON.stringify(widget.task)}
			</Modal.Body>
			<Modal.Footer>
				hm?
			</Modal.Footer>
		</Modal>
	);
}; // ./TaskEditorDialog


export default TaskList;
export {
	setTaskTags
}