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
	FFMPEG_EXE = './ffmpeg/ffmpeg_mac';
} else if (os.platform() === 'win32') {
	FFMPEG_EXE = 'ffmpeg/ffmpeg.exe';
} else {
	FFMPEG_EXE = './ffmpeg/ffmpeg';
}

if (process.argv.length > 2) {
	port = parseInt(process.argv[2], 10);
}

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
			
			console.log('socket', clSocket[sessionId]);
			if (!clSocket[sessionId]) {
				response.end('Bad request');
				return;
			}
			console.log('MOV', inputfile, typefile, sessionId);

			clSocket[sessionId].emit('showError', '');
			
			request.on("close", function (sessionId) { return function () {
				if (ffmpegInsts[sessionId]) {
					console.log('kill FFMEPG:' + sessionId)
					ffmpegInsts[sessionId].kill();
					ffmpegInsts[sessionId] = null;
				}
			}}(sessionId));

			request.on("end", function (sessionId) { return function () {
				if (ffmpegInsts[sessionId]) {
					console.log('kill FFMEPG:' + sessionId)
					ffmpegInsts[sessionId].kill();
					ffmpegInsts[sessionId] = null;
				}
			}}(sessionId));


			if (typefile === 'webm') {
				codec = 'libvpx';
			} else if (typefile === 'mp4') {
				codec = 'libx264';
			}

			if (ffmpegInsts[sessionId]) {
				console.log('kill FFMEPG:' + sessionId)
				ffmpegInsts[sessionId].kill();
			}

			ffmpegInsts[sessionId] = spawn(FFMPEG_EXE,   [
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
			ffmpegInsts[sessionId].on('error', function (sessionId) { return function (err) {
				console.log(err);
				clSocket[sessionId].emit('showError', "Faild to run FFMPEG.");
				ffmpegInsts[sessionId] = null;
			}}(sessionId));
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

