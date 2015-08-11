/**
 * Core Script of Chat Master
 *
 * Other Files:
 * format.js - format message text to html elements
 * log.js - write log files
 * md5.js - MD5 library from Internet
 */


'use strict';


/* load node.js modules */
var IRC = require('irc');
var GetMAC = require('getmac'); /* for color hash */

/* node-webkit API */
var gui, win, tray, popup_menu;

/* DOM nodes */
var login_form, config_list, add_config_button, connect_button, connect_all_button;


var login = {
    DEFAULT_DATA: {
	freenode: {
	    server: 'irc.freenode.net',
	    port: '6667',
	    nick: 'benzene',
	    username: 'C6H6',
	    real_name: 'Chat Master Test',
	    password: '',
	    ssl: false,
	    self_signed: false,
	    sasl: false
	}
    },
    BLANK_CONFIG: {
	server: '',
	port: '',
	nick: '',
	username: '',
	real_name: '',
	password: '',
	ssl: false,
	self_signed: false,
	sasl: false
    },
    init: function(){
	this.data = {};
	this.disabled = new Set();
	var data = DataStorage.record.read();
	var names = Object.keys(data);
	if(!names.length){
	    data = clone(this.DEFAULT_DATA);
	    names = Object.keys(data);
	}
	for(let I of names){
	    this.data[I] = clone(data[I]);
	    this.add_config(I, true);
	}
	add_config_button.addEventListener('click', this.callbacks.add_button_click);
	config_list.addEventListener('change', this.callbacks.tab_change);
	login_form.addEventListener('change', this.callbacks.data_change);
	fillForm(login_form, data[names[0]]);
    },
    add_config: function(name, keep_data){
	var label = create('span', {
	    className: 'config_list_item_label',
	    textContent: name
	});
	var toggle_button = create('widget-text-button', {
	    textContent: '\u2611',
	    title: _('Toggle between enabled and disabled in Connect All')
	});
	var rename_button = create('widget-text-button', {
	    textContent:'\u270e',
	    title: _('Rename this config')
	});
	var remove_button = create('widget-text-button', {
	    textContent:'\u00d7',
	    title: _('Remove this config')
	});

	toggle_button.addEventListener('click', function(ev){
	    ev.stopPropagation();
	    if(this.textContent == '\u2611'){
		/* disable */
		login.disabled.add(name);
		label.dataset.disabled = '';
		this.textContent = '\u2610';
	    }else{
		/* enable */
		login.disabled.delete(name);
		delete label.dataset.disabled;
		this.textContent = '\u2611';
	    }
	});

	rename_button.addEventListener('click', function(ev){
	    ev.stopPropagation();
	    var new_name = prompt(printf(_('New name for %1:'), name), name);
	    if(!new_name){
		alert(_("Name can't be empty"));
	    }else if(new_name == name){
		return;
	    }else{
		label.textContent = new_name;
		login.rename_config(name, new_name);
	    }
	});

	remove_button.addEventListener('click', function(ev){
	    ev.stopPropagation();
	    login.remove_config(name);
	});

	config_list.addTab(name, [
	    label,
	    toggle_button,
	    rename_button,
	    remove_button
	]);
	if(this.form_disabled)
	    enableForm(login_form);
	if(!keep_data)
	    this.data[name] = clone(this.BLANK_CONFIG);
	this.save_config();
    },
    save_config: function(){
	DataStorage.record.write(this.data);
    },
    rename_config: function(old_name, new_name){
	this.data[new_name] = this.data[old_name];
	delete this.data[old_name];
	config_list.changeSymbol(old_name, new_name);
	this.save_config();
    },
    remove_config: function(name){
	config_list.removeTab(name);
	delete this.data[name];
	if(!Object.keys(this.data).length){
	    fillForm(login_form, this.BLANK_CONFIG);
	    disableForm(login_form);
	    this.form_disabled = true;
	}
	this.save_config();
    },
    connent: function(){

    },
    connect_all: function(){

    },
    callbacks: {
	add_button_click: function(){
	    var name = prompt(_('Name for new config:'));
	    if(!name)
		alert(_("Name can't be empty."));
	    else if(login.data[name])
		alert(_('The name has already used.'));
	    else
		login.add_config(name);
	},
	tab_change: function(ev){
	    fillForm(login_form, login.data[ev.detail.symbol]);
	},
	data_change: function(){
	    login.data[config_list.currentTab] = fetchFormData(login_form);
	    login.save_config();
	}
    }
};


function init(){
    /* create global objects for DOM nodes to be used */
    assignGlobalObjects({
	config_list: '#config_list',
	add_config_button: '#add_config_button',
	connect_button: '#connect_button',
	connect_all_button: '#connect_all_button',
	login_form: '#login_form'
    });

    /* initialize SubwayUI */
    DataStorage.init({
	record: true,
	data: true,
	settings: [
	    {
		category: 'Chat',
		items: [
		    {
			name: 'flood_protection',
			type: 'Boolean',
			default: true
		    },
		    {
			name: 'flood_protection_delay',
			type: 'Number',
			default: 1000
		    },
		    {
			name: 'strip_colors',
			type: 'Boolean',
			default: false
		    }
		]
	    },
	    {
		category: 'Log',
		items: [
		    {
			name: 'log_exclude',
			type: 'StringList',
			default: []
		    }
		]
	    }
	]
    });
    i18n.init();

    /* initialize client */
    login.init();
    
    /* load node-webkit API */
    gui = require('nw.gui');
    win = gui.Window.get();
    win.title = _('Chat Master');
    
    /* developer tools */
    popup_menu = new gui.Menu();
    var devtools_item = new gui.MenuItem({
	label: 'Debug'
    });
    devtools_item.addListener('click', function(){
	win.showDevTools();
    });
    popup_menu.append(devtools_item);
    $('html').addEventListener('contextmenu', function(ev){
	ev.preventDefault();
	popup_menu.popup(ev.x, ev.y);
	return false;
    });
}


window.addEventListener('load', init);



