/*jslint devel:true*/
/*global process, require*/

var port = 8080,
	serverDir = './root',
	fs = require('fs'),
	http = require('http'),
	os = require('os'),
	spawn = require('child_process').spawn,
	socketio = require('socket.io'),
	filedialog = require('./lib/FileDialog'),
	FFMPEG_EXE;

if (os.platform() === 'darwin') {
	FFMPEG_EXE = './ffmpeg_mac';
} else if (os.platform() === 'win32') {
	FFMPEG_EXE = 'ffmpeg.exe';
} else {
	FFMPEG_EXE = 'ffmpeg';
}

if (process.argv.length > 2) {
	port = parseInt(process.argv[2], 10);
}

var ffmpegProc = function () {
	'use strict';
	/* movie */
	var ffmpeg = spawn(FFMPEG_EXE,   [
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

	ffmpeg.on('error', function (code) {
		if (code) {
			console.log('ffmpeg process error ' + code);
		}
	});
	ffmpeg.on('exit', function (code) {
		if (code !== 0) {
			console.log('ffmpeg process exited with code ' + code);
		}
	});
};

var ffmpegInsts = {},
	clSocket = {},
	server = http.createServer(function　(request, response) {
		'use strict';
		var filePath = request.url,
			rs,
			arglist,
			inputfile,
			typefile,
			sessionId,
			codec;
		
		if (filePath === '/') {
			filePath = "/index.html";
		} else if (filePath === '/FileDialog.js') {
			filePath = "/../app/lib/FileDialog.js";
		} else if (filePath.slice(0, 2) === '/?') {
			console.log(filePath);
			filePath = filePath.slice(2);
			arglist = filePath.split('&');
			inputfile = arglist[0];
			typefile  = arglist[1];
			sessionId = arglist[2];
			console.log('MOV', inputfile, typefile, sessionId);

			clSocket[sessionId].emit('showError', '');
			
			request.on("close", function () {
				if (ffmpegInsts[sessionId]) {
					ffmpegInsts[sessionId].kill();
				}
			});

			request.on("end", function () {
				if (ffmpegInsts[sessionId]) {
					ffmpegInsts[sessionId].kill();
				}
			});


			if (typefile === 'webm') {
				codec = 'libvpx';
			} else if (typefile === 'mp4') {
				codec = 'libx264';
			}

			if (ffmpegInsts[sessionId]) {
				ffmpegInsts[sessionId].kill();
			}

			ffmpegInsts[sessionId] = spawn("ffmpeg",   [
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
			ffmpegInsts[sessionId].stdout.pipe(response);
			ffmpegInsts[sessionId].stderr.on('data', function (data) {
				console.log('ffmpeg : ' + data);
			});
			ffmpegInsts[sessionId].on('error', function (err) {
				console.log(err);
				clSocket[sessionId].emit('showError', "Faild to run FFMPEG.");
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
		} catch (er) {
			response.end("Bad request." + er);
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
	ffmpegInsts[socket.id] = null;
	clSocket[socket.id] = socket;
	
	filedialog.SocketEvent(socket, 'opendlg');
	socket.on('playfile', function (sdata) {
		console.log('playfile Event:' + sdata);
		var data = JSON.parser(sdata);
	});
});

