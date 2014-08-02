/*jslint devel:true*/
/*global io*/

var fd;
window.onload = function () {
	'use strict';
	var socket = io.connect(),
		playbtn = document.getElementById('playbtn'),
		openbtn = document.getElementById('openbtn'),
		errormsg = document.getElementById('errormsg');
	
	fd = new FileDialog('opendlg', true, false);
	fd.registerSocketEvent(socket);
	
	socket.on('connect', function () {
		console.log('connected');
		socket.on('event', function (data) {
			console.log(data);
		});
		socket.on('showError', function (data) {
			//console.log('Err:', data)
			errormsg.innerHTML = data;
		});
	});

	function showFileList(show) {
		var e = document.getElementById('filelistarea');
		if (show === undefined) {
			show = (e.style.display === 'none' ? true : false);
		}
		if (!show) {
			e.style.display = 'none';
			openbtn.innerHTML = 'Browse';
		} else {
			e.style.display = '';
			openbtn.innerHTML = 'Close';
		}
	}
	playbtn.onclick = function () {
		showFileList(false);
		var dirpath  = document.getElementById('dirpath').value,
			filename = document.getElementById('filename').value,
			tarfile = '?' + dirpath + '/' + filename + '&webm&' + socket.io.engine.id;
		//console.log(tarfile);
		
		var moviearea = document.getElementById('moviearea'),
			mov = document.getElementById('mov');
		
		if (!mov) {
			mov = document.createElement('video');
			mov.setAttribute('id', 'mov');
			mov.style.width = '100%';
			mov.setAttribute('autoplay','');
			mov.setAttribute('controls','');
			moviearea.appendChild(mov);
		}
		mov.setAttribute('src', tarfile);
	};
	openbtn.onclick = function () {
		showFileList();
		fd.FileList('/');
	};
};

function clickDir(path) {
	document.getElementById('dirpath').value = path;
	fd.FileList(path);
}

function clickFile(path) {
	var fl = path.split("/");
	document.getElementById('filename').value = fl[fl.length - 1];
}
