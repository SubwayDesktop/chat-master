/**
 * Core Script of Chat Master
 *
 * Other Files:
 * format.js - format message text to html elements
 * log.js - write log files
 * md5.js - MD5 library from Internet
 */


/* load node.js modules */
var IRC = require('irc');
var GetMAC = require('getmac'); /* for color hash */

/* node-webkit API */
var gui, win, tray, popup_menu;


function init(){
    /* initialize SubwayUI */
    i18n.init();
    
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



