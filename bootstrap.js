
// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;


Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

// Globals
const core = {
	addon: {
		name: 'AwesomeBar Power Tip',
		id: 'AwesomeBar-Power-Tip@jetpack',
		path: {
			name: 'awesomebar-power-tip',
			content: 'chrome://awesomebar-power-tip/content/',
			images: 'chrome://awesomebar-power-tip/content/resources/images/',
			locale: 'chrome://awesomebar-power-tip/locale/',
			resources: 'chrome://awesomebar-power-tip/content/resources/',
			styles: 'chrome://awesomebar-power-tip/content/resources/styles/'
		}
	},
	os: {
		name: OS.Constants.Sys.Name.toLowerCase(),
		toolkit: Services.appinfo.widgetToolkit.toLowerCase(),
		xpcomabi: Services.appinfo.XPCOMABI
	},
	firefox: {
		pid: Services.appinfo.processID,
		version: Services.appinfo.version
	}
};

// Lazy Imports
const myServices = {};
XPCOMUtils.defineLazyGetter(myServices, 'hph', function () { return Cc['@mozilla.org/network/protocol;1?name=http'].getService(Ci.nsIHttpProtocolHandler); });
// XPCOMUtils.defineLazyGetter(myServices, 'sb', function () { return Services.strings.createBundle(core.addon.path.locale + 'bootstrap.properties?' + Math.random()); /* Randomize URI to work around bug 719376 */ });

function extendCore() {
	// adds some properties i use to core based on the current operating system, it needs a switch, thats why i couldnt put it into the core obj at top
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			core.os.version = parseFloat(Services.sysinfo.getProperty('version'));
			// http://en.wikipedia.org/wiki/List_of_Microsoft_Windows_versions
			if (core.os.version == 6.0) {
				core.os.version_name = 'vista';
			}
			if (core.os.version >= 6.1) {
				core.os.version_name = '7+';
			}
			if (core.os.version == 5.1 || core.os.version == 5.2) { // 5.2 is 64bit xp
				core.os.version_name = 'xp';
			}
			break;
			
		case 'darwin':
			var userAgent = myServices.hph.userAgent;

			var version_osx = userAgent.match(/Mac OS X 10\.([\d\.]+)/);

			
			if (!version_osx) {
				throw new Error('Could not identify Mac OS X version.');
			} else {
				var version_osx_str = version_osx[1];
				var ints_split = version_osx[1].split('.');
				if (ints_split.length == 1) {
					core.os.version = parseInt(ints_split[0]);
				} else if (ints_split.length >= 2) {
					core.os.version = ints_split[0] + '.' + ints_split[1];
					if (ints_split.length > 2) {
						core.os.version += ints_split.slice(2).join('');
					}
					core.os.version = parseFloat(core.os.version);
				}
				// this makes it so that 10.10.0 becomes 10.100
				// 10.10.1 => 10.101
				// so can compare numerically, as 10.100 is less then 10.101
				
				//core.os.version = 6.9; // note: debug: temporarily forcing mac to be 10.6 so we can test kqueue
			}
			break;
		default:
			// nothing special
	}
	

}

// START - Addon Functionalities

