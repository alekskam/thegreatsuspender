/*global chrome, historyItems */
(function () {
    'use strict';

    var gsSession = chrome.extension.getBackgroundPage().gsSession;
    var gsStorage = chrome.extension.getBackgroundPage().gsStorage;
    var gsUtils = chrome.extension.getBackgroundPage().gsUtils;
    var tgs = chrome.extension.getBackgroundPage().tgs;

    function reloadTabs(sessionId, windowId, suspendMode) {

        var windows = [],
            curUrl;

        gsStorage.fetchSessionById(sessionId).then(function (session) {

            if (!session || !session.windows) {
                return;
            }

            //if loading a specific window
            if (windowId) {
                windows.push(gsUtils.getWindowFromSession(windowId, session));

                //else load all windows from session
            } else {
                windows = session.windows;
            }

            windows.forEach(function (window) {

                chrome.windows.create(function (newWindow) {
                    chrome.tabs.query({windowId: newWindow.id}, function (tabs) {
                        var initialNewTab = tabs[0];

                        window.tabs.forEach(function (curTab) {
                            curUrl = curTab.url;

                            if (suspendMode && !gsUtils.isSuspendedTab(curTab) && !gsUtils.isSpecialTab(curTab)) {
                                curUrl = gsUtils.generateSuspendedUrl(curTab.url, curTab.title);
                            } else if (!suspendMode && gsUtils.isSuspendedTab(curTab)) {
                                curUrl = gsUtils.getSuspendedUrl(curTab.url);
                            }
                            chrome.tabs.create({
                                windowId: newWindow.id,
                                url: curUrl,
                                pinned: curTab.pinned,
                                active: false
                            });
                        });

                        //remove initial new tab created with the window
                        if (initialNewTab) {
                            chrome.tabs.remove(initialNewTab.id);
                        }
                    });
                });
            });

        });
    }

    function validateNewSessionName(sessionName, callback) {
        gsStorage.fetchSavedSessions().then(function (savedSessions) {
            var nameExists = savedSessions.some(function (savedSession, index) {
                return savedSession.name === sessionName;
            });
            if (nameExists) {
                var overwrite = window.confirm(chrome.i18n.getMessage('js_history_confirm_session_overwrite'));
                if (!overwrite) {
                    callback(false);
                    return;
                }
            }
            callback(true);
        });
    }

    function saveSession(sessionId) {

        gsStorage.fetchSessionById(sessionId).then(function (session) {
            var sessionName = window.prompt(chrome.i18n.getMessage('js_history_enter_name_for_session'));
            if (sessionName) {
                validateNewSessionName(sessionName, function (shouldSave) {
                    if (shouldSave) {
                        session.name = sessionName;
                        gsStorage.addToSavedSessions(session, function () {
                            window.location.reload();
                        });
                    }
                });
            }
        });
    }

    function deleteSession(sessionId) {

        var result = window.confirm(chrome.i18n.getMessage('js_history_confirm_delete'));
        if (result) {
            gsStorage.removeSessionFromHistory(sessionId, function () {
                window.location.reload();
            });
        }
    }

    function handleFileSelect(e) {
        var f = e.target.files[0];
        if (f) {
            var r = new FileReader();
            r.onload = function (e) {
                var contents = e.target.result;
                if (f.type !== 'text/plain') {
                    alert(chrome.i18n.getMessage('js_history_import_fail'));
                } else {
                    importSession(f.name, contents);
                }
            };
            r.readAsText(f);
        } else {
            alert(chrome.i18n.getMessage('js_history_import_fail'));
        }
    }

    function importSession(sessionName, textContents) {
        gsUtils.importSession(sessionName, textContents, function () {
            window.location.reload();
        });
    }

    function exportSession(sessionId) {
        gsUtils.exportSession(sessionId);
    }

    function removeTab(element, sessionId, windowId, tabId) {
        var sessionEl,
            newSessionEl;

        gsStorage.removeTabFromSessionHistory(sessionId, windowId, tabId, function (session) {
            //if we have a valid session returned
            if (session) {
                sessionEl = element.parentElement.parentElement;
                newSessionEl = createSessionElement(session);
                sessionEl.parentElement.replaceChild(newSessionEl, sessionEl);
                toggleSession(newSessionEl, session.sessionId);

                //otherwise assume it was the last tab in session and session has been removed
            } else {
                window.location.reload();
            }
        });
    }

    function toggleSession(element, sessionId) {
        var sessionContentsEl = element.getElementsByClassName('sessionContents')[0];
        var sessionIcon = element.getElementsByClassName('sessionIcon')[0];
        if (sessionIcon.classList.contains('fa-plus-square-o')) {
            sessionIcon.classList.remove('fa-plus-square-o');
            sessionIcon.classList.add('fa-minus-square-o');
        } else {
            sessionIcon.classList.remove('fa-minus-square-o');
            sessionIcon.classList.add('fa-plus-square-o');
        }

        //if toggled on already, then toggle off
        if (sessionContentsEl.childElementCount > 0) {
            sessionContentsEl.innerHTML = '';
            return;
        }

        gsStorage.fetchSessionById(sessionId).then(function (curSession) {

            if (!curSession || !curSession.windows) {
                return;
            }

            curSession.windows.forEach(function (curWindow, index) {
                curWindow.sessionId = curSession.sessionId;
                sessionContentsEl.appendChild(createWindowElement(curSession, curWindow, index));

                curWindow.tabs.forEach(function (curTab) {
                    curTab.windowId = curWindow.id;
                    curTab.sessionId = curSession.sessionId;
                    sessionContentsEl.appendChild(createTabElement(curSession, curWindow, curTab));
                });
            });
        });
    }

    function addClickListenerToElement(element, func) {
        if (element) {
            element.onclick = func;
        }
    }

    function createSessionElement(session) {
        var sessionEl = historyItems.createSessionHtml(session, true);

        addClickListenerToElement(sessionEl.getElementsByClassName('sessionIcon')[0], function () {
            toggleSession(sessionEl, session.sessionId);
        });
        addClickListenerToElement(sessionEl.getElementsByClassName('sessionLink')[0], function () {
            toggleSession(sessionEl, session.sessionId);
        });
        addClickListenerToElement(sessionEl.getElementsByClassName('exportLink')[0], function () {
            exportSession(session.sessionId);
        });
        addClickListenerToElement(sessionEl.getElementsByClassName('resuspendLink')[0], function () {
            reloadTabs(session.sessionId, null, true);
        });
        addClickListenerToElement(sessionEl.getElementsByClassName('reloadLink')[0], function () {
            reloadTabs(session.sessionId, null, false);
        });
        addClickListenerToElement(sessionEl.getElementsByClassName('saveLink')[0], function () {
            saveSession(session.sessionId);
        });
        addClickListenerToElement(sessionEl.getElementsByClassName('deleteLink')[0], function () {
            deleteSession(session.sessionId);
        });
        return sessionEl;
    }

    function createWindowElement(session, window, index) {
        var allowReload = session.sessionId !== gsSession.getSessionId();
        var windowEl = historyItems.createWindowHtml(window, index, allowReload);

        addClickListenerToElement(windowEl.getElementsByClassName('resuspendLink')[0], function () {
            reloadTabs(session.sessionId, window.id, true);
        });
        addClickListenerToElement(windowEl.getElementsByClassName('reloadLink')[0], function () {
            reloadTabs(session.sessionId, window.id, false);
        });
        return windowEl;
    }

    function createTabElement(session, window, tab) {
        var allowDelete = session.sessionId !== gsSession.getSessionId();
        var tabEl = historyItems.createTabHtml(tab, allowDelete);

        addClickListenerToElement(tabEl.getElementsByClassName('removeLink')[0], function () {
            removeTab(tabEl, session.sessionId, window.id, tab.id);
        });
        return tabEl;
    }

    function render() {

        var currentDiv = document.getElementById('currentSessions'),
            sessionsDiv = document.getElementById('recoverySessions'),
            historyDiv = document.getElementById('historySessions'),
            importSessionEl = document.getElementById('importSession'),
            importSessionActionEl = document.getElementById('importSessionAction'),
            firstSession = true;

        currentDiv.innerHTML = '';
        sessionsDiv.innerHTML = '';
        historyDiv.innerHTML = '';

        gsStorage.fetchCurrentSessions().then(function (currentSessions) {

            currentSessions.forEach(function (session, index) {
                var sessionEl = createSessionElement(session);
                if (firstSession) {
                    currentDiv.appendChild(sessionEl);
                    firstSession = false;
                } else {
                    sessionsDiv.appendChild(sessionEl);
                }
            });
        });

        gsStorage.fetchSavedSessions().then(function (savedSessions) {
            savedSessions.forEach(function (session, index) {
                var sessionEl = createSessionElement(session);
                historyDiv.appendChild(sessionEl);
            });
        });

        importSessionActionEl.addEventListener('change', handleFileSelect, false);
        importSessionEl.onclick = function () {
            importSessionActionEl.click();
        };

        //hide incompatible sidebar items if in incognito mode
        if (chrome.extension.inIncognitoContext) {
            Array.prototype.forEach.call(document.getElementsByClassName('noIncognito'), function (el) {
                el.style.display = 'none';
            });
        }
    }

    gsUtils.documentReadyAndLocalisedAsPromsied(document).then(function () {
        render();
    });

    tgs.getAnalyticsTracker().sendAppView('history.js');
}());
