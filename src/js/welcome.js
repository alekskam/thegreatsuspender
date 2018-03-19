/*global chrome */
(function () {
    'use strict';

    var gsUtils = chrome.extension.getBackgroundPage().gsUtils;

    gsUtils.documentReadyAndLocalisedAsPromsied(document).then(function () {
        //just used for localisation
    });
	addEvent();
}());

function addEvent() {
	if(document.getElementById('visitOptions')) {
		document.getElementById('visitOptions').addEventListener('click', ()=>{
			window.location.href = chrome.extension.getURL('options.html');
		})
	} else {
		setTimeout(addEvent, 100);
	}
}