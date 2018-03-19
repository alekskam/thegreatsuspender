/*global chrome */
(function () {
    'use strict';

    var gsSession = chrome.extension.getBackgroundPage().gsSession;
    var gsUtils = chrome.extension.getBackgroundPage().gsUtils;
    var tgs = chrome.extension.getBackgroundPage().tgs;
    var globalActionElListener;

    var getTabStatus = function (retriesRemaining, callback) {
        tgs.getActiveTabStatus(function (status) {
            if (chrome.runtime.lastError) {
                gsUtils.error('popup', chrome.runtime.lastError);
            }
            if (status !== 'unknown' && status !== 'loading') {
                callback(status);
            } else if (retriesRemaining === 0) {
                callback(status);
            } else {
                var timeout = 1000;
                if (!gsSession.isInitialising()) {
                    retriesRemaining--;
                    timeout = 200;
                }
                setTimeout(function () {
                    getTabStatus(retriesRemaining, callback);
                }, timeout);
            }
        });
    };
    var initialTabStatusAsPromised = new Promise(function (resolve, reject) {
        getTabStatus(0, resolve);
    });
    var tabStatusAsPromised = new Promise(function (resolve, reject) {
        var retries = 50; //each retry is 200ms which makes 10 seconds
        getTabStatus(retries, function (status) {
            if (status === 'unknown' || status === 'loading') {
                status = 'error';
            }
            resolve(status);
        });
    });
    var selectedTabsAsPromised = new Promise(function (resolve, reject) {
        chrome.tabs.query({highlighted: true, lastFocusedWindow: true}, function (tabs) {
            resolve(tabs);
        });
    });



    Promise.all([gsUtils.documentReadyAndLocalisedAsPromsied(document), initialTabStatusAsPromised, selectedTabsAsPromised])
        .then(function ([domLoadedEvent, initialTabStatus, selectedTabs]) {

            setSuspendCurrentVisibility(initialTabStatus);
            setSuspendSelectedVisibility(selectedTabs);
            setStatus(initialTabStatus);
            showPopupContents();
            addClickHandlers();

            if (initialTabStatus === 'unknown' || initialTabStatus === 'loading') {
                tabStatusAsPromised.then(function (finalTabStatus) {
                    setSuspendCurrentVisibility(finalTabStatus);
                    setStatus(finalTabStatus);
                });
            }
        });

    function setSuspendCurrentVisibility(tabStatus) {

        var suspendOneVisible = !['suspended', 'special', 'loading', 'unknown'].includes(tabStatus),
            whitelistVisible = !['whitelisted', 'special', 'loading', 'unknown'].includes(tabStatus),
            pauseVisible = ['normal', 'audible', 'noConnectivity', 'charging', 'active'].includes(tabStatus);

        if (suspendOneVisible) {
            document.getElementById('suspendOne').style.display = 'block';
        } else {
            document.getElementById('suspendOne').style.display = 'none';
        }

        if (whitelistVisible) {
            document.getElementById('whitelist').style.display = 'block';
        } else {
            document.getElementById('whitelist').style.display = 'none';
        }

        if (pauseVisible) {
            document.getElementById('tempWhitelist').style.display = 'block';
        } else {
            document.getElementById('tempWhitelist').style.display = 'none';
        }

        if (suspendOneVisible || whitelistVisible || pauseVisible) {
            document.getElementById('optsCurrent').style.display = 'block';
        } else {
            document.getElementById('optsCurrent').style.display = 'none';
        }
    }

    function setSuspendSelectedVisibility(selectedTabs) {
        if (selectedTabs && selectedTabs.length > 1) {
            document.getElementById('optsSelected').style.display = 'block';
        } else {
            document.getElementById('optsSelected').style.display = 'none';
        }
    }

    function setStatus(status) {
        var statusDetail = '',
            statusIconClass = '';

        // Update status icon and text
        if (status === 'normal' || status === 'active') {
            statusDetail = chrome.i18n.getMessage('js_popup_normal');
            statusIconClass = 'fa clock-icon header-icon-alignment';

        } else if (status === 'suspended') {
            statusDetail = chrome.i18n.getMessage('js_popup_suspended') +
                " <a href='#' class='header-button'>" + chrome.i18n.getMessage('js_popup_suspended_unsuspend') + '</a>';
            statusIconClass = 'fa freeze-white-icon header-icon-alignment';

        } else if (status === 'never') {
            statusDetail = chrome.i18n.getMessage('js_popup_never');
            statusIconClass = 'fa icon-ban header-icon-alignment';
			document.querySelectorAll('#header')[0].className = 'gray-bgn'

        } else if (status === 'special') {
            statusDetail = chrome.i18n.getMessage('js_popup_special');
            statusIconClass = 'fa icon-ban header-icon-alignment';
			document.querySelectorAll('#header')[0].className = 'gray-bgn'

        } else if (status === 'whitelisted') {
            statusDetail = chrome.i18n.getMessage('js_popup_whitelisted') +
                " <a href='#' class='header-button'>" + chrome.i18n.getMessage('js_popup_whitelisted_remove') + '</a>';
            statusIconClass = 'fa whitelist-icon header-icon-alignment';

        } else if (status === 'audible') {
            statusDetail = chrome.i18n.getMessage('js_popup_audible');
            statusIconClass = 'fa fa-volume-up header-icon-alignment';

        } else if (status === 'formInput') {
            statusDetail = chrome.i18n.getMessage('js_popup_form_input') +
                " <a href='#'>" + chrome.i18n.getMessage('js_popup_form_input_unpause') + '</a>';
            statusIconClass = 'fa edit-icon header-icon-alignment';

        } else if (status === 'pinned') {
            statusDetail = chrome.i18n.getMessage('js_popup_pinned');
            statusIconClass = 'fa icon-ban header-icon-alignment';

        } else if (status === 'tempWhitelist') {
            statusDetail = chrome.i18n.getMessage('js_popup_temp_whitelist') +
                " <a href='#'>" + chrome.i18n.getMessage('js_popup_temp_whitelist_unpause') + '</a>';
            statusIconClass = 'fa whitelist-icon header-icon-alignment';

        } else if (status === 'noConnectivity') {
            statusDetail = chrome.i18n.getMessage('js_popup_no_connectivity');
            statusIconClass = 'fa fa-plane header-icon-alignment';

        } else if (status === 'charging') {
            statusDetail = chrome.i18n.getMessage('js_popup_charging');
            statusIconClass = 'fa fa-plug header-icon-alignment';

        } else if (status === 'loading' || status === 'unknown') {
            if (gsSession.isInitialising()) {
                statusDetail = chrome.i18n.getMessage('js_popup_initialising');
            } else {
                statusDetail = chrome.i18n.getMessage('js_popup_unknown');
            }
            statusIconClass = 'fa fa-circle-o-notch header-icon-alignment';
			document.querySelectorAll('#header')[0].className = 'gray-bgn'

        } else if (status === 'error') {
            statusDetail = chrome.i18n.getMessage('js_popup_error');
            statusIconClass = 'fa fa-exclamation-triangle header-icon-alignment';
			document.querySelectorAll('#header')[0].className = 'gray-bgn'

        } else {
            gsUtils.log('popup', 'Could not process tab status of: ' + status);
        }
        document.getElementById('statusDetail').innerHTML = statusDetail;
        document.getElementById('statusIcon').className = statusIconClass;
        if (status === 'unknown' || status === 'loading') {
            document.getElementById('statusIcon').classList.add('fa-spin');
        }

        document.getElementById('header').classList.remove('willSuspend');
        if (status === 'normal' || status === 'active') {
            document.getElementById('header').classList.add('willSuspend');
        }

        // Update action handler
        var actionEl = document.getElementsByTagName('a')[0];
        if (actionEl) {

            var tgsHanderFunc;
            if (status === 'suspended') {
                tgsHanderFunc = tgs.unsuspendHighlightedTab;

            } else if (status === 'whitelisted') {
                tgsHanderFunc = tgs.unwhitelistHighlightedTab;

            } else if (status === 'formInput' || status === 'tempWhitelist') {
                tgsHanderFunc = tgs.undoTemporarilyWhitelistHighlightedTab;
            }

            if (globalActionElListener) {
                actionEl.removeEventListener('click', globalActionElListener);
            }
            if (tgsHanderFunc) {
                globalActionElListener = function (e) {
                    tgsHanderFunc();
                    window.close();
                };
                actionEl.addEventListener('click', globalActionElListener);
            }
        }
    }

    function showPopupContents() {
        setTimeout(function () {
            document.getElementById('popupContent').style.opacity = 1;
        }, 200);
    }

    function addClickHandlers() {
        document.getElementById('suspendOne').addEventListener('click', function (e) {
            tgs.suspendHighlightedTab();
            window.close();
        });
        document.getElementById('suspendAll').addEventListener('click', function (e) {
            tgs.suspendAllTabs();
            window.close();
        });
        document.getElementById('unsuspendAll').addEventListener('click', function (e) {
            tgs.unsuspendAllTabs();
            window.close();
        });
        document.getElementById('suspendSelected').addEventListener('click', function (e) {
            tgs.suspendSelectedTabs();
            window.close();
        });
        document.getElementById('unsuspendSelected').addEventListener('click', function (e) {
            tgs.unsuspendSelectedTabs();
            window.close();
        });
        document.getElementById('whitelist').addEventListener('click', function (e) {
            tgs.whitelistHighlightedTab();
            window.close();
        });
        document.getElementById('tempWhitelist').addEventListener('click', function (e) {
            tgs.temporarilyWhitelistHighlightedTab();
            window.close();
        });
        document.getElementById('settingsLink').addEventListener('click', function (e) {
            chrome.tabs.create({
                url: chrome.extension.getURL('options.html')
            });
            window.close();
        });
    }
}());
