/* global chrome, XMLHttpRequest */
(function () {
    'use strict';

    var tgs = chrome.extension.getBackgroundPage().tgs;
    var gsStorage = chrome.extension.getBackgroundPage().gsStorage;
    var gsUtils = chrome.extension.getBackgroundPage().gsUtils;

    function toggleNag(hideNag) {
        gsStorage.setOption(gsStorage.NO_NAG, hideNag);
    }

    function loadDonateButtons() {
        document.getElementById('donateButtons').innerHTML = this.responseText;

        var bitcoinBtn = document.getElementById('bitcoinBtn');
        var paypalBtn = document.getElementById('paypalBtn');

        bitcoinBtn.innerHTML = chrome.i18n.getMessage('js_donate_bitcoin');
        paypalBtn.setAttribute('value', chrome.i18n.getMessage('js_donate_paypal'));

        bitcoinBtn.onclick = function () {
            toggleNag(true);
            tgs.getAnalyticsTracker().sendEvent('Donations', 'Choose', 'Bitcoin');
        };
        paypalBtn.onclick = function () {
            toggleNag(true);
            tgs.getAnalyticsTracker().sendEvent('Donations', 'Choose', 'Paypal');
        };

        document.getElementById('alreadyDonatedToggle').onclick = function () {
            toggleNag(true);
            window.location.reload();
        };
        document.getElementById('donateAgainToggle').onclick = function () {
            toggleNag(false);
            window.location.reload();
        };
    }

    function initAnalyticsConfig(config) {
        var checkbox = document.getElementById('analyticsOptOut');
        checkbox.checked = config.isTrackingPermitted();
        checkbox.onchange = function () {
            config.setTrackingPermitted(checkbox.checked);
        };
    }

    gsUtils.documentReadyAndLocalisedAsPromsied(document).then(function () {

        var versionEl = document.getElementById('aboutVersion');
        versionEl.innerHTML = chrome.i18n.getMessage('ext_extension_name') + ' v' + chrome.runtime.getManifest().version;

        if (gsStorage.getOption(gsStorage.NO_NAG)) {
            document.getElementById('donateSection').style.display = 'none';
            document.getElementById('donatedSection').style.display = 'block';
        }

        var request = new XMLHttpRequest();
        request.onload = loadDonateButtons;
        request.open('GET', 'support.html', true);
        request.send();

        //hide incompatible sidebar items if in incognito mode
        if (chrome.extension.inIncognitoContext) {
            Array.prototype.forEach.call(document.getElementsByClassName('noIncognito'), function (el) {
                el.style.display = 'none';
            });
        }

        //set analytics on/off state
        tgs.getAnalyticsService.getConfig().addCallback(initAnalyticsConfig);
    });

    tgs.getAnalyticsTracker().sendAppView('about.js');
}());
