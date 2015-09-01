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

/* node-webkit API */
var gui, win, tray, popup_menu;

/* DOM nodes */
/* login */
var login_dialog, login_form, config_list, add_config_button, connect_button, connect_all_button;
/* chat */
var channel_switcher, main_view;
/* templates */
var template_main_view, template_message;


/* ES6 Module is not implemented in any browser now.
 * We use separate objects as a bad "polyfill"
 */


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


var color = {
    /**
     * Initialization
     * @return void
     */
    init: function(){
	/* Object: Hash<String, String> */
	this.map = [];
	this.mac_addr = '';

	/* get local mac address for color hash */
	var GetMAC = require('getmac');
	GetMAC.getMac(function(err, mac){
	    if(err){
		console.log(err);
		return;
	    }
	    color.mac_addr = mac;
	});
    },
    /**
     * Checks if a color is valid (R, G, B <= 144) in light theme
     * @param Array<Number> rgb
     * @return Boolean
     */
    check: function(rgb){
	var i, count = 0;
	for(i=0; i<3; i++)
	    if(rgb[i] > 144)
		count++;
	if(count < 2)
	    return true;
	return false;
    },
    /**
     * Gets color of a nick (format: #rrggbb)
     * @param String nick
     * @return String
     */
    get: function(nick){
	if(this.map[nick])
	    return this.map[nick];
	var hash = md5(nick + this.mac_addr);
	var color_str, pos = 0;
	var rgb = [255, 255, 255];
	while(!this.check(rgb) && pos+6 <= hash.length){
	    color_str = hash.slice(pos, pos+6);
	    rgb[0] = Number.parseInt(color_str[0]+color_str[1], 16);
	    rgb[1] = Number.parseInt(color_str[2]+color_str[3], 16);
	    rgb[2] = Number.parseInt(color_str[4]+color_str[5], 16);
	    pos++;
	}
	return (this.map[nick] = '#' + color_str);
    }
};


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
    /* The structure to record data corresponding to a tab */
    ViewData: function(connection, channel){
	this.connection = connection;
	this.channel = channel;
	assignMethods(chat.ViewData, {
	    get: function(){
		if(this.channel)
		    return chat.connections[this.connection].channels[this.channel];
		else
		    return chat.connections[this.connection];
	    }
	});
    },
    /**
     * Connects to servers and initialize the channel switcher (called once)
     * @param Object configs
     * @return void
     */
    connect: function(configs){
	this.connections = {};
	/* this.view_data: Object: Hash<Symbol, this.ViewData>
	 * We have to use symbol because we need primitive as unique
	 * identifiers for items (rows) of Widget.TableView
	 */
	this.view_data = {};

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
		port: (config.port || 6667),
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

	    let symbol = Symbol(name);

	    let view = inst(template_main_view, 'div');
	    let msg_stream = view.querySelector('.msg_stream');
	    let input_box = view.querySelector('.input_box');
	    msg_stream.dataset.bottom = 'true';
	    main_view.addWidget(view);
	    
	    let label = create('span', name);
	    channel_switcher.addRow(symbol, null, [
		[label]
	    ]);

	    channel_switcher.addEventListener('change', this.callbacks.change_view);

	    input_box.addEventListener('keyup', this.callbacks.inputbox_keyup);

	    ['registered', 'join', 'names', 'part', 'quit', 'topic', 'message',
	     'selfMessage', 'notice', 'action', 'error'].forEach(function (I){
		 client.on(I, chat.callbacks[
		     I.replace(/[A-Z]/g, '_$&').toLowerCase()
		 ]);
	     });

	    this.view_data[symbol] = new this.ViewData(name);
	    
	    this.connections[name] = {
		symbol: symbol,
		client: client,
		view: view,
		msg_stream: msg_stream,
		input_box: input_box,
		channels: {}
	    };

	    /* retryCount = 0 */
	    client.connect(0);
	}
	channel_switcher.currentRow = this.connections[names[0]].symbol;
    },
    /**
     * Adds a main view for new channel
     * @param String connection
     * @param String channel
     * @return void
     */
    add_channel: function(connection, channel){
	var name = connection;
	var symbol = Symbol(printf('%1 %2', name, channel));
	
	var view = inst(template_main_view, 'div');
	var msg_stream = view.querySelector('.msg_stream');
	var user_list = view.querySelector('.user_list');
	var user_list_header = view.querySelector('.user_list_header');
	var input_box = view.querySelector('.input_box');
	msg_stream.dataset.bottom = 'true';
	main_view.addWidget(view);

	var label = create('span', channel);
	var counter = create('span');
	channel_switcher.addRow(symbol, this.connections[name].symbol, [
	    [label, counter]
	]);

	input_box.addEventListener('keyup', this.callbacks.inputbox_keyup);

	this.view_data[symbol] = new this.ViewData(connection, channel);

	this.connections[name].channels[channel] = {
	    symbol: symbol,
	    view: view,
	    msg_stream: msg_stream,
	    user_list: user_list,
	    user_list_header: user_list_header,
	    input_box: input_box,
	    counter: counter
	};
    },
    /**
     * Checks if a message stream is scrolled to bottom
     * @param Widget.List msg_stream
     * @return Boolean
     */
    check_scroll: function(msg_stream){
	var bottom;
	if(msg_stream.style.display == 'none'){
	    bottom = false;
	}else{
	    bottom = (msg_stream.scrollTop + msg_stream.offsetHeight == msg_stream.scrollHeight);
	    msg_stream.dataset.bottom = bottom;
	}
	return bottom;
    },
    /**
     * Adds a new message line into the message stream box of the symbol
     * @param Array<String> flags
     * @param String from
     * @param String text
     * @param Symbol symbol
     * @return void
     */
    push_message: function(flags, from, text, symbol){
	var view_obj = this.view_data[symbol].get();
	var msg_stream = view_obj.msg_stream;
	var time = printf('(%1)', date.getTime());
	var bottom = this.check_scroll(msg_stream);
	if(!Array.isArray(flags))
	    flags = [flags];
	flags.push('message');
	var content = inst(template_message, {
	    '.message_date': {
		textContent: time,
		style: {
		    color: (from && color.get(from))
		}
	    },
	    '.message_from': {
		textContent: from,
		style: {
		    color: (from && color.get(from))
		}
	    },
	    '.message_body': format_message(text)
	});
	var msg = create('widget-list-item', {
	    classList: flags,
	    children: [content]
	});
	msg_stream.insert(msg);
	if(bottom)
	    msg_stream.scrollTop = msg_stream.scrollHeight;
	if(flags.indexOf('user_msg') != -1 && view_obj.counter
	   && symbol != channel_switcher.currentRow){
	    let counter = view_obj.counter;
	    let count;
	    if(counter.dataset.count)
		count = Number.parseInt(counter.dataset.count) + 1;
	    else
		count = 1;
	    counter.dataset.count = count;
	    counter.textContent = printf(' (%1)', count);
	}
    },
    /**
     * Adds a new error message line
     * @param Symbol con_symbol
     * @param String text
     */
    push_error: function(con_symbol, text){
	var con = this.connections[this.view_data[con_symbol].connection];
	var time = printf('(%1)', date.getTime());
	function new_error(){
	    var content = inst(template_message, {
		'.message_date': time,
		'.message_from': {
		    textContent: _('[ERROR]'),
		    style: {
			color: '#F33'
		    }
		},
		'.message_body': text
	    });
	    var err = create('widget-list-item', {
		classList: ['message', 'error'],
		children: [content]
	    });
	    return err;
	}
	con.msg_stream.insert(new_error());
	for(let I of Object.keys(con.channels))
	    con.channels[I].msg_stream.insert(new_error());
    },
    /**
     * Executes an IRC command on current connection and current channel
     * @param String command
     * @param String args
     */
    exec: function(command, args){
	var symbol = channel_switcher.currentRow;
	var data = this.view_data[symbol];
	var current_connection = data.connection;
	var current_channel = data.channel;
	var con = this.connections[current_connection];
	var client = con.client;
	var args_arr;
	switch(command){
	case 'say':
	    if(current_channel)
		client.say(current_channel, args);
	    break;
	case 'join':
	    client.join(args);
	    break;
	    /*
	case 'part':
	    args_arr = args.split(' ');
	    client.part(args_arr[0], args_arr[1]);
	    break;
	    */
	case 'action':
	    if(current_channel)
		client.action(current_channel, args);
	/* msg, mode ... */
	}
    },
    callbacks: {
	change_view: function(ev){
	    var view_obj = chat.view_data[ev.detail.symbol].get();
	    var msg_stream = view_obj.msg_stream;
	    chat.check_scroll(main_view.currentWidget);
	    main_view.currentWidget = view_obj.view;
	    if(msg_stream.dataset.bottom == 'true')
		msg_stream.scrollTop = msg_stream.scrollHeight;
	    if(view_obj.counter){
		view_obj.counter.dataset.count = '0';
		view_obj.counter.textContent = '';
	    }
	},
	registered: function(){
	    var con = chat.connections[this.name];
	    console.log(printf('Client %1 connected.', this.name));
	    chat.push_message(['info', 'connected'], '', _('Connected'),
			      con.symbol);
	},
	join: function(channel, nick, message){
	    var con = chat.connections[this.name];
	    if(nick == con.client.nick)
		chat.add_channel(this.name, channel);
	    else
		chat.push_message(['info', 'join'], '',
				  printf(_('%1 joined %2'), nick, channel),
				  con.channels[channel].symbol);
	},
	names: function(channel, users){
	    var con = chat.connections[this.name];
	    var keys = Object.keys(users);
	    var user_list = con.channels[channel].user_list;
	    var header = con.channels[channel].user_list_header;
	    keys.sort();
	    header.textContent = printf(_('%1 people', '%1 people'),
					keys.length);

	    function gen_flags(nick){
		var flags = [];
		if(users[nick].indexOf('@') != -1)
		    flags.push('user_op');
		if(users[nick].indexOf('+') != -1)
		    flags.push('user_voice');
		return flags;
	    }

	    function new_item(nick){
		var flags = gen_flags(nick);
		return create('widget-list-item', {
		    textContent: nick,
		    classList: flags,
		    style: {
			color: color.get(nick)
		    },
		    dataset: {
			nick: nick
		    }
		});
	    }

	    user_list.clear();
	    for(let I of keys)
		user_list.insert(new_item(I));

	    /* "users" is a reference, which is equivalent to
	     * con.client.chans[channel.toLowerCase()].users
	     */
	    Object.observe(users, function(changes){
		for(let change of changes){
		    /* "update" change type is useless
		     * because node-irc does not update values of "users"
		     */
		    switch(change.type){
		    case 'add':
			for(let item of user_list.childNodes){
			    if(change.name < item.dataset.nick){
				user_list.insert(new_item(change.name), item);
				break;
			    }
			}
			break;
		    case 'delete':
			user_list.remove(user_list.querySelector(
			    printf('[data-nick="%1"]', change.name)));
			break;
		    }
		}
	    });
	},
	part: function(channel, nick, reason, message){
	    var con = chat.connections[this.name];
	    if(nick == con.client.nick)
		return;
	    else if(reason)
		chat.push_message(['info', 'part'], '',
				  printf(_('%1 left %2 - %3'), nick,
					 channel, reason),
				  con.channels[channel].symbol);
	    else
		chat.push_message(['info', 'part'], '',
				  printf(_('%1 left %2'), nick, channel),
				  con.channels[channel].symbol);
	},
	quit: function(nick, reason, channels, message){
	    console.log({
		nick: nick,
		reason: reason,
		channels: channels,
		message: message
	    });
	},
	topic: function(channel, topic, nick, message){
	    var con = chat.connections[this.name];
	    chat.push_message(['topic'], '',
			      printf(_('[TOPIC] %1 set by %2'), topic, nick),
			      con.channels[channel].symbol);
	},
	self_message: function(to, text){
	    var con = chat.connections[this.name];
	    chat.push_message(['self'], con.client.nick, text,
			      con.channels[to].symbol);
	},
	message: function(from, to, text, message){
	    var con = chat.connections[this.name];
	    if(con.channels[to])
		chat.push_message(['user_msg'], from, text,
				  con.channels[to].symbol);
	    /* TODO: else */
	},
	notice: function(from, to, text, message){
	    var con = chat.connections[this.name];
	    if(con.channels[to])
		chat.push_message(['user_msg', 'notice'], from, text,
				  con.channels[to].symbol);
	    else if(!from)
		chat.push_message(['notice', 'server_info'], '', text,
				  con.symbol);
	},
	action: function(from, to, text, message){
	    var con = chat.connections[this.name];
	    chat.push_message(['user_msg', 'action'], from, text,
			      con.channels[to].symbol);
	},
	error: function(message){
	    var con = chat.connections[this.name];
	    var args = message.args;
	    args.shift();
	    chat.push_error(con.symbol, args.join(' '));
	},
	inputbox_keyup: function(ev){
	    if(ev.keyCode == 13){
		let text = this.value;
		if(text.startsWith('/')){
		    let pos = text.indexOf(' ');
		    if(pos == -1)
			pos = text.length;
		    let cmd = text.slice(1, pos);
		    let args = text.slice(pos, text.length);
		    chat.exec(cmd, args);
		}else{
		    chat.exec('say', text);
		}
		this.value = '';
		/* input history */
	    }else if(ev.keyCode == 9){
		/* tab completion */
	    }
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

    /* initialize color */
    color.init();
    
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



