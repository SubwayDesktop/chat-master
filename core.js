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
/* login */
var login_dialog, login_form, config_list, add_config_button, connect_button, connect_all_button;
/* chat */
var channel_switcher, main_view;
/* templates */
var template_main_view, template_message;


var date = {
    /**
     * Returns a string contains formatted time
     * @return String
     */
    getTime: function(){
	var date = new Date();
	var hour = date.getHours();
	var minute = date.getMinutes();
	var second = date.getSeconds();
	if(hour < 10)
	    hour = '0' + hour;
	if(minute < 10)
	    minute = '0' + minute;
	if(second < 10)
	    second = '0' + second;
	return printf('%1:%2:%3', hour, minute, second);
    }    
};


/* ES6 Module is not implemented in any browser now.
 * We use separate objects as a bad "polyfill"
 */


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
	connect_button.addEventListener('click', this.callbacks.connect);
	connect_all_button.addEventListener('click', this.callbacks.connect_all);
	if(names.length){
	    /* the first configuration is current in tab bar */
	    fillForm(login_form, data.configs[names[0]]);
	}else{
	    disableForm(login_form);
	    this.form_disabled = true;
	}
    },
    /**
     * Adds a configuration
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
	    }else if(this.data.configs[new_name]){
		alert(_('The name has already used.'));
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
     * Saves configurations to file
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
     * Renames a configuration
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
     * Removes a configuration
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
	},
	/* Connects to server with the current configuration */
	connect: function(){
	    var configs = {};
	    var name = config_list.currentTab;
	    configs[name] = login.data.configs[name];
	    chat.connect(configs);
	    hide(login_dialog);
	},
	/* Connects to the servers of all enabled configurations */
	connect_all: function(){
	    chat.connect(login.data.configs);
	    hide(login_dialog);
	}
    }
};


var chat = {
    /**
     * Connects to servers and initialize the channel switcher (called once)
     * @param Object configs
     * @return void
     */
    connect: function(configs){
	this.connections = {};

	channel_switcher.init({
	    selectionMode: 'single'
	});
	
	var settings = DataStorage.settings.get();
	var names = Object.keys(configs);
	for(let name of names){
	    let config = configs[name];
	    let options = {
		userName: config.username,
		realName: config.real_name,
		port: config.port? config.port: 6667,
		localAddress: null,
		debug: true,
		showErrors: true,
		autoRejoin: false,
		autoConnect: false,
		channels: [],
		secure: config.ssl,
		selfSigned: config.self_signed,
		certExpired: false,
		floodProtection: settings.flood_protection,
		floodProtectionDelay: settings.flood_protection_delay,
		sasl: config.sasl,
		stripColors: settings.strip_colors,
		channelPrefixes: "&#",
		messageSplit: 512,
		encoding: 'UTF-8' /* TODO: settings */
	    };
	    if(config.password)
		options.password = config.password;
	    let client = new IRC.Client(config.server, config.nick, options);
	    /* Save data on client object
	     * String client.name
	     * - The name of corresponding configuration (aka connection)
	     */
	    client.name = name;

	    let view = inst_div(template_main_view);
	    let msg_stream = view.querySelector('.msg_stream');
	    let input_box = view.querySelector('.input_box');
	    main_view.addWidget(view);
	    
	    let label = create('span', name);
	    channel_switcher.addRow(view, null, [
		[label]
	    ]);

	    channel_switcher.addEventListener('change', this.callbacks.change_view);

	    client.on('registered', this.callbacks.registered);
	    client.on('join', this.callbacks.join);
	    client.on('message', this.callbacks.message);
	    
	    this.connections[name] = {
		client: client,
		view: view,
		msg_stream: msg_stream,
		input_box: input_box,
		channels: {}
	    };

	    /* retryCount = 0 */
	    client.connect(0);
	}
	channel_switcher.currentRow = this.connections[names[0]].view;
    },
    /**
     * Adds a main view for new channel
     * @param String connection
     * @param String channel
     * @return void
     */
    add_channel: function(connection, channel){
	var name = connection;
	
	var view = inst_div(template_main_view);
	var msg_stream = view.querySelector('.msg_stream');
	var user_list = view.querySelector('.user_list');
	var input_box = view.querySelector('.input_box');
	main_view.addWidget(view);
	
	var label = create('span', channel);
	channel_switcher.addRow(view, this.connections[name].view, [
	    [label]
	]);

	this.connections[name].channels[channel] = {
	    view: view,
	    msg_stream: msg_stream,
	    user_list: user_list,
	    input_box: input_box
	};
    },
    /**
     * Adds a new message line into the message stream box "msg_stream"
     * @param String type
     * @param String from
     * @param String text
     * @param Widget.List msg_stream
     * @return void
     */
    push_message: function(type, from, text, msg_stream){
	var time = printf('(%1)', date.getTime());
	var content = inst(template_message, {
	    '.message_date': time,
	    '.message_from': from,
	    '.message_body': format_message(text)
	});
	var msg = create('div', {
	    className: 'message',
	    children: [content]
	});
	msg_stream.insert(msg);
    },
    callbacks: {
	change_view: function(ev){
	    var view = ev.detail.symbol;
	    main_view.currentWidget = view;
	},
	registered: function(){
	    var con = chat.connections[this.name];
	    console.log(printf('Client %1 connected.', this.name));
	    chat.push_message('info', '', _('Connected'), con.msg_stream);
	},
	join: function(channel, nick, message){
	    var con = chat.connections[this.name];
	    if(nick == con.client.nick)
		chat.add_channel(this.name, channel);
	    /* TODO: else: update user list */
	    chat.push_message('info', '',
			      printf(_('%1 joined %2'), nick, channel),
			      con.channels[channel].msg_stream);
	},
	message: function(from, to, text, message){
	    var con = chat.connections[this.name];
	    if(con.channels[to])
		chat.push_message('user_msg', from, text,
				  con.channels[to].msg_stream);
	    /* TODO: other situations */
	}
    }
};


/* bind to node context */
global.chat = chat;


/**
 * Initialization
 * @return void
 */
function init(){
    /* create global objects for DOM nodes to be used */
    assignGlobalObjects({
	/* login */
	login_dialog: '#login_dialog',
	config_list: '#config_list',
	add_config_button: '#add_config_button',
	connect_button: '#connect_button',
	connect_all_button: '#connect_all_button',
	login_form: '#login_form',	
	/* chat */
	channel_switcher: '#channel_switcher',
	main_view: '#main_view',
	/* templates */
	template_main_view: '#template_main_view',
	template_message: '#template_message'
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



