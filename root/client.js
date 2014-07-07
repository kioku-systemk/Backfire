/*jslint devel:true*/
window.onload = function () {
	'use strict';
	
	var playbtn = document.getElementById('playbtn');
	playbtn.onclick = function () {
		var inputfile =  document.getElementById('fname').value;
		console.log(inputfile);
	};
};