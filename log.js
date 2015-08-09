var fs_ext = require('fs-extra');
var app_dir, log_dir, log_fd = {};


function init_log(){
    app_dir = DataStorage.data.dir;
    fs_ext.ensureDirSync(log_dir = app_dir + '/log');
}


function openLog(server, channel){
    var channel_dir, fd, log_file;
    fs_ext.ensureDirSync(channel_dir = printf('%1/%2/%3', log_dir, server, channel));
    log_file = printf('%1/%2_%3_%4.txt', channel_dir, channel, getDate(), getTime().replace(/:/g, '-'));
    fd = fs_ext.openSync(log_file, 'a');
    if(!log_fd[server])
	log_fd[server] = {};
    log_fd[server][channel] = fd;
}


function writeLog(server, channel, from, text){
    fs_ext.writeSync(log_fd[server][channel], getDate() + ' ' + getTime() + ' ' + from + text + '\n');
}


function closeLog(server, channel){
    fs_ext.closeSync(log_fd[server][channel]);
    delete log_fd[server][channel];
}
