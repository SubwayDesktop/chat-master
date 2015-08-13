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
	configs: {
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
	disabled: []
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
    /**
     * Initialization
     * @return void
     */
    init: function(){
	this.data = {
	    configs: {

	    },
	    /* note that this array is updated only when saving data to file */
	    disabled: []
	};
	/* use set, which is more convenience to operate than array */
	this.disabled = new Set();
	/* the form is disabled if and only if there are 0 configurations */
	this.form_disabled = false;
	var data = DataStorage.record.read();
	var names = Object.keys(data.configs);
	for(let I of data.disabled)
	    this.disabled.add(I);
	for(let I of names){
	    this.data.configs[I] = data.configs[I];
	    /* set keep_data to true, prevent it from creating a empty one */
	    this.add_config(I, true);
	}
	add_config_button.addEventListener('click', this.callbacks.add_button_click);
	config_list.addEventListener('change', this.callbacks.tab_change);
	login_form.addEventListener('change', this.callbacks.data_change);
	if(names.length){
	    /* the first configuration is current in tab bar */
	    fillForm(login_form, data.configs[names[0]]);
	}else{
	    disableForm(login_form);
	    this.form_disabled = true;
	}
    },
    /**
     * Add a configuration
     * @param String name
     * @param Boolean keep_data
     * @return void
     */
    add_config: function(name, keep_data){
	var label = create('span', {
	    className: 'config_list_item_label',
	    textContent: name
	});
	/* style for tab labels of disabled configurations */
	if(keep_data && this.disabled.has(name))
	    label.dataset.disabled = '';
	var toggle_button = create('widget-text-button', {
	    textContent: (keep_data && this.disabled.has(name))?
		'\u2610': '\u2611',
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
	/* wrap buttons together in order to float to right side of the tab */
	var wrapper = create('span', {
	    className: 'config_list_buttons_wrapper',
	    children: [
		toggle_button,
		rename_button,
		remove_button
	    ]
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
	    login.save_data();
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
	    wrapper
	]);
	if(this.form_disabled)
	    enableForm(login_form);
	if(!keep_data)
	    this.data.configs[name] = clone(this.BLANK_CONFIG);
	this.save_data();
    },
    /**
     * Save configurations to file
     * @return void
     */
    save_data: function(){
	/* Array.from() has not supported yet */
	var disabled_arr = [];
	for(let I of this.disabled)
	    disabled_arr.push(I);
	this.data.disabled = disabled_arr;
	DataStorage.record.write(this.data);
    },
    /**
     * Rename a configuration
     * @param String old_name
     * @param String new_name
     * @return void
     */
    rename_config: function(old_name, new_name){
	this.data.configs[new_name] = this.data.configs[old_name];
	delete this.data.configs[old_name];
	config_list.changeSymbol(old_name, new_name);
	this.save_data();
    },
    /**
     * Remove a configuration
     * @param String name
     * @return void
     */
    remove_config: function(name){
	config_list.removeTab(name);
	delete this.data.configs[name];
	if(this.disabled.has(name)){
	    this.diabled.delete(name);
	}
	if(!Object.keys(this.data.configs).length){
	    fillForm(login_form, this.BLANK_CONFIG);
	    disableForm(login_form);
	    this.form_disabled = true;
	}
	this.save_data();
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
	    else if(login.data.configs[name])
		alert(_('The name has already used.'));
	    else
		login.add_config(name);
	},
	tab_change: function(ev){
	    fillForm(login_form, login.data.configs[ev.detail.symbol]);
	},
	data_change: function(){
	    login.data.configs[config_list.currentTab] = fetchFormData(login_form);
	    login.save_data();
	}
    }
};


/**
 * Initialization
 * @return void
 */
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
	data: true,
	record: login.DEFAULT_DATA,
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



