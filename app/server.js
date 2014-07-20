/*jslint devel:true*/
/*global process, require*/

var port = 8080,
	serverDir = './root',
	fs = require('fs'),
	http = require('http'),
	spawn = require('child_process').spawn,
	socketio = require('socket.io'),
	filedialog = require('./lib/FileDialog'),
	ffmpegInst = null;

if (process.argv.length > 2) {
	port = parseInt(process.argv[2], 10);
}

var ffmpegProc = function () {
	'use strict';
	/* movie */
	var ffmpeg = spawn("ffmpeg",   [
		'-i', 'marimo_out.mp4',
		'-f', 'webm', '-vcodec', 'libvpx',
		//'-f', 'mp4', '-vcodec', 'libx264',// fail!! invalid arument?
		'-r', '60',	'-skip_threshold', '25',
		'-speed', '1',
		'-quality', 'realtime',
		'-b', '900000', '-maxrate', '900000', '-minrate', '900000',
		'-bufsize', '900000', '-rc_init_occupancy', '900000',
		'-rc_lookahead', '0', '-qmin', '20', '-qmax', '50',
		'-y', 'pipe:1'
	]);
//	ffmpeg.stdout.pipe(response);

	/*
	var testGL = spawn("./Test");
	var ffmpeg = spawn("ffmpeg",   [
		// 連番画像
		'-f', 'rawvideo',
		'-r', '30', '-s', '720x480', '-pix_fmt', 'rgb24',
		'-i', 'pipe:0',
		// movie
		//'-i', 'marimo_out.mp4',
		//'-i','music.mp3',

		'-f', 'webm', '-vcodec', 'libvpx',
		//'-f', 'mp4', '-vcodec', 'libx264',// fail!! invalid arument?
		'-r', '30',	'-skip_threshold', '25',
		'-speed', '1',
		'-quality', 'realtime',
		'-b', '900000', '-maxrate', '900000', '-minrate', '900000',
		'-bufsize', '900000', '-rc_init_occupancy', '900000',
		'-rc_lookahead', '0', '-qmin', '20', '-qmax', '50',
		// audio
		'-an',
		//'-codec:a', 'aac', '-strict', 'experimental', '-ac', '2',
		//'-codec:a', 'mp3', '-ac', '2',

		//'-map', '0:0.0', '-map', '1:0.1',
		'-y', 'pipe:1'
	]);

	testGL.stdout.pipe(ffmpeg.stdin);
	ffmpeg.stdout.pipe(response);
	*/

	/*ffmpeg.stdout.on('data', function(res){ return function(data) {
		console.log('AAAAA');
		data.pipe(res);
	}}(response));
	*/
	ffmpeg.stderr.on('data', function (data) {
		console.log('ffmpeg stderr: ' + data);
	});

	ffmpeg.on('exit', function (code) {
		if (code !== 0) {
			console.log('ffmpeg process exited with code ' + code);
		}
	});
};

var server = http.createServer(function　(request, response) {
	request.on("close", function() {
		if (ffmpegInst) {
			ffmpegInst.kill();
		}
	});

	request.on("end", function() {
		if (ffmpegInst) {
			ffmpegInst.kill();
		}
	});
	'use strict';
	var filePath = request.url,
		rs,
		arglist,
		inputfile,
		typefile,
		codec;
	if (filePath === '/') {
		filePath = "/index.html";
	} else if (filePath === '/FileDialog.js') {
		filePath = "/../app/lib/FileDialog.js";
	} else if (filePath.slice(0,2) === '/?') {
		filePath = filePath.slice(2);
		arglist = filePath.split('&');
		inputfile = arglist[0];
		typefile  = arglist[1];
		console.log('MOV',inputfile, typefile);
		
		if (typefile === 'webm') {
			codec = 'libvpx';
		} else if (typefile === 'mp4') {
			codec = 'libx264';
		}
		
		if (ffmpegInst) {
			ffmpegInst.kill();
		}
		ffmpegInst = spawn("ffmpeg",   [
			'-i', inputfile,
			'-f', typefile, '-vcodec', codec,
			'-r', '30',	'-skip_threshold', '25',
			'-speed', '1',
			'-quality', 'realtime',
			'-b', '900000', '-maxrate', '900000', '-minrate', '900000',
			'-bufsize', '900000', '-rc_init_occupancy', '900000',
			'-rc_lookahead', '0', '-qmin', '20', '-qmax', '50',
			'-y', 'pipe:1'
		]);
		ffmpegInst.stdout.pipe(response);
		ffmpegInst.stderr.on('data', function (data) {
			console.log('ffmpeg : ' + data);
		});
		return;
	}
	filePath = serverDir + filePath;
	
	try {
		rs = fs.createReadStream(filePath);
		rs.on('error', function (err) {
			console.log(err);
		});
		rs.pipe(response);
	} catch (e) {
		response.end("Bad request." + e);
	}
});
server.listen(port, function () {
	'use strict';
	console.log((new Date()) + ' Server is listening on port ' + port);
});



//
// socket.io setting
//
var io = socketio.listen(server);
function enableProductionSetting(io) {
	'use strict';
	io.enable('browser client minification');  // send minified client
	io.enable('browser client etag');          // apply etag caching logic based on version number
	io.enable('browser client gzip');          // gzip the file
	io.set('log level', 1);                    // reduce logging
	io.set('transports', [
		'websocket',
		'flashsocket',
		'htmlfile',
		'xhr-polling',
		'jsonp-polling'
	]);
}
//enableProductionSetting(io);

io.sockets.on('connection', function (socket) {
	'use strict';
	console.log('connected:' + socket.id);
	filedialog.SocketEvent(socket, 'opendlg');
	socket.on('playfile', function (sdata) {
		console.log('playfile Event:' + sdata);
		var data = JSON.parser(sdata);
	});
});
