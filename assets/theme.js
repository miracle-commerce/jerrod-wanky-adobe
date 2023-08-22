var SECTION_ID_ATTR$1 = 'data-section-id';

function Section(container, properties) {
  this.container = validateContainerElement(container);
  this.id = container.getAttribute(SECTION_ID_ATTR$1);
  this.extensions = [];

  // eslint-disable-next-line es5/no-es6-static-methods
  Object.assign(this, validatePropertiesObject(properties));

  this.onLoad();
}

Section.prototype = {
  onLoad: Function.prototype,
  onUnload: Function.prototype,
  onSelect: Function.prototype,
  onDeselect: Function.prototype,
  onBlockSelect: Function.prototype,
  onBlockDeselect: Function.prototype,

  extend: function extend(extension) {
    this.extensions.push(extension); // Save original extension

    // eslint-disable-next-line es5/no-es6-static-methods
    var extensionClone = Object.assign({}, extension);
    delete extensionClone.init; // Remove init function before assigning extension properties

    // eslint-disable-next-line es5/no-es6-static-methods
    Object.assign(this, extensionClone);

    if (typeof extension.init === 'function') {
      extension.init.apply(this);
    }
  }
};

function validateContainerElement(container) {
  if (!(container instanceof Element)) {
    throw new TypeError(
      'Theme Sections: Attempted to load section. The section container provided is not a DOM element.'
    );
  }
  if (container.getAttribute(SECTION_ID_ATTR$1) === null) {
    throw new Error(
      'Theme Sections: The section container provided does not have an id assigned to the ' +
        SECTION_ID_ATTR$1 +
        ' attribute.'
    );
  }

  return container;
}

function validatePropertiesObject(value) {
  if (
    (typeof value !== 'undefined' && typeof value !== 'object') ||
    value === null
  ) {
    throw new TypeError(
      'Theme Sections: The properties object provided is not a valid'
    );
  }

  return value;
}

// Object.assign() polyfill from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
if (typeof Object.assign != 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, 'assign', {
    value: function assign(target) {
      if (target == null) {
        // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) {
          // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}

/*
 * @shopify/theme-sections
 * -----------------------------------------------------------------------------
 *
 * A framework to provide structure to your Shopify sections and a load and unload
 * lifecycle. The lifecycle is automatically connected to theme editor events so
 * that your sections load and unload as the editor changes the content and
 * settings of your sections.
 */

var SECTION_TYPE_ATTR = 'data-section-type';
var SECTION_ID_ATTR = 'data-section-id';

window.Shopify = window.Shopify || {};
window.Shopify.theme = window.Shopify.theme || {};
window.Shopify.theme.sections = window.Shopify.theme.sections || {};

var registered = (window.Shopify.theme.sections.registered =
  window.Shopify.theme.sections.registered || {});
var instances = (window.Shopify.theme.sections.instances =
  window.Shopify.theme.sections.instances || []);

function register(type, properties) {
  if (typeof type !== 'string') {
    throw new TypeError(
      'Theme Sections: The first argument for .register must be a string that specifies the type of the section being registered'
    );
  }

  if (typeof registered[type] !== 'undefined') {
    throw new Error(
      'Theme Sections: A section of type "' +
        type +
        '" has already been registered. You cannot register the same section type twice'
    );
  }

  function TypedSection(container) {
    Section.call(this, container, properties);
  }

  TypedSection.constructor = Section;
  TypedSection.prototype = Object.create(Section.prototype);
  TypedSection.prototype.type = type;

  return (registered[type] = TypedSection);
}

function load(types, containers) {
  types = normalizeType(types);

  if (typeof containers === 'undefined') {
    containers = document.querySelectorAll('[' + SECTION_TYPE_ATTR + ']');
  }

  containers = normalizeContainers(containers);

  types.forEach(function(type) {
    var TypedSection = registered[type];

    if (typeof TypedSection === 'undefined') {
      return;
    }

    containers = containers.filter(function(container) {
      // Filter from list of containers because container already has an instance loaded
      if (isInstance(container)) {
        return false;
      }

      // Filter from list of containers because container doesn't have data-section-type attribute
      if (container.getAttribute(SECTION_TYPE_ATTR) === null) {
        return false;
      }

      // Keep in list of containers because current type doesn't match
      if (container.getAttribute(SECTION_TYPE_ATTR) !== type) {
        return true;
      }

      instances.push(new TypedSection(container));

      // Filter from list of containers because container now has an instance loaded
      return false;
    });
  });
}

function unload(selector) {
  var instancesToUnload = getInstances(selector);

  instancesToUnload.forEach(function(instance) {
    var index = instances
      .map(function(e) {
        return e.id;
      })
      .indexOf(instance.id);
    instances.splice(index, 1);
    instance.onUnload();
  });
}

function getInstances(selector) {
  var filteredInstances = [];

  // Fetch first element if its an array
  if (NodeList.prototype.isPrototypeOf(selector) || Array.isArray(selector)) {
    var firstElement = selector[0];
  }

  // If selector element is DOM element
  if (selector instanceof Element || firstElement instanceof Element) {
    var containers = normalizeContainers(selector);

    containers.forEach(function(container) {
      filteredInstances = filteredInstances.concat(
        instances.filter(function(instance) {
          return instance.container === container;
        })
      );
    });

    // If select is type string
  } else if (typeof selector === 'string' || typeof firstElement === 'string') {
    var types = normalizeType(selector);

    types.forEach(function(type) {
      filteredInstances = filteredInstances.concat(
        instances.filter(function(instance) {
          return instance.type === type;
        })
      );
    });
  }

  return filteredInstances;
}

function getInstanceById(id) {
  var instance;

  for (var i = 0; i < instances.length; i++) {
    if (instances[i].id === id) {
      instance = instances[i];
      break;
    }
  }
  return instance;
}

function isInstance(selector) {
  return getInstances(selector).length > 0;
}

function normalizeType(types) {
  // If '*' then fetch all registered section types
  if (types === '*') {
    types = Object.keys(registered);

    // If a single section type string is passed, put it in an array
  } else if (typeof types === 'string') {
    types = [types];

    // If single section constructor is passed, transform to array with section
    // type string
  } else if (types.constructor === Section) {
    types = [types.prototype.type];

    // If array of typed section constructors is passed, transform the array to
    // type strings
  } else if (Array.isArray(types) && types[0].constructor === Section) {
    types = types.map(function(TypedSection) {
      return TypedSection.prototype.type;
    });
  }

  types = types.map(function(type) {
    return type.toLowerCase();
  });

  return types;
}

function normalizeContainers(containers) {
  // Nodelist with entries
  if (NodeList.prototype.isPrototypeOf(containers) && containers.length > 0) {
    containers = Array.prototype.slice.call(containers);

    // Empty Nodelist
  } else if (
    NodeList.prototype.isPrototypeOf(containers) &&
    containers.length === 0
  ) {
    containers = [];

    // Handle null (document.querySelector() returns null with no match)
  } else if (containers === null) {
    containers = [];

    // Single DOM element
  } else if (!Array.isArray(containers) && containers instanceof Element) {
    containers = [containers];
  }

  return containers;
}

if (window.Shopify.designMode) {
  document.addEventListener('shopify:section:load', function(event) {
    var id = event.detail.sectionId;
    var container = event.target.querySelector(
      '[' + SECTION_ID_ATTR + '="' + id + '"]'
    );

    if (container !== null) {
      load(container.getAttribute(SECTION_TYPE_ATTR), container);
    }
  });

  document.addEventListener('shopify:section:unload', function(event) {
    var id = event.detail.sectionId;
    var container = event.target.querySelector(
      '[' + SECTION_ID_ATTR + '="' + id + '"]'
    );
    var instance = getInstances(container)[0];

    if (typeof instance === 'object') {
      unload(container);
    }
  });

  document.addEventListener('shopify:section:select', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onSelect(event);
    }
  });

  document.addEventListener('shopify:section:deselect', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onDeselect(event);
    }
  });

  document.addEventListener('shopify:block:select', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onBlockSelect(event);
    }
  });

  document.addEventListener('shopify:block:deselect', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onBlockDeselect(event);
    }
  });
}

function n$1(n,t){return void 0===t&&(t=document),t.querySelector(n)}function t$3(n,t){return void 0===t&&(t=document),[].slice.call(t.querySelectorAll(n))}function c$1(n,t){return Array.isArray(n)?n.forEach(t):t(n)}function r$3(n){return function(t,r,e){return c$1(t,function(t){return t[n+"EventListener"](r,e)})}}function e$2(n,t,c){return r$3("add")(n,t,c),function(){return r$3("remove")(n,t,c)}}function o$1(n){return function(t){var r=arguments;return c$1(t,function(t){var c;return (c=t.classList)[n].apply(c,[].slice.call(r,1))})}}function u(n){o$1("add").apply(void 0,[n].concat([].slice.call(arguments,1)));}function i(n){o$1("remove").apply(void 0,[n].concat([].slice.call(arguments,1)));}function l(n){o$1("toggle").apply(void 0,[n].concat([].slice.call(arguments,1)));}function a$1(n,t){return n.classList.contains(t)}

var commonjsGlobal$1 = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

(function (module, exports) {
(function (global, factory) {
  factory() ;
}(commonjsGlobal$1, (function () {
  /**
   * Applies the :focus-visible polyfill at the given scope.
   * A scope in this case is either the top-level Document or a Shadow Root.
   *
   * @param {(Document|ShadowRoot)} scope
   * @see https://github.com/WICG/focus-visible
   */
  function applyFocusVisiblePolyfill(scope) {
    var hadKeyboardEvent = true;
    var hadFocusVisibleRecently = false;
    var hadFocusVisibleRecentlyTimeout = null;

    var inputTypesAllowlist = {
      text: true,
      search: true,
      url: true,
      tel: true,
      email: true,
      password: true,
      number: true,
      date: true,
      month: true,
      week: true,
      time: true,
      datetime: true,
      'datetime-local': true
    };

    /**
     * Helper function for legacy browsers and iframes which sometimes focus
     * elements like document, body, and non-interactive SVG.
     * @param {Element} el
     */
    function isValidFocusTarget(el) {
      if (
        el &&
        el !== document &&
        el.nodeName !== 'HTML' &&
        el.nodeName !== 'BODY' &&
        'classList' in el &&
        'contains' in el.classList
      ) {
        return true;
      }
      return false;
    }

    /**
     * Computes whether the given element should automatically trigger the
     * `focus-visible` class being added, i.e. whether it should always match
     * `:focus-visible` when focused.
     * @param {Element} el
     * @return {boolean}
     */
    function focusTriggersKeyboardModality(el) {
      var type = el.type;
      var tagName = el.tagName;

      if (tagName === 'INPUT' && inputTypesAllowlist[type] && !el.readOnly) {
        return true;
      }

      if (tagName === 'TEXTAREA' && !el.readOnly) {
        return true;
      }

      if (el.isContentEditable) {
        return true;
      }

      return false;
    }

    /**
     * Add the `focus-visible` class to the given element if it was not added by
     * the author.
     * @param {Element} el
     */
    function addFocusVisibleClass(el) {
      if (el.classList.contains('focus-visible')) {
        return;
      }
      el.classList.add('focus-visible');
      el.setAttribute('data-focus-visible-added', '');
    }

    /**
     * Remove the `focus-visible` class from the given element if it was not
     * originally added by the author.
     * @param {Element} el
     */
    function removeFocusVisibleClass(el) {
      if (!el.hasAttribute('data-focus-visible-added')) {
        return;
      }
      el.classList.remove('focus-visible');
      el.removeAttribute('data-focus-visible-added');
    }

    /**
     * If the most recent user interaction was via the keyboard;
     * and the key press did not include a meta, alt/option, or control key;
     * then the modality is keyboard. Otherwise, the modality is not keyboard.
     * Apply `focus-visible` to any current active element and keep track
     * of our keyboard modality state with `hadKeyboardEvent`.
     * @param {KeyboardEvent} e
     */
    function onKeyDown(e) {
      if (e.metaKey || e.altKey || e.ctrlKey) {
        return;
      }

      if (isValidFocusTarget(scope.activeElement)) {
        addFocusVisibleClass(scope.activeElement);
      }

      hadKeyboardEvent = true;
    }

    /**
     * If at any point a user clicks with a pointing device, ensure that we change
     * the modality away from keyboard.
     * This avoids the situation where a user presses a key on an already focused
     * element, and then clicks on a different element, focusing it with a
     * pointing device, while we still think we're in keyboard modality.
     * @param {Event} e
     */
    function onPointerDown(e) {
      hadKeyboardEvent = false;
    }

    /**
     * On `focus`, add the `focus-visible` class to the target if:
     * - the target received focus as a result of keyboard navigation, or
     * - the event target is an element that will likely require interaction
     *   via the keyboard (e.g. a text box)
     * @param {Event} e
     */
    function onFocus(e) {
      // Prevent IE from focusing the document or HTML element.
      if (!isValidFocusTarget(e.target)) {
        return;
      }

      if (hadKeyboardEvent || focusTriggersKeyboardModality(e.target)) {
        addFocusVisibleClass(e.target);
      }
    }

    /**
     * On `blur`, remove the `focus-visible` class from the target.
     * @param {Event} e
     */
    function onBlur(e) {
      if (!isValidFocusTarget(e.target)) {
        return;
      }

      if (
        e.target.classList.contains('focus-visible') ||
        e.target.hasAttribute('data-focus-visible-added')
      ) {
        // To detect a tab/window switch, we look for a blur event followed
        // rapidly by a visibility change.
        // If we don't see a visibility change within 100ms, it's probably a
        // regular focus change.
        hadFocusVisibleRecently = true;
        window.clearTimeout(hadFocusVisibleRecentlyTimeout);
        hadFocusVisibleRecentlyTimeout = window.setTimeout(function() {
          hadFocusVisibleRecently = false;
        }, 100);
        removeFocusVisibleClass(e.target);
      }
    }

    /**
     * If the user changes tabs, keep track of whether or not the previously
     * focused element had .focus-visible.
     * @param {Event} e
     */
    function onVisibilityChange(e) {
      if (document.visibilityState === 'hidden') {
        // If the tab becomes active again, the browser will handle calling focus
        // on the element (Safari actually calls it twice).
        // If this tab change caused a blur on an element with focus-visible,
        // re-apply the class when the user switches back to the tab.
        if (hadFocusVisibleRecently) {
          hadKeyboardEvent = true;
        }
        addInitialPointerMoveListeners();
      }
    }

    /**
     * Add a group of listeners to detect usage of any pointing devices.
     * These listeners will be added when the polyfill first loads, and anytime
     * the window is blurred, so that they are active when the window regains
     * focus.
     */
    function addInitialPointerMoveListeners() {
      document.addEventListener('mousemove', onInitialPointerMove);
      document.addEventListener('mousedown', onInitialPointerMove);
      document.addEventListener('mouseup', onInitialPointerMove);
      document.addEventListener('pointermove', onInitialPointerMove);
      document.addEventListener('pointerdown', onInitialPointerMove);
      document.addEventListener('pointerup', onInitialPointerMove);
      document.addEventListener('touchmove', onInitialPointerMove);
      document.addEventListener('touchstart', onInitialPointerMove);
      document.addEventListener('touchend', onInitialPointerMove);
    }

    function removeInitialPointerMoveListeners() {
      document.removeEventListener('mousemove', onInitialPointerMove);
      document.removeEventListener('mousedown', onInitialPointerMove);
      document.removeEventListener('mouseup', onInitialPointerMove);
      document.removeEventListener('pointermove', onInitialPointerMove);
      document.removeEventListener('pointerdown', onInitialPointerMove);
      document.removeEventListener('pointerup', onInitialPointerMove);
      document.removeEventListener('touchmove', onInitialPointerMove);
      document.removeEventListener('touchstart', onInitialPointerMove);
      document.removeEventListener('touchend', onInitialPointerMove);
    }

    /**
     * When the polfyill first loads, assume the user is in keyboard modality.
     * If any event is received from a pointing device (e.g. mouse, pointer,
     * touch), turn off keyboard modality.
     * This accounts for situations where focus enters the page from the URL bar.
     * @param {Event} e
     */
    function onInitialPointerMove(e) {
      // Work around a Safari quirk that fires a mousemove on <html> whenever the
      // window blurs, even if you're tabbing out of the page. ¯\_(ツ)_/¯
      if (e.target.nodeName && e.target.nodeName.toLowerCase() === 'html') {
        return;
      }

      hadKeyboardEvent = false;
      removeInitialPointerMoveListeners();
    }

    // For some kinds of state, we are interested in changes at the global scope
    // only. For example, global pointer input, global key presses and global
    // visibility change should affect the state at every scope:
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('touchstart', onPointerDown, true);
    document.addEventListener('visibilitychange', onVisibilityChange, true);

    addInitialPointerMoveListeners();

    // For focus and blur, we specifically care about state changes in the local
    // scope. This is because focus / blur events that originate from within a
    // shadow root are not re-dispatched from the host element if it was already
    // the active element in its own scope:
    scope.addEventListener('focus', onFocus, true);
    scope.addEventListener('blur', onBlur, true);

    // We detect that a node is a ShadowRoot by ensuring that it is a
    // DocumentFragment and also has a host property. This check covers native
    // implementation and polyfill implementation transparently. If we only cared
    // about the native implementation, we could just check if the scope was
    // an instance of a ShadowRoot.
    if (scope.nodeType === Node.DOCUMENT_FRAGMENT_NODE && scope.host) {
      // Since a ShadowRoot is a special kind of DocumentFragment, it does not
      // have a root element to add a class to. So, we add this attribute to the
      // host element instead:
      scope.host.setAttribute('data-js-focus-visible', '');
    } else if (scope.nodeType === Node.DOCUMENT_NODE) {
      document.documentElement.classList.add('js-focus-visible');
      document.documentElement.setAttribute('data-js-focus-visible', '');
    }
  }

  // It is important to wrap all references to global window and document in
  // these checks to support server-side rendering use cases
  // @see https://github.com/WICG/focus-visible/issues/199
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Make the polyfill helper globally available. This can be used as a signal
    // to interested libraries that wish to coordinate with the polyfill for e.g.,
    // applying the polyfill to a shadow root:
    window.applyFocusVisiblePolyfill = applyFocusVisiblePolyfill;

    // Notify interested libraries of the polyfill's presence, in case the
    // polyfill was loaded lazily:
    var event;

    try {
      event = new CustomEvent('focus-visible-polyfill-ready');
    } catch (error) {
      // IE11 does not support using CustomEvent as a constructor directly:
      event = document.createEvent('CustomEvent');
      event.initCustomEvent('focus-visible-polyfill-ready', false, false, {});
    }

    window.dispatchEvent(event);
  }

  if (typeof document !== 'undefined') {
    // Apply the polyfill to the global document, so that no JavaScript
    // coordination is required to use the polyfill in the top-level document:
    applyFocusVisiblePolyfill(document);
  }

})));
}());

var whatInput = {exports: {}};

/**
 * what-input - A global utility for tracking the current input method (mouse, keyboard or touch).
 * @version v5.2.12
 * @link https://github.com/ten1seven/what-input
 * @license MIT
 */

(function (module, exports) {
(function webpackUniversalModuleDefinition(root, factory) {
	module.exports = factory();
})(commonjsGlobal$1, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

	module.exports = function () {
	  /*
	   * bail out if there is no document or window
	   * (i.e. in a node/non-DOM environment)
	   *
	   * Return a stubbed API instead
	   */
	  if (typeof document === 'undefined' || typeof window === 'undefined') {
	    return {
	      // always return "initial" because no interaction will ever be detected
	      ask: function ask() {
	        return 'initial';
	      },

	      // always return null
	      element: function element() {
	        return null;
	      },

	      // no-op
	      ignoreKeys: function ignoreKeys() {},

	      // no-op
	      specificKeys: function specificKeys() {},

	      // no-op
	      registerOnChange: function registerOnChange() {},

	      // no-op
	      unRegisterOnChange: function unRegisterOnChange() {}
	    };
	  }

	  /*
	   * variables
	   */

	  // cache document.documentElement
	  var docElem = document.documentElement;

	  // currently focused dom element
	  var currentElement = null;

	  // last used input type
	  var currentInput = 'initial';

	  // last used input intent
	  var currentIntent = currentInput;

	  // UNIX timestamp of current event
	  var currentTimestamp = Date.now();

	  // check for a `data-whatpersist` attribute on either the `html` or `body` elements, defaults to `true`
	  var shouldPersist = false;

	  // form input types
	  var formInputs = ['button', 'input', 'select', 'textarea'];

	  // empty array for holding callback functions
	  var functionList = [];

	  // list of modifier keys commonly used with the mouse and
	  // can be safely ignored to prevent false keyboard detection
	  var ignoreMap = [16, // shift
	  17, // control
	  18, // alt
	  91, // Windows key / left Apple cmd
	  93 // Windows menu / right Apple cmd
	  ];

	  var specificMap = [];

	  // mapping of events to input types
	  var inputMap = {
	    keydown: 'keyboard',
	    keyup: 'keyboard',
	    mousedown: 'mouse',
	    mousemove: 'mouse',
	    MSPointerDown: 'pointer',
	    MSPointerMove: 'pointer',
	    pointerdown: 'pointer',
	    pointermove: 'pointer',
	    touchstart: 'touch',
	    touchend: 'touch'

	    // boolean: true if the page is being scrolled
	  };var isScrolling = false;

	  // store current mouse position
	  var mousePos = {
	    x: null,
	    y: null

	    // map of IE 10 pointer events
	  };var pointerMap = {
	    2: 'touch',
	    3: 'touch', // treat pen like touch
	    4: 'mouse'

	    // check support for passive event listeners
	  };var supportsPassive = false;

	  try {
	    var opts = Object.defineProperty({}, 'passive', {
	      get: function get() {
	        supportsPassive = true;
	      }
	    });

	    window.addEventListener('test', null, opts);
	  } catch (e) {}
	  // fail silently


	  /*
	   * set up
	   */

	  var setUp = function setUp() {
	    // add correct mouse wheel event mapping to `inputMap`
	    inputMap[detectWheel()] = 'mouse';

	    addListeners();
	  };

	  /*
	   * events
	   */

	  var addListeners = function addListeners() {
	    // `pointermove`, `MSPointerMove`, `mousemove` and mouse wheel event binding
	    // can only demonstrate potential, but not actual, interaction
	    // and are treated separately
	    var options = supportsPassive ? { passive: true, capture: true } : true;

	    document.addEventListener('DOMContentLoaded', setPersist, true);

	    // pointer events (mouse, pen, touch)
	    if (window.PointerEvent) {
	      window.addEventListener('pointerdown', setInput, true);
	      window.addEventListener('pointermove', setIntent, true);
	    } else if (window.MSPointerEvent) {
	      window.addEventListener('MSPointerDown', setInput, true);
	      window.addEventListener('MSPointerMove', setIntent, true);
	    } else {
	      // mouse events
	      window.addEventListener('mousedown', setInput, true);
	      window.addEventListener('mousemove', setIntent, true);

	      // touch events
	      if ('ontouchstart' in window) {
	        window.addEventListener('touchstart', setInput, options);
	        window.addEventListener('touchend', setInput, true);
	      }
	    }

	    // mouse wheel
	    window.addEventListener(detectWheel(), setIntent, options);

	    // keyboard events
	    window.addEventListener('keydown', setInput, true);
	    window.addEventListener('keyup', setInput, true);

	    // focus events
	    window.addEventListener('focusin', setElement, true);
	    window.addEventListener('focusout', clearElement, true);
	  };

	  // checks if input persistence should happen and
	  // get saved state from session storage if true (defaults to `false`)
	  var setPersist = function setPersist() {
	    shouldPersist = !(docElem.getAttribute('data-whatpersist') === 'false' || document.body.getAttribute('data-whatpersist') === 'false');

	    if (shouldPersist) {
	      // check for session variables and use if available
	      try {
	        if (window.sessionStorage.getItem('what-input')) {
	          currentInput = window.sessionStorage.getItem('what-input');
	        }

	        if (window.sessionStorage.getItem('what-intent')) {
	          currentIntent = window.sessionStorage.getItem('what-intent');
	        }
	      } catch (e) {
	        // fail silently
	      }
	    }

	    // always run these so at least `initial` state is set
	    doUpdate('input');
	    doUpdate('intent');
	  };

	  // checks conditions before updating new input
	  var setInput = function setInput(event) {
	    var eventKey = event.which;
	    var value = inputMap[event.type];

	    if (value === 'pointer') {
	      value = pointerType(event);
	    }

	    var ignoreMatch = !specificMap.length && ignoreMap.indexOf(eventKey) === -1;

	    var specificMatch = specificMap.length && specificMap.indexOf(eventKey) !== -1;

	    var shouldUpdate = value === 'keyboard' && eventKey && (ignoreMatch || specificMatch) || value === 'mouse' || value === 'touch';

	    // prevent touch detection from being overridden by event execution order
	    if (validateTouch(value)) {
	      shouldUpdate = false;
	    }

	    if (shouldUpdate && currentInput !== value) {
	      currentInput = value;

	      persistInput('input', currentInput);
	      doUpdate('input');
	    }

	    if (shouldUpdate && currentIntent !== value) {
	      // preserve intent for keyboard interaction with form fields
	      var activeElem = document.activeElement;
	      var notFormInput = activeElem && activeElem.nodeName && (formInputs.indexOf(activeElem.nodeName.toLowerCase()) === -1 || activeElem.nodeName.toLowerCase() === 'button' && !checkClosest(activeElem, 'form'));

	      if (notFormInput) {
	        currentIntent = value;

	        persistInput('intent', currentIntent);
	        doUpdate('intent');
	      }
	    }
	  };

	  // updates the doc and `inputTypes` array with new input
	  var doUpdate = function doUpdate(which) {
	    docElem.setAttribute('data-what' + which, which === 'input' ? currentInput : currentIntent);

	    fireFunctions(which);
	  };

	  // updates input intent for `mousemove` and `pointermove`
	  var setIntent = function setIntent(event) {
	    var value = inputMap[event.type];

	    if (value === 'pointer') {
	      value = pointerType(event);
	    }

	    // test to see if `mousemove` happened relative to the screen to detect scrolling versus mousemove
	    detectScrolling(event);

	    // only execute if scrolling isn't happening
	    if ((!isScrolling && !validateTouch(value) || isScrolling && event.type === 'wheel' || event.type === 'mousewheel' || event.type === 'DOMMouseScroll') && currentIntent !== value) {
	      currentIntent = value;

	      persistInput('intent', currentIntent);
	      doUpdate('intent');
	    }
	  };

	  var setElement = function setElement(event) {
	    if (!event.target.nodeName) {
	      // If nodeName is undefined, clear the element
	      // This can happen if click inside an <svg> element.
	      clearElement();
	      return;
	    }

	    currentElement = event.target.nodeName.toLowerCase();
	    docElem.setAttribute('data-whatelement', currentElement);

	    if (event.target.classList && event.target.classList.length) {
	      docElem.setAttribute('data-whatclasses', event.target.classList.toString().replace(' ', ','));
	    }
	  };

	  var clearElement = function clearElement() {
	    currentElement = null;

	    docElem.removeAttribute('data-whatelement');
	    docElem.removeAttribute('data-whatclasses');
	  };

	  var persistInput = function persistInput(which, value) {
	    if (shouldPersist) {
	      try {
	        window.sessionStorage.setItem('what-' + which, value);
	      } catch (e) {
	        // fail silently
	      }
	    }
	  };

	  /*
	   * utilities
	   */

	  var pointerType = function pointerType(event) {
	    if (typeof event.pointerType === 'number') {
	      return pointerMap[event.pointerType];
	    } else {
	      // treat pen like touch
	      return event.pointerType === 'pen' ? 'touch' : event.pointerType;
	    }
	  };

	  // prevent touch detection from being overridden by event execution order
	  var validateTouch = function validateTouch(value) {
	    var timestamp = Date.now();

	    var touchIsValid = value === 'mouse' && currentInput === 'touch' && timestamp - currentTimestamp < 200;

	    currentTimestamp = timestamp;

	    return touchIsValid;
	  };

	  // detect version of mouse wheel event to use
	  // via https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event
	  var detectWheel = function detectWheel() {
	    var wheelType = null;

	    // Modern browsers support "wheel"
	    if ('onwheel' in document.createElement('div')) {
	      wheelType = 'wheel';
	    } else {
	      // Webkit and IE support at least "mousewheel"
	      // or assume that remaining browsers are older Firefox
	      wheelType = document.onmousewheel !== undefined ? 'mousewheel' : 'DOMMouseScroll';
	    }

	    return wheelType;
	  };

	  // runs callback functions
	  var fireFunctions = function fireFunctions(type) {
	    for (var i = 0, len = functionList.length; i < len; i++) {
	      if (functionList[i].type === type) {
	        functionList[i].fn.call(undefined, type === 'input' ? currentInput : currentIntent);
	      }
	    }
	  };

	  // finds matching element in an object
	  var objPos = function objPos(match) {
	    for (var i = 0, len = functionList.length; i < len; i++) {
	      if (functionList[i].fn === match) {
	        return i;
	      }
	    }
	  };

	  var detectScrolling = function detectScrolling(event) {
	    if (mousePos.x !== event.screenX || mousePos.y !== event.screenY) {
	      isScrolling = false;

	      mousePos.x = event.screenX;
	      mousePos.y = event.screenY;
	    } else {
	      isScrolling = true;
	    }
	  };

	  // manual version of `closest()`
	  var checkClosest = function checkClosest(elem, tag) {
	    var ElementPrototype = window.Element.prototype;

	    if (!ElementPrototype.matches) {
	      ElementPrototype.matches = ElementPrototype.msMatchesSelector || ElementPrototype.webkitMatchesSelector;
	    }

	    if (!ElementPrototype.closest) {
	      do {
	        if (elem.matches(tag)) {
	          return elem;
	        }

	        elem = elem.parentElement || elem.parentNode;
	      } while (elem !== null && elem.nodeType === 1);

	      return null;
	    } else {
	      return elem.closest(tag);
	    }
	  };

	  /*
	   * init
	   */

	  // don't start script unless browser cuts the mustard
	  // (also passes if polyfills are used)
	  if ('addEventListener' in window && Array.prototype.indexOf) {
	    setUp();
	  }

	  /*
	   * api
	   */

	  return {
	    // returns string: the current input type
	    // opt: 'intent'|'input'
	    // 'input' (default): returns the same value as the `data-whatinput` attribute
	    // 'intent': includes `data-whatintent` value if it's different than `data-whatinput`
	    ask: function ask(opt) {
	      return opt === 'intent' ? currentIntent : currentInput;
	    },

	    // returns string: the currently focused element or null
	    element: function element() {
	      return currentElement;
	    },

	    // overwrites ignored keys with provided array
	    ignoreKeys: function ignoreKeys(arr) {
	      ignoreMap = arr;
	    },

	    // overwrites specific char keys to update on
	    specificKeys: function specificKeys(arr) {
	      specificMap = arr;
	    },

	    // attach functions to input and intent "events"
	    // funct: function to fire on change
	    // eventType: 'input'|'intent'
	    registerOnChange: function registerOnChange(fn, eventType) {
	      functionList.push({
	        fn: fn,
	        type: eventType || 'input'
	      });
	    },

	    unRegisterOnChange: function unRegisterOnChange(fn) {
	      var position = objPos(fn);

	      if (position || position === 0) {
	        functionList.splice(position, 1);
	      }
	    },

	    clearStorage: function clearStorage() {
	      window.sessionStorage.clear();
	    }
	  };
	}();

/***/ })
/******/ ])
});
}(whatInput));

var browser$1 = {exports: {}};

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

/**
 * DOM event delegator
 *
 * The delegator will listen
 * for events that bubble up
 * to the root node.
 *
 * @constructor
 * @param {Node|string} [root] The root node or a selector string matching the root node
 */
function Delegate(root) {
  /**
   * Maintain a map of listener
   * lists, keyed by event name.
   *
   * @type Object
   */
  this.listenerMap = [{}, {}];

  if (root) {
    this.root(root);
  }
  /** @type function() */


  this.handle = Delegate.prototype.handle.bind(this); // Cache of event listeners removed during an event cycle

  this._removedListeners = [];
}
/**
 * Start listening for events
 * on the provided DOM element
 *
 * @param  {Node|string} [root] The root node or a selector string matching the root node
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.root = function (root) {
  var listenerMap = this.listenerMap;
  var eventType; // Remove master event listeners

  if (this.rootElement) {
    for (eventType in listenerMap[1]) {
      if (listenerMap[1].hasOwnProperty(eventType)) {
        this.rootElement.removeEventListener(eventType, this.handle, true);
      }
    }

    for (eventType in listenerMap[0]) {
      if (listenerMap[0].hasOwnProperty(eventType)) {
        this.rootElement.removeEventListener(eventType, this.handle, false);
      }
    }
  } // If no root or root is not
  // a dom node, then remove internal
  // root reference and exit here


  if (!root || !root.addEventListener) {
    if (this.rootElement) {
      delete this.rootElement;
    }

    return this;
  }
  /**
   * The root node at which
   * listeners are attached.
   *
   * @type Node
   */


  this.rootElement = root; // Set up master event listeners

  for (eventType in listenerMap[1]) {
    if (listenerMap[1].hasOwnProperty(eventType)) {
      this.rootElement.addEventListener(eventType, this.handle, true);
    }
  }

  for (eventType in listenerMap[0]) {
    if (listenerMap[0].hasOwnProperty(eventType)) {
      this.rootElement.addEventListener(eventType, this.handle, false);
    }
  }

  return this;
};
/**
 * @param {string} eventType
 * @returns boolean
 */


Delegate.prototype.captureForType = function (eventType) {
  return ['blur', 'error', 'focus', 'load', 'resize', 'scroll'].indexOf(eventType) !== -1;
};
/**
 * Attach a handler to one
 * event for all elements
 * that match the selector,
 * now or in the future
 *
 * The handler function receives
 * three arguments: the DOM event
 * object, the node that matched
 * the selector while the event
 * was bubbling and a reference
 * to itself. Within the handler,
 * 'this' is equal to the second
 * argument.
 *
 * The node that actually received
 * the event can be accessed via
 * 'event.target'.
 *
 * @param {string} eventType Listen for these events
 * @param {string|undefined} selector Only handle events on elements matching this selector, if undefined match root element
 * @param {function()} handler Handler function - event data passed here will be in event.data
 * @param {boolean} [useCapture] see 'useCapture' in <https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener>
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.on = function (eventType, selector, handler, useCapture) {
  var root;
  var listenerMap;
  var matcher;
  var matcherParam;

  if (!eventType) {
    throw new TypeError('Invalid event type: ' + eventType);
  } // handler can be passed as
  // the second or third argument


  if (typeof selector === 'function') {
    useCapture = handler;
    handler = selector;
    selector = null;
  } // Fallback to sensible defaults
  // if useCapture not set


  if (useCapture === undefined) {
    useCapture = this.captureForType(eventType);
  }

  if (typeof handler !== 'function') {
    throw new TypeError('Handler must be a type of Function');
  }

  root = this.rootElement;
  listenerMap = this.listenerMap[useCapture ? 1 : 0]; // Add master handler for type if not created yet

  if (!listenerMap[eventType]) {
    if (root) {
      root.addEventListener(eventType, this.handle, useCapture);
    }

    listenerMap[eventType] = [];
  }

  if (!selector) {
    matcherParam = null; // COMPLEX - matchesRoot needs to have access to
    // this.rootElement, so bind the function to this.

    matcher = matchesRoot.bind(this); // Compile a matcher for the given selector
  } else if (/^[a-z]+$/i.test(selector)) {
    matcherParam = selector;
    matcher = matchesTag;
  } else if (/^#[a-z0-9\-_]+$/i.test(selector)) {
    matcherParam = selector.slice(1);
    matcher = matchesId;
  } else {
    matcherParam = selector;
    matcher = Element.prototype.matches;
  } // Add to the list of listeners


  listenerMap[eventType].push({
    selector: selector,
    handler: handler,
    matcher: matcher,
    matcherParam: matcherParam
  });
  return this;
};
/**
 * Remove an event handler
 * for elements that match
 * the selector, forever
 *
 * @param {string} [eventType] Remove handlers for events matching this type, considering the other parameters
 * @param {string} [selector] If this parameter is omitted, only handlers which match the other two will be removed
 * @param {function()} [handler] If this parameter is omitted, only handlers which match the previous two will be removed
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.off = function (eventType, selector, handler, useCapture) {
  var i;
  var listener;
  var listenerMap;
  var listenerList;
  var singleEventType; // Handler can be passed as
  // the second or third argument

  if (typeof selector === 'function') {
    useCapture = handler;
    handler = selector;
    selector = null;
  } // If useCapture not set, remove
  // all event listeners


  if (useCapture === undefined) {
    this.off(eventType, selector, handler, true);
    this.off(eventType, selector, handler, false);
    return this;
  }

  listenerMap = this.listenerMap[useCapture ? 1 : 0];

  if (!eventType) {
    for (singleEventType in listenerMap) {
      if (listenerMap.hasOwnProperty(singleEventType)) {
        this.off(singleEventType, selector, handler);
      }
    }

    return this;
  }

  listenerList = listenerMap[eventType];

  if (!listenerList || !listenerList.length) {
    return this;
  } // Remove only parameter matches
  // if specified


  for (i = listenerList.length - 1; i >= 0; i--) {
    listener = listenerList[i];

    if ((!selector || selector === listener.selector) && (!handler || handler === listener.handler)) {
      this._removedListeners.push(listener);

      listenerList.splice(i, 1);
    }
  } // All listeners removed


  if (!listenerList.length) {
    delete listenerMap[eventType]; // Remove the main handler

    if (this.rootElement) {
      this.rootElement.removeEventListener(eventType, this.handle, useCapture);
    }
  }

  return this;
};
/**
 * Handle an arbitrary event.
 *
 * @param {Event} event
 */


Delegate.prototype.handle = function (event) {
  var i;
  var l;
  var type = event.type;
  var root;
  var phase;
  var listener;
  var returned;
  var listenerList = [];
  var target;
  var eventIgnore = 'ftLabsDelegateIgnore';

  if (event[eventIgnore] === true) {
    return;
  }

  target = event.target; // Hardcode value of Node.TEXT_NODE
  // as not defined in IE8

  if (target.nodeType === 3) {
    target = target.parentNode;
  } // Handle SVG <use> elements in IE


  if (target.correspondingUseElement) {
    target = target.correspondingUseElement;
  }

  root = this.rootElement;
  phase = event.eventPhase || (event.target !== event.currentTarget ? 3 : 2); // eslint-disable-next-line default-case

  switch (phase) {
    case 1:
      //Event.CAPTURING_PHASE:
      listenerList = this.listenerMap[1][type];
      break;

    case 2:
      //Event.AT_TARGET:
      if (this.listenerMap[0] && this.listenerMap[0][type]) {
        listenerList = listenerList.concat(this.listenerMap[0][type]);
      }

      if (this.listenerMap[1] && this.listenerMap[1][type]) {
        listenerList = listenerList.concat(this.listenerMap[1][type]);
      }

      break;

    case 3:
      //Event.BUBBLING_PHASE:
      listenerList = this.listenerMap[0][type];
      break;
  }

  var toFire = []; // Need to continuously check
  // that the specific list is
  // still populated in case one
  // of the callbacks actually
  // causes the list to be destroyed.

  l = listenerList.length;

  while (target && l) {
    for (i = 0; i < l; i++) {
      listener = listenerList[i]; // Bail from this loop if
      // the length changed and
      // no more listeners are
      // defined between i and l.

      if (!listener) {
        break;
      }

      if (target.tagName && ["button", "input", "select", "textarea"].indexOf(target.tagName.toLowerCase()) > -1 && target.hasAttribute("disabled")) {
        // Remove things that have previously fired
        toFire = [];
      } // Check for match and fire
      // the event if there's one
      //
      // TODO:MCG:20120117: Need a way
      // to check if event#stopImmediatePropagation
      // was called. If so, break both loops.
      else if (listener.matcher.call(target, listener.matcherParam, target)) {
          toFire.push([event, target, listener]);
        }
    } // TODO:MCG:20120117: Need a way to
    // check if event#stopPropagation
    // was called. If so, break looping
    // through the DOM. Stop if the
    // delegation root has been reached


    if (target === root) {
      break;
    }

    l = listenerList.length; // Fall back to parentNode since SVG children have no parentElement in IE

    target = target.parentElement || target.parentNode; // Do not traverse up to document root when using parentNode, though

    if (target instanceof HTMLDocument) {
      break;
    }
  }

  var ret;

  for (i = 0; i < toFire.length; i++) {
    // Has it been removed during while the event function was fired
    if (this._removedListeners.indexOf(toFire[i][2]) > -1) {
      continue;
    }

    returned = this.fire.apply(this, toFire[i]); // Stop propagation to subsequent
    // callbacks if the callback returned
    // false

    if (returned === false) {
      toFire[i][0][eventIgnore] = true;
      toFire[i][0].preventDefault();
      ret = false;
      break;
    }
  }

  return ret;
};
/**
 * Fire a listener on a target.
 *
 * @param {Event} event
 * @param {Node} target
 * @param {Object} listener
 * @returns {boolean}
 */


Delegate.prototype.fire = function (event, target, listener) {
  return listener.handler.call(target, event, target);
};
/**
 * Check whether an element
 * matches a tag selector.
 *
 * Tags are NOT case-sensitive,
 * except in XML (and XML-based
 * languages such as XHTML).
 *
 * @param {string} tagName The tag name to test against
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesTag(tagName, element) {
  return tagName.toLowerCase() === element.tagName.toLowerCase();
}
/**
 * Check whether an element
 * matches the root.
 *
 * @param {?String} selector In this case this is always passed through as null and not used
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesRoot(selector, element) {
  if (this.rootElement === window) {
    return (// Match the outer document (dispatched from document)
      element === document || // The <html> element (dispatched from document.body or document.documentElement)
      element === document.documentElement || // Or the window itself (dispatched from window)
      element === window
    );
  }

  return this.rootElement === element;
}
/**
 * Check whether the ID of
 * the element in 'this'
 * matches the given ID.
 *
 * IDs are case-sensitive.
 *
 * @param {string} id The ID to test against
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesId(id, element) {
  return id === element.id;
}
/**
 * Short hand for off()
 * and root(), ie both
 * with no parameters
 *
 * @return void
 */


Delegate.prototype.destroy = function () {
  this.off();
  this.root();
};

var _default = Delegate;
exports.default = _default;
module.exports = exports.default;
}(browser$1, browser$1.exports));

var Delegate = /*@__PURE__*/getDefaultExportFromCjs(browser$1.exports);

var pageTransition = (() => {
  const pageTransitionOverlay = document.querySelector("#page-transition-overlay");
  const animationDuration = 200;

  if (pageTransitionOverlay) {
    pageTransitionOverlay.classList.remove("skip-transition");
    setTimeout(function () {
      pageTransitionOverlay.classList.remove("active");
    }, 0);
    setTimeout(() => {
      // Prevent the theme editor from seeing this
      pageTransitionOverlay.classList.remove("active");
    }, animationDuration);
    const delegate = new Delegate(document.body);
    delegate.on("click", 'a[href]:not([href^="#"]):not(.no-transition):not([href^="mailto:"]):not([href^="tel:"]):not([target="_blank"])', onClickedToLeave);

    window.onpageshow = function (e) {
      if (e.persisted) {
        pageTransitionOverlay.classList.remove("active");
      }
    };
  }

  function onClickedToLeave(event, target) {
    // avoid interupting open-in-new-tab click
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault(); // Hint to browser to prerender destination

    let linkHint = document.createElement("link");
    linkHint.setAttribute("rel", "prerender");
    linkHint.setAttribute("href", target.href);
    document.head.appendChild(linkHint);
    setTimeout(() => {
      window.location.href = target.href;
    }, animationDuration);
    pageTransitionOverlay.classList.add("active");
  }
});

function Listeners() {
  this.entries = [];
}

Listeners.prototype.add = function(element, event, fn) {
  this.entries.push({ element: element, event: event, fn: fn });
  element.addEventListener(event, fn);
};

Listeners.prototype.removeAll = function() {
  this.entries = this.entries.filter(function(listener) {
    listener.element.removeEventListener(listener.event, listener.fn);
    return false;
  });
};

/**
 * Returns a product JSON object when passed a product URL
 * @param {*} url
 */

/**
 * Convert the Object (with 'name' and 'value' keys) into an Array of values, then find a match & return the variant (as an Object)
 * @param {Object} product Product JSON object
 * @param {Object} collection Object with 'name' and 'value' keys (e.g. [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }])
 * @returns {Object || null} The variant object once a match has been successful. Otherwise null will be returned
 */
function getVariantFromSerializedArray(product, collection) {
  _validateProductStructure(product);

  // If value is an array of options
  var optionArray = _createOptionArrayFromOptionCollection(product, collection);
  return getVariantFromOptionArray(product, optionArray);
}

/**
 * Find a match in the project JSON (using Array with option values) and return the variant (as an Object)
 * @param {Object} product Product JSON object
 * @param {Array} options List of submitted values (e.g. ['36', 'Black'])
 * @returns {Object || null} The variant object once a match has been successful. Otherwise null will be returned
 */
function getVariantFromOptionArray(product, options) {
  _validateProductStructure(product);
  _validateOptionsArray(options);

  var result = product.variants.filter(function(variant) {
    return options.every(function(option, index) {
      return variant.options[index] === option;
    });
  });

  return result[0] || null;
}

/**
 * Creates an array of selected options from the object
 * Loops through the project.options and check if the "option name" exist (product.options.name) and matches the target
 * @param {Object} product Product JSON object
 * @param {Array} collection Array of object (e.g. [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }])
 * @returns {Array} The result of the matched values. (e.g. ['36', 'Black'])
 */
function _createOptionArrayFromOptionCollection(product, collection) {
  _validateProductStructure(product);
  _validateSerializedArray(collection);

  var optionArray = [];

  collection.forEach(function(option) {
    for (var i = 0; i < product.options.length; i++) {
      if (product.options[i].name.toLowerCase() === option.name.toLowerCase()) {
        optionArray[i] = option.value;
        break;
      }
    }
  });

  return optionArray;
}

/**
 * Check if the product data is a valid JS object
 * Error will be thrown if type is invalid
 * @param {object} product Product JSON object
 */
function _validateProductStructure(product) {
  if (typeof product !== 'object') {
    throw new TypeError(product + ' is not an object.');
  }

  if (Object.keys(product).length === 0 && product.constructor === Object) {
    throw new Error(product + ' is empty.');
  }
}

/**
 * Validate the structure of the array
 * It must be formatted like jQuery's serializeArray()
 * @param {Array} collection Array of object [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }]
 */
function _validateSerializedArray(collection) {
  if (!Array.isArray(collection)) {
    throw new TypeError(collection + ' is not an array.');
  }

  if (collection.length === 0) {
    return [];
  }

  if (collection[0].hasOwnProperty('name')) {
    if (typeof collection[0].name !== 'string') {
      throw new TypeError(
        'Invalid value type passed for name of option ' +
          collection[0].name +
          '. Value should be string.'
      );
    }
  } else {
    throw new Error(collection[0] + 'does not contain name key.');
  }
}

/**
 * Validate the structure of the array
 * It must be formatted as list of values
 * @param {Array} collection Array of object (e.g. ['36', 'Black'])
 */
function _validateOptionsArray(options) {
  if (Array.isArray(options) && typeof options[0] === 'object') {
    throw new Error(options + 'is not a valid array of options.');
  }
}

var selectors$l = {
  idInput: '[name="id"]',
  optionInput: '[name^="options"]',
  quantityInput: '[name="quantity"]',
  propertyInput: '[name^="properties"]'
};

// Public Methods
// -----------------------------------------------------------------------------

/**
 * Returns a URL with a variant ID query parameter. Useful for updating window.history
 * with a new URL based on the currently select product variant.
 * @param {string} url - The URL you wish to append the variant ID to
 * @param {number} id  - The variant ID you wish to append to the URL
 * @returns {string} - The new url which includes the variant ID query parameter
 */

function getUrlWithVariant(url, id) {
  if (/variant=/.test(url)) {
    return url.replace(/(variant=)[^&]+/, '$1' + id);
  } else if (/\?/.test(url)) {
    return url.concat('&variant=').concat(id);
  }

  return url.concat('?variant=').concat(id);
}

/**
 * Constructor class that creates a new instance of a product form controller.
 *
 * @param {Element} element - DOM element which is equal to the <form> node wrapping product form inputs
 * @param {Object} product - A product object
 * @param {Object} options - Optional options object
 * @param {Function} options.onOptionChange - Callback for whenever an option input changes
 * @param {Function} options.onQuantityChange - Callback for whenever an quantity input changes
 * @param {Function} options.onPropertyChange - Callback for whenever a property input changes
 * @param {Function} options.onFormSubmit - Callback for whenever the product form is submitted
 */
function ProductForm$1(element, product, options) {
  this.element = element;
  this.product = _validateProductObject(product);

  options = options || {};

  this._listeners = new Listeners();
  this._listeners.add(
    this.element,
    'submit',
    this._onSubmit.bind(this, options)
  );

  this.optionInputs = this._initInputs(
    selectors$l.optionInput,
    options.onOptionChange
  );

  this.quantityInputs = this._initInputs(
    selectors$l.quantityInput,
    options.onQuantityChange
  );

  this.propertyInputs = this._initInputs(
    selectors$l.propertyInput,
    options.onPropertyChange
  );
}

/**
 * Cleans up all event handlers that were assigned when the Product Form was constructed.
 * Useful for use when a section needs to be reloaded in the theme editor.
 */
ProductForm$1.prototype.destroy = function() {
  this._listeners.removeAll();
};

/**
 * Getter method which returns the array of currently selected option values
 *
 * @returns {Array} An array of option values
 */
ProductForm$1.prototype.options = function() {
  return _serializeOptionValues$1(this.optionInputs, function(item) {
    var regex = /(?:^(options\[))(.*?)(?:\])/;
    item.name = regex.exec(item.name)[2]; // Use just the value between 'options[' and ']'
    return item;
  });
};

/**
 * Getter method which returns the currently selected variant, or `null` if variant
 * doesn't exist.
 *
 * @returns {Object|null} Variant object
 */
ProductForm$1.prototype.variant = function() {
  return getVariantFromSerializedArray(this.product, this.options());
};

/**
 * Getter method which returns a collection of objects containing name and values
 * of property inputs
 *
 * @returns {Array} Collection of objects with name and value keys
 */
ProductForm$1.prototype.properties = function() {
  var properties = _serializePropertyValues$1(this.propertyInputs, function(
    propertyName
  ) {
    var regex = /(?:^(properties\[))(.*?)(?:\])/;
    var name = regex.exec(propertyName)[2]; // Use just the value between 'properties[' and ']'
    return name;
  });

  return Object.entries(properties).length === 0 ? null : properties;
};

/**
 * Getter method which returns the current quantity or 1 if no quantity input is
 * included in the form
 *
 * @returns {Array} Collection of objects with name and value keys
 */
ProductForm$1.prototype.quantity = function() {
  return this.quantityInputs[0]
    ? Number.parseInt(this.quantityInputs[0].value, 10)
    : 1;
};

// Private Methods
// -----------------------------------------------------------------------------
ProductForm$1.prototype._setIdInputValue = function(value) {
  var idInputElement = this.element.querySelector(selectors$l.idInput);

  if (!idInputElement) {
    idInputElement = document.createElement('input');
    idInputElement.type = 'hidden';
    idInputElement.name = 'id';
    this.element.appendChild(idInputElement);
  }

  idInputElement.value = value.toString();
};

ProductForm$1.prototype._onSubmit = function(options, event) {
  event.dataset = this._getProductFormEventData();

  this._setIdInputValue(event.dataset.variant.id);

  if (options.onFormSubmit) {
    options.onFormSubmit(event);
  }
};

ProductForm$1.prototype._onFormEvent = function(cb) {
  if (typeof cb === 'undefined') {
    return Function.prototype;
  }

  return function(event) {
    event.dataset = this._getProductFormEventData();
    cb(event);
  }.bind(this);
};

ProductForm$1.prototype._initInputs = function(selector, cb) {
  var elements = Array.prototype.slice.call(
    this.element.querySelectorAll(selector)
  );

  return elements.map(
    function(element) {
      this._listeners.add(element, 'change', this._onFormEvent(cb));
      return element;
    }.bind(this)
  );
};

ProductForm$1.prototype._getProductFormEventData = function() {
  return {
    options: this.options(),
    variant: this.variant(),
    properties: this.properties(),
    quantity: this.quantity()
  };
};

function _serializeOptionValues$1(inputs, transform) {
  return inputs.reduce(function(options, input) {
    if (
      input.checked || // If input is a checked (means type radio or checkbox)
      (input.type !== 'radio' && input.type !== 'checkbox') // Or if its any other type of input
    ) {
      options.push(transform({ name: input.name, value: input.value }));
    }

    return options;
  }, []);
}

function _serializePropertyValues$1(inputs, transform) {
  return inputs.reduce(function(properties, input) {
    if (
      input.checked || // If input is a checked (means type radio or checkbox)
      (input.type !== 'radio' && input.type !== 'checkbox') // Or if its any other type of input
    ) {
      properties[transform(input.name)] = input.value;
    }

    return properties;
  }, {});
}

function _validateProductObject(product) {
  if (typeof product !== 'object') {
    throw new TypeError(product + ' is not an object.');
  }

  if (typeof product.variants[0].options === 'undefined') {
    throw new TypeError(
      'Product object is invalid. Make sure you use the product object that is output from {{ product | json }} or from the http://[your-product-url].js route'
    );
  }

  return product;
}

function t$2(){try{return localStorage.setItem("test","test"),localStorage.removeItem("test"),!0}catch(t){return !1}}function e$1(e){if(t$2())return JSON.parse(localStorage.getItem("neon_"+e))}function r$2(e,r){if(t$2())return localStorage.setItem("neon_"+e,r)}

var n=function(n){if("object"!=typeof(t=n)||Array.isArray(t))throw "state should be an object";var t;},t$1=function(n,t,e,c){return (r=n,r.reduce(function(n,t,e){return n.indexOf(t)>-1?n:n.concat(t)},[])).reduce(function(n,e){return n.concat(t[e]||[])},[]).map(function(n){return n(e,c)});var r;},e=a(),c=e.on,r$1=e.emit,o=e.hydrate;e.getState;function a(e){void 0===e&&(e={});var c={};return {getState:function(){return Object.assign({},e)},hydrate:function(r){return n(r),Object.assign(e,r),function(){var n=["*"].concat(Object.keys(r));t$1(n,c,e);}},on:function(n,t){return (n=[].concat(n)).map(function(n){return c[n]=(c[n]||[]).concat(t)}),function(){return n.map(function(n){return c[n].splice(c[n].indexOf(t),1)})}},emit:function(r,o,u){var a=("*"===r?[]:["*"]).concat(r);(o="function"==typeof o?o(e):o)&&(n(o),Object.assign(e,o),a=a.concat(Object.keys(o))),t$1(a,c,e,u);}}}

const CustomEvents = {
  cartItemAdded: "flu:cart:item-added",
  cartUpdated: "flu:cart:updated",
  cartError: "flu:cart:error",
  productVariantChange: "flu:product:variant-change",
  productQuanityUpdate: "flu:product:quantity-update",
  quickCartOpen: "flu:quick-cart:open",
  quickCartClose: "flu:quick-cart:close",
  // For use with apps. No need to use `flu:`
  quickViewLoaded: "quickview:loaded"
};

const dispatchCustomEvent = (eventName, data = {}) => {
  const detail = {
    detail: data
  };
  const event = new CustomEvent(eventName, data ? detail : null);
  document.dispatchEvent(event);
};

const routes = window.theme.routes.cart || {};
const paths = {
  base: `${routes.base || "/cart"}.js`,
  add: `${routes.add || "/cart/add"}.js`,
  change: `${routes.change || "/cart/change"}.js`,
  clear: `${routes.clear || "/cart/clear"}.js`
}; // Add a `sorted` key that orders line items
// in the order the customer added them if possible

function sortCart(cart) {
  const order = e$1("cart_order") || [];

  if (order.length) {
    cart.sorted = [...cart.items].sort((a, b) => order.indexOf(a.variant_id) - order.indexOf(b.variant_id));
    return cart;
  }

  cart.sorted = cart.items;
  return cart;
}

function addVariant(variant, quantity) {
  const numAvailable = variant.inventory_policy === "deny" && variant.inventory_management === "shopify" ? variant.inventory_quantity : null; // null means they can add as many as they want

  return get().then(({
    items
  }) => {
    const existing = items.filter(item => item.id === variant.id)[0] || {};
    const numRequested = (existing.quantity || 0) + quantity;

    if (numAvailable !== null && numRequested > numAvailable) {
      const err = `There are only ${numAvailable} of that product available, requested ${numRequested}.`;
      throw new Error(err);
    } else {
      return addItemById(variant.id, quantity);
    }
  });
}

function updateItem(id, quantity) {
  return get().then(({
    items
  }) => {
    for (let i = 0; i < items.length; i++) {
      if (items[i].variant_id === parseInt(id)) {
        return changeItem(i + 1, quantity); // shopify cart is a 1-based index
      }
    }
  });
}

function changeItem(line, quantity) {
  return fetch(paths.change, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      line,
      quantity
    })
  }).then(res => res.json()).then(cart => {
    r$1("cart:updated", {
      cart: sortCart(cart)
    });
    dispatchCustomEvent(CustomEvents.cartUpdated, {
      cart: sortCart(cart)
    });
    return sortCart(cart);
  });
}

function addItemById(id, quantity) {
  r$1("cart:updating");
  return fetch(paths.add, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id,
      quantity
    })
  }).then(r => r.json()).then(item => {
    return get().then(cart => {
      const order = e$1("cart_order") || [];
      const newOrder = [item.variant_id, ...order.filter(i => i !== item.variant_id)];
      r$2("cart_order", JSON.stringify(newOrder));
      r$1("cart:updated", {
        cart: sortCart(cart)
      });
      return {
        item,
        cart: sortCart(cart)
      };
    });
  });
}

function get() {
  return fetch(paths.base, {
    method: "GET",
    credentials: "include"
  }).then(res => res.json()).then(data => {
    return sortCart(data);
  });
}

function addItem(form) {
  r$1("cart:updating");
  return fetch(paths.add, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest"
    },
    body: serialize(form)
  }).then(r => r.json()).then(res => {
    if (res.status == "422") {
      dispatchCustomEvent(CustomEvents.cartError, {
        errorMessage: res.description
      });
      throw {
        code: 422,
        message: res.description
      };
    }

    return get().then(cart => {
      const order = e$1("cart_order") || [];
      const newOrder = [res.variant_id, ...order.filter(i => i !== res.variant_id)];
      r$2("cart_order", JSON.stringify(newOrder));
      r$1("cart:updated", {
        cart: sortCart(cart)
      });
      dispatchCustomEvent(CustomEvents.cartUpdated, {
        cart: sortCart(cart)
      });
      return {
        item: res,
        cart: sortCart(cart)
      };
    });
  });
} // !
//  Serialize all form data into a SearchParams string
//  (c) 2020 Chris Ferdinandi, MIT License, https://gomakethings.com
//  @param  {Node}   form The form to serialize
//  @return {String}      The serialized form data
//


function serialize(form) {
  var arr = [];
  Array.prototype.slice.call(form.elements).forEach(function (field) {
    if (!field.name || field.disabled || ["file", "reset", "submit", "button"].indexOf(field.type) > -1) {
      return;
    }

    if (field.type === "select-multiple") {
      Array.prototype.slice.call(field.options).forEach(function (option) {
        if (!option.selected) return;
        arr.push(encodeURIComponent(field.name) + "=" + encodeURIComponent(option.value));
      });
      return;
    }

    if (["checkbox", "radio"].indexOf(field.type) > -1 && !field.checked) {
      return;
    }

    arr.push(encodeURIComponent(field.name) + "=" + encodeURIComponent(field.value));
  });
  return arr.join("&");
}

var cart = {
  addItem,
  addItemById,
  addVariant,
  get,
  updateItem
};

var currency_cjs = {};

Object.defineProperty(currency_cjs, "__esModule", {
  value: true
});
var formatMoney_1 = currency_cjs.formatMoney = formatMoney$1;
/**
 * Currency Helpers
 * -----------------------------------------------------------------------------
 * A collection of useful functions that help with currency formatting
 *
 * Current contents
 * - formatMoney - Takes an amount in cents and returns it as a formatted dollar value.
 *
 */

var moneyFormat = '${{amount}}';

/**
 * Format money values based on your shop currency settings
 * @param  {Number|string} cents - value in cents or dollar amount e.g. 300 cents
 * or 3.00 dollars
 * @param  {String} format - shop money_format setting
 * @return {String} value - formatted value
 */
function formatMoney$1(cents, format) {
  if (typeof cents === 'string') {
    cents = cents.replace('.', '');
  }
  var value = '';
  var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  var formatString = format || moneyFormat;

  function formatWithDelimiters(number) {
    var precision = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
    var thousands = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ',';
    var decimal = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '.';

    if (isNaN(number) || number == null) {
      return 0;
    }

    number = (number / 100.0).toFixed(precision);

    var parts = number.split('.');
    var dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
    var centsAmount = parts[1] ? decimal + parts[1] : '';

    return dollarsAmount + centsAmount;
  }

  switch (formatString.match(placeholderRegex)[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
  }

  return formatString.replace(placeholderRegex, value);
}

var formatMoney = (val => formatMoney_1(val, window.theme.moneyFormat || "${{amount}}"));

// Fetch the product data from the .js endpoint because it includes
// more data than the .json endpoint.
var getProduct = (handle => cb => fetch(`${window.theme.routes.products}/${handle}.js`).then(res => res.json()).then(data => cb(data)).catch(err => console.log(err.message)));

function OptionButtons(els) {
  const groups = els.map(createOptionGroup);

  function destroy() {
    groups && groups.forEach(group => group());
  }

  return {
    groups,
    destroy
  };
}

function createOptionGroup(el) {
  const select = n$1("select", el);
  const buttons = t$3("[data-button]", el);
  const buttonClick = e$2(buttons, "click", e => {
    e.preventDefault();
    const {
      button,
      swatchButton,
      label
    } = e.currentTarget.dataset;

    if (swatchButton) {
      const optionSelectedLabel = n$1("[data-swatch-selected]", e.currentTarget.closest(".pf-container"));
      if (optionSelectedLabel) optionSelectedLabel.innerHTML = label;
    }

    buttons.forEach(btn => l(btn, "selected", btn.dataset.button === button));
    const opt = n$1(`[data-value-handle="${button}"]`, select);
    opt.selected = true;
    select.dispatchEvent(new Event("change"));
  });
  return () => buttonClick();
}

const selectors$k = {
  addToCart: "[data-add-to-cart]",
  price: "[data-price]",
  comparePrice: "[data-compare-price]"
};

const getProductMarkup = handle => cb => fetch(`${window.theme.routes.products}/${handle}?view=quick`).then(res => res.text()).then(data => cb(data)).catch(err => console.log(err.message));

function quickAdd () {
  const delegate = new Delegate(document.body);
  delegate.on("click", "button[data-quick-add]", handleClick);

  function handleClick(_, target) {
    const {
      quickAdd: handle
    } = target.dataset; // Open and show loading state

    r$1("cart:configureLoading"); // Fetch markup and send to quick cart

    const product = getProductMarkup(handle);
    product(html => r$1("cart:configureReady", null, {
      html,
      handle
    }));
  }
}
function handleForm(data, scope) {
  const buyButton = n$1("[data-add-to-cart]", scope);
  const errorMessage = n$1("[data-error-message]", scope);
  OptionButtons(t$3("[data-option-buttons]", scope));
  const productForm = new ProductForm$1(n$1("[data-product-form]", scope), data, {
    onOptionChange: ({
      dataset: {
        variant
      }
    }) => {
      // Update prices
      const price = t$3(selectors$k.price, scope);
      const comparePrice = t$3(selectors$k.comparePrice, scope);
      dispatchCustomEvent(CustomEvents.productVariantChange, {
        variant: variant
      });

      if (variant) {
        price.forEach(el => el.innerHTML = formatMoney(variant.price));
        comparePrice.forEach(el => el.innerHTML = variant.compare_at_price > variant.price ? formatMoney(variant.compare_at_price) : "");
      } // Update add to cart button


      const text = n$1("[data-add-to-cart-text]", buyButton);
      const {
        langAvailable,
        langUnavailable,
        langSoldOut
      } = buyButton.dataset;

      if (!variant) {
        buyButton.setAttribute("disabled", "disabled");
        text.textContent = langUnavailable;
      } else if (variant.available) {
        buyButton.removeAttribute("disabled");
        text.textContent = langAvailable;
      } else {
        buyButton.setAttribute("disabled", "disabled");
        text.textContent = langSoldOut;
      }
    },
    onFormSubmit: e => {
      const {
        enableQuickCart
      } = document.body.dataset;
      if (!enableQuickCart) return;
      e.preventDefault();
      u(buyButton, "loading");
      i(errorMessage, "visible");
      cart.addItem(productForm.element).then(({
        item
      }) => {
        i(buyButton, "loading");
        r$1("cart:open", null, {
          flash: item.variant_id
        });
      }).catch(error => {
        i(buyButton, "loading");
        u(errorMessage, "visible");
        errorMessage.innerText = error.message;
      });
    }
  });
}

function loadReviews() {
  const {
    SPR
  } = window;

  if (SPR) {
    SPR.registerCallbacks();
    SPR.initRatingHandler();
    SPR.initDomEls();
    SPR.loadProducts();
    SPR.loadBadges();
  }
}
var reviews = (() => {
  // Reload reviews when a collection is filtered
  c("collection:updated", loadReviews);
});

const cn = "full-width";
var sectionClasses = (() => {
  function adjustClasses() {
    const sections = t$3(".shopify-section");
    sections.forEach(s => {
      const {
        firstElementChild: child
      } = s;

      if (child && child.classList.contains(cn)) {
        i(child, cn);
        u(s, cn);
      }
    });
  }

  adjustClasses();
  document.addEventListener("shopify:section:load", adjustClasses);
});

/*!
* tabbable 5.3.3
* @license MIT, https://github.com/focus-trap/tabbable/blob/master/LICENSE
*/
var candidateSelectors = ['input', 'select', 'textarea', 'a[href]', 'button', '[tabindex]:not(slot)', 'audio[controls]', 'video[controls]', '[contenteditable]:not([contenteditable="false"])', 'details>summary:first-of-type', 'details'];
var candidateSelector = /* #__PURE__ */candidateSelectors.join(',');
var NoElement = typeof Element === 'undefined';
var matches = NoElement ? function () {} : Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
var getRootNode = !NoElement && Element.prototype.getRootNode ? function (element) {
  return element.getRootNode();
} : function (element) {
  return element.ownerDocument;
};
/**
 * @param {Element} el container to check in
 * @param {boolean} includeContainer add container to check
 * @param {(node: Element) => boolean} filter filter candidates
 * @returns {Element[]}
 */

var getCandidates = function getCandidates(el, includeContainer, filter) {
  var candidates = Array.prototype.slice.apply(el.querySelectorAll(candidateSelector));

  if (includeContainer && matches.call(el, candidateSelector)) {
    candidates.unshift(el);
  }

  candidates = candidates.filter(filter);
  return candidates;
};
/**
 * @callback GetShadowRoot
 * @param {Element} element to check for shadow root
 * @returns {ShadowRoot|boolean} ShadowRoot if available or boolean indicating if a shadowRoot is attached but not available.
 */

/**
 * @callback ShadowRootFilter
 * @param {Element} shadowHostNode the element which contains shadow content
 * @returns {boolean} true if a shadow root could potentially contain valid candidates.
 */

/**
 * @typedef {Object} CandidatesScope
 * @property {Element} scope contains inner candidates
 * @property {Element[]} candidates
 */

/**
 * @typedef {Object} IterativeOptions
 * @property {GetShadowRoot|boolean} getShadowRoot true if shadow support is enabled; falsy if not;
 *  if a function, implies shadow support is enabled and either returns the shadow root of an element
 *  or a boolean stating if it has an undisclosed shadow root
 * @property {(node: Element) => boolean} filter filter candidates
 * @property {boolean} flatten if true then result will flatten any CandidatesScope into the returned list
 * @property {ShadowRootFilter} shadowRootFilter filter shadow roots;
 */

/**
 * @param {Element[]} elements list of element containers to match candidates from
 * @param {boolean} includeContainer add container list to check
 * @param {IterativeOptions} options
 * @returns {Array.<Element|CandidatesScope>}
 */


var getCandidatesIteratively = function getCandidatesIteratively(elements, includeContainer, options) {
  var candidates = [];
  var elementsToCheck = Array.from(elements);

  while (elementsToCheck.length) {
    var element = elementsToCheck.shift();

    if (element.tagName === 'SLOT') {
      // add shadow dom slot scope (slot itself cannot be focusable)
      var assigned = element.assignedElements();
      var content = assigned.length ? assigned : element.children;
      var nestedCandidates = getCandidatesIteratively(content, true, options);

      if (options.flatten) {
        candidates.push.apply(candidates, nestedCandidates);
      } else {
        candidates.push({
          scope: element,
          candidates: nestedCandidates
        });
      }
    } else {
      // check candidate element
      var validCandidate = matches.call(element, candidateSelector);

      if (validCandidate && options.filter(element) && (includeContainer || !elements.includes(element))) {
        candidates.push(element);
      } // iterate over shadow content if possible


      var shadowRoot = element.shadowRoot || // check for an undisclosed shadow
      typeof options.getShadowRoot === 'function' && options.getShadowRoot(element);
      var validShadowRoot = !options.shadowRootFilter || options.shadowRootFilter(element);

      if (shadowRoot && validShadowRoot) {
        // add shadow dom scope IIF a shadow root node was given; otherwise, an undisclosed
        //  shadow exists, so look at light dom children as fallback BUT create a scope for any
        //  child candidates found because they're likely slotted elements (elements that are
        //  children of the web component element (which has the shadow), in the light dom, but
        //  slotted somewhere _inside_ the undisclosed shadow) -- the scope is created below,
        //  _after_ we return from this recursive call
        var _nestedCandidates = getCandidatesIteratively(shadowRoot === true ? element.children : shadowRoot.children, true, options);

        if (options.flatten) {
          candidates.push.apply(candidates, _nestedCandidates);
        } else {
          candidates.push({
            scope: element,
            candidates: _nestedCandidates
          });
        }
      } else {
        // there's not shadow so just dig into the element's (light dom) children
        //  __without__ giving the element special scope treatment
        elementsToCheck.unshift.apply(elementsToCheck, element.children);
      }
    }
  }

  return candidates;
};

var getTabindex = function getTabindex(node, isScope) {
  if (node.tabIndex < 0) {
    // in Chrome, <details/>, <audio controls/> and <video controls/> elements get a default
    // `tabIndex` of -1 when the 'tabindex' attribute isn't specified in the DOM,
    // yet they are still part of the regular tab order; in FF, they get a default
    // `tabIndex` of 0; since Chrome still puts those elements in the regular tab
    // order, consider their tab index to be 0.
    // Also browsers do not return `tabIndex` correctly for contentEditable nodes;
    // so if they don't have a tabindex attribute specifically set, assume it's 0.
    //
    // isScope is positive for custom element with shadow root or slot that by default
    // have tabIndex -1, but need to be sorted by document order in order for their
    // content to be inserted in the correct position
    if ((isScope || /^(AUDIO|VIDEO|DETAILS)$/.test(node.tagName) || node.isContentEditable) && isNaN(parseInt(node.getAttribute('tabindex'), 10))) {
      return 0;
    }
  }

  return node.tabIndex;
};

var sortOrderedTabbables = function sortOrderedTabbables(a, b) {
  return a.tabIndex === b.tabIndex ? a.documentOrder - b.documentOrder : a.tabIndex - b.tabIndex;
};

var isInput = function isInput(node) {
  return node.tagName === 'INPUT';
};

var isHiddenInput = function isHiddenInput(node) {
  return isInput(node) && node.type === 'hidden';
};

var isDetailsWithSummary = function isDetailsWithSummary(node) {
  var r = node.tagName === 'DETAILS' && Array.prototype.slice.apply(node.children).some(function (child) {
    return child.tagName === 'SUMMARY';
  });
  return r;
};

var getCheckedRadio = function getCheckedRadio(nodes, form) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].checked && nodes[i].form === form) {
      return nodes[i];
    }
  }
};

var isTabbableRadio = function isTabbableRadio(node) {
  if (!node.name) {
    return true;
  }

  var radioScope = node.form || getRootNode(node);

  var queryRadios = function queryRadios(name) {
    return radioScope.querySelectorAll('input[type="radio"][name="' + name + '"]');
  };

  var radioSet;

  if (typeof window !== 'undefined' && typeof window.CSS !== 'undefined' && typeof window.CSS.escape === 'function') {
    radioSet = queryRadios(window.CSS.escape(node.name));
  } else {
    try {
      radioSet = queryRadios(node.name);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Looks like you have a radio button with a name attribute containing invalid CSS selector characters and need the CSS.escape polyfill: %s', err.message);
      return false;
    }
  }

  var checked = getCheckedRadio(radioSet, node.form);
  return !checked || checked === node;
};

var isRadio = function isRadio(node) {
  return isInput(node) && node.type === 'radio';
};

var isNonTabbableRadio = function isNonTabbableRadio(node) {
  return isRadio(node) && !isTabbableRadio(node);
};

var isZeroArea = function isZeroArea(node) {
  var _node$getBoundingClie = node.getBoundingClientRect(),
      width = _node$getBoundingClie.width,
      height = _node$getBoundingClie.height;

  return width === 0 && height === 0;
};

var isHidden = function isHidden(node, _ref) {
  var displayCheck = _ref.displayCheck,
      getShadowRoot = _ref.getShadowRoot;

  // NOTE: visibility will be `undefined` if node is detached from the document
  //  (see notes about this further down), which means we will consider it visible
  //  (this is legacy behavior from a very long way back)
  // NOTE: we check this regardless of `displayCheck="none"` because this is a
  //  _visibility_ check, not a _display_ check
  if (getComputedStyle(node).visibility === 'hidden') {
    return true;
  }

  var isDirectSummary = matches.call(node, 'details>summary:first-of-type');
  var nodeUnderDetails = isDirectSummary ? node.parentElement : node;

  if (matches.call(nodeUnderDetails, 'details:not([open]) *')) {
    return true;
  } // The root node is the shadow root if the node is in a shadow DOM; some document otherwise
  //  (but NOT _the_ document; see second 'If' comment below for more).
  // If rootNode is shadow root, it'll have a host, which is the element to which the shadow
  //  is attached, and the one we need to check if it's in the document or not (because the
  //  shadow, and all nodes it contains, is never considered in the document since shadows
  //  behave like self-contained DOMs; but if the shadow's HOST, which is part of the document,
  //  is hidden, or is not in the document itself but is detached, it will affect the shadow's
  //  visibility, including all the nodes it contains). The host could be any normal node,
  //  or a custom element (i.e. web component). Either way, that's the one that is considered
  //  part of the document, not the shadow root, nor any of its children (i.e. the node being
  //  tested).
  // If rootNode is not a shadow root, it won't have a host, and so rootNode should be the
  //  document (per the docs) and while it's a Document-type object, that document does not
  //  appear to be the same as the node's `ownerDocument` for some reason, so it's safer
  //  to ignore the rootNode at this point, and use `node.ownerDocument`. Otherwise,
  //  using `rootNode.contains(node)` will _always_ be true we'll get false-positives when
  //  node is actually detached.


  var nodeRootHost = getRootNode(node).host;
  var nodeIsAttached = (nodeRootHost === null || nodeRootHost === void 0 ? void 0 : nodeRootHost.ownerDocument.contains(nodeRootHost)) || node.ownerDocument.contains(node);

  if (!displayCheck || displayCheck === 'full') {
    if (typeof getShadowRoot === 'function') {
      // figure out if we should consider the node to be in an undisclosed shadow and use the
      //  'non-zero-area' fallback
      var originalNode = node;

      while (node) {
        var parentElement = node.parentElement;
        var rootNode = getRootNode(node);

        if (parentElement && !parentElement.shadowRoot && getShadowRoot(parentElement) === true // check if there's an undisclosed shadow
        ) {
          // node has an undisclosed shadow which means we can only treat it as a black box, so we
          //  fall back to a non-zero-area test
          return isZeroArea(node);
        } else if (node.assignedSlot) {
          // iterate up slot
          node = node.assignedSlot;
        } else if (!parentElement && rootNode !== node.ownerDocument) {
          // cross shadow boundary
          node = rootNode.host;
        } else {
          // iterate up normal dom
          node = parentElement;
        }
      }

      node = originalNode;
    } // else, `getShadowRoot` might be true, but all that does is enable shadow DOM support
    //  (i.e. it does not also presume that all nodes might have undisclosed shadows); or
    //  it might be a falsy value, which means shadow DOM support is disabled
    // Since we didn't find it sitting in an undisclosed shadow (or shadows are disabled)
    //  now we can just test to see if it would normally be visible or not, provided it's
    //  attached to the main document.
    // NOTE: We must consider case where node is inside a shadow DOM and given directly to
    //  `isTabbable()` or `isFocusable()` -- regardless of `getShadowRoot` option setting.


    if (nodeIsAttached) {
      // this works wherever the node is: if there's at least one client rect, it's
      //  somehow displayed; it also covers the CSS 'display: contents' case where the
      //  node itself is hidden in place of its contents; and there's no need to search
      //  up the hierarchy either
      return !node.getClientRects().length;
    } // Else, the node isn't attached to the document, which means the `getClientRects()`
    //  API will __always__ return zero rects (this can happen, for example, if React
    //  is used to render nodes onto a detached tree, as confirmed in this thread:
    //  https://github.com/facebook/react/issues/9117#issuecomment-284228870)
    //
    // It also means that even window.getComputedStyle(node).display will return `undefined`
    //  because styles are only computed for nodes that are in the document.
    //
    // NOTE: THIS HAS BEEN THE CASE FOR YEARS. It is not new, nor is it caused by tabbable
    //  somehow. Though it was never stated officially, anyone who has ever used tabbable
    //  APIs on nodes in detached containers has actually implicitly used tabbable in what
    //  was later (as of v5.2.0 on Apr 9, 2021) called `displayCheck="none"` mode -- essentially
    //  considering __everything__ to be visible because of the innability to determine styles.

  } else if (displayCheck === 'non-zero-area') {
    // NOTE: Even though this tests that the node's client rect is non-zero to determine
    //  whether it's displayed, and that a detached node will __always__ have a zero-area
    //  client rect, we don't special-case for whether the node is attached or not. In
    //  this mode, we do want to consider nodes that have a zero area to be hidden at all
    //  times, and that includes attached or not.
    return isZeroArea(node);
  } // visible, as far as we can tell, or per current `displayCheck` mode


  return false;
}; // form fields (nested) inside a disabled fieldset are not focusable/tabbable
//  unless they are in the _first_ <legend> element of the top-most disabled
//  fieldset


var isDisabledFromFieldset = function isDisabledFromFieldset(node) {
  if (/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(node.tagName)) {
    var parentNode = node.parentElement; // check if `node` is contained in a disabled <fieldset>

    while (parentNode) {
      if (parentNode.tagName === 'FIELDSET' && parentNode.disabled) {
        // look for the first <legend> among the children of the disabled <fieldset>
        for (var i = 0; i < parentNode.children.length; i++) {
          var child = parentNode.children.item(i); // when the first <legend> (in document order) is found

          if (child.tagName === 'LEGEND') {
            // if its parent <fieldset> is not nested in another disabled <fieldset>,
            // return whether `node` is a descendant of its first <legend>
            return matches.call(parentNode, 'fieldset[disabled] *') ? true : !child.contains(node);
          }
        } // the disabled <fieldset> containing `node` has no <legend>


        return true;
      }

      parentNode = parentNode.parentElement;
    }
  } // else, node's tabbable/focusable state should not be affected by a fieldset's
  //  enabled/disabled state


  return false;
};

var isNodeMatchingSelectorFocusable = function isNodeMatchingSelectorFocusable(options, node) {
  if (node.disabled || isHiddenInput(node) || isHidden(node, options) || // For a details element with a summary, the summary element gets the focus
  isDetailsWithSummary(node) || isDisabledFromFieldset(node)) {
    return false;
  }

  return true;
};

var isNodeMatchingSelectorTabbable = function isNodeMatchingSelectorTabbable(options, node) {
  if (isNonTabbableRadio(node) || getTabindex(node) < 0 || !isNodeMatchingSelectorFocusable(options, node)) {
    return false;
  }

  return true;
};

var isValidShadowRootTabbable = function isValidShadowRootTabbable(shadowHostNode) {
  var tabIndex = parseInt(shadowHostNode.getAttribute('tabindex'), 10);

  if (isNaN(tabIndex) || tabIndex >= 0) {
    return true;
  } // If a custom element has an explicit negative tabindex,
  // browsers will not allow tab targeting said element's children.


  return false;
};
/**
 * @param {Array.<Element|CandidatesScope>} candidates
 * @returns Element[]
 */


var sortByOrder = function sortByOrder(candidates) {
  var regularTabbables = [];
  var orderedTabbables = [];
  candidates.forEach(function (item, i) {
    var isScope = !!item.scope;
    var element = isScope ? item.scope : item;
    var candidateTabindex = getTabindex(element, isScope);
    var elements = isScope ? sortByOrder(item.candidates) : element;

    if (candidateTabindex === 0) {
      isScope ? regularTabbables.push.apply(regularTabbables, elements) : regularTabbables.push(element);
    } else {
      orderedTabbables.push({
        documentOrder: i,
        tabIndex: candidateTabindex,
        item: item,
        isScope: isScope,
        content: elements
      });
    }
  });
  return orderedTabbables.sort(sortOrderedTabbables).reduce(function (acc, sortable) {
    sortable.isScope ? acc.push.apply(acc, sortable.content) : acc.push(sortable.content);
    return acc;
  }, []).concat(regularTabbables);
};

var tabbable = function tabbable(el, options) {
  options = options || {};
  var candidates;

  if (options.getShadowRoot) {
    candidates = getCandidatesIteratively([el], options.includeContainer, {
      filter: isNodeMatchingSelectorTabbable.bind(null, options),
      flatten: false,
      getShadowRoot: options.getShadowRoot,
      shadowRootFilter: isValidShadowRootTabbable
    });
  } else {
    candidates = getCandidates(el, options.includeContainer, isNodeMatchingSelectorTabbable.bind(null, options));
  }

  return sortByOrder(candidates);
};

var focusable = function focusable(el, options) {
  options = options || {};
  var candidates;

  if (options.getShadowRoot) {
    candidates = getCandidatesIteratively([el], options.includeContainer, {
      filter: isNodeMatchingSelectorFocusable.bind(null, options),
      flatten: true,
      getShadowRoot: options.getShadowRoot
    });
  } else {
    candidates = getCandidates(el, options.includeContainer, isNodeMatchingSelectorFocusable.bind(null, options));
  }

  return candidates;
};

var isTabbable = function isTabbable(node, options) {
  options = options || {};

  if (!node) {
    throw new Error('No node provided');
  }

  if (matches.call(node, candidateSelector) === false) {
    return false;
  }

  return isNodeMatchingSelectorTabbable(options, node);
};

var focusableCandidateSelector = /* #__PURE__ */candidateSelectors.concat('iframe').join(',');

var isFocusable = function isFocusable(node, options) {
  options = options || {};

  if (!node) {
    throw new Error('No node provided');
  }

  if (matches.call(node, focusableCandidateSelector) === false) {
    return false;
  }

  return isNodeMatchingSelectorFocusable(options, node);
};

/*!
* focus-trap 6.9.4
* @license MIT, https://github.com/focus-trap/focus-trap/blob/master/LICENSE
*/

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2 ? ownKeys(Object(source), !0).forEach(function (key) {
      _defineProperty(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }

  return target;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var activeFocusTraps = function () {
  var trapQueue = [];
  return {
    activateTrap: function activateTrap(trap) {
      if (trapQueue.length > 0) {
        var activeTrap = trapQueue[trapQueue.length - 1];

        if (activeTrap !== trap) {
          activeTrap.pause();
        }
      }

      var trapIndex = trapQueue.indexOf(trap);

      if (trapIndex === -1) {
        trapQueue.push(trap);
      } else {
        // move this existing trap to the front of the queue
        trapQueue.splice(trapIndex, 1);
        trapQueue.push(trap);
      }
    },
    deactivateTrap: function deactivateTrap(trap) {
      var trapIndex = trapQueue.indexOf(trap);

      if (trapIndex !== -1) {
        trapQueue.splice(trapIndex, 1);
      }

      if (trapQueue.length > 0) {
        trapQueue[trapQueue.length - 1].unpause();
      }
    }
  };
}();

var isSelectableInput = function isSelectableInput(node) {
  return node.tagName && node.tagName.toLowerCase() === 'input' && typeof node.select === 'function';
};

var isEscapeEvent = function isEscapeEvent(e) {
  return e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27;
};

var isTabEvent = function isTabEvent(e) {
  return e.key === 'Tab' || e.keyCode === 9;
};

var delay = function delay(fn) {
  return setTimeout(fn, 0);
}; // Array.find/findIndex() are not supported on IE; this replicates enough
//  of Array.findIndex() for our needs


var findIndex = function findIndex(arr, fn) {
  var idx = -1;
  arr.every(function (value, i) {
    if (fn(value)) {
      idx = i;
      return false; // break
    }

    return true; // next
  });
  return idx;
};
/**
 * Get an option's value when it could be a plain value, or a handler that provides
 *  the value.
 * @param {*} value Option's value to check.
 * @param {...*} [params] Any parameters to pass to the handler, if `value` is a function.
 * @returns {*} The `value`, or the handler's returned value.
 */


var valueOrHandler = function valueOrHandler(value) {
  for (var _len = arguments.length, params = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    params[_key - 1] = arguments[_key];
  }

  return typeof value === 'function' ? value.apply(void 0, params) : value;
};

var getActualTarget = function getActualTarget(event) {
  // NOTE: If the trap is _inside_ a shadow DOM, event.target will always be the
  //  shadow host. However, event.target.composedPath() will be an array of
  //  nodes "clicked" from inner-most (the actual element inside the shadow) to
  //  outer-most (the host HTML document). If we have access to composedPath(),
  //  then use its first element; otherwise, fall back to event.target (and
  //  this only works for an _open_ shadow DOM; otherwise,
  //  composedPath()[0] === event.target always).
  return event.target.shadowRoot && typeof event.composedPath === 'function' ? event.composedPath()[0] : event.target;
};

var createFocusTrap = function createFocusTrap(elements, userOptions) {
  // SSR: a live trap shouldn't be created in this type of environment so this
  //  should be safe code to execute if the `document` option isn't specified
  var doc = (userOptions === null || userOptions === void 0 ? void 0 : userOptions.document) || document;

  var config = _objectSpread2({
    returnFocusOnDeactivate: true,
    escapeDeactivates: true,
    delayInitialFocus: true
  }, userOptions);

  var state = {
    // containers given to createFocusTrap()
    // @type {Array<HTMLElement>}
    containers: [],
    // list of objects identifying tabbable nodes in `containers` in the trap
    // NOTE: it's possible that a group has no tabbable nodes if nodes get removed while the trap
    //  is active, but the trap should never get to a state where there isn't at least one group
    //  with at least one tabbable node in it (that would lead to an error condition that would
    //  result in an error being thrown)
    // @type {Array<{
    //   container: HTMLElement,
    //   tabbableNodes: Array<HTMLElement>, // empty if none
    //   focusableNodes: Array<HTMLElement>, // empty if none
    //   firstTabbableNode: HTMLElement|null,
    //   lastTabbableNode: HTMLElement|null,
    //   nextTabbableNode: (node: HTMLElement, forward: boolean) => HTMLElement|undefined
    // }>}
    containerGroups: [],
    // same order/length as `containers` list
    // references to objects in `containerGroups`, but only those that actually have
    //  tabbable nodes in them
    // NOTE: same order as `containers` and `containerGroups`, but __not necessarily__
    //  the same length
    tabbableGroups: [],
    nodeFocusedBeforeActivation: null,
    mostRecentlyFocusedNode: null,
    active: false,
    paused: false,
    // timer ID for when delayInitialFocus is true and initial focus in this trap
    //  has been delayed during activation
    delayInitialFocusTimer: undefined
  };
  var trap; // eslint-disable-line prefer-const -- some private functions reference it, and its methods reference private functions, so we must declare here and define later

  /**
   * Gets a configuration option value.
   * @param {Object|undefined} configOverrideOptions If true, and option is defined in this set,
   *  value will be taken from this object. Otherwise, value will be taken from base configuration.
   * @param {string} optionName Name of the option whose value is sought.
   * @param {string|undefined} [configOptionName] Name of option to use __instead of__ `optionName`
   *  IIF `configOverrideOptions` is not defined. Otherwise, `optionName` is used.
   */

  var getOption = function getOption(configOverrideOptions, optionName, configOptionName) {
    return configOverrideOptions && configOverrideOptions[optionName] !== undefined ? configOverrideOptions[optionName] : config[configOptionName || optionName];
  };
  /**
   * Finds the index of the container that contains the element.
   * @param {HTMLElement} element
   * @returns {number} Index of the container in either `state.containers` or
   *  `state.containerGroups` (the order/length of these lists are the same); -1
   *  if the element isn't found.
   */


  var findContainerIndex = function findContainerIndex(element) {
    // NOTE: search `containerGroups` because it's possible a group contains no tabbable
    //  nodes, but still contains focusable nodes (e.g. if they all have `tabindex=-1`)
    //  and we still need to find the element in there
    return state.containerGroups.findIndex(function (_ref) {
      var container = _ref.container,
          tabbableNodes = _ref.tabbableNodes;
      return container.contains(element) || // fall back to explicit tabbable search which will take into consideration any
      //  web components if the `tabbableOptions.getShadowRoot` option was used for
      //  the trap, enabling shadow DOM support in tabbable (`Node.contains()` doesn't
      //  look inside web components even if open)
      tabbableNodes.find(function (node) {
        return node === element;
      });
    });
  };
  /**
   * Gets the node for the given option, which is expected to be an option that
   *  can be either a DOM node, a string that is a selector to get a node, `false`
   *  (if a node is explicitly NOT given), or a function that returns any of these
   *  values.
   * @param {string} optionName
   * @returns {undefined | false | HTMLElement | SVGElement} Returns
   *  `undefined` if the option is not specified; `false` if the option
   *  resolved to `false` (node explicitly not given); otherwise, the resolved
   *  DOM node.
   * @throws {Error} If the option is set, not `false`, and is not, or does not
   *  resolve to a node.
   */


  var getNodeForOption = function getNodeForOption(optionName) {
    var optionValue = config[optionName];

    if (typeof optionValue === 'function') {
      for (var _len2 = arguments.length, params = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        params[_key2 - 1] = arguments[_key2];
      }

      optionValue = optionValue.apply(void 0, params);
    }

    if (optionValue === true) {
      optionValue = undefined; // use default value
    }

    if (!optionValue) {
      if (optionValue === undefined || optionValue === false) {
        return optionValue;
      } // else, empty string (invalid), null (invalid), 0 (invalid)


      throw new Error("`".concat(optionName, "` was specified but was not a node, or did not return a node"));
    }

    var node = optionValue; // could be HTMLElement, SVGElement, or non-empty string at this point

    if (typeof optionValue === 'string') {
      node = doc.querySelector(optionValue); // resolve to node, or null if fails

      if (!node) {
        throw new Error("`".concat(optionName, "` as selector refers to no known node"));
      }
    }

    return node;
  };

  var getInitialFocusNode = function getInitialFocusNode() {
    var node = getNodeForOption('initialFocus'); // false explicitly indicates we want no initialFocus at all

    if (node === false) {
      return false;
    }

    if (node === undefined) {
      // option not specified: use fallback options
      if (findContainerIndex(doc.activeElement) >= 0) {
        node = doc.activeElement;
      } else {
        var firstTabbableGroup = state.tabbableGroups[0];
        var firstTabbableNode = firstTabbableGroup && firstTabbableGroup.firstTabbableNode; // NOTE: `fallbackFocus` option function cannot return `false` (not supported)

        node = firstTabbableNode || getNodeForOption('fallbackFocus');
      }
    }

    if (!node) {
      throw new Error('Your focus-trap needs to have at least one focusable element');
    }

    return node;
  };

  var updateTabbableNodes = function updateTabbableNodes() {
    state.containerGroups = state.containers.map(function (container) {
      var tabbableNodes = tabbable(container, config.tabbableOptions); // NOTE: if we have tabbable nodes, we must have focusable nodes; focusable nodes
      //  are a superset of tabbable nodes

      var focusableNodes = focusable(container, config.tabbableOptions);
      return {
        container: container,
        tabbableNodes: tabbableNodes,
        focusableNodes: focusableNodes,
        firstTabbableNode: tabbableNodes.length > 0 ? tabbableNodes[0] : null,
        lastTabbableNode: tabbableNodes.length > 0 ? tabbableNodes[tabbableNodes.length - 1] : null,

        /**
         * Finds the __tabbable__ node that follows the given node in the specified direction,
         *  in this container, if any.
         * @param {HTMLElement} node
         * @param {boolean} [forward] True if going in forward tab order; false if going
         *  in reverse.
         * @returns {HTMLElement|undefined} The next tabbable node, if any.
         */
        nextTabbableNode: function nextTabbableNode(node) {
          var forward = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
          // NOTE: If tabindex is positive (in order to manipulate the tab order separate
          //  from the DOM order), this __will not work__ because the list of focusableNodes,
          //  while it contains tabbable nodes, does not sort its nodes in any order other
          //  than DOM order, because it can't: Where would you place focusable (but not
          //  tabbable) nodes in that order? They have no order, because they aren't tabbale...
          // Support for positive tabindex is already broken and hard to manage (possibly
          //  not supportable, TBD), so this isn't going to make things worse than they
          //  already are, and at least makes things better for the majority of cases where
          //  tabindex is either 0/unset or negative.
          // FYI, positive tabindex issue: https://github.com/focus-trap/focus-trap/issues/375
          var nodeIdx = focusableNodes.findIndex(function (n) {
            return n === node;
          });

          if (nodeIdx < 0) {
            return undefined;
          }

          if (forward) {
            return focusableNodes.slice(nodeIdx + 1).find(function (n) {
              return isTabbable(n, config.tabbableOptions);
            });
          }

          return focusableNodes.slice(0, nodeIdx).reverse().find(function (n) {
            return isTabbable(n, config.tabbableOptions);
          });
        }
      };
    });
    state.tabbableGroups = state.containerGroups.filter(function (group) {
      return group.tabbableNodes.length > 0;
    }); // throw if no groups have tabbable nodes and we don't have a fallback focus node either

    if (state.tabbableGroups.length <= 0 && !getNodeForOption('fallbackFocus') // returning false not supported for this option
    ) {
      throw new Error('Your focus-trap must have at least one container with at least one tabbable node in it at all times');
    }
  };

  var tryFocus = function tryFocus(node) {
    if (node === false) {
      return;
    }

    if (node === doc.activeElement) {
      return;
    }

    if (!node || !node.focus) {
      tryFocus(getInitialFocusNode());
      return;
    }

    node.focus({
      preventScroll: !!config.preventScroll
    });
    state.mostRecentlyFocusedNode = node;

    if (isSelectableInput(node)) {
      node.select();
    }
  };

  var getReturnFocusNode = function getReturnFocusNode(previousActiveElement) {
    var node = getNodeForOption('setReturnFocus', previousActiveElement);
    return node ? node : node === false ? false : previousActiveElement;
  }; // This needs to be done on mousedown and touchstart instead of click
  // so that it precedes the focus event.


  var checkPointerDown = function checkPointerDown(e) {
    var target = getActualTarget(e);

    if (findContainerIndex(target) >= 0) {
      // allow the click since it ocurred inside the trap
      return;
    }

    if (valueOrHandler(config.clickOutsideDeactivates, e)) {
      // immediately deactivate the trap
      trap.deactivate({
        // if, on deactivation, we should return focus to the node originally-focused
        //  when the trap was activated (or the configured `setReturnFocus` node),
        //  then assume it's also OK to return focus to the outside node that was
        //  just clicked, causing deactivation, as long as that node is focusable;
        //  if it isn't focusable, then return focus to the original node focused
        //  on activation (or the configured `setReturnFocus` node)
        // NOTE: by setting `returnFocus: false`, deactivate() will do nothing,
        //  which will result in the outside click setting focus to the node
        //  that was clicked, whether it's focusable or not; by setting
        //  `returnFocus: true`, we'll attempt to re-focus the node originally-focused
        //  on activation (or the configured `setReturnFocus` node)
        returnFocus: config.returnFocusOnDeactivate && !isFocusable(target, config.tabbableOptions)
      });
      return;
    } // This is needed for mobile devices.
    // (If we'll only let `click` events through,
    // then on mobile they will be blocked anyways if `touchstart` is blocked.)


    if (valueOrHandler(config.allowOutsideClick, e)) {
      // allow the click outside the trap to take place
      return;
    } // otherwise, prevent the click


    e.preventDefault();
  }; // In case focus escapes the trap for some strange reason, pull it back in.


  var checkFocusIn = function checkFocusIn(e) {
    var target = getActualTarget(e);
    var targetContained = findContainerIndex(target) >= 0; // In Firefox when you Tab out of an iframe the Document is briefly focused.

    if (targetContained || target instanceof Document) {
      if (targetContained) {
        state.mostRecentlyFocusedNode = target;
      }
    } else {
      // escaped! pull it back in to where it just left
      e.stopImmediatePropagation();
      tryFocus(state.mostRecentlyFocusedNode || getInitialFocusNode());
    }
  }; // Hijack Tab events on the first and last focusable nodes of the trap,
  // in order to prevent focus from escaping. If it escapes for even a
  // moment it can end up scrolling the page and causing confusion so we
  // kind of need to capture the action at the keydown phase.


  var checkTab = function checkTab(e) {
    var target = getActualTarget(e);
    updateTabbableNodes();
    var destinationNode = null;

    if (state.tabbableGroups.length > 0) {
      // make sure the target is actually contained in a group
      // NOTE: the target may also be the container itself if it's focusable
      //  with tabIndex='-1' and was given initial focus
      var containerIndex = findContainerIndex(target);
      var containerGroup = containerIndex >= 0 ? state.containerGroups[containerIndex] : undefined;

      if (containerIndex < 0) {
        // target not found in any group: quite possible focus has escaped the trap,
        //  so bring it back in to...
        if (e.shiftKey) {
          // ...the last node in the last group
          destinationNode = state.tabbableGroups[state.tabbableGroups.length - 1].lastTabbableNode;
        } else {
          // ...the first node in the first group
          destinationNode = state.tabbableGroups[0].firstTabbableNode;
        }
      } else if (e.shiftKey) {
        // REVERSE
        // is the target the first tabbable node in a group?
        var startOfGroupIndex = findIndex(state.tabbableGroups, function (_ref2) {
          var firstTabbableNode = _ref2.firstTabbableNode;
          return target === firstTabbableNode;
        });

        if (startOfGroupIndex < 0 && (containerGroup.container === target || isFocusable(target, config.tabbableOptions) && !isTabbable(target, config.tabbableOptions) && !containerGroup.nextTabbableNode(target, false))) {
          // an exception case where the target is either the container itself, or
          //  a non-tabbable node that was given focus (i.e. tabindex is negative
          //  and user clicked on it or node was programmatically given focus)
          //  and is not followed by any other tabbable node, in which
          //  case, we should handle shift+tab as if focus were on the container's
          //  first tabbable node, and go to the last tabbable node of the LAST group
          startOfGroupIndex = containerIndex;
        }

        if (startOfGroupIndex >= 0) {
          // YES: then shift+tab should go to the last tabbable node in the
          //  previous group (and wrap around to the last tabbable node of
          //  the LAST group if it's the first tabbable node of the FIRST group)
          var destinationGroupIndex = startOfGroupIndex === 0 ? state.tabbableGroups.length - 1 : startOfGroupIndex - 1;
          var destinationGroup = state.tabbableGroups[destinationGroupIndex];
          destinationNode = destinationGroup.lastTabbableNode;
        }
      } else {
        // FORWARD
        // is the target the last tabbable node in a group?
        var lastOfGroupIndex = findIndex(state.tabbableGroups, function (_ref3) {
          var lastTabbableNode = _ref3.lastTabbableNode;
          return target === lastTabbableNode;
        });

        if (lastOfGroupIndex < 0 && (containerGroup.container === target || isFocusable(target, config.tabbableOptions) && !isTabbable(target, config.tabbableOptions) && !containerGroup.nextTabbableNode(target))) {
          // an exception case where the target is the container itself, or
          //  a non-tabbable node that was given focus (i.e. tabindex is negative
          //  and user clicked on it or node was programmatically given focus)
          //  and is not followed by any other tabbable node, in which
          //  case, we should handle tab as if focus were on the container's
          //  last tabbable node, and go to the first tabbable node of the FIRST group
          lastOfGroupIndex = containerIndex;
        }

        if (lastOfGroupIndex >= 0) {
          // YES: then tab should go to the first tabbable node in the next
          //  group (and wrap around to the first tabbable node of the FIRST
          //  group if it's the last tabbable node of the LAST group)
          var _destinationGroupIndex = lastOfGroupIndex === state.tabbableGroups.length - 1 ? 0 : lastOfGroupIndex + 1;

          var _destinationGroup = state.tabbableGroups[_destinationGroupIndex];
          destinationNode = _destinationGroup.firstTabbableNode;
        }
      }
    } else {
      // NOTE: the fallbackFocus option does not support returning false to opt-out
      destinationNode = getNodeForOption('fallbackFocus');
    }

    if (destinationNode) {
      e.preventDefault();
      tryFocus(destinationNode);
    } // else, let the browser take care of [shift+]tab and move the focus

  };

  var checkKey = function checkKey(e) {
    if (isEscapeEvent(e) && valueOrHandler(config.escapeDeactivates, e) !== false) {
      e.preventDefault();
      trap.deactivate();
      return;
    }

    if (isTabEvent(e)) {
      checkTab(e);
      return;
    }
  };

  var checkClick = function checkClick(e) {
    var target = getActualTarget(e);

    if (findContainerIndex(target) >= 0) {
      return;
    }

    if (valueOrHandler(config.clickOutsideDeactivates, e)) {
      return;
    }

    if (valueOrHandler(config.allowOutsideClick, e)) {
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
  }; //
  // EVENT LISTENERS
  //


  var addListeners = function addListeners() {
    if (!state.active) {
      return;
    } // There can be only one listening focus trap at a time


    activeFocusTraps.activateTrap(trap); // Delay ensures that the focused element doesn't capture the event
    // that caused the focus trap activation.

    state.delayInitialFocusTimer = config.delayInitialFocus ? delay(function () {
      tryFocus(getInitialFocusNode());
    }) : tryFocus(getInitialFocusNode());
    doc.addEventListener('focusin', checkFocusIn, true);
    doc.addEventListener('mousedown', checkPointerDown, {
      capture: true,
      passive: false
    });
    doc.addEventListener('touchstart', checkPointerDown, {
      capture: true,
      passive: false
    });
    doc.addEventListener('click', checkClick, {
      capture: true,
      passive: false
    });
    doc.addEventListener('keydown', checkKey, {
      capture: true,
      passive: false
    });
    return trap;
  };

  var removeListeners = function removeListeners() {
    if (!state.active) {
      return;
    }

    doc.removeEventListener('focusin', checkFocusIn, true);
    doc.removeEventListener('mousedown', checkPointerDown, true);
    doc.removeEventListener('touchstart', checkPointerDown, true);
    doc.removeEventListener('click', checkClick, true);
    doc.removeEventListener('keydown', checkKey, true);
    return trap;
  }; //
  // TRAP DEFINITION
  //


  trap = {
    get active() {
      return state.active;
    },

    get paused() {
      return state.paused;
    },

    activate: function activate(activateOptions) {
      if (state.active) {
        return this;
      }

      var onActivate = getOption(activateOptions, 'onActivate');
      var onPostActivate = getOption(activateOptions, 'onPostActivate');
      var checkCanFocusTrap = getOption(activateOptions, 'checkCanFocusTrap');

      if (!checkCanFocusTrap) {
        updateTabbableNodes();
      }

      state.active = true;
      state.paused = false;
      state.nodeFocusedBeforeActivation = doc.activeElement;

      if (onActivate) {
        onActivate();
      }

      var finishActivation = function finishActivation() {
        if (checkCanFocusTrap) {
          updateTabbableNodes();
        }

        addListeners();

        if (onPostActivate) {
          onPostActivate();
        }
      };

      if (checkCanFocusTrap) {
        checkCanFocusTrap(state.containers.concat()).then(finishActivation, finishActivation);
        return this;
      }

      finishActivation();
      return this;
    },
    deactivate: function deactivate(deactivateOptions) {
      if (!state.active) {
        return this;
      }

      var options = _objectSpread2({
        onDeactivate: config.onDeactivate,
        onPostDeactivate: config.onPostDeactivate,
        checkCanReturnFocus: config.checkCanReturnFocus
      }, deactivateOptions);

      clearTimeout(state.delayInitialFocusTimer); // noop if undefined

      state.delayInitialFocusTimer = undefined;
      removeListeners();
      state.active = false;
      state.paused = false;
      activeFocusTraps.deactivateTrap(trap);
      var onDeactivate = getOption(options, 'onDeactivate');
      var onPostDeactivate = getOption(options, 'onPostDeactivate');
      var checkCanReturnFocus = getOption(options, 'checkCanReturnFocus');
      var returnFocus = getOption(options, 'returnFocus', 'returnFocusOnDeactivate');

      if (onDeactivate) {
        onDeactivate();
      }

      var finishDeactivation = function finishDeactivation() {
        delay(function () {
          if (returnFocus) {
            tryFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation));
          }

          if (onPostDeactivate) {
            onPostDeactivate();
          }
        });
      };

      if (returnFocus && checkCanReturnFocus) {
        checkCanReturnFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation)).then(finishDeactivation, finishDeactivation);
        return this;
      }

      finishDeactivation();
      return this;
    },
    pause: function pause() {
      if (state.paused || !state.active) {
        return this;
      }

      state.paused = true;
      removeListeners();
      return this;
    },
    unpause: function unpause() {
      if (!state.paused || !state.active) {
        return this;
      }

      state.paused = false;
      updateTabbableNodes();
      addListeners();
      return this;
    },
    updateContainerElements: function updateContainerElements(containerElements) {
      var elementsAsArray = [].concat(containerElements).filter(Boolean);
      state.containers = elementsAsArray.map(function (element) {
        return typeof element === 'string' ? doc.querySelector(element) : element;
      });

      if (state.active) {
        updateTabbableNodes();
      }

      return this;
    }
  }; // initialize container elements

  trap.updateContainerElements(elements);
  return trap;
};

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// Older browsers don't support event options, feature detect it.

// Adopted and modified solution from Bohdan Didukh (2017)
// https://stackoverflow.com/questions/41594997/ios-10-safari-prevent-scrolling-behind-a-fixed-overlay-and-maintain-scroll-posi

var hasPassiveEvents = false;
if (typeof window !== 'undefined') {
  var passiveTestOptions = {
    get passive() {
      hasPassiveEvents = true;
      return undefined;
    }
  };
  window.addEventListener('testPassive', null, passiveTestOptions);
  window.removeEventListener('testPassive', null, passiveTestOptions);
}

var isIosDevice = typeof window !== 'undefined' && window.navigator && window.navigator.platform && (/iP(ad|hone|od)/.test(window.navigator.platform) || window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);


var locks = [];
var documentListenerAdded = false;
var initialClientY = -1;
var previousBodyOverflowSetting = void 0;
var previousBodyPaddingRight = void 0;

// returns true if `el` should be allowed to receive touchmove events.
var allowTouchMove = function allowTouchMove(el) {
  return locks.some(function (lock) {
    if (lock.options.allowTouchMove && lock.options.allowTouchMove(el)) {
      return true;
    }

    return false;
  });
};

var preventDefault$1 = function preventDefault(rawEvent) {
  var e = rawEvent || window.event;

  // For the case whereby consumers adds a touchmove event listener to document.
  // Recall that we do document.addEventListener('touchmove', preventDefault, { passive: false })
  // in disableBodyScroll - so if we provide this opportunity to allowTouchMove, then
  // the touchmove event on document will break.
  if (allowTouchMove(e.target)) {
    return true;
  }

  // Do not prevent if the event has more than one touch (usually meaning this is a multi touch gesture like pinch to zoom).
  if (e.touches.length > 1) return true;

  if (e.preventDefault) e.preventDefault();

  return false;
};

var setOverflowHidden = function setOverflowHidden(options) {
  // If previousBodyPaddingRight is already set, don't set it again.
  if (previousBodyPaddingRight === undefined) {
    var _reserveScrollBarGap = !!options && options.reserveScrollBarGap === true;
    var scrollBarGap = window.innerWidth - document.documentElement.clientWidth;

    if (_reserveScrollBarGap && scrollBarGap > 0) {
      previousBodyPaddingRight = document.body.style.paddingRight;
      document.body.style.paddingRight = scrollBarGap + 'px';
    }
  }

  // If previousBodyOverflowSetting is already set, don't set it again.
  if (previousBodyOverflowSetting === undefined) {
    previousBodyOverflowSetting = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
};

var restoreOverflowSetting = function restoreOverflowSetting() {
  if (previousBodyPaddingRight !== undefined) {
    document.body.style.paddingRight = previousBodyPaddingRight;

    // Restore previousBodyPaddingRight to undefined so setOverflowHidden knows it
    // can be set again.
    previousBodyPaddingRight = undefined;
  }

  if (previousBodyOverflowSetting !== undefined) {
    document.body.style.overflow = previousBodyOverflowSetting;

    // Restore previousBodyOverflowSetting to undefined
    // so setOverflowHidden knows it can be set again.
    previousBodyOverflowSetting = undefined;
  }
};

// https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#Problems_and_solutions
var isTargetElementTotallyScrolled = function isTargetElementTotallyScrolled(targetElement) {
  return targetElement ? targetElement.scrollHeight - targetElement.scrollTop <= targetElement.clientHeight : false;
};

var handleScroll = function handleScroll(event, targetElement) {
  var clientY = event.targetTouches[0].clientY - initialClientY;

  if (allowTouchMove(event.target)) {
    return false;
  }

  if (targetElement && targetElement.scrollTop === 0 && clientY > 0) {
    // element is at the top of its scroll.
    return preventDefault$1(event);
  }

  if (isTargetElementTotallyScrolled(targetElement) && clientY < 0) {
    // element is at the bottom of its scroll.
    return preventDefault$1(event);
  }

  event.stopPropagation();
  return true;
};

var disableBodyScroll = function disableBodyScroll(targetElement, options) {
  // targetElement must be provided
  if (!targetElement) {
    // eslint-disable-next-line no-console
    console.error('disableBodyScroll unsuccessful - targetElement must be provided when calling disableBodyScroll on IOS devices.');
    return;
  }

  // disableBodyScroll must not have been called on this targetElement before
  if (locks.some(function (lock) {
    return lock.targetElement === targetElement;
  })) {
    return;
  }

  var lock = {
    targetElement: targetElement,
    options: options || {}
  };

  locks = [].concat(_toConsumableArray(locks), [lock]);

  if (isIosDevice) {
    targetElement.ontouchstart = function (event) {
      if (event.targetTouches.length === 1) {
        // detect single touch.
        initialClientY = event.targetTouches[0].clientY;
      }
    };
    targetElement.ontouchmove = function (event) {
      if (event.targetTouches.length === 1) {
        // detect single touch.
        handleScroll(event, targetElement);
      }
    };

    if (!documentListenerAdded) {
      document.addEventListener('touchmove', preventDefault$1, hasPassiveEvents ? { passive: false } : undefined);
      documentListenerAdded = true;
    }
  } else {
    setOverflowHidden(options);
  }
};

var enableBodyScroll = function enableBodyScroll(targetElement) {
  if (!targetElement) {
    // eslint-disable-next-line no-console
    console.error('enableBodyScroll unsuccessful - targetElement must be provided when calling enableBodyScroll on IOS devices.');
    return;
  }

  locks = locks.filter(function (lock) {
    return lock.targetElement !== targetElement;
  });

  if (isIosDevice) {
    targetElement.ontouchstart = null;
    targetElement.ontouchmove = null;

    if (documentListenerAdded && locks.length === 0) {
      document.removeEventListener('touchmove', preventDefault$1, hasPassiveEvents ? { passive: false } : undefined);
      documentListenerAdded = false;
    }
  } else if (!locks.length) {
    restoreOverflowSetting();
  }
};

/**
 * Image Helper Functions
 * -----------------------------------------------------------------------------
 * A collection of functions that help with basic image operations.
 *
 */
/**
 * Adds a Shopify size attribute to a URL
 *
 * @param src
 * @param size
 * @returns {*}
 */

function getSizedImageUrl(src, size) {
  if (size === null) {
    return src;
  }

  if (size === "master") {
    return removeProtocol(src);
  }

  var match = src.match(/\.(jpg|jpeg|gif|png|bmp|bitmap|tiff|tif|webp)(\?v=\d+)?$/i);

  if (match) {
    var prefix = src.split(match[0]);
    var suffix = match[0];
    return removeProtocol(prefix[0] + "_" + size + suffix);
  } else {
    return null;
  }
}
function removeProtocol(path) {
  return path.replace(/http(s)?:/, "");
}

const {
  strings: {
    products: strings$1
  }
} = window.theme;
const selectors$j = {
  unitPriceContainer: "[data-unit-price-container]",
  unitPrice: "[data-unit-price]",
  unitPriceBase: "[data-unit-base]"
};
const classes$d = {
  available: "unit-price--available"
};

const updateUnitPrices = (container, variant) => {
  const unitPriceContainers = t$3(selectors$j.unitPriceContainer, container);
  const unitPrices = t$3(selectors$j.unitPrice, container);
  const unitPriceBases = t$3(selectors$j.unitPriceBase, container);
  const showUnitPricing = !variant || !variant.unit_price;
  l(unitPriceContainers, classes$d.available, !showUnitPricing);
  if (!variant || !variant.unit_price) return;

  _replaceText(unitPrices, formatMoney(variant.unit_price));

  _replaceText(unitPriceBases, _getBaseUnit(variant.unit_price_measurement));
};

const renderUnitPrice = (unitPrice, unitPriceMeasurement) => {
  if (unitPrice && unitPriceMeasurement) {
    const label = strings$1.product.unitPrice;
    return `
      <div class="unit-price ${classes$d.available}">
        <dt>
          <span class="visually-hidden visually-hidden--inline">${label}</span>
        </dt>
        <dd class="unit-price__price">
          <span data-unit-price>${formatMoney(unitPrice)}</span><span aria-hidden="true">/</span><span class="visually-hidden">${strings$1.product.unitPriceSeparator}&nbsp;</span><span data-unit-base>${_getBaseUnit(unitPriceMeasurement)}</span>
        </dd>
      </div>
    `;
  }

  return "";
};

const _getBaseUnit = unitPriceMeasurement => {
  return unitPriceMeasurement.reference_value === 1 ? unitPriceMeasurement.reference_unit : unitPriceMeasurement.reference_value + unitPriceMeasurement.reference_unit;
};

const _replaceText = (nodeList, replacementText) => {
  nodeList.forEach(node => node.innerText = replacementText);
};

const classes$c = {
  visible: "is-visible",
  active: "active",
  fixed: "is-fixed"
};
const selectors$i = {
  productTitle: "[data-store-availability-product-title]",
  variantTitle: "[data-store-availability-variant-title]",
  productCard: "[data-store-availability-product]",
  storeListcontainer: "[data-store-list-container]",
  wash: "[data-store-availability-modal-wash]"
};

const storeAvailabilityModal = node => {
  var focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  const wash = n$1(selectors$i.wash, node.parentNode);
  const productCard = n$1(selectors$i.productCard, node);
  const storeListContainer = n$1(selectors$i.storeListcontainer, node);
  const events = [e$2(wash, "click", e => {
    e.preventDefault();

    _close();
  }), e$2(node, "keydown", ({
    keyCode
  }) => {
    if (keyCode === 27) _close();
  }), c("availability:showMore", ({
    product,
    variant,
    storeList,
    options
  }) => {
    productCard.innerHTML = _renderProductCard(product, variant, options);

    _renderAvailabilityList(storeList);

    _open();
  })];

  const _renderAvailabilityList = storeList => {
    storeListContainer.innerHTML = "";
    storeListContainer.appendChild(storeList);
  };

  const _renderProductCard = ({
    featured_image: image,
    title
  }, {
    title: variant_title,
    featured_image,
    price,
    unit_price,
    unit_price_measurement
  }, {
    hideVariantTitle
  }) => {
    let productImage = _getVariantImage(image, featured_image);

    return `
      <div class="store-availbility-modal__product-card">
        ${productImage ? `
            <div class='store-availbility-modal__product-card-image'>
              <img src='${productImage}' alt='${title}'/>
            </div>
          ` : ""}
        <div class='store-availbility-modal__product-card-details'>
          <div>
            <h4>
              <span>${title}</span>
            </h4>
            <div class="store-availbility-modal__product-price-wrapper">
              <span class="store-availbility-modal__product-price">${formatMoney(price)}</span>
              ${renderUnitPrice(unit_price, unit_price_measurement)}
            </div>
            <div class="store-availbility-modal__product-card-variant${hideVariantTitle ? " hidden" : ""}">
              ${variant_title}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const _getVariantImage = (productImage, variantImage) => {
    if (!productImage && !variantImage) return "";

    if (variantImage) {
      return _updateImageSize(variantImage.src);
    }

    return _updateImageSize(productImage);
  };

  const _updateImageSize = imageUrl => {
    return getSizedImageUrl(imageUrl, "200x");
  };

  const _open = () => {
    // Due to this component being shared between templates we have to
    // animate around it being fixed to the window
    u(node, classes$c.fixed);
    setTimeout(() => {
      u(node, classes$c.visible);
      u(node, classes$c.active);
    }, 50);
    node.setAttribute("aria-hidden", "false");
    focusTrap.activate();
    disableBodyScroll(node, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute("data-scroll-lock-ignore") !== null) {
            return true;
          }

          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
  };

  const _close = () => {
    focusTrap.deactivate();
    i(node, classes$c.active);
    i(node, classes$c.visible);
    node.setAttribute("aria-hidden", "true");
    enableBodyScroll(node);
    setTimeout(() => {
      i(node, classes$c.fixed);
    }, 300);
  };

  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };

  return {
    unload
  };
};

/*!
 * slide-anim
 * https://github.com/yomotsu/slide-anim
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 */
var global$2 = window;
var isPromiseSuppoted = typeof global$2.Promise === 'function';
var PromiseLike = isPromiseSuppoted ? global$2.Promise : (function () {
    function PromiseLike(executor) {
        var callback = function () { };
        var resolve = function () {
            callback();
        };
        executor(resolve);
        return {
            then: function (_callback) {
                callback = _callback;
            }
        };
    }
    return PromiseLike;
}());

var pool = [];
var inAnimItems = {
    add: function (el, defaultStyle, timeoutId, onCancelled) {
        var inAnimItem = { el: el, defaultStyle: defaultStyle, timeoutId: timeoutId, onCancelled: onCancelled };
        this.remove(el);
        pool.push(inAnimItem);
    },
    remove: function (el) {
        var index = inAnimItems.findIndex(el);
        if (index === -1)
            return;
        var inAnimItem = pool[index];
        clearTimeout(inAnimItem.timeoutId);
        inAnimItem.onCancelled();
        pool.splice(index, 1);
    },
    find: function (el) {
        return pool[inAnimItems.findIndex(el)];
    },
    findIndex: function (el) {
        var index = -1;
        pool.some(function (item, i) {
            if (item.el === el) {
                index = i;
                return true;
            }
            return false;
        });
        return index;
    }
};

var CSS_EASEOUT_EXPO = 'cubic-bezier( 0.19, 1, 0.22, 1 )';
function slideDown(el, options) {
    if (options === void 0) { options = {}; }
    return new PromiseLike(function (resolve) {
        if (inAnimItems.findIndex(el) !== -1)
            return;
        var _isVisible = isVisible(el);
        var hasEndHeight = typeof options.endHeight === 'number';
        var display = options.display || 'block';
        var duration = options.duration || 400;
        var onCancelled = options.onCancelled || function () { };
        var defaultStyle = el.getAttribute('style') || '';
        var style = window.getComputedStyle(el);
        var defaultStyles = getDefaultStyles(el, display);
        var isBorderBox = /border-box/.test(style.getPropertyValue('box-sizing'));
        var contentHeight = defaultStyles.height;
        var minHeight = defaultStyles.minHeight;
        var paddingTop = defaultStyles.paddingTop;
        var paddingBottom = defaultStyles.paddingBottom;
        var borderTop = defaultStyles.borderTop;
        var borderBottom = defaultStyles.borderBottom;
        var cssDuration = duration + "ms";
        var cssEasing = CSS_EASEOUT_EXPO;
        var cssTransition = [
            "height " + cssDuration + " " + cssEasing,
            "min-height " + cssDuration + " " + cssEasing,
            "padding " + cssDuration + " " + cssEasing,
            "border-width " + cssDuration + " " + cssEasing
        ].join();
        var startHeight = _isVisible ? style.height : '0px';
        var startMinHeight = _isVisible ? style.minHeight : '0px';
        var startPaddingTop = _isVisible ? style.paddingTop : '0px';
        var startPaddingBottom = _isVisible ? style.paddingBottom : '0px';
        var startBorderTopWidth = _isVisible ? style.borderTopWidth : '0px';
        var startBorderBottomWidth = _isVisible ? style.borderBottomWidth : '0px';
        var endHeight = (function () {
            if (hasEndHeight)
                return options.endHeight + "px";
            return !isBorderBox ?
                contentHeight - paddingTop - paddingBottom + "px" :
                contentHeight + borderTop + borderBottom + "px";
        })();
        var endMinHeight = minHeight + "px";
        var endPaddingTop = paddingTop + "px";
        var endPaddingBottom = paddingBottom + "px";
        var endBorderTopWidth = borderTop + "px";
        var endBorderBottomWidth = borderBottom + "px";
        if (startHeight === endHeight &&
            startPaddingTop === endPaddingTop &&
            startPaddingBottom === endPaddingBottom &&
            startBorderTopWidth === endBorderTopWidth &&
            startBorderBottomWidth === endBorderBottomWidth) {
            resolve();
            return;
        }
        requestAnimationFrame(function () {
            el.style.height = startHeight;
            el.style.minHeight = startMinHeight;
            el.style.paddingTop = startPaddingTop;
            el.style.paddingBottom = startPaddingBottom;
            el.style.borderTopWidth = startBorderTopWidth;
            el.style.borderBottomWidth = startBorderBottomWidth;
            el.style.display = display;
            el.style.overflow = 'hidden';
            el.style.visibility = 'visible';
            el.style.transition = cssTransition;
            el.style.webkitTransition = cssTransition;
            requestAnimationFrame(function () {
                el.style.height = endHeight;
                el.style.minHeight = endMinHeight;
                el.style.paddingTop = endPaddingTop;
                el.style.paddingBottom = endPaddingBottom;
                el.style.borderTopWidth = endBorderTopWidth;
                el.style.borderBottomWidth = endBorderBottomWidth;
            });
        });
        var timeoutId = setTimeout(function () {
            resetStyle(el);
            el.style.display = display;
            if (hasEndHeight) {
                el.style.height = options.endHeight + "px";
                el.style.overflow = "hidden";
            }
            inAnimItems.remove(el);
            resolve();
        }, duration);
        inAnimItems.add(el, defaultStyle, timeoutId, onCancelled);
    });
}
function slideUp(el, options) {
    if (options === void 0) { options = {}; }
    return new PromiseLike(function (resolve) {
        if (inAnimItems.findIndex(el) !== -1)
            return;
        var _isVisible = isVisible(el);
        var display = options.display || 'block';
        var duration = options.duration || 400;
        var onCancelled = options.onCancelled || function () { };
        if (!_isVisible) {
            resolve();
            return;
        }
        var defaultStyle = el.getAttribute('style') || '';
        var style = window.getComputedStyle(el);
        var isBorderBox = /border-box/.test(style.getPropertyValue('box-sizing'));
        var minHeight = pxToNumber(style.getPropertyValue('min-height'));
        var paddingTop = pxToNumber(style.getPropertyValue('padding-top'));
        var paddingBottom = pxToNumber(style.getPropertyValue('padding-bottom'));
        var borderTop = pxToNumber(style.getPropertyValue('border-top-width'));
        var borderBottom = pxToNumber(style.getPropertyValue('border-bottom-width'));
        var contentHeight = el.scrollHeight;
        var cssDuration = duration + 'ms';
        var cssEasing = CSS_EASEOUT_EXPO;
        var cssTransition = [
            "height " + cssDuration + " " + cssEasing,
            "padding " + cssDuration + " " + cssEasing,
            "border-width " + cssDuration + " " + cssEasing
        ].join();
        var startHeight = !isBorderBox ?
            contentHeight - paddingTop - paddingBottom + "px" :
            contentHeight + borderTop + borderBottom + "px";
        var startMinHeight = minHeight + "px";
        var startPaddingTop = paddingTop + "px";
        var startPaddingBottom = paddingBottom + "px";
        var startBorderTopWidth = borderTop + "px";
        var startBorderBottomWidth = borderBottom + "px";
        requestAnimationFrame(function () {
            el.style.height = startHeight;
            el.style.minHeight = startMinHeight;
            el.style.paddingTop = startPaddingTop;
            el.style.paddingBottom = startPaddingBottom;
            el.style.borderTopWidth = startBorderTopWidth;
            el.style.borderBottomWidth = startBorderBottomWidth;
            el.style.display = display;
            el.style.overflow = 'hidden';
            el.style.transition = cssTransition;
            el.style.webkitTransition = cssTransition;
            requestAnimationFrame(function () {
                el.style.height = '0';
                el.style.minHeight = '0';
                el.style.paddingTop = '0';
                el.style.paddingBottom = '0';
                el.style.borderTopWidth = '0';
                el.style.borderBottomWidth = '0';
            });
        });
        var timeoutId = setTimeout(function () {
            resetStyle(el);
            el.style.display = 'none';
            inAnimItems.remove(el);
            resolve();
        }, duration);
        inAnimItems.add(el, defaultStyle, timeoutId, onCancelled);
    });
}
function slideStop(el) {
    var elementObject = inAnimItems.find(el);
    if (!elementObject)
        return;
    var style = window.getComputedStyle(el);
    var height = style.height;
    var paddingTop = style.paddingTop;
    var paddingBottom = style.paddingBottom;
    var borderTopWidth = style.borderTopWidth;
    var borderBottomWidth = style.borderBottomWidth;
    resetStyle(el);
    el.style.height = height;
    el.style.paddingTop = paddingTop;
    el.style.paddingBottom = paddingBottom;
    el.style.borderTopWidth = borderTopWidth;
    el.style.borderBottomWidth = borderBottomWidth;
    el.style.overflow = 'hidden';
    inAnimItems.remove(el);
}
function isVisible(el) {
    return el.offsetHeight !== 0;
}
function resetStyle(el) {
    el.style.visibility = '';
    el.style.height = '';
    el.style.minHeight = '';
    el.style.paddingTop = '';
    el.style.paddingBottom = '';
    el.style.borderTopWidth = '';
    el.style.borderBottomWidth = '';
    el.style.overflow = '';
    el.style.transition = '';
    el.style.webkitTransition = '';
}
function getDefaultStyles(el, defaultDisplay) {
    if (defaultDisplay === void 0) { defaultDisplay = 'block'; }
    var defaultStyle = el.getAttribute('style') || '';
    var style = window.getComputedStyle(el);
    el.style.visibility = 'hidden';
    el.style.display = defaultDisplay;
    var width = pxToNumber(style.getPropertyValue('width'));
    el.style.position = 'absolute';
    el.style.width = width + "px";
    el.style.height = '';
    el.style.minHeight = '';
    el.style.paddingTop = '';
    el.style.paddingBottom = '';
    el.style.borderTopWidth = '';
    el.style.borderBottomWidth = '';
    var minHeight = pxToNumber(style.getPropertyValue('min-height'));
    var paddingTop = pxToNumber(style.getPropertyValue('padding-top'));
    var paddingBottom = pxToNumber(style.getPropertyValue('padding-bottom'));
    var borderTop = pxToNumber(style.getPropertyValue('border-top-width'));
    var borderBottom = pxToNumber(style.getPropertyValue('border-bottom-width'));
    var height = el.scrollHeight;
    el.setAttribute('style', defaultStyle);
    return {
        height: height,
        minHeight: minHeight,
        paddingTop: paddingTop,
        paddingBottom: paddingBottom,
        borderTop: borderTop,
        borderBottom: borderBottom
    };
}
function pxToNumber(px) {
    return +px.replace(/px/, '');
}

function Accordion(node) {
  const labels = t$3(".accordion__label", node); // Make it accessible by keyboard

  labels.forEach(label => {
    label.href = "#";
    const iconExists = n$1(".icon", label);

    if (!iconExists) {
      const icon = document.createElement("div");
      icon.classList.add("icon");
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24"><path d="M7 10L12 15L17 10H7Z" fill="currentColor"/></svg>`;
      label.append(icon);
    }
  });
  const labelClick = e$2(labels, "click", e => {
    const {
      parentNode: group,
      nextElementSibling: content
    } = e.currentTarget;
    e.preventDefault();
    slideStop(content);

    if (isVisible(content)) {
      slideUp(content);
      group.setAttribute("data-open", false);
    } else {
      slideDown(content);
      group.setAttribute("data-open", true);
    }
  }); // Nicer way to do this? show in CSS?

  const openGroups = t$3('.accordion__group[data-open="true"]', node);
  openGroups.forEach(group => n$1(".accordion__label", group).click());

  function destroy() {
    return () => labelClick();
  }

  return {
    destroy
  };
}

function Accordions(nodes) {
  const accordions = nodes.map(Accordion);

  function destroy() {
    accordions.forEach(accordion => accordion.destroy());
  }

  return {
    accordions,
    destroy
  };
}

const accordions = node => {
  const accordions = Accordions(t$3(".accordion", node));
  return {
    destroy: () => {
      accordions.destroy();
    }
  };
};
function wrapTables(elements = []) {
  elements.forEach(el => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("rte__table-wrapper");
    wrapper.tabIndex = 0;
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
  });
}
function wrapIframes(elements = []) {
  elements.forEach(el => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("rte__iframe");
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
    el.src = el.src;
  });
}

const classes$b = {
  visible: "is-visible",
  active: "active",
  fixed: "is-fixed"
};
const selectors$h = {
  closeBtn: "[data-modal-close]",
  wash: ".modal__wash",
  modalContent: ".modal__content",
  accordion: ".accordion"
};

const modal = node => {
  const focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  const modalContent = n$1(selectors$h.modalContent, node);
  let accordion = null;
  const delegate = new Delegate(document);
  delegate.on("click", selectors$h.wash, () => _close());
  const events = [e$2(n$1(selectors$h.closeBtn, node), "click", e => {
    e.preventDefault();

    _close();
  }), e$2(node, "keydown", ({
    keyCode
  }) => {
    if (keyCode === 27) _close();
  }), c("modal:open", (state, {
    modalContent,
    narrow = false
  }) => {
    l(node, "modal--narrow", narrow);

    _renderModalContent(modalContent);

    _open();
  })];

  const _renderModalContent = content => {
    const clonedContent = content.cloneNode(true);
    modalContent.innerHTML = "";
    modalContent.appendChild(clonedContent);
    wrapIframes(t$3("iframe", modalContent));
    wrapTables(t$3("table", modalContent));

    _initAccordion();
  };

  const _initAccordion = () => {
    accordion = accordions(node);
  };

  const _open = () => {
    // Due to this component being shared between templates we have to
    // animate around it being fixed to the window
    u(node, classes$b.active);
    focusTrap.activate();
    disableBodyScroll(node, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute("data-scroll-lock-ignore") !== null) {
            return true;
          }

          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
  };

  const _close = () => {
    focusTrap.deactivate();
    i(node, classes$b.active);
    enableBodyScroll(node);
    setTimeout(() => {
      modalContent.innerHTML = "";
    }, 300);
  };

  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
    accordion.unload();
  };

  return {
    unload
  };
};

const queries = {
  small: "(max-width: 40em)",
  medium: "(min-width: 40em) and (max-width: 60em)",
  large: "(min-width: 60em)"
};
var viewportWatcher = (() => {
  let currentWidth = checkWidth();

  function checkWidth() {
    if (window.matchMedia(queries.small).matches) {
      return "small";
    } else if (window.matchMedia(queries.medium).matches) {
      return "medium";
    } else if (window.matchMedia(queries.large).matches) {
      return "large";
    }
  }

  e$2(window, "resize", () => {
    const windowWidth = checkWidth();

    if (currentWidth !== windowWidth) {
      currentWidth = windowWidth;
      r$1(`viewport-resize:${currentWidth}`);
    }
  });
});

var ls_objectFit = {exports: {}};

var lazysizes = {exports: {}};

(function (module) {
(function(window, factory) {
	var lazySizes = factory(window, window.document, Date);
	window.lazySizes = lazySizes;
	if(module.exports){
		module.exports = lazySizes;
	}
}(typeof window != 'undefined' ?
      window : {}, 
/**
 * import("./types/global")
 * @typedef { import("./types/lazysizes-config").LazySizesConfigPartial } LazySizesConfigPartial
 */
function l(window, document, Date) { // Pass in the window Date function also for SSR because the Date class can be lost
	/*jshint eqnull:true */

	var lazysizes,
		/**
		 * @type { LazySizesConfigPartial }
		 */
		lazySizesCfg;

	(function(){
		var prop;

		var lazySizesDefaults = {
			lazyClass: 'lazyload',
			loadedClass: 'lazyloaded',
			loadingClass: 'lazyloading',
			preloadClass: 'lazypreload',
			errorClass: 'lazyerror',
			//strictClass: 'lazystrict',
			autosizesClass: 'lazyautosizes',
			fastLoadedClass: 'ls-is-cached',
			iframeLoadMode: 0,
			srcAttr: 'data-src',
			srcsetAttr: 'data-srcset',
			sizesAttr: 'data-sizes',
			//preloadAfterLoad: false,
			minSize: 40,
			customMedia: {},
			init: true,
			expFactor: 1.5,
			hFac: 0.8,
			loadMode: 2,
			loadHidden: true,
			ricTimeout: 0,
			throttleDelay: 125,
		};

		lazySizesCfg = window.lazySizesConfig || window.lazysizesConfig || {};

		for(prop in lazySizesDefaults){
			if(!(prop in lazySizesCfg)){
				lazySizesCfg[prop] = lazySizesDefaults[prop];
			}
		}
	})();

	if (!document || !document.getElementsByClassName) {
		return {
			init: function () {},
			/**
			 * @type { LazySizesConfigPartial }
			 */
			cfg: lazySizesCfg,
			/**
			 * @type { true }
			 */
			noSupport: true,
		};
	}

	var docElem = document.documentElement;

	var supportPicture = window.HTMLPictureElement;

	var _addEventListener = 'addEventListener';

	var _getAttribute = 'getAttribute';

	/**
	 * Update to bind to window because 'this' becomes null during SSR
	 * builds.
	 */
	var addEventListener = window[_addEventListener].bind(window);

	var setTimeout = window.setTimeout;

	var requestAnimationFrame = window.requestAnimationFrame || setTimeout;

	var requestIdleCallback = window.requestIdleCallback;

	var regPicture = /^picture$/i;

	var loadEvents = ['load', 'error', 'lazyincluded', '_lazyloaded'];

	var regClassCache = {};

	var forEach = Array.prototype.forEach;

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var hasClass = function(ele, cls) {
		if(!regClassCache[cls]){
			regClassCache[cls] = new RegExp('(\\s|^)'+cls+'(\\s|$)');
		}
		return regClassCache[cls].test(ele[_getAttribute]('class') || '') && regClassCache[cls];
	};

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var addClass = function(ele, cls) {
		if (!hasClass(ele, cls)){
			ele.setAttribute('class', (ele[_getAttribute]('class') || '').trim() + ' ' + cls);
		}
	};

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var removeClass = function(ele, cls) {
		var reg;
		if ((reg = hasClass(ele,cls))) {
			ele.setAttribute('class', (ele[_getAttribute]('class') || '').replace(reg, ' '));
		}
	};

	var addRemoveLoadEvents = function(dom, fn, add){
		var action = add ? _addEventListener : 'removeEventListener';
		if(add){
			addRemoveLoadEvents(dom, fn);
		}
		loadEvents.forEach(function(evt){
			dom[action](evt, fn);
		});
	};

	/**
	 * @param elem { Element }
	 * @param name { string }
	 * @param detail { any }
	 * @param noBubbles { boolean }
	 * @param noCancelable { boolean }
	 * @returns { CustomEvent }
	 */
	var triggerEvent = function(elem, name, detail, noBubbles, noCancelable){
		var event = document.createEvent('Event');

		if(!detail){
			detail = {};
		}

		detail.instance = lazysizes;

		event.initEvent(name, !noBubbles, !noCancelable);

		event.detail = detail;

		elem.dispatchEvent(event);
		return event;
	};

	var updatePolyfill = function (el, full){
		var polyfill;
		if( !supportPicture && ( polyfill = (window.picturefill || lazySizesCfg.pf) ) ){
			if(full && full.src && !el[_getAttribute]('srcset')){
				el.setAttribute('srcset', full.src);
			}
			polyfill({reevaluate: true, elements: [el]});
		} else if(full && full.src){
			el.src = full.src;
		}
	};

	var getCSS = function (elem, style){
		return (getComputedStyle(elem, null) || {})[style];
	};

	/**
	 *
	 * @param elem { Element }
	 * @param parent { Element }
	 * @param [width] {number}
	 * @returns {number}
	 */
	var getWidth = function(elem, parent, width){
		width = width || elem.offsetWidth;

		while(width < lazySizesCfg.minSize && parent && !elem._lazysizesWidth){
			width =  parent.offsetWidth;
			parent = parent.parentNode;
		}

		return width;
	};

	var rAF = (function(){
		var running, waiting;
		var firstFns = [];
		var secondFns = [];
		var fns = firstFns;

		var run = function(){
			var runFns = fns;

			fns = firstFns.length ? secondFns : firstFns;

			running = true;
			waiting = false;

			while(runFns.length){
				runFns.shift()();
			}

			running = false;
		};

		var rafBatch = function(fn, queue){
			if(running && !queue){
				fn.apply(this, arguments);
			} else {
				fns.push(fn);

				if(!waiting){
					waiting = true;
					(document.hidden ? setTimeout : requestAnimationFrame)(run);
				}
			}
		};

		rafBatch._lsFlush = run;

		return rafBatch;
	})();

	var rAFIt = function(fn, simple){
		return simple ?
			function() {
				rAF(fn);
			} :
			function(){
				var that = this;
				var args = arguments;
				rAF(function(){
					fn.apply(that, args);
				});
			}
		;
	};

	var throttle = function(fn){
		var running;
		var lastTime = 0;
		var gDelay = lazySizesCfg.throttleDelay;
		var rICTimeout = lazySizesCfg.ricTimeout;
		var run = function(){
			running = false;
			lastTime = Date.now();
			fn();
		};
		var idleCallback = requestIdleCallback && rICTimeout > 49 ?
			function(){
				requestIdleCallback(run, {timeout: rICTimeout});

				if(rICTimeout !== lazySizesCfg.ricTimeout){
					rICTimeout = lazySizesCfg.ricTimeout;
				}
			} :
			rAFIt(function(){
				setTimeout(run);
			}, true)
		;

		return function(isPriority){
			var delay;

			if((isPriority = isPriority === true)){
				rICTimeout = 33;
			}

			if(running){
				return;
			}

			running =  true;

			delay = gDelay - (Date.now() - lastTime);

			if(delay < 0){
				delay = 0;
			}

			if(isPriority || delay < 9){
				idleCallback();
			} else {
				setTimeout(idleCallback, delay);
			}
		};
	};

	//based on http://modernjavascript.blogspot.de/2013/08/building-better-debounce.html
	var debounce = function(func) {
		var timeout, timestamp;
		var wait = 99;
		var run = function(){
			timeout = null;
			func();
		};
		var later = function() {
			var last = Date.now() - timestamp;

			if (last < wait) {
				setTimeout(later, wait - last);
			} else {
				(requestIdleCallback || run)(run);
			}
		};

		return function() {
			timestamp = Date.now();

			if (!timeout) {
				timeout = setTimeout(later, wait);
			}
		};
	};

	var loader = (function(){
		var preloadElems, isCompleted, resetPreloadingTimer, loadMode, started;

		var eLvW, elvH, eLtop, eLleft, eLright, eLbottom, isBodyHidden;

		var regImg = /^img$/i;
		var regIframe = /^iframe$/i;

		var supportScroll = ('onscroll' in window) && !(/(gle|ing)bot/.test(navigator.userAgent));

		var shrinkExpand = 0;
		var currentExpand = 0;

		var isLoading = 0;
		var lowRuns = -1;

		var resetPreloading = function(e){
			isLoading--;
			if(!e || isLoading < 0 || !e.target){
				isLoading = 0;
			}
		};

		var isVisible = function (elem) {
			if (isBodyHidden == null) {
				isBodyHidden = getCSS(document.body, 'visibility') == 'hidden';
			}

			return isBodyHidden || !(getCSS(elem.parentNode, 'visibility') == 'hidden' && getCSS(elem, 'visibility') == 'hidden');
		};

		var isNestedVisible = function(elem, elemExpand){
			var outerRect;
			var parent = elem;
			var visible = isVisible(elem);

			eLtop -= elemExpand;
			eLbottom += elemExpand;
			eLleft -= elemExpand;
			eLright += elemExpand;

			while(visible && (parent = parent.offsetParent) && parent != document.body && parent != docElem){
				visible = ((getCSS(parent, 'opacity') || 1) > 0);

				if(visible && getCSS(parent, 'overflow') != 'visible'){
					outerRect = parent.getBoundingClientRect();
					visible = eLright > outerRect.left &&
						eLleft < outerRect.right &&
						eLbottom > outerRect.top - 1 &&
						eLtop < outerRect.bottom + 1
					;
				}
			}

			return visible;
		};

		var checkElements = function() {
			var eLlen, i, rect, autoLoadElem, loadedSomething, elemExpand, elemNegativeExpand, elemExpandVal,
				beforeExpandVal, defaultExpand, preloadExpand, hFac;
			var lazyloadElems = lazysizes.elements;

			if((loadMode = lazySizesCfg.loadMode) && isLoading < 8 && (eLlen = lazyloadElems.length)){

				i = 0;

				lowRuns++;

				for(; i < eLlen; i++){

					if(!lazyloadElems[i] || lazyloadElems[i]._lazyRace){continue;}

					if(!supportScroll || (lazysizes.prematureUnveil && lazysizes.prematureUnveil(lazyloadElems[i]))){unveilElement(lazyloadElems[i]);continue;}

					if(!(elemExpandVal = lazyloadElems[i][_getAttribute]('data-expand')) || !(elemExpand = elemExpandVal * 1)){
						elemExpand = currentExpand;
					}

					if (!defaultExpand) {
						defaultExpand = (!lazySizesCfg.expand || lazySizesCfg.expand < 1) ?
							docElem.clientHeight > 500 && docElem.clientWidth > 500 ? 500 : 370 :
							lazySizesCfg.expand;

						lazysizes._defEx = defaultExpand;

						preloadExpand = defaultExpand * lazySizesCfg.expFactor;
						hFac = lazySizesCfg.hFac;
						isBodyHidden = null;

						if(currentExpand < preloadExpand && isLoading < 1 && lowRuns > 2 && loadMode > 2 && !document.hidden){
							currentExpand = preloadExpand;
							lowRuns = 0;
						} else if(loadMode > 1 && lowRuns > 1 && isLoading < 6){
							currentExpand = defaultExpand;
						} else {
							currentExpand = shrinkExpand;
						}
					}

					if(beforeExpandVal !== elemExpand){
						eLvW = innerWidth + (elemExpand * hFac);
						elvH = innerHeight + elemExpand;
						elemNegativeExpand = elemExpand * -1;
						beforeExpandVal = elemExpand;
					}

					rect = lazyloadElems[i].getBoundingClientRect();

					if ((eLbottom = rect.bottom) >= elemNegativeExpand &&
						(eLtop = rect.top) <= elvH &&
						(eLright = rect.right) >= elemNegativeExpand * hFac &&
						(eLleft = rect.left) <= eLvW &&
						(eLbottom || eLright || eLleft || eLtop) &&
						(lazySizesCfg.loadHidden || isVisible(lazyloadElems[i])) &&
						((isCompleted && isLoading < 3 && !elemExpandVal && (loadMode < 3 || lowRuns < 4)) || isNestedVisible(lazyloadElems[i], elemExpand))){
						unveilElement(lazyloadElems[i]);
						loadedSomething = true;
						if(isLoading > 9){break;}
					} else if(!loadedSomething && isCompleted && !autoLoadElem &&
						isLoading < 4 && lowRuns < 4 && loadMode > 2 &&
						(preloadElems[0] || lazySizesCfg.preloadAfterLoad) &&
						(preloadElems[0] || (!elemExpandVal && ((eLbottom || eLright || eLleft || eLtop) || lazyloadElems[i][_getAttribute](lazySizesCfg.sizesAttr) != 'auto')))){
						autoLoadElem = preloadElems[0] || lazyloadElems[i];
					}
				}

				if(autoLoadElem && !loadedSomething){
					unveilElement(autoLoadElem);
				}
			}
		};

		var throttledCheckElements = throttle(checkElements);

		var switchLoadingClass = function(e){
			var elem = e.target;

			if (elem._lazyCache) {
				delete elem._lazyCache;
				return;
			}

			resetPreloading(e);
			addClass(elem, lazySizesCfg.loadedClass);
			removeClass(elem, lazySizesCfg.loadingClass);
			addRemoveLoadEvents(elem, rafSwitchLoadingClass);
			triggerEvent(elem, 'lazyloaded');
		};
		var rafedSwitchLoadingClass = rAFIt(switchLoadingClass);
		var rafSwitchLoadingClass = function(e){
			rafedSwitchLoadingClass({target: e.target});
		};

		var changeIframeSrc = function(elem, src){
			var loadMode = elem.getAttribute('data-load-mode') || lazySizesCfg.iframeLoadMode;

			// loadMode can be also a string!
			if (loadMode == 0) {
				elem.contentWindow.location.replace(src);
			} else if (loadMode == 1) {
				elem.src = src;
			}
		};

		var handleSources = function(source){
			var customMedia;

			var sourceSrcset = source[_getAttribute](lazySizesCfg.srcsetAttr);

			if( (customMedia = lazySizesCfg.customMedia[source[_getAttribute]('data-media') || source[_getAttribute]('media')]) ){
				source.setAttribute('media', customMedia);
			}

			if(sourceSrcset){
				source.setAttribute('srcset', sourceSrcset);
			}
		};

		var lazyUnveil = rAFIt(function (elem, detail, isAuto, sizes, isImg){
			var src, srcset, parent, isPicture, event, firesLoad;

			if(!(event = triggerEvent(elem, 'lazybeforeunveil', detail)).defaultPrevented){

				if(sizes){
					if(isAuto){
						addClass(elem, lazySizesCfg.autosizesClass);
					} else {
						elem.setAttribute('sizes', sizes);
					}
				}

				srcset = elem[_getAttribute](lazySizesCfg.srcsetAttr);
				src = elem[_getAttribute](lazySizesCfg.srcAttr);

				if(isImg) {
					parent = elem.parentNode;
					isPicture = parent && regPicture.test(parent.nodeName || '');
				}

				firesLoad = detail.firesLoad || (('src' in elem) && (srcset || src || isPicture));

				event = {target: elem};

				addClass(elem, lazySizesCfg.loadingClass);

				if(firesLoad){
					clearTimeout(resetPreloadingTimer);
					resetPreloadingTimer = setTimeout(resetPreloading, 2500);
					addRemoveLoadEvents(elem, rafSwitchLoadingClass, true);
				}

				if(isPicture){
					forEach.call(parent.getElementsByTagName('source'), handleSources);
				}

				if(srcset){
					elem.setAttribute('srcset', srcset);
				} else if(src && !isPicture){
					if(regIframe.test(elem.nodeName)){
						changeIframeSrc(elem, src);
					} else {
						elem.src = src;
					}
				}

				if(isImg && (srcset || isPicture)){
					updatePolyfill(elem, {src: src});
				}
			}

			if(elem._lazyRace){
				delete elem._lazyRace;
			}
			removeClass(elem, lazySizesCfg.lazyClass);

			rAF(function(){
				// Part of this can be removed as soon as this fix is older: https://bugs.chromium.org/p/chromium/issues/detail?id=7731 (2015)
				var isLoaded = elem.complete && elem.naturalWidth > 1;

				if( !firesLoad || isLoaded){
					if (isLoaded) {
						addClass(elem, lazySizesCfg.fastLoadedClass);
					}
					switchLoadingClass(event);
					elem._lazyCache = true;
					setTimeout(function(){
						if ('_lazyCache' in elem) {
							delete elem._lazyCache;
						}
					}, 9);
				}
				if (elem.loading == 'lazy') {
					isLoading--;
				}
			}, true);
		});

		/**
		 *
		 * @param elem { Element }
		 */
		var unveilElement = function (elem){
			if (elem._lazyRace) {return;}
			var detail;

			var isImg = regImg.test(elem.nodeName);

			//allow using sizes="auto", but don't use. it's invalid. Use data-sizes="auto" or a valid value for sizes instead (i.e.: sizes="80vw")
			var sizes = isImg && (elem[_getAttribute](lazySizesCfg.sizesAttr) || elem[_getAttribute]('sizes'));
			var isAuto = sizes == 'auto';

			if( (isAuto || !isCompleted) && isImg && (elem[_getAttribute]('src') || elem.srcset) && !elem.complete && !hasClass(elem, lazySizesCfg.errorClass) && hasClass(elem, lazySizesCfg.lazyClass)){return;}

			detail = triggerEvent(elem, 'lazyunveilread').detail;

			if(isAuto){
				 autoSizer.updateElem(elem, true, elem.offsetWidth);
			}

			elem._lazyRace = true;
			isLoading++;

			lazyUnveil(elem, detail, isAuto, sizes, isImg);
		};

		var afterScroll = debounce(function(){
			lazySizesCfg.loadMode = 3;
			throttledCheckElements();
		});

		var altLoadmodeScrollListner = function(){
			if(lazySizesCfg.loadMode == 3){
				lazySizesCfg.loadMode = 2;
			}
			afterScroll();
		};

		var onload = function(){
			if(isCompleted){return;}
			if(Date.now() - started < 999){
				setTimeout(onload, 999);
				return;
			}


			isCompleted = true;

			lazySizesCfg.loadMode = 3;

			throttledCheckElements();

			addEventListener('scroll', altLoadmodeScrollListner, true);
		};

		return {
			_: function(){
				started = Date.now();

				lazysizes.elements = document.getElementsByClassName(lazySizesCfg.lazyClass);
				preloadElems = document.getElementsByClassName(lazySizesCfg.lazyClass + ' ' + lazySizesCfg.preloadClass);

				addEventListener('scroll', throttledCheckElements, true);

				addEventListener('resize', throttledCheckElements, true);

				addEventListener('pageshow', function (e) {
					if (e.persisted) {
						var loadingElements = document.querySelectorAll('.' + lazySizesCfg.loadingClass);

						if (loadingElements.length && loadingElements.forEach) {
							requestAnimationFrame(function () {
								loadingElements.forEach( function (img) {
									if (img.complete) {
										unveilElement(img);
									}
								});
							});
						}
					}
				});

				if(window.MutationObserver){
					new MutationObserver( throttledCheckElements ).observe( docElem, {childList: true, subtree: true, attributes: true} );
				} else {
					docElem[_addEventListener]('DOMNodeInserted', throttledCheckElements, true);
					docElem[_addEventListener]('DOMAttrModified', throttledCheckElements, true);
					setInterval(throttledCheckElements, 999);
				}

				addEventListener('hashchange', throttledCheckElements, true);

				//, 'fullscreenchange'
				['focus', 'mouseover', 'click', 'load', 'transitionend', 'animationend'].forEach(function(name){
					document[_addEventListener](name, throttledCheckElements, true);
				});

				if((/d$|^c/.test(document.readyState))){
					onload();
				} else {
					addEventListener('load', onload);
					document[_addEventListener]('DOMContentLoaded', throttledCheckElements);
					setTimeout(onload, 20000);
				}

				if(lazysizes.elements.length){
					checkElements();
					rAF._lsFlush();
				} else {
					throttledCheckElements();
				}
			},
			checkElems: throttledCheckElements,
			unveil: unveilElement,
			_aLSL: altLoadmodeScrollListner,
		};
	})();


	var autoSizer = (function(){
		var autosizesElems;

		var sizeElement = rAFIt(function(elem, parent, event, width){
			var sources, i, len;
			elem._lazysizesWidth = width;
			width += 'px';

			elem.setAttribute('sizes', width);

			if(regPicture.test(parent.nodeName || '')){
				sources = parent.getElementsByTagName('source');
				for(i = 0, len = sources.length; i < len; i++){
					sources[i].setAttribute('sizes', width);
				}
			}

			if(!event.detail.dataAttr){
				updatePolyfill(elem, event.detail);
			}
		});
		/**
		 *
		 * @param elem {Element}
		 * @param dataAttr
		 * @param [width] { number }
		 */
		var getSizeElement = function (elem, dataAttr, width){
			var event;
			var parent = elem.parentNode;

			if(parent){
				width = getWidth(elem, parent, width);
				event = triggerEvent(elem, 'lazybeforesizes', {width: width, dataAttr: !!dataAttr});

				if(!event.defaultPrevented){
					width = event.detail.width;

					if(width && width !== elem._lazysizesWidth){
						sizeElement(elem, parent, event, width);
					}
				}
			}
		};

		var updateElementsSizes = function(){
			var i;
			var len = autosizesElems.length;
			if(len){
				i = 0;

				for(; i < len; i++){
					getSizeElement(autosizesElems[i]);
				}
			}
		};

		var debouncedUpdateElementsSizes = debounce(updateElementsSizes);

		return {
			_: function(){
				autosizesElems = document.getElementsByClassName(lazySizesCfg.autosizesClass);
				addEventListener('resize', debouncedUpdateElementsSizes);
			},
			checkElems: debouncedUpdateElementsSizes,
			updateElem: getSizeElement
		};
	})();

	var init = function(){
		if(!init.i && document.getElementsByClassName){
			init.i = true;
			autoSizer._();
			loader._();
		}
	};

	setTimeout(function(){
		if(lazySizesCfg.init){
			init();
		}
	});

	lazysizes = {
		/**
		 * @type { LazySizesConfigPartial }
		 */
		cfg: lazySizesCfg,
		autoSizer: autoSizer,
		loader: loader,
		init: init,
		uP: updatePolyfill,
		aC: addClass,
		rC: removeClass,
		hC: hasClass,
		fire: triggerEvent,
		gW: getWidth,
		rAF: rAF,
	};

	return lazysizes;
}
));
}(lazysizes));

var lazySizes = lazysizes.exports;

(function (module) {
(function(window, factory) {
	if(!window) {return;}
	var globalInstall = function(initialEvent){
		factory(window.lazySizes, initialEvent);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(typeof window != 'undefined' ?
	window : 0, function(window, document, lazySizes, initialEvent) {
	var cloneElementClass;
	var style = document.createElement('a').style;
	var fitSupport = 'objectFit' in style;
	var positionSupport = fitSupport && 'objectPosition' in style;
	var regCssFit = /object-fit["']*\s*:\s*["']*(contain|cover)/;
	var regCssPosition = /object-position["']*\s*:\s*["']*(.+?)(?=($|,|'|"|;))/;
	var blankSrc = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
	var regBgUrlEscape = /\(|\)|'/;
	var positionDefaults = {
		center: 'center',
		'50% 50%': 'center',
	};

	function getObject(element){
		var css = (getComputedStyle(element, null) || {});
		var content = css.fontFamily || '';
		var objectFit = content.match(regCssFit) || '';
		var objectPosition = objectFit && content.match(regCssPosition) || '';

		if(objectPosition){
			objectPosition = objectPosition[1];
		}

		return {
			fit: objectFit && objectFit[1] || '',
			position: positionDefaults[objectPosition] || objectPosition || 'center',
		};
	}

	function generateStyleClass() {
		if (cloneElementClass) {
			return;
		}

		var styleElement = document.createElement('style');

		cloneElementClass = lazySizes.cfg.objectFitClass || 'lazysizes-display-clone';

		document.querySelector('head').appendChild(styleElement);
	}

	function removePrevClone(element) {
		var prev = element.previousElementSibling;

		if (prev && lazySizes.hC(prev, cloneElementClass)) {
			prev.parentNode.removeChild(prev);
			element.style.position = prev.getAttribute('data-position') || '';
			element.style.visibility = prev.getAttribute('data-visibility') || '';
		}
	}

	function initFix(element, config){
		var switchClassesAdded, addedSrc, styleElement, styleElementStyle;
		var lazysizesCfg = lazySizes.cfg;

		var onChange = function(){
			var src = element.currentSrc || element.src;

			if(src && addedSrc !== src){
				addedSrc = src;
				styleElementStyle.backgroundImage = 'url(' + (regBgUrlEscape.test(src) ? JSON.stringify(src) : src ) + ')';

				if(!switchClassesAdded){
					switchClassesAdded = true;
					lazySizes.rC(styleElement, lazysizesCfg.loadingClass);
					lazySizes.aC(styleElement, lazysizesCfg.loadedClass);
				}
			}
		};
		var rafedOnChange = function(){
			lazySizes.rAF(onChange);
		};

		element._lazysizesParentFit = config.fit;

		element.addEventListener('lazyloaded', rafedOnChange, true);
		element.addEventListener('load', rafedOnChange, true);

		lazySizes.rAF(function(){

			var hideElement = element;
			var container = element.parentNode;

			if(container.nodeName.toUpperCase() == 'PICTURE'){
				hideElement = container;
				container = container.parentNode;
			}

			removePrevClone(hideElement);

			if (!cloneElementClass) {
				generateStyleClass();
			}

			styleElement = element.cloneNode(false);
			styleElementStyle = styleElement.style;

			styleElement.addEventListener('load', function(){
				var curSrc = styleElement.currentSrc || styleElement.src;

				if(curSrc && curSrc != blankSrc){
					styleElement.src = blankSrc;
					styleElement.srcset = '';
				}
			});

			lazySizes.rC(styleElement, lazysizesCfg.loadedClass);
			lazySizes.rC(styleElement, lazysizesCfg.lazyClass);
			lazySizes.rC(styleElement, lazysizesCfg.autosizesClass);
			lazySizes.aC(styleElement, lazysizesCfg.loadingClass);
			lazySizes.aC(styleElement, cloneElementClass);

			['data-parent-fit', 'data-parent-container', 'data-object-fit-polyfilled',
				lazysizesCfg.srcsetAttr, lazysizesCfg.srcAttr].forEach(function(attr) {
				styleElement.removeAttribute(attr);
			});

			styleElement.src = blankSrc;
			styleElement.srcset = '';

			styleElementStyle.backgroundRepeat = 'no-repeat';
			styleElementStyle.backgroundPosition = config.position;
			styleElementStyle.backgroundSize = config.fit;

			styleElement.setAttribute('data-position', hideElement.style.position);
			styleElement.setAttribute('data-visibility', hideElement.style.visibility);

			hideElement.style.visibility = 'hidden';
			hideElement.style.position = 'absolute';

			element.setAttribute('data-parent-fit', config.fit);
			element.setAttribute('data-parent-container', 'prev');
			element.setAttribute('data-object-fit-polyfilled', '');
			element._objectFitPolyfilledDisplay = styleElement;

			container.insertBefore(styleElement, hideElement);

			if(element._lazysizesParentFit){
				delete element._lazysizesParentFit;
			}

			if(element.complete){
				onChange();
			}
		});
	}

	if(!fitSupport || !positionSupport){
		var onRead = function(e){
			if(e.detail.instance != lazySizes){return;}

			var element = e.target;
			var obj = getObject(element);

			if(obj.fit && (!fitSupport || (obj.position != 'center'))){
				initFix(element, obj);
				return true;
			}

			return false;
		};

		window.addEventListener('lazybeforesizes', function(e) {
			if(e.detail.instance != lazySizes){return;}
			var element = e.target;

			if (element.getAttribute('data-object-fit-polyfilled') != null && !element._objectFitPolyfilledDisplay) {
				if(!onRead(e)){
					lazySizes.rAF(function () {
						element.removeAttribute('data-object-fit-polyfilled');
					});
				}
			}
		});
		window.addEventListener('lazyunveilread', onRead, true);

		if(initialEvent && initialEvent.detail){
			onRead(initialEvent);
		}
	}
}));
}(ls_objectFit));

var ls_parentFit = {exports: {}};

(function (module) {
(function(window, factory) {
	if(!window) {return;}
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(typeof window != 'undefined' ?
	window : 0, function(window, document, lazySizes) {

	if(!window.addEventListener){return;}

	var regDescriptors = /\s+(\d+)(w|h)\s+(\d+)(w|h)/;
	var regCssFit = /parent-fit["']*\s*:\s*["']*(contain|cover|width)/;
	var regCssObject = /parent-container["']*\s*:\s*["']*(.+?)(?=(\s|$|,|'|"|;))/;
	var regPicture = /^picture$/i;
	var cfg = lazySizes.cfg;

	var getCSS = function (elem){
		return (getComputedStyle(elem, null) || {});
	};

	var parentFit = {

		getParent: function(element, parentSel){
			var parent = element;
			var parentNode = element.parentNode;

			if((!parentSel || parentSel == 'prev') && parentNode && regPicture.test(parentNode.nodeName || '')){
				parentNode = parentNode.parentNode;
			}

			if(parentSel != 'self'){
				if(parentSel == 'prev'){
					parent = element.previousElementSibling;
				} else if(parentSel && (parentNode.closest || window.jQuery)){
					parent = (parentNode.closest ?
							parentNode.closest(parentSel) :
							jQuery(parentNode).closest(parentSel)[0]) ||
						parentNode
					;
				} else {
					parent = parentNode;
				}
			}

			return parent;
		},

		getFit: function(element){
			var tmpMatch, parentObj;
			var css = getCSS(element);
			var content = css.content || css.fontFamily;
			var obj = {
				fit: element._lazysizesParentFit || element.getAttribute('data-parent-fit')
			};

			if(!obj.fit && content && (tmpMatch = content.match(regCssFit))){
				obj.fit = tmpMatch[1];
			}

			if(obj.fit){
				parentObj = element._lazysizesParentContainer || element.getAttribute('data-parent-container');

				if(!parentObj && content && (tmpMatch = content.match(regCssObject))){
					parentObj = tmpMatch[1];
				}

				obj.parent = parentFit.getParent(element, parentObj);


			} else {
				obj.fit = css.objectFit;
			}

			return obj;
		},

		getImageRatio: function(element){
			var i, srcset, media, ratio, match, width, height;
			var parent = element.parentNode;
			var elements = parent && regPicture.test(parent.nodeName || '') ?
					parent.querySelectorAll('source, img') :
					[element]
				;

			for(i = 0; i < elements.length; i++){
				element = elements[i];
				srcset = element.getAttribute(cfg.srcsetAttr) || element.getAttribute('srcset') || element.getAttribute('data-pfsrcset') || element.getAttribute('data-risrcset') || '';
				media = element._lsMedia || element.getAttribute('media');
				media = cfg.customMedia[element.getAttribute('data-media') || media] || media;

				if(srcset && (!media || (window.matchMedia && matchMedia(media) || {}).matches )){
					ratio = parseFloat(element.getAttribute('data-aspectratio'));

					if (!ratio) {
						match = srcset.match(regDescriptors);

						if (match) {
							if(match[2] == 'w'){
								width = match[1];
								height = match[3];
							} else {
								width = match[3];
								height = match[1];
							}
						} else {
							width = element.getAttribute('width');
							height = element.getAttribute('height');
						}

						ratio = width / height;
					}

					break;
				}
			}

			return ratio;
		},

		calculateSize: function(element, width){
			var displayRatio, height, imageRatio, retWidth;
			var fitObj = this.getFit(element);
			var fit = fitObj.fit;
			var fitElem = fitObj.parent;

			if(fit != 'width' && ((fit != 'contain' && fit != 'cover') || !(imageRatio = this.getImageRatio(element)))){
				return width;
			}

			if(fitElem){
				width = fitElem.clientWidth;
			} else {
				fitElem = element;
			}

			retWidth = width;

			if(fit == 'width'){
				retWidth = width;
			} else {
				height = fitElem.clientHeight;

				if((displayRatio =  width / height) && ((fit == 'cover' && displayRatio < imageRatio) || (fit == 'contain' && displayRatio > imageRatio))){
					retWidth = width * (imageRatio / displayRatio);
				}
			}

			return retWidth;
		}
	};

	lazySizes.parentFit = parentFit;

	document.addEventListener('lazybeforesizes', function(e){
		if(e.defaultPrevented || e.detail.instance != lazySizes){return;}

		var element = e.target;
		e.detail.width = parentFit.calculateSize(element, e.detail.width);
	});
}));
}(ls_parentFit));

var ls_rias = {exports: {}};

(function (module) {
(function(window, factory) {
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(window, function(window, document, lazySizes) {

	var config, riasCfg;
	var lazySizesCfg = lazySizes.cfg;
	var replaceTypes = {string: 1, number: 1};
	var regNumber = /^\-*\+*\d+\.*\d*$/;
	var regPicture = /^picture$/i;
	var regWidth = /\s*\{\s*width\s*\}\s*/i;
	var regHeight = /\s*\{\s*height\s*\}\s*/i;
	var regPlaceholder = /\s*\{\s*([a-z0-9]+)\s*\}\s*/ig;
	var regObj = /^\[.*\]|\{.*\}$/;
	var regAllowedSizes = /^(?:auto|\d+(px)?)$/;
	var anchor = document.createElement('a');
	var img = document.createElement('img');
	var buggySizes = ('srcset' in img) && !('sizes' in img);
	var supportPicture = !!window.HTMLPictureElement && !buggySizes;

	(function(){
		var prop;
		var noop = function(){};
		var riasDefaults = {
			prefix: '',
			postfix: '',
			srcAttr: 'data-src',
			absUrl: false,
			modifyOptions: noop,
			widthmap: {},
			ratio: false,
			traditionalRatio: false,
			aspectratio: false,
		};

		config = lazySizes && lazySizes.cfg;

		if(!config.supportsType){
			config.supportsType = function(type/*, elem*/){
				return !type;
			};
		}

		if(!config.rias){
			config.rias = {};
		}
		riasCfg = config.rias;

		if(!('widths' in riasCfg)){
			riasCfg.widths = [];
			(function (widths){
				var width;
				var i = 0;
				while(!width || width < 3000){
					i += 5;
					if(i > 30){
						i += 1;
					}
					width = (36 * i);
					widths.push(width);
				}
			})(riasCfg.widths);
		}

		for(prop in riasDefaults){
			if(!(prop in riasCfg)){
				riasCfg[prop] = riasDefaults[prop];
			}
		}
	})();

	function getElementOptions(elem, src, options){
		var attr, parent, setOption, prop, opts;
		var elemStyles = window.getComputedStyle(elem);

		if (!options) {
			parent = elem.parentNode;

			options = {
				isPicture: !!(parent && regPicture.test(parent.nodeName || ''))
			};
		} else {
			opts = {};

			for (prop in options) {
				opts[prop] = options[prop];
			}

			options = opts;
		}

		setOption = function(attr, run){
			var attrVal = elem.getAttribute('data-'+ attr);

			if (!attrVal) {
				// no data- attr, get value from the CSS
				var styles = elemStyles.getPropertyValue('--ls-' + attr);
				// at least Safari 9 returns null rather than
				// an empty string for getPropertyValue causing
				// .trim() to fail
				if (styles) {
					attrVal = styles.trim();
				}
			}

			if (attrVal) {
				if(attrVal == 'true'){
					attrVal = true;
				} else if(attrVal == 'false'){
					attrVal = false;
				} else if(regNumber.test(attrVal)){
					attrVal = parseFloat(attrVal);
				} else if(typeof riasCfg[attr] == 'function'){
					attrVal = riasCfg[attr](elem, attrVal);
				} else if(regObj.test(attrVal)){
					try {
						attrVal = JSON.parse(attrVal);
					} catch(e){}
				}
				options[attr] = attrVal;
			} else if((attr in riasCfg) && typeof riasCfg[attr] != 'function' && !options[attr]){
				options[attr] = riasCfg[attr];
			} else if(run && typeof riasCfg[attr] == 'function'){
				options[attr] = riasCfg[attr](elem, attrVal);
			}
		};

		for(attr in riasCfg){
			setOption(attr);
		}
		src.replace(regPlaceholder, function(full, match){
			if(!(match in options)){
				setOption(match, true);
			}
		});

		return options;
	}

	function replaceUrlProps(url, options){
		var candidates = [];
		var replaceFn = function(full, match){
			return (replaceTypes[typeof options[match]]) ? options[match] : full;
		};
		candidates.srcset = [];

		if(options.absUrl){
			anchor.setAttribute('href', url);
			url = anchor.href;
		}

		url = ((options.prefix || '') + url + (options.postfix || '')).replace(regPlaceholder, replaceFn);

		options.widths.forEach(function(width){
			var widthAlias = options.widthmap[width] || width;
			var ratio = options.aspectratio || options.ratio;
			var traditionalRatio = !options.aspectratio && riasCfg.traditionalRatio;
			var candidate = {
				u: url.replace(regWidth, widthAlias)
						.replace(regHeight, ratio ?
							traditionalRatio ?
								Math.round(width * ratio) :
								Math.round(width / ratio)
							: ''),
				w: width
			};

			candidates.push(candidate);
			candidates.srcset.push( (candidate.c = candidate.u + ' ' + width + 'w') );
		});
		return candidates;
	}

	function setSrc(src, opts, elem){
		var elemW = 0;
		var elemH = 0;
		var sizeElement = elem;

		if(!src){return;}

		if (opts.ratio === 'container') {
			// calculate image or parent ratio
			elemW = sizeElement.scrollWidth;
			elemH = sizeElement.scrollHeight;

			while ((!elemW || !elemH) && sizeElement !== document) {
				sizeElement = sizeElement.parentNode;
				elemW = sizeElement.scrollWidth;
				elemH = sizeElement.scrollHeight;
			}
			if (elemW && elemH) {
				opts.ratio = opts.traditionalRatio ? elemH / elemW : elemW / elemH;
			}
		}

		src = replaceUrlProps(src, opts);

		src.isPicture = opts.isPicture;

		if(buggySizes && elem.nodeName.toUpperCase() == 'IMG'){
			elem.removeAttribute(config.srcsetAttr);
		} else {
			elem.setAttribute(config.srcsetAttr, src.srcset.join(', '));
		}

		Object.defineProperty(elem, '_lazyrias', {
			value: src,
			writable: true
		});
	}

	function createAttrObject(elem, src){
		var opts = getElementOptions(elem, src);

		riasCfg.modifyOptions.call(elem, {target: elem, details: opts, detail: opts});

		lazySizes.fire(elem, 'lazyriasmodifyoptions', opts);
		return opts;
	}

	function getSrc(elem){
		return elem.getAttribute( elem.getAttribute('data-srcattr') || riasCfg.srcAttr ) || elem.getAttribute(config.srcsetAttr) || elem.getAttribute(config.srcAttr) || elem.getAttribute('data-pfsrcset') || '';
	}

	addEventListener('lazybeforesizes', function(e){
		if(e.detail.instance != lazySizes){return;}

		var elem, src, elemOpts, sourceOpts, parent, sources, i, len, sourceSrc, sizes, detail, hasPlaceholder, modified, emptyList;
		elem = e.target;

		if(!e.detail.dataAttr || e.defaultPrevented || riasCfg.disabled || !((sizes = elem.getAttribute(config.sizesAttr) || elem.getAttribute('sizes')) && regAllowedSizes.test(sizes))){return;}

		src = getSrc(elem);

		elemOpts = createAttrObject(elem, src);

		hasPlaceholder = regWidth.test(elemOpts.prefix) || regWidth.test(elemOpts.postfix);

		if(elemOpts.isPicture && (parent = elem.parentNode)){
			sources = parent.getElementsByTagName('source');
			for(i = 0, len = sources.length; i < len; i++){
				if ( hasPlaceholder || regWidth.test(sourceSrc = getSrc(sources[i])) ){
					sourceOpts = getElementOptions(sources[i], sourceSrc, elemOpts);
					setSrc(sourceSrc, sourceOpts, sources[i]);
					modified = true;
				}
			}
		}

		if ( hasPlaceholder || regWidth.test(src) ){
			setSrc(src, elemOpts, elem);
			modified = true;
		} else if (modified) {
			emptyList = [];
			emptyList.srcset = [];
			emptyList.isPicture = true;
			Object.defineProperty(elem, '_lazyrias', {
				value: emptyList,
				writable: true
			});
		}

		if(modified){
			if(supportPicture){
				elem.removeAttribute(config.srcAttr);
			} else if(sizes != 'auto') {
				detail = {
					width: parseInt(sizes, 10)
				};
				polyfill({
					target: elem,
					detail: detail
				});
			}
		}
	}, true);
	// partial polyfill
	var polyfill = (function(){
		var ascendingSort = function( a, b ) {
			return a.w - b.w;
		};

		var reduceCandidate = function (srces) {
			var lowerCandidate, bonusFactor;
			var len = srces.length;
			var candidate = srces[len -1];
			var i = 0;

			for(i; i < len;i++){
				candidate = srces[i];
				candidate.d = candidate.w / srces.w;
				if(candidate.d >= srces.d){
					if(!candidate.cached && (lowerCandidate = srces[i - 1]) &&
						lowerCandidate.d > srces.d - (0.13 * Math.pow(srces.d, 2.2))){

						bonusFactor = Math.pow(lowerCandidate.d - 0.6, 1.6);

						if(lowerCandidate.cached) {
							lowerCandidate.d += 0.15 * bonusFactor;
						}

						if(lowerCandidate.d + ((candidate.d - srces.d) * bonusFactor) > srces.d){
							candidate = lowerCandidate;
						}
					}
					break;
				}
			}
			return candidate;
		};

		var getWSet = function(elem, testPicture){
			var src;
			if(!elem._lazyrias && lazySizes.pWS && (src = lazySizes.pWS(elem.getAttribute(config.srcsetAttr || ''))).length){
				Object.defineProperty(elem, '_lazyrias', {
					value: src,
					writable: true
				});
				if(testPicture && elem.parentNode){
					src.isPicture = elem.parentNode.nodeName.toUpperCase() == 'PICTURE';
				}
			}
			return elem._lazyrias;
		};

		var getX = function(elem){
			var dpr = window.devicePixelRatio || 1;
			var optimum = lazySizes.getX && lazySizes.getX(elem);
			return Math.min(optimum || dpr, 2.4, dpr);
		};

		var getCandidate = function(elem, width){
			var sources, i, len, media, srces, src;

			srces = elem._lazyrias;

			if(srces.isPicture && window.matchMedia){
				for(i = 0, sources = elem.parentNode.getElementsByTagName('source'), len = sources.length; i < len; i++){
					if(getWSet(sources[i]) && !sources[i].getAttribute('type') && ( !(media = sources[i].getAttribute('media')) || ((matchMedia(media) || {}).matches))){
						srces = sources[i]._lazyrias;
						break;
					}
				}
			}

			if(!srces.w || srces.w < width){
				srces.w = width;
				srces.d = getX(elem);
				src = reduceCandidate(srces.sort(ascendingSort));
			}

			return src;
		};

		var polyfill = function(e){
			if(e.detail.instance != lazySizes){return;}

			var candidate;
			var elem = e.target;

			if(!buggySizes && (window.respimage || window.picturefill || lazySizesCfg.pf)){
				document.removeEventListener('lazybeforesizes', polyfill);
				return;
			}

			if(!('_lazyrias' in elem) && (!e.detail.dataAttr || !getWSet(elem, true))){
				return;
			}

			candidate = getCandidate(elem, e.detail.width);

			if(candidate && candidate.u && elem._lazyrias.cur != candidate.u){
				elem._lazyrias.cur = candidate.u;
				candidate.cached = true;
				lazySizes.rAF(function(){
					elem.setAttribute(config.srcAttr, candidate.u);
					elem.setAttribute('src', candidate.u);
				});
			}
		};

		if(!supportPicture){
			addEventListener('lazybeforesizes', polyfill);
		} else {
			polyfill = function(){};
		}

		return polyfill;

	})();

}));
}(ls_rias));

var ls_bgset = {exports: {}};

(function (module) {
(function(window, factory) {
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(window, function(window, document, lazySizes) {
	if(!window.addEventListener){return;}

	var lazySizesCfg = lazySizes.cfg;
	var regWhite = /\s+/g;
	var regSplitSet = /\s*\|\s+|\s+\|\s*/g;
	var regSource = /^(.+?)(?:\s+\[\s*(.+?)\s*\])(?:\s+\[\s*(.+?)\s*\])?$/;
	var regType = /^\s*\(*\s*type\s*:\s*(.+?)\s*\)*\s*$/;
	var regBgUrlEscape = /\(|\)|'/;
	var allowedBackgroundSize = {contain: 1, cover: 1};
	var proxyWidth = function(elem){
		var width = lazySizes.gW(elem, elem.parentNode);

		if(!elem._lazysizesWidth || width > elem._lazysizesWidth){
			elem._lazysizesWidth = width;
		}
		return elem._lazysizesWidth;
	};
	var getBgSize = function(elem){
		var bgSize;

		bgSize = (getComputedStyle(elem) || {getPropertyValue: function(){}}).getPropertyValue('background-size');

		if(!allowedBackgroundSize[bgSize] && allowedBackgroundSize[elem.style.backgroundSize]){
			bgSize = elem.style.backgroundSize;
		}

		return bgSize;
	};
	var setTypeOrMedia = function(source, match){
		if(match){
			var typeMatch = match.match(regType);
			if(typeMatch && typeMatch[1]){
				source.setAttribute('type', typeMatch[1]);
			} else {
				source.setAttribute('media', lazySizesCfg.customMedia[match] || match);
			}
		}
	};
	var createPicture = function(sets, elem, img){
		var picture = document.createElement('picture');
		var sizes = elem.getAttribute(lazySizesCfg.sizesAttr);
		var ratio = elem.getAttribute('data-ratio');
		var optimumx = elem.getAttribute('data-optimumx');

		if(elem._lazybgset && elem._lazybgset.parentNode == elem){
			elem.removeChild(elem._lazybgset);
		}

		Object.defineProperty(img, '_lazybgset', {
			value: elem,
			writable: true
		});
		Object.defineProperty(elem, '_lazybgset', {
			value: picture,
			writable: true
		});

		sets = sets.replace(regWhite, ' ').split(regSplitSet);

		picture.style.display = 'none';
		img.className = lazySizesCfg.lazyClass;

		if(sets.length == 1 && !sizes){
			sizes = 'auto';
		}

		sets.forEach(function(set){
			var match;
			var source = document.createElement('source');

			if(sizes && sizes != 'auto'){
				source.setAttribute('sizes', sizes);
			}

			if((match = set.match(regSource))){
				source.setAttribute(lazySizesCfg.srcsetAttr, match[1]);

				setTypeOrMedia(source, match[2]);
				setTypeOrMedia(source, match[3]);
			} else {
				source.setAttribute(lazySizesCfg.srcsetAttr, set);
			}

			picture.appendChild(source);
		});

		if(sizes){
			img.setAttribute(lazySizesCfg.sizesAttr, sizes);
			elem.removeAttribute(lazySizesCfg.sizesAttr);
			elem.removeAttribute('sizes');
		}
		if(optimumx){
			img.setAttribute('data-optimumx', optimumx);
		}
		if(ratio) {
			img.setAttribute('data-ratio', ratio);
		}

		picture.appendChild(img);

		elem.appendChild(picture);
	};

	var proxyLoad = function(e){
		if(!e.target._lazybgset){return;}

		var image = e.target;
		var elem = image._lazybgset;
		var bg = image.currentSrc || image.src;


		if(bg){
			var useSrc = regBgUrlEscape.test(bg) ? JSON.stringify(bg) : bg;
			var event = lazySizes.fire(elem, 'bgsetproxy', {
				src: bg,
				useSrc: useSrc,
				fullSrc: null,
			});

			if(!event.defaultPrevented){
				elem.style.backgroundImage = event.detail.fullSrc || 'url(' + event.detail.useSrc + ')';
			}
		}

		if(image._lazybgsetLoading){
			lazySizes.fire(elem, '_lazyloaded', {}, false, true);
			delete image._lazybgsetLoading;
		}
	};

	addEventListener('lazybeforeunveil', function(e){
		var set, image, elem;

		if(e.defaultPrevented || !(set = e.target.getAttribute('data-bgset'))){return;}

		elem = e.target;
		image = document.createElement('img');

		image.alt = '';

		image._lazybgsetLoading = true;
		e.detail.firesLoad = true;

		createPicture(set, elem, image);

		setTimeout(function(){
			lazySizes.loader.unveil(image);

			lazySizes.rAF(function(){
				lazySizes.fire(image, '_lazyloaded', {}, true, true);
				if(image.complete) {
					proxyLoad({target: image});
				}
			});
		});

	});

	document.addEventListener('load', proxyLoad, true);

	window.addEventListener('lazybeforesizes', function(e){
		if(e.detail.instance != lazySizes){return;}
		if(e.target._lazybgset && e.detail.dataAttr){
			var elem = e.target._lazybgset;
			var bgSize = getBgSize(elem);

			if(allowedBackgroundSize[bgSize]){
				e.target._lazysizesParentFit = bgSize;

				lazySizes.rAF(function(){
					e.target.setAttribute('data-parent-fit', bgSize);
					if(e.target._lazysizesParentFit){
						delete e.target._lazysizesParentFit;
					}
				});
			}
		}
	}, true);

	document.documentElement.addEventListener('lazybeforesizes', function(e){
		if(e.defaultPrevented || !e.target._lazybgset || e.detail.instance != lazySizes){return;}
		e.detail.width = proxyWidth(e.target._lazybgset);
	});
}));
}(ls_bgset));

var ls_nativeLoading = {exports: {}};

(function (module) {
(function(window, factory) {
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(window, function(window, document, lazySizes) {

	var imgSupport = 'loading' in HTMLImageElement.prototype;
	var iframeSupport = 'loading' in HTMLIFrameElement.prototype;
	var isConfigSet = false;
	var oldPrematureUnveil = lazySizes.prematureUnveil;
	var cfg = lazySizes.cfg;
	var listenerMap = {
		focus: 1,
		mouseover: 1,
		click: 1,
		load: 1,
		transitionend: 1,
		animationend: 1,
		scroll: 1,
		resize: 1,
	};

	if (!cfg.nativeLoading) {
		cfg.nativeLoading = {};
	}

	if (!window.addEventListener || !window.MutationObserver || (!imgSupport && !iframeSupport)) {
		return;
	}

	function disableEvents() {
		var loader = lazySizes.loader;
		var throttledCheckElements = loader.checkElems;
		var removeALSL = function(){
			setTimeout(function(){
				window.removeEventListener('scroll', loader._aLSL, true);
			}, 1000);
		};
		var currentListenerMap = typeof cfg.nativeLoading.disableListeners == 'object' ?
			cfg.nativeLoading.disableListeners :
			listenerMap;

		if (currentListenerMap.scroll) {
			window.addEventListener('load', removeALSL);
			removeALSL();

			window.removeEventListener('scroll', throttledCheckElements, true);
		}

		if (currentListenerMap.resize) {
			window.removeEventListener('resize', throttledCheckElements, true);
		}

		Object.keys(currentListenerMap).forEach(function(name) {
			if (currentListenerMap[name]) {
				document.removeEventListener(name, throttledCheckElements, true);
			}
		});
	}

	function runConfig() {
		if (isConfigSet) {return;}
		isConfigSet = true;

		if (imgSupport && iframeSupport && cfg.nativeLoading.disableListeners) {
			if (cfg.nativeLoading.disableListeners === true) {
				cfg.nativeLoading.setLoadingAttribute = true;
			}

			disableEvents();
		}

		if (cfg.nativeLoading.setLoadingAttribute) {
			window.addEventListener('lazybeforeunveil', function(e){
				var element = e.target;

				if ('loading' in element && !element.getAttribute('loading')) {
					element.setAttribute('loading', 'lazy');
				}
			}, true);
		}
	}

	lazySizes.prematureUnveil = function prematureUnveil(element) {

		if (!isConfigSet) {
			runConfig();
		}

		if ('loading' in element &&
			(cfg.nativeLoading.setLoadingAttribute || element.getAttribute('loading')) &&
			(element.getAttribute('data-sizes') != 'auto' || element.offsetWidth)) {
			return true;
		}

		if (oldPrematureUnveil) {
			return oldPrematureUnveil(element);
		}
	};

}));
}(ls_nativeLoading));

var ls_respimg = {exports: {}};

(function (module) {
(function(window, factory) {
	if(!window) {return;}
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(typeof window != 'undefined' ?
	window : 0, function(window, document, lazySizes) {
	var polyfill;
	var lazySizesCfg = lazySizes.cfg;
	var img = document.createElement('img');
	var supportSrcset = ('sizes' in img) && ('srcset' in img);
	var regHDesc = /\s+\d+h/g;
	var fixEdgeHDescriptor = (function(){
		var regDescriptors = /\s+(\d+)(w|h)\s+(\d+)(w|h)/;
		var forEach = Array.prototype.forEach;

		return function(){
			var img = document.createElement('img');
			var removeHDescriptors = function(source){
				var ratio, match;
				var srcset = source.getAttribute(lazySizesCfg.srcsetAttr);
				if(srcset){
					if((match = srcset.match(regDescriptors))){
						if(match[2] == 'w'){
							ratio = match[1] / match[3];
						} else {
							ratio = match[3] / match[1];
						}

						if(ratio){
							source.setAttribute('data-aspectratio', ratio);
						}
						source.setAttribute(lazySizesCfg.srcsetAttr, srcset.replace(regHDesc, ''));
					}
				}
			};
			var handler = function(e){
				if(e.detail.instance != lazySizes){return;}
				var picture = e.target.parentNode;

				if(picture && picture.nodeName == 'PICTURE'){
					forEach.call(picture.getElementsByTagName('source'), removeHDescriptors);
				}
				removeHDescriptors(e.target);
			};

			var test = function(){
				if(!!img.currentSrc){
					document.removeEventListener('lazybeforeunveil', handler);
				}
			};

			document.addEventListener('lazybeforeunveil', handler);

			img.onload = test;
			img.onerror = test;

			img.srcset = 'data:,a 1w 1h';

			if(img.complete){
				test();
			}
		};
	})();

	if(!lazySizesCfg.supportsType){
		lazySizesCfg.supportsType = function(type/*, elem*/){
			return !type;
		};
	}

	if (window.HTMLPictureElement && supportSrcset) {
		if(!lazySizes.hasHDescriptorFix && document.msElementsFromPoint){
			lazySizes.hasHDescriptorFix = true;
			fixEdgeHDescriptor();
		}
		return;
	}

	if(window.picturefill || lazySizesCfg.pf){return;}

	lazySizesCfg.pf = function(options){
		var i, len;
		if(window.picturefill){return;}
		for(i = 0, len = options.elements.length; i < len; i++){
			polyfill(options.elements[i]);
		}
	};

	// partial polyfill
	polyfill = (function(){
		var ascendingSort = function( a, b ) {
			return a.w - b.w;
		};
		var regPxLength = /^\s*\d+\.*\d*px\s*$/;
		var reduceCandidate = function (srces) {
			var lowerCandidate, bonusFactor;
			var len = srces.length;
			var candidate = srces[len -1];
			var i = 0;

			for(i; i < len;i++){
				candidate = srces[i];
				candidate.d = candidate.w / srces.w;

				if(candidate.d >= srces.d){
					if(!candidate.cached && (lowerCandidate = srces[i - 1]) &&
						lowerCandidate.d > srces.d - (0.13 * Math.pow(srces.d, 2.2))){

						bonusFactor = Math.pow(lowerCandidate.d - 0.6, 1.6);

						if(lowerCandidate.cached) {
							lowerCandidate.d += 0.15 * bonusFactor;
						}

						if(lowerCandidate.d + ((candidate.d - srces.d) * bonusFactor) > srces.d){
							candidate = lowerCandidate;
						}
					}
					break;
				}
			}
			return candidate;
		};

		var parseWsrcset = (function(){
			var candidates;
			var regWCandidates = /(([^,\s].[^\s]+)\s+(\d+)w)/g;
			var regMultiple = /\s/;
			var addCandidate = function(match, candidate, url, wDescriptor){
				candidates.push({
					c: candidate,
					u: url,
					w: wDescriptor * 1
				});
			};

			return function(input){
				candidates = [];
				input = input.trim();
				input
					.replace(regHDesc, '')
					.replace(regWCandidates, addCandidate)
				;

				if(!candidates.length && input && !regMultiple.test(input)){
					candidates.push({
						c: input,
						u: input,
						w: 99
					});
				}

				return candidates;
			};
		})();

		var runMatchMedia = function(){
			if(runMatchMedia.init){return;}

			runMatchMedia.init = true;
			addEventListener('resize', (function(){
				var timer;
				var matchMediaElems = document.getElementsByClassName('lazymatchmedia');
				var run = function(){
					var i, len;
					for(i = 0, len = matchMediaElems.length; i < len; i++){
						polyfill(matchMediaElems[i]);
					}
				};

				return function(){
					clearTimeout(timer);
					timer = setTimeout(run, 66);
				};
			})());
		};

		var createSrcset = function(elem, isImage){
			var parsedSet;
			var srcSet = elem.getAttribute('srcset') || elem.getAttribute(lazySizesCfg.srcsetAttr);

			if(!srcSet && isImage){
				srcSet = !elem._lazypolyfill ?
					(elem.getAttribute(lazySizesCfg.srcAttr) || elem.getAttribute('src')) :
					elem._lazypolyfill._set
				;
			}

			if(!elem._lazypolyfill || elem._lazypolyfill._set != srcSet){

				parsedSet = parseWsrcset( srcSet || '' );
				if(isImage && elem.parentNode){
					parsedSet.isPicture = elem.parentNode.nodeName.toUpperCase() == 'PICTURE';

					if(parsedSet.isPicture){
						if(window.matchMedia){
							lazySizes.aC(elem, 'lazymatchmedia');
							runMatchMedia();
						}
					}
				}

				parsedSet._set = srcSet;
				Object.defineProperty(elem, '_lazypolyfill', {
					value: parsedSet,
					writable: true
				});
			}
		};

		var getX = function(elem){
			var dpr = window.devicePixelRatio || 1;
			var optimum = lazySizes.getX && lazySizes.getX(elem);
			return Math.min(optimum || dpr, 2.5, dpr);
		};

		var matchesMedia = function(media){
			if(window.matchMedia){
				matchesMedia = function(media){
					return !media || (matchMedia(media) || {}).matches;
				};
			} else {
				return !media;
			}

			return matchesMedia(media);
		};

		var getCandidate = function(elem){
			var sources, i, len, source, srces, src, width;

			source = elem;
			createSrcset(source, true);
			srces = source._lazypolyfill;

			if(srces.isPicture){
				for(i = 0, sources = elem.parentNode.getElementsByTagName('source'), len = sources.length; i < len; i++){
					if( lazySizesCfg.supportsType(sources[i].getAttribute('type'), elem) && matchesMedia( sources[i].getAttribute('media')) ){
						source = sources[i];
						createSrcset(source);
						srces = source._lazypolyfill;
						break;
					}
				}
			}

			if(srces.length > 1){
				width = source.getAttribute('sizes') || '';
				width = regPxLength.test(width) && parseInt(width, 10) || lazySizes.gW(elem, elem.parentNode);
				srces.d = getX(elem);
				if(!srces.src || !srces.w || srces.w < width){
					srces.w = width;
					src = reduceCandidate(srces.sort(ascendingSort));
					srces.src = src;
				} else {
					src = srces.src;
				}
			} else {
				src = srces[0];
			}

			return src;
		};

		var p = function(elem){
			if(supportSrcset && elem.parentNode && elem.parentNode.nodeName.toUpperCase() != 'PICTURE'){return;}
			var candidate = getCandidate(elem);

			if(candidate && candidate.u && elem._lazypolyfill.cur != candidate.u){
				elem._lazypolyfill.cur = candidate.u;
				candidate.cached = true;
				elem.setAttribute(lazySizesCfg.srcAttr, candidate.u);
				elem.setAttribute('src', candidate.u);
			}
		};

		p.parse = parseWsrcset;

		return p;
	})();

	if(lazySizesCfg.loadedClass && lazySizesCfg.loadingClass){
		(function(){
			var sels = [];
			['img[sizes$="px"][srcset].', 'picture > img:not([srcset]).'].forEach(function(sel){
				sels.push(sel + lazySizesCfg.loadedClass);
				sels.push(sel + lazySizesCfg.loadingClass);
			});
			lazySizesCfg.pf({
				elements: document.querySelectorAll(sels.join(', '))
			});
		})();

	}
}));
}(ls_respimg));

const slideshowOpts = {
  adaptiveHeight: false,
  draggable: false,
  fade: true,
  pageDots: false,
  prevNextButtons: false,
  wrapAround: true
};
const classes$a = {
  active: "is-active"
};
register("announcement-bar", {
  timer: null,

  onLoad() {
    const timing = parseInt(this.container.dataset.timing);
    const announcements = t$3("[data-single-announcement]", this.container);

    if (announcements.length > 1) {
      import(flu.chunks.flickity).then(({
        Flickity
      }) => {
        this.slideshow = new Flickity(this.container, { ...slideshowOpts,
          autoPlay: timing,
          on: {
            // Need to add a modifier to animate after the first slide has changed
            change(index) {
              announcements.forEach((el, i) => l(el, classes$a.active, index === i));
            }

          }
        });
        this.slideshow.on("pointerUp", () => this.handleRestart());
      });
    } else {
      u(announcements[0], "is-selected");
    }

    this.listeners = [e$2(this.container, "touchend", () => this.handleRestart())];
  },

  handleRestart() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.slideshow && this.slideshow.playPlayer(), 3500);
  },

  onBlockSelect({
    target
  }) {
    this.slideshow && this.slideshow.pausePlayer();
    this.slideshow && this.slideshow.select(target.dataset.index);
  },

  onBlockDeselect() {
    this.slideshow && this.slideshow.unpausePlayer();
  },

  onUnload() {
    this.slideshow && this.slideshow.destroy();
    this.slideshow && this.listeners.forEach(l => l());
  }

});

const {
  strings: {
    accessibility: strings
  }
} = window.theme;

const prefersReducedMotion = () => {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

function backgroundVideoHandler(container) {
  const pause = n$1(".video-pause", container);
  const video = container.getElementsByTagName("VIDEO")[0];
  if (!pause || !video) return;
  const pauseListener = e$2(pause, "click", e => {
    e.preventDefault();

    if (video.paused) {
      video.play();
      pause.innerText = strings.pause_video;
    } else {
      video.pause();
      pause.innerText = strings.play_video;
    }
  });
  return () => pauseListener();
}

function disableLinks(links) {
  links.forEach(link => {
    link.setAttribute("tabindex", -1);
  });
}

function enableLinks(links) {
  links.forEach(link => {
    link.setAttribute("tabindex", 0);
  });
}

function disableLinksWithin(wrappingEl) {
  const links = t$3("a", wrappingEl);
  disableLinks(links);
}

function enableLinksWithin(wrappingEl) {
  const links = t$3("a", wrappingEl);
  enableLinks(links);
}

function syncTabIndexesOnFlickity(flickityInstance) {
  // This ensures that all non active items have
  // a tabindex of -1 and that active items do not
  flickityInstance.slides.forEach(slide => {
    disableLinksWithin(slide.cells[0].element);
  });
  enableLinksWithin(flickityInstance.selectedElement);
}

var mobileCarousel = ((node, opts = {}) => {
  const previousButton = n$1("[data-prev]", node);
  const nextButton = n$1("[data-next]", node);
  let slider;
  const io = new IntersectionObserver(([{
    isIntersecting: visible
  }]) => {
    if (slider && visible && (slider.slides || {}).length > 1) {
      u(nextButton, "visible");
      io.unobserve(node);
    }
  }, {
    threshold: 0.75
  });
  io.observe(node);

  function change() {
    u(previousButton, "visible");
    syncTabIndexesOnFlickity(slider);
  }

  const prevClick = e$2(previousButton, "click", () => slider.previous());
  const nextClick = e$2(nextButton, "click", () => slider.next());
  import(flu.chunks.flickity).then(({
    Flickity
  }) => {
    slider = new Flickity(node, {
      adaptiveHeight: true,
      cellAlign: "left",
      cellSelector: "[data-slide]",
      pageDots: false,
      prevNextButtons: false,
      watchCSS: true,
      wrapAround: true,
      on: {
        ready: function () {
          var flkty = Flickity.data(node); // This is a pain but we can't access the instance within here

          syncTabIndexesOnFlickity(flkty);
        }
      },
      ...opts
    });
    slider.on("change", change);
  });
  return {
    destroy: () => {
      if (slider && (slider.slides || {}).length > 1) {
        prevClick();
        nextClick();
      }

      io.disconnect();
      slider && slider.destroy();
    },
    select: index => slider && slider.select(index)
  };
});

const sel$g = {
  slider: "[data-slider]"
};
register("blog-posts", {
  onLoad() {
    const carousel = this.container.querySelector(sel$g.slider);
    this.mobileCarousel = mobileCarousel(carousel);
  },

  onUnload() {
    this.mobileCarousel.destroy();
  }

});

const sel$f = {
  arrow: ".mobile-carousel__pagination-arrow",
  slide: "[data-js-slide]",
  slider: "[data-js-slider]",
  next: "[data-js-next]"
};
register("carousel", {
  events: [],
  carousel: null,

  onLoad() {
    const slider = n$1(sel$f.slider, this.container);
    const arrows = t$3(sel$f.arrow, this.container);
    const previousButton = n$1("[data-prev]", this.container);
    const nextButton = n$1("[data-next]", this.container); // Show pagination arrows

    u(arrows, "visible");

    const setHeight = () => {
      const first = n$1(".carousel__slide .carousel__image", this.container);
      if (!first) return;
      this.container.style.setProperty("--height-carousel", first.offsetHeight + "px");
    };

    import(flu.chunks.flickity).then(({
      Flickity
    }) => {
      this.carousel = new Flickity(slider, {
        adaptiveHeight: false,
        cellSelector: sel$f.slide,
        pageDots: false,
        prevNextButtons: false,
        setGallerySize: false,
        wrapAround: true,
        on: {
          ready: () => {
            var carousel = Flickity.data(slider); // This is a pain but we can't access the instance within here

            setHeight();
            syncTabIndexesOnFlickity(carousel);
          }
        }
      });
      this.carousel.on("resize", () => setHeight());
      this.carousel.on("change", () => {
        syncTabIndexesOnFlickity(this.carousel);
      });
      this.prevClick = e$2(previousButton, "click", () => this.carousel.previous());
      this.nextClick = e$2(nextButton, "click", () => this.carousel.next());
      r$1("carousel:initialized");
    });
  },

  onUnload() {
    this.carousel && this.carousel.destroy();

    if (this.carousel && (this.carousel.slides || {}).length > 1) {
      this.prevClick();
      this.nextClick();
    }
  },

  onBlockSelect({
    target
  }) {
    this.flkty && this.flkty.select(target.dataset.index);
  },

  onBlockSelect({
    target
  }) {
    if (this.carousel) {
      this._handleBlockSelect(target.dataset.index);
    } else {
      // Listen for initalization if carousel does not exist
      this.events.push(c("carousel:initialized", () => {
        this._handleBlockSelect(target.dataset.index);
      }));
    }
  },

  onBlockDeselect() {
    if (this.carousel) {
      this._unpause();
    } else {
      // Listen for initalization if carousel does not exist
      this.events.push(c("carousel:initialized", () => {
        this._unpause();
      }));
    }
  },

  _handleBlockSelect(slideIndex) {
    this.carousel.select(slideIndex);

    this._pause();
  },

  _pause() {
    this.carousel && this.carousel.pausePlayer();
  },

  _unpause() {
    this.carousel && this.carousel.unpausePlayer();
  }

});

const sel$e = {
  slider: "[data-slider]"
};
register("collection-list", {
  onLoad() {
    const slider = this.container.querySelector(sel$e.slider);
    this.mobileCarousel = mobileCarousel(slider, {
      groupCells: 2
    });
  },

  onUnload() {
    this.mobileCarousel.destroy();
  },

  onBlockSelect({
    target
  }) {
    this.mobileCarousel.select(target.dataset.index);
  }

});

register("custom-content", {
  onLoad() {},

  onUnload() {}

});

const sel$d = {
  slider: "[data-slider]"
};
register("featured-collection", {
  onLoad() {
    const slider = this.container.querySelector(sel$d.slider);
    this.mobileCarousel = mobileCarousel(slider, {
      groupCells: 2
    });
  },

  onUnload() {
    this.mobileCarousel.destroy();
  }

});

const sel$c = {
  slider: "[data-slider]"
};
register("featured-products", {
  onLoad() {
    const carousel = n$1(sel$c.slider, this.container);
    if (!carousel) return;
    this.mobileCarousel = mobileCarousel(carousel, {
      adaptiveHeight: false,
      groupCells: 2
    });
  },

  onUnload() {
    this.mobileCarousel.destroy();
  }

});

const selectors$g = {
  form: ".selectors-form",
  list: "[data-disclosure-list]",
  toggle: "[data-disclosure-toggle]",
  input: "[data-disclosure-input]",
  option: "[data-disclosure-option]"
};
const classes$9 = {
  visible: "disclosure-list--visible"
};

function has(list, selector) {
  return list.map(l => l.contains(selector)).filter(Boolean);
}

function Disclosure(node) {
  const form = node.closest(selectors$g.form);
  const list = n$1(selectors$g.list, node);
  const toggle = n$1(selectors$g.toggle, node);
  const input = n$1(selectors$g.input, node);
  const options = t$3(selectors$g.option, node);
  const events = [e$2(toggle, "click", handleToggle), e$2(options, "click", submitForm), e$2(document, "click", handleBodyClick), e$2(toggle, "focusout", handleToggleFocusOut), e$2(list, "focusout", handleListFocusOut), e$2(node, "keyup", handleKeyup)];

  function submitForm(evt) {
    evt.preventDefault();
    const {
      value
    } = evt.currentTarget.dataset;
    input.value = value;
    form.submit();
  }

  function handleToggleFocusOut(evt) {
    const disclosureLostFocus = has([node], evt.relatedTarget).length === 0;

    if (disclosureLostFocus) {
      hideList();
    }
  }

  function handleListFocusOut(evt) {
    const childInFocus = has([node], evt.relatedTarget).length > 0;
    const isVisible = list.classList.contains(classes$9.visible);

    if (isVisible && !childInFocus) {
      hideList();
    }
  }

  function handleKeyup(evt) {
    if (evt.which !== 27) return;
    hideList();
    toggle.focus();
  }

  function handleToggle(evt) {
    const ariaExpanded = evt.currentTarget.getAttribute("aria-expanded") === true;
    evt.currentTarget.setAttribute("aria-expanded", !ariaExpanded);
    list.classList.toggle(classes$9.visible);
  }

  function handleBodyClick(evt) {
    const isOption = has([node], evt.target).length > 0;
    const isVisible = list.classList.contains(classes$9.visible);

    if (isVisible && !isOption) {
      hideList();
    }
  }

  function hideList() {
    toggle.setAttribute("aria-expanded", false);
    list.classList.remove(classes$9.visible);
  }

  function unload() {
    events.forEach(evt => evt());
  }

  return {
    unload
  };
}

const selectors$f = {
  disclosure: "[data-disclosure]",
  header: "[data-header]"
};
register("footer", {
  crossBorder: {},

  onLoad() {
    const headers = t$3(selectors$f.header, this.container);
    this.headerClick = e$2(headers, "click", handleHeaderClick);

    function handleHeaderClick({
      currentTarget
    }) {
      const {
        nextElementSibling: content
      } = currentTarget;
      l(currentTarget, "open", !isVisible(content));
      slideStop(content);

      if (isVisible(content)) {
        slideUp(content);
      } else {
        slideDown(content);
      }
    } // Wire up Cross Border disclosures


    const cbSelectors = t$3(selectors$f.disclosure, this.container);

    if (cbSelectors) {
      cbSelectors.forEach(selector => {
        const {
          disclosure: d
        } = selector.dataset;
        this.crossBorder[d] = Disclosure(selector);
      });
    }
  },

  onUnload() {
    this.headerClick();
    Object.keys(this.crossBorder).forEach(t => this.crossBorder[t].unload());
  }

});

const sel$b = {
  slider: "[data-slider]"
};
register("gallery", {
  onLoad() {
    const slider = this.container.querySelector(sel$b.slider);
    this.mobileCarousel = mobileCarousel(slider);
  },

  onUnload() {
    this.mobileCarousel.destroy();
  },

  onBlockSelect({
    target
  }) {
    this.mobileCarousel.select(target.dataset.index);
  }

});

/**
 * A collection of shims that provide minimal functionality of the ES6 collections.
 *
 * These implementations are not meant to be used outside of the ResizeObserver
 * modules as they cover only a limited range of use cases.
 */
/* eslint-disable require-jsdoc, valid-jsdoc */
var MapShim = (function () {
    if (typeof Map !== 'undefined') {
        return Map;
    }
    /**
     * Returns index in provided array that matches the specified key.
     *
     * @param {Array<Array>} arr
     * @param {*} key
     * @returns {number}
     */
    function getIndex(arr, key) {
        var result = -1;
        arr.some(function (entry, index) {
            if (entry[0] === key) {
                result = index;
                return true;
            }
            return false;
        });
        return result;
    }
    return /** @class */ (function () {
        function class_1() {
            this.__entries__ = [];
        }
        Object.defineProperty(class_1.prototype, "size", {
            /**
             * @returns {boolean}
             */
            get: function () {
                return this.__entries__.length;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * @param {*} key
         * @returns {*}
         */
        class_1.prototype.get = function (key) {
            var index = getIndex(this.__entries__, key);
            var entry = this.__entries__[index];
            return entry && entry[1];
        };
        /**
         * @param {*} key
         * @param {*} value
         * @returns {void}
         */
        class_1.prototype.set = function (key, value) {
            var index = getIndex(this.__entries__, key);
            if (~index) {
                this.__entries__[index][1] = value;
            }
            else {
                this.__entries__.push([key, value]);
            }
        };
        /**
         * @param {*} key
         * @returns {void}
         */
        class_1.prototype.delete = function (key) {
            var entries = this.__entries__;
            var index = getIndex(entries, key);
            if (~index) {
                entries.splice(index, 1);
            }
        };
        /**
         * @param {*} key
         * @returns {void}
         */
        class_1.prototype.has = function (key) {
            return !!~getIndex(this.__entries__, key);
        };
        /**
         * @returns {void}
         */
        class_1.prototype.clear = function () {
            this.__entries__.splice(0);
        };
        /**
         * @param {Function} callback
         * @param {*} [ctx=null]
         * @returns {void}
         */
        class_1.prototype.forEach = function (callback, ctx) {
            if (ctx === void 0) { ctx = null; }
            for (var _i = 0, _a = this.__entries__; _i < _a.length; _i++) {
                var entry = _a[_i];
                callback.call(ctx, entry[1], entry[0]);
            }
        };
        return class_1;
    }());
})();

/**
 * Detects whether window and document objects are available in current environment.
 */
var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined' && window.document === document;

// Returns global object of a current environment.
var global$1 = (function () {
    if (typeof global !== 'undefined' && global.Math === Math) {
        return global;
    }
    if (typeof self !== 'undefined' && self.Math === Math) {
        return self;
    }
    if (typeof window !== 'undefined' && window.Math === Math) {
        return window;
    }
    // eslint-disable-next-line no-new-func
    return Function('return this')();
})();

/**
 * A shim for the requestAnimationFrame which falls back to the setTimeout if
 * first one is not supported.
 *
 * @returns {number} Requests' identifier.
 */
var requestAnimationFrame$1 = (function () {
    if (typeof requestAnimationFrame === 'function') {
        // It's required to use a bounded function because IE sometimes throws
        // an "Invalid calling object" error if rAF is invoked without the global
        // object on the left hand side.
        return requestAnimationFrame.bind(global$1);
    }
    return function (callback) { return setTimeout(function () { return callback(Date.now()); }, 1000 / 60); };
})();

// Defines minimum timeout before adding a trailing call.
var trailingTimeout = 2;
/**
 * Creates a wrapper function which ensures that provided callback will be
 * invoked only once during the specified delay period.
 *
 * @param {Function} callback - Function to be invoked after the delay period.
 * @param {number} delay - Delay after which to invoke callback.
 * @returns {Function}
 */
function throttle (callback, delay) {
    var leadingCall = false, trailingCall = false, lastCallTime = 0;
    /**
     * Invokes the original callback function and schedules new invocation if
     * the "proxy" was called during current request.
     *
     * @returns {void}
     */
    function resolvePending() {
        if (leadingCall) {
            leadingCall = false;
            callback();
        }
        if (trailingCall) {
            proxy();
        }
    }
    /**
     * Callback invoked after the specified delay. It will further postpone
     * invocation of the original function delegating it to the
     * requestAnimationFrame.
     *
     * @returns {void}
     */
    function timeoutCallback() {
        requestAnimationFrame$1(resolvePending);
    }
    /**
     * Schedules invocation of the original function.
     *
     * @returns {void}
     */
    function proxy() {
        var timeStamp = Date.now();
        if (leadingCall) {
            // Reject immediately following calls.
            if (timeStamp - lastCallTime < trailingTimeout) {
                return;
            }
            // Schedule new call to be in invoked when the pending one is resolved.
            // This is important for "transitions" which never actually start
            // immediately so there is a chance that we might miss one if change
            // happens amids the pending invocation.
            trailingCall = true;
        }
        else {
            leadingCall = true;
            trailingCall = false;
            setTimeout(timeoutCallback, delay);
        }
        lastCallTime = timeStamp;
    }
    return proxy;
}

// Minimum delay before invoking the update of observers.
var REFRESH_DELAY = 20;
// A list of substrings of CSS properties used to find transition events that
// might affect dimensions of observed elements.
var transitionKeys = ['top', 'right', 'bottom', 'left', 'width', 'height', 'size', 'weight'];
// Check if MutationObserver is available.
var mutationObserverSupported = typeof MutationObserver !== 'undefined';
/**
 * Singleton controller class which handles updates of ResizeObserver instances.
 */
var ResizeObserverController = /** @class */ (function () {
    /**
     * Creates a new instance of ResizeObserverController.
     *
     * @private
     */
    function ResizeObserverController() {
        /**
         * Indicates whether DOM listeners have been added.
         *
         * @private {boolean}
         */
        this.connected_ = false;
        /**
         * Tells that controller has subscribed for Mutation Events.
         *
         * @private {boolean}
         */
        this.mutationEventsAdded_ = false;
        /**
         * Keeps reference to the instance of MutationObserver.
         *
         * @private {MutationObserver}
         */
        this.mutationsObserver_ = null;
        /**
         * A list of connected observers.
         *
         * @private {Array<ResizeObserverSPI>}
         */
        this.observers_ = [];
        this.onTransitionEnd_ = this.onTransitionEnd_.bind(this);
        this.refresh = throttle(this.refresh.bind(this), REFRESH_DELAY);
    }
    /**
     * Adds observer to observers list.
     *
     * @param {ResizeObserverSPI} observer - Observer to be added.
     * @returns {void}
     */
    ResizeObserverController.prototype.addObserver = function (observer) {
        if (!~this.observers_.indexOf(observer)) {
            this.observers_.push(observer);
        }
        // Add listeners if they haven't been added yet.
        if (!this.connected_) {
            this.connect_();
        }
    };
    /**
     * Removes observer from observers list.
     *
     * @param {ResizeObserverSPI} observer - Observer to be removed.
     * @returns {void}
     */
    ResizeObserverController.prototype.removeObserver = function (observer) {
        var observers = this.observers_;
        var index = observers.indexOf(observer);
        // Remove observer if it's present in registry.
        if (~index) {
            observers.splice(index, 1);
        }
        // Remove listeners if controller has no connected observers.
        if (!observers.length && this.connected_) {
            this.disconnect_();
        }
    };
    /**
     * Invokes the update of observers. It will continue running updates insofar
     * it detects changes.
     *
     * @returns {void}
     */
    ResizeObserverController.prototype.refresh = function () {
        var changesDetected = this.updateObservers_();
        // Continue running updates if changes have been detected as there might
        // be future ones caused by CSS transitions.
        if (changesDetected) {
            this.refresh();
        }
    };
    /**
     * Updates every observer from observers list and notifies them of queued
     * entries.
     *
     * @private
     * @returns {boolean} Returns "true" if any observer has detected changes in
     *      dimensions of it's elements.
     */
    ResizeObserverController.prototype.updateObservers_ = function () {
        // Collect observers that have active observations.
        var activeObservers = this.observers_.filter(function (observer) {
            return observer.gatherActive(), observer.hasActive();
        });
        // Deliver notifications in a separate cycle in order to avoid any
        // collisions between observers, e.g. when multiple instances of
        // ResizeObserver are tracking the same element and the callback of one
        // of them changes content dimensions of the observed target. Sometimes
        // this may result in notifications being blocked for the rest of observers.
        activeObservers.forEach(function (observer) { return observer.broadcastActive(); });
        return activeObservers.length > 0;
    };
    /**
     * Initializes DOM listeners.
     *
     * @private
     * @returns {void}
     */
    ResizeObserverController.prototype.connect_ = function () {
        // Do nothing if running in a non-browser environment or if listeners
        // have been already added.
        if (!isBrowser || this.connected_) {
            return;
        }
        // Subscription to the "Transitionend" event is used as a workaround for
        // delayed transitions. This way it's possible to capture at least the
        // final state of an element.
        document.addEventListener('transitionend', this.onTransitionEnd_);
        window.addEventListener('resize', this.refresh);
        if (mutationObserverSupported) {
            this.mutationsObserver_ = new MutationObserver(this.refresh);
            this.mutationsObserver_.observe(document, {
                attributes: true,
                childList: true,
                characterData: true,
                subtree: true
            });
        }
        else {
            document.addEventListener('DOMSubtreeModified', this.refresh);
            this.mutationEventsAdded_ = true;
        }
        this.connected_ = true;
    };
    /**
     * Removes DOM listeners.
     *
     * @private
     * @returns {void}
     */
    ResizeObserverController.prototype.disconnect_ = function () {
        // Do nothing if running in a non-browser environment or if listeners
        // have been already removed.
        if (!isBrowser || !this.connected_) {
            return;
        }
        document.removeEventListener('transitionend', this.onTransitionEnd_);
        window.removeEventListener('resize', this.refresh);
        if (this.mutationsObserver_) {
            this.mutationsObserver_.disconnect();
        }
        if (this.mutationEventsAdded_) {
            document.removeEventListener('DOMSubtreeModified', this.refresh);
        }
        this.mutationsObserver_ = null;
        this.mutationEventsAdded_ = false;
        this.connected_ = false;
    };
    /**
     * "Transitionend" event handler.
     *
     * @private
     * @param {TransitionEvent} event
     * @returns {void}
     */
    ResizeObserverController.prototype.onTransitionEnd_ = function (_a) {
        var _b = _a.propertyName, propertyName = _b === void 0 ? '' : _b;
        // Detect whether transition may affect dimensions of an element.
        var isReflowProperty = transitionKeys.some(function (key) {
            return !!~propertyName.indexOf(key);
        });
        if (isReflowProperty) {
            this.refresh();
        }
    };
    /**
     * Returns instance of the ResizeObserverController.
     *
     * @returns {ResizeObserverController}
     */
    ResizeObserverController.getInstance = function () {
        if (!this.instance_) {
            this.instance_ = new ResizeObserverController();
        }
        return this.instance_;
    };
    /**
     * Holds reference to the controller's instance.
     *
     * @private {ResizeObserverController}
     */
    ResizeObserverController.instance_ = null;
    return ResizeObserverController;
}());

/**
 * Defines non-writable/enumerable properties of the provided target object.
 *
 * @param {Object} target - Object for which to define properties.
 * @param {Object} props - Properties to be defined.
 * @returns {Object} Target object.
 */
var defineConfigurable = (function (target, props) {
    for (var _i = 0, _a = Object.keys(props); _i < _a.length; _i++) {
        var key = _a[_i];
        Object.defineProperty(target, key, {
            value: props[key],
            enumerable: false,
            writable: false,
            configurable: true
        });
    }
    return target;
});

/**
 * Returns the global object associated with provided element.
 *
 * @param {Object} target
 * @returns {Object}
 */
var getWindowOf = (function (target) {
    // Assume that the element is an instance of Node, which means that it
    // has the "ownerDocument" property from which we can retrieve a
    // corresponding global object.
    var ownerGlobal = target && target.ownerDocument && target.ownerDocument.defaultView;
    // Return the local global object if it's not possible extract one from
    // provided element.
    return ownerGlobal || global$1;
});

// Placeholder of an empty content rectangle.
var emptyRect = createRectInit(0, 0, 0, 0);
/**
 * Converts provided string to a number.
 *
 * @param {number|string} value
 * @returns {number}
 */
function toFloat(value) {
    return parseFloat(value) || 0;
}
/**
 * Extracts borders size from provided styles.
 *
 * @param {CSSStyleDeclaration} styles
 * @param {...string} positions - Borders positions (top, right, ...)
 * @returns {number}
 */
function getBordersSize(styles) {
    var positions = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        positions[_i - 1] = arguments[_i];
    }
    return positions.reduce(function (size, position) {
        var value = styles['border-' + position + '-width'];
        return size + toFloat(value);
    }, 0);
}
/**
 * Extracts paddings sizes from provided styles.
 *
 * @param {CSSStyleDeclaration} styles
 * @returns {Object} Paddings box.
 */
function getPaddings(styles) {
    var positions = ['top', 'right', 'bottom', 'left'];
    var paddings = {};
    for (var _i = 0, positions_1 = positions; _i < positions_1.length; _i++) {
        var position = positions_1[_i];
        var value = styles['padding-' + position];
        paddings[position] = toFloat(value);
    }
    return paddings;
}
/**
 * Calculates content rectangle of provided SVG element.
 *
 * @param {SVGGraphicsElement} target - Element content rectangle of which needs
 *      to be calculated.
 * @returns {DOMRectInit}
 */
function getSVGContentRect(target) {
    var bbox = target.getBBox();
    return createRectInit(0, 0, bbox.width, bbox.height);
}
/**
 * Calculates content rectangle of provided HTMLElement.
 *
 * @param {HTMLElement} target - Element for which to calculate the content rectangle.
 * @returns {DOMRectInit}
 */
function getHTMLElementContentRect(target) {
    // Client width & height properties can't be
    // used exclusively as they provide rounded values.
    var clientWidth = target.clientWidth, clientHeight = target.clientHeight;
    // By this condition we can catch all non-replaced inline, hidden and
    // detached elements. Though elements with width & height properties less
    // than 0.5 will be discarded as well.
    //
    // Without it we would need to implement separate methods for each of
    // those cases and it's not possible to perform a precise and performance
    // effective test for hidden elements. E.g. even jQuery's ':visible' filter
    // gives wrong results for elements with width & height less than 0.5.
    if (!clientWidth && !clientHeight) {
        return emptyRect;
    }
    var styles = getWindowOf(target).getComputedStyle(target);
    var paddings = getPaddings(styles);
    var horizPad = paddings.left + paddings.right;
    var vertPad = paddings.top + paddings.bottom;
    // Computed styles of width & height are being used because they are the
    // only dimensions available to JS that contain non-rounded values. It could
    // be possible to utilize the getBoundingClientRect if only it's data wasn't
    // affected by CSS transformations let alone paddings, borders and scroll bars.
    var width = toFloat(styles.width), height = toFloat(styles.height);
    // Width & height include paddings and borders when the 'border-box' box
    // model is applied (except for IE).
    if (styles.boxSizing === 'border-box') {
        // Following conditions are required to handle Internet Explorer which
        // doesn't include paddings and borders to computed CSS dimensions.
        //
        // We can say that if CSS dimensions + paddings are equal to the "client"
        // properties then it's either IE, and thus we don't need to subtract
        // anything, or an element merely doesn't have paddings/borders styles.
        if (Math.round(width + horizPad) !== clientWidth) {
            width -= getBordersSize(styles, 'left', 'right') + horizPad;
        }
        if (Math.round(height + vertPad) !== clientHeight) {
            height -= getBordersSize(styles, 'top', 'bottom') + vertPad;
        }
    }
    // Following steps can't be applied to the document's root element as its
    // client[Width/Height] properties represent viewport area of the window.
    // Besides, it's as well not necessary as the <html> itself neither has
    // rendered scroll bars nor it can be clipped.
    if (!isDocumentElement(target)) {
        // In some browsers (only in Firefox, actually) CSS width & height
        // include scroll bars size which can be removed at this step as scroll
        // bars are the only difference between rounded dimensions + paddings
        // and "client" properties, though that is not always true in Chrome.
        var vertScrollbar = Math.round(width + horizPad) - clientWidth;
        var horizScrollbar = Math.round(height + vertPad) - clientHeight;
        // Chrome has a rather weird rounding of "client" properties.
        // E.g. for an element with content width of 314.2px it sometimes gives
        // the client width of 315px and for the width of 314.7px it may give
        // 314px. And it doesn't happen all the time. So just ignore this delta
        // as a non-relevant.
        if (Math.abs(vertScrollbar) !== 1) {
            width -= vertScrollbar;
        }
        if (Math.abs(horizScrollbar) !== 1) {
            height -= horizScrollbar;
        }
    }
    return createRectInit(paddings.left, paddings.top, width, height);
}
/**
 * Checks whether provided element is an instance of the SVGGraphicsElement.
 *
 * @param {Element} target - Element to be checked.
 * @returns {boolean}
 */
var isSVGGraphicsElement = (function () {
    // Some browsers, namely IE and Edge, don't have the SVGGraphicsElement
    // interface.
    if (typeof SVGGraphicsElement !== 'undefined') {
        return function (target) { return target instanceof getWindowOf(target).SVGGraphicsElement; };
    }
    // If it's so, then check that element is at least an instance of the
    // SVGElement and that it has the "getBBox" method.
    // eslint-disable-next-line no-extra-parens
    return function (target) { return (target instanceof getWindowOf(target).SVGElement &&
        typeof target.getBBox === 'function'); };
})();
/**
 * Checks whether provided element is a document element (<html>).
 *
 * @param {Element} target - Element to be checked.
 * @returns {boolean}
 */
function isDocumentElement(target) {
    return target === getWindowOf(target).document.documentElement;
}
/**
 * Calculates an appropriate content rectangle for provided html or svg element.
 *
 * @param {Element} target - Element content rectangle of which needs to be calculated.
 * @returns {DOMRectInit}
 */
function getContentRect(target) {
    if (!isBrowser) {
        return emptyRect;
    }
    if (isSVGGraphicsElement(target)) {
        return getSVGContentRect(target);
    }
    return getHTMLElementContentRect(target);
}
/**
 * Creates rectangle with an interface of the DOMRectReadOnly.
 * Spec: https://drafts.fxtf.org/geometry/#domrectreadonly
 *
 * @param {DOMRectInit} rectInit - Object with rectangle's x/y coordinates and dimensions.
 * @returns {DOMRectReadOnly}
 */
function createReadOnlyRect(_a) {
    var x = _a.x, y = _a.y, width = _a.width, height = _a.height;
    // If DOMRectReadOnly is available use it as a prototype for the rectangle.
    var Constr = typeof DOMRectReadOnly !== 'undefined' ? DOMRectReadOnly : Object;
    var rect = Object.create(Constr.prototype);
    // Rectangle's properties are not writable and non-enumerable.
    defineConfigurable(rect, {
        x: x, y: y, width: width, height: height,
        top: y,
        right: x + width,
        bottom: height + y,
        left: x
    });
    return rect;
}
/**
 * Creates DOMRectInit object based on the provided dimensions and the x/y coordinates.
 * Spec: https://drafts.fxtf.org/geometry/#dictdef-domrectinit
 *
 * @param {number} x - X coordinate.
 * @param {number} y - Y coordinate.
 * @param {number} width - Rectangle's width.
 * @param {number} height - Rectangle's height.
 * @returns {DOMRectInit}
 */
function createRectInit(x, y, width, height) {
    return { x: x, y: y, width: width, height: height };
}

/**
 * Class that is responsible for computations of the content rectangle of
 * provided DOM element and for keeping track of it's changes.
 */
var ResizeObservation = /** @class */ (function () {
    /**
     * Creates an instance of ResizeObservation.
     *
     * @param {Element} target - Element to be observed.
     */
    function ResizeObservation(target) {
        /**
         * Broadcasted width of content rectangle.
         *
         * @type {number}
         */
        this.broadcastWidth = 0;
        /**
         * Broadcasted height of content rectangle.
         *
         * @type {number}
         */
        this.broadcastHeight = 0;
        /**
         * Reference to the last observed content rectangle.
         *
         * @private {DOMRectInit}
         */
        this.contentRect_ = createRectInit(0, 0, 0, 0);
        this.target = target;
    }
    /**
     * Updates content rectangle and tells whether it's width or height properties
     * have changed since the last broadcast.
     *
     * @returns {boolean}
     */
    ResizeObservation.prototype.isActive = function () {
        var rect = getContentRect(this.target);
        this.contentRect_ = rect;
        return (rect.width !== this.broadcastWidth ||
            rect.height !== this.broadcastHeight);
    };
    /**
     * Updates 'broadcastWidth' and 'broadcastHeight' properties with a data
     * from the corresponding properties of the last observed content rectangle.
     *
     * @returns {DOMRectInit} Last observed content rectangle.
     */
    ResizeObservation.prototype.broadcastRect = function () {
        var rect = this.contentRect_;
        this.broadcastWidth = rect.width;
        this.broadcastHeight = rect.height;
        return rect;
    };
    return ResizeObservation;
}());

var ResizeObserverEntry = /** @class */ (function () {
    /**
     * Creates an instance of ResizeObserverEntry.
     *
     * @param {Element} target - Element that is being observed.
     * @param {DOMRectInit} rectInit - Data of the element's content rectangle.
     */
    function ResizeObserverEntry(target, rectInit) {
        var contentRect = createReadOnlyRect(rectInit);
        // According to the specification following properties are not writable
        // and are also not enumerable in the native implementation.
        //
        // Property accessors are not being used as they'd require to define a
        // private WeakMap storage which may cause memory leaks in browsers that
        // don't support this type of collections.
        defineConfigurable(this, { target: target, contentRect: contentRect });
    }
    return ResizeObserverEntry;
}());

var ResizeObserverSPI = /** @class */ (function () {
    /**
     * Creates a new instance of ResizeObserver.
     *
     * @param {ResizeObserverCallback} callback - Callback function that is invoked
     *      when one of the observed elements changes it's content dimensions.
     * @param {ResizeObserverController} controller - Controller instance which
     *      is responsible for the updates of observer.
     * @param {ResizeObserver} callbackCtx - Reference to the public
     *      ResizeObserver instance which will be passed to callback function.
     */
    function ResizeObserverSPI(callback, controller, callbackCtx) {
        /**
         * Collection of resize observations that have detected changes in dimensions
         * of elements.
         *
         * @private {Array<ResizeObservation>}
         */
        this.activeObservations_ = [];
        /**
         * Registry of the ResizeObservation instances.
         *
         * @private {Map<Element, ResizeObservation>}
         */
        this.observations_ = new MapShim();
        if (typeof callback !== 'function') {
            throw new TypeError('The callback provided as parameter 1 is not a function.');
        }
        this.callback_ = callback;
        this.controller_ = controller;
        this.callbackCtx_ = callbackCtx;
    }
    /**
     * Starts observing provided element.
     *
     * @param {Element} target - Element to be observed.
     * @returns {void}
     */
    ResizeObserverSPI.prototype.observe = function (target) {
        if (!arguments.length) {
            throw new TypeError('1 argument required, but only 0 present.');
        }
        // Do nothing if current environment doesn't have the Element interface.
        if (typeof Element === 'undefined' || !(Element instanceof Object)) {
            return;
        }
        if (!(target instanceof getWindowOf(target).Element)) {
            throw new TypeError('parameter 1 is not of type "Element".');
        }
        var observations = this.observations_;
        // Do nothing if element is already being observed.
        if (observations.has(target)) {
            return;
        }
        observations.set(target, new ResizeObservation(target));
        this.controller_.addObserver(this);
        // Force the update of observations.
        this.controller_.refresh();
    };
    /**
     * Stops observing provided element.
     *
     * @param {Element} target - Element to stop observing.
     * @returns {void}
     */
    ResizeObserverSPI.prototype.unobserve = function (target) {
        if (!arguments.length) {
            throw new TypeError('1 argument required, but only 0 present.');
        }
        // Do nothing if current environment doesn't have the Element interface.
        if (typeof Element === 'undefined' || !(Element instanceof Object)) {
            return;
        }
        if (!(target instanceof getWindowOf(target).Element)) {
            throw new TypeError('parameter 1 is not of type "Element".');
        }
        var observations = this.observations_;
        // Do nothing if element is not being observed.
        if (!observations.has(target)) {
            return;
        }
        observations.delete(target);
        if (!observations.size) {
            this.controller_.removeObserver(this);
        }
    };
    /**
     * Stops observing all elements.
     *
     * @returns {void}
     */
    ResizeObserverSPI.prototype.disconnect = function () {
        this.clearActive();
        this.observations_.clear();
        this.controller_.removeObserver(this);
    };
    /**
     * Collects observation instances the associated element of which has changed
     * it's content rectangle.
     *
     * @returns {void}
     */
    ResizeObserverSPI.prototype.gatherActive = function () {
        var _this = this;
        this.clearActive();
        this.observations_.forEach(function (observation) {
            if (observation.isActive()) {
                _this.activeObservations_.push(observation);
            }
        });
    };
    /**
     * Invokes initial callback function with a list of ResizeObserverEntry
     * instances collected from active resize observations.
     *
     * @returns {void}
     */
    ResizeObserverSPI.prototype.broadcastActive = function () {
        // Do nothing if observer doesn't have active observations.
        if (!this.hasActive()) {
            return;
        }
        var ctx = this.callbackCtx_;
        // Create ResizeObserverEntry instance for every active observation.
        var entries = this.activeObservations_.map(function (observation) {
            return new ResizeObserverEntry(observation.target, observation.broadcastRect());
        });
        this.callback_.call(ctx, entries, ctx);
        this.clearActive();
    };
    /**
     * Clears the collection of active observations.
     *
     * @returns {void}
     */
    ResizeObserverSPI.prototype.clearActive = function () {
        this.activeObservations_.splice(0);
    };
    /**
     * Tells whether observer has active observations.
     *
     * @returns {boolean}
     */
    ResizeObserverSPI.prototype.hasActive = function () {
        return this.activeObservations_.length > 0;
    };
    return ResizeObserverSPI;
}());

// Registry of internal observers. If WeakMap is not available use current shim
// for the Map collection as it has all required methods and because WeakMap
// can't be fully polyfilled anyway.
var observers = typeof WeakMap !== 'undefined' ? new WeakMap() : new MapShim();
/**
 * ResizeObserver API. Encapsulates the ResizeObserver SPI implementation
 * exposing only those methods and properties that are defined in the spec.
 */
var ResizeObserver = /** @class */ (function () {
    /**
     * Creates a new instance of ResizeObserver.
     *
     * @param {ResizeObserverCallback} callback - Callback that is invoked when
     *      dimensions of the observed elements change.
     */
    function ResizeObserver(callback) {
        if (!(this instanceof ResizeObserver)) {
            throw new TypeError('Cannot call a class as a function.');
        }
        if (!arguments.length) {
            throw new TypeError('1 argument required, but only 0 present.');
        }
        var controller = ResizeObserverController.getInstance();
        var observer = new ResizeObserverSPI(callback, controller, this);
        observers.set(this, observer);
    }
    return ResizeObserver;
}());
// Expose public methods of ResizeObserver.
[
    'observe',
    'unobserve',
    'disconnect'
].forEach(function (method) {
    ResizeObserver.prototype[method] = function () {
        var _a;
        return (_a = observers.get(this))[method].apply(_a, arguments);
    };
});

var index = (function () {
    // Export existing implementation if available.
    if (typeof global$1.ResizeObserver !== 'undefined') {
        return global$1.ResizeObserver;
    }
    return ResizeObserver;
})();

var preventDefault = (fn => e => {
  e.preventDefault();
  fn();
});

var svg = {
  add: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
    </svg>
  `,
  remove: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M19 13H5v-2h14v2z" fill="currentColor" />
    </svg>
  `
};

function QuickCart(node) {
  const delegate = new Delegate(node);
  const overlay = n$1("[data-overlay]", node);
  const cartTab = n$1("[data-cart]", node);
  const configureTab = n$1("[data-configure]", node); // Cart

  const itemsContainer = n$1("[data-items]", node);
  const empty = n$1("[data-empty]", node);
  const footer = n$1("[data-footer]", node);
  const discounts = n$1("[data-discounts]", footer);
  const subtotal = n$1("[data-subtotal]", footer); // Configure

  const addContainer = n$1("[data-add]", configureTab);
  const contents = n$1("[data-contents]", addContainer);
  delegate.on("click", "button[data-decrease]", (_, target) => {
    const qty = parseInt(n$1("[data-qty]", target.parentNode).innerHTML) - 1;
    cart.updateItem(target.dataset.decrease, qty);
  });
  delegate.on("click", "button[data-increase]", (_, target) => {
    const qty = parseInt(n$1("[data-qty]", target.parentNode).innerHTML) + 1;
    cart.updateItem(target.dataset.increase, qty);
  });
  delegate.on("click", ".quick-cart__item-remove", (_, target) => {
    cart.updateItem(target.dataset.itemId, 0);
  });
  const cartTrap = createFocusTrap(cartTab, {
    allowOutsideClick: true,
    escapeDeactivates: false
  });
  const configureTrap = createFocusTrap(configureTab, {
    allowOutsideClick: true,
    escapeDeactivates: false
  }); // Initial cart fetch

  cart.get().then(renderCart); // On every update

  c("cart:updated", ({
    cart
  }) => renderCart(cart));
  dispatchCustomEvent(CustomEvents.cartUpdated, {
    cart: cart
  });
  const overlayClick = e$2(overlay, "click", close);
  const closeClick = e$2(t$3("[data-close]", node), "click", close);
  const keyDown = e$2(node, "keydown", checkEscape);
  c("cart:open", (_, {
    flash
  }) => open(flash));
  c("cart:configureLoading", () => {
    open(false, true);
    i(cartTab, "visible");
    u(configureTab, "visible");
  });
  c("cart:configureReady", (_, {
    html,
    handle
  }) => {
    const product = getProduct(handle);
    product(data => {
      i(addContainer, "loading");
      contents.innerHTML = html;
      handleForm(data, configureTab);
      configureTrap.activate();
      dispatchCustomEvent(CustomEvents.quickViewLoaded);
    });
  });

  function open(variant, configure) {
    u(node, "active");
    setTimeout(() => {
      disableBodyScroll(node, {
        allowTouchMove: el => {
          while (el && el !== document.body) {
            if (el.getAttribute("data-scroll-lock-ignore") !== null) {
              return true;
            }

            el = el.parentNode;
          }
        },
        reserveScrollBarGap: true
      });
      u(node, "visible");
      dispatchCustomEvent(CustomEvents.quickCartOpen);
      l(configureTab, "visible", configure === true);
      l(cartTab, "visible", !configure);
      !configure && cartTrap.activate(); // Flash a product when opening

      if (variant) {
        u(n$1(`[data-id="${variant}"]`, node), "flash");
        setTimeout(() => {
          i(n$1(`[data-id="${variant}"]`, node), "flash");
        }, 2000);
      }
    }, 50);
  }

  function close() {
    i(node, "visible");
    setTimeout(() => {
      i(node, "active");
      enableBodyScroll(node);
      i(configureTab, "visible");
      u(addContainer, "loading");
      u(cartTab, "visible");
      cartTrap.deactivate();
      configureTrap.deactivate();
      dispatchCustomEvent(CustomEvents.quickCartClose);
    }, 350);
  }

  function checkEscape({
    keyCode
  }) {
    if (keyCode === 27) close();
  }

  function renderCart(cart) {
    const {
      cart_level_discount_applications: cartDiscounts
    } = cart;
    itemsContainer.innerHTML = renderItems(cart);
    discounts.innerHTML = renderCartDiscounts(cartDiscounts);
    l(footer, "visible", cart.sorted.length);
    l(empty, "visible", !cart.sorted.length);
    l(discounts, "visible", cartDiscounts.length);

    if (subtotal) {
      subtotal.innerHTML = formatMoney(cart.total_price);
    }
  }

  function renderItems({
    sorted
  }) {
    return r(sorted.length > 0, sorted.reduce((markup, item) => markup += createItem(item), ""));
  }

  function destroy() {
    overlayClick();
    keyDown();
    closeClick();
  }

  return {
    open,
    close,
    destroy
  };
}

function createItem({
  line_level_discount_allocations: discounts,
  ...item
}) {
  const imgSrc = item.featured_image ? item.featured_image.url : item.image;
  const imgAlt = item.featured_image ? item.featured_image.alt : "";
  const imgUrl = imgSrc && getSizedImageUrl(imgSrc, "120x");
  const image = r(imgSrc, `<img class="image__img lazyload" alt="${imgAlt}" data-src="${imgUrl}" />`);
  const sellingPlanName = item.selling_plan_allocation ? `<p class="fs-body-small c-subdued">${item.selling_plan_allocation.selling_plan.name}</p>` : ``;
  return `
    <div class="quick-cart__item ff-body" data-id="${item.variant_id}">
      <div class="quick-cart__item-left">
        <a href="${item.url}">
          <div class="quick-cart__image">${image}</div>
        </a>
        <div class="quick-cart__control">
          <button class="quick-cart__button" data-decrease="${item.variant_id}" href="#">
            ${svg.remove}
          </button>
          <div class="quick-cart__qty ff-body ta-c" data-qty>${item.quantity}</div>
          <button class="quick-cart__button" data-increase="${item.variant_id}" href="#">
            ${svg.add}
          </button>
        </div>
      </div>
      <div class="quick-cart__item-right">
        <h4><a href="${item.url}">${item.product_title}</a></h4>
        <div>
          ${r(item.original_price > item.final_price, `<s class="qty">${formatMoney(item.original_price)}</s>`)}
          ${formatMoney(item.final_price)}
          ${r(item.quantity > 1, `<span class="c-subdued">x ${item.quantity}</span>`)}
        </div>
        ${renderOptions(item)}
        ${renderLineDiscounts(discounts)}
        ${renderUnitPrice(item.unit_price, item.unit_price_measurement)}
        ${sellingPlanName}
        <a role="button" href="#" class="quick-cart__item-remove" data-item-id="${item.variant_id}">${window.theme.strings.cart.remove}</a>
      </div>
    </div>
  `;
}

function renderOptions({
  options_with_values: options,
  variant_title
}) {
  return r(options.length > 0 && variant_title, options.reduce((markup, {
    name,
    value
  }) => markup + `<div>${name}: ${value}</div>`, ""));
}

function renderCartDiscounts(discounts) {
  return r(Boolean(discounts.length), `
      <ul>
        ${discounts.map(({
    title,
    total_allocated_amount: value
  }) => `<div>${title} (-${formatMoney(value)})</div>`)}
      </ul>
    `);
}

function renderLineDiscounts(discounts) {
  const formatted_discounts = discounts.map(({
    amount,
    discount_application: {
      title
    }
  }) => {
    return `<li>${title} (-${formatMoney(amount)})</li>`;
  });
  return r(Boolean(discounts.length), `<ul class="quick-cart__item-discounts c-subdued">${formatted_discounts}</ul>`);
}

function r(bool, whenTrue) {
  return bool ? whenTrue : ``;
}

function PredictiveSearch(resultsContainer) {
  const cachedResults = {};

  function renderSearchResults(resultsMarkup) {
    resultsContainer.innerHTML = resultsMarkup;
  }

  function getSearchResults(searchTerm) {
    const queryKey = searchTerm.replace(" ", "-").toLowerCase(); // Render result if it appears within the cache

    if (cachedResults[`${queryKey}`]) {
      renderSearchResults(cachedResults[`${queryKey}`]);
      return;
    }

    fetch(`${window.theme.routes.predictive_search_url}?q=${encodeURIComponent(searchTerm)}&section_id=predictive-search`).then(response => {
      if (!response.ok) {
        const error = new Error(response.status);
        throw error;
      }

      return response.text();
    }).then(text => {
      let resultsMarkup = new DOMParser().parseFromString(text, "text/html").querySelector("#shopify-section-predictive-search").innerHTML; // Cache results

      cachedResults[queryKey] = resultsMarkup;
      renderSearchResults(resultsMarkup);
    }).catch(error => {
      throw error;
    });
  }

  return {
    getSearchResults
  };
}

const classes$8 = {
  active: "active",
  visible: "visible"
};
function QuickSearch (node) {
  const overlay = n$1("[data-overlay]", node);
  n$1("form", node);
  const input = n$1("[data-input]", node);
  const clear = n$1("[data-clear]", node);
  const resultsContainer = n$1("[data-results]", node);
  const focusTrap = createFocusTrap(node); // This gets replaced with a focus trapping util on `open` however

  const overlayClick = e$2(overlay, "click", close);
  const clearClick = e$2(clear, "click", reset);
  const keyDown = e$2(node, "keydown", checkEscape);
  const inputChange = e$2(input, "input", handleInput);
  const predictiveSearch = new PredictiveSearch(resultsContainer);

  function handleInput(e) {
    let populated = e.target.value !== "";
    if (e.target.value === "") i(resultsContainer, classes$8.visible);
    l(clear, classes$8.visible, populated);
    l(resultsContainer, classes$8.visible, populated);
    clear.setAttribute("tabindex", populated ? 0 : -1);
    predictiveSearch.getSearchResults(e.target.value);
  }

  function checkEscape({
    keyCode
  }) {
    if (keyCode === 27) close();
  } // Clear contents of the search input and hide results container


  function reset(e) {
    e.preventDefault();
    input.value = "";
    i([resultsContainer, clear], classes$8.visible);
    input.focus();
  }

  function open() {
    u(node, classes$8.active);
    setTimeout(() => {
      focusTrap.activate();
      disableBodyScroll(node, {
        reserveScrollBarGap: true
      });
      u(node, classes$8.visible);
    }, 50);
  }

  function close() {
    i(node, classes$8.visible);
    setTimeout(() => {
      i(node, classes$8.active);
      enableBodyScroll(node);
      focusTrap.deactivate();
    }, 350);
  }

  function destroy() {
    close();
    overlayClick();
    clearClick();
    keyDown();
    inputChange();
  }

  return {
    open,
    close,
    destroy
  };
}

const selectors$e = {
  collection: "[data-collection]",
  image: "[data-image]",
  overlay: "[data-overlay]",
  trigger: "[data-trigger]",
  submenu: "[data-submenu]"
};
function MegaNavLegacy(node) {
  const image = n$1(selectors$e.image, node);
  const parents = t$3(selectors$e.trigger, node);
  const submenus = t$3(selectors$e.submenu, node);
  const collections = t$3(selectors$e.collection, node);
  const focusTrap = createFocusTrap(node);
  const images = t$3(".image", node);
  const defaultImage = n$1(".image--mega-nav-legacy-image", node);
  const showImages = node.dataset.showImages === "true";
  let imageOpen = showImages;
  const events = [// Click on the overlay and close mega nav
  e$2(n$1(selectors$e.overlay, node), "click", close), // Click on a parent item and show child nav
  e$2(parents, "click", e => {
    e.preventDefault();
    const {
      trigger: triggerId
    } = e.currentTarget.dataset; // Hide the image

    if (showImages) {
      i(image, "visible");
      i(defaultImage, "active");
      imageOpen = false;
    }

    submenus.forEach(menu => {
      const {
        submenu: id
      } = menu.dataset;
      l(menu, "visible", id === triggerId);
      menu.toggleAttribute("hidden", id !== triggerId);

      if (id === triggerId) {
        n$1("a", menu).focus();
      }
    });
  }), // Show image when hovering over some link items
  showImages && e$2(collections, "mouseover", e => {
    const {
      collection
    } = e.currentTarget.dataset;
    images.forEach(image => {
      l(image, "active", image.classList.contains(`image--${collection}`));
    });

    if (!imageOpen) {
      u(image, "visible");
    }
  }), // Hide image when hover removed
  showImages && e$2(collections, "mouseout", () => {
    i(images, "active");
    defaultImage && l(defaultImage, "active", imageOpen);
    l(image, "visible", imageOpen);
  }), // Close on escape
  e$2(node, "keydown", ({
    keyCode
  }) => {
    if (keyCode === 27) close();
  })].filter(Boolean);

  function open(options = {}) {
    u(node, "active");

    if (options.leftPosition) {
      let leftPosition = options.leftPosition; // Avoid dropdown from being displayed off

      const edgeMargin = 30;
      const rect = node.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      if (rect && leftPosition + rect.width + edgeMargin > viewportWidth) {
        leftPosition = viewportWidth - rect.width - edgeMargin;
      }

      node.style.left = `${leftPosition}px`;
    }

    setTimeout(() => {
      focusTrap.activate();
      disableBodyScroll(node, {
        reserveScrollBarGap: true
      });
      u(node, "visible");
      node.removeAttribute("hidden");
      showImages && u(defaultImage, "active");
    }, 50);
  }

  function close() {
    i(node, "visible");
    node.setAttribute("hidden", "");
    setTimeout(() => {
      i(node, "active");
      enableBodyScroll(node);
      focusTrap.deactivate();
      events.forEach(evt => evt());
    }, 350);
  }

  return {
    open,
    close
  };
}

const selectors$d = {
  collection: "[data-collection]",
  image: "[data-image]",
  overlay: "[data-overlay]",
  trigger: "[data-trigger]",
  submenu: "[data-submenu]"
};
function MegaNav(node) {
  const focusTrap = createFocusTrap(node);
  const events = [// Click on the overlay and close mega nav
  e$2(n$1(selectors$d.overlay, node), "click", close), // Close on escape
  e$2(node, "keydown", ({
    keyCode
  }) => {
    if (keyCode === 27) close();
  })].filter(Boolean);

  function open(options = {}) {
    u(node, "active");
    setTimeout(() => {
      focusTrap.activate();
      disableBodyScroll(node, {
        reserveScrollBarGap: true
      });
      u(node, "visible");
      node.removeAttribute("hidden");
    }, 50);
  }

  function close() {
    i(node, "visible");
    node.setAttribute("hidden", "");
    setTimeout(() => {
      i(node, "active");
      enableBodyScroll(node);
      focusTrap.deactivate();
      events.forEach(evt => evt());
    }, 350);
  }

  return {
    open,
    close
  };
}

function Navigation(node) {
  if (!node) return;
  const parents = t$3("[data-parent]", node);
  const megaParents = t$3("[data-mega]", node);
  if (!parents && !megaParents) return;
  let current = null;
  const events = [e$2(document, "click", e => handleBodyClick(e)), e$2([...parents, ...megaParents], "mouseup", e => e.preventDefault()), e$2(parents, "click", e => e.preventDefault()), // Close on escape
  e$2(node, "keydown", event => {
    const {
      keyCode
    } = event;
    if (keyCode === 27) closeAll();
  }), e$2(parents, "click", e => {
    e.preventDefault();
    [...e.currentTarget.parentNode.parentNode.children].filter(el => !el.contains(e.currentTarget)).forEach(el => i(t$3("[data-submenu]", el), "active"));
    toggleMenu(e.currentTarget.parentNode, e.currentTarget);
  }), e$2(megaParents, "click", e => {
    e.preventDefault();
    const menuLeftPosition = e.currentTarget?.getBoundingClientRect()?.left;
    const megaNavLegacyEl = n$1("[data-mega-nav-legacy]", e.currentTarget.parentNode);
    const megaNavEl = n$1("[data-mega-nav]", e.currentTarget.parentNode);

    if (megaNavLegacyEl) {
      const megaNavLegacy = MegaNavLegacy(megaNavLegacyEl);
      megaNavLegacy.open({
        leftPosition: menuLeftPosition
      });
    } else if (megaNavEl) {
      const megaNav = MegaNav(megaNavEl);
      megaNav.open();
    }
  }), e$2(t$3(".header__links-list > li > a", node), "focus", closeAll), // Close everything when focus leaves the main menu
  e$2(t$3("[data-link]", node), "focusout", e => {
    if (e.relatedTarget && !e.relatedTarget.hasAttribute("data-link")) {
      closeAll();
    }
  }), c("megaNavLegacy:open", (_, {
    id
  }) => {
    current = MegaNavLegacy(n$1(`[data-id="${id}"]`, node));
    current.open();
  }), c("megaNav:open", (_, {
    id
  }) => {
    current = MegaNav(n$1(`[data-id="${id}"]`, node));
    current.open();
  }), c(["megaNavLegacy:close", "megaNav:close"], () => {
    current && current.close();
  })];

  function handleBodyClick(e) {
    if (e?.target && !e.target.closest("[data-submenu-parent]")) {
      closeAll();
    }
  }

  function toggleMenu(listElement, linkElement) {
    const header = n$1("[data-section-type='header']");
    const menu = n$1("[data-submenu]", listElement);
    const willShow = !menu.offsetWidth > 0 && !menu.offsetHeight > 0;

    if (willShow && linkElement.dataset.topLevelParent) {
      const headerLeftPosition = header?.getBoundingClientRect()?.left;
      const menuLeftPosition = listElement?.getBoundingClientRect()?.left;
      menu.style.left = `${menuLeftPosition - headerLeftPosition}px`;
    }

    l(menu, "active", willShow);
  }

  function closeAll(e) {
    const focusedElement = n$1(":focus", node);
    const potentialOpenElementParent = focusedElement?.closest("[data-submenu-parent]");

    if (potentialOpenElementParent && focusedElement.parentNode !== potentialOpenElementParent) {
      setTimeout(function () {
        n$1("a", potentialOpenElementParent).focus();
      }, 100);
    }

    i(t$3("[data-submenu]", node), "active");
  }

  function destroy() {
    events.forEach(evt => evt());
  }

  return {
    destroy
  };
}

/**
 * delayOffset takes an array of selectors and sets the `--delay-offset-multiplier` variable in the correct order
 * @param {node} element The section element
 * @param {items} array Array of animation items
 */

var delayOffset = ((node, items, offsetStart = 0) => {
  let delayOffset = offsetStart;
  items.forEach(selector => {
    const items = t$3(selector, node);
    items.forEach(item => {
      item.style.setProperty("--delay-offset-multiplier", delayOffset);
      delayOffset++;
    });
  });
});

const selectors$c = {
  menuPrimary: ".drawer-menu__primary-links",
  subMenus: ".drawer-menu__list--sub",
  menuFooter: ".drawer-menu__footer",
  animationItem: ".animation--drawer-menu-item"
};
const classes$7 = {
  animationRevealed: "animation--drawer-menu-revealed"
};
var animateDrawerMenu = (node => {
  const primaryMenu = n$1(selectors$c.menuPrimary, node);
  const primaryMenuDirectLinks = t$3(`${selectors$c.menuPrimary} > ${selectors$c.animationItem}`);
  delayOffset(primaryMenu, [`:scope > ${selectors$c.animationItem}`]);
  const subMenus = t$3(selectors$c.subMenus, node);
  subMenus.forEach(menu => {
    delayOffset(menu, [`:scope > ${selectors$c.animationItem}`]);
  });
  const footerMenu = n$1(selectors$c.menuFooter);

  if (footerMenu) {
    delayOffset(footerMenu, [`:scope > ${selectors$c.animationItem}`, `:scope  .drawer-menu__form > ${selectors$c.animationItem}`], primaryMenuDirectLinks.length);
  } // Trigger the reveal animation on primary links when the drawer is opened


  function openMain(node) {
    u(node, classes$7.animationRevealed);
  } // Trigger the reveal animation on se;ected sub links when opened


  function openSub(menu) {
    u(menu, classes$7.animationRevealed);
  }

  return {
    openMain,
    openSub
  };
});

const selectors$b = {
  productItems: ".animation--grid-item:not(.animation--grid-item-revealed)"
};
const classes$6 = {
  itemRevealed: "animation--grid-item-revealed"
};
var animateGrid = (node => {
  setupProductItems();

  function setupProductItems() {
    const productItems = t$3(selectors$b.productItems, node);
    delayOffset(node, [selectors$b.productItems]);
    setTimeout(() => {
      u(productItems, classes$6.itemRevealed);
    }, 0);
  }

  return {
    setupProductItems
  };
});

const selectors$a = {
  items: ".animation--item",
  slide: ".slideshow__cell"
};
var animateSlideshow = (node => {
  const slides = t$3(selectors$a.slide, node);
  slides.forEach(slide => delayOffset(slide, [selectors$a.items]));
});

const selectors$9 = {
  clear: "[data-search-clear]",
  input: "[data-input]",
  results: "[data-search-results]",
  search: "[data-search-submit]"
};
function Search(container) {
  // Elements
  const input = n$1(selectors$9.input, container);
  const resultsContainer = n$1(selectors$9.results, container);
  const clearButton = n$1(selectors$9.clear, container);
  const searchButton = n$1(selectors$9.search, container); // Events

  const inputChange = e$2(input, "input", handleInputChange);
  const clearClick = e$2(clearButton, "click", reset); // This gets replaced with a focus trapping util on `open` however

  const predictiveSearch = new PredictiveSearch(resultsContainer);

  function handleInputChange({
    target: {
      value
    }
  }) {
    l([resultsContainer, clearButton, searchButton], "visible", value !== "");
    predictiveSearch.getSearchResults(value);
  }

  function reset(e) {
    e.preventDefault();
    input.value = "";
    i([resultsContainer, clearButton, searchButton], "visible");
    resultsContainer.innerHTML = "";
    input.focus();
  }

  function destroy() {
    inputChange();
    clearClick();
  }

  return {
    destroy
  };
}

const sel$a = {
  overlay: "[data-overlay]",
  listItem: "[data-list-item]",
  item: "[data-item]",
  allLinks: "[data-all-links]",
  main: "[data-main]",
  primary: "[data-primary-container]",
  footer: "[data-footer]",
  searchSettings: "[data-search-settings]",
  link: ".drawer-menu__link",
  subMenuLinks: ".drawer-menu__item > .drawer-menu__link",
  topLevelLinks: '[data-depth="0"] > .drawer-menu__item > .drawer-menu__link',
  // Cross border
  form: ".drawer-menu__form",
  localeInput: "[data-locale-input]",
  currencyInput: "[data-currency-input]"
};
const classes$5 = {
  active: "active",
  visible: "visible",
  childVisible: "child-visible",
  countrySelector: "drawer-menu__list--country-selector"
}; // Extra space we add to the height of the inner container

const formatHeight = h => h + 8 + "px";

const menu = node => {
  const focusTrap = createFocusTrap(node, {
    initialFocus: ".drawer-menu__link"
  });

  let primaryDepth = 0; // The individual link list the merchant selected

  let linksDepth = 0; // Element that holds all links, primary and secondary

  const everything = n$1(sel$a.allLinks, node); // This is the element that holds the one we move left and right (primary)
  // We also need to assign its height initially so we get smooth transitions

  const main = n$1(sel$a.main, node); // Element that holds all the primary links and moves left and right

  const primary = n$1(sel$a.primary, node); // Cross border

  const form = n$1(sel$a.form, node);
  const localeInput = n$1(sel$a.localeInput, node);
  const currencyInput = n$1(sel$a.currencyInput, node);
  const search = Search(node); // Nodes

  const overlay = n$1(sel$a.overlay, node);
  const parents = t$3('[data-item="parent"]', node);
  const parentBack = t$3('[data-item="back"]', node);
  const secondary = t$3('[data-item="secondary"]', node);
  const secondaryBack = t$3('[data-item="secondaryHeading"]', node);
  const languages = t$3('[data-item="locale"]', node);
  const currencies = t$3('[data-item="currency"]', node);
  const events = [// Click on overlay
  e$2(overlay, "click", close), // Esc pressed
  e$2(node, "keydown", ({
    keyCode
  }) => {
    if (keyCode === 27) close();
  }), // Element that will navigate to child navigation list
  e$2(parents, "click", clickParent), // Element that will navigate back up the tree
  e$2(parentBack, "click", clickBack), // Account, currency, and language link at the bottom
  e$2(secondary, "click", handleSecondaryLink), // Back link within 'Currency' or 'Language'
  e$2(secondaryBack, "click", handleBackFromSecondaryMenu), // Individual language
  e$2(languages, "click", e => handleCrossBorder(e, localeInput)), // Individual currency
  e$2(currencies, "click", e => handleCrossBorder(e, currencyInput))];
  const drawerAnimations = animateDrawerMenu(node);

  function open() {
    u(node, classes$5.active);
    u(node, classes$5.visible);
    focusTrap.activate();
    disableBodyScroll(node, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute("data-scroll-lock-ignore") !== null) {
            return true;
          }

          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });

    if (primaryDepth === 0 && linksDepth === 0) {
      main.style.height = formatHeight(primary.offsetHeight);
      drawerAnimations.openMain(everything);
    }
  }

  function close() {
    focusTrap.deactivate();
    i(node, classes$5.visible);
    setTimeout(() => {
      i(node, classes$5.active);
      enableBodyScroll(node);
    }, 350);
  }

  function clickParent(e) {
    e.preventDefault();
    const link = e.currentTarget;
    const childMenu = link.nextElementSibling;
    const firstFocusable = n$1(".drawer-menu__link", childMenu);
    setTimeout(() => {
      firstFocusable.focus();
    }, 250);
    u(childMenu, classes$5.visible);
    u(link.parentNode, classes$5.childVisible);
    main.style.height = formatHeight(childMenu.offsetHeight);
    const elements = t$3(`:scope > ${sel$a.listItem}`, childMenu);
    let links = t$3(`:scope > ${sel$a.subMenuLinks}`, childMenu);
    drawerAnimations.openSub(elements[0].parentNode);
    navigate(linksDepth += 1);
    disableAllLinksExcept(links, true);
    link.setAttribute("aria-expanded", true);
    childMenu.setAttribute("aria-hidden", false);
  }

  function disableAllLinksExcept(links, addFooterLinks) {
    // We also want to always enable footer items as they are always visible
    const toDisable = t$3(`${sel$a.link}`, node);
    let linksToEnable = links;

    if (addFooterLinks) {
      linksToEnable.push(...t$3(`${sel$a.footer} ${sel$a.link}`, node));
    }

    disableLinks(toDisable);
    enableLinks(linksToEnable);
  }

  function navigate(depth) {
    linksDepth = depth;
    primary.setAttribute("data-depth", depth);
  }

  function navigatePrimary(depth) {
    primaryDepth = depth;
    everything.setAttribute("data-depth", depth);
  }

  function clickBack(e) {
    e.preventDefault();
    const menuBefore = e.currentTarget.closest(sel$a.listItem).closest("ul");
    const firstFocusable = n$1(".drawer-menu__link", menuBefore);
    const menu = e.currentTarget.closest("ul");
    const parentLink = n$1(".drawer-menu__link", menu.parentNode);
    const menuBeforeLinks = t$3(`:scope > ${sel$a.subMenuLinks}`, menuBefore);
    main.style.height = formatHeight(menuBefore.offsetHeight);
    i(menu, classes$5.visible);
    i(parentLink.parentNode, classes$5.childVisible);
    navigate(linksDepth -= 1);
    parentLink.setAttribute("aria-expanded", false);
    menu.setAttribute("aria-hidden", true);
    disableAllLinksExcept(menuBeforeLinks, true);
    setTimeout(() => {
      firstFocusable.focus();
    }, 250);
  }

  function handleSecondaryLink(e) {
    e.preventDefault();
    navigatePrimary(1);
    const childMenu = e.currentTarget.nextElementSibling;
    u(childMenu, classes$5.visible);
    const elements = t$3(sel$a.link, childMenu); // let links = qsa(`:scope > ${sel.subMenuLinks}`, childMenu);

    disableAllLinksExcept(elements);

    if (!childMenu.classList.contains(classes$5.countrySelector)) {
      drawerAnimations.openSub(elements[0].parentNode);
    } // const firstFocusable = qs('.drawer-menu__link', childMenu);


    setTimeout(() => {
      elements[0].focus();
    }, 250);
  }

  function handleBackFromSecondaryMenu(e) {
    e.preventDefault();
    navigatePrimary(0);
    const topLeveLinks = t$3(`${sel$a.topLevelLinks}`, node);
    disableAllLinksExcept(topLeveLinks, true);
    const parent = e.currentTarget.closest("ul");
    i(parent, classes$5.visible);
    setTimeout(() => {
      topLeveLinks[0].focus();
    }, 250);
  }

  function handleCrossBorder(e, input) {
    const {
      value
    } = e.currentTarget.dataset;
    input.value = value;
    close();
    form.submit();
  }

  function destroy() {
    events.forEach(unsubscribe => unsubscribe());
    enableBodyScroll(node);
    search.destroy();
  }

  return {
    close,
    destroy,
    open
  };
};

function setHeaderHeightVar(height) {
  document.documentElement.style.setProperty("--height-header", height + "px");
}

register("header", {
  onLoad() {
    const {
      enableQuickCart,
      enableQuickAddToCart
    } = document.body.dataset;
    const cartIcon = n$1("[data-js-cart-icon]", this.container);
    const cartIndicator = n$1("[data-js-cart-indicator]", cartIcon);
    const count = n$1("[data-js-cart-count]", this.container);
    const menuButton = n$1("[data-js-menu-button]", this.container);
    const searchButton = n$1("[data-search]", this.container);
    const space = n$1("[data-header-space]", document);
    const menu$1 = menu(n$1("[data-drawer-menu]"));
    const quickSearch = QuickSearch(n$1("[data-quick-search]", this.container));
    const navigation = Navigation(n$1("[data-navigation]", this.container)); // These all return a function for cleanup

    this.listeners = [c("cart:updated", ({
      cart
    }) => {
      i(cartIndicator, "visible");
      setTimeout(() => u(cartIndicator, "visible"), 500);
      count.innerHTML = cart.item_count;
    }), e$2(menuButton, "click", preventDefault(menu$1.open)), e$2(searchButton, "click", preventDefault(quickSearch.open))]; // Components return a destroy function for cleanup

    this.components = [menu$1, quickSearch, navigation];

    if (enableQuickCart || enableQuickAddToCart) {
      const quickCart = QuickCart(n$1("[data-quick-cart]", this.container));
      this.components.push(quickCart);

      if (enableQuickCart) {
        this.listeners.push(e$2(cartIcon, "click", preventDefault(quickCart.open)));
      }
    } // Our header is always sticky (with position: sticky) however at some
    // point we want to adjust the styling (eg. box-shadow) so we toggle
    // the is-sticky class when our arbitrary space element (.header__space)
    // goes in and out of the viewport.


    this.io = new IntersectionObserver(([{
      isIntersecting: visible
    }]) => {
      l(this.container, "is-sticky", !visible);
    });
    this.io.observe(space); // This will watch the height of the header and update the --height-header
    // css variable when necessary. That var gets used for the negative top margin
    // to render the page body under the transparent header

    this.ro = new index(([{
      target
    }]) => {
      if (!a$1(target, "is-sticky")) {
        setHeaderHeightVar(target.offsetHeight);
      }
    });
    this.ro.observe(this.container);
  },

  onUnload() {
    this.listeners.forEach(l => l());
    this.components.forEach(c => c.destroy());
    this.io.disconnect();
    this.ro.disconnect();
  },

  onBlockSelect({
    target
  }) {
    if (target.dataset.megaNavLegacy === "") {
      r$1("megaNavLegacy:open", null, {
        id: target.dataset.id
      });
    } else if (target.dataset.megaNav === "") {
      r$1("megaNav:open", null, {
        id: target.dataset.id
      });
    }
  },

  onBlockDeselect({
    target
  }) {
    if (target.dataset.megaNavLegacy === "") {
      r$1("megaNavLegacy:close");
    } else if (target.dataset.megaNav === "") {
      r$1("megaNav:close");
    }
  }

});

register("image-with-text", {
  onLoad() {},

  onUnload() {}

});

register("newsletter", {
  onLoad() {},

  onUnload() {}

});

var isMobile$2 = {exports: {}};

isMobile$2.exports = isMobile;
isMobile$2.exports.isMobile = isMobile;
isMobile$2.exports.default = isMobile;

var mobileRE = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series[46]0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i;

var tabletRE = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series[46]0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino|android|ipad|playbook|silk/i;

function isMobile (opts) {
  if (!opts) opts = {};
  var ua = opts.ua;
  if (!ua && typeof navigator !== 'undefined') ua = navigator.userAgent;
  if (ua && ua.headers && typeof ua.headers['user-agent'] === 'string') {
    ua = ua.headers['user-agent'];
  }
  if (typeof ua !== 'string') return false

  var result = opts.tablet ? tabletRE.test(ua) : mobileRE.test(ua);

  if (
    !result &&
    opts.tablet &&
    opts.featureDetect &&
    navigator &&
    navigator.maxTouchPoints > 1 &&
    ua.indexOf('Macintosh') !== -1 &&
    ua.indexOf('Safari') !== -1
  ) {
    result = true;
  }

  return result
}

var isMobile$1 = isMobile$2.exports;

function localStorageAvailable() {
  var test = "test";

  try {
    localStorage.setItem(test, test);

    if (localStorage.getItem(test) !== test) {
      return false;
    }

    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

const PREFIX = "fluco_";

function getStorage(key) {
  if (!localStorageAvailable()) return null;
  return JSON.parse(localStorage.getItem(PREFIX + key));
}

function setStorage(key, val) {
  if (!localStorageAvailable()) return null;
  localStorage.setItem(PREFIX + key, val);
  return true;
}

function Popup(container) {
  const focusTrap = createFocusTrap(container, {
    allowOutsideClick: false
  });
  const {
    id,
    popupType,
    timeout
  } = container.dataset;
  const storageKey = `popup-${id}`;
  const ageVerifiedKey = `age-verified-${id}`;
  const ageIsVerified = Boolean(getStorage(ageVerifiedKey));

  let bodyLeave = () => {};

  const mouseleave = e => {
    if (!e.relatedTarget && !e.toElement) {
      showPopup();
      bodyLeave();
    }
  };

  const events = []; // Initialize popup based on type

  const popupTypes = {
    "age_popup": () => {
      const verifyBtn = n$1("[data-verify-age]", container);

      if (verifyBtn && !window.Shopify.designMode) {
        events.push(e$2([verifyBtn], "click", e => {
          e.preventDefault();
          hidePopup();
        }));
      }

      if (!ageIsVerified) {
        showPopup();
      }
    },
    "popup": () => {
      if (!window.Shopify.designMode) {
        const closeBtn = n$1("[data-close]", container);
        const overlay = n$1("[data-overlay]", container);
        events.push(e$2([closeBtn, overlay], "click", e => {
          e.preventDefault();
          hidePopup();
        }));
        events.push(e$2(container, "keydown", ({
          keyCode
        }) => {
          if (keyCode === 27) hidePopup();
        }));
      }

      if (!getStorage(storageKey) && isMobile$1()) {
        setTimeout(() => showPopup(), parseInt(timeout));
      } else if (!getStorage(storageKey)) {
        bodyLeave = e$2(document.body, "mouseout", mouseleave);
      }
    }
  };
  popupTypes[popupType]();

  function showPopup() {
    u(container, "visible");

    if (popupType === "age_popup") {
      disableBodyScroll(container);
      focusTrap.activate();
    }
  }

  function hidePopup() {
    setStorage(storageKey, JSON.stringify(new Date()));
    i(container, "visible");

    if (popupType === "age_popup") {
      setStorage(ageVerifiedKey, JSON.stringify(new Date()));
      setTimeout(() => {
        focusTrap.deactivate();
        enableBodyScroll(container);
      }, 350);
    }
  }

  function unload() {
    bodyLeave();
    events.forEach(unsubscribe => unsubscribe());

    if (popupType === "age_popup") {
      focusTrap.deactivate();
      enableBodyScroll(container);
    }
  }

  return {
    unload,
    showPopup,
    hidePopup
  };
}

register("popup", {
  onLoad() {
    this.popups = t$3("[data-popup]", this.container).map(popup => {
      return {
        contructor: Popup(popup),
        element: popup
      };
    });
  },

  onBlockSelect({
    target
  }) {
    const targetPopup = this.popups.find(o => o.element === target);
    targetPopup.contructor.showPopup();
  },

  onBlockDeselect({
    target
  }) {
    const targetPopup = this.popups.find(o => o.element === target);
    targetPopup.contructor.hidePopup();
  },

  onUnload() {
    this.popups.forEach(popup => popup.contructor?.unload());
  }

});

const sel$9 = {
  recommendations: "[data-recommendations]",
  slider: "[data-slider]"
};
register("recommended-products", {
  onLoad() {
    const {
      limit,
      productId: id,
      sectionId
    } = this.container.dataset;
    const content = n$1(sel$9.recommendations, this.container);
    if (!content) return;
    const requestUrl = `${window.theme.routes.productRecommendations}?section_id=${sectionId}&limit=${limit}&product_id=${id}`;
    const request = new XMLHttpRequest();
    request.open("GET", requestUrl, true);

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        let container = document.createElement("div");
        container.innerHTML = request.response; // Check if the response includes a product item
        // and if it doesn't remove the entire section

        const item = n$1(".product-item", container);

        if (!item) {
          this.container.parentNode.removeChild(this.container);
          return;
        }

        content.innerHTML = n$1(sel$9.recommendations, container).innerHTML;
        const carousel = n$1(sel$9.slider, content);

        if (carousel) {
          this.mobileCarousel = mobileCarousel(carousel);
        }
      } else {
        // If request returns any errors remove the section markup
        this.container.parentNode.removeChild(this.container);
      }
    };

    request.send();
  },

  onUnload() {
    this.mobileCarousel && this.mobileCarousel.destroy();
  }

});

const sel$8 = {
  partial: "[data-partial]",
  slider: "[data-slider]"
};
const classes$4 = {
  hidden: "hidden"
};
register("complementary-products", {
  onLoad() {
    this.sectionId = this.container.dataset.sectionId;
    this.productId = this.container.dataset.productId;
    this.productSource = this.container.dataset.productSource;
    this.limit = this.container.dataset.limit;

    if (this.productSource === "app-recommendations") {
      this.handleRecommendedProducts();
    } else {
      this.initSlider();
    }
  },

  handleRecommendedProducts() {
    const requestUrl = `${theme.routes.productRecommendations}?section_id=${this.sectionId}&limit=${this.limit}&product_id=${this.productId}&intent=complementary`;
    const request = new XMLHttpRequest();
    request.open("GET", requestUrl, true);

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        let container = document.createElement("div");
        container.innerHTML = request.response;
        const item = n$1(".product-item", container);

        if (item) {
          this.container.innerHTML = n$1(sel$8.partial, container).innerHTML;
          i(this.container, classes$4.hidden);
        }

        if (Shopify.designMode) {
          i(this.container, classes$4.hidden);
        }

        this.initSlider();
      }
    };

    request.send();
  },

  initSlider() {
    const carousel = n$1(sel$8.slider, this.container);

    if (carousel) {
      this.mobileCarousel = mobileCarousel(carousel);
    }
  },

  onUnload() {
    this.mobileCarousel && this.mobileCarousel.destroy();
  }

});

register("rich-text", {
  onLoad() {},

  onUnload() {}

});

const selectors$8 = {
  dots: ".navigation-dot"
};

const navigationDots = (container, slider) => {
  const navigationDots = t$3(selectors$8.dots, container);
  const events = [];
  navigationDots.forEach(dot => {
    events.push(e$2(dot, "click", e => _handlePageDot(e)));
  });

  const _handlePageDot = e => {
    e.preventDefault();
    if (e.target.classList.contains("is-selected")) return;
    const {
      slideIndex
    } = e.target.dataset;
    slider.select(slideIndex);
    slider.pausePlayer();
  };

  const update = cellIndex => {
    const activeClass = "is-selected";
    navigationDots.forEach(dot => i(dot, activeClass));
    u(navigationDots[cellIndex], activeClass);
  };

  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };

  return {
    update,
    unload
  };
};

var simpleParallax_min = {exports: {}};

/*!
 * simpleParallax.min - simpleParallax is a simple JavaScript library that gives your website parallax animations on any images or videos, 
 * @date: 20-08-2020 14:0:14, 
 * @version: 5.6.2,
 * @link: https://simpleparallax.com/
 */

(function (module, exports) {
!function(t,e){module.exports=e();}(window,(function(){return function(t){var e={};function n(i){if(e[i])return e[i].exports;var r=e[i]={i:i,l:!1,exports:{}};return t[i].call(r.exports,r,r.exports,n),r.l=!0,r.exports}return n.m=t,n.c=e,n.d=function(t,e,i){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:i});},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0});},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var i=Object.create(null);if(n.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var r in t)n.d(i,r,function(e){return t[e]}.bind(null,r));return i},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=0)}([function(t,e,n){n.r(e),n.d(e,"default",(function(){return x}));var i=function(){return Element.prototype.closest&&"IntersectionObserver"in window};function r(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i);}}var s=new(function(){function t(){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t),this.positions={top:0,bottom:0,height:0};}var e,n;return e=t,(n=[{key:"setViewportTop",value:function(t){return this.positions.top=t?t.scrollTop:window.pageYOffset,this.positions}},{key:"setViewportBottom",value:function(){return this.positions.bottom=this.positions.top+this.positions.height,this.positions}},{key:"setViewportAll",value:function(t){return this.positions.top=t?t.scrollTop:window.pageYOffset,this.positions.height=t?t.clientHeight:document.documentElement.clientHeight,this.positions.bottom=this.positions.top+this.positions.height,this.positions}}])&&r(e.prototype,n),t}()),o=function(t){return NodeList.prototype.isPrototypeOf(t)||HTMLCollection.prototype.isPrototypeOf(t)?Array.from(t):"string"==typeof t||t instanceof String?document.querySelectorAll(t):[t]},a=function(){for(var t,e="transform webkitTransform mozTransform oTransform msTransform".split(" "),n=0;void 0===t;)t=void 0!==document.createElement("div").style[e[n]]?e[n]:void 0,n+=1;return t}(),l=function(t){return "img"!==t.tagName.toLowerCase()&&"picture"!==t.tagName.toLowerCase()||!!t&&(!!t.complete&&(void 0===t.naturalWidth||0!==t.naturalWidth))};function u(t){return function(t){if(Array.isArray(t))return c(t)}(t)||function(t){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(t))return Array.from(t)}(t)||function(t,e){if(!t)return;if("string"==typeof t)return c(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);"Object"===n&&t.constructor&&(n=t.constructor.name);if("Map"===n||"Set"===n)return Array.from(t);if("Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return c(t,e)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function c(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,i=new Array(e);n<e;n++)i[n]=t[n];return i}function h(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i);}}var f=function(){function t(e,n){var i=this;!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t),this.element=e,this.elementContainer=e,this.settings=n,this.isVisible=!0,this.isInit=!1,this.oldTranslateValue=-1,this.init=this.init.bind(this),this.customWrapper=this.settings.customWrapper&&this.element.closest(this.settings.customWrapper)?this.element.closest(this.settings.customWrapper):null,l(e)?this.init():this.element.addEventListener("load",(function(){setTimeout((function(){i.init(!0);}),50);}));}var e,n;return e=t,(n=[{key:"init",value:function(t){var e=this;this.isInit||(t&&(this.rangeMax=null),this.element.closest(".simpleParallax")||(!1===this.settings.overflow&&this.wrapElement(this.element),this.setTransformCSS(),this.getElementOffset(),this.intersectionObserver(),this.getTranslateValue(),this.animate(),this.settings.delay>0?setTimeout((function(){e.setTransitionCSS(),e.elementContainer.classList.add("simple-parallax-initialized");}),10):this.elementContainer.classList.add("simple-parallax-initialized"),this.isInit=!0));}},{key:"wrapElement",value:function(){var t=this.element.closest("picture")||this.element,e=this.customWrapper||document.createElement("div");e.classList.add("simpleParallax"),e.style.overflow="hidden",this.customWrapper||(t.parentNode.insertBefore(e,t),e.appendChild(t)),this.elementContainer=e;}},{key:"unWrapElement",value:function(){var t=this.elementContainer;this.customWrapper?(t.classList.remove("simpleParallax"),t.style.overflow=""):t.replaceWith.apply(t,u(t.childNodes));}},{key:"setTransformCSS",value:function(){!1===this.settings.overflow&&(this.element.style[a]="scale(".concat(this.settings.scale,")")),this.element.style.willChange="transform";}},{key:"setTransitionCSS",value:function(){this.element.style.transition="transform ".concat(this.settings.delay,"s ").concat(this.settings.transition);}},{key:"unSetStyle",value:function(){this.element.style.willChange="",this.element.style[a]="",this.element.style.transition="";}},{key:"getElementOffset",value:function(){var t=this.elementContainer.getBoundingClientRect();if(this.elementHeight=t.height,this.elementTop=t.top+s.positions.top,this.settings.customContainer){var e=this.settings.customContainer.getBoundingClientRect();this.elementTop=t.top-e.top+s.positions.top;}this.elementBottom=this.elementHeight+this.elementTop;}},{key:"buildThresholdList",value:function(){for(var t=[],e=1;e<=this.elementHeight;e++){var n=e/this.elementHeight;t.push(n);}return t}},{key:"intersectionObserver",value:function(){var t={root:null,threshold:this.buildThresholdList()};this.observer=new IntersectionObserver(this.intersectionObserverCallback.bind(this),t),this.observer.observe(this.element);}},{key:"intersectionObserverCallback",value:function(t){var e=this;t.forEach((function(t){t.isIntersecting?e.isVisible=!0:e.isVisible=!1;}));}},{key:"checkIfVisible",value:function(){return this.elementBottom>s.positions.top&&this.elementTop<s.positions.bottom}},{key:"getRangeMax",value:function(){var t=this.element.clientHeight;this.rangeMax=t*this.settings.scale-t;}},{key:"getTranslateValue",value:function(){var t=((s.positions.bottom-this.elementTop)/((s.positions.height+this.elementHeight)/100)).toFixed(1);return t=Math.min(100,Math.max(0,t)),0!==this.settings.maxTransition&&t>this.settings.maxTransition&&(t=this.settings.maxTransition),this.oldPercentage!==t&&(this.rangeMax||this.getRangeMax(),this.translateValue=(t/100*this.rangeMax-this.rangeMax/2).toFixed(0),this.oldTranslateValue!==this.translateValue&&(this.oldPercentage=t,this.oldTranslateValue=this.translateValue,!0))}},{key:"animate",value:function(){var t,e=0,n=0;(this.settings.orientation.includes("left")||this.settings.orientation.includes("right"))&&(n="".concat(this.settings.orientation.includes("left")?-1*this.translateValue:this.translateValue,"px")),(this.settings.orientation.includes("up")||this.settings.orientation.includes("down"))&&(e="".concat(this.settings.orientation.includes("up")?-1*this.translateValue:this.translateValue,"px")),t=!1===this.settings.overflow?"translate3d(".concat(n,", ").concat(e,", 0) scale(").concat(this.settings.scale,")"):"translate3d(".concat(n,", ").concat(e,", 0)"),this.element.style[a]=t;}}])&&h(e.prototype,n),t}();function m(t){return function(t){if(Array.isArray(t))return y(t)}(t)||function(t){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(t))return Array.from(t)}(t)||d(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function p(t,e){return function(t){if(Array.isArray(t))return t}(t)||function(t,e){if("undefined"==typeof Symbol||!(Symbol.iterator in Object(t)))return;var n=[],i=!0,r=!1,s=void 0;try{for(var o,a=t[Symbol.iterator]();!(i=(o=a.next()).done)&&(n.push(o.value),!e||n.length!==e);i=!0);}catch(t){r=!0,s=t;}finally{try{i||null==a.return||a.return();}finally{if(r)throw s}}return n}(t,e)||d(t,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function d(t,e){if(t){if("string"==typeof t)return y(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);return "Object"===n&&t.constructor&&(n=t.constructor.name),"Map"===n||"Set"===n?Array.from(t):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?y(t,e):void 0}}function y(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,i=new Array(e);n<e;n++)i[n]=t[n];return i}function v(t,e){for(var n=0;n<e.length;n++){var i=e[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i);}}var g,b,w=!1,T=[],x=function(){function t(e,n){if(function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t),e&&i()){if(this.elements=o(e),this.defaults={delay:0,orientation:"up",scale:1.3,overflow:!1,transition:"cubic-bezier(0,0,0,1)",customContainer:"",customWrapper:"",maxTransition:0},this.settings=Object.assign(this.defaults,n),this.settings.customContainer){var r=p(o(this.settings.customContainer),1);this.customContainer=r[0];}this.lastPosition=-1,this.resizeIsDone=this.resizeIsDone.bind(this),this.refresh=this.refresh.bind(this),this.proceedRequestAnimationFrame=this.proceedRequestAnimationFrame.bind(this),this.init();}}var e,n;return e=t,(n=[{key:"init",value:function(){var t=this;s.setViewportAll(this.customContainer),T=[].concat(m(this.elements.map((function(e){return new f(e,t.settings)}))),m(T)),w||(this.proceedRequestAnimationFrame(),window.addEventListener("resize",this.resizeIsDone),w=!0);}},{key:"resizeIsDone",value:function(){clearTimeout(b),b=setTimeout(this.refresh,200);}},{key:"proceedRequestAnimationFrame",value:function(){var t=this;s.setViewportTop(this.customContainer),this.lastPosition!==s.positions.top?(s.setViewportBottom(),T.forEach((function(e){t.proceedElement(e);})),g=window.requestAnimationFrame(this.proceedRequestAnimationFrame),this.lastPosition=s.positions.top):g=window.requestAnimationFrame(this.proceedRequestAnimationFrame);}},{key:"proceedElement",value:function(t){(this.customContainer?t.checkIfVisible():t.isVisible)&&t.getTranslateValue()&&t.animate();}},{key:"refresh",value:function(){s.setViewportAll(this.customContainer),T.forEach((function(t){t.getElementOffset(),t.getRangeMax();})),this.lastPosition=-1;}},{key:"destroy",value:function(){var t=this,e=[];T=T.filter((function(n){return t.elements.includes(n.element)?(e.push(n),!1):n})),e.forEach((function(e){e.unSetStyle(),!1===t.settings.overflow&&e.unWrapElement();})),T.length||(window.cancelAnimationFrame(g),window.removeEventListener("resize",this.refresh),w=!1);}}])&&v(e.prototype,n),t}();}]).default}));
}(simpleParallax_min));

var simpleParallax = /*@__PURE__*/getDefaultExportFromCjs(simpleParallax_min.exports);

const autoPlay = videos => {
  if (!videos.length) return;
  const events = [e$2(window, "click", () => _handleAutoPlay()), e$2(window, "touchstart", () => _handleAutoPlay())]; // Force autoplay after device interaction if in low power mode

  function _handleAutoPlay() {
    videos.forEach(video => {
      if (!video.playing) {
        video.play();
      }
    });
    events.forEach(unsubscribe => unsubscribe());
  }
};

const sel$7 = {
  slider: "[data-slider]",
  video: ".slideshow__video",
  slides: ".slideshow__cell"
};
register("slideshow", {
  slideshow: null,
  events: [],

  onLoad() {
    const reduceMotion = prefersReducedMotion();
    const slider = n$1(sel$7.slider, this.container);
    const {
      autoplay,
      parallax
    } = this.container.dataset;
    const videos = t$3(sel$7.video, this.container);
    this.videoHandlers = [];
    this.animateSlideshow = animateSlideshow(this.container);
    this.slides = t$3(sel$7.slides, this.container);

    if (videos.length) {
      videos.forEach(video => {
        this.videoHandlers.push(backgroundVideoHandler(video.parentNode));
        autoPlay(videos);
      });
    }

    i(slider, "is-hidden"); // trigger redraw for transition

    slider.offsetHeight;
    this.slideshow = null;

    const _handleSlideBecomesVisible = (slideEl, options = {}) => {
      const deferredVideo = n$1(".slideshow__video.deferred-load", slideEl);
      this.slides.forEach(slide => i(slide, "slide--can-animate"));

      if (deferredVideo) {
        deferredVideo.load();
        i(deferredVideo, "deferred-load");

        if (!options.reduceMotion) {
          deferredVideo.play();
        }
      }

      setTimeout(() => {
        u(slideEl, "slide--can-animate");
      }, options.animationDelay || 0);
    };

    import(flu.chunks.flickity).then(({
      Flickity
    }) => {
      this.slideshow = new Flickity(slider, {
        adaptiveHeight: true,
        autoPlay: !reduceMotion && Number(autoplay),
        draggable: true,
        prevNextButtons: false,
        wrapAround: true,
        pageDots: false,
        on: {
          ready: () => {
            const first = n$1("[data-slide]", this.container);
            var slideshow = Flickity.data(slider); // This is a pain but we can't access the instance within here

            syncTabIndexesOnFlickity(slideshow);

            _handleSlideBecomesVisible(first, {
              reduceMotion,
              animationDelay: 800
            }); // TODO: should this only trigger if the slide is in-view?

          }
        }
      }); // Handle events with anchor slides

      let isDragging = false;
      this.slideshow.on("dragStart", e => {
        isDragging = true;
      });
      this.slideshow.on("dragEnd", e => {
        isDragging = false;
      });
      this.slideshow.on("staticClick", (e, pointer, cellElement, cellIndex) => {
        // if the cell is an anchor, redirect to the href
        if (cellElement.tagName === "A") {
          if (!isDragging) {
            window.location.href = cellElement.getAttribute("href");
          }
        } else {
          // if clicked element is not an anchor go to the next slide
          if (e.target.tagName !== "A") {
            this.slideshow.next();
          }
        }
      }); // Prevent default on slides that are anchor tags and delegate click handling to staticClick instead

      const anchorCells = t$3("a[data-slide]", this.container);
      anchorCells.forEach(anchor => {
        anchor.addEventListener("click", e => {
          e.preventDefault();
          e.stopPropagation();
        });
      }); // Handle dot navigation

      this.dotNavigation = navigationDots(this.container, this.slideshow);
      this.slideshow.on("change", index => {
        const activeSlide = this.slideshow.cells[index].element;
        this.dotNavigation && this.dotNavigation.update(index);
        syncTabIndexesOnFlickity(this.slideshow);

        _handleSlideBecomesVisible(activeSlide, {
          reduceMotion,
          animationDelay: 200
        });
      });
      r$1("slideshow:initialized");
    });

    if (parallax == "true") {
      const images = this.container.querySelectorAll(".image__img");
      this.parallax = new simpleParallax(images, {
        customWrapper: ".slideshow__parallax-wrapper",
        scale: 1.5
      });
    }
  },

  _handleBlockSelect(slideIndex) {
    this.slideshow.select(slideIndex);

    this._pause();
  },

  _pause() {
    this.slideshow && this.slideshow.pausePlayer();
  },

  _unpause() {
    this.slideshow && this.slideshow.unpausePlayer();
  },

  onBlockSelect({
    target
  }) {
    if (this.slideshow) {
      this._handleBlockSelect(target.dataset.index);
    } else {
      // Listen for initalization if slideshow does not exist
      this.events.push(c("slideshow:initialized", () => {
        this._handleBlockSelect(target.dataset.index);
      }));
    }
  },

  onBlockDeselect() {
    if (this.slideshow) {
      this._unpause();
    } else {
      // Listen for initalization if slideshow does not exist
      this.events.push(c("slideshow:initialized", () => {
        this._unpause();
      }));
    }

    this.parallax && this.parallax.destroy();
  },

  onUnload() {
    this.slideshow && this.slideshow.destroy();
    this.events.forEach(unsubscribe => unsubscribe());
    this.videoHandlers.forEach(handler => handler());
    this.dotNavigation && this.dotNavigation.unload();
  }

});

const sel$6 = {
  image: "img",
  slider: "[data-slider]",
  slides: "[data-slide]"
};
register("testimonials", {
  onLoad() {
    const slider = n$1(sel$6.slider, this.container);
    const slides = t$3(sel$6.slides, this.container);
    const images = t$3(sel$6.image, this.container);

    if (images.length !== slides.length) {
      u(this.container, "testimonials--vertical");
      return;
    }

    this.mobileCarousel = mobileCarousel(slider);
  },

  onUnload() {
    this.mobileCarousel && this.mobileCarousel.destroy();
  },

  onBlockSelect({
    target
  }) {
    this.mobileCarousel && this.mobileCarousel.select(target.dataset.index);
  }

});

const sel$5 = {
  slider: "[data-slider]"
};
register("text-columns-with-images", {
  onLoad() {
    const slider = this.container.querySelector(sel$5.slider);
    this.mobileCarousel = mobileCarousel(slider);
  },

  onUnload() {
    this.mobileCarousel.destroy();
  },

  onBlockSelect({
    target
  }) {
    this.mobileCarousel.select(target.dataset.index);
  }

});

var dist = {exports: {}};

var Sister;

/**
* @link https://github.com/gajus/sister for the canonical source repository
* @license https://github.com/gajus/sister/blob/master/LICENSE BSD 3-Clause
*/
Sister = function () {
    var sister = {},
        events = {};

    /**
     * @name handler
     * @function
     * @param {Object} data Event data.
     */

    /**
     * @param {String} name Event name.
     * @param {handler} handler
     * @return {listener}
     */
    sister.on = function (name, handler) {
        var listener = {name: name, handler: handler};
        events[name] = events[name] || [];
        events[name].unshift(listener);
        return listener;
    };

    /**
     * @param {listener}
     */
    sister.off = function (listener) {
        var index = events[listener.name].indexOf(listener);

        if (index !== -1) {
            events[listener.name].splice(index, 1);
        }
    };

    /**
     * @param {String} name Event name.
     * @param {Object} data Event data.
     */
    sister.trigger = function (name, data) {
        var listeners = events[name],
            i;

        if (listeners) {
            i = listeners.length;
            while (i--) {
                listeners[i].handler(data);
            }
        }
    };

    return sister;
};

var sister = Sister;

var loadYouTubeIframeApi = {exports: {}};

var loadScript = function load (src, opts, cb) {
  var head = document.head || document.getElementsByTagName('head')[0];
  var script = document.createElement('script');

  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  opts = opts || {};
  cb = cb || function() {};

  script.type = opts.type || 'text/javascript';
  script.charset = opts.charset || 'utf8';
  script.async = 'async' in opts ? !!opts.async : true;
  script.src = src;

  if (opts.attrs) {
    setAttributes(script, opts.attrs);
  }

  if (opts.text) {
    script.text = '' + opts.text;
  }

  var onend = 'onload' in script ? stdOnEnd : ieOnEnd;
  onend(script, cb);

  // some good legacy browsers (firefox) fail the 'in' detection above
  // so as a fallback we always set onload
  // old IE will ignore this and new IE will set onload
  if (!script.onload) {
    stdOnEnd(script, cb);
  }

  head.appendChild(script);
};

function setAttributes(script, attrs) {
  for (var attr in attrs) {
    script.setAttribute(attr, attrs[attr]);
  }
}

function stdOnEnd (script, cb) {
  script.onload = function () {
    this.onerror = this.onload = null;
    cb(null, script);
  };
  script.onerror = function () {
    // this.onload = null here is necessary
    // because even IE9 works not like others
    this.onerror = this.onload = null;
    cb(new Error('Failed to load ' + this.src), script);
  };
}

function ieOnEnd (script, cb) {
  script.onreadystatechange = function () {
    if (this.readyState != 'complete' && this.readyState != 'loaded') return
    this.onreadystatechange = null;
    cb(null, script); // there is no way to catch loading errors in IE8
  };
}

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _loadScript = loadScript;

var _loadScript2 = _interopRequireDefault(_loadScript);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (emitter) {
  /**
   * A promise that is resolved when window.onYouTubeIframeAPIReady is called.
   * The promise is resolved with a reference to window.YT object.
   */
  var iframeAPIReady = new Promise(function (resolve) {
    if (window.YT && window.YT.Player && window.YT.Player instanceof Function) {
      resolve(window.YT);

      return;
    } else {
      var protocol = window.location.protocol === 'http:' ? 'http:' : 'https:';

      (0, _loadScript2.default)(protocol + '//www.youtube.com/iframe_api', function (error) {
        if (error) {
          emitter.trigger('error', error);
        }
      });
    }

    var previous = window.onYouTubeIframeAPIReady;

    // The API will call this function when page has finished downloading
    // the JavaScript for the player API.
    window.onYouTubeIframeAPIReady = function () {
      if (previous) {
        previous();
      }

      resolve(window.YT);
    };
  });

  return iframeAPIReady;
};

module.exports = exports['default'];
}(loadYouTubeIframeApi, loadYouTubeIframeApi.exports));

var YouTubePlayer = {exports: {}};

var browser = {exports: {}};

var debug = {exports: {}};

/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

var ms = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}

(function (module, exports) {
/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = ms;

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  return debug;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  exports.names = [];
  exports.skips = [];

  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}
}(debug, debug.exports));

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

(function (module, exports) {
exports = module.exports = debug.exports;
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit');

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}
}(browser, browser.exports));

var functionNames = {exports: {}};

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});


/**
 * @see https://developers.google.com/youtube/iframe_api_reference#Functions
 */
exports.default = ['cueVideoById', 'loadVideoById', 'cueVideoByUrl', 'loadVideoByUrl', 'playVideo', 'pauseVideo', 'stopVideo', 'getVideoLoadedFraction', 'cuePlaylist', 'loadPlaylist', 'nextVideo', 'previousVideo', 'playVideoAt', 'setShuffle', 'setLoop', 'getPlaylist', 'getPlaylistIndex', 'setOption', 'mute', 'unMute', 'isMuted', 'setVolume', 'getVolume', 'seekTo', 'getPlayerState', 'getPlaybackRate', 'setPlaybackRate', 'getAvailablePlaybackRates', 'getPlaybackQuality', 'setPlaybackQuality', 'getAvailableQualityLevels', 'getCurrentTime', 'getDuration', 'removeEventListener', 'getVideoUrl', 'getVideoEmbedCode', 'getOptions', 'getOption', 'addEventListener', 'destroy', 'setSize', 'getIframe'];
module.exports = exports['default'];
}(functionNames, functionNames.exports));

var eventNames = {exports: {}};

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});


/**
 * @see https://developers.google.com/youtube/iframe_api_reference#Events
 * `volumeChange` is not officially supported but seems to work
 * it emits an object: `{volume: 82.6923076923077, muted: false}`
 */
exports.default = ['ready', 'stateChange', 'playbackQualityChange', 'playbackRateChange', 'error', 'apiChange', 'volumeChange'];
module.exports = exports['default'];
}(eventNames, eventNames.exports));

var FunctionStateMap = {exports: {}};

var PlayerStates = {exports: {}};

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  BUFFERING: 3,
  ENDED: 0,
  PAUSED: 2,
  PLAYING: 1,
  UNSTARTED: -1,
  VIDEO_CUED: 5
};
module.exports = exports["default"];
}(PlayerStates, PlayerStates.exports));

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _PlayerStates = PlayerStates.exports;

var _PlayerStates2 = _interopRequireDefault(_PlayerStates);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  pauseVideo: {
    acceptableStates: [_PlayerStates2.default.ENDED, _PlayerStates2.default.PAUSED],
    stateChangeRequired: false
  },
  playVideo: {
    acceptableStates: [_PlayerStates2.default.ENDED, _PlayerStates2.default.PLAYING],
    stateChangeRequired: false
  },
  seekTo: {
    acceptableStates: [_PlayerStates2.default.ENDED, _PlayerStates2.default.PLAYING, _PlayerStates2.default.PAUSED],
    stateChangeRequired: true,

    // TRICKY: `seekTo` may not cause a state change if no buffering is
    // required.
    timeout: 3000
  }
};
module.exports = exports['default'];
}(FunctionStateMap, FunctionStateMap.exports));

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debug = browser.exports;

var _debug2 = _interopRequireDefault(_debug);

var _functionNames = functionNames.exports;

var _functionNames2 = _interopRequireDefault(_functionNames);

var _eventNames = eventNames.exports;

var _eventNames2 = _interopRequireDefault(_eventNames);

var _FunctionStateMap = FunctionStateMap.exports;

var _FunctionStateMap2 = _interopRequireDefault(_FunctionStateMap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable promise/prefer-await-to-then */

var debug = (0, _debug2.default)('youtube-player');

var YouTubePlayer = {};

/**
 * Construct an object that defines an event handler for all of the YouTube
 * player events. Proxy captured events through an event emitter.
 *
 * @todo Capture event parameters.
 * @see https://developers.google.com/youtube/iframe_api_reference#Events
 */
YouTubePlayer.proxyEvents = function (emitter) {
  var events = {};

  var _loop = function _loop(eventName) {
    var onEventName = 'on' + eventName.slice(0, 1).toUpperCase() + eventName.slice(1);

    events[onEventName] = function (event) {
      debug('event "%s"', onEventName, event);

      emitter.trigger(eventName, event);
    };
  };

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = _eventNames2.default[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var eventName = _step.value;

      _loop(eventName);
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return events;
};

/**
 * Delays player API method execution until player state is ready.
 *
 * @todo Proxy all of the methods using Object.keys.
 * @todo See TRICKY below.
 * @param playerAPIReady Promise that resolves when player is ready.
 * @param strictState A flag designating whether or not to wait for
 * an acceptable state when calling supported functions.
 * @returns {Object}
 */
YouTubePlayer.promisifyPlayer = function (playerAPIReady) {
  var strictState = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var functions = {};

  var _loop2 = function _loop2(functionName) {
    if (strictState && _FunctionStateMap2.default[functionName]) {
      functions[functionName] = function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        return playerAPIReady.then(function (player) {
          var stateInfo = _FunctionStateMap2.default[functionName];
          var playerState = player.getPlayerState();

          // eslint-disable-next-line no-warning-comments
          // TODO: Just spread the args into the function once Babel is fixed:
          // https://github.com/babel/babel/issues/4270
          //
          // eslint-disable-next-line prefer-spread
          var value = player[functionName].apply(player, args);

          // TRICKY: For functions like `seekTo`, a change in state must be
          // triggered given that the resulting state could match the initial
          // state.
          if (stateInfo.stateChangeRequired ||

          // eslint-disable-next-line no-extra-parens
          Array.isArray(stateInfo.acceptableStates) && stateInfo.acceptableStates.indexOf(playerState) === -1) {
            return new Promise(function (resolve) {
              var onPlayerStateChange = function onPlayerStateChange() {
                var playerStateAfterChange = player.getPlayerState();

                var timeout = void 0;

                if (typeof stateInfo.timeout === 'number') {
                  timeout = setTimeout(function () {
                    player.removeEventListener('onStateChange', onPlayerStateChange);

                    resolve();
                  }, stateInfo.timeout);
                }

                if (Array.isArray(stateInfo.acceptableStates) && stateInfo.acceptableStates.indexOf(playerStateAfterChange) !== -1) {
                  player.removeEventListener('onStateChange', onPlayerStateChange);

                  clearTimeout(timeout);

                  resolve();
                }
              };

              player.addEventListener('onStateChange', onPlayerStateChange);
            }).then(function () {
              return value;
            });
          }

          return value;
        });
      };
    } else {
      functions[functionName] = function () {
        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        return playerAPIReady.then(function (player) {
          // eslint-disable-next-line no-warning-comments
          // TODO: Just spread the args into the function once Babel is fixed:
          // https://github.com/babel/babel/issues/4270
          //
          // eslint-disable-next-line prefer-spread
          return player[functionName].apply(player, args);
        });
      };
    }
  };

  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = _functionNames2.default[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var functionName = _step2.value;

      _loop2(functionName);
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  return functions;
};

exports.default = YouTubePlayer;
module.exports = exports['default'];
}(YouTubePlayer, YouTubePlayer.exports));

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _sister = sister;

var _sister2 = _interopRequireDefault(_sister);

var _loadYouTubeIframeApi = loadYouTubeIframeApi.exports;

var _loadYouTubeIframeApi2 = _interopRequireDefault(_loadYouTubeIframeApi);

var _YouTubePlayer = YouTubePlayer.exports;

var _YouTubePlayer2 = _interopRequireDefault(_YouTubePlayer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @typedef YT.Player
 * @see https://developers.google.com/youtube/iframe_api_reference
 * */

/**
 * @see https://developers.google.com/youtube/iframe_api_reference#Loading_a_Video_Player
 */
var youtubeIframeAPI = void 0;

/**
 * A factory function used to produce an instance of YT.Player and queue function calls and proxy events of the resulting object.
 *
 * @param maybeElementId Either An existing YT.Player instance,
 * the DOM element or the id of the HTML element where the API will insert an <iframe>.
 * @param options See `options` (Ignored when using an existing YT.Player instance).
 * @param strictState A flag designating whether or not to wait for
 * an acceptable state when calling supported functions. Default: `false`.
 * See `FunctionStateMap.js` for supported functions and acceptable states.
 */

exports.default = function (maybeElementId) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var strictState = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var emitter = (0, _sister2.default)();

  if (!youtubeIframeAPI) {
    youtubeIframeAPI = (0, _loadYouTubeIframeApi2.default)(emitter);
  }

  if (options.events) {
    throw new Error('Event handlers cannot be overwritten.');
  }

  if (typeof maybeElementId === 'string' && !document.getElementById(maybeElementId)) {
    throw new Error('Element "' + maybeElementId + '" does not exist.');
  }

  options.events = _YouTubePlayer2.default.proxyEvents(emitter);

  var playerAPIReady = new Promise(function (resolve) {
    if ((typeof maybeElementId === 'undefined' ? 'undefined' : _typeof(maybeElementId)) === 'object' && maybeElementId.playVideo instanceof Function) {
      var player = maybeElementId;

      resolve(player);
    } else {
      // asume maybeElementId can be rendered inside
      // eslint-disable-next-line promise/catch-or-return
      youtubeIframeAPI.then(function (YT) {
        // eslint-disable-line promise/prefer-await-to-then
        var player = new YT.Player(maybeElementId, options);

        emitter.on('ready', function () {
          resolve(player);
        });

        return null;
      });
    }
  });

  var playerApi = _YouTubePlayer2.default.promisifyPlayer(playerAPIReady, strictState);

  playerApi.on = emitter.on;
  playerApi.off = emitter.off;

  return playerApi;
};

module.exports = exports['default'];
}(dist, dist.exports));

var t = /*@__PURE__*/getDefaultExportFromCjs(dist.exports);

/*! @vimeo/player v2.17.1 | (c) 2022 Vimeo | MIT License | https://github.com/vimeo/player.js */
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

/**
 * @module lib/functions
 */

/**
 * Check to see this is a node environment.
 * @type {Boolean}
 */

/* global global */
var isNode = typeof global !== 'undefined' && {}.toString.call(global) === '[object global]';
/**
 * Get the name of the method for a given getter or setter.
 *
 * @param {string} prop The name of the property.
 * @param {string} type Either “get” or “set”.
 * @return {string}
 */

function getMethodName(prop, type) {
  if (prop.indexOf(type.toLowerCase()) === 0) {
    return prop;
  }

  return "".concat(type.toLowerCase()).concat(prop.substr(0, 1).toUpperCase()).concat(prop.substr(1));
}
/**
 * Check to see if the object is a DOM Element.
 *
 * @param {*} element The object to check.
 * @return {boolean}
 */

function isDomElement(element) {
  return Boolean(element && element.nodeType === 1 && 'nodeName' in element && element.ownerDocument && element.ownerDocument.defaultView);
}
/**
 * Check to see whether the value is a number.
 *
 * @see http://dl.dropboxusercontent.com/u/35146/js/tests/isNumber.html
 * @param {*} value The value to check.
 * @param {boolean} integer Check if the value is an integer.
 * @return {boolean}
 */

function isInteger(value) {
  // eslint-disable-next-line eqeqeq
  return !isNaN(parseFloat(value)) && isFinite(value) && Math.floor(value) == value;
}
/**
 * Check to see if the URL is a Vimeo url.
 *
 * @param {string} url The url string.
 * @return {boolean}
 */

function isVimeoUrl(url) {
  return /^(https?:)?\/\/((player|www)\.)?vimeo\.com(?=$|\/)/.test(url);
}
/**
 * Check to see if the URL is for a Vimeo embed.
 *
 * @param {string} url The url string.
 * @return {boolean}
 */

function isVimeoEmbed(url) {
  var expr = /^https:\/\/player\.vimeo\.com\/video\/\d+/;
  return expr.test(url);
}
/**
 * Get the Vimeo URL from an element.
 * The element must have either a data-vimeo-id or data-vimeo-url attribute.
 *
 * @param {object} oEmbedParameters The oEmbed parameters.
 * @return {string}
 */

function getVimeoUrl() {
  var oEmbedParameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var id = oEmbedParameters.id;
  var url = oEmbedParameters.url;
  var idOrUrl = id || url;

  if (!idOrUrl) {
    throw new Error('An id or url must be passed, either in an options object or as a data-vimeo-id or data-vimeo-url attribute.');
  }

  if (isInteger(idOrUrl)) {
    return "https://vimeo.com/".concat(idOrUrl);
  }

  if (isVimeoUrl(idOrUrl)) {
    return idOrUrl.replace('http:', 'https:');
  }

  if (id) {
    throw new TypeError("\u201C".concat(id, "\u201D is not a valid video id."));
  }

  throw new TypeError("\u201C".concat(idOrUrl, "\u201D is not a vimeo.com url."));
}

var arrayIndexOfSupport = typeof Array.prototype.indexOf !== 'undefined';
var postMessageSupport = typeof window !== 'undefined' && typeof window.postMessage !== 'undefined';

if (!isNode && (!arrayIndexOfSupport || !postMessageSupport)) {
  throw new Error('Sorry, the Vimeo Player API is not available in this browser.');
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

/*!
 * weakmap-polyfill v2.0.4 - ECMAScript6 WeakMap polyfill
 * https://github.com/polygonplanet/weakmap-polyfill
 * Copyright (c) 2015-2021 polygonplanet <polygon.planet.aqua@gmail.com>
 * @license MIT
 */
(function (self) {

  if (self.WeakMap) {
    return;
  }

  var hasOwnProperty = Object.prototype.hasOwnProperty;

  var hasDefine = Object.defineProperty && function () {
    try {
      // Avoid IE8's broken Object.defineProperty
      return Object.defineProperty({}, 'x', {
        value: 1
      }).x === 1;
    } catch (e) {}
  }();

  var defineProperty = function (object, name, value) {
    if (hasDefine) {
      Object.defineProperty(object, name, {
        configurable: true,
        writable: true,
        value: value
      });
    } else {
      object[name] = value;
    }
  };

  self.WeakMap = function () {
    // ECMA-262 23.3 WeakMap Objects
    function WeakMap() {
      if (this === void 0) {
        throw new TypeError("Constructor WeakMap requires 'new'");
      }

      defineProperty(this, '_id', genId('_WeakMap')); // ECMA-262 23.3.1.1 WeakMap([iterable])

      if (arguments.length > 0) {
        // Currently, WeakMap `iterable` argument is not supported
        throw new TypeError('WeakMap iterable is not supported');
      }
    } // ECMA-262 23.3.3.2 WeakMap.prototype.delete(key)


    defineProperty(WeakMap.prototype, 'delete', function (key) {
      checkInstance(this, 'delete');

      if (!isObject(key)) {
        return false;
      }

      var entry = key[this._id];

      if (entry && entry[0] === key) {
        delete key[this._id];
        return true;
      }

      return false;
    }); // ECMA-262 23.3.3.3 WeakMap.prototype.get(key)

    defineProperty(WeakMap.prototype, 'get', function (key) {
      checkInstance(this, 'get');

      if (!isObject(key)) {
        return void 0;
      }

      var entry = key[this._id];

      if (entry && entry[0] === key) {
        return entry[1];
      }

      return void 0;
    }); // ECMA-262 23.3.3.4 WeakMap.prototype.has(key)

    defineProperty(WeakMap.prototype, 'has', function (key) {
      checkInstance(this, 'has');

      if (!isObject(key)) {
        return false;
      }

      var entry = key[this._id];

      if (entry && entry[0] === key) {
        return true;
      }

      return false;
    }); // ECMA-262 23.3.3.5 WeakMap.prototype.set(key, value)

    defineProperty(WeakMap.prototype, 'set', function (key, value) {
      checkInstance(this, 'set');

      if (!isObject(key)) {
        throw new TypeError('Invalid value used as weak map key');
      }

      var entry = key[this._id];

      if (entry && entry[0] === key) {
        entry[1] = value;
        return this;
      }

      defineProperty(key, this._id, [key, value]);
      return this;
    });

    function checkInstance(x, methodName) {
      if (!isObject(x) || !hasOwnProperty.call(x, '_id')) {
        throw new TypeError(methodName + ' method called on incompatible receiver ' + typeof x);
      }
    }

    function genId(prefix) {
      return prefix + '_' + rand() + '.' + rand();
    }

    function rand() {
      return Math.random().toString().substring(2);
    }

    defineProperty(WeakMap, '_polyfill', true);
    return WeakMap;
  }();

  function isObject(x) {
    return Object(x) === x;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : typeof commonjsGlobal !== 'undefined' ? commonjsGlobal : commonjsGlobal);

var npo_src = createCommonjsModule(function (module) {
/*! Native Promise Only
    v0.8.1 (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/
(function UMD(name, context, definition) {
  // special form of UMD for polyfilling across evironments
  context[name] = context[name] || definition();

  if ( module.exports) {
    module.exports = context[name];
  }
})("Promise", typeof commonjsGlobal != "undefined" ? commonjsGlobal : commonjsGlobal, function DEF() {

  var builtInProp,
      cycle,
      scheduling_queue,
      ToString = Object.prototype.toString,
      timer = typeof setImmediate != "undefined" ? function timer(fn) {
    return setImmediate(fn);
  } : setTimeout; // dammit, IE8.

  try {
    Object.defineProperty({}, "x", {});

    builtInProp = function builtInProp(obj, name, val, config) {
      return Object.defineProperty(obj, name, {
        value: val,
        writable: true,
        configurable: config !== false
      });
    };
  } catch (err) {
    builtInProp = function builtInProp(obj, name, val) {
      obj[name] = val;
      return obj;
    };
  } // Note: using a queue instead of array for efficiency


  scheduling_queue = function Queue() {
    var first, last, item;

    function Item(fn, self) {
      this.fn = fn;
      this.self = self;
      this.next = void 0;
    }

    return {
      add: function add(fn, self) {
        item = new Item(fn, self);

        if (last) {
          last.next = item;
        } else {
          first = item;
        }

        last = item;
        item = void 0;
      },
      drain: function drain() {
        var f = first;
        first = last = cycle = void 0;

        while (f) {
          f.fn.call(f.self);
          f = f.next;
        }
      }
    };
  }();

  function schedule(fn, self) {
    scheduling_queue.add(fn, self);

    if (!cycle) {
      cycle = timer(scheduling_queue.drain);
    }
  } // promise duck typing


  function isThenable(o) {
    var _then,
        o_type = typeof o;

    if (o != null && (o_type == "object" || o_type == "function")) {
      _then = o.then;
    }

    return typeof _then == "function" ? _then : false;
  }

  function notify() {
    for (var i = 0; i < this.chain.length; i++) {
      notifyIsolated(this, this.state === 1 ? this.chain[i].success : this.chain[i].failure, this.chain[i]);
    }

    this.chain.length = 0;
  } // NOTE: This is a separate function to isolate
  // the `try..catch` so that other code can be
  // optimized better


  function notifyIsolated(self, cb, chain) {
    var ret, _then;

    try {
      if (cb === false) {
        chain.reject(self.msg);
      } else {
        if (cb === true) {
          ret = self.msg;
        } else {
          ret = cb.call(void 0, self.msg);
        }

        if (ret === chain.promise) {
          chain.reject(TypeError("Promise-chain cycle"));
        } else if (_then = isThenable(ret)) {
          _then.call(ret, chain.resolve, chain.reject);
        } else {
          chain.resolve(ret);
        }
      }
    } catch (err) {
      chain.reject(err);
    }
  }

  function resolve(msg) {
    var _then,
        self = this; // already triggered?


    if (self.triggered) {
      return;
    }

    self.triggered = true; // unwrap

    if (self.def) {
      self = self.def;
    }

    try {
      if (_then = isThenable(msg)) {
        schedule(function () {
          var def_wrapper = new MakeDefWrapper(self);

          try {
            _then.call(msg, function $resolve$() {
              resolve.apply(def_wrapper, arguments);
            }, function $reject$() {
              reject.apply(def_wrapper, arguments);
            });
          } catch (err) {
            reject.call(def_wrapper, err);
          }
        });
      } else {
        self.msg = msg;
        self.state = 1;

        if (self.chain.length > 0) {
          schedule(notify, self);
        }
      }
    } catch (err) {
      reject.call(new MakeDefWrapper(self), err);
    }
  }

  function reject(msg) {
    var self = this; // already triggered?

    if (self.triggered) {
      return;
    }

    self.triggered = true; // unwrap

    if (self.def) {
      self = self.def;
    }

    self.msg = msg;
    self.state = 2;

    if (self.chain.length > 0) {
      schedule(notify, self);
    }
  }

  function iteratePromises(Constructor, arr, resolver, rejecter) {
    for (var idx = 0; idx < arr.length; idx++) {
      (function IIFE(idx) {
        Constructor.resolve(arr[idx]).then(function $resolver$(msg) {
          resolver(idx, msg);
        }, rejecter);
      })(idx);
    }
  }

  function MakeDefWrapper(self) {
    this.def = self;
    this.triggered = false;
  }

  function MakeDef(self) {
    this.promise = self;
    this.state = 0;
    this.triggered = false;
    this.chain = [];
    this.msg = void 0;
  }

  function Promise(executor) {
    if (typeof executor != "function") {
      throw TypeError("Not a function");
    }

    if (this.__NPO__ !== 0) {
      throw TypeError("Not a promise");
    } // instance shadowing the inherited "brand"
    // to signal an already "initialized" promise


    this.__NPO__ = 1;
    var def = new MakeDef(this);

    this["then"] = function then(success, failure) {
      var o = {
        success: typeof success == "function" ? success : true,
        failure: typeof failure == "function" ? failure : false
      }; // Note: `then(..)` itself can be borrowed to be used against
      // a different promise constructor for making the chained promise,
      // by substituting a different `this` binding.

      o.promise = new this.constructor(function extractChain(resolve, reject) {
        if (typeof resolve != "function" || typeof reject != "function") {
          throw TypeError("Not a function");
        }

        o.resolve = resolve;
        o.reject = reject;
      });
      def.chain.push(o);

      if (def.state !== 0) {
        schedule(notify, def);
      }

      return o.promise;
    };

    this["catch"] = function $catch$(failure) {
      return this.then(void 0, failure);
    };

    try {
      executor.call(void 0, function publicResolve(msg) {
        resolve.call(def, msg);
      }, function publicReject(msg) {
        reject.call(def, msg);
      });
    } catch (err) {
      reject.call(def, err);
    }
  }

  var PromisePrototype = builtInProp({}, "constructor", Promise,
  /*configurable=*/
  false); // Note: Android 4 cannot use `Object.defineProperty(..)` here

  Promise.prototype = PromisePrototype; // built-in "brand" to signal an "uninitialized" promise

  builtInProp(PromisePrototype, "__NPO__", 0,
  /*configurable=*/
  false);
  builtInProp(Promise, "resolve", function Promise$resolve(msg) {
    var Constructor = this; // spec mandated checks
    // note: best "isPromise" check that's practical for now

    if (msg && typeof msg == "object" && msg.__NPO__ === 1) {
      return msg;
    }

    return new Constructor(function executor(resolve, reject) {
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      resolve(msg);
    });
  });
  builtInProp(Promise, "reject", function Promise$reject(msg) {
    return new this(function executor(resolve, reject) {
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      reject(msg);
    });
  });
  builtInProp(Promise, "all", function Promise$all(arr) {
    var Constructor = this; // spec mandated checks

    if (ToString.call(arr) != "[object Array]") {
      return Constructor.reject(TypeError("Not an array"));
    }

    if (arr.length === 0) {
      return Constructor.resolve([]);
    }

    return new Constructor(function executor(resolve, reject) {
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      var len = arr.length,
          msgs = Array(len),
          count = 0;
      iteratePromises(Constructor, arr, function resolver(idx, msg) {
        msgs[idx] = msg;

        if (++count === len) {
          resolve(msgs);
        }
      }, reject);
    });
  });
  builtInProp(Promise, "race", function Promise$race(arr) {
    var Constructor = this; // spec mandated checks

    if (ToString.call(arr) != "[object Array]") {
      return Constructor.reject(TypeError("Not an array"));
    }

    return new Constructor(function executor(resolve, reject) {
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      iteratePromises(Constructor, arr, function resolver(idx, msg) {
        resolve(msg);
      }, reject);
    });
  });
  return Promise;
});
});

/**
 * @module lib/callbacks
 */
var callbackMap = new WeakMap();
/**
 * Store a callback for a method or event for a player.
 *
 * @param {Player} player The player object.
 * @param {string} name The method or event name.
 * @param {(function(this:Player, *): void|{resolve: function, reject: function})} callback
 *        The callback to call or an object with resolve and reject functions for a promise.
 * @return {void}
 */

function storeCallback(player, name, callback) {
  var playerCallbacks = callbackMap.get(player.element) || {};

  if (!(name in playerCallbacks)) {
    playerCallbacks[name] = [];
  }

  playerCallbacks[name].push(callback);
  callbackMap.set(player.element, playerCallbacks);
}
/**
 * Get the callbacks for a player and event or method.
 *
 * @param {Player} player The player object.
 * @param {string} name The method or event name
 * @return {function[]}
 */

function getCallbacks(player, name) {
  var playerCallbacks = callbackMap.get(player.element) || {};
  return playerCallbacks[name] || [];
}
/**
 * Remove a stored callback for a method or event for a player.
 *
 * @param {Player} player The player object.
 * @param {string} name The method or event name
 * @param {function} [callback] The specific callback to remove.
 * @return {boolean} Was this the last callback?
 */

function removeCallback(player, name, callback) {
  var playerCallbacks = callbackMap.get(player.element) || {};

  if (!playerCallbacks[name]) {
    return true;
  } // If no callback is passed, remove all callbacks for the event


  if (!callback) {
    playerCallbacks[name] = [];
    callbackMap.set(player.element, playerCallbacks);
    return true;
  }

  var index = playerCallbacks[name].indexOf(callback);

  if (index !== -1) {
    playerCallbacks[name].splice(index, 1);
  }

  callbackMap.set(player.element, playerCallbacks);
  return playerCallbacks[name] && playerCallbacks[name].length === 0;
}
/**
 * Return the first stored callback for a player and event or method.
 *
 * @param {Player} player The player object.
 * @param {string} name The method or event name.
 * @return {function} The callback, or false if there were none
 */

function shiftCallbacks(player, name) {
  var playerCallbacks = getCallbacks(player, name);

  if (playerCallbacks.length < 1) {
    return false;
  }

  var callback = playerCallbacks.shift();
  removeCallback(player, name, callback);
  return callback;
}
/**
 * Move callbacks associated with an element to another element.
 *
 * @param {HTMLElement} oldElement The old element.
 * @param {HTMLElement} newElement The new element.
 * @return {void}
 */

function swapCallbacks(oldElement, newElement) {
  var playerCallbacks = callbackMap.get(oldElement);
  callbackMap.set(newElement, playerCallbacks);
  callbackMap.delete(oldElement);
}

/**
 * @module lib/postmessage
 */
/**
 * Parse a message received from postMessage.
 *
 * @param {*} data The data received from postMessage.
 * @return {object}
 */

function parseMessageData(data) {
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (error) {
      // If the message cannot be parsed, throw the error as a warning
      console.warn(error);
      return {};
    }
  }

  return data;
}
/**
 * Post a message to the specified target.
 *
 * @param {Player} player The player object to use.
 * @param {string} method The API method to call.
 * @param {object} params The parameters to send to the player.
 * @return {void}
 */

function postMessage(player, method, params) {
  if (!player.element.contentWindow || !player.element.contentWindow.postMessage) {
    return;
  }

  var message = {
    method: method
  };

  if (params !== undefined) {
    message.value = params;
  } // IE 8 and 9 do not support passing messages, so stringify them


  var ieVersion = parseFloat(navigator.userAgent.toLowerCase().replace(/^.*msie (\d+).*$/, '$1'));

  if (ieVersion >= 8 && ieVersion < 10) {
    message = JSON.stringify(message);
  }

  player.element.contentWindow.postMessage(message, player.origin);
}
/**
 * Parse the data received from a message event.
 *
 * @param {Player} player The player that received the message.
 * @param {(Object|string)} data The message data. Strings will be parsed into JSON.
 * @return {void}
 */

function processData(player, data) {
  data = parseMessageData(data);
  var callbacks = [];
  var param;

  if (data.event) {
    if (data.event === 'error') {
      var promises = getCallbacks(player, data.data.method);
      promises.forEach(function (promise) {
        var error = new Error(data.data.message);
        error.name = data.data.name;
        promise.reject(error);
        removeCallback(player, data.data.method, promise);
      });
    }

    callbacks = getCallbacks(player, "event:".concat(data.event));
    param = data.data;
  } else if (data.method) {
    var callback = shiftCallbacks(player, data.method);

    if (callback) {
      callbacks.push(callback);
      param = data.value;
    }
  }

  callbacks.forEach(function (callback) {
    try {
      if (typeof callback === 'function') {
        callback.call(player, param);
        return;
      }

      callback.resolve(param);
    } catch (e) {// empty
    }
  });
}

/**
 * @module lib/embed
 */
var oEmbedParameters = ['autopause', 'autoplay', 'background', 'byline', 'color', 'controls', 'dnt', 'height', 'id', 'interactive_params', 'keyboard', 'loop', 'maxheight', 'maxwidth', 'muted', 'playsinline', 'portrait', 'responsive', 'speed', 'texttrack', 'title', 'transparent', 'url', 'width'];
/**
 * Get the 'data-vimeo'-prefixed attributes from an element as an object.
 *
 * @param {HTMLElement} element The element.
 * @param {Object} [defaults={}] The default values to use.
 * @return {Object<string, string>}
 */

function getOEmbedParameters(element) {
  var defaults = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return oEmbedParameters.reduce(function (params, param) {
    var value = element.getAttribute("data-vimeo-".concat(param));

    if (value || value === '') {
      params[param] = value === '' ? 1 : value;
    }

    return params;
  }, defaults);
}
/**
 * Create an embed from oEmbed data inside an element.
 *
 * @param {object} data The oEmbed data.
 * @param {HTMLElement} element The element to put the iframe in.
 * @return {HTMLIFrameElement} The iframe embed.
 */

function createEmbed(_ref, element) {
  var html = _ref.html;

  if (!element) {
    throw new TypeError('An element must be provided');
  }

  if (element.getAttribute('data-vimeo-initialized') !== null) {
    return element.querySelector('iframe');
  }

  var div = document.createElement('div');
  div.innerHTML = html;
  element.appendChild(div.firstChild);
  element.setAttribute('data-vimeo-initialized', 'true');
  return element.querySelector('iframe');
}
/**
 * Make an oEmbed call for the specified URL.
 *
 * @param {string} videoUrl The vimeo.com url for the video.
 * @param {Object} [params] Parameters to pass to oEmbed.
 * @param {HTMLElement} element The element.
 * @return {Promise}
 */

function getOEmbedData(videoUrl) {
  var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var element = arguments.length > 2 ? arguments[2] : undefined;
  return new Promise(function (resolve, reject) {
    if (!isVimeoUrl(videoUrl)) {
      throw new TypeError("\u201C".concat(videoUrl, "\u201D is not a vimeo.com url."));
    }

    var url = "https://vimeo.com/api/oembed.json?url=".concat(encodeURIComponent(videoUrl));

    for (var param in params) {
      if (params.hasOwnProperty(param)) {
        url += "&".concat(param, "=").concat(encodeURIComponent(params[param]));
      }
    }

    var xhr = 'XDomainRequest' in window ? new XDomainRequest() : new XMLHttpRequest();
    xhr.open('GET', url, true);

    xhr.onload = function () {
      if (xhr.status === 404) {
        reject(new Error("\u201C".concat(videoUrl, "\u201D was not found.")));
        return;
      }

      if (xhr.status === 403) {
        reject(new Error("\u201C".concat(videoUrl, "\u201D is not embeddable.")));
        return;
      }

      try {
        var json = JSON.parse(xhr.responseText); // Check api response for 403 on oembed

        if (json.domain_status_code === 403) {
          // We still want to create the embed to give users visual feedback
          createEmbed(json, element);
          reject(new Error("\u201C".concat(videoUrl, "\u201D is not embeddable.")));
          return;
        }

        resolve(json);
      } catch (error) {
        reject(error);
      }
    };

    xhr.onerror = function () {
      var status = xhr.status ? " (".concat(xhr.status, ")") : '';
      reject(new Error("There was an error fetching the embed code from Vimeo".concat(status, ".")));
    };

    xhr.send();
  });
}
/**
 * Initialize all embeds within a specific element
 *
 * @param {HTMLElement} [parent=document] The parent element.
 * @return {void}
 */

function initializeEmbeds() {
  var parent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
  var elements = [].slice.call(parent.querySelectorAll('[data-vimeo-id], [data-vimeo-url]'));

  var handleError = function handleError(error) {
    if ('console' in window && console.error) {
      console.error("There was an error creating an embed: ".concat(error));
    }
  };

  elements.forEach(function (element) {
    try {
      // Skip any that have data-vimeo-defer
      if (element.getAttribute('data-vimeo-defer') !== null) {
        return;
      }

      var params = getOEmbedParameters(element);
      var url = getVimeoUrl(params);
      getOEmbedData(url, params, element).then(function (data) {
        return createEmbed(data, element);
      }).catch(handleError);
    } catch (error) {
      handleError(error);
    }
  });
}
/**
 * Resize embeds when messaged by the player.
 *
 * @param {HTMLElement} [parent=document] The parent element.
 * @return {void}
 */

function resizeEmbeds() {
  var parent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;

  // Prevent execution if users include the player.js script multiple times.
  if (window.VimeoPlayerResizeEmbeds_) {
    return;
  }

  window.VimeoPlayerResizeEmbeds_ = true;

  var onMessage = function onMessage(event) {
    if (!isVimeoUrl(event.origin)) {
      return;
    } // 'spacechange' is fired only on embeds with cards


    if (!event.data || event.data.event !== 'spacechange') {
      return;
    }

    var iframes = parent.querySelectorAll('iframe');

    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow !== event.source) {
        continue;
      } // Change padding-bottom of the enclosing div to accommodate
      // card carousel without distorting aspect ratio


      var space = iframes[i].parentElement;
      space.style.paddingBottom = "".concat(event.data.data[0].bottom, "px");
      break;
    }
  };

  window.addEventListener('message', onMessage);
}
/**
 * Add chapters to existing metadata for Google SEO
 *
 * @param {HTMLElement} [parent=document] The parent element.
 * @return {void}
 */

function initAppendVideoMetadata() {
  var parent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;

  //  Prevent execution if users include the player.js script multiple times.
  if (window.VimeoSeoMetadataAppended) {
    return;
  }

  window.VimeoSeoMetadataAppended = true;

  var onMessage = function onMessage(event) {
    if (!isVimeoUrl(event.origin)) {
      return;
    }

    var data = parseMessageData(event.data);

    if (!data || data.event !== 'ready') {
      return;
    }

    var iframes = parent.querySelectorAll('iframe');

    for (var i = 0; i < iframes.length; i++) {
      var iframe = iframes[i]; // Initiate appendVideoMetadata if iframe is a Vimeo embed

      var isValidMessageSource = iframe.contentWindow === event.source;

      if (isVimeoEmbed(iframe.src) && isValidMessageSource) {
        var player = new Player(iframe);
        player.callMethod('appendVideoMetadata', window.location.href);
      }
    }
  };

  window.addEventListener('message', onMessage);
}

/* MIT License

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
Terms */
function initializeScreenfull() {
  var fn = function () {
    var val;
    var fnMap = [['requestFullscreen', 'exitFullscreen', 'fullscreenElement', 'fullscreenEnabled', 'fullscreenchange', 'fullscreenerror'], // New WebKit
    ['webkitRequestFullscreen', 'webkitExitFullscreen', 'webkitFullscreenElement', 'webkitFullscreenEnabled', 'webkitfullscreenchange', 'webkitfullscreenerror'], // Old WebKit
    ['webkitRequestFullScreen', 'webkitCancelFullScreen', 'webkitCurrentFullScreenElement', 'webkitCancelFullScreen', 'webkitfullscreenchange', 'webkitfullscreenerror'], ['mozRequestFullScreen', 'mozCancelFullScreen', 'mozFullScreenElement', 'mozFullScreenEnabled', 'mozfullscreenchange', 'mozfullscreenerror'], ['msRequestFullscreen', 'msExitFullscreen', 'msFullscreenElement', 'msFullscreenEnabled', 'MSFullscreenChange', 'MSFullscreenError']];
    var i = 0;
    var l = fnMap.length;
    var ret = {};

    for (; i < l; i++) {
      val = fnMap[i];

      if (val && val[1] in document) {
        for (i = 0; i < val.length; i++) {
          ret[fnMap[0][i]] = val[i];
        }

        return ret;
      }
    }

    return false;
  }();

  var eventNameMap = {
    fullscreenchange: fn.fullscreenchange,
    fullscreenerror: fn.fullscreenerror
  };
  var screenfull = {
    request: function request(element) {
      return new Promise(function (resolve, reject) {
        var onFullScreenEntered = function onFullScreenEntered() {
          screenfull.off('fullscreenchange', onFullScreenEntered);
          resolve();
        };

        screenfull.on('fullscreenchange', onFullScreenEntered);
        element = element || document.documentElement;
        var returnPromise = element[fn.requestFullscreen]();

        if (returnPromise instanceof Promise) {
          returnPromise.then(onFullScreenEntered).catch(reject);
        }
      });
    },
    exit: function exit() {
      return new Promise(function (resolve, reject) {
        if (!screenfull.isFullscreen) {
          resolve();
          return;
        }

        var onFullScreenExit = function onFullScreenExit() {
          screenfull.off('fullscreenchange', onFullScreenExit);
          resolve();
        };

        screenfull.on('fullscreenchange', onFullScreenExit);
        var returnPromise = document[fn.exitFullscreen]();

        if (returnPromise instanceof Promise) {
          returnPromise.then(onFullScreenExit).catch(reject);
        }
      });
    },
    on: function on(event, callback) {
      var eventName = eventNameMap[event];

      if (eventName) {
        document.addEventListener(eventName, callback);
      }
    },
    off: function off(event, callback) {
      var eventName = eventNameMap[event];

      if (eventName) {
        document.removeEventListener(eventName, callback);
      }
    }
  };
  Object.defineProperties(screenfull, {
    isFullscreen: {
      get: function get() {
        return Boolean(document[fn.fullscreenElement]);
      }
    },
    element: {
      enumerable: true,
      get: function get() {
        return document[fn.fullscreenElement];
      }
    },
    isEnabled: {
      enumerable: true,
      get: function get() {
        // Coerce to boolean in case of old WebKit
        return Boolean(document[fn.fullscreenEnabled]);
      }
    }
  });
  return screenfull;
}

var playerMap = new WeakMap();
var readyMap = new WeakMap();
var screenfull = {};

var Player = /*#__PURE__*/function () {
  /**
   * Create a Player.
   *
   * @param {(HTMLIFrameElement|HTMLElement|string|jQuery)} element A reference to the Vimeo
   *        player iframe, and id, or a jQuery object.
   * @param {object} [options] oEmbed parameters to use when creating an embed in the element.
   * @return {Player}
   */
  function Player(element) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Player);

    /* global jQuery */
    if (window.jQuery && element instanceof jQuery) {
      if (element.length > 1 && window.console && console.warn) {
        console.warn('A jQuery object with multiple elements was passed, using the first element.');
      }

      element = element[0];
    } // Find an element by ID


    if (typeof document !== 'undefined' && typeof element === 'string') {
      element = document.getElementById(element);
    } // Not an element!


    if (!isDomElement(element)) {
      throw new TypeError('You must pass either a valid element or a valid id.');
    } // Already initialized an embed in this div, so grab the iframe


    if (element.nodeName !== 'IFRAME') {
      var iframe = element.querySelector('iframe');

      if (iframe) {
        element = iframe;
      }
    } // iframe url is not a Vimeo url


    if (element.nodeName === 'IFRAME' && !isVimeoUrl(element.getAttribute('src') || '')) {
      throw new Error('The player element passed isn’t a Vimeo embed.');
    } // If there is already a player object in the map, return that


    if (playerMap.has(element)) {
      return playerMap.get(element);
    }

    this._window = element.ownerDocument.defaultView;
    this.element = element;
    this.origin = '*';
    var readyPromise = new npo_src(function (resolve, reject) {
      _this._onMessage = function (event) {
        if (!isVimeoUrl(event.origin) || _this.element.contentWindow !== event.source) {
          return;
        }

        if (_this.origin === '*') {
          _this.origin = event.origin;
        }

        var data = parseMessageData(event.data);
        var isError = data && data.event === 'error';
        var isReadyError = isError && data.data && data.data.method === 'ready';

        if (isReadyError) {
          var error = new Error(data.data.message);
          error.name = data.data.name;
          reject(error);
          return;
        }

        var isReadyEvent = data && data.event === 'ready';
        var isPingResponse = data && data.method === 'ping';

        if (isReadyEvent || isPingResponse) {
          _this.element.setAttribute('data-ready', 'true');

          resolve();
          return;
        }

        processData(_this, data);
      };

      _this._window.addEventListener('message', _this._onMessage);

      if (_this.element.nodeName !== 'IFRAME') {
        var params = getOEmbedParameters(element, options);
        var url = getVimeoUrl(params);
        getOEmbedData(url, params, element).then(function (data) {
          var iframe = createEmbed(data, element); // Overwrite element with the new iframe,
          // but store reference to the original element

          _this.element = iframe;
          _this._originalElement = element;
          swapCallbacks(element, iframe);
          playerMap.set(_this.element, _this);
          return data;
        }).catch(reject);
      }
    }); // Store a copy of this Player in the map

    readyMap.set(this, readyPromise);
    playerMap.set(this.element, this); // Send a ping to the iframe so the ready promise will be resolved if
    // the player is already ready.

    if (this.element.nodeName === 'IFRAME') {
      postMessage(this, 'ping');
    }

    if (screenfull.isEnabled) {
      var exitFullscreen = function exitFullscreen() {
        return screenfull.exit();
      };

      this.fullscreenchangeHandler = function () {
        if (screenfull.isFullscreen) {
          storeCallback(_this, 'event:exitFullscreen', exitFullscreen);
        } else {
          removeCallback(_this, 'event:exitFullscreen', exitFullscreen);
        } // eslint-disable-next-line


        _this.ready().then(function () {
          postMessage(_this, 'fullscreenchange', screenfull.isFullscreen);
        });
      };

      screenfull.on('fullscreenchange', this.fullscreenchangeHandler);
    }

    return this;
  }
  /**
   * Get a promise for a method.
   *
   * @param {string} name The API method to call.
   * @param {Object} [args={}] Arguments to send via postMessage.
   * @return {Promise}
   */


  _createClass(Player, [{
    key: "callMethod",
    value: function callMethod(name) {
      var _this2 = this;

      var args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      return new npo_src(function (resolve, reject) {
        // We are storing the resolve/reject handlers to call later, so we
        // can’t return here.
        // eslint-disable-next-line promise/always-return
        return _this2.ready().then(function () {
          storeCallback(_this2, name, {
            resolve: resolve,
            reject: reject
          });
          postMessage(_this2, name, args);
        }).catch(reject);
      });
    }
    /**
     * Get a promise for the value of a player property.
     *
     * @param {string} name The property name
     * @return {Promise}
     */

  }, {
    key: "get",
    value: function get(name) {
      var _this3 = this;

      return new npo_src(function (resolve, reject) {
        name = getMethodName(name, 'get'); // We are storing the resolve/reject handlers to call later, so we
        // can’t return here.
        // eslint-disable-next-line promise/always-return

        return _this3.ready().then(function () {
          storeCallback(_this3, name, {
            resolve: resolve,
            reject: reject
          });
          postMessage(_this3, name);
        }).catch(reject);
      });
    }
    /**
     * Get a promise for setting the value of a player property.
     *
     * @param {string} name The API method to call.
     * @param {mixed} value The value to set.
     * @return {Promise}
     */

  }, {
    key: "set",
    value: function set(name, value) {
      var _this4 = this;

      return new npo_src(function (resolve, reject) {
        name = getMethodName(name, 'set');

        if (value === undefined || value === null) {
          throw new TypeError('There must be a value to set.');
        } // We are storing the resolve/reject handlers to call later, so we
        // can’t return here.
        // eslint-disable-next-line promise/always-return


        return _this4.ready().then(function () {
          storeCallback(_this4, name, {
            resolve: resolve,
            reject: reject
          });
          postMessage(_this4, name, value);
        }).catch(reject);
      });
    }
    /**
     * Add an event listener for the specified event. Will call the
     * callback with a single parameter, `data`, that contains the data for
     * that event.
     *
     * @param {string} eventName The name of the event.
     * @param {function(*)} callback The function to call when the event fires.
     * @return {void}
     */

  }, {
    key: "on",
    value: function on(eventName, callback) {
      if (!eventName) {
        throw new TypeError('You must pass an event name.');
      }

      if (!callback) {
        throw new TypeError('You must pass a callback function.');
      }

      if (typeof callback !== 'function') {
        throw new TypeError('The callback must be a function.');
      }

      var callbacks = getCallbacks(this, "event:".concat(eventName));

      if (callbacks.length === 0) {
        this.callMethod('addEventListener', eventName).catch(function () {// Ignore the error. There will be an error event fired that
          // will trigger the error callback if they are listening.
        });
      }

      storeCallback(this, "event:".concat(eventName), callback);
    }
    /**
     * Remove an event listener for the specified event. Will remove all
     * listeners for that event if a `callback` isn’t passed, or only that
     * specific callback if it is passed.
     *
     * @param {string} eventName The name of the event.
     * @param {function} [callback] The specific callback to remove.
     * @return {void}
     */

  }, {
    key: "off",
    value: function off(eventName, callback) {
      if (!eventName) {
        throw new TypeError('You must pass an event name.');
      }

      if (callback && typeof callback !== 'function') {
        throw new TypeError('The callback must be a function.');
      }

      var lastCallback = removeCallback(this, "event:".concat(eventName), callback); // If there are no callbacks left, remove the listener

      if (lastCallback) {
        this.callMethod('removeEventListener', eventName).catch(function (e) {// Ignore the error. There will be an error event fired that
          // will trigger the error callback if they are listening.
        });
      }
    }
    /**
     * A promise to load a new video.
     *
     * @promise LoadVideoPromise
     * @fulfill {number} The video with this id or url successfully loaded.
     * @reject {TypeError} The id was not a number.
     */

    /**
     * Load a new video into this embed. The promise will be resolved if
     * the video is successfully loaded, or it will be rejected if it could
     * not be loaded.
     *
     * @param {number|string|object} options The id of the video, the url of the video, or an object with embed options.
     * @return {LoadVideoPromise}
     */

  }, {
    key: "loadVideo",
    value: function loadVideo(options) {
      return this.callMethod('loadVideo', options);
    }
    /**
     * A promise to perform an action when the Player is ready.
     *
     * @todo document errors
     * @promise LoadVideoPromise
     * @fulfill {void}
     */

    /**
     * Trigger a function when the player iframe has initialized. You do not
     * need to wait for `ready` to trigger to begin adding event listeners
     * or calling other methods.
     *
     * @return {ReadyPromise}
     */

  }, {
    key: "ready",
    value: function ready() {
      var readyPromise = readyMap.get(this) || new npo_src(function (resolve, reject) {
        reject(new Error('Unknown player. Probably unloaded.'));
      });
      return npo_src.resolve(readyPromise);
    }
    /**
     * A promise to add a cue point to the player.
     *
     * @promise AddCuePointPromise
     * @fulfill {string} The id of the cue point to use for removeCuePoint.
     * @reject {RangeError} the time was less than 0 or greater than the
     *         video’s duration.
     * @reject {UnsupportedError} Cue points are not supported with the current
     *         player or browser.
     */

    /**
     * Add a cue point to the player.
     *
     * @param {number} time The time for the cue point.
     * @param {object} [data] Arbitrary data to be returned with the cue point.
     * @return {AddCuePointPromise}
     */

  }, {
    key: "addCuePoint",
    value: function addCuePoint(time) {
      var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      return this.callMethod('addCuePoint', {
        time: time,
        data: data
      });
    }
    /**
     * A promise to remove a cue point from the player.
     *
     * @promise AddCuePointPromise
     * @fulfill {string} The id of the cue point that was removed.
     * @reject {InvalidCuePoint} The cue point with the specified id was not
     *         found.
     * @reject {UnsupportedError} Cue points are not supported with the current
     *         player or browser.
     */

    /**
     * Remove a cue point from the video.
     *
     * @param {string} id The id of the cue point to remove.
     * @return {RemoveCuePointPromise}
     */

  }, {
    key: "removeCuePoint",
    value: function removeCuePoint(id) {
      return this.callMethod('removeCuePoint', id);
    }
    /**
     * A representation of a text track on a video.
     *
     * @typedef {Object} VimeoTextTrack
     * @property {string} language The ISO language code.
     * @property {string} kind The kind of track it is (captions or subtitles).
     * @property {string} label The human‐readable label for the track.
     */

    /**
     * A promise to enable a text track.
     *
     * @promise EnableTextTrackPromise
     * @fulfill {VimeoTextTrack} The text track that was enabled.
     * @reject {InvalidTrackLanguageError} No track was available with the
     *         specified language.
     * @reject {InvalidTrackError} No track was available with the specified
     *         language and kind.
     */

    /**
     * Enable the text track with the specified language, and optionally the
     * specified kind (captions or subtitles).
     *
     * When set via the API, the track language will not change the viewer’s
     * stored preference.
     *
     * @param {string} language The two‐letter language code.
     * @param {string} [kind] The kind of track to enable (captions or subtitles).
     * @return {EnableTextTrackPromise}
     */

  }, {
    key: "enableTextTrack",
    value: function enableTextTrack(language, kind) {
      if (!language) {
        throw new TypeError('You must pass a language.');
      }

      return this.callMethod('enableTextTrack', {
        language: language,
        kind: kind
      });
    }
    /**
     * A promise to disable the active text track.
     *
     * @promise DisableTextTrackPromise
     * @fulfill {void} The track was disabled.
     */

    /**
     * Disable the currently-active text track.
     *
     * @return {DisableTextTrackPromise}
     */

  }, {
    key: "disableTextTrack",
    value: function disableTextTrack() {
      return this.callMethod('disableTextTrack');
    }
    /**
     * A promise to pause the video.
     *
     * @promise PausePromise
     * @fulfill {void} The video was paused.
     */

    /**
     * Pause the video if it’s playing.
     *
     * @return {PausePromise}
     */

  }, {
    key: "pause",
    value: function pause() {
      return this.callMethod('pause');
    }
    /**
     * A promise to play the video.
     *
     * @promise PlayPromise
     * @fulfill {void} The video was played.
     */

    /**
     * Play the video if it’s paused. **Note:** on iOS and some other
     * mobile devices, you cannot programmatically trigger play. Once the
     * viewer has tapped on the play button in the player, however, you
     * will be able to use this function.
     *
     * @return {PlayPromise}
     */

  }, {
    key: "play",
    value: function play() {
      return this.callMethod('play');
    }
    /**
     * Request that the player enters fullscreen.
     * @return {Promise}
     */

  }, {
    key: "requestFullscreen",
    value: function requestFullscreen() {
      if (screenfull.isEnabled) {
        return screenfull.request(this.element);
      }

      return this.callMethod('requestFullscreen');
    }
    /**
     * Request that the player exits fullscreen.
     * @return {Promise}
     */

  }, {
    key: "exitFullscreen",
    value: function exitFullscreen() {
      if (screenfull.isEnabled) {
        return screenfull.exit();
      }

      return this.callMethod('exitFullscreen');
    }
    /**
     * Returns true if the player is currently fullscreen.
     * @return {Promise}
     */

  }, {
    key: "getFullscreen",
    value: function getFullscreen() {
      if (screenfull.isEnabled) {
        return npo_src.resolve(screenfull.isFullscreen);
      }

      return this.get('fullscreen');
    }
    /**
     * Request that the player enters picture-in-picture.
     * @return {Promise}
     */

  }, {
    key: "requestPictureInPicture",
    value: function requestPictureInPicture() {
      return this.callMethod('requestPictureInPicture');
    }
    /**
     * Request that the player exits picture-in-picture.
     * @return {Promise}
     */

  }, {
    key: "exitPictureInPicture",
    value: function exitPictureInPicture() {
      return this.callMethod('exitPictureInPicture');
    }
    /**
     * Returns true if the player is currently picture-in-picture.
     * @return {Promise}
     */

  }, {
    key: "getPictureInPicture",
    value: function getPictureInPicture() {
      return this.get('pictureInPicture');
    }
    /**
     * A promise to unload the video.
     *
     * @promise UnloadPromise
     * @fulfill {void} The video was unloaded.
     */

    /**
     * Return the player to its initial state.
     *
     * @return {UnloadPromise}
     */

  }, {
    key: "unload",
    value: function unload() {
      return this.callMethod('unload');
    }
    /**
     * Cleanup the player and remove it from the DOM
     *
     * It won't be usable and a new one should be constructed
     *  in order to do any operations.
     *
     * @return {Promise}
     */

  }, {
    key: "destroy",
    value: function destroy() {
      var _this5 = this;

      return new npo_src(function (resolve) {
        readyMap.delete(_this5);
        playerMap.delete(_this5.element);

        if (_this5._originalElement) {
          playerMap.delete(_this5._originalElement);

          _this5._originalElement.removeAttribute('data-vimeo-initialized');
        }

        if (_this5.element && _this5.element.nodeName === 'IFRAME' && _this5.element.parentNode) {
          // If we've added an additional wrapper div, remove that from the DOM.
          // If not, just remove the iframe element.
          if (_this5.element.parentNode.parentNode && _this5._originalElement && _this5._originalElement !== _this5.element.parentNode) {
            _this5.element.parentNode.parentNode.removeChild(_this5.element.parentNode);
          } else {
            _this5.element.parentNode.removeChild(_this5.element);
          }
        } // If the clip is private there is a case where the element stays the
        // div element. Destroy should reset the div and remove the iframe child.


        if (_this5.element && _this5.element.nodeName === 'DIV' && _this5.element.parentNode) {
          _this5.element.removeAttribute('data-vimeo-initialized');

          var iframe = _this5.element.querySelector('iframe');

          if (iframe && iframe.parentNode) {
            // If we've added an additional wrapper div, remove that from the DOM.
            // If not, just remove the iframe element.
            if (iframe.parentNode.parentNode && _this5._originalElement && _this5._originalElement !== iframe.parentNode) {
              iframe.parentNode.parentNode.removeChild(iframe.parentNode);
            } else {
              iframe.parentNode.removeChild(iframe);
            }
          }
        }

        _this5._window.removeEventListener('message', _this5._onMessage);

        if (screenfull.isEnabled) {
          screenfull.off('fullscreenchange', _this5.fullscreenchangeHandler);
        }

        resolve();
      });
    }
    /**
     * A promise to get the autopause behavior of the video.
     *
     * @promise GetAutopausePromise
     * @fulfill {boolean} Whether autopause is turned on or off.
     * @reject {UnsupportedError} Autopause is not supported with the current
     *         player or browser.
     */

    /**
     * Get the autopause behavior for this player.
     *
     * @return {GetAutopausePromise}
     */

  }, {
    key: "getAutopause",
    value: function getAutopause() {
      return this.get('autopause');
    }
    /**
     * A promise to set the autopause behavior of the video.
     *
     * @promise SetAutopausePromise
     * @fulfill {boolean} Whether autopause is turned on or off.
     * @reject {UnsupportedError} Autopause is not supported with the current
     *         player or browser.
     */

    /**
     * Enable or disable the autopause behavior of this player.
     *
     * By default, when another video is played in the same browser, this
     * player will automatically pause. Unless you have a specific reason
     * for doing so, we recommend that you leave autopause set to the
     * default (`true`).
     *
     * @param {boolean} autopause
     * @return {SetAutopausePromise}
     */

  }, {
    key: "setAutopause",
    value: function setAutopause(autopause) {
      return this.set('autopause', autopause);
    }
    /**
     * A promise to get the buffered property of the video.
     *
     * @promise GetBufferedPromise
     * @fulfill {Array} Buffered Timeranges converted to an Array.
     */

    /**
     * Get the buffered property of the video.
     *
     * @return {GetBufferedPromise}
     */

  }, {
    key: "getBuffered",
    value: function getBuffered() {
      return this.get('buffered');
    }
    /**
     * @typedef {Object} CameraProperties
     * @prop {number} props.yaw - Number between 0 and 360.
     * @prop {number} props.pitch - Number between -90 and 90.
     * @prop {number} props.roll - Number between -180 and 180.
     * @prop {number} props.fov - The field of view in degrees.
     */

    /**
     * A promise to get the camera properties of the player.
     *
     * @promise GetCameraPromise
     * @fulfill {CameraProperties} The camera properties.
     */

    /**
     * For 360° videos get the camera properties for this player.
     *
     * @return {GetCameraPromise}
     */

  }, {
    key: "getCameraProps",
    value: function getCameraProps() {
      return this.get('cameraProps');
    }
    /**
     * A promise to set the camera properties of the player.
     *
     * @promise SetCameraPromise
     * @fulfill {Object} The camera was successfully set.
     * @reject {RangeError} The range was out of bounds.
     */

    /**
     * For 360° videos set the camera properties for this player.
     *
     * @param {CameraProperties} camera The camera properties
     * @return {SetCameraPromise}
     */

  }, {
    key: "setCameraProps",
    value: function setCameraProps(camera) {
      return this.set('cameraProps', camera);
    }
    /**
     * A representation of a chapter.
     *
     * @typedef {Object} VimeoChapter
     * @property {number} startTime The start time of the chapter.
     * @property {object} title The title of the chapter.
     * @property {number} index The place in the order of Chapters. Starts at 1.
     */

    /**
     * A promise to get chapters for the video.
     *
     * @promise GetChaptersPromise
     * @fulfill {VimeoChapter[]} The chapters for the video.
     */

    /**
     * Get an array of all the chapters for the video.
     *
     * @return {GetChaptersPromise}
     */

  }, {
    key: "getChapters",
    value: function getChapters() {
      return this.get('chapters');
    }
    /**
     * A promise to get the currently active chapter.
     *
     * @promise GetCurrentChaptersPromise
     * @fulfill {VimeoChapter|undefined} The current chapter for the video.
     */

    /**
     * Get the currently active chapter for the video.
     *
     * @return {GetCurrentChaptersPromise}
     */

  }, {
    key: "getCurrentChapter",
    value: function getCurrentChapter() {
      return this.get('currentChapter');
    }
    /**
     * A promise to get the color of the player.
     *
     * @promise GetColorPromise
     * @fulfill {string} The hex color of the player.
     */

    /**
     * Get the color for this player.
     *
     * @return {GetColorPromise}
     */

  }, {
    key: "getColor",
    value: function getColor() {
      return this.get('color');
    }
    /**
     * A promise to set the color of the player.
     *
     * @promise SetColorPromise
     * @fulfill {string} The color was successfully set.
     * @reject {TypeError} The string was not a valid hex or rgb color.
     * @reject {ContrastError} The color was set, but the contrast is
     *         outside of the acceptable range.
     * @reject {EmbedSettingsError} The owner of the player has chosen to
     *         use a specific color.
     */

    /**
     * Set the color of this player to a hex or rgb string. Setting the
     * color may fail if the owner of the video has set their embed
     * preferences to force a specific color.
     *
     * @param {string} color The hex or rgb color string to set.
     * @return {SetColorPromise}
     */

  }, {
    key: "setColor",
    value: function setColor(color) {
      return this.set('color', color);
    }
    /**
     * A representation of a cue point.
     *
     * @typedef {Object} VimeoCuePoint
     * @property {number} time The time of the cue point.
     * @property {object} data The data passed when adding the cue point.
     * @property {string} id The unique id for use with removeCuePoint.
     */

    /**
     * A promise to get the cue points of a video.
     *
     * @promise GetCuePointsPromise
     * @fulfill {VimeoCuePoint[]} The cue points added to the video.
     * @reject {UnsupportedError} Cue points are not supported with the current
     *         player or browser.
     */

    /**
     * Get an array of the cue points added to the video.
     *
     * @return {GetCuePointsPromise}
     */

  }, {
    key: "getCuePoints",
    value: function getCuePoints() {
      return this.get('cuePoints');
    }
    /**
     * A promise to get the current time of the video.
     *
     * @promise GetCurrentTimePromise
     * @fulfill {number} The current time in seconds.
     */

    /**
     * Get the current playback position in seconds.
     *
     * @return {GetCurrentTimePromise}
     */

  }, {
    key: "getCurrentTime",
    value: function getCurrentTime() {
      return this.get('currentTime');
    }
    /**
     * A promise to set the current time of the video.
     *
     * @promise SetCurrentTimePromise
     * @fulfill {number} The actual current time that was set.
     * @reject {RangeError} the time was less than 0 or greater than the
     *         video’s duration.
     */

    /**
     * Set the current playback position in seconds. If the player was
     * paused, it will remain paused. Likewise, if the player was playing,
     * it will resume playing once the video has buffered.
     *
     * You can provide an accurate time and the player will attempt to seek
     * to as close to that time as possible. The exact time will be the
     * fulfilled value of the promise.
     *
     * @param {number} currentTime
     * @return {SetCurrentTimePromise}
     */

  }, {
    key: "setCurrentTime",
    value: function setCurrentTime(currentTime) {
      return this.set('currentTime', currentTime);
    }
    /**
     * A promise to get the duration of the video.
     *
     * @promise GetDurationPromise
     * @fulfill {number} The duration in seconds.
     */

    /**
     * Get the duration of the video in seconds. It will be rounded to the
     * nearest second before playback begins, and to the nearest thousandth
     * of a second after playback begins.
     *
     * @return {GetDurationPromise}
     */

  }, {
    key: "getDuration",
    value: function getDuration() {
      return this.get('duration');
    }
    /**
     * A promise to get the ended state of the video.
     *
     * @promise GetEndedPromise
     * @fulfill {boolean} Whether or not the video has ended.
     */

    /**
     * Get the ended state of the video. The video has ended if
     * `currentTime === duration`.
     *
     * @return {GetEndedPromise}
     */

  }, {
    key: "getEnded",
    value: function getEnded() {
      return this.get('ended');
    }
    /**
     * A promise to get the loop state of the player.
     *
     * @promise GetLoopPromise
     * @fulfill {boolean} Whether or not the player is set to loop.
     */

    /**
     * Get the loop state of the player.
     *
     * @return {GetLoopPromise}
     */

  }, {
    key: "getLoop",
    value: function getLoop() {
      return this.get('loop');
    }
    /**
     * A promise to set the loop state of the player.
     *
     * @promise SetLoopPromise
     * @fulfill {boolean} The loop state that was set.
     */

    /**
     * Set the loop state of the player. When set to `true`, the player
     * will start over immediately once playback ends.
     *
     * @param {boolean} loop
     * @return {SetLoopPromise}
     */

  }, {
    key: "setLoop",
    value: function setLoop(loop) {
      return this.set('loop', loop);
    }
    /**
     * A promise to set the muted state of the player.
     *
     * @promise SetMutedPromise
     * @fulfill {boolean} The muted state that was set.
     */

    /**
     * Set the muted state of the player. When set to `true`, the player
     * volume will be muted.
     *
     * @param {boolean} muted
     * @return {SetMutedPromise}
     */

  }, {
    key: "setMuted",
    value: function setMuted(muted) {
      return this.set('muted', muted);
    }
    /**
     * A promise to get the muted state of the player.
     *
     * @promise GetMutedPromise
     * @fulfill {boolean} Whether or not the player is muted.
     */

    /**
     * Get the muted state of the player.
     *
     * @return {GetMutedPromise}
     */

  }, {
    key: "getMuted",
    value: function getMuted() {
      return this.get('muted');
    }
    /**
     * A promise to get the paused state of the player.
     *
     * @promise GetLoopPromise
     * @fulfill {boolean} Whether or not the video is paused.
     */

    /**
     * Get the paused state of the player.
     *
     * @return {GetLoopPromise}
     */

  }, {
    key: "getPaused",
    value: function getPaused() {
      return this.get('paused');
    }
    /**
     * A promise to get the playback rate of the player.
     *
     * @promise GetPlaybackRatePromise
     * @fulfill {number} The playback rate of the player on a scale from 0.5 to 2.
     */

    /**
     * Get the playback rate of the player on a scale from `0.5` to `2`.
     *
     * @return {GetPlaybackRatePromise}
     */

  }, {
    key: "getPlaybackRate",
    value: function getPlaybackRate() {
      return this.get('playbackRate');
    }
    /**
     * A promise to set the playbackrate of the player.
     *
     * @promise SetPlaybackRatePromise
     * @fulfill {number} The playback rate was set.
     * @reject {RangeError} The playback rate was less than 0.5 or greater than 2.
     */

    /**
     * Set the playback rate of the player on a scale from `0.5` to `2`. When set
     * via the API, the playback rate will not be synchronized to other
     * players or stored as the viewer's preference.
     *
     * @param {number} playbackRate
     * @return {SetPlaybackRatePromise}
     */

  }, {
    key: "setPlaybackRate",
    value: function setPlaybackRate(playbackRate) {
      return this.set('playbackRate', playbackRate);
    }
    /**
     * A promise to get the played property of the video.
     *
     * @promise GetPlayedPromise
     * @fulfill {Array} Played Timeranges converted to an Array.
     */

    /**
     * Get the played property of the video.
     *
     * @return {GetPlayedPromise}
     */

  }, {
    key: "getPlayed",
    value: function getPlayed() {
      return this.get('played');
    }
    /**
     * A promise to get the qualities available of the current video.
     *
     * @promise GetQualitiesPromise
     * @fulfill {Array} The qualities of the video.
     */

    /**
     * Get the qualities of the current video.
     *
     * @return {GetQualitiesPromise}
     */

  }, {
    key: "getQualities",
    value: function getQualities() {
      return this.get('qualities');
    }
    /**
     * A promise to get the current set quality of the video.
     *
     * @promise GetQualityPromise
     * @fulfill {string} The current set quality.
     */

    /**
     * Get the current set quality of the video.
     *
     * @return {GetQualityPromise}
     */

  }, {
    key: "getQuality",
    value: function getQuality() {
      return this.get('quality');
    }
    /**
     * A promise to set the video quality.
     *
     * @promise SetQualityPromise
     * @fulfill {number} The quality was set.
     * @reject {RangeError} The quality is not available.
     */

    /**
     * Set a video quality.
     *
     * @param {string} quality
     * @return {SetQualityPromise}
     */

  }, {
    key: "setQuality",
    value: function setQuality(quality) {
      return this.set('quality', quality);
    }
    /**
     * A promise to get the seekable property of the video.
     *
     * @promise GetSeekablePromise
     * @fulfill {Array} Seekable Timeranges converted to an Array.
     */

    /**
     * Get the seekable property of the video.
     *
     * @return {GetSeekablePromise}
     */

  }, {
    key: "getSeekable",
    value: function getSeekable() {
      return this.get('seekable');
    }
    /**
     * A promise to get the seeking property of the player.
     *
     * @promise GetSeekingPromise
     * @fulfill {boolean} Whether or not the player is currently seeking.
     */

    /**
     * Get if the player is currently seeking.
     *
     * @return {GetSeekingPromise}
     */

  }, {
    key: "getSeeking",
    value: function getSeeking() {
      return this.get('seeking');
    }
    /**
     * A promise to get the text tracks of a video.
     *
     * @promise GetTextTracksPromise
     * @fulfill {VimeoTextTrack[]} The text tracks associated with the video.
     */

    /**
     * Get an array of the text tracks that exist for the video.
     *
     * @return {GetTextTracksPromise}
     */

  }, {
    key: "getTextTracks",
    value: function getTextTracks() {
      return this.get('textTracks');
    }
    /**
     * A promise to get the embed code for the video.
     *
     * @promise GetVideoEmbedCodePromise
     * @fulfill {string} The `<iframe>` embed code for the video.
     */

    /**
     * Get the `<iframe>` embed code for the video.
     *
     * @return {GetVideoEmbedCodePromise}
     */

  }, {
    key: "getVideoEmbedCode",
    value: function getVideoEmbedCode() {
      return this.get('videoEmbedCode');
    }
    /**
     * A promise to get the id of the video.
     *
     * @promise GetVideoIdPromise
     * @fulfill {number} The id of the video.
     */

    /**
     * Get the id of the video.
     *
     * @return {GetVideoIdPromise}
     */

  }, {
    key: "getVideoId",
    value: function getVideoId() {
      return this.get('videoId');
    }
    /**
     * A promise to get the title of the video.
     *
     * @promise GetVideoTitlePromise
     * @fulfill {number} The title of the video.
     */

    /**
     * Get the title of the video.
     *
     * @return {GetVideoTitlePromise}
     */

  }, {
    key: "getVideoTitle",
    value: function getVideoTitle() {
      return this.get('videoTitle');
    }
    /**
     * A promise to get the native width of the video.
     *
     * @promise GetVideoWidthPromise
     * @fulfill {number} The native width of the video.
     */

    /**
     * Get the native width of the currently‐playing video. The width of
     * the highest‐resolution available will be used before playback begins.
     *
     * @return {GetVideoWidthPromise}
     */

  }, {
    key: "getVideoWidth",
    value: function getVideoWidth() {
      return this.get('videoWidth');
    }
    /**
     * A promise to get the native height of the video.
     *
     * @promise GetVideoHeightPromise
     * @fulfill {number} The native height of the video.
     */

    /**
     * Get the native height of the currently‐playing video. The height of
     * the highest‐resolution available will be used before playback begins.
     *
     * @return {GetVideoHeightPromise}
     */

  }, {
    key: "getVideoHeight",
    value: function getVideoHeight() {
      return this.get('videoHeight');
    }
    /**
     * A promise to get the vimeo.com url for the video.
     *
     * @promise GetVideoUrlPromise
     * @fulfill {number} The vimeo.com url for the video.
     * @reject {PrivacyError} The url isn’t available because of the video’s privacy setting.
     */

    /**
     * Get the vimeo.com url for the video.
     *
     * @return {GetVideoUrlPromise}
     */

  }, {
    key: "getVideoUrl",
    value: function getVideoUrl() {
      return this.get('videoUrl');
    }
    /**
     * A promise to get the volume level of the player.
     *
     * @promise GetVolumePromise
     * @fulfill {number} The volume level of the player on a scale from 0 to 1.
     */

    /**
     * Get the current volume level of the player on a scale from `0` to `1`.
     *
     * Most mobile devices do not support an independent volume from the
     * system volume. In those cases, this method will always return `1`.
     *
     * @return {GetVolumePromise}
     */

  }, {
    key: "getVolume",
    value: function getVolume() {
      return this.get('volume');
    }
    /**
     * A promise to set the volume level of the player.
     *
     * @promise SetVolumePromise
     * @fulfill {number} The volume was set.
     * @reject {RangeError} The volume was less than 0 or greater than 1.
     */

    /**
     * Set the volume of the player on a scale from `0` to `1`. When set
     * via the API, the volume level will not be synchronized to other
     * players or stored as the viewer’s preference.
     *
     * Most mobile devices do not support setting the volume. An error will
     * *not* be triggered in that situation.
     *
     * @param {number} volume
     * @return {SetVolumePromise}
     */

  }, {
    key: "setVolume",
    value: function setVolume(volume) {
      return this.set('volume', volume);
    }
  }]);

  return Player;
}(); // Setup embed only if this is not a node environment


if (!isNode) {
  screenfull = initializeScreenfull();
  initializeEmbeds();
  resizeEmbeds();
  initAppendVideoMetadata();
}

function Video(a$1,n){void 0===n&&(n={});var u,r=n.id,d=n.playerEl,p=n.type;if(r&&p){var y=a(),f=y.on,l=y.emit;return "youtube"===p?((u=t(d)).loadVideoById({videoId:r,suggestedQuality:"large"}),u.stopVideo(),u.on("stateChange",function(e){1===e.data?l("play"):2===e.data&&l("pause");}),u.on("ready",function(){l("ready"),m();})):"vimeo"===p&&((u=new Player(d,{id:r})).on("play",function(){return l("play")}),u.on("pause",function(){return l("pause")}),u.ready().then(function(){l("ready"),m();})),{destroy:function(){},on:f,pause:function(){"youtube"===p?u.pauseVideo():"vimeo"===p&&u.pause();},play:function(){"youtube"===p?u.playVideo():"vimeo"===p&&u.play();}}}function m(){var o=n$1("iframe",a$1),t=o.height/o.width*100,i=o.parentNode;o.height="100%",o.width="100%","youtube"===p?i.style.paddingTop=t+"%":"vimeo"===p&&(i.parentNode.style.paddingTop=t+"%"),l("resized");}}

register("video", {
  onLoad() {
    const {
      videoId,
      videoType
    } = this.container.dataset;
    if (!videoId || !videoType) return;
    const player = n$1("[data-video-player]", this.container);
    const button = n$1("[data-play-button]", this.container);
    const overlay = n$1("[data-overlay]", this.container);
    const image = n$1(".video__image", this.container);

    const firstPlayClick = () => {
      if (this.video) {
        return;
      }

      this.video = Video(this.container, {
        id: videoId,
        type: videoType,
        playerEl: player
      });
      this.video.on("play", () => {
        const iframe = n$1("iframe", this.container);
        iframe.taxindex = 0;
        iframe.focus();
        i(overlay, "visible");
        image && i(image, "visible");
      });
      this.video.on("pause", () => {
        const iframe = n$1("iframe", this.container);
        iframe.tabindex = -1;
        u(overlay, "visible");
        image && u(image, "visible");
        button.focus();
      });
      this.buttonClick = e$2(button, "click", () => {
        this.video.play();
      });
      this.video.play();
    };

    this.firstPlayHandler = e$2(button, "click", firstPlayClick);
  },

  onUnload() {
    this.video && this.video.destroy();
    this.buttonClick();
    this.firstPlayHandler();
  }

});

const selectors$7 = {
  video: ".mosaic-grid__item-video"
};
register("mosaic-grid", {
  onLoad() {
    const videos = t$3(selectors$7.video, this.container);
    this.videoHandlers = [];

    if (videos.length) {
      videos.forEach(video => {
        this.videoHandlers.push(backgroundVideoHandler(video.parentNode));
      });
    }
  },

  onUnload() {
    this.videoHandlers.forEach(handler => handler());
  }

});

register("cart", {
  onLoad() {
    const form = n$1("[data-form]", this.container);
    const buttons = t$3("[data-change]", this.container);
    let timer;
    this.buttonClick = e$2(buttons, "click", e => {
      e.preventDefault();
      const {
        change
      } = e.currentTarget.dataset;
      const input = n$1("input", e.currentTarget.parentNode);

      if (change === "increment") {
        input.value >= 0 && input.value++;
      } else if (change === "decrement") {
        input.value > 0 && input.value--;
      }

      clearTimeout(timer);
      timer = setTimeout(() => {
        form.submit();
      }, 1000);
    });
  },

  onUnload() {
    this.buttonClick();
  }

});

/* @preserve
 * https://github.com/Elkfox/Ajaxinate
 * Copyright (c) 2017 Elkfox Co Pty Ltd (elkfox.com)
 * MIT License (do not remove above copyright!)
 */

/* Configurable options;
 *
 * method: scroll or click
 * container: selector of repeating content
 * pagination: selector of pagination container
 * offset: number of pixels before the bottom to start loading more on scroll
 * loadingText: 'Loading', The text shown during when appending new content
 * callback: null, callback function after new content is appended
 *
 * Usage;
 *
 * import {Ajaxinate} from 'ajaxinate';
 *
 * new Ajaxinate({
 *   offset: 5000,
 *   loadingText: 'Loading more...',
 * });
 */

/* eslint-env browser */
function Ajaxinate(config) {
  const settings = config || {};

  const defaults = {
    method: "scroll",
    container: "#AjaxinateContainer",
    pagination: "#AjaxinatePagination",
    offset: 0,
    loadingText: "Loading",
    callback: null,
  };

  // Merge custom configs with defaults
  this.settings = Object.assign(defaults, settings);

  // Functions
  this.addScrollListeners = this.addScrollListeners.bind(this);
  this.addClickListener = this.addClickListener.bind(this);
  this.checkIfPaginationInView = this.checkIfPaginationInView.bind(this);
  this.preventMultipleClicks = this.preventMultipleClicks.bind(this);
  this.removeClickListener = this.removeClickListener.bind(this);
  this.removeScrollListener = this.removeScrollListener.bind(this);
  this.removePaginationElement = this.removePaginationElement.bind(this);
  this.destroy = this.destroy.bind(this);

  // Selectors
  this.containerElement = document.querySelector(this.settings.container);
  this.paginationElement = document.querySelector(this.settings.pagination);
  this.initialize();
}

Ajaxinate.prototype.initialize = function initialize() {
  if (!this.containerElement) {
    return;
  }

  const initializers = {
    click: this.addClickListener,
    scroll: this.addScrollListeners,
  };

  initializers[this.settings.method]();
};

Ajaxinate.prototype.addScrollListeners = function addScrollListeners() {
  if (!this.paginationElement) {
    return;
  }

  document.addEventListener("scroll", this.checkIfPaginationInView);
  window.addEventListener("resize", this.checkIfPaginationInView);
  window.addEventListener("orientationchange", this.checkIfPaginationInView);
};

Ajaxinate.prototype.addClickListener = function addClickListener() {
  if (!this.paginationElement) {
    return;
  }

  this.nextPageLinkElement = this.paginationElement.querySelector("a");
  this.clickActive = true;

  if (
    typeof this.nextPageLinkElement !== "undefined" &&
    this.nextPageLinkElement !== null
  ) {
    this.nextPageLinkElement.addEventListener(
      "click",
      this.preventMultipleClicks
    );
  }
};

Ajaxinate.prototype.preventMultipleClicks = function preventMultipleClicks(
  event
) {
  event.preventDefault();

  if (!this.clickActive) {
    return;
  }

  this.nextPageLinkElement.innerText = this.settings.loadingText;
  this.nextPageUrl = this.nextPageLinkElement.href;
  this.clickActive = false;

  this.loadMore();
};

Ajaxinate.prototype.checkIfPaginationInView = function checkIfPaginationInView() {
  const top =
    this.paginationElement.getBoundingClientRect().top - this.settings.offset;
  const bottom =
    this.paginationElement.getBoundingClientRect().bottom +
    this.settings.offset;

  if (top <= window.innerHeight && bottom >= 0) {
    this.nextPageLinkElement = this.paginationElement.querySelector("a");
    this.removeScrollListener();

    if (this.nextPageLinkElement) {
      this.nextPageLinkElement.innerText = this.settings.loadingText;
      this.nextPageUrl = this.nextPageLinkElement.href;

      this.loadMore();
    }
  }
};

Ajaxinate.prototype.loadMore = function getTheHtmlOfTheNextPageWithAnAjaxRequest() {
  this.request = new XMLHttpRequest();
  this.request.onreadystatechange = function success() {
    if (this.request.readyState === 4 && this.request.status === 200) {
      var parser = new DOMParser();
      var htmlDoc = parser.parseFromString(
        this.request.responseText,
        "text/html"
      );
      var newContainer = htmlDoc.querySelectorAll(this.settings.container)[0];
      var newPagination = htmlDoc.querySelectorAll(this.settings.pagination)[0];
      this.containerElement.insertAdjacentHTML(
        "beforeend",
        newContainer.innerHTML
      );
      this.paginationElement.innerHTML = newPagination.innerHTML;
      if (
        this.settings.callback &&
        typeof this.settings.callback === "function"
      ) {
        this.settings.callback(this.request.responseXML);
      }
      this.initialize();
    }
  }.bind(this);
  this.request.open("GET", this.nextPageUrl, false);
  this.request.send();
};

Ajaxinate.prototype.removeClickListener = function removeClickListener() {
  this.nextPageLinkElement.removeEventListener(
    "click",
    this.preventMultipleClicks
  );
};

Ajaxinate.prototype.removePaginationElement = function removePaginationElement() {
  this.paginationElement.innerHTML = "";
  this.destroy();
};

Ajaxinate.prototype.removeScrollListener = function removeScrollListener() {
  document.removeEventListener("scroll", this.checkIfPaginationInView);
  window.removeEventListener("resize", this.checkIfPaginationInView);
  window.removeEventListener("orientationchange", this.checkIfPaginationInView);
};

Ajaxinate.prototype.destroy = function destroy() {
  const destroyers = {
    click: this.removeClickListener,
    scroll: this.removeScrollListener,
  };

  destroyers[this.settings.method]();

  return this;
};

const FILTERS_REMOVE = "collection:filters:remove";
const RANGE_REMOVE = "collection:range:remove";
const EVERYTHING_CLEAR = "collection:clear";
const FILTERS_UPDATE = "collection:filters:update";
const updateFilters = target => r$1(FILTERS_UPDATE, null, {
  target
});
const removeFilters = target => r$1(FILTERS_REMOVE, null, {
  target
});
const removeRange = () => r$1(RANGE_REMOVE);
const clearAll = () => r$1(EVERYTHING_CLEAR);
const filtersUpdated = cb => c(FILTERS_UPDATE, cb);
const filtersRemoved = cb => c(FILTERS_REMOVE, cb);
const everythingCleared = cb => c(EVERYTHING_CLEAR, cb);
const rangeRemoved = cb => c(RANGE_REMOVE, cb);

const classes$3 = {
  active: "active",
  closed: "closed"
};
const ls = {
  getClosed: () => e$1("closed_sidebar_groups") || [],
  setClosed: val => r$2("closed_sidebar_groups", JSON.stringify(val))
};
const sel$4 = {
  heading: "[data-heading]",
  tag: "[data-tag]",
  sort: "[data-sort]",
  form: "[data-filter-form]",
  getGroup: group => `[data-group="${group}"]`
};
var sidebar = (node => {
  if (!node) return Function();
  const sortOptions = t$3(sel$4.sort, node);
  const groupHeadings = t$3(sel$4.heading, node);
  e$2(node, "change", handleInputChange);
  e$2(sortOptions, "click", handleSortClicked);
  e$2(groupHeadings, "click", handleGroupHeadingClicked);

  function handleGroupHeadingClicked(event) {
    const heading = event.target;
    const {
      nextElementSibling: content
    } = event.target;
    slideStop(content);
    const current = ls.getClosed();

    if (isVisible(content)) {
      u(event.target, classes$3.closed);
      slideUp(content);
      ls.setClosed([...current, heading]);
    } else {
      i(event.target, classes$3.closed);
      slideDown(content);
      ls.setClosed(current.filter(item => item !== heading));
    }
  } // Hide groups that were previously closed by the user


  const hiddenGroups = ls.getClosed();
  hiddenGroups.forEach(group => {
    const g = n$1(sel$4.getGroup(group), node);

    if (g) {
      u(n$1(sel$4.heading, g), classes$3.closed);
      slideUp(g.querySelector("ul"), {
        duration: 1
      });
    }
  });

  function handleInputChange(event) {
    const form = event.target.closest(sel$4.form);
    updateFilters(form);
  }

  function handleSortClicked(event) {
    const form = event.target.closest(sel$4.form);
    updateFilters(form);
  }

  return () => {
    click();
    tagSubscription();
    sortSubscription();
  };
});

const sel$3 = {
  filter: "[data-mobile-filter]",
  modal: "[data-mobile-modal]",
  button: "[data-button]",
  wash: "[data-mobile-wash]",
  tag: "[data-tag]",
  sort: "[data-sort]",
  close: "[data-close-icon]"
};
const classes$2 = {
  active: "active"
};
var mobileFiltering = (node => {
  const pills = t$3(sel$3.filter, node);
  const modals = t$3(sel$3.modal, node);
  const wash = n$1(sel$3.wash, node);
  const closeButtons = t$3(sel$3.close, node);
  const pillClick = e$2(pills, "click", clickPill);
  const washClick = e$2(wash, "click", clickWash);
  const closeClick = e$2(closeButtons, "click", clickWash);
  e$2(t$3(sel$3.button, node), "click", clickButton);

  function clickPill(e) {
    e.preventDefault();
    const {
      mobileFilter
    } = e.currentTarget.dataset;
    u(wash, classes$2.active);
    u(n$1(`[data-mobile-modal="${mobileFilter}"]`, node), classes$2.active);
    disableBodyScroll(node, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute("data-scroll-lock-ignore") !== null) {
            return true;
          }

          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
  }

  function clickWash() {
    i([...modals, wash], classes$2.active);
    enableBodyScroll(node);
  }

  function clickButton(e) {
    e.preventDefault();
    const {
      button
    } = e.currentTarget.dataset;
    const modal = e.currentTarget.closest(sel$3.modal);

    if (button === "clear") {
      const inputs = t$3("[data-filter-item-input]", modal);
      inputs.forEach(input => {
        if (input.type === "checkbox" || input.type === "radio") {
          input.checked = false;
        } else {
          input.value = "";
        }
      });
    } else if (button === "apply") {
      const form = e.currentTarget.closest("[data-filter-form]");
      updateFilters(form);
      clickWash();
    }
  }

  return () => {
    pillClick();
    washClick();
    closeClick();
  };
});

const filtering = container => {
  const forms = t$3("[data-filter-form]", container);
  let formData, searchParams;
  setParams();

  function setParams(form) {
    if (!form) {
      console.warn("filtering#setParams no form passed");
    }

    form = form || forms[0];
    formData = new FormData(form);
    searchParams = new URLSearchParams(formData).toString();
  }
  /**
   * Takes the updated form element and updates all other forms with the updated values
   * @param {*} target
   */


  function syncForms(target) {
    if (!target) return;
    const targetInputs = t$3("[data-filter-item-input]", target);
    targetInputs.forEach(targetInput => {
      if (targetInput.type === "checkbox" || targetInput.type === "radio") {
        const {
          valueEscaped
        } = targetInput.dataset;
        const items = t$3(`input[name='${targetInput.name}'][data-value-escaped='${valueEscaped}']`);
        items.forEach(input => {
          input.checked = targetInput.checked;
        });
      } else {
        const items = t$3(`input[name='${targetInput.name}']`);
        items.forEach(input => {
          input.value = targetInput.value;
        });
      }
    });
  }
  /**
   * When filters are removed, set the checked attribute to false
   * for all filter inputs for that filter.
   * Can accept multiple filters
   * @param {Array} targets Array of inputs
   */


  function uncheckFilters(targets) {
    if (!targets) return;
    let selector;
    targets.forEach(target => {
      selector = !selector ? "" : `, ${selector}`;
      const {
        name,
        valueEscaped
      } = target.dataset;
      selector = `input[name='${name}'][data-value-escaped='${valueEscaped}']${selector}`;
    });
    const inputs = t$3(selector, container);
    inputs.forEach(input => {
      input.checked = false;
    });
  }

  function clearRangeInputs() {
    const rangeInputs = t$3("[data-range-input]", container);
    rangeInputs.forEach(input => {
      input.value = "";
    });
  }

  function resetForms() {
    forms.forEach(form => {
      form.reset();
    });
  }

  return {
    getState() {
      return {
        url: searchParams
      };
    },

    filtersUpdated(target, cb) {
      syncForms(target);
      setParams(target);
      return cb(this.getState());
    },

    removeFilters(target, cb) {
      uncheckFilters(target);
      setParams();
      return cb(this.getState());
    },

    removeRange(cb) {
      clearRangeInputs();
      setParams();
      return cb(this.getState());
    },

    clearAll(cb) {
      searchParams = "";
      resetForms();
      return cb(this.getState());
    }

  };
};

const filterHandler = ({
  container,
  partial,
  renderCB
}) => {
  let subscriptions = null;
  let filters = null;
  let delegate = null;
  filters = filtering(container); // Set initial evx state from collection url object

  o(filters.getState());
  subscriptions = [filtersRemoved((_, {
    target
  }) => {
    filters.removeFilters(target, data => {
      renderCB(data.url);
      o(data)();
    });
  }), rangeRemoved(() => {
    filters.removeRange(data => {
      renderCB(data.url);
      o(data)();
    });
  }), filtersUpdated((_, {
    target
  }) => {
    filters.filtersUpdated(target, data => {
      renderCB(data.url);
      o(data)();
    });
  }), everythingCleared(() => {
    filters.clearAll(data => {
      renderCB(data.url);
      o(data)();
    });
  })];
  delegate = new Delegate(partial);
  delegate.on("click", "[data-remove-filter]", e => {
    e.preventDefault();
    removeFilters([e.target]);
  });
  delegate.on("click", "[data-remove-range]", e => {
    e.preventDefault();
    removeRange();
  });
  delegate.on("click", "[data-clear]", e => {
    e.preventDefault();
    clearAll();
  });

  const unload = () => {
    delegate && delegate.off();
    subscriptions && subscriptions.forEach(unsubscribe => unsubscribe());
  };

  return {
    unload
  };
};

const sel$2 = {
  content: "[data-js-container]",
  partial: "[data-js-partial]",
  sidebar: "[data-js-sidebar]",
  mainArea: ".collection__main-area",
  infiniteScrollContainer: "[data-infinite-scroll-container]",
  infiniteScrollTrigger: "[data-infinite-scroll-trigger]"
};
register("collection", {
  infiniteScroll: null,

  onLoad() {
    const {
      paginationType
    } = this.container.dataset;
    this.partial = n$1(sel$2.partial, this.container);
    this.sidebar = sidebar(n$1(sel$2.sidebar, this.container));
    this.mainArea = n$1(sel$2.mainArea, this.container);
    this.pageHeader = n$1("[data-section-type='header']");
    this.paginationType = paginationType;
    this.paginated = this.paginationType === "paginated";
    this.infiniteScrollTrigger = n$1(sel$2.infiniteScrollTrigger, this.container);
    this.mobileFiltering = mobileFiltering(this.container);
    this.filterHandler = filterHandler({
      container: this.container,
      partial: this.partial,
      renderCB: this.__renderView.bind(this)
    });
    this.animateGrid = animateGrid(this.container);

    this._initInfiniteScroll();
  },

  __renderView(searchParams) {
    const url = `${window.location.pathname}?section_id=${this.container.dataset.sectionId}&${searchParams}`;
    const loading = n$1(".collection__loading", this.container);
    u(loading, "is-active");
    fetch(url, {
      credentials: "include"
    }).then(res => res.text()).then(res => {
      this._updateURLHash(searchParams);

      const doc = new window.DOMParser().parseFromString(res, "text/html");
      const contents = n$1(sel$2.partial, doc).innerHTML;
      this.partial.innerHTML = contents;

      if (!this.paginated) {
        this.infiniteScrollTrigger.innerHTML = "";

        this._initInfiniteScroll();
      }

      i(loading, "is-active");
      r$1("collection:updated");

      this._scrollToTop();
    }).then(() => {
      this.animateGrid?.setupProductItems();
    });
  },

  _initInfiniteScroll() {
    if (this.paginated) return;
    const infiniteScrollOptions = {
      container: sel$2.infiniteScrollContainer,
      pagination: sel$2.infiniteScrollTrigger,
      loadingText: "Loading...",
      callback: () => {
        r$1("collection:updated");
        this.animateGrid?.setupProductItems();
      }
    };

    if (this.paginationType === "click") {
      infiniteScrollOptions.method = "click";
    }

    this.infiniteScroll = new Ajaxinate(infiniteScrollOptions);
  },

  _scrollToTop() {
    const topOfGrid = this.mainArea.offsetTop;
    const headerHeight = this.pageHeader.offsetHeight;
    const destination = topOfGrid - headerHeight - 20;

    if (document.documentElement.scrollTop > destination) {
      window.scrollTo({
        top: destination,
        behavior: "smooth"
      });
    }
  },

  _updateURLHash(searchParams) {
    history.pushState({
      searchParams
    }, "", `${window.location.pathname}${searchParams && "?".concat(searchParams)}`);
  },

  onUnload() {
    this.infiniteScroll && this.infiniteScroll.destroy();
  }

});

const sel$1 = {
  partial: "[data-js-partial]",
  sidebar: "[data-js-sidebar]",
  mainArea: ".search-results-wrapper"
};
register("search", {
  onLoad() {
    this.partial = n$1(sel$1.partial, this.container);
    this.sidebar = sidebar(n$1(sel$1.sidebar, this.container));
    this.mainArea = n$1(sel$1.mainArea, this.container);
    this.pageHeader = n$1("[data-section-type='header']");
    this.mobileFiltering = mobileFiltering(this.container);
    this.filterHandler = filterHandler({
      container: this.container,
      partial: this.partial,
      renderCB: this.__renderView.bind(this)
    });
    this.animateGrid = animateGrid(this.container);
  },

  __renderView(searchParams) {
    const url = `${window.location.pathname}?section_id=${this.container.dataset.sectionId}&${searchParams}`;
    const loading = n$1(".collection__loading", this.container);
    u(loading, "is-active");
    fetch(url, {
      credentials: "include"
    }).then(res => res.text()).then(res => {
      this._updateURLHash(searchParams);

      const doc = new window.DOMParser().parseFromString(res, "text/html");
      const contents = n$1(sel$1.partial, doc).innerHTML;
      this.partial.innerHTML = contents;
      i(loading, "is-active");
      r$1("collection:updated");

      this._scrollToTop();
    }).then(() => {
      this.animateGrid?.setupProductItems();
    });
  },

  _scrollToTop() {
    const topOfGrid = this.mainArea.offsetTop;
    const headerHeight = this.pageHeader.offsetHeight;
    const destination = topOfGrid - headerHeight - 20;

    if (document.documentElement.scrollTop > destination) {
      window.scrollTo({
        top: destination,
        behavior: "smooth"
      });
    }
  },

  _updateURLHash(searchParams) {
    history.pushState({
      searchParams
    }, "", `${window.location.pathname}${searchParams && "?".concat(searchParams)}`);
  }

});

register("page", {
  onLoad() {
    this.accordions = accordions(this.container);
    wrapIframes(t$3("iframe", this.container));
  },

  onUnload() {
    this.accordions.destroy();
  }

});

const sel = {
  toggle: "[data-js-toggle]"
};
register("password", {
  onLoad() {
    this.toggleButton = this.container.querySelector(sel.toggle);
    this.toggleButton.addEventListener("click", e => this.toggleView(e));
    const errors = n$1(".storefront-password-form .errors", this.container);

    if (errors) {
      this.toggleView();
    }
  },

  onUnload() {
    this.toggleButton.removeEventListener("click", e => this.toggleView(e));
  },

  toggleView() {
    this.container.classList.toggle("welcome");
  }

});

const selectors$6 = {
  close: "[data-close]",
  slider: "[data-slider]",
  slide: "[data-slide]",
  imageById: id => `[data-id='${id}']`,
  navItem: "[data-nav-item]",
  wrapper: ".lightbox__images-wrapper",
  prevButton: "[data-prev]",
  nextButton: "[data-next]"
};
const classes$1 = {
  visible: "visible",
  active: "active",
  zoom: "zoom"
};
function Lightbox(node) {
  const trap = createFocusTrap(node);
  const navItems = t$3(selectors$6.navItem, node);
  const wrapper = n$1(selectors$6.wrapper, node);
  const images = t$3(selectors$6.slide, node);
  const previousButton = n$1(selectors$6.prevButton, node);
  const nextButton = n$1(selectors$6.nextButton, node);
  const sliderContainer = n$1(selectors$6.slider, node);
  let slider, events;
  import(flu.chunks.flickity).then(({
    Flickity
  }) => {
    slider = new Flickity(sliderContainer, {
      adaptiveHeight: true,
      draggable: isMobile$1({
        tablet: true,
        featureDetect: true
      }),
      prevNextButtons: false,
      wrapAround: false,
      pageDots: false
    });

    if (images.length > 1) {
      slider.on("scroll", progress => {
        _resetZoom();

        const progressScale = progress * 100; // https://github.com/metafizzy/flickity/issues/289

        previousButton.disabled = progressScale < 1;
        nextButton.disabled = progressScale > 99;
      });
      slider.on("select", () => {
        navItems.forEach(item => i(item, classes$1.active));
        u(navItems[slider.selectedIndex], classes$1.active);
        navItems[slider.selectedIndex].scrollIntoView({
          behavior: "smooth",
          inline: "nearest"
        });
      });
    } else {
      u(previousButton, "hidden");
      u(nextButton, "hidden");
      previousButton.disabled = true;
      nextButton.disabled = true;
    }

    events = [e$2(n$1(selectors$6.close, node), "click", e => {
      e.preventDefault();
      close();
    }), e$2(node, "keydown", ({
      keyCode
    }) => {
      if (keyCode === 27) close();
    }), e$2(navItems, "click", e => {
      e.preventDefault();
      const {
        index
      } = e.currentTarget.dataset;
      slider.select(index);
    }), e$2(images, "click", e => {
      e.preventDefault();

      _handleZoom(e);
    }), e$2(previousButton, "click", () => slider.previous()), e$2(nextButton, "click", () => slider.next())];
  });

  function _handleZoom(event) {
    const image = event.currentTarget;
    const zoomed = image.classList.contains(classes$1.zoom);
    l(image, classes$1.zoom, !zoomed);

    if (zoomed) {
      _resetZoom(image);

      return;
    }

    const x = event.clientX;
    const y = event.clientY + wrapper.scrollTop - sliderContainer.offsetTop;
    const xDelta = (x - image.clientWidth / 2) * -1;
    const yDelta = (y - image.clientHeight / 2) * -1;
    image.style.transform = `translate3d(${xDelta}px, ${yDelta}px, 0) scale(2)`;
  }

  function _resetZoom(image) {
    if (image) {
      i(image, classes$1.zoom);
      image.style.transform = `translate3d(0px, 0px, 0) scale(1)`;
      return;
    }

    images.forEach(image => {
      i(image, classes$1.zoom);
      image.style.transform = `translate3d(0px, 0px, 0) scale(1)`;
    });
  }

  function open(id) {
    u(node, classes$1.active);
    setTimeout(() => {
      u(node, classes$1.visible);
      disableBodyScroll(node, {
        allowTouchMove: el => {
          while (el && el !== document.body) {
            if (el.getAttribute("data-scroll-lock-ignore") !== null) {
              return true;
            }

            el = el.parentNode;
          }
        },
        reserveScrollBarGap: true
      });
      trap.activate();
      const image = n$1(selectors$6.imageById(id), node);
      const {
        slideIndex
      } = image.dataset;
      slider && slider.select(slideIndex, false, true);
    }, 50);
  }

  function close() {
    _resetZoom();

    i(node, classes$1.visible);
    setTimeout(() => {
      i(node, classes$1.active);
      enableBodyScroll(node);
      trap.deactivate();
    }, 300);
  }

  function destroy() {
    events.forEach(unsubscribe => unsubscribe());
    slider && slider.destroy();
  }

  return {
    destroy,
    open
  };
}

function Media(node) {
  const {
    Shopify,
    YT
  } = window;
  const elements = t$3("[data-interactive]", node);
  if (!elements.length) return;
  const acceptedTypes = ["video", "model", "external_video"];
  let activeMedia = null;
  let instances = {};
  elements.forEach(initElement);

  function initElement(el) {
    const {
      mediaId,
      mediaType
    } = el.dataset;
    if (!mediaType || !acceptedTypes.includes(mediaType)) return;
    if (Object.keys(instances).includes(mediaId)) return;
    let instance = {
      id: mediaId,
      type: mediaType,
      container: el,
      media: el.children[0]
    };

    switch (instance.type) {
      case "video":
        let shopifyPlyrCSS = document.createElement("link");
        shopifyPlyrCSS.type = "text/css";
        shopifyPlyrCSS.rel = "stylesheet";
        shopifyPlyrCSS.href = "//cdn.shopify.com/shopifycloud/shopify-plyr/v1.0/shopify-plyr.css";
        document.getElementsByTagName("head")[0].appendChild(shopifyPlyrCSS);
        window.Shopify.loadFeatures([{
          name: "video-ui",
          version: "1.0"
        }], () => {
          console.log("shopify video-ui loaded");
          instance.player = new Shopify.Plyr(instance.media, {
            loop: {
              active: el.dataset.loop == "true"
            }
          });
        });
        break;

      case "external_video":
        window.onYouTubeIframeAPIReady = function () {
          if (YT) {
            instance.player = new YT.Player(instance.media);
          }
        };

        var youtubeIframeAPIScript = document.createElement("script");
        youtubeIframeAPIScript.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(youtubeIframeAPIScript, firstScriptTag);
        break;

      case "model":
        window.Shopify.loadFeatures([{
          name: "model-viewer-ui",
          version: "1.0"
        }, {
          name: "shopify-xr",
          version: "1.0"
        }], () => {
          instance.viewer = new Shopify.ModelViewerUI(n$1("model-viewer", el));
          e$2(n$1(".model-poster", el), "click", e => {
            e.preventDefault();
            playModel(instance);
          });
        });
        break;
    }

    instances[mediaId] = instance;

    if (instance.player) {
      if (instance.type === "video") {
        instance.player.on("playing", () => {
          pauseActiveMedia(instance);
          activeMedia = instance;
        });
      } else if (instance.type === "external_video") {
        instance.player.addEventListener("onStateChange", event => {
          if (event.data === 1) {
            pauseActiveMedia(instance);
            activeMedia = instance;
          }
        });
      }
    }
  }

  function playModel(instance) {
    pauseActiveMedia(instance);
    instance.viewer.play();
    u(instance.container, "model-active");
    activeMedia = instance;
    setTimeout(() => {
      n$1("model-viewer", instance.container).focus();
    }, 300);
  }

  function pauseActiveMedia(instance) {
    if (!activeMedia || instance == activeMedia) return;

    if (activeMedia.player) {
      if (activeMedia.type === "video") {
        activeMedia.player.pause();
      } else if (activeMedia.type === "external_video") {
        activeMedia.player.pauseVideo();
      }

      activeMedia = null;
      return;
    }

    if (activeMedia.viewer) {
      i(activeMedia.container, "model-active");
      activeMedia.viewer.pause();
      activeMedia = null;
    }
  }

  return {
    pauseActiveMedia
  };
}

const selectors$5 = {
  idInput: '[name="id"]',
  optionInput: '[name^="options"]',
  quantityInput: '[name="quantity"]',
  propertyInput: '[name^="properties"]'
};
function ProductForm(form, prod, config = {}) {
  const product = validateProductObject(prod);
  const listeners = [];

  const getOptions = () => {
    return _serializeOptionValues(optionInputs, function (item) {
      var regex = /(?:^(options\[))(.*?)(?:\])/;
      item.name = regex.exec(item.name)[2]; // Use just the value between 'options[' and ']'

      return item;
    });
  };

  const getVariant = () => {
    return getVariantFromSerializedArray(product, getOptions());
  };

  const getProperties = () => {
    const properties = _serializePropertyValues(propertyInputs, function (propertyName) {
      var regex = /(?:^(properties\[))(.*?)(?:\])/;
      var name = regex.exec(propertyName)[2]; // Use just the value between 'properties[' and ']'

      return name;
    });

    return Object.entries(properties).length === 0 ? null : properties;
  };

  const getQuantity = () => {
    return quantityInputs[0] ? Number.parseInt(quantityInputs[0].value, 10) : 1;
  };

  const getProductFormEventData = () => ({
    options: getOptions(),
    variant: getVariant(),
    properties: getProperties(),
    quantity: getQuantity()
  });

  const onFormEvent = cb => {
    if (typeof cb === "undefined") return;
    return event => {
      event.dataset = getProductFormEventData();
      cb(event);
    };
  };

  const setIdInputValue = value => {
    let idInputElement = form.querySelector(selectors$5.idInput);

    if (!idInputElement) {
      idInputElement = document.createElement("input");
      idInputElement.type = "hidden";
      idInputElement.name = "id";
      form.appendChild(idInputElement);
    }

    idInputElement.value = value.toString();
  };

  const onSubmit = event => {
    event.dataset = getProductFormEventData();
    setIdInputValue(event.dataset.variant.id);

    if (config.onFormSubmit) {
      config.onFormSubmit(event);
    }
  };

  const initInputs = (selector, cb) => {
    const elements = [...form.querySelectorAll(selector)];
    return elements.map(element => {
      listeners.push(e$2(element, "change", onFormEvent(cb)));
      return element;
    });
  };

  listeners.push(e$2(form, "submit", onSubmit));
  const optionInputs = initInputs(selectors$5.optionInput, config.onOptionChange);
  const quantityInputs = initInputs(selectors$5.quantityInput, config.onQuantityChange);
  const propertyInputs = initInputs(selectors$5.propertyInput, config.onPropertyChange);

  const destroy = () => {
    listeners.forEach(unsubscribe => unsubscribe());
  };

  return {
    getVariant,
    destroy
  };
}

function validateProductObject(product) {
  if (typeof product !== "object") {
    throw new TypeError(product + " is not an object.");
  }

  if (typeof product.variants[0].options === "undefined") {
    throw new TypeError("Product object is invalid. Make sure you use the product object that is output from {{ product | json }} or from the http://[your-product-url].js route");
  }

  return product;
}

function _serializeOptionValues(inputs, transform) {
  return inputs.reduce(function (options, input) {
    if (input.checked || // If input is a checked (means type radio or checkbox)
    input.type !== "radio" && input.type !== "checkbox" // Or if its any other type of input
    ) {
      options.push(transform({
        name: input.name,
        value: input.value
      }));
    }

    return options;
  }, []);
}

function _serializePropertyValues(inputs, transform) {
  return inputs.reduce(function (properties, input) {
    if (input.checked || // If input is a checked (means type radio or checkbox)
    input.type !== "radio" && input.type !== "checkbox" // Or if its any other type of input
    ) {
      properties[transform(input.name)] = input.value;
    }

    return properties;
  }, {});
}

const selectors$4 = {
  drawerTrigger: "[data-store-availability-modal-trigger]",
  drawer: "[data-store-availability-modal]",
  productTitle: "[data-store-availability-product-title]",
  storeList: "[data-store-availability-list-content]"
};

const storeAvailability = (container, product, variant, options) => {
  let storeList = null;
  let currentVariant = variant;
  const delegate = new Delegate(container);

  const _clickHandler = e => {
    e.preventDefault();
    r$1("availability:showMore", () => ({
      product,
      variant: currentVariant,
      storeList,
      options
    }));
  };

  const update = (variant, delayUpdate = false) => {
    currentVariant = variant;
    const variantSectionUrl = `${container.dataset.baseUrl}/variants/${variant.id}/?section_id=store-availability`;

    if (!delayUpdate) {
      container.innerHTML = "";
    }

    fetch(variantSectionUrl).then(response => {
      return response.text();
    }).then(storeAvailabilityHTML => {
      if (storeAvailabilityHTML.trim() === "") {
        if (delayUpdate) {
          container.innerHTML = "";
        }

        return;
      } // Remove section wrapper that throws nested sections error


      container.innerHTML = storeAvailabilityHTML.trim();
      container.innerHTML = container.firstElementChild.innerHTML;
      storeList = n$1(selectors$4.storeList, container);
    });
  }; // Intialize


  update(variant);
  delegate.on("click", selectors$4.drawerTrigger, _clickHandler);

  const unload = () => {
    container.innerHTML = "";
  };

  return {
    unload,
    update
  };
};

const selectors$3 = {
  productSku: "[data-product-sku]"
};
function updateSku (container, variant) {
  const skuElement = n$1(selectors$3.productSku, container);
  if (!skuElement) return;

  if (!variant || !variant.sku) {
    skuElement.innerText = "";
    return;
  }

  skuElement.innerText = variant.sku;
}

function updateBuyButton (btn, variant) {
  const text = n$1("[data-add-to-cart-text]", btn);
  const {
    langAvailable,
    langUnavailable,
    langSoldOut
  } = btn.dataset;

  if (!variant) {
    btn.setAttribute("disabled", "disabled");
    text.textContent = langUnavailable;
  } else if (variant.available) {
    btn.removeAttribute("disabled");
    text.textContent = langAvailable;
  } else {
    btn.setAttribute("disabled", "disabled");
    text.textContent = langSoldOut;
  }
}

theme;

const selectors$2 = {
  counterContainer: "[data-inventory-counter]",
  inventoryMessage: ".inventory-counter__message",
  countdownBar: ".inventory-counter__bar",
  progressBar: ".inventory-counter__bar-progress"
};
const classes = {
  active: "active",
  inventoryLow: "inventory--low"
};

const inventoryCounter = (container, config) => {
  const variantsInventories = config.variantsInventories;
  const counterContainer = n$1(selectors$2.counterContainer, container);
  const inventoryMessageElement = n$1(selectors$2.inventoryMessage, container);
  const progressBar = n$1(selectors$2.progressBar, container);
  const {
    lowInventoryThreshold,
    showUntrackedQuantity,
    stockCountdownMax,
    unavailableText
  } = counterContainer.dataset; // If the threshold or countdownmax contains anything but numbers abort

  if (!lowInventoryThreshold.match(/^[0-9]+$/) || !stockCountdownMax.match(/^[0-9]+$/)) {
    return;
  }

  const threshold = parseInt(lowInventoryThreshold, 10);
  const countDownMax = parseInt(stockCountdownMax, 10);
  l(counterContainer, classes.active, productIventoryValid(variantsInventories[config.id]));
  checkThreshold(variantsInventories[config.id]);
  setProgressBar(variantsInventories[config.id].inventory_quantity, variantsInventories[config.id].inventory_management);
  setInventoryMessage(variantsInventories[config.id].inventory_message);

  function checkThreshold({
    inventory_policy,
    inventory_quantity,
    inventory_management
  }) {
    i(counterContainer, classes.inventoryLow);

    if (inventory_management !== null) {
      if (inventory_quantity <= threshold) {
        u(counterContainer, classes.inventoryLow);
        counterContainer.setAttribute("data-stock-category", "low");
      } else {
        counterContainer.setAttribute("data-stock-category", "sufficient");
      }
    } else if (inventory_management === null && showUntrackedQuantity == "true") {
      counterContainer.setAttribute("data-stock-category", "sufficient");
    }
  }

  function setProgressBar(inventoryQuantity, inventoryManagement) {
    if (inventoryManagement === null && showUntrackedQuantity == "true") {
      progressBar.style.width = `${100}%`;
      return;
    }

    if (inventoryQuantity <= 0) {
      progressBar.style.width = `${0}%`;
      return;
    }

    const progressValue = inventoryQuantity < countDownMax ? inventoryQuantity / countDownMax * 100 : 100;
    progressBar.style.width = `${progressValue}%`;
  }

  function setInventoryMessage(message) {
    inventoryMessageElement.innerText = message;
  }

  function productIventoryValid(product) {
    return product.inventory_message && (product.inventory_management !== null || product.inventory_management === null && showUntrackedQuantity == "true");
  }

  const update = variant => {
    if (!variant) {
      setUnavailable();
      return;
    }

    l(counterContainer, classes.active, productIventoryValid(variantsInventories[variant.id]));
    if (!variant) return;
    checkThreshold(variantsInventories[variant.id]);
    setProgressBar(variantsInventories[variant.id].inventory_quantity, variantsInventories[variant.id].inventory_management);
    setInventoryMessage(variantsInventories[variant.id].inventory_message);
  };

  function setUnavailable() {
    u(counterContainer, classes.active);
    counterContainer.setAttribute("data-stock-category", "unavailable");
    setProgressBar(0);
    setInventoryMessage(unavailableText);
  }

  return {
    update
  };
};

const selectors$1 = {
  popupTrigger: "[data-popup-trigger]"
};

const informationPopup = node => {
  const events = [];
  const popupTriggers = t$3(selectors$1.popupTrigger, node);

  if (!popupTriggers.length) {
    return;
  }

  const listener = e$2(popupTriggers, "click", e => {
    e.preventDefault();
    e.stopPropagation();
    const {
      modalContentId
    } = e.target.dataset;
    const content = n$1(`#${modalContentId}`, node);
    r$1("modal:open", null, {
      modalContent: content
    });
  });
  events.push(listener);

  function unload() {
    events.forEach(evt => evt());
  }

  return {
    unload
  };
};

const selectors = {
  form: "[data-product-form]",
  addToCart: "[data-add-to-cart]",
  price: "[data-price]",
  comparePrice: "[data-compare-price]",
  slide: "[data-slide]",
  slider: "[data-slider]",
  nav: "[data-move-slider]",
  variantSelect: "[data-variant-select]",
  optionById: id => `[value='${id}']`,
  storeAvailability: "[data-store-availability-container]",
  quantityError: "[data-quantity-error]"
};
register("product", {
  productForm: null,

  onLoad() {
    const {
      productHasOnlyDefaultVariant
    } = this.container.dataset;
    this.formElement = n$1(selectors.form, this.container);
    this.quantityError = n$1(selectors.quantityError, this.container);
    this.isFeaturedProduct = this.container.classList.contains("featured-product");
    const {
      productHandle
    } = this.formElement.dataset;
    this.storeAvailabilityContainer = this.formElement.querySelector(selectors.storeAvailability);
    this.availability = null;
    this.accordions = Accordions(t$3(".accordion", this.container));
    const images = t$3(".media__image[data-open]", this.container);
    const viewInYourSpaceButton = n$1("[data-in-your-space]", this.container);
    viewInYourSpaceButton && l(viewInYourSpaceButton, "visible", isMobile$1());
    const product = getProduct(productHandle);
    product(data => {
      this.productForm = ProductForm(this.formElement, data, {
        onOptionChange: e => this.onOptionChange(e),
        onFormSubmit: e => this.onFormSubmit(e)
      }); // Surface pickup

      const variant = this.productForm.getVariant();

      if (this.storeAvailabilityContainer && variant) {
        this.availability = storeAvailability(this.storeAvailabilityContainer, data, variant, {
          hideVariantTitle: productHasOnlyDefaultVariant === "true"
        });
      }

      const productInventoryJson = n$1("[data-product-inventory-json]", this.container);

      if (productInventoryJson) {
        const jsonData = JSON.parse(productInventoryJson.innerHTML);
        const variantsInventories = jsonData.inventory;

        if (variantsInventories) {
          const config = {
            id: variant.id,
            variantsInventories
          };
          this.inventoryCounter = inventoryCounter(this.container, config);
        }
      }
    });
    const qtyButtons = t$3("[data-change]", this.container);

    if (qtyButtons.length) {
      this.qtyButtonClick = e$2(qtyButtons, "click", e => {
        e.preventDefault();
        const {
          change
        } = e.currentTarget.dataset;
        const input = n$1("input", e.currentTarget.parentNode);

        if (change === "increment") {
          input.value >= 0 && input.value++;
        } else if (change === "decrement") {
          input.value > 0 && input.value--;
        }
      });
    }

    this.optionButtons = OptionButtons(t$3("[data-option-buttons]", this.container));
    this.informationPopup = informationPopup(this.container);
    this.images = t$3("[data-media]", this.container);
    this.mediaContainer = n$1(".product__media-container", this.container);

    if (this.mediaContainer) {
      this.media = Media(this.mediaContainer);
    }

    if (this.isFeaturedProduct) {
      return; // Everything else here is product page specific
    }

    this.lightbox = Lightbox(n$1("[data-lightbox]", this.container));
    this.imageClick = e$2(images, "click", e => {
      e.preventDefault();
      this.media && this.media.pauseActiveMedia();
      this.lightbox.open(e.currentTarget.dataset.open);
    });
    const slider = n$1(selectors.slider, this.container);
    const previousButton = n$1("[data-prev]", this.container);
    const nextButton = n$1("[data-next]", this.container);
    import(flu.chunks.flickity).then(({
      Flickity
    }) => {
      // Avoid momentary collapse as flickity initializes by setting a min height
      // because flickity is set to "adaptiveHeight" we don't have to undo this value
      let container = this.mediaContainer,
          containerHeight = container.offsetHeight;
      container.style.minHeight = `${containerHeight}px`;
      this.flkty = new Flickity(slider, {
        adaptiveHeight: true,
        cellSelector: selectors.slide,
        initialIndex: ".initial",
        pageDots: false,
        prevNextButtons: false,
        watchCSS: true,
        wrapAround: true,
        on: {
          ready: function () {
            var flkty = Flickity.data(slider); // This is a pain but we can't access the instance within here

            syncTabIndexesOnFlickity(flkty);
            nextButton && u(nextButton, "visible");
          }
        }
      });
      this.flkty.on("deactivate", () => {
        const slides = t$3(selectors.slide, this.container);
        slides.forEach(slide => {
          enableLinksWithin(slide);
        });
      });
      this.flkty.on("change", () => {
        u(previousButton, "visible");
        this.media && this.media.pauseActiveMedia();
        syncTabIndexesOnFlickity(this.flkty);
        const newImageMedia = n$1(".media", this.flkty.selectedElement);

        if (viewInYourSpaceButton) {
          if (newImageMedia.dataset.mediaType === "model") {
            viewInYourSpaceButton.setAttribute("data-shopify-model3d-id", newImageMedia.dataset.mediaId);
          } else {
            viewInYourSpaceButton.setAttribute("data-shopify-model3d-id", viewInYourSpaceButton.dataset.shopifyFirstModel3dId);
          }
        }
      });
      this.viewportResizeEvent = c("viewport-resize:small", () => {
        // Remove container minHeight on resize
        container.style.minHeight = null;
        setTimeout(() => {
          this.flkty.resize();
        }, 400);
      }); // This is a little strange but prevents needing to check for existence of
      // pagination when the section is unloaded

      this.sliderPaginationClick = nextButton ? e$2([previousButton, nextButton], "click", e => this.onClickNav(e)) : () => {};
    });
  },

  onUnload() {
    this.optionButtons.destroy();
    this.productForm.destroy();
    this.flkty && this.flkty.destroy();
    this.accordions.destroy();
    this.lightbox && this.lightbox.destroy();
    this.imageClick();

    if (this.qtyButtonClick) {
      this.qtyButtonClick();
    }

    this.sliderPaginationClick();
    this.viewportResizeEvent();
  },

  // When the user changes a product option
  onOptionChange({
    dataset: {
      variant
    }
  }) {
    // Update unit pricing
    updateUnitPrices(this.container, variant);
    updateSku(this.container, variant);
    dispatchCustomEvent(CustomEvents.productVariantChange, {
      variant: variant
    });
    this.inventoryCounter && this.inventoryCounter.update(variant);

    if (!variant) {
      updateBuyButton(n$1("[data-add-to-cart]", this.container), false);
      this.availability && this.availability.unload();
      return;
    } // Update URL with selected variant


    const url = getUrlWithVariant(window.location.href, variant.id);
    window.history.replaceState({
      path: url
    }, "", url); // Update prices to reflect selected variant

    this.updatePrices(variant); // We need to set the id input manually so the Dynamic Checkout Button works

    const selectedVariantOpt = n$1(`${selectors.variantSelect} ${selectors.optionById(variant.id)}`, this.container);
    selectedVariantOpt.selected = true; // We need to dispatch an event so Shopify pay knows the form has changed

    this.formElement.dispatchEvent(new Event("change")); // Update product availability content

    this.availability && this.availability.update(variant, true);

    if (this.isFeaturedProduct) {
      // On featured product block there is no slider only a single displayed image
      if ((variant.featured_media || {}).id) {
        this.media && this.media.pauseActiveMedia(); // Update image

        this.images.forEach(image => {
          l(image, "visible", image.dataset.media === String(variant.featured_media.id));
        });
      }
    } else if (variant.featured_media) {
      // Move screen or mobile slider to selected variants media
      if (window.matchMedia("(min-width: 40em)").matches) {
        const image = n$1(`[data-media-id="${variant.featured_media.id}"]`, this.container);
        image && image.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      } else {
        this.flkty && this.flkty.select(variant.featured_media.position - 1);
      }
    }
  },

  // When user submits the product form
  onFormSubmit(event) {
    const {
      enableQuickCart
    } = document.body.dataset;
    if (!enableQuickCart) return;
    event.preventDefault();
    const button = n$1(selectors.addToCart, this.container);
    u(button, "loading");
    u(this.quantityError, "hidden");
    cart.addItem(this.formElement).then(({
      item
    }) => {
      i(button, "loading");
      dispatchCustomEvent(CustomEvents.cartItemAdded, {
        product: item
      });
      r$1("cart:open", null, {
        flash: item.variant_id
      });
    }).catch(error => {
      i(button, "loading");
      i(this.quantityError, "hidden");
      console.debug("error", error);
    });
  },

  updatePrices(variant) {
    const price = t$3(selectors.price, this.container);
    const comparePrice = t$3(selectors.comparePrice, this.container);
    const buyButton = n$1("[data-add-to-cart]", this.container);
    price.forEach(el => el.innerHTML = formatMoney(variant.price));
    comparePrice.forEach(el => el.innerHTML = variant.compare_at_price > variant.price ? formatMoney(variant.compare_at_price) : "");
    updateBuyButton(buyButton, variant);
  },

  onClickNav(e) {
    e.preventDefault();

    if ("next" in e.currentTarget.dataset) {
      this.flkty && this.flkty.next();
    } else if ("prev" in e.currentTarget.dataset) {
      this.flkty && this.flkty.previous();
    }
  }

});

register("contact", {
  onLoad() {
    this.accordions = accordions(this.container);
    wrapIframes(t$3("iframe", this.container));
  },

  onUnload() {
    this.accordions.destroy();
  }

});

register("addresses", {
  onLoad() {
    this.modals = t$3("[data-modal]", this.container);
    const overlays = t$3("[data-overlay]", this.container);
    const open = t$3("[data-open]", this.container);
    const close = t$3("[data-close]", this.container);
    const remove = t$3("[data-remove]", this.container);
    const countryOptions = t$3("[data-country-option]", this.container) || [];
    this.events = [e$2(open, "click", e => this.openModal(e)), e$2([...close, ...overlays], "click", e => this.closeModal(e)), e$2(remove, "click", e => this.removeAddress(e))];
    countryOptions.forEach(el => {
      const {
        formId
      } = el.dataset;
      const countrySelector = "AddressCountry_" + formId;
      const provinceSelector = "AddressProvince_" + formId;
      const containerSelector = "AddressProvinceContainer_" + formId;
      new window.Shopify.CountryProvinceSelector(countrySelector, provinceSelector, {
        hideElement: containerSelector
      });
    });
  },

  onUnload() {
    this.events.forEach(unsubscribe => unsubscribe());
  },

  openModal(e) {
    e.preventDefault();
    const {
      open: which
    } = e.currentTarget.dataset;
    const modal = this.modals.find(el => el.dataset.modal == which);
    u(modal, "active");
    setTimeout(() => {
      u(modal, "visible");
    }, 50);
  },

  closeModal(e) {
    e.preventDefault();
    i(this.modals, "visible");
    setTimeout(() => {
      i(this.modals, "active");
    }, 350);
  },

  removeAddress(e) {
    const {
      confirmMessage,
      target
    } = e.currentTarget.dataset;

    if (confirm(confirmMessage) || "Are you sure you wish to delete this address?") {
      window.Shopify.postLink(target, {
        parameters: {
          _method: "delete"
        }
      });
    }
  }

});

register("login", {
  onLoad() {
    const main = n$1('[data-part="login"]', this.container);
    const reset = n$1('[data-part="reset"]', this.container);
    const toggles = t$3("[data-toggle]", this.container);
    const isSuccess = n$1("[data-success]", this.container);
    const successMessage = n$1("[data-success-message]", this.container);

    if (isSuccess) {
      u(successMessage, "visible");
    }

    function toggleView(e) {
      e.preventDefault();
      l([main, reset], "hide");
    }

    this.toggleClick = e$2(toggles, "click", toggleView);
  },

  onUnload() {
    this.toggleClick();
  }

});

lazySizes.cfg.nativeLoading = {
  setLoadingAttribute: true
}; // Detect theme editor

if (window.Shopify.designMode === true) {
  document.documentElement.classList.add("theme-editor");
} else {
  const el = document.querySelector(".theme-editor-scroll-offset");
  el && el.parentNode.removeChild(el);
} // Apply full-width classes


sectionClasses(); // Load all sections

document.addEventListener("DOMContentLoaded", () => {
  load("*");
}); // Page transitions

pageTransition(); // Setup modal

const modalElement = n$1("[data-modal]", document);
modal(modalElement); // Quick add to cart

quickAdd(); // Integrate with Shopify Product Reviews

reviews(); // Viewport width watcher

viewportWatcher(); // Product availabilty drawer

const availabilityModal = document.querySelector("[data-store-availability-modal]");
storeAvailabilityModal(availabilityModal); // Make it easy to see exactly what theme version
// this is by commit SHA

window.SHA = "11569cd56c";
