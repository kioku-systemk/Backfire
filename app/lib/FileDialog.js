/*jslint devel:true*/
/*global require, module*/

if (typeof window === 'undefined') { // Node.js
	var fs = require('fs'),
		Filedialog = {
			SocketEvent: function (socket, name) {
				'use strict';
				function getFiles(dir, list) {
					var files = fs.readdirSync(dir),
						name,
						i;
					if (!files) {
						return;
					}
					if (dir.substr(dir.length - 1) !== "/") {
						dir += "/";
					}
					for (i in files) {
						if (files.hasOwnProperty(i)) {
							name = dir + files[i];
							try {
								if (fs.statSync(name).isDirectory()) {
									//getFiles(name,list);
									//console.log(name);
									list.push({"name": files[i], "type": "dir", "path": name});
								} else if (files[i].substring(0, 1) !== '.') {
									//console.log(name);
									list.push({"name": files[i], "type": "file", "path": name});
								}
							} catch (e) {
								console.log("not found dir:" + dir);
							}
						}
					}
				}
				function updateFileList(path) {
					var list = [];
					try {
						getFiles(path, list);
						socket.emit(name + ':FileDialogUpdateList', JSON.stringify(list));
					} catch (e) {
						console.log("Failed getfile");
					}
				}

				socket.on(name + ':FileDialogReqFileList', function (data) {
					console.log('PATH=' + data);
					updateFileList(data);
				});
			}
		};
	module.exports = Filedialog;

} else {

	var FileDialog = function (name, ignoreDotFile, dirOnly) {
		'use strict';
		this.name = name;
		this.ignoreDotFile = ignoreDotFile;
		this.dirOnly = dirOnly;
		this.tarDir = "/";
	};
	
	FileDialog.prototype.registerSocketEvent = function (socket) {
		'use strict';
		this.socket = socket;
		var eventname = this.name + ':FileDialogUpdateList';
		console.log('FileDialog:' + eventname);
		function eventFunc(thisptr) {
			return function (data) {
				thisptr.updateDirlist(data);
			};
		}
		socket.on(eventname, eventFunc(this));
	};

	FileDialog.prototype.FileList = function (path) {
		'use strict';
		this.tarDir = path;
		console.log("Filelist:" + path);
		this.socket.emit(this.name + ":FileDialogReqFileList", path);
	};

	//--------------
	FileDialog.prototype.updateDirlist = function (jsonlist) {
		'use strict';
		function getUpDir(path) { // fix me beautiful
			if (path === "/") {
				return "/";
			}
			var p = path.split("/"),
				uppath = "/",
				i;
			if (p[p.length - 1] === "") {
				p.pop();
			}

			for (i = 0; i < p.length - 1; i += 1) {
				if (p[i] !== "") {
					uppath += p[i] + '/';
				}
			}
			if (uppath === "//") {
				uppath = "/";
			}
			
			return uppath;
		}
		
		function makeUpNode(tarPath) {
			var newbtn = document.createElement('div'),
				fileicon = document.createElement('div'),
				filelabel = document.createElement('p'),
				upath = getUpDir(tarPath);
			newbtn.setAttribute('class', "fileitem");
			newbtn.setAttribute('draggable', "false");
			fileicon.setAttribute('class', 'arrowleft');
			newbtn.appendChild(fileicon);

			filelabel.setAttribute('class', 'filelabel');
			filelabel.innerHTML = '..';
			newbtn.appendChild(filelabel);
			newbtn.setAttribute('onclick', 'openfileDialog("' + upath + '")');
			return newbtn;
		}

		function makeNode(name, path, type) {
			var newbtn = document.createElement('div'),
				fileicon = document.createElement('div'),
				filelabel = document.createElement('p');
			newbtn.setAttribute('class', "fileitem");
			newbtn.setAttribute('draggable', "false");
			fileicon.setAttribute('class', type);
			newbtn.appendChild(fileicon);

			filelabel.setAttribute('class', "filelabel");
			filelabel.innerHTML = name;
			newbtn.appendChild(filelabel);
			if (type === "dir") {
				newbtn.setAttribute('onclick', 'clickDir("' + path + '")');
			} else if (type === "file") {
				newbtn.setAttribute('onclick', 'clickFile("' + path + '")');
			}
			return newbtn;
		}
	
		// up dir
		var ls = document.getElementById("filelist"),
			unode = makeUpNode(this.tarDir),
			list = JSON.parse(jsonlist),
			newbtn,
			skip,
			i;
		
		ls.innerHTML = ''; // clear
		ls.appendChild(unode);

		for (i in list) {
			if (list.hasOwnProperty(i)) {
				skip = false;
				if (list[i].type !== "file" && list[i].type !== "dir") {
					console.log("Unknown file type -> " + list[i].type);
					skip = true;
				}
				if (list[i].name.charAt(0) === "." && this.ignoreDotFile) {
					skip = true;
				}
				if (list[i].type === "file" && this.dirOnly) { // ignore files
					skip = true;
				}

				if (!skip) {
					newbtn = makeNode(list[i].name, list[i].path, list[i].type);
					ls.appendChild(newbtn);
				}
			}
		}
	};
}