function showTip(aEvent) {
	var cDOMWindow = aEvent.view;
	var popup = cDOMWindow.document.getElementById('awesomebar-power-tip_panel');
	
	var cHidePop = function(aEvent) {
		//cDOMWindow.clearTimeout(timeoutHide);
		cDOMWindow.gURLBar.removeEventListener('blur', cHidePop, false);
		cDOMWindow.gURLBar.removeEventListener('keypress', cHidePop, false);
		popup.hidePopup();
	};
	popup.openPopup(cDOMWindow.gURLBar, 'after_start', 30, 0, false, false);
	
	//var timeoutHide = cDOMWindow.setTimeout(cHidePop, 6000);
	cDOMWindow.gURLBar.addEventListener('blur', cHidePop, false);
	cDOMWindow.gURLBar.addEventListener('keypress', cHidePop, false);
	
	var prefs = {};
	prefs['browser.urlbar.match.title'] = Services.prefs.getCharPref('browser.urlbar.match.title');
	prefs['browser.urlbar.match.url'] = Services.prefs.getCharPref('browser.urlbar.match.url');
	prefs['browser.urlbar.restrict.bookmark'] = Services.prefs.getCharPref('browser.urlbar.restrict.bookmark');
	prefs['browser.urlbar.restrict.history'] = Services.prefs.getCharPref('browser.urlbar.restrict.history');
	prefs['browser.urlbar.restrict.openpage'] = Services.prefs.getCharPref('browser.urlbar.restrict.openpage');
	prefs['browser.urlbar.restrict.searches'] = Services.prefs.getCharPref('browser.urlbar.restrict.searches');
	prefs['browser.urlbar.restrict.tag'] = Services.prefs.getCharPref('browser.urlbar.restrict.tag');
	prefs['browser.urlbar.restrict.typed'] = Services.prefs.getCharPref('browser.urlbar.restrict.typed');

	var iframe = popup.getElementsByTagName('iframe')[0];
	var iframeContentDocument = iframe.contentDocument;
	for (var p in prefs) {
		iframeContentDocument.querySelector('li[data-pref="' + p + '"]').querySelector('b').textContent = prefs[p];
	}

	var iframeWidth = iframe.boxObject.width;
	var iframeHeight = iframe.boxObject.height;
	
	var scrollMaxX = iframe.contentWindow.scrollMaxX;
	var scrollMaxY = iframe.contentWindow.scrollMaxY;
	
	if (scrollMaxY > 0) {
		iframeHeight += 20;

		iframe.style.width = (scrollMaxX + iframeWidth) + 'px';
		iframe.style.height = (scrollMaxY + iframeHeight) + 'px';
		
		popup.style.width = (scrollMaxX + iframeWidth + 40) + 'px';
		popup.style.height = (scrollMaxY + iframeHeight) + 'px';
	}
}
// END - Addon Functionalities
/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		var aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener('load', function () {
			aDOMWindow.removeEventListener('load', arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		
		// Load into any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			if (aDOMWindow.document.readyState == 'complete') { //on startup `aDOMWindow.document.readyState` is `uninitialized`
				windowListener.loadIntoWindow(aDOMWindow);
			} else {
				aDOMWindow.addEventListener('load', function () {
					aDOMWindow.removeEventListener('load', arguments.callee, false);
					windowListener.loadIntoWindow(aDOMWindow);
				}, false);
			}
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			windowListener.unloadFromWindow(aDOMWindow);
		}
		/*
		for (var u in unloaders) {
			unloaders[u]();
		}
		*/
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow) {
		if (!aDOMWindow) { return }
		
		if (aDOMWindow.gURLBar) {
			var myPanel = aDOMWindow.document.createElement('panel');
			var props = {
			    type: 'arrow',
			    noautofocus: true,
			    level: 'parent',
			    style: 'width:440px; height:205px;',
			    id: 'awesomebar-power-tip_panel'
			};
			for (var p in props) {
			    myPanel.setAttribute(p, props[p]);
			}
			
			var iframe = aDOMWindow.document.createElement('iframe');
			iframe.setAttribute('src', core.addon.path.resources + 'tip.xhtml');
			// iframe.setAttribute('flex', '1');
			/*
			iframe.addEventListener('DOMContentLoaded', function() {
				iframe.removeEventListener('DOMContentLoaded', arguments.callee, false);

			}, false);
			*/
			myPanel.appendChild(iframe);
			
			var mainPopupSet = aDOMWindow.document.getElementById('mainPopupSet');
			mainPopupSet.appendChild(myPanel);
			
			aDOMWindow.gURLBar.addEventListener('focus', showTip, false);
		}
	},
	unloadFromWindow: function (aDOMWindow) {
		if (!aDOMWindow) { return }
		
		if (aDOMWindow.gURLBar) {
			var tip = aDOMWindow.document.getElementById('awesomebar-power-tip_panel');
			tip.parentNode.removeChild(tip);
			
			aDOMWindow.gURLBar.removeEventListener('focus', showTip, false);
		}
	}
};
/*end - windowlistener*/

function install() {}
function uninstall() {}

function startup(aData, aReason) {
	// core.addon.aData = aData;
	extendCore();

	//windowlistener more
	windowListener.register();
	//end windowlistener more
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) { return }
	
	//windowlistener more
	windowListener.unregister();
	//end windowlistener more
}