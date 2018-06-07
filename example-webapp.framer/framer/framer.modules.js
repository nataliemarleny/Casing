require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"Casing":[function(require,module,exports){
var ARGUMENT_NAMES, DataBundle, STRIP_COMMENTS, getParamNames,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

exports.getScreenFramePoint = function(layer) {
  return _.pick(layer.screenFrame, ['x', 'y']);
};

exports.sizePositionApply = function(sourceComp, targetComp) {
  targetComp.parent = sourceComp.parent;
  return _.assign(targetComp, sourceComp.frame);
};

exports.autoPosition = function(parentComp, referenceComp, comps) {
  var comp, compName, referenceFramePoint, results;
  referenceFramePoint = _.cloneDeep(exports.getScreenFramePoint(referenceComp));
  for (compName in comps) {
    comp = comps[compName];
    _.assign(comp, _.mergeWith(exports.getScreenFramePoint(comp), referenceFramePoint, _.subtract));
  }
  results = [];
  for (compName in comps) {
    comp = comps[compName];
    results.push(_.assign(comp, {
      parent: parentComp
    }));
  }
  return results;
};

exports.invokeOnce = function(func) {
  return {
    'invokeOnce': true,
    'func': func
  };
};

exports.constructModule = function(moduleName) {
  return function() {
    var module;
    module = require(moduleName);
    return new module[moduleName];
  };
};

DataBundle = (function() {
  function DataBundle(_componentName1, _dataName1, _dataValue, _app) {
    this._componentName = _componentName1;
    this._dataName = _dataName1;
    this._dataValue = _dataValue;
    this._app = _app;
  }

  return DataBundle;

})();

Object.defineProperty(DataBundle.prototype, "value", {
  configurable: true,
  get: function() {
    return this._dataValue;
  },
  set: function(newValue) {
    if (this._dataValue !== newValue) {
      this._dataValue = newValue;
      return this._app._updateData(this._componentName, this._dataName, newValue);
    }
  }
});

Object.defineProperty(DataBundle.prototype, "_data", {
  configurable: true,
  get: function() {
    return this._app._data;
  }
});

Object.defineProperty(DataBundle.prototype, "_history", {
  configurable: true,
  get: function() {
    return _.map(this._app._dataIsolatedHistory, this._componentName + "." + this._dataName);
  }
});

Object.defineProperty(DataBundle.prototype, "_historyChanges", {
  configurable: true,
  get: function() {
    var trackTransitions;
    trackTransitions = function(acc, next_item) {
      if (acc === [] || (!_.isEqual(acc[acc.length - 1], next_item))) {
        acc.push(next_item);
      }
      return acc;
    };
    return _.reduce(this._history, trackTransitions, []);
  }
});

STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

ARGUMENT_NAMES = /([^\s,]+)/g;

getParamNames = function(func) {
  var fnStr, result;
  fnStr = func.toString().replace(STRIP_COMMENTS, '');
  result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if (result === null) {
    result = [];
  }
  return result;
};

exports.App = (function(superClass) {
  extend(App, superClass);

  function App(options) {
    var _d, _t, ref;
    ref = this._log_performance_prep(true), _d = ref[0], _t = ref[1];
    _.defaults(options, {
      backgroundColor: "#EFEFEF",
      frame: Screen.frame,
      wireComponentMethodPrefix: "wiring_",
      showErrors: true,
      showWarnings: true,
      showPerformance: false,
      lowPerformanceWidth: 145,
      dataInit: {},
      dataProperties: {}
    });
    App.__super__.constructor.call(this, options);
    _.assign(this, _.pick(options, ['wireComponentMethodPrefix', 'showErrors', 'showWarnings', 'showPerformance', 'lowPerformanceWidth']));
    _.assign(this, {
      screen_switch_happened: false
    });
    this._dataIsolated = {};
    this.data = this._data = {};
    this.dataHistory = this._dataIsolatedHistory = [{}];
    this._dataLink = {};
    this._dataProperties = new Set();
    this._componentSpecs = {};
    this._screenSpecs = {};
    this._activeComponents = {};
    this._activeUpdateLists = {};
    this._setupDataDict("_", options.dataInit);
    this._setupDataPropertiesDict(options.dataProperties);
    this.on(Events.StateSwitchEnd, this._screenTransition);
    this._log_performance(_d, _t, "App.constructor");
  }

  App.prototype.defineComponent = function(componentSpec) {
    var _d, _t, componentName, ref;
    ref = this._log_performance_prep(true), _d = ref[0], _t = ref[1];
    this._assert(!(componentSpec.name in this._componentSpecs), "component \"" + componentSpec.name + "\" defined multiple times");
    componentName = componentSpec.name;
    this._componentSpecs[componentName] = componentSpec;
    this._setupDataDict(componentName, componentSpec.dataInit);
    this._setupDataLinkDict(componentName, componentSpec.dataLink);
    this._setupDataPropertiesDict(componentSpec.dataProperties);
    return this._log_performance(_d, _t, "App.defineComponent(" + componentName + ")");
  };

  App.prototype.defineScreen = function(screenName, componentList) {
    var _d, _t, ref;
    ref = this._log_performance_prep(true), _d = ref[0], _t = ref[1];
    this._assert(!(screenName in this.states), "screen \"" + screenName + "\" defined multiple times");
    this._screenSpecs[screenName] = componentList;
    this.states[screenName] = {};
    return this._log_performance(_d, _t, "App.defineScreen(" + screenName + ")");
  };

  App.prototype._screenTransition = function(oldScreen, newScreen) {
    var _d, _t, base, base1, component, componentName, componentSpec, dataName, i, j, k, len, len1, len2, method, methodName, methodParam, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, targetComponentDataName, targetComponentName, targetDataName;
    ref = this._log_performance_prep(true), _d = ref[0], _t = ref[1];
    this.screen_switch_happened = true;
    if (oldScreen === newScreen) {
      return;
    }
    ref1 = this._activeComponents;
    for (componentName in ref1) {
      component = ref1[componentName];
      component.destroy();
    }
    this._activeComponents = {};
    this._activeUpdateLists = {};
    ref2 = this._screenSpecs[newScreen];
    for (i = 0, len = ref2.length; i < len; i++) {
      componentName = ref2[i];
      componentSpec = this._componentSpecs[componentName];
      component = componentSpec.construct();
      component.parent = this;
      this._activeComponents[componentName] = component;
      for (dataName in (componentSpec != null ? componentSpec.dataInit : void 0) || {}) {
        this._assert(((ref3 = componentSpec.dataLink) != null ? ref3[dataName] : void 0) == null, "local-data \"" + dataName + "\" present in both local-data and linked-data");
      }
      ref4 = Object.keys(Object.getPrototypeOf(component));
      for (j = 0, len1 = ref4.length; j < len1; j++) {
        methodName = ref4[j];
        if (methodName.startsWith(this.wireComponentMethodPrefix)) {
          method = component[methodName];
          if (!_.isFunction(method)) {
            method = method['func'];
          }
          ref5 = getParamNames(method);
          for (k = 0, len2 = ref5.length; k < len2; k++) {
            methodParam = ref5[k];
            this._assert(((ref6 = this._data[componentName]) != null ? ref6[methodParam] : void 0) != null, "parameter \"" + methodParam + "\" present in \"" + componentName + ":" + methodName + "\" but not found as either local-data or linked-data");
            targetComponentDataName = componentName + "." + methodParam;
            if (((ref7 = componentSpec.dataLink) != null ? ref7[methodParam] : void 0) != null) {
              targetComponentDataName = componentSpec.dataLink[methodParam];
            }
            ref8 = targetComponentDataName.split("."), targetComponentName = ref8[0], targetDataName = ref8[1];
            if ((base = this._activeUpdateLists)[targetComponentName] == null) {
              base[targetComponentName] = {};
            }
            if ((base1 = this._activeUpdateLists[targetComponentName])[targetDataName] == null) {
              base1[targetDataName] = [];
            }
            this._activeUpdateLists[targetComponentName][targetDataName].push(componentName + "." + methodName);
          }
        }
      }
    }
    this._updateComponentsForAllData();
    return this._log_performance(_d, _t, "App._screenTransition(" + oldScreen + ", " + newScreen + ")");
  };

  App.prototype._updateData = function(componentName, dataName, newValue) {
    var _d, _t, ref;
    ref = this._log_performance_prep(true), _d = ref[0], _t = ref[1];
    this._updateDataHistory(componentName, dataName, newValue);
    this._updateComponentsForData(componentName, dataName);
    return this._log_performance(_d, _t, "App._updateData(" + componentName + ":" + dataName + ", " + newValue + ")");
  };

  App.prototype._invokeComponentMethod = function(componentName, methodName, componentJustCreated) {
    var _d, _t, component, funcArguments, method, ref;
    if (componentJustCreated == null) {
      componentJustCreated = false;
    }
    ref = this._log_performance_prep(false), _d = ref[0], _t = ref[1];
    component = this._activeComponents[componentName];
    method = component[methodName];
    if (!_.isFunction(method)) {
      if ("invokeOnce" in method && !componentJustCreated) {
        return;
      }
      method = method["func"];
    }
    funcArguments = _.at(this._data[componentName], getParamNames(method));
    method.apply(component, funcArguments);
    return this._log_performance(_d, _t, "App._invokeComponentMethod(" + componentName + ", " + methodName + ")");
  };

  App.prototype._updateComponentsForAllData = function() {
    var _d, _t, component, componentName, i, len, methodName, ref, ref1, ref2;
    ref = this._log_performance_prep(false), _d = ref[0], _t = ref[1];
    ref1 = this._activeComponents || {};
    for (componentName in ref1) {
      component = ref1[componentName];
      ref2 = Object.keys(Object.getPrototypeOf(component));
      for (i = 0, len = ref2.length; i < len; i++) {
        methodName = ref2[i];
        if (methodName.startsWith(this.wireComponentMethodPrefix)) {
          this._invokeComponentMethod(componentName, methodName, true);
        }
      }
    }
    return this._log_performance(_d, _t, "App._updateComponentsForAllData");
  };

  App.prototype._updateComponentsForData = function(componentName, dataName) {
    var _d, _t, compName, componentMethodName, i, len, methodName, ref, ref1, ref2, ref3, ref4;
    ref = this._log_performance_prep(false), _d = ref[0], _t = ref[1];
    ref3 = ((ref1 = this._activeUpdateLists) != null ? (ref2 = ref1[componentName]) != null ? ref2[dataName] : void 0 : void 0) || [];
    for (i = 0, len = ref3.length; i < len; i++) {
      componentMethodName = ref3[i];
      ref4 = componentMethodName.split("."), compName = ref4[0], methodName = ref4[1];
      this._invokeComponentMethod(compName, methodName, false);
    }
    return this._log_performance(_d, _t, "App._updateComponentsForData(" + componentName + ":" + dataName + ")");
  };

  App.prototype._updateDataHistory = function(componentName, dataName, newValue) {
    var _componentName, _d, _dataName, _lastFromData, _lastFromHistory, _lastHistoryEntry, _newHistoryEntry, _t, i, j, len, len1, ref, ref1, ref2, ref3;
    ref = this._log_performance_prep(false), _d = ref[0], _t = ref[1];
    this._assert(((ref1 = this._data[componentName]) != null ? ref1[dataName] : void 0) != null, "CRITICAL INTERNAL - data not registered in history before changing, contact maintainer");
    _lastHistoryEntry = this._dataIsolatedHistory[this._dataIsolatedHistory.length - 1];
    _newHistoryEntry = _.cloneDeep(_lastHistoryEntry);
    _newHistoryEntry[componentName][dataName] = _.cloneDeep(newValue);
    this._dataIsolatedHistory.push(_newHistoryEntry);
    _lastFromHistory = this._dataIsolatedHistory[this._dataIsolatedHistory.length - 1];
    _lastFromData = {};
    ref2 = Object.keys(this._dataIsolated);
    for (i = 0, len = ref2.length; i < len; i++) {
      _componentName = ref2[i];
      if (_lastFromData[_componentName] == null) {
        _lastFromData[_componentName] = {};
      }
      ref3 = Object.keys(this._dataIsolated[_componentName]);
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        _dataName = ref3[j];
        _lastFromData[_componentName][_dataName] = this._dataIsolated[_componentName][_dataName].value;
      }
    }
    this._assert(_.isEqual(_lastFromHistory, _lastFromData), "CRITICAL INTERNAL - inconsistency between history and current data, contact maintainer");
    return this._log_performance(_d, _t, "App._updateDataHistory(" + componentName + ":" + dataName + ", " + newValue + ")");
  };

  App.prototype._setupDataDict = function(componentName, dataDict) {
    var _d, _t, dataName, dataValue, ref;
    if (dataDict == null) {
      dataDict = {};
    }
    ref = this._log_performance_prep(false), _d = ref[0], _t = ref[1];
    for (dataName in dataDict) {
      dataValue = dataDict[dataName];
      this._setupData(componentName, dataName, dataValue);
    }
    return this._log_performance(_d, _t, "App._setupDataDict(" + componentName + ", <dataDict>)");
  };

  App.prototype._setupData = function(componentName, dataName, dataValue) {
    var _d, _t, base, base1, base2, dataBundle, dataValueCopy, ref, ref1;
    ref = this._log_performance_prep(false), _d = ref[0], _t = ref[1];
    this._assert(!this.screen_switch_happened, "data \"" + componentName + ":" + dataName + "\" initialized to \"" + dataValue + "\" after first screen-switch happened");
    this._assert(((ref1 = this._data[componentName]) != null ? ref1[dataName] : void 0) == null, "data \"" + componentName + ":" + dataName + "\" initialized multiple times");
    if ((base = this._dataIsolated)[componentName] == null) {
      base[componentName] = {};
    }
    if ((base1 = this._data)[componentName] == null) {
      base1[componentName] = {};
    }
    dataValueCopy = _.isFunction(dataValue) ? dataValue : _.cloneDeep(dataValue);
    dataBundle = new DataBundle(componentName, dataName, dataValueCopy, this);
    this._dataIsolated[componentName][dataName] = this._data[componentName][dataName] = dataBundle;
    if ((base2 = this._dataIsolatedHistory[0])[componentName] == null) {
      base2[componentName] = {};
    }
    dataValueCopy = _.isFunction(dataValue) ? dataValue : _.cloneDeep(dataValue);
    this._dataIsolatedHistory[0][componentName][dataName] = dataValueCopy;
    return this._log_performance(_d, _t, "App._setupData(" + componentName + ":" + dataName + ", " + dataValue + ")");
  };

  App.prototype._setupDataLinkDict = function(componentName, dataLinkDict) {
    var _d, _t, dataLinkName, dataLinkValue, ref;
    if (dataLinkDict == null) {
      dataLinkDict = {};
    }
    ref = this._log_performance_prep(false), _d = ref[0], _t = ref[1];
    for (dataLinkName in dataLinkDict) {
      dataLinkValue = dataLinkDict[dataLinkName];
      this._setupDataLink(componentName, dataLinkName, dataLinkValue);
    }
    return this._log_performance(_d, _t, "App._setupDataLinkDict(" + componentName + ", <dataLinks>)");
  };

  App.prototype._setupDataLink = function(componentName, dataLinkName, dataLinkValue) {
    var _d, _t, base, base1, ref, ref1;
    ref = this._log_performance_prep(false), _d = ref[0], _t = ref[1];
    this._assert(!this.screen_switch_happened, "data-link \"" + componentName + ":" + dataLinkName + "\" initialized to \"" + dataLinkValue + "\" after first screen-switch happened");
    this._assert(((ref1 = this._data[componentName]) != null ? ref1[dataLinkName] : void 0) == null, "data-link \"" + componentName + ":" + dataLinkName + "\" initialized multiple times");
    if ((base = this._dataLink)[componentName] == null) {
      base[componentName] = {};
    }
    this._dataLink[componentName][dataLinkName] = dataLinkValue;
    if ((base1 = this._data)[componentName] == null) {
      base1[componentName] = {};
    }
    this._data[componentName][dataLinkName] = _.get(this._dataIsolated, dataLinkValue);
    return this._log_performance(_d, _t, "App._setupDataLink(" + componentName + ":" + dataLinkName + ", " + dataLinkValue + ")");
  };

  App.prototype._setupDataPropertiesDict = function(dataPropertiesDict) {
    var _d, _t, dataPropertyName, dataPropertyValue, ref;
    if (dataPropertiesDict == null) {
      dataPropertiesDict = {};
    }
    ref = this._log_performance_prep(false), _d = ref[0], _t = ref[1];
    for (dataPropertyName in dataPropertiesDict) {
      dataPropertyValue = dataPropertiesDict[dataPropertyName];
      this._setupDataProperty(dataPropertyName, dataPropertyValue);
    }
    return this._log_performance(_d, _t, "App._setupDataPropertiesDict(<dataPropertiesDict>)");
  };

  App.prototype._setupDataProperty = function(dataPropertyName, dataPropertyValue) {
    var _d, _t, ref;
    ref = this._log_performance_prep(false), _d = ref[0], _t = ref[1];
    this._assert(!this.screen_switch_happened, "data-property \"" + dataPropertyName + "\" initialized after first screen-switch happened");
    this._assert(!this._dataProperties.has(dataPropertyName), "data-property \"" + dataPropertyName + "\" initialized multiple times");
    this._dataProperties.add(dataPropertyName);
    Object.defineProperty(DataBundle.prototype, dataPropertyName, {
      configurable: true,
      get: dataPropertyValue
    });
    return this._log_performance(_d, _t, "App._setupDataProperty(" + dataPropertyName + ", <dataPropertyValue>)");
  };

  App.prototype._error = function(message) {
    if (this.showErrors) {
      throw "Casing: ERROR " + message;
    }
  };

  App.prototype._assert = function(cond, message) {
    if (!cond) {
      return this._error(message);
    }
  };

  App.prototype._warn = function(message) {
    if (this.showErrors || this.showWarnings) {
      return print("Casing: WARN " + message);
    }
  };

  App.prototype._assert_warn = function(cond, message) {
    if (!cond) {
      return this._warn(message);
    }
  };

  App.prototype._log_performance_prep = function(isEntryPointMethod) {
    if (isEntryPointMethod) {
      this._methodCallStackDepth = 0;
    }
    this._methodCallStackDepth += 1;
    return [this._methodCallStackDepth, performance.now()];
  };

  App.prototype._log_performance = function(_methodCallStackDepth, startTime, message) {
    var graphLines;
    if (_methodCallStackDepth === 1) {
      graphLines = '└';
    } else {
      graphLines = "├" + (_.repeat("─", _methodCallStackDepth - 1));
    }
    if (this.showPerformance) {
      print(((_.padStart((performance.now() - startTime).toFixed(2), 7, '_')) + " ms " + graphLines + " " + message).slice(0, this.lowPerformanceWidth));
    }
    return this._methodCallStackDepth -= 1;
  };

  return App;

})(Layer);

exports.App.prototype.switchScreen = exports.App.prototype.stateSwitch;


},{}],"FrmrDatePicker":[function(require,module,exports){
var dayAbbrevs, monthAbbrevsLowercase, monthAbbrevsUppercase, monthNames, monthNamesUppercase,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Date.prototype.addDays = function(deltaDays) {
  return new Date(this.getFullYear(), this.getMonth(), this.getDate() + deltaDays);
};

Date.prototype.addMonths = function(deltaMonths) {
  return new Date(this.getFullYear(), this.getMonth() + deltaMonths);
};

monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

exports.monthNames = monthNames;

monthNamesUppercase = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

exports.monthNamesUppercase = monthNamesUppercase;

monthAbbrevsUppercase = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

exports.monthAbbrevsUppercase = monthAbbrevsUppercase;

monthAbbrevsLowercase = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

exports.monthAbbrevsLowercase = monthAbbrevsLowercase;

dayAbbrevs = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

exports.dayAbbrevs = dayAbbrevs;

exports.FrmrDatePicker = (function(superClass) {
  extend(FrmrDatePicker, superClass);

  function FrmrDatePicker(options) {
    var configs_passed, defaults;
    if (options == null) {
      options = {};
    }
    defaults = {
      enabled: true,
      numberOfMonthsShow: 1,
      firstColumnDay: 1,
      startDateShow: new Date(Date.now()),
      dateRangeSelectedStart: void 0,
      dateRangeSelectedEnd: void 0,
      hoverEnabled: true,
      dateRangeSelectable: false,
      outsideMonthDatesShow: false,
      buttonNextShow: true,
      buttonPrevShow: true,
      highlightDateRanges: [],
      handleMonthsShowChange: function(previousStartDateShow, currentStartDateShow) {
        return void 0;
      },
      handleDateRangeSelectedChange: function(previousDateRangeSelectedStart, previousDateRangeSelectedEnd, currentDateRangeSelectedStart, currentDateRangeSelectedEnd) {
        return void 0;
      },
      monthsBoxStyle: {
        backgroundColor: "#ffffff",
        width: 277 * (options.numberOfMonthsShow || 1),
        height: 285,
        borderWidth: 1,
        borderRadius: 6,
        borderColor: "#E9ECF0",
        padding: {
          top: 3,
          bottom: 0,
          left: 15,
          right: 15
        }
      },
      monthHeaderStyle: {
        height: 36,
        backgroundColor: "transparent",
        color: "#3C444D",
        textAlign: "center",
        fontSize: 18,
        fontStyle: "bold",
        fontFamily: "-apple-system",
        padding: {
          vertical: 0,
          left: 3,
          right: 3
        }
      },
      weekHeaderStyle: {
        height: 36,
        backgroundColor: "transparent",
        color: "#3C444D",
        textAlign: "center",
        fontSize: 12,
        fontFamily: "-apple-system",
        padding: {
          vertical: 1
        }
      },
      datesBoxStyle: {
        backgroundColor: "transparent",
        color: "#3C444D",
        padding: {
          top: 3,
          bottom: 0,
          left: 20,
          right: 20
        }
      },
      buttonsStyle: {
        fontSize: 12
      },
      dateBaseStyle: {
        color: "#3C444D",
        backgroundColor: "transparent",
        borderColor: "#e6e6e6",
        borderWidth: 1,
        borderRadius: 1,
        textAlign: "center",
        fontSize: 12,
        fontFamily: "-apple-system",
        padding: {
          vertical: 6
        },
        margin: {
          top: 0,
          bottom: -1,
          left: 0,
          right: -1
        }
      },
      dateSelectedExtraStyle: {
        backgroundColor: "#3C444D",
        color: "white"
      },
      dateHoveredExtraStyle: {
        backgroundColor: "#cccccc",
        color: "white"
      },
      dateOutsideMonthExtraStyle: {
        opacity: 0.25
      }
    };
    configs_passed = _.pick(options, _.keys(defaults));
    _.assign(this, _.merge({}, defaults, configs_passed));
    options.backgroundColor = this.monthsBoxStyle.backgroundColor;
    options.width = this.monthsBoxStyle.width;
    options.height = this.monthsBoxStyle.height;
    FrmrDatePicker.__super__.constructor.call(this, options);
    this.dateCellBoxLayerDict = {};
    this.topContainerLayer = new Layer(_.merge({}, this.monthsBoxStyle, {
      parent: this
    }));
    this._clean();
    this._render();
  }

  FrmrDatePicker.prototype._render = function() {
    var btnNextArrowLayer, btnNextLabelLayer, btnPrevArrowLayer, btnPrevLabelLayer, column, contentBoxLayer, dateCellBoxLayer, dateCellLayer, dateRendering, dayIndex, daysGridLayer, extraStyle, firstGridDate, firstOfMonth, highlighRange, i, isOutsideMonth, j, k, l, len, m, monthHeaderLayer, monthIndex, monthLayer, monthsBoxLayer, ref, ref1, results, row, self, weekHeaderLayer;
    this.isolatorLayer = new Layer(_.merge({}, this.topContainerLayer.frame, {
      backgroundColor: "transparent",
      parent: this.topContainerLayer
    }));
    monthsBoxLayer = new Layer({
      backgroundColor: "transparent",
      parent: this.isolatorLayer,
      x: this.monthsBoxStyle.padding.left,
      y: this.monthsBoxStyle.padding.top,
      width: this.isolatorLayer.width + (-this.monthsBoxStyle.padding.left) + (-this.monthsBoxStyle.padding.right),
      height: this.isolatorLayer.height + (-this.monthsBoxStyle.padding.top) + (-this.monthsBoxStyle.padding.bottom)
    });
    results = [];
    for (monthIndex = i = 0, ref = this.numberOfMonthsShow; 0 <= ref ? i < ref : i > ref; monthIndex = 0 <= ref ? ++i : --i) {
      monthLayer = new Layer(_.merge({}, this.datesBoxStyle, {
        parent: monthsBoxLayer,
        x: monthIndex * (monthsBoxLayer.width / this.numberOfMonthsShow),
        y: 0,
        width: monthsBoxLayer.width / this.numberOfMonthsShow,
        height: monthsBoxLayer.height
      }));
      contentBoxLayer = new Layer({
        parent: monthLayer,
        backgroundColor: "transparent",
        x: this.datesBoxStyle.padding.left,
        y: this.datesBoxStyle.padding.top,
        width: monthLayer.width + (-this.datesBoxStyle.padding.left) + (-this.datesBoxStyle.padding.right),
        height: monthLayer.height + (-this.datesBoxStyle.padding.top) + (-this.datesBoxStyle.padding.bottom)
      });
      firstOfMonth = new Date(this.startDateShow.getFullYear(), this.startDateShow.getMonth() + monthIndex, 1);
      firstGridDate = new Date(firstOfMonth);
      while (firstGridDate.getDay() !== this.firstColumnDay) {
        firstGridDate = firstGridDate.addDays(-1);
      }
      monthHeaderLayer = new TextLayer(_.merge({}, this.monthHeaderStyle, {
        parent: contentBoxLayer,
        x: 0,
        y: 0,
        width: contentBoxLayer.width,
        text: monthNamesUppercase[firstOfMonth.getMonth()] + " " + (firstOfMonth.getFullYear()),
        truncate: true
      }));
      if (monthIndex === 0 && this.buttonPrevShow) {
        this.btnPrevBoxLayer = new Layer({
          parent: monthHeaderLayer,
          backgroundColor: "transparent",
          x: 0,
          y: 0,
          width: monthHeaderLayer.width / 4,
          height: monthHeaderLayer.height
        });
        btnPrevArrowLayer = new TextLayer({
          parent: this.btnPrevBoxLayer,
          backgroundColor: "transparent",
          x: 0,
          y: 0,
          width: this.btnPrevBoxLayer.width / 3,
          height: this.btnPrevBoxLayer.height,
          text: "<",
          textAlign: "left",
          color: "#3C444D",
          fontSize: this.buttonsStyle.fontSize * 2,
          fontFamily: "-apple-system",
          padding: {
            vertical: (this.btnPrevBoxLayer.height - 3 * this.buttonsStyle.fontSize) / 2
          }
        });
        btnPrevLabelLayer = new TextLayer(_.merge({}, this.buttonsStyle, {
          parent: this.btnPrevBoxLayer,
          x: this.btnPrevBoxLayer.width / 3,
          y: 0,
          width: this.btnPrevBoxLayer.width * 2 / 3,
          height: this.btnPrevBoxLayer.height,
          text: "" + monthAbbrevsUppercase[(firstOfMonth.getMonth() + 12 - 1) % 12],
          textAlign: "left",
          color: "#3C444D",
          padding: {
            vertical: (this.btnPrevBoxLayer.height - 1.5 * this.buttonsStyle.fontSize) / 2
          }
        }));
        this.btnPrevBoxLayer.onTap((function(_this) {
          return function() {
            return _this.setStartDateShow(_this.startDateShow.addMonths(-1));
          };
        })(this));
      }
      if (monthIndex === this.numberOfMonthsShow - 1 && this.buttonNextShow) {
        this.btnNextBoxLayer = new Layer({
          parent: monthHeaderLayer,
          backgroundColor: "transparent",
          x: monthHeaderLayer.width * 3 / 4,
          y: 0,
          width: monthHeaderLayer.width / 4,
          height: monthHeaderLayer.height
        });
        btnNextArrowLayer = new TextLayer({
          parent: this.btnNextBoxLayer,
          backgroundColor: "transparent",
          x: this.btnNextBoxLayer.width * 2 / 3,
          y: 0,
          width: this.btnNextBoxLayer.width / 3,
          height: this.btnNextBoxLayer.height,
          text: ">",
          color: "#3C444D",
          textAlign: "right",
          fontSize: this.buttonsStyle.fontSize * 2,
          fontFamily: "-apple-system",
          padding: {
            vertical: (this.btnNextBoxLayer.height - 3 * this.buttonsStyle.fontSize) / 2
          }
        });
        btnNextLabelLayer = new TextLayer(_.merge({}, this.buttonsStyle, {
          parent: this.btnNextBoxLayer,
          x: 0,
          y: 0,
          width: this.btnNextBoxLayer.width * 2 / 3,
          height: this.btnNextBoxLayer.height,
          text: "" + monthAbbrevsUppercase[(firstOfMonth.getMonth() + 1) % 12],
          textAlign: "right",
          color: "#3C444D",
          padding: {
            vertical: (this.btnNextBoxLayer.height - 1.5 * this.buttonsStyle.fontSize) / 2
          }
        }));
        this.btnNextBoxLayer.onTap((function(_this) {
          return function() {
            return _this.setStartDateShow(_this.startDateShow.addMonths(1));
          };
        })(this));
      }
      weekHeaderLayer = new Layer({
        backgroundColor: "transparent",
        x: 0,
        y: monthHeaderLayer.y + monthHeaderLayer.height,
        width: contentBoxLayer.width,
        height: this.weekHeaderStyle.height,
        parent: contentBoxLayer
      });
      for (dayIndex = j = 0; j < 7; dayIndex = ++j) {
        new TextLayer(_.merge({}, this.weekHeaderStyle, {
          x: dayIndex * (contentBoxLayer.width / 7),
          y: 0,
          width: contentBoxLayer.width / 7,
          height: weekHeaderLayer.height,
          parent: weekHeaderLayer,
          text: "" + dayAbbrevs[(dayIndex + this.firstColumnDay) % 7],
          truncate: true
        }));
      }
      daysGridLayer = new Layer({
        backgroundColor: "transparent",
        x: 0,
        y: weekHeaderLayer.y + weekHeaderLayer.height,
        width: contentBoxLayer.width,
        height: contentBoxLayer.height + (-monthHeaderLayer.height) + (-weekHeaderLayer.height) + (-this.datesBoxStyle.padding.top) + (-this.datesBoxStyle.padding.bottom),
        parent: contentBoxLayer
      });
      dateRendering = firstGridDate;
      for (row = k = 0; k < 6; row = ++k) {
        for (column = l = 0; l < 7; column = ++l) {
          if (this.outsideMonthDatesShow || dateRendering.getMonth() === firstOfMonth.getMonth()) {
            isOutsideMonth = dateRendering.getMonth() !== firstOfMonth.getMonth();
            dateCellBoxLayer = new Layer({
              parent: daysGridLayer,
              backgroundColor: "transparent",
              y: row * daysGridLayer.height / 6,
              x: column * daysGridLayer.width / 7,
              height: daysGridLayer.height / 6,
              width: daysGridLayer.width / 7
            });
            extraStyle = {};
            if (!isOutsideMonth) {
              this.dateCellBoxLayerDict[dateRendering] = dateCellBoxLayer;
              ref1 = this.highlightDateRanges;
              for (m = 0, len = ref1.length; m < len; m++) {
                highlighRange = ref1[m];
                if (highlighRange.dateRangeStart <= dateRendering && dateRendering <= highlighRange.dateRangeEnd) {
                  _.merge(extraStyle, highlighRange.dateExtraStyle);
                }
              }
            } else {
              extraStyle = this.dateOutsideMonthExtraStyle;
            }
            dateCellLayer = new TextLayer(_.merge({}, this.dateBaseStyle, {
              parent: dateCellBoxLayer,
              x: this.dateBaseStyle.margin.left,
              y: this.dateBaseStyle.margin.top,
              width: dateCellBoxLayer.width + (-this.dateBaseStyle.margin.left) + (-this.dateBaseStyle.margin.right),
              height: dateCellBoxLayer.height + (-this.dateBaseStyle.margin.top) + (-this.dateBaseStyle.margin.bottom),
              text: "" + (dateRendering.getDate())
            }, extraStyle));
            dateCellBoxLayer.date = dateRendering;
            dateCellBoxLayer.dateCellLayer = dateCellLayer;
            if (!isOutsideMonth) {
              self = this;
              dateCellLayer.yesSelectedStyle = this.dateSelectedExtraStyle;
              dateCellLayer.noSelectedStyle = _.pick(dateCellLayer, _.keys(this.dateSelectedExtraStyle));
              (function(dateCellBoxLayer, self) {
                return dateCellBoxLayer.onTap(function() {
                  if (!self.enabled) {
                    return;
                  }
                  if (self.dateRangeSelectedStart === void 0 || !self.dateRangeSelectable) {
                    self.setDateRangeSelected(dateCellBoxLayer.date, dateCellBoxLayer.date);
                    return;
                  }
                  if (self._nextChangeDateRangeStart || false) {
                    self.setDateRangeSelected(self.dateRangeSelectedStart, dateCellBoxLayer.date);
                  } else {
                    self.setDateRangeSelected(dateCellBoxLayer.date, self.dateRangeSelectedEnd);
                  }
                  return self._nextChangeDateRangeStart = !(self._nextChangeDateRangeStart || false);
                });
              })(dateCellBoxLayer, self);
              if (this.hoverEnabled) {
                dateCellLayer.yesHoveredStyle = this.dateHoveredExtraStyle;
                dateCellLayer.noHoveredStyle = _.pick(dateCellLayer, _.keys(this.dateHoveredExtraStyle));
                (function(dateCellBoxLayer, dateCellLayer, self) {
                  dateCellBoxLayer.on(Events.MouseOver, function(event, layer) {
                    return _.assign(dateCellLayer, dateCellLayer.yesHoveredStyle);
                  });
                  return dateCellBoxLayer.on(Events.MouseOut, function(event, layer) {
                    _.assign(dateCellLayer, dateCellLayer.noHoveredStyle);
                    if (self._isDateSelected(dateCellBoxLayer.date)) {
                      return _.assign(dateCellLayer, dateCellLayer.yesSelectedStyle);
                    }
                  });
                })(dateCellBoxLayer, dateCellLayer, self);
              }
            }
          }
          dateRendering = dateRendering.addDays(1);
        }
      }
      results.push(this.setDateRangeSelected(this.dateRangeSelectedStart, this.dateRangeSelectedEnd, false));
    }
    return results;
  };

  FrmrDatePicker.prototype._isDateSelected = function(date) {
    return this.dateRangeSelectedStart <= date && date <= this.dateRangeSelectedEnd;
  };

  FrmrDatePicker.prototype._clean = function() {
    var ref;
    return (ref = this.isolatorLayer) != null ? ref.destroy() : void 0;
  };

  FrmrDatePicker.prototype.getStartDateShow = function() {
    return this.startDateShow;
  };

  FrmrDatePicker.prototype.setStartDateShow = function(currentStartDateShow) {
    var previousStartDateShow;
    previousStartDateShow = this.startDateShow;
    this.startDateShow = currentStartDateShow;
    this._clean();
    this._render();
    return this.handleMonthsShowChange(previousStartDateShow, currentStartDateShow);
  };

  FrmrDatePicker.prototype.getDateRangeSelectedStart = function() {
    return this.dateRangeSelectedStart;
  };

  FrmrDatePicker.prototype.getDateRangeSelectedEnd = function() {
    return this.dateRangeSelectedEnd;
  };

  FrmrDatePicker.prototype.setDateRangeSelected = function(currentDateRangeSelectedStart, currentDateRangeSelectedEnd, triggerHandler) {
    var currentDate, dateCellLayer, previousDateRangeSelectedEnd, previousDateRangeSelectedStart, ref;
    if (triggerHandler == null) {
      triggerHandler = true;
    }
    if (currentDateRangeSelectedStart > currentDateRangeSelectedEnd) {
      ref = [currentDateRangeSelectedEnd, currentDateRangeSelectedStart], currentDateRangeSelectedStart = ref[0], currentDateRangeSelectedEnd = ref[1];
    }
    previousDateRangeSelectedStart = this.dateRangeSelectedStart;
    previousDateRangeSelectedEnd = this.dateRangeSelectedEnd;
    if (previousDateRangeSelectedStart !== void 0 && previousDateRangeSelectedEnd !== void 0) {
      currentDate = previousDateRangeSelectedStart;
      while (currentDate <= previousDateRangeSelectedEnd) {
        dateCellLayer = this.dateCellBoxLayerDict[currentDate].dateCellLayer;
        _.assign(dateCellLayer, dateCellLayer.noSelectedStyle);
        currentDate = currentDate.addDays(1);
      }
    }
    if (currentDateRangeSelectedStart !== void 0 && currentDateRangeSelectedEnd !== void 0) {
      currentDate = currentDateRangeSelectedStart;
      while (currentDate <= currentDateRangeSelectedEnd) {
        dateCellLayer = this.dateCellBoxLayerDict[currentDate].dateCellLayer;
        _.assign(dateCellLayer, dateCellLayer.yesSelectedStyle);
        currentDate = currentDate.addDays(1);
      }
    }
    this.dateRangeSelectedStart = currentDateRangeSelectedStart;
    this.dateRangeSelectedEnd = currentDateRangeSelectedEnd;
    if (triggerHandler) {
      return this.handleDateRangeSelectedChange(previousDateRangeSelectedStart, previousDateRangeSelectedEnd, currentDateRangeSelectedStart, currentDateRangeSelectedEnd);
    }
  };

  FrmrDatePicker.prototype.getHighlightDateRanges = function() {
    return this.highlightDateRanges;
  };

  FrmrDatePicker.prototype.setHighlightDateRanges = function(highlightDateRanges) {
    this.highlightDateRanges = highlightDateRanges;
    this._clean();
    return this._render();
  };

  FrmrDatePicker.prototype.setHandleMonthsShowChange = function(handler) {
    return this.handleMonthsShowChange = handler;
  };

  FrmrDatePicker.prototype.setHandleDateRangeSelectedChange = function(handler) {
    return this.handleDateRangeSelectedChange = handler;
  };

  return FrmrDatePicker;

})(Layer);


},{}],"FrmrDropdown":[function(require,module,exports){
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

exports.FrmrDropdown = (function(superClass) {
  extend(FrmrDropdown, superClass);

  function FrmrDropdown(options) {
    var DOM_id;
    if (options == null) {
      options = {};
    }
    DOM_id = "dropdown-" + (_.random(Math.pow(2, 31))) + "-" + (_.now());
    _.defaults(options, {
      html: "<select\n    id=\"" + DOM_id + "\"\n    style='background-color: #FFFFFF; appearance: none; outline: none; line-height: normal; margin: 0; border: 0; padding: 0; border-color: #E9ECF0; font-family: \"-apple-system\"; font-size: 14px; color: #7A838D; width: 310px; height: 45px; border-width: 2px; box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.05);'\n>\n    <option value=\"\"></option>\n</select>",
      height: 44,
      width: 310,
      backgroundColor: "#FFFFFF"
    });
    FrmrDropdown.__super__.constructor.call(this, options);
    this.dropdown = document.getElementById(DOM_id);
  }

  FrmrDropdown.define("value", {
    get: function() {
      return this.dropdown.value;
    },
    set: function(value) {
      return this.dropdown.value = value;
    }
  });

  FrmrDropdown.define("dropdownOptions", {
    get: function() {
      return this._dropdownOptions;
    },
    set: function(dropdownOptions) {
      "[{value: 'option-value', text: 'option-text'}]";
      var _optionsHTML, i, len, option, ref;
      this._dropdownOptions = dropdownOptions;
      _optionsHTML = "";
      ref = this.dropdownOptions;
      for (i = 0, len = ref.length; i < len; i++) {
        option = ref[i];
        _optionsHTML += "<option value=" + option.value + ">" + option.text + "</option>";
      }
      return this.dropdown.innerHTML = _optionsHTML;
    }
  });

  return FrmrDropdown;

})(Layer);


},{}],"FrmrTextInput":[function(require,module,exports){
var _inputStyle, calculatePixelRatio,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_inputStyle = Object.assign({}, Framer.LayerStyle, calculatePixelRatio = function(layer, value) {
  return (value * layer.context.pixelMultiplier) + "px";
}, {
  fontSize: function(layer) {
    return calculatePixelRatio(layer, layer._properties.fontSize);
  },
  lineHeight: function(layer) {
    return layer._properties.lineHeight + "em";
  },
  padding: function(layer) {
    var padding, paddingValue, paddingValues, pixelMultiplier;
    pixelMultiplier = layer.context.pixelMultiplier;
    padding = [];
    paddingValue = layer._properties.padding;
    if (Number.isInteger(paddingValue)) {
      return calculatePixelRatio(layer, paddingValue);
    }
    paddingValues = layer._properties.padding.split(" ");
    switch (paddingValues.length) {
      case 4:
        padding.top = parseFloat(paddingValues[0]);
        padding.right = parseFloat(paddingValues[1]);
        padding.bottom = parseFloat(paddingValues[2]);
        padding.left = parseFloat(paddingValues[3]);
        break;
      case 3:
        padding.top = parseFloat(paddingValues[0]);
        padding.right = parseFloat(paddingValues[1]);
        padding.bottom = parseFloat(paddingValues[2]);
        padding.left = parseFloat(paddingValues[1]);
        break;
      case 2:
        padding.top = parseFloat(paddingValues[0]);
        padding.right = parseFloat(paddingValues[1]);
        padding.bottom = parseFloat(paddingValues[0]);
        padding.left = parseFloat(paddingValues[1]);
        break;
      default:
        padding.top = parseFloat(paddingValues[0]);
        padding.right = parseFloat(paddingValues[0]);
        padding.bottom = parseFloat(paddingValues[0]);
        padding.left = parseFloat(paddingValues[0]);
    }
    return (padding.top * pixelMultiplier) + "px " + (padding.right * pixelMultiplier) + "px " + (padding.bottom * pixelMultiplier) + "px " + (padding.left * pixelMultiplier) + "px";
  }
});

exports.FrmrTextInput = (function(superClass) {
  extend(FrmrTextInput, superClass);

  function FrmrTextInput(options) {
    if (options == null) {
      options = {};
    }
    this.enable = bind(this.enable, this);
    _.defaults(options, {
      width: Screen.width / 2,
      height: 60,
      backgroundColor: "white",
      fontSize: 30,
      lineHeight: 1,
      padding: 10,
      text: "",
      placeholder: "",
      type: "text",
      autoCorrect: true,
      autoComplete: true,
      autoCapitalize: true,
      spellCheck: true,
      autofocus: false,
      textColor: "#000",
      fontFamily: "-apple-system",
      fontWeight: "500",
      tabIndex: 0,
      textarea: false,
      enabled: true
    });
    FrmrTextInput.__super__.constructor.call(this, options);
    this._properties.fontSize = options.fontSize;
    this._properties.lineHeight = options.lineHeight;
    this._properties.padding = options.padding;
    if (options.placeholderColor != null) {
      this.placeholderColor = options.placeholderColor;
    }
    this.input = document.createElement(options.textarea ? 'textarea' : 'input');
    this.input.id = "input-" + (_.now());
    _.assign(this.input.style, {
      width: _inputStyle["width"](this),
      height: _inputStyle["height"](this),
      fontSize: _inputStyle["fontSize"](this),
      lineHeight: _inputStyle["lineHeight"](this),
      outline: "none",
      border: "none",
      backgroundColor: options.backgroundColor,
      padding: _inputStyle["padding"](this),
      fontFamily: options.fontFamily,
      color: options.textColor,
      fontWeight: options.fontWeight
    });
    _.assign(this.input, {
      value: options.text,
      type: options.type,
      placeholder: options.placeholder
    });
    this.input.setAttribute("tabindex", options.tabindex);
    this.input.setAttribute("autocorrect", options.autoCorrect ? "on" : "off");
    this.input.setAttribute("autocomplete", options.autoComplete ? "on" : "off");
    this.input.setAttribute("autocapitalize", options.autoCapitalize ? "on" : "off");
    this.input.setAttribute("spellcheck", options.spellCheck ? "on" : "off");
    if (!options.enabled) {
      this.input.setAttribute("disabled", true);
    }
    if (options.autofocus) {
      this.input.setAttribute("autofocus", true);
    }
    this.form = document.createElement("form");
    this.form.appendChild(this.input);
    this._element.appendChild(this.form);
    this.backgroundColor = "transparent";
    if (this.placeholderColor) {
      this.updatePlaceholderColor(options.placeholderColor);
    }
  }

  FrmrTextInput.define("style", {
    get: function() {
      return this.input.style;
    },
    set: function(value) {
      return _.extend(this.input.style, value);
    }
  });

  FrmrTextInput.define("value", {
    get: function() {
      return this.input.value;
    },
    set: function(value) {
      return this.input.value = value;
    }
  });

  FrmrTextInput.prototype.updatePlaceholderColor = function(color) {
    var css;
    this.placeholderColor = color;
    if (this.pageStyle != null) {
      document.head.removeChild(this.pageStyle);
    }
    this.pageStyle = document.createElement("style");
    this.pageStyle.type = "text/css";
    css = "#" + this.input.id + "::-webkit-input-placeholder { color: " + this.placeholderColor + "; }";
    this.pageStyle.appendChild(document.createTextNode(css));
    return document.head.appendChild(this.pageStyle);
  };

  FrmrTextInput.prototype.focus = function() {
    return this.input.focus();
  };

  FrmrTextInput.prototype.unfocus = function() {
    return this.input.blur();
  };

  FrmrTextInput.prototype.onFocus = function(cb) {
    return this.input.addEventListener("focus", function() {
      return cb.apply(this);
    });
  };

  FrmrTextInput.prototype.onUnfocus = function(cb) {
    return this.input.addEventListener("blur", function() {
      return cb.apply(this);
    });
  };

  FrmrTextInput.prototype.disable = function() {
    return this.input.setAttribute("disabled", true);
  };

  FrmrTextInput.prototype.enable = function() {
    return this.input.removeAttribute("disabled", true);
  };

  return FrmrTextInput;

})(Layer);


},{}],"ScreenChoiceComponents1":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceComponents1 = (function(superClass) {
  extend(ScreenChoiceComponents1, superClass);

  function ScreenChoiceComponents1(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceComponents1_background.width) / 2,
      y: (Screen.height - ScreenChoiceComponents1_background.height) / 2
    });
    ScreenChoiceComponents1.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceComponents1_nameLabel: ScreenChoiceComponents1_nameLabel.copy(),
      ScreenChoiceComponents1_selector: ScreenChoiceComponents1_selector.copy(),
      ScreenChoiceComponents1_btnLabel: ScreenChoiceComponents1_btnLabel.copy(),
      ScreenChoiceComponents1_btn: ScreenChoiceComponents1_btn.copy(),
      ScreenChoiceComponents1_back: ScreenChoiceComponents1_back.copy(),
      ScreenChoiceComponents1_background: ScreenChoiceComponents1_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceComponents1_background, this.comps);
  }

  ScreenChoiceComponents1.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceComponents1_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceComponents1.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceComponents1_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceComponents1;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceComponents2":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceComponents2 = (function(superClass) {
  extend(ScreenChoiceComponents2, superClass);

  function ScreenChoiceComponents2(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceComponents2_background.width) / 2,
      y: (Screen.height - ScreenChoiceComponents2_background.height) / 2
    });
    ScreenChoiceComponents2.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceComponents2_nameLabel: ScreenChoiceComponents2_nameLabel.copy(),
      ScreenChoiceComponents2_selector: ScreenChoiceComponents2_selector.copy(),
      ScreenChoiceComponents2_btnLabel: ScreenChoiceComponents2_btnLabel.copy(),
      ScreenChoiceComponents2_btn: ScreenChoiceComponents2_btn.copy(),
      ScreenChoiceComponents2_back: ScreenChoiceComponents2_back.copy(),
      ScreenChoiceComponents2_background: ScreenChoiceComponents2_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceComponents2_background, this.comps);
  }

  ScreenChoiceComponents2.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceComponents2_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceComponents2.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceComponents2_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceComponents2;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceComponents3":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceComponents3 = (function(superClass) {
  extend(ScreenChoiceComponents3, superClass);

  function ScreenChoiceComponents3(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceComponents3_background.width) / 2,
      y: (Screen.height - ScreenChoiceComponents3_background.height) / 2
    });
    ScreenChoiceComponents3.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceComponents3_nameLabel: ScreenChoiceComponents3_nameLabel.copy(),
      ScreenChoiceComponents3_selector: ScreenChoiceComponents3_selector.copy(),
      ScreenChoiceComponents3_btnLabel: ScreenChoiceComponents3_btnLabel.copy(),
      ScreenChoiceComponents3_btn: ScreenChoiceComponents3_btn.copy(),
      ScreenChoiceComponents3_back: ScreenChoiceComponents3_back.copy(),
      ScreenChoiceComponents3_background: ScreenChoiceComponents3_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceComponents3_background, this.comps);
  }

  ScreenChoiceComponents3.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceComponents3_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceComponents3.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceComponents3_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceComponents3;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceComponents4":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceComponents4 = (function(superClass) {
  extend(ScreenChoiceComponents4, superClass);

  function ScreenChoiceComponents4(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceComponents4_background.width) / 2,
      y: (Screen.height - ScreenChoiceComponents4_background.height) / 2
    });
    ScreenChoiceComponents4.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceComponents4_nameLabel: ScreenChoiceComponents4_nameLabel.copy(),
      ScreenChoiceComponents4_selector: ScreenChoiceComponents4_selector.copy(),
      ScreenChoiceComponents4_btnLabel: ScreenChoiceComponents4_btnLabel.copy(),
      ScreenChoiceComponents4_btn: ScreenChoiceComponents4_btn.copy(),
      ScreenChoiceComponents4_back: ScreenChoiceComponents4_back.copy(),
      ScreenChoiceComponents4_background: ScreenChoiceComponents4_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceComponents4_background, this.comps);
  }

  ScreenChoiceComponents4.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceComponents4_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceComponents4.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceComponents4_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceComponents4;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceDesign1":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceDesign1 = (function(superClass) {
  extend(ScreenChoiceDesign1, superClass);

  function ScreenChoiceDesign1(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceDesign1_background.width) / 2,
      y: (Screen.height - ScreenChoiceDesign1_background.height) / 2
    });
    ScreenChoiceDesign1.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceDesign1_nameLabel: ScreenChoiceDesign1_nameLabel.copy(),
      ScreenChoiceDesign1_selector: ScreenChoiceDesign1_selector.copy(),
      ScreenChoiceDesign1_btnLabel: ScreenChoiceDesign1_btnLabel.copy(),
      ScreenChoiceDesign1_btn: ScreenChoiceDesign1_btn.copy(),
      ScreenChoiceDesign1_back: ScreenChoiceDesign1_back.copy(),
      ScreenChoiceDesign1_background: ScreenChoiceDesign1_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceDesign1_background, this.comps);
  }

  ScreenChoiceDesign1.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceDesign1_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceDesign1.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceDesign1_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceDesign1;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceDesign2":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceDesign2 = (function(superClass) {
  extend(ScreenChoiceDesign2, superClass);

  function ScreenChoiceDesign2(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceDesign2_background.width) / 2,
      y: (Screen.height - ScreenChoiceDesign2_background.height) / 2
    });
    ScreenChoiceDesign2.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceDesign2_nameLabel: ScreenChoiceDesign2_nameLabel.copy(),
      ScreenChoiceDesign2_selector: ScreenChoiceDesign2_selector.copy(),
      ScreenChoiceDesign2_btnLabel: ScreenChoiceDesign2_btnLabel.copy(),
      ScreenChoiceDesign2_btn: ScreenChoiceDesign2_btn.copy(),
      ScreenChoiceDesign2_back: ScreenChoiceDesign2_back.copy(),
      ScreenChoiceDesign2_background: ScreenChoiceDesign2_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceDesign2_background, this.comps);
  }

  ScreenChoiceDesign2.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceDesign2_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceDesign2.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceDesign2_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceDesign2;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceDesign3":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceDesign3 = (function(superClass) {
  extend(ScreenChoiceDesign3, superClass);

  function ScreenChoiceDesign3(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceDesign3_background.width) / 2,
      y: (Screen.height - ScreenChoiceDesign3_background.height) / 2
    });
    ScreenChoiceDesign3.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceDesign3_nameLabel: ScreenChoiceDesign3_nameLabel.copy(),
      ScreenChoiceDesign3_selector: ScreenChoiceDesign3_selector.copy(),
      ScreenChoiceDesign3_btnLabel: ScreenChoiceDesign3_btnLabel.copy(),
      ScreenChoiceDesign3_btn: ScreenChoiceDesign3_btn.copy(),
      ScreenChoiceDesign3_back: ScreenChoiceDesign3_back.copy(),
      ScreenChoiceDesign3_background: ScreenChoiceDesign3_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceDesign3_background, this.comps);
  }

  ScreenChoiceDesign3.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceDesign3_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceDesign3.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceDesign3_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceDesign3;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceEssentials1":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceEssentials1 = (function(superClass) {
  extend(ScreenChoiceEssentials1, superClass);

  function ScreenChoiceEssentials1(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceEssentials1_background.width) / 2,
      y: (Screen.height - ScreenChoiceEssentials1_background.height) / 2
    });
    ScreenChoiceEssentials1.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceEssentials1_nameLabel: ScreenChoiceEssentials1_nameLabel.copy(),
      ScreenChoiceEssentials1_selector: ScreenChoiceEssentials1_selector.copy(),
      ScreenChoiceEssentials1_btnLabel: ScreenChoiceEssentials1_btnLabel.copy(),
      ScreenChoiceEssentials1_btn: ScreenChoiceEssentials1_btn.copy(),
      ScreenChoiceEssentials1_back: ScreenChoiceEssentials1_back.copy(),
      ScreenChoiceEssentials1_background: ScreenChoiceEssentials1_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceEssentials1_background, this.comps);
  }

  ScreenChoiceEssentials1.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceEssentials1_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceEssentials1.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceEssentials1_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceEssentials1;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceEssentials2":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceEssentials2 = (function(superClass) {
  extend(ScreenChoiceEssentials2, superClass);

  function ScreenChoiceEssentials2(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceEssentials2_background.width) / 2,
      y: (Screen.height - ScreenChoiceEssentials2_background.height) / 2
    });
    ScreenChoiceEssentials2.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceEssentials2_nameLabel: ScreenChoiceEssentials2_nameLabel.copy(),
      ScreenChoiceEssentials2_selector: ScreenChoiceEssentials2_selector.copy(),
      ScreenChoiceEssentials2_btnLabel: ScreenChoiceEssentials2_btnLabel.copy(),
      ScreenChoiceEssentials2_btn: ScreenChoiceEssentials2_btn.copy(),
      ScreenChoiceEssentials2_back: ScreenChoiceEssentials2_back.copy(),
      ScreenChoiceEssentials2_background: ScreenChoiceEssentials2_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceEssentials2_background, this.comps);
  }

  ScreenChoiceEssentials2.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceEssentials2_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceEssentials2.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceEssentials2_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceEssentials2;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceEssentials3":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceEssentials3 = (function(superClass) {
  extend(ScreenChoiceEssentials3, superClass);

  function ScreenChoiceEssentials3(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceEssentials3_background.width) / 2,
      y: (Screen.height - ScreenChoiceEssentials3_background.height) / 2
    });
    ScreenChoiceEssentials3.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceEssentials3_nameLabel: ScreenChoiceEssentials3_nameLabel.copy(),
      ScreenChoiceEssentials3_selector: ScreenChoiceEssentials3_selector.copy(),
      ScreenChoiceEssentials3_btnLabel: ScreenChoiceEssentials3_btnLabel.copy(),
      ScreenChoiceEssentials3_btn: ScreenChoiceEssentials3_btn.copy(),
      ScreenChoiceEssentials3_back: ScreenChoiceEssentials3_back.copy(),
      ScreenChoiceEssentials3_background: ScreenChoiceEssentials3_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceEssentials3_background, this.comps);
  }

  ScreenChoiceEssentials3.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceEssentials3_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceEssentials3.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceEssentials3_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceEssentials3;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceEssentials4":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceEssentials4 = (function(superClass) {
  extend(ScreenChoiceEssentials4, superClass);

  function ScreenChoiceEssentials4(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceEssentials4_background.width) / 2,
      y: (Screen.height - ScreenChoiceEssentials4_background.height) / 2
    });
    ScreenChoiceEssentials4.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceEssentials4_nameLabel: ScreenChoiceEssentials4_nameLabel.copy(),
      ScreenChoiceEssentials4_selector: ScreenChoiceEssentials4_selector.copy(),
      ScreenChoiceEssentials4_btnLabel: ScreenChoiceEssentials4_btnLabel.copy(),
      ScreenChoiceEssentials4_btn: ScreenChoiceEssentials4_btn.copy(),
      ScreenChoiceEssentials4_back: ScreenChoiceEssentials4_back.copy(),
      ScreenChoiceEssentials4_background: ScreenChoiceEssentials4_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceEssentials4_background, this.comps);
  }

  ScreenChoiceEssentials4.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceEssentials4_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceEssentials4.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceEssentials4_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceEssentials4;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceFeatures1":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceFeatures1 = (function(superClass) {
  extend(ScreenChoiceFeatures1, superClass);

  function ScreenChoiceFeatures1(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceFeatures1_background.width) / 2,
      y: (Screen.height - ScreenChoiceFeatures1_background.height) / 2
    });
    ScreenChoiceFeatures1.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceFeatures1_nameLabel: ScreenChoiceFeatures1_nameLabel.copy(),
      ScreenChoiceFeatures1_selector: ScreenChoiceFeatures1_selector.copy(),
      ScreenChoiceFeatures1_btnLabel: ScreenChoiceFeatures1_btnLabel.copy(),
      ScreenChoiceFeatures1_btn: ScreenChoiceFeatures1_btn.copy(),
      ScreenChoiceFeatures1_back: ScreenChoiceFeatures1_back.copy(),
      ScreenChoiceFeatures1_background: ScreenChoiceFeatures1_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceFeatures1_background, this.comps);
  }

  ScreenChoiceFeatures1.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceFeatures1_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceFeatures1.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceFeatures1_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceFeatures1;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceFeatures2":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceFeatures2 = (function(superClass) {
  extend(ScreenChoiceFeatures2, superClass);

  function ScreenChoiceFeatures2(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceFeatures2_background.width) / 2,
      y: (Screen.height - ScreenChoiceFeatures2_background.height) / 2
    });
    ScreenChoiceFeatures2.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceFeatures2_nameLabel: ScreenChoiceFeatures2_nameLabel.copy(),
      ScreenChoiceFeatures2_selector: ScreenChoiceFeatures2_selector.copy(),
      ScreenChoiceFeatures2_btnLabel: ScreenChoiceFeatures2_btnLabel.copy(),
      ScreenChoiceFeatures2_btn: ScreenChoiceFeatures2_btn.copy(),
      ScreenChoiceFeatures2_back: ScreenChoiceFeatures2_back.copy(),
      ScreenChoiceFeatures2_background: ScreenChoiceFeatures2_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceFeatures2_background, this.comps);
  }

  ScreenChoiceFeatures2.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceFeatures2_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceFeatures2.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceFeatures2_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceFeatures2;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceModules1":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceModules1 = (function(superClass) {
  extend(ScreenChoiceModules1, superClass);

  function ScreenChoiceModules1(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceModules1_background.width) / 2,
      y: (Screen.height - ScreenChoiceModules1_background.height) / 2
    });
    ScreenChoiceModules1.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceModules1_nameLabel: ScreenChoiceModules1_nameLabel.copy(),
      ScreenChoiceModules1_selector: ScreenChoiceModules1_selector.copy(),
      ScreenChoiceModules1_btnLabel: ScreenChoiceModules1_btnLabel.copy(),
      ScreenChoiceModules1_btn: ScreenChoiceModules1_btn.copy(),
      ScreenChoiceModules1_back: ScreenChoiceModules1_back.copy(),
      ScreenChoiceModules1_background: ScreenChoiceModules1_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceModules1_background, this.comps);
  }

  ScreenChoiceModules1.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceModules1_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceModules1.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceModules1_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceModules1;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceModules2":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceModules2 = (function(superClass) {
  extend(ScreenChoiceModules2, superClass);

  function ScreenChoiceModules2(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceModules2_background.width) / 2,
      y: (Screen.height - ScreenChoiceModules2_background.height) / 2
    });
    ScreenChoiceModules2.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceModules2_nameLabel: ScreenChoiceModules2_nameLabel.copy(),
      ScreenChoiceModules2_selector: ScreenChoiceModules2_selector.copy(),
      ScreenChoiceModules2_btnLabel: ScreenChoiceModules2_btnLabel.copy(),
      ScreenChoiceModules2_btn: ScreenChoiceModules2_btn.copy(),
      ScreenChoiceModules2_back: ScreenChoiceModules2_back.copy(),
      ScreenChoiceModules2_background: ScreenChoiceModules2_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceModules2_background, this.comps);
  }

  ScreenChoiceModules2.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceModules2_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceModules2.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceModules2_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceModules2;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceModules3":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceModules3 = (function(superClass) {
  extend(ScreenChoiceModules3, superClass);

  function ScreenChoiceModules3(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceModules3_background.width) / 2,
      y: (Screen.height - ScreenChoiceModules3_background.height) / 2
    });
    ScreenChoiceModules3.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceModules3_nameLabel: ScreenChoiceModules3_nameLabel.copy(),
      ScreenChoiceModules3_selector: ScreenChoiceModules3_selector.copy(),
      ScreenChoiceModules3_btnLabel: ScreenChoiceModules3_btnLabel.copy(),
      ScreenChoiceModules3_btn: ScreenChoiceModules3_btn.copy(),
      ScreenChoiceModules3_back: ScreenChoiceModules3_back.copy(),
      ScreenChoiceModules3_background: ScreenChoiceModules3_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceModules3_background, this.comps);
  }

  ScreenChoiceModules3.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceModules3_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceModules3.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceModules3_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceModules3;

})(Layer);


},{"Casing":"Casing"}],"ScreenChoiceModules4":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenChoiceModules4 = (function(superClass) {
  extend(ScreenChoiceModules4, superClass);

  function ScreenChoiceModules4(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenChoiceModules4_background.width) / 2,
      y: (Screen.height - ScreenChoiceModules4_background.height) / 2
    });
    ScreenChoiceModules4.__super__.constructor.call(this, options);
    this.comps = {
      ScreenChoiceModules4_nameLabel: ScreenChoiceModules4_nameLabel.copy(),
      ScreenChoiceModules4_selector: ScreenChoiceModules4_selector.copy(),
      ScreenChoiceModules4_btnLabel: ScreenChoiceModules4_btnLabel.copy(),
      ScreenChoiceModules4_btn: ScreenChoiceModules4_btn.copy(),
      ScreenChoiceModules4_back: ScreenChoiceModules4_back.copy(),
      ScreenChoiceModules4_background: ScreenChoiceModules4_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenChoiceModules4_background, this.comps);
  }

  ScreenChoiceModules4.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenChoiceModules4_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenChoiceModules4.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenChoiceModules4_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  return ScreenChoiceModules4;

})(Layer);


},{"Casing":"Casing"}],"ScreenName":[function(require,module,exports){
var Casing, FrmrTextInput,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

FrmrTextInput = require("FrmrTextInput");

exports.ScreenName = (function(superClass) {
  extend(ScreenName, superClass);

  function ScreenName(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenName_background.width) / 2,
      y: (Screen.height - ScreenName_background.height) / 2
    });
    ScreenName.__super__.constructor.call(this, options);
    this.comps = {
      ScreenName_selector: ScreenName_selector.copy(),
      ScreenName_nameLabel: ScreenName_nameLabel.copy(),
      ScreenName_btnLabel: ScreenName_btnLabel.copy(),
      ScreenName_btn: ScreenName_btn.copy(),
      ScreenName_back: ScreenName_back.copy(),
      ScreenName_input_anchor: ScreenName_input_anchor.copy(),
      ScreenName_background: ScreenName_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenName_background, this.comps);
    this.comps.ScreenName_input = Casing.sizePositionApply(this.comps.ScreenName_input_anchor, new FrmrTextInput.FrmrTextInput({
      fontFamily: "-apple-system",
      fontSize: 24,
      fontWeight: 400,
      placeholder: "Please enter your name..."
    }));
    this.comps.ScreenName_input.onFocus(function() {
      this.style.borderRadius = "4px";
      this.style.borderColor = "#3C444D";
      return this.style.border = "1px solid #3C444D";
    });
    this.comps.ScreenName_input.onUnfocus(function() {
      this.style.borderRadius = "4px";
      return this.style.borderColor = "#C9CCD0";
    });
    this.comps.ScreenName_input.focus();
  }

  ScreenName.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenName_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  ScreenName.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenName_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  ScreenName.prototype.wiring_user_name = Casing.invokeOnce(function(userName) {
    var base;
    return typeof (base = this.comps.ScreenName_input.input).addEventListener === "function" ? base.addEventListener('keyup', (function(_this) {
      return function() {
        return userName.value = _this.comps.ScreenName_input.value;
      };
    })(this)) : void 0;
  });

  return ScreenName;

})(Layer);


},{"Casing":"Casing","FrmrTextInput":"FrmrTextInput"}],"ScreenSummary":[function(require,module,exports){
var Casing, FrmrDatePicker,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

FrmrDatePicker = require("FrmrDatePicker");

exports.ScreenSummary = (function(superClass) {
  extend(ScreenSummary, superClass);

  function ScreenSummary(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenSummary_background.width) / 2,
      y: (Screen.height - ScreenSummary_background.height) / 2
    });
    ScreenSummary.__super__.constructor.call(this, options);
    this.comps = {
      ScreenSummary_selector: ScreenSummary_selector.copy(),
      ScreenSummary_back: ScreenSummary_back.copy(),
      ScreenSummary_salute_anchor: ScreenSummary_salute_anchor.copy(),
      ScreenSummary_topic_anchor: ScreenSummary_topic_anchor.copy(),
      ScreenSummary_date_anchor: ScreenSummary_date_anchor.copy(),
      ScreenSummary_background: ScreenSummary_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenSummary_background, this.comps);
  }

  ScreenSummary.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenSummary_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  ScreenSummary.prototype.wiring_user_name = function(userName) {
    var ref;
    if ((ref = this.comps.ScreenSummary_salute) != null) {
      ref.destroy();
    }
    return this.comps.ScreenSummary_salute = Casing.sizePositionApply(this.comps.ScreenSummary_salute_anchor, new TextLayer({
      text: "That's great, " + (userName.value !== "" ? userName.value : "Annonymous") + "!",
      textAlign: "left"
    }));
  };

  ScreenSummary.prototype.wiring_user_name = function(userName) {
    var ref;
    if ((ref = this.comps.ScreenSummary_salute) != null) {
      ref.destroy();
    }
    return this.comps.ScreenSummary_salute = Casing.sizePositionApply(this.comps.ScreenSummary_salute_anchor, new TextLayer({
      text: "That's great, " + (userName.value !== "" ? userName.value : "Annonymous") + "!",
      textAlign: "left"
    }));
  };

  ScreenSummary.prototype.wiring_topic_chosen = function(topicChosen) {
    var ref;
    if ((ref = this.comps.ScreenSummary_topic) != null) {
      ref.destroy();
    }
    return this.comps.ScreenSummary_topic = Casing.sizePositionApply(this.comps.ScreenSummary_topic_anchor, new TextLayer({
      text: "You're set to learn Casing topic \"" + (_.upperFirst(topicChosen.value)) + "\"",
      textAlign: "left"
    }));
  };

  ScreenSummary.prototype.wiring_date_selected = function(dateSelected) {
    var d, f, ref;
    if ((ref = this.comps.ScreenSummary_date) != null) {
      ref.destroy();
    }
    d = dateSelected.value;
    f = FrmrDatePicker;
    return this.comps.ScreenSummary_date = Casing.sizePositionApply(this.comps.ScreenSummary_date_anchor, new TextLayer({
      text: (d ? "on " + f.monthNames[d.getMonth()] + ", " + (d.getDate()) : "on an unspecified date!"),
      textAlign: "left"
    }));
  };

  return ScreenSummary;

})(Layer);


},{"Casing":"Casing","FrmrDatePicker":"FrmrDatePicker"}],"ScreenTopic":[function(require,module,exports){
var Casing, FrmrDropdown,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

FrmrDropdown = require("FrmrDropdown");

exports.ScreenTopic = (function(superClass) {
  extend(ScreenTopic, superClass);

  function ScreenTopic(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenTopic_background.width) / 2,
      y: (Screen.height - ScreenTopic_background.height) / 2
    });
    ScreenTopic.__super__.constructor.call(this, options);
    this.comps = {
      ScreenTopic_nameLabel: ScreenTopic_nameLabel.copy(),
      ScreenTopic_selector: ScreenTopic_selector.copy(),
      ScreenTopic_btnLabel: ScreenTopic_btnLabel.copy(),
      ScreenTopic_btn: ScreenTopic_btn.copy(),
      ScreenTopic_back: ScreenTopic_back.copy(),
      SceenTopic_dropdown_anchor: SceenTopic_dropdown_anchor.copy(),
      ScreenTopic_background: ScreenTopic_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenTopic_background, this.comps);
    this.comps.SceenTopic_dropdown = Casing.sizePositionApply(this.comps.SceenTopic_dropdown_anchor, new FrmrDropdown.FrmrDropdown);
  }

  ScreenTopic.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenTopic_btn.onTap((function(_this) {
      return function() {
        var dropdownValue;
        dropdownValue = _this.comps.SceenTopic_dropdown.value;
        return handleBtnTap.value(dropdownValue);
      };
    })(this));
  });

  ScreenTopic.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenTopic_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  ScreenTopic.prototype.wiring_dropdown_options = function(dropdownOptions) {
    return this.comps.SceenTopic_dropdown.dropdownOptions = dropdownOptions.value;
  };

  ScreenTopic.prototype.wiring_dropdown_value = function(topicChosen) {
    return this.comps.SceenTopic_dropdown.value = topicChosen.value;
  };

  return ScreenTopic;

})(Layer);


},{"Casing":"Casing","FrmrDropdown":"FrmrDropdown"}],"ScreenWelcome":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.ScreenWelcome = (function(superClass) {
  extend(ScreenWelcome, superClass);

  function ScreenWelcome(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenWelcome_background.width) / 2,
      y: (Screen.height - ScreenWelcome_background.height) / 2
    });
    ScreenWelcome.__super__.constructor.call(this, options);
    this.comps = {
      ScreenWelcome_btnLabel: ScreenWelcome_btnLabel.copy(),
      ScreenWelcome_btn: ScreenWelcome_btn.copy(),
      ScreenWelcome_background: ScreenWelcome_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenWelcome_background, this.comps);
  }

  ScreenWelcome.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenWelcome_btn.onTap((function(_this) {
      return function() {
        return handleBtnTap.value();
      };
    })(this));
  });

  return ScreenWelcome;

})(Layer);


},{"Casing":"Casing"}],"ScreenWhen":[function(require,module,exports){
var Casing, FrmrDatePicker,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

FrmrDatePicker = require("FrmrDatePicker");

exports.ScreenWhen = (function(superClass) {
  extend(ScreenWhen, superClass);

  function ScreenWhen(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - ScreenWhen_background.width) / 2,
      y: (Screen.height - ScreenWhen_background.height) / 2
    });
    ScreenWhen.__super__.constructor.call(this, options);
    this.comps = {
      ScreenWhen_nameLabel: ScreenWhen_nameLabel.copy(),
      ScreenWhen_selector: ScreenWhen_selector.copy(),
      ScreenWhen_btnLabel: ScreenWhen_btnLabel.copy(),
      ScreenWhen_btn: ScreenWhen_btn.copy(),
      ScreenWhen_back: ScreenWhen_back.copy(),
      ScreenWhen_datepicker_anchor: ScreenWhen_datepicker_anchor.copy(),
      ScreenWhen_background: ScreenWhen_background.copy()
    };
    Casing.autoPosition(this, this.comps.ScreenWhen_background, this.comps);
    this.comps.ScreenWhen_datepicker = Casing.sizePositionApply(this.comps.ScreenWhen_datepicker_anchor, new FrmrDatePicker.FrmrDatePicker({
      monthsBoxStyle: {
        height: this.comps.ScreenWhen_datepicker_anchor.height,
        width: this.comps.ScreenWhen_datepicker_anchor.width
      },
      monthHeaderStyle: {
        height: 36,
        fontSize: 14
      },
      numberOfMonthsShow: 2,
      dateRangeSelectable: false
    }));
  }

  ScreenWhen.prototype.wiring_btn = Casing.invokeOnce(function(handleBtnTap) {
    return this.comps.ScreenWhen_btn.onTap((function(_this) {
      return function() {
        var dateSelected;
        dateSelected = _this.comps.ScreenWhen_datepicker.getDateRangeSelectedStart();
        return handleBtnTap.value(dateSelected);
      };
    })(this));
  });

  ScreenWhen.prototype.wiring_back = Casing.invokeOnce(function(handleBackTap) {
    return this.comps.ScreenWhen_back.onTap((function(_this) {
      return function() {
        return handleBackTap.value();
      };
    })(this));
  });

  ScreenWhen.prototype.wiring_date_selected = function(dateSelected) {
    return this.comps.ScreenWhen_datepicker.setDateRangeSelected(dateSelected.value, dateSelected.value, false);
  };

  return ScreenWhen;

})(Layer);


},{"Casing":"Casing","FrmrDatePicker":"FrmrDatePicker"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJhbWVyLm1vZHVsZXMuanMiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL1VzZXJzL25hdGFsaWUvRGVza3RvcC9jYXNpbmcvZXhhbXBsZS13ZWJhcHAuZnJhbWVyL21vZHVsZXMvU2NyZWVuV2hlbi5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi9Vc2Vycy9uYXRhbGllL0Rlc2t0b3AvY2FzaW5nL2V4YW1wbGUtd2ViYXBwLmZyYW1lci9tb2R1bGVzL1NjcmVlbldlbGNvbWUuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vVXNlcnMvbmF0YWxpZS9EZXNrdG9wL2Nhc2luZy9leGFtcGxlLXdlYmFwcC5mcmFtZXIvbW9kdWxlcy9TY3JlZW5Ub3BpYy5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi9Vc2Vycy9uYXRhbGllL0Rlc2t0b3AvY2FzaW5nL2V4YW1wbGUtd2ViYXBwLmZyYW1lci9tb2R1bGVzL1NjcmVlblN1bW1hcnkuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vVXNlcnMvbmF0YWxpZS9EZXNrdG9wL2Nhc2luZy9leGFtcGxlLXdlYmFwcC5mcmFtZXIvbW9kdWxlcy9TY3JlZW5OYW1lLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uL1VzZXJzL25hdGFsaWUvRGVza3RvcC9jYXNpbmcvZXhhbXBsZS13ZWJhcHAuZnJhbWVyL21vZHVsZXMvU2NyZWVuQ2hvaWNlTW9kdWxlczQuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vVXNlcnMvbmF0YWxpZS9EZXNrdG9wL2Nhc2luZy9leGFtcGxlLXdlYmFwcC5mcmFtZXIvbW9kdWxlcy9TY3JlZW5DaG9pY2VNb2R1bGVzMy5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi9Vc2Vycy9uYXRhbGllL0Rlc2t0b3AvY2FzaW5nL2V4YW1wbGUtd2ViYXBwLmZyYW1lci9tb2R1bGVzL1NjcmVlbkNob2ljZU1vZHVsZXMyLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uL1VzZXJzL25hdGFsaWUvRGVza3RvcC9jYXNpbmcvZXhhbXBsZS13ZWJhcHAuZnJhbWVyL21vZHVsZXMvU2NyZWVuQ2hvaWNlTW9kdWxlczEuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vVXNlcnMvbmF0YWxpZS9EZXNrdG9wL2Nhc2luZy9leGFtcGxlLXdlYmFwcC5mcmFtZXIvbW9kdWxlcy9TY3JlZW5DaG9pY2VGZWF0dXJlczIuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vVXNlcnMvbmF0YWxpZS9EZXNrdG9wL2Nhc2luZy9leGFtcGxlLXdlYmFwcC5mcmFtZXIvbW9kdWxlcy9TY3JlZW5DaG9pY2VGZWF0dXJlczEuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vVXNlcnMvbmF0YWxpZS9EZXNrdG9wL2Nhc2luZy9leGFtcGxlLXdlYmFwcC5mcmFtZXIvbW9kdWxlcy9TY3JlZW5DaG9pY2VFc3NlbnRpYWxzNC5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi9Vc2Vycy9uYXRhbGllL0Rlc2t0b3AvY2FzaW5nL2V4YW1wbGUtd2ViYXBwLmZyYW1lci9tb2R1bGVzL1NjcmVlbkNob2ljZUVzc2VudGlhbHMzLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uL1VzZXJzL25hdGFsaWUvRGVza3RvcC9jYXNpbmcvZXhhbXBsZS13ZWJhcHAuZnJhbWVyL21vZHVsZXMvU2NyZWVuQ2hvaWNlRXNzZW50aWFsczIuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vVXNlcnMvbmF0YWxpZS9EZXNrdG9wL2Nhc2luZy9leGFtcGxlLXdlYmFwcC5mcmFtZXIvbW9kdWxlcy9TY3JlZW5DaG9pY2VFc3NlbnRpYWxzMS5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi9Vc2Vycy9uYXRhbGllL0Rlc2t0b3AvY2FzaW5nL2V4YW1wbGUtd2ViYXBwLmZyYW1lci9tb2R1bGVzL1NjcmVlbkNob2ljZURlc2lnbjMuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vVXNlcnMvbmF0YWxpZS9EZXNrdG9wL2Nhc2luZy9leGFtcGxlLXdlYmFwcC5mcmFtZXIvbW9kdWxlcy9TY3JlZW5DaG9pY2VEZXNpZ24yLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uL1VzZXJzL25hdGFsaWUvRGVza3RvcC9jYXNpbmcvZXhhbXBsZS13ZWJhcHAuZnJhbWVyL21vZHVsZXMvU2NyZWVuQ2hvaWNlRGVzaWduMS5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi9Vc2Vycy9uYXRhbGllL0Rlc2t0b3AvY2FzaW5nL2V4YW1wbGUtd2ViYXBwLmZyYW1lci9tb2R1bGVzL1NjcmVlbkNob2ljZUNvbXBvbmVudHM0LmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uL1VzZXJzL25hdGFsaWUvRGVza3RvcC9jYXNpbmcvZXhhbXBsZS13ZWJhcHAuZnJhbWVyL21vZHVsZXMvU2NyZWVuQ2hvaWNlQ29tcG9uZW50czMuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vVXNlcnMvbmF0YWxpZS9EZXNrdG9wL2Nhc2luZy9leGFtcGxlLXdlYmFwcC5mcmFtZXIvbW9kdWxlcy9TY3JlZW5DaG9pY2VDb21wb25lbnRzMi5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi9Vc2Vycy9uYXRhbGllL0Rlc2t0b3AvY2FzaW5nL2V4YW1wbGUtd2ViYXBwLmZyYW1lci9tb2R1bGVzL1NjcmVlbkNob2ljZUNvbXBvbmVudHMxLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uL1VzZXJzL25hdGFsaWUvRGVza3RvcC9jYXNpbmcvZXhhbXBsZS13ZWJhcHAuZnJhbWVyL21vZHVsZXMvRnJtclRleHRJbnB1dC5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi9Vc2Vycy9uYXRhbGllL0Rlc2t0b3AvY2FzaW5nL2V4YW1wbGUtd2ViYXBwLmZyYW1lci9tb2R1bGVzL0ZybXJEcm9wZG93bi5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi9Vc2Vycy9uYXRhbGllL0Rlc2t0b3AvY2FzaW5nL2V4YW1wbGUtd2ViYXBwLmZyYW1lci9tb2R1bGVzL0ZybXJEYXRlUGlja2VyLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uL1VzZXJzL25hdGFsaWUvRGVza3RvcC9jYXNpbmcvZXhhbXBsZS13ZWJhcHAuZnJhbWVyL21vZHVsZXMvQ2FzaW5nLmNvZmZlZSIsIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiQ2FzaW5nID0gcmVxdWlyZSBcIkNhc2luZ1wiXG5Gcm1yRGF0ZVBpY2tlciA9IHJlcXVpcmUgXCJGcm1yRGF0ZVBpY2tlclwiXG5cbmNsYXNzIGV4cG9ydHMuU2NyZWVuV2hlbiBleHRlbmRzIExheWVyXG4gICAgY29uc3RydWN0b3I6IChvcHRpb25zID0ge30pIC0+XG4gICAgICAgIF8uZGVmYXVsdHMgb3B0aW9ucyxcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogbnVsbFxuICAgICAgICAgICAgeDogKFNjcmVlbi53aWR0aCAtIFNjcmVlbldoZW5fYmFja2dyb3VuZC53aWR0aCkgLyAyXG4gICAgICAgICAgICB5OiAoU2NyZWVuLmhlaWdodCAtIFNjcmVlbldoZW5fYmFja2dyb3VuZC5oZWlnaHQpIC8gMlxuICAgICAgICBzdXBlciBvcHRpb25zXG5cbiAgICAgICAgQGNvbXBzID1cbiAgICAgICAgICAgIFNjcmVlbldoZW5fbmFtZUxhYmVsOiBTY3JlZW5XaGVuX25hbWVMYWJlbC5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbldoZW5fc2VsZWN0b3I6IFNjcmVlbldoZW5fc2VsZWN0b3IuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5XaGVuX2J0bkxhYmVsOiBTY3JlZW5XaGVuX2J0bkxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuV2hlbl9idG46IFNjcmVlbldoZW5fYnRuLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuV2hlbl9iYWNrOiBTY3JlZW5XaGVuX2JhY2suY29weSgpXG4gICAgICAgICAgICBTY3JlZW5XaGVuX2RhdGVwaWNrZXJfYW5jaG9yOiBTY3JlZW5XaGVuX2RhdGVwaWNrZXJfYW5jaG9yLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuV2hlbl9iYWNrZ3JvdW5kOiBTY3JlZW5XaGVuX2JhY2tncm91bmQuY29weSgpXG5cbiAgICAgICAgQ2FzaW5nLmF1dG9Qb3NpdGlvbihALCBAY29tcHMuU2NyZWVuV2hlbl9iYWNrZ3JvdW5kLCBAY29tcHMpXG5cbiAgICAgICAgQGNvbXBzLlNjcmVlbldoZW5fZGF0ZXBpY2tlciA9IENhc2luZy5zaXplUG9zaXRpb25BcHBseSBAY29tcHMuU2NyZWVuV2hlbl9kYXRlcGlja2VyX2FuY2hvciwgbmV3IEZybXJEYXRlUGlja2VyLkZybXJEYXRlUGlja2VyXG4gICAgICAgICAgICAgICAgbW9udGhzQm94U3R5bGU6XG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogQGNvbXBzLlNjcmVlbldoZW5fZGF0ZXBpY2tlcl9hbmNob3IuaGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiBAY29tcHMuU2NyZWVuV2hlbl9kYXRlcGlja2VyX2FuY2hvci53aWR0aFxuICAgICAgICAgICAgICAgIG1vbnRoSGVhZGVyU3R5bGU6XG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogMzZcbiAgICAgICAgICAgICAgICAgICAgZm9udFNpemU6IDE0XG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZNb250aHNTaG93OiAyXG4gICAgICAgICAgICAgICAgZGF0ZVJhbmdlU2VsZWN0YWJsZTogZmFsc2VcblxuICAgIHdpcmluZ19idG46IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCdG5UYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5XaGVuX2J0bi5vblRhcCA9PlxuICAgICAgICAgICAgZGF0ZVNlbGVjdGVkID0gQGNvbXBzLlNjcmVlbldoZW5fZGF0ZXBpY2tlci5nZXREYXRlUmFuZ2VTZWxlY3RlZFN0YXJ0KClcbiAgICAgICAgICAgIGhhbmRsZUJ0blRhcC52YWx1ZShkYXRlU2VsZWN0ZWQpXG5cbiAgICB3aXJpbmdfYmFjazogQ2FzaW5nLmludm9rZU9uY2UgKGhhbmRsZUJhY2tUYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5XaGVuX2JhY2sub25UYXAgPT5cbiAgICAgICAgICAgIGhhbmRsZUJhY2tUYXAudmFsdWUoKVxuICAgIFxuICAgIHdpcmluZ19kYXRlX3NlbGVjdGVkOiAoZGF0ZVNlbGVjdGVkKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuV2hlbl9kYXRlcGlja2VyLnNldERhdGVSYW5nZVNlbGVjdGVkKFxuICAgICAgICAgICAgZGF0ZVNlbGVjdGVkLnZhbHVlXG4gICAgICAgICAgICBkYXRlU2VsZWN0ZWQudmFsdWVcbiAgICAgICAgICAgIGZhbHNlXG4gICAgICAgIClcbiIsIkNhc2luZyA9IHJlcXVpcmUgXCJDYXNpbmdcIlxuXG5jbGFzcyBleHBvcnRzLlNjcmVlbldlbGNvbWUgZXh0ZW5kcyBMYXllclxuICAgIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICAgICBfLmRlZmF1bHRzIG9wdGlvbnMsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG51bGxcbiAgICAgICAgICAgIHg6IChTY3JlZW4ud2lkdGggLSBTY3JlZW5XZWxjb21lX2JhY2tncm91bmQud2lkdGgpIC8gMlxuICAgICAgICAgICAgeTogKFNjcmVlbi5oZWlnaHQgLSBTY3JlZW5XZWxjb21lX2JhY2tncm91bmQuaGVpZ2h0KSAvIDJcbiAgICAgICAgc3VwZXIgb3B0aW9uc1xuXG4gICAgICAgIEBjb21wcyA9XG4gICAgICAgICAgICBTY3JlZW5XZWxjb21lX2J0bkxhYmVsOiBTY3JlZW5XZWxjb21lX2J0bkxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuV2VsY29tZV9idG46IFNjcmVlbldlbGNvbWVfYnRuLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuV2VsY29tZV9iYWNrZ3JvdW5kOiBTY3JlZW5XZWxjb21lX2JhY2tncm91bmQuY29weSgpXG4gICAgICAgIFxuICAgICAgICBDYXNpbmcuYXV0b1Bvc2l0aW9uKEAsIEBjb21wcy5TY3JlZW5XZWxjb21lX2JhY2tncm91bmQsIEBjb21wcylcblxuICAgIHdpcmluZ19idG46IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCdG5UYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5XZWxjb21lX2J0bi5vblRhcCA9PlxuICAgICAgICAgICAgaGFuZGxlQnRuVGFwLnZhbHVlKCkiLCJDYXNpbmcgPSByZXF1aXJlIFwiQ2FzaW5nXCJcbkZybXJEcm9wZG93biA9IHJlcXVpcmUgXCJGcm1yRHJvcGRvd25cIlxuXG5jbGFzcyBleHBvcnRzLlNjcmVlblRvcGljIGV4dGVuZHMgTGF5ZXJcbiAgICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICAgICAgXy5kZWZhdWx0cyBvcHRpb25zLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBudWxsXG4gICAgICAgICAgICB4OiAoU2NyZWVuLndpZHRoIC0gU2NyZWVuVG9waWNfYmFja2dyb3VuZC53aWR0aCkgLyAyXG4gICAgICAgICAgICB5OiAoU2NyZWVuLmhlaWdodCAtIFNjcmVlblRvcGljX2JhY2tncm91bmQuaGVpZ2h0KSAvIDJcbiAgICAgICAgc3VwZXIgb3B0aW9uc1xuXG4gICAgICAgIEBjb21wcyA9XG4gICAgICAgICAgICBTY3JlZW5Ub3BpY19uYW1lTGFiZWw6IFNjcmVlblRvcGljX25hbWVMYWJlbC5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlblRvcGljX3NlbGVjdG9yOiBTY3JlZW5Ub3BpY19zZWxlY3Rvci5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlblRvcGljX2J0bkxhYmVsOiBTY3JlZW5Ub3BpY19idG5MYWJlbC5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlblRvcGljX2J0bjogU2NyZWVuVG9waWNfYnRuLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuVG9waWNfYmFjazogU2NyZWVuVG9waWNfYmFjay5jb3B5KClcbiAgICAgICAgICAgIFNjZWVuVG9waWNfZHJvcGRvd25fYW5jaG9yOiBTY2VlblRvcGljX2Ryb3Bkb3duX2FuY2hvci5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlblRvcGljX2JhY2tncm91bmQ6IFNjcmVlblRvcGljX2JhY2tncm91bmQuY29weSgpXG5cbiAgICAgICAgQ2FzaW5nLmF1dG9Qb3NpdGlvbihALCBAY29tcHMuU2NyZWVuVG9waWNfYmFja2dyb3VuZCwgQGNvbXBzKVxuXG4gICAgICAgIEBjb21wcy5TY2VlblRvcGljX2Ryb3Bkb3duID0gQ2FzaW5nLnNpemVQb3NpdGlvbkFwcGx5IEBjb21wcy5TY2VlblRvcGljX2Ryb3Bkb3duX2FuY2hvciwgbmV3IEZybXJEcm9wZG93bi5Gcm1yRHJvcGRvd25cblxuICAgIHdpcmluZ19idG46IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCdG5UYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5Ub3BpY19idG4ub25UYXAgPT5cbiAgICAgICAgICAgIGRyb3Bkb3duVmFsdWUgPSBAY29tcHMuU2NlZW5Ub3BpY19kcm9wZG93bi52YWx1ZVxuICAgICAgICAgICAgaGFuZGxlQnRuVGFwLnZhbHVlKGRyb3Bkb3duVmFsdWUpXG5cbiAgICB3aXJpbmdfYmFjazogQ2FzaW5nLmludm9rZU9uY2UgKGhhbmRsZUJhY2tUYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5Ub3BpY19iYWNrLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCYWNrVGFwLnZhbHVlKClcblxuICAgIHdpcmluZ19kcm9wZG93bl9vcHRpb25zOiAoZHJvcGRvd25PcHRpb25zKSAtPlxuICAgICAgICBAY29tcHMuU2NlZW5Ub3BpY19kcm9wZG93bi5kcm9wZG93bk9wdGlvbnMgPSBkcm9wZG93bk9wdGlvbnMudmFsdWVcblxuICAgIHdpcmluZ19kcm9wZG93bl92YWx1ZTogKHRvcGljQ2hvc2VuKSAtPlxuICAgICAgICBAY29tcHMuU2NlZW5Ub3BpY19kcm9wZG93bi52YWx1ZSA9IHRvcGljQ2hvc2VuLnZhbHVlIiwiQ2FzaW5nID0gcmVxdWlyZSBcIkNhc2luZ1wiXG5Gcm1yRGF0ZVBpY2tlciA9IHJlcXVpcmUgXCJGcm1yRGF0ZVBpY2tlclwiXG5cbmNsYXNzIGV4cG9ydHMuU2NyZWVuU3VtbWFyeSBleHRlbmRzIExheWVyXG4gICAgY29uc3RydWN0b3I6IChvcHRpb25zID0ge30pIC0+XG4gICAgICAgIF8uZGVmYXVsdHMgb3B0aW9ucyxcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogbnVsbFxuICAgICAgICAgICAgeDogKFNjcmVlbi53aWR0aCAtIFNjcmVlblN1bW1hcnlfYmFja2dyb3VuZC53aWR0aCkgLyAyXG4gICAgICAgICAgICB5OiAoU2NyZWVuLmhlaWdodCAtIFNjcmVlblN1bW1hcnlfYmFja2dyb3VuZC5oZWlnaHQpIC8gMlxuICAgICAgICBzdXBlciBvcHRpb25zXG5cbiAgICAgICAgQGNvbXBzID1cbiAgICAgICAgICAgIFNjcmVlblN1bW1hcnlfc2VsZWN0b3I6IFNjcmVlblN1bW1hcnlfc2VsZWN0b3IuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5TdW1tYXJ5X2JhY2s6IFNjcmVlblN1bW1hcnlfYmFjay5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlblN1bW1hcnlfc2FsdXRlX2FuY2hvcjogU2NyZWVuU3VtbWFyeV9zYWx1dGVfYW5jaG9yLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuU3VtbWFyeV90b3BpY19hbmNob3I6IFNjcmVlblN1bW1hcnlfdG9waWNfYW5jaG9yLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuU3VtbWFyeV9kYXRlX2FuY2hvcjogU2NyZWVuU3VtbWFyeV9kYXRlX2FuY2hvci5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlblN1bW1hcnlfYmFja2dyb3VuZDogU2NyZWVuU3VtbWFyeV9iYWNrZ3JvdW5kLmNvcHkoKVxuXG4gICAgICAgIENhc2luZy5hdXRvUG9zaXRpb24oQCwgQGNvbXBzLlNjcmVlblN1bW1hcnlfYmFja2dyb3VuZCwgQGNvbXBzKVxuXG5cbiAgICB3aXJpbmdfYmFjazogQ2FzaW5nLmludm9rZU9uY2UgKGhhbmRsZUJhY2tUYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5TdW1tYXJ5X2JhY2sub25UYXAgPT5cbiAgICAgICAgICAgIGhhbmRsZUJhY2tUYXAudmFsdWUoKVxuXG4gICAgd2lyaW5nX3VzZXJfbmFtZTogKHVzZXJOYW1lKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuU3VtbWFyeV9zYWx1dGU/LmRlc3Ryb3koKVxuICAgICAgICBAY29tcHMuU2NyZWVuU3VtbWFyeV9zYWx1dGUgPSBDYXNpbmcuc2l6ZVBvc2l0aW9uQXBwbHkgQGNvbXBzLlNjcmVlblN1bW1hcnlfc2FsdXRlX2FuY2hvciwgbmV3IFRleHRMYXllclxuICAgICAgICAgICAgdGV4dDogXCJUaGF0J3MgZ3JlYXQsICN7aWYgdXNlck5hbWUudmFsdWUgIT0gXCJcIiB0aGVuIHVzZXJOYW1lLnZhbHVlIGVsc2UgXCJBbm5vbnltb3VzXCJ9IVwiXG4gICAgICAgICAgICB0ZXh0QWxpZ246IFwibGVmdFwiXG5cbiAgICB3aXJpbmdfdXNlcl9uYW1lOiAodXNlck5hbWUpIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5TdW1tYXJ5X3NhbHV0ZT8uZGVzdHJveSgpXG4gICAgICAgIEBjb21wcy5TY3JlZW5TdW1tYXJ5X3NhbHV0ZSA9IENhc2luZy5zaXplUG9zaXRpb25BcHBseSBAY29tcHMuU2NyZWVuU3VtbWFyeV9zYWx1dGVfYW5jaG9yLCBuZXcgVGV4dExheWVyXG4gICAgICAgICAgICB0ZXh0OiBcIlRoYXQncyBncmVhdCwgI3tpZiB1c2VyTmFtZS52YWx1ZSAhPSBcIlwiIHRoZW4gdXNlck5hbWUudmFsdWUgZWxzZSBcIkFubm9ueW1vdXNcIn0hXCJcbiAgICAgICAgICAgIHRleHRBbGlnbjogXCJsZWZ0XCJcblxuICAgIHdpcmluZ190b3BpY19jaG9zZW46ICh0b3BpY0Nob3NlbikgLT5cbiAgICAgICAgQGNvbXBzLlNjcmVlblN1bW1hcnlfdG9waWM/LmRlc3Ryb3koKVxuICAgICAgICBAY29tcHMuU2NyZWVuU3VtbWFyeV90b3BpYyA9IENhc2luZy5zaXplUG9zaXRpb25BcHBseSBAY29tcHMuU2NyZWVuU3VtbWFyeV90b3BpY19hbmNob3IsIG5ldyBUZXh0TGF5ZXJcbiAgICAgICAgICAgIHRleHQ6IFwiWW91J3JlIHNldCB0byBsZWFybiBDYXNpbmcgdG9waWMgXFxcIiN7Xy51cHBlckZpcnN0IHRvcGljQ2hvc2VuLnZhbHVlfVxcXCJcIlxuICAgICAgICAgICAgdGV4dEFsaWduOiBcImxlZnRcIlxuXG4gICAgd2lyaW5nX2RhdGVfc2VsZWN0ZWQ6IChkYXRlU2VsZWN0ZWQpIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5TdW1tYXJ5X2RhdGU/LmRlc3Ryb3koKVxuICAgICAgICBkID0gZGF0ZVNlbGVjdGVkLnZhbHVlXG4gICAgICAgIGYgPSBGcm1yRGF0ZVBpY2tlclxuICAgICAgICBAY29tcHMuU2NyZWVuU3VtbWFyeV9kYXRlID0gQ2FzaW5nLnNpemVQb3NpdGlvbkFwcGx5IEBjb21wcy5TY3JlZW5TdW1tYXJ5X2RhdGVfYW5jaG9yLCBuZXcgVGV4dExheWVyXG4gICAgICAgICAgICB0ZXh0OiAoXG4gICAgICAgICAgICAgICAgaWYgZFxuICAgICAgICAgICAgICAgIHRoZW4gXCJvbiAje2YubW9udGhOYW1lc1tkLmdldE1vbnRoKCldfSwgI3tkLmdldERhdGUoKX1cIlxuICAgICAgICAgICAgICAgIGVsc2UgXCJvbiBhbiB1bnNwZWNpZmllZCBkYXRlIVwiXG4gICAgICAgICAgICApXG4gICAgICAgICAgICB0ZXh0QWxpZ246IFwibGVmdFwiIiwiQ2FzaW5nID0gcmVxdWlyZSBcIkNhc2luZ1wiXG5Gcm1yVGV4dElucHV0ID0gcmVxdWlyZSBcIkZybXJUZXh0SW5wdXRcIlxuXG5jbGFzcyBleHBvcnRzLlNjcmVlbk5hbWUgZXh0ZW5kcyBMYXllclxuICAgIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICAgICBfLmRlZmF1bHRzIG9wdGlvbnMsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG51bGxcbiAgICAgICAgICAgIHg6IChTY3JlZW4ud2lkdGggLSBTY3JlZW5OYW1lX2JhY2tncm91bmQud2lkdGgpIC8gMlxuICAgICAgICAgICAgeTogKFNjcmVlbi5oZWlnaHQgLSBTY3JlZW5OYW1lX2JhY2tncm91bmQuaGVpZ2h0KSAvIDJcbiAgICAgICAgc3VwZXIgb3B0aW9uc1xuXG4gICAgICAgIEBjb21wcyA9XG4gICAgICAgICAgICBTY3JlZW5OYW1lX3NlbGVjdG9yOiBTY3JlZW5OYW1lX3NlbGVjdG9yLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuTmFtZV9uYW1lTGFiZWw6IFNjcmVlbk5hbWVfbmFtZUxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuTmFtZV9idG5MYWJlbDogU2NyZWVuTmFtZV9idG5MYWJlbC5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbk5hbWVfYnRuOiBTY3JlZW5OYW1lX2J0bi5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbk5hbWVfYmFjazogU2NyZWVuTmFtZV9iYWNrLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuTmFtZV9pbnB1dF9hbmNob3I6IFNjcmVlbk5hbWVfaW5wdXRfYW5jaG9yLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuTmFtZV9iYWNrZ3JvdW5kOiBTY3JlZW5OYW1lX2JhY2tncm91bmQuY29weSgpXG5cbiAgICAgICAgQ2FzaW5nLmF1dG9Qb3NpdGlvbihALCBAY29tcHMuU2NyZWVuTmFtZV9iYWNrZ3JvdW5kLCBAY29tcHMpXG5cbiAgICAgICAgIyBTdHlsZSBpbnB1dFxuICAgICAgICBAY29tcHMuU2NyZWVuTmFtZV9pbnB1dCA9IENhc2luZy5zaXplUG9zaXRpb25BcHBseSBAY29tcHMuU2NyZWVuTmFtZV9pbnB1dF9hbmNob3IsIG5ldyBGcm1yVGV4dElucHV0LkZybXJUZXh0SW5wdXRcbiAgICAgICAgICAgIGZvbnRGYW1pbHk6IFwiLWFwcGxlLXN5c3RlbVwiXG4gICAgICAgICAgICBmb250U2l6ZTogMjRcbiAgICAgICAgICAgIGZvbnRXZWlnaHQ6IDQwMFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IFwiUGxlYXNlIGVudGVyIHlvdXIgbmFtZS4uLlwiXG4gICAgICAgIEBjb21wcy5TY3JlZW5OYW1lX2lucHV0Lm9uRm9jdXMgLT5cbiAgICAgICAgICAgIEBzdHlsZS5ib3JkZXJSYWRpdXMgPSBcIjRweFwiXG4gICAgICAgICAgICBAc3R5bGUuYm9yZGVyQ29sb3IgPSBcIiMzQzQ0NERcIlxuICAgICAgICAgICAgQHN0eWxlLmJvcmRlciA9IFwiMXB4IHNvbGlkICMzQzQ0NERcIlxuICAgICAgICBAY29tcHMuU2NyZWVuTmFtZV9pbnB1dC5vblVuZm9jdXMgLT5cbiAgICAgICAgICAgIEBzdHlsZS5ib3JkZXJSYWRpdXMgPSBcIjRweFwiXG4gICAgICAgICAgICBAc3R5bGUuYm9yZGVyQ29sb3IgPSBcIiNDOUNDRDBcIlxuICAgICAgICBAY29tcHMuU2NyZWVuTmFtZV9pbnB1dC5mb2N1cygpXG5cblxuXG4gICAgd2lyaW5nX2J0bjogQ2FzaW5nLmludm9rZU9uY2UgKGhhbmRsZUJ0blRhcCkgLT5cbiAgICAgICAgQGNvbXBzLlNjcmVlbk5hbWVfYnRuLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCdG5UYXAudmFsdWUoKVxuXG4gICAgd2lyaW5nX2JhY2s6IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCYWNrVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuTmFtZV9iYWNrLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCYWNrVGFwLnZhbHVlKClcblxuICAgIHdpcmluZ191c2VyX25hbWU6IENhc2luZy5pbnZva2VPbmNlICh1c2VyTmFtZSkgLT5cbiAgICAgICAgIyBJbnB1dCBoYW5kbGluZ1xuICAgICAgICBAY29tcHMuU2NyZWVuTmFtZV9pbnB1dC5pbnB1dC5hZGRFdmVudExpc3RlbmVyPyAna2V5dXAnLCA9PlxuICAgICAgICAgICAgdXNlck5hbWUudmFsdWUgPSBAY29tcHMuU2NyZWVuTmFtZV9pbnB1dC52YWx1ZVxuIiwiQ2FzaW5nID0gcmVxdWlyZSBcIkNhc2luZ1wiXG5cbmNsYXNzIGV4cG9ydHMuU2NyZWVuQ2hvaWNlTW9kdWxlczQgZXh0ZW5kcyBMYXllclxuICAgIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICAgICBfLmRlZmF1bHRzIG9wdGlvbnMsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG51bGxcbiAgICAgICAgICAgIHg6IChTY3JlZW4ud2lkdGggLSBTY3JlZW5DaG9pY2VNb2R1bGVzNF9iYWNrZ3JvdW5kLndpZHRoKSAvIDJcbiAgICAgICAgICAgIHk6IChTY3JlZW4uaGVpZ2h0IC0gU2NyZWVuQ2hvaWNlTW9kdWxlczRfYmFja2dyb3VuZC5oZWlnaHQpIC8gMlxuICAgICAgICBzdXBlciBvcHRpb25zXG5cbiAgICAgICAgQGNvbXBzID1cbiAgICAgICAgICAgIFNjcmVlbkNob2ljZU1vZHVsZXM0X25hbWVMYWJlbDogU2NyZWVuQ2hvaWNlTW9kdWxlczRfbmFtZUxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlTW9kdWxlczRfc2VsZWN0b3I6IFNjcmVlbkNob2ljZU1vZHVsZXM0X3NlbGVjdG9yLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlTW9kdWxlczRfYnRuTGFiZWw6IFNjcmVlbkNob2ljZU1vZHVsZXM0X2J0bkxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlTW9kdWxlczRfYnRuOiBTY3JlZW5DaG9pY2VNb2R1bGVzNF9idG4uY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VNb2R1bGVzNF9iYWNrOiBTY3JlZW5DaG9pY2VNb2R1bGVzNF9iYWNrLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlTW9kdWxlczRfYmFja2dyb3VuZDogU2NyZWVuQ2hvaWNlTW9kdWxlczRfYmFja2dyb3VuZC5jb3B5KClcblxuICAgICAgICBDYXNpbmcuYXV0b1Bvc2l0aW9uKEAsIEBjb21wcy5TY3JlZW5DaG9pY2VNb2R1bGVzNF9iYWNrZ3JvdW5kLCBAY29tcHMpXG5cbiAgICB3aXJpbmdfYnRuOiBDYXNpbmcuaW52b2tlT25jZSAoaGFuZGxlQnRuVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuQ2hvaWNlTW9kdWxlczRfYnRuLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCdG5UYXAudmFsdWUoKVxuXG4gICAgd2lyaW5nX2JhY2s6IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCYWNrVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuQ2hvaWNlTW9kdWxlczRfYmFjay5vblRhcCA9PlxuICAgICAgICAgICAgaGFuZGxlQmFja1RhcC52YWx1ZSgpXG4iLCJDYXNpbmcgPSByZXF1aXJlIFwiQ2FzaW5nXCJcblxuY2xhc3MgZXhwb3J0cy5TY3JlZW5DaG9pY2VNb2R1bGVzMyBleHRlbmRzIExheWVyXG4gICAgY29uc3RydWN0b3I6IChvcHRpb25zID0ge30pIC0+XG4gICAgICAgIF8uZGVmYXVsdHMgb3B0aW9ucyxcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogbnVsbFxuICAgICAgICAgICAgeDogKFNjcmVlbi53aWR0aCAtIFNjcmVlbkNob2ljZU1vZHVsZXMzX2JhY2tncm91bmQud2lkdGgpIC8gMlxuICAgICAgICAgICAgeTogKFNjcmVlbi5oZWlnaHQgLSBTY3JlZW5DaG9pY2VNb2R1bGVzM19iYWNrZ3JvdW5kLmhlaWdodCkgLyAyXG4gICAgICAgIHN1cGVyIG9wdGlvbnNcblxuICAgICAgICBAY29tcHMgPVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlTW9kdWxlczNfbmFtZUxhYmVsOiBTY3JlZW5DaG9pY2VNb2R1bGVzM19uYW1lTGFiZWwuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VNb2R1bGVzM19zZWxlY3RvcjogU2NyZWVuQ2hvaWNlTW9kdWxlczNfc2VsZWN0b3IuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VNb2R1bGVzM19idG5MYWJlbDogU2NyZWVuQ2hvaWNlTW9kdWxlczNfYnRuTGFiZWwuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VNb2R1bGVzM19idG46IFNjcmVlbkNob2ljZU1vZHVsZXMzX2J0bi5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZU1vZHVsZXMzX2JhY2s6IFNjcmVlbkNob2ljZU1vZHVsZXMzX2JhY2suY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VNb2R1bGVzM19iYWNrZ3JvdW5kOiBTY3JlZW5DaG9pY2VNb2R1bGVzM19iYWNrZ3JvdW5kLmNvcHkoKVxuXG4gICAgICAgIENhc2luZy5hdXRvUG9zaXRpb24oQCwgQGNvbXBzLlNjcmVlbkNob2ljZU1vZHVsZXMzX2JhY2tncm91bmQsIEBjb21wcylcblxuICAgIHdpcmluZ19idG46IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCdG5UYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5DaG9pY2VNb2R1bGVzM19idG4ub25UYXAgPT5cbiAgICAgICAgICAgIGhhbmRsZUJ0blRhcC52YWx1ZSgpXG5cbiAgICB3aXJpbmdfYmFjazogQ2FzaW5nLmludm9rZU9uY2UgKGhhbmRsZUJhY2tUYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5DaG9pY2VNb2R1bGVzM19iYWNrLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCYWNrVGFwLnZhbHVlKClcbiIsIkNhc2luZyA9IHJlcXVpcmUgXCJDYXNpbmdcIlxuXG5jbGFzcyBleHBvcnRzLlNjcmVlbkNob2ljZU1vZHVsZXMyIGV4dGVuZHMgTGF5ZXJcbiAgICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICAgICAgXy5kZWZhdWx0cyBvcHRpb25zLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBudWxsXG4gICAgICAgICAgICB4OiAoU2NyZWVuLndpZHRoIC0gU2NyZWVuQ2hvaWNlTW9kdWxlczJfYmFja2dyb3VuZC53aWR0aCkgLyAyXG4gICAgICAgICAgICB5OiAoU2NyZWVuLmhlaWdodCAtIFNjcmVlbkNob2ljZU1vZHVsZXMyX2JhY2tncm91bmQuaGVpZ2h0KSAvIDJcbiAgICAgICAgc3VwZXIgb3B0aW9uc1xuXG4gICAgICAgIEBjb21wcyA9XG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VNb2R1bGVzMl9uYW1lTGFiZWw6IFNjcmVlbkNob2ljZU1vZHVsZXMyX25hbWVMYWJlbC5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZU1vZHVsZXMyX3NlbGVjdG9yOiBTY3JlZW5DaG9pY2VNb2R1bGVzMl9zZWxlY3Rvci5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZU1vZHVsZXMyX2J0bkxhYmVsOiBTY3JlZW5DaG9pY2VNb2R1bGVzMl9idG5MYWJlbC5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZU1vZHVsZXMyX2J0bjogU2NyZWVuQ2hvaWNlTW9kdWxlczJfYnRuLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlTW9kdWxlczJfYmFjazogU2NyZWVuQ2hvaWNlTW9kdWxlczJfYmFjay5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZU1vZHVsZXMyX2JhY2tncm91bmQ6IFNjcmVlbkNob2ljZU1vZHVsZXMyX2JhY2tncm91bmQuY29weSgpXG5cbiAgICAgICAgQ2FzaW5nLmF1dG9Qb3NpdGlvbihALCBAY29tcHMuU2NyZWVuQ2hvaWNlTW9kdWxlczJfYmFja2dyb3VuZCwgQGNvbXBzKVxuXG4gICAgd2lyaW5nX2J0bjogQ2FzaW5nLmludm9rZU9uY2UgKGhhbmRsZUJ0blRhcCkgLT5cbiAgICAgICAgQGNvbXBzLlNjcmVlbkNob2ljZU1vZHVsZXMyX2J0bi5vblRhcCA9PlxuICAgICAgICAgICAgaGFuZGxlQnRuVGFwLnZhbHVlKClcblxuICAgIHdpcmluZ19iYWNrOiBDYXNpbmcuaW52b2tlT25jZSAoaGFuZGxlQmFja1RhcCkgLT5cbiAgICAgICAgQGNvbXBzLlNjcmVlbkNob2ljZU1vZHVsZXMyX2JhY2sub25UYXAgPT5cbiAgICAgICAgICAgIGhhbmRsZUJhY2tUYXAudmFsdWUoKVxuIiwiQ2FzaW5nID0gcmVxdWlyZSBcIkNhc2luZ1wiXG5cbmNsYXNzIGV4cG9ydHMuU2NyZWVuQ2hvaWNlTW9kdWxlczEgZXh0ZW5kcyBMYXllclxuICAgIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICAgICBfLmRlZmF1bHRzIG9wdGlvbnMsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG51bGxcbiAgICAgICAgICAgIHg6IChTY3JlZW4ud2lkdGggLSBTY3JlZW5DaG9pY2VNb2R1bGVzMV9iYWNrZ3JvdW5kLndpZHRoKSAvIDJcbiAgICAgICAgICAgIHk6IChTY3JlZW4uaGVpZ2h0IC0gU2NyZWVuQ2hvaWNlTW9kdWxlczFfYmFja2dyb3VuZC5oZWlnaHQpIC8gMlxuICAgICAgICBzdXBlciBvcHRpb25zXG5cbiAgICAgICAgQGNvbXBzID1cbiAgICAgICAgICAgIFNjcmVlbkNob2ljZU1vZHVsZXMxX25hbWVMYWJlbDogU2NyZWVuQ2hvaWNlTW9kdWxlczFfbmFtZUxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlTW9kdWxlczFfc2VsZWN0b3I6IFNjcmVlbkNob2ljZU1vZHVsZXMxX3NlbGVjdG9yLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlTW9kdWxlczFfYnRuTGFiZWw6IFNjcmVlbkNob2ljZU1vZHVsZXMxX2J0bkxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlTW9kdWxlczFfYnRuOiBTY3JlZW5DaG9pY2VNb2R1bGVzMV9idG4uY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VNb2R1bGVzMV9iYWNrOiBTY3JlZW5DaG9pY2VNb2R1bGVzMV9iYWNrLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlTW9kdWxlczFfYmFja2dyb3VuZDogU2NyZWVuQ2hvaWNlTW9kdWxlczFfYmFja2dyb3VuZC5jb3B5KClcblxuICAgICAgICBDYXNpbmcuYXV0b1Bvc2l0aW9uKEAsIEBjb21wcy5TY3JlZW5DaG9pY2VNb2R1bGVzMV9iYWNrZ3JvdW5kLCBAY29tcHMpXG5cbiAgICB3aXJpbmdfYnRuOiBDYXNpbmcuaW52b2tlT25jZSAoaGFuZGxlQnRuVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuQ2hvaWNlTW9kdWxlczFfYnRuLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCdG5UYXAudmFsdWUoKVxuXG4gICAgd2lyaW5nX2JhY2s6IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCYWNrVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuQ2hvaWNlTW9kdWxlczFfYmFjay5vblRhcCA9PlxuICAgICAgICAgICAgaGFuZGxlQmFja1RhcC52YWx1ZSgpXG4iLCJDYXNpbmcgPSByZXF1aXJlIFwiQ2FzaW5nXCJcblxuY2xhc3MgZXhwb3J0cy5TY3JlZW5DaG9pY2VGZWF0dXJlczIgZXh0ZW5kcyBMYXllclxuICAgIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICAgICBfLmRlZmF1bHRzIG9wdGlvbnMsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG51bGxcbiAgICAgICAgICAgIHg6IChTY3JlZW4ud2lkdGggLSBTY3JlZW5DaG9pY2VGZWF0dXJlczJfYmFja2dyb3VuZC53aWR0aCkgLyAyXG4gICAgICAgICAgICB5OiAoU2NyZWVuLmhlaWdodCAtIFNjcmVlbkNob2ljZUZlYXR1cmVzMl9iYWNrZ3JvdW5kLmhlaWdodCkgLyAyXG4gICAgICAgIHN1cGVyIG9wdGlvbnNcblxuICAgICAgICBAY29tcHMgPVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRmVhdHVyZXMyX25hbWVMYWJlbDogU2NyZWVuQ2hvaWNlRmVhdHVyZXMyX25hbWVMYWJlbC5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUZlYXR1cmVzMl9zZWxlY3RvcjogU2NyZWVuQ2hvaWNlRmVhdHVyZXMyX3NlbGVjdG9yLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRmVhdHVyZXMyX2J0bkxhYmVsOiBTY3JlZW5DaG9pY2VGZWF0dXJlczJfYnRuTGFiZWwuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VGZWF0dXJlczJfYnRuOiBTY3JlZW5DaG9pY2VGZWF0dXJlczJfYnRuLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRmVhdHVyZXMyX2JhY2s6IFNjcmVlbkNob2ljZUZlYXR1cmVzMl9iYWNrLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRmVhdHVyZXMyX2JhY2tncm91bmQ6IFNjcmVlbkNob2ljZUZlYXR1cmVzMl9iYWNrZ3JvdW5kLmNvcHkoKVxuXG4gICAgICAgIENhc2luZy5hdXRvUG9zaXRpb24oQCwgQGNvbXBzLlNjcmVlbkNob2ljZUZlYXR1cmVzMl9iYWNrZ3JvdW5kLCBAY29tcHMpXG5cbiAgICB3aXJpbmdfYnRuOiBDYXNpbmcuaW52b2tlT25jZSAoaGFuZGxlQnRuVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuQ2hvaWNlRmVhdHVyZXMyX2J0bi5vblRhcCA9PlxuICAgICAgICAgICAgaGFuZGxlQnRuVGFwLnZhbHVlKClcblxuICAgIHdpcmluZ19iYWNrOiBDYXNpbmcuaW52b2tlT25jZSAoaGFuZGxlQmFja1RhcCkgLT5cbiAgICAgICAgQGNvbXBzLlNjcmVlbkNob2ljZUZlYXR1cmVzMl9iYWNrLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCYWNrVGFwLnZhbHVlKClcbiIsIkNhc2luZyA9IHJlcXVpcmUgXCJDYXNpbmdcIlxuXG5jbGFzcyBleHBvcnRzLlNjcmVlbkNob2ljZUZlYXR1cmVzMSBleHRlbmRzIExheWVyXG4gICAgY29uc3RydWN0b3I6IChvcHRpb25zID0ge30pIC0+XG4gICAgICAgIF8uZGVmYXVsdHMgb3B0aW9ucyxcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogbnVsbFxuICAgICAgICAgICAgeDogKFNjcmVlbi53aWR0aCAtIFNjcmVlbkNob2ljZUZlYXR1cmVzMV9iYWNrZ3JvdW5kLndpZHRoKSAvIDJcbiAgICAgICAgICAgIHk6IChTY3JlZW4uaGVpZ2h0IC0gU2NyZWVuQ2hvaWNlRmVhdHVyZXMxX2JhY2tncm91bmQuaGVpZ2h0KSAvIDJcbiAgICAgICAgc3VwZXIgb3B0aW9uc1xuXG4gICAgICAgIEBjb21wcyA9XG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VGZWF0dXJlczFfbmFtZUxhYmVsOiBTY3JlZW5DaG9pY2VGZWF0dXJlczFfbmFtZUxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRmVhdHVyZXMxX3NlbGVjdG9yOiBTY3JlZW5DaG9pY2VGZWF0dXJlczFfc2VsZWN0b3IuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VGZWF0dXJlczFfYnRuTGFiZWw6IFNjcmVlbkNob2ljZUZlYXR1cmVzMV9idG5MYWJlbC5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUZlYXR1cmVzMV9idG46IFNjcmVlbkNob2ljZUZlYXR1cmVzMV9idG4uY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VGZWF0dXJlczFfYmFjazogU2NyZWVuQ2hvaWNlRmVhdHVyZXMxX2JhY2suY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VGZWF0dXJlczFfYmFja2dyb3VuZDogU2NyZWVuQ2hvaWNlRmVhdHVyZXMxX2JhY2tncm91bmQuY29weSgpXG5cbiAgICAgICAgQ2FzaW5nLmF1dG9Qb3NpdGlvbihALCBAY29tcHMuU2NyZWVuQ2hvaWNlRmVhdHVyZXMxX2JhY2tncm91bmQsIEBjb21wcylcblxuICAgIHdpcmluZ19idG46IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCdG5UYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5DaG9pY2VGZWF0dXJlczFfYnRuLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCdG5UYXAudmFsdWUoKVxuXG4gICAgd2lyaW5nX2JhY2s6IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCYWNrVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuQ2hvaWNlRmVhdHVyZXMxX2JhY2sub25UYXAgPT5cbiAgICAgICAgICAgIGhhbmRsZUJhY2tUYXAudmFsdWUoKVxuIiwiQ2FzaW5nID0gcmVxdWlyZSBcIkNhc2luZ1wiXG5cbmNsYXNzIGV4cG9ydHMuU2NyZWVuQ2hvaWNlRXNzZW50aWFsczQgZXh0ZW5kcyBMYXllclxuICAgIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICAgICBfLmRlZmF1bHRzIG9wdGlvbnMsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG51bGxcbiAgICAgICAgICAgIHg6IChTY3JlZW4ud2lkdGggLSBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzNF9iYWNrZ3JvdW5kLndpZHRoKSAvIDJcbiAgICAgICAgICAgIHk6IChTY3JlZW4uaGVpZ2h0IC0gU2NyZWVuQ2hvaWNlRXNzZW50aWFsczRfYmFja2dyb3VuZC5oZWlnaHQpIC8gMlxuICAgICAgICBzdXBlciBvcHRpb25zXG5cbiAgICAgICAgQGNvbXBzID1cbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUVzc2VudGlhbHM0X25hbWVMYWJlbDogU2NyZWVuQ2hvaWNlRXNzZW50aWFsczRfbmFtZUxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRXNzZW50aWFsczRfc2VsZWN0b3I6IFNjcmVlbkNob2ljZUVzc2VudGlhbHM0X3NlbGVjdG9yLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRXNzZW50aWFsczRfYnRuTGFiZWw6IFNjcmVlbkNob2ljZUVzc2VudGlhbHM0X2J0bkxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRXNzZW50aWFsczRfYnRuOiBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzNF9idG4uY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzNF9iYWNrOiBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzNF9iYWNrLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRXNzZW50aWFsczRfYmFja2dyb3VuZDogU2NyZWVuQ2hvaWNlRXNzZW50aWFsczRfYmFja2dyb3VuZC5jb3B5KClcblxuICAgICAgICBDYXNpbmcuYXV0b1Bvc2l0aW9uKEAsIEBjb21wcy5TY3JlZW5DaG9pY2VFc3NlbnRpYWxzNF9iYWNrZ3JvdW5kLCBAY29tcHMpXG5cbiAgICB3aXJpbmdfYnRuOiBDYXNpbmcuaW52b2tlT25jZSAoaGFuZGxlQnRuVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuQ2hvaWNlRXNzZW50aWFsczRfYnRuLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCdG5UYXAudmFsdWUoKVxuXG4gICAgd2lyaW5nX2JhY2s6IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCYWNrVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuQ2hvaWNlRXNzZW50aWFsczRfYmFjay5vblRhcCA9PlxuICAgICAgICAgICAgaGFuZGxlQmFja1RhcC52YWx1ZSgpXG4iLCJDYXNpbmcgPSByZXF1aXJlIFwiQ2FzaW5nXCJcblxuY2xhc3MgZXhwb3J0cy5TY3JlZW5DaG9pY2VFc3NlbnRpYWxzMyBleHRlbmRzIExheWVyXG4gICAgY29uc3RydWN0b3I6IChvcHRpb25zID0ge30pIC0+XG4gICAgICAgIF8uZGVmYXVsdHMgb3B0aW9ucyxcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogbnVsbFxuICAgICAgICAgICAgeDogKFNjcmVlbi53aWR0aCAtIFNjcmVlbkNob2ljZUVzc2VudGlhbHMzX2JhY2tncm91bmQud2lkdGgpIC8gMlxuICAgICAgICAgICAgeTogKFNjcmVlbi5oZWlnaHQgLSBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzM19iYWNrZ3JvdW5kLmhlaWdodCkgLyAyXG4gICAgICAgIHN1cGVyIG9wdGlvbnNcblxuICAgICAgICBAY29tcHMgPVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRXNzZW50aWFsczNfbmFtZUxhYmVsOiBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzM19uYW1lTGFiZWwuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzM19zZWxlY3RvcjogU2NyZWVuQ2hvaWNlRXNzZW50aWFsczNfc2VsZWN0b3IuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzM19idG5MYWJlbDogU2NyZWVuQ2hvaWNlRXNzZW50aWFsczNfYnRuTGFiZWwuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzM19idG46IFNjcmVlbkNob2ljZUVzc2VudGlhbHMzX2J0bi5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUVzc2VudGlhbHMzX2JhY2s6IFNjcmVlbkNob2ljZUVzc2VudGlhbHMzX2JhY2suY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzM19iYWNrZ3JvdW5kOiBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzM19iYWNrZ3JvdW5kLmNvcHkoKVxuXG4gICAgICAgIENhc2luZy5hdXRvUG9zaXRpb24oQCwgQGNvbXBzLlNjcmVlbkNob2ljZUVzc2VudGlhbHMzX2JhY2tncm91bmQsIEBjb21wcylcblxuICAgIHdpcmluZ19idG46IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCdG5UYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5DaG9pY2VFc3NlbnRpYWxzM19idG4ub25UYXAgPT5cbiAgICAgICAgICAgIGhhbmRsZUJ0blRhcC52YWx1ZSgpXG5cbiAgICB3aXJpbmdfYmFjazogQ2FzaW5nLmludm9rZU9uY2UgKGhhbmRsZUJhY2tUYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5DaG9pY2VFc3NlbnRpYWxzM19iYWNrLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCYWNrVGFwLnZhbHVlKClcbiIsIkNhc2luZyA9IHJlcXVpcmUgXCJDYXNpbmdcIlxuXG5jbGFzcyBleHBvcnRzLlNjcmVlbkNob2ljZUVzc2VudGlhbHMyIGV4dGVuZHMgTGF5ZXJcbiAgICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICAgICAgXy5kZWZhdWx0cyBvcHRpb25zLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBudWxsXG4gICAgICAgICAgICB4OiAoU2NyZWVuLndpZHRoIC0gU2NyZWVuQ2hvaWNlRXNzZW50aWFsczJfYmFja2dyb3VuZC53aWR0aCkgLyAyXG4gICAgICAgICAgICB5OiAoU2NyZWVuLmhlaWdodCAtIFNjcmVlbkNob2ljZUVzc2VudGlhbHMyX2JhY2tncm91bmQuaGVpZ2h0KSAvIDJcbiAgICAgICAgc3VwZXIgb3B0aW9uc1xuXG4gICAgICAgIEBjb21wcyA9XG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzMl9uYW1lTGFiZWw6IFNjcmVlbkNob2ljZUVzc2VudGlhbHMyX25hbWVMYWJlbC5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUVzc2VudGlhbHMyX3NlbGVjdG9yOiBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzMl9zZWxlY3Rvci5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUVzc2VudGlhbHMyX2J0bkxhYmVsOiBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzMl9idG5MYWJlbC5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUVzc2VudGlhbHMyX2J0bjogU2NyZWVuQ2hvaWNlRXNzZW50aWFsczJfYnRuLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRXNzZW50aWFsczJfYmFjazogU2NyZWVuQ2hvaWNlRXNzZW50aWFsczJfYmFjay5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUVzc2VudGlhbHMyX2JhY2tncm91bmQ6IFNjcmVlbkNob2ljZUVzc2VudGlhbHMyX2JhY2tncm91bmQuY29weSgpXG5cbiAgICAgICAgQ2FzaW5nLmF1dG9Qb3NpdGlvbihALCBAY29tcHMuU2NyZWVuQ2hvaWNlRXNzZW50aWFsczJfYmFja2dyb3VuZCwgQGNvbXBzKVxuXG4gICAgd2lyaW5nX2J0bjogQ2FzaW5nLmludm9rZU9uY2UgKGhhbmRsZUJ0blRhcCkgLT5cbiAgICAgICAgQGNvbXBzLlNjcmVlbkNob2ljZUVzc2VudGlhbHMyX2J0bi5vblRhcCA9PlxuICAgICAgICAgICAgaGFuZGxlQnRuVGFwLnZhbHVlKClcblxuICAgIHdpcmluZ19iYWNrOiBDYXNpbmcuaW52b2tlT25jZSAoaGFuZGxlQmFja1RhcCkgLT5cbiAgICAgICAgQGNvbXBzLlNjcmVlbkNob2ljZUVzc2VudGlhbHMyX2JhY2sub25UYXAgPT5cbiAgICAgICAgICAgIGhhbmRsZUJhY2tUYXAudmFsdWUoKVxuIiwiQ2FzaW5nID0gcmVxdWlyZSBcIkNhc2luZ1wiXG5cbmNsYXNzIGV4cG9ydHMuU2NyZWVuQ2hvaWNlRXNzZW50aWFsczEgZXh0ZW5kcyBMYXllclxuICAgIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICAgICBfLmRlZmF1bHRzIG9wdGlvbnMsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG51bGxcbiAgICAgICAgICAgIHg6IChTY3JlZW4ud2lkdGggLSBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzMV9iYWNrZ3JvdW5kLndpZHRoKSAvIDJcbiAgICAgICAgICAgIHk6IChTY3JlZW4uaGVpZ2h0IC0gU2NyZWVuQ2hvaWNlRXNzZW50aWFsczFfYmFja2dyb3VuZC5oZWlnaHQpIC8gMlxuICAgICAgICBzdXBlciBvcHRpb25zXG5cbiAgICAgICAgQGNvbXBzID1cbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUVzc2VudGlhbHMxX25hbWVMYWJlbDogU2NyZWVuQ2hvaWNlRXNzZW50aWFsczFfbmFtZUxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRXNzZW50aWFsczFfc2VsZWN0b3I6IFNjcmVlbkNob2ljZUVzc2VudGlhbHMxX3NlbGVjdG9yLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRXNzZW50aWFsczFfYnRuTGFiZWw6IFNjcmVlbkNob2ljZUVzc2VudGlhbHMxX2J0bkxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRXNzZW50aWFsczFfYnRuOiBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzMV9idG4uY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzMV9iYWNrOiBTY3JlZW5DaG9pY2VFc3NlbnRpYWxzMV9iYWNrLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRXNzZW50aWFsczFfYmFja2dyb3VuZDogU2NyZWVuQ2hvaWNlRXNzZW50aWFsczFfYmFja2dyb3VuZC5jb3B5KClcblxuICAgICAgICBDYXNpbmcuYXV0b1Bvc2l0aW9uKEAsIEBjb21wcy5TY3JlZW5DaG9pY2VFc3NlbnRpYWxzMV9iYWNrZ3JvdW5kLCBAY29tcHMpXG5cbiAgICB3aXJpbmdfYnRuOiBDYXNpbmcuaW52b2tlT25jZSAoaGFuZGxlQnRuVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuQ2hvaWNlRXNzZW50aWFsczFfYnRuLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCdG5UYXAudmFsdWUoKVxuXG4gICAgd2lyaW5nX2JhY2s6IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCYWNrVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuQ2hvaWNlRXNzZW50aWFsczFfYmFjay5vblRhcCA9PlxuICAgICAgICAgICAgaGFuZGxlQmFja1RhcC52YWx1ZSgpXG4iLCJDYXNpbmcgPSByZXF1aXJlIFwiQ2FzaW5nXCJcblxuY2xhc3MgZXhwb3J0cy5TY3JlZW5DaG9pY2VEZXNpZ24zIGV4dGVuZHMgTGF5ZXJcbiAgICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICAgICAgXy5kZWZhdWx0cyBvcHRpb25zLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBudWxsXG4gICAgICAgICAgICB4OiAoU2NyZWVuLndpZHRoIC0gU2NyZWVuQ2hvaWNlRGVzaWduM19iYWNrZ3JvdW5kLndpZHRoKSAvIDJcbiAgICAgICAgICAgIHk6IChTY3JlZW4uaGVpZ2h0IC0gU2NyZWVuQ2hvaWNlRGVzaWduM19iYWNrZ3JvdW5kLmhlaWdodCkgLyAyXG4gICAgICAgIHN1cGVyIG9wdGlvbnNcblxuICAgICAgICBAY29tcHMgPVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRGVzaWduM19uYW1lTGFiZWw6IFNjcmVlbkNob2ljZURlc2lnbjNfbmFtZUxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRGVzaWduM19zZWxlY3RvcjogU2NyZWVuQ2hvaWNlRGVzaWduM19zZWxlY3Rvci5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZURlc2lnbjNfYnRuTGFiZWw6IFNjcmVlbkNob2ljZURlc2lnbjNfYnRuTGFiZWwuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VEZXNpZ24zX2J0bjogU2NyZWVuQ2hvaWNlRGVzaWduM19idG4uY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VEZXNpZ24zX2JhY2s6IFNjcmVlbkNob2ljZURlc2lnbjNfYmFjay5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZURlc2lnbjNfYmFja2dyb3VuZDogU2NyZWVuQ2hvaWNlRGVzaWduM19iYWNrZ3JvdW5kLmNvcHkoKVxuXG4gICAgICAgIENhc2luZy5hdXRvUG9zaXRpb24oQCwgQGNvbXBzLlNjcmVlbkNob2ljZURlc2lnbjNfYmFja2dyb3VuZCwgQGNvbXBzKVxuXG4gICAgd2lyaW5nX2J0bjogQ2FzaW5nLmludm9rZU9uY2UgKGhhbmRsZUJ0blRhcCkgLT5cbiAgICAgICAgQGNvbXBzLlNjcmVlbkNob2ljZURlc2lnbjNfYnRuLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCdG5UYXAudmFsdWUoKVxuXG4gICAgd2lyaW5nX2JhY2s6IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCYWNrVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuQ2hvaWNlRGVzaWduM19iYWNrLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCYWNrVGFwLnZhbHVlKClcbiIsIkNhc2luZyA9IHJlcXVpcmUgXCJDYXNpbmdcIlxuXG5jbGFzcyBleHBvcnRzLlNjcmVlbkNob2ljZURlc2lnbjIgZXh0ZW5kcyBMYXllclxuICAgIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICAgICBfLmRlZmF1bHRzIG9wdGlvbnMsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG51bGxcbiAgICAgICAgICAgIHg6IChTY3JlZW4ud2lkdGggLSBTY3JlZW5DaG9pY2VEZXNpZ24yX2JhY2tncm91bmQud2lkdGgpIC8gMlxuICAgICAgICAgICAgeTogKFNjcmVlbi5oZWlnaHQgLSBTY3JlZW5DaG9pY2VEZXNpZ24yX2JhY2tncm91bmQuaGVpZ2h0KSAvIDJcbiAgICAgICAgc3VwZXIgb3B0aW9uc1xuXG4gICAgICAgIEBjb21wcyA9XG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VEZXNpZ24yX25hbWVMYWJlbDogU2NyZWVuQ2hvaWNlRGVzaWduMl9uYW1lTGFiZWwuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VEZXNpZ24yX3NlbGVjdG9yOiBTY3JlZW5DaG9pY2VEZXNpZ24yX3NlbGVjdG9yLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRGVzaWduMl9idG5MYWJlbDogU2NyZWVuQ2hvaWNlRGVzaWduMl9idG5MYWJlbC5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZURlc2lnbjJfYnRuOiBTY3JlZW5DaG9pY2VEZXNpZ24yX2J0bi5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZURlc2lnbjJfYmFjazogU2NyZWVuQ2hvaWNlRGVzaWduMl9iYWNrLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRGVzaWduMl9iYWNrZ3JvdW5kOiBTY3JlZW5DaG9pY2VEZXNpZ24yX2JhY2tncm91bmQuY29weSgpXG5cbiAgICAgICAgQ2FzaW5nLmF1dG9Qb3NpdGlvbihALCBAY29tcHMuU2NyZWVuQ2hvaWNlRGVzaWduMl9iYWNrZ3JvdW5kLCBAY29tcHMpXG5cbiAgICB3aXJpbmdfYnRuOiBDYXNpbmcuaW52b2tlT25jZSAoaGFuZGxlQnRuVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuQ2hvaWNlRGVzaWduMl9idG4ub25UYXAgPT5cbiAgICAgICAgICAgIGhhbmRsZUJ0blRhcC52YWx1ZSgpXG5cbiAgICB3aXJpbmdfYmFjazogQ2FzaW5nLmludm9rZU9uY2UgKGhhbmRsZUJhY2tUYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5DaG9pY2VEZXNpZ24yX2JhY2sub25UYXAgPT5cbiAgICAgICAgICAgIGhhbmRsZUJhY2tUYXAudmFsdWUoKVxuIiwiQ2FzaW5nID0gcmVxdWlyZSBcIkNhc2luZ1wiXG5cbmNsYXNzIGV4cG9ydHMuU2NyZWVuQ2hvaWNlRGVzaWduMSBleHRlbmRzIExheWVyXG4gICAgY29uc3RydWN0b3I6IChvcHRpb25zID0ge30pIC0+XG4gICAgICAgIF8uZGVmYXVsdHMgb3B0aW9ucyxcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogbnVsbFxuICAgICAgICAgICAgeDogKFNjcmVlbi53aWR0aCAtIFNjcmVlbkNob2ljZURlc2lnbjFfYmFja2dyb3VuZC53aWR0aCkgLyAyXG4gICAgICAgICAgICB5OiAoU2NyZWVuLmhlaWdodCAtIFNjcmVlbkNob2ljZURlc2lnbjFfYmFja2dyb3VuZC5oZWlnaHQpIC8gMlxuICAgICAgICBzdXBlciBvcHRpb25zXG5cbiAgICAgICAgQGNvbXBzID1cbiAgICAgICAgICAgIFNjcmVlbkNob2ljZURlc2lnbjFfbmFtZUxhYmVsOiBTY3JlZW5DaG9pY2VEZXNpZ24xX25hbWVMYWJlbC5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZURlc2lnbjFfc2VsZWN0b3I6IFNjcmVlbkNob2ljZURlc2lnbjFfc2VsZWN0b3IuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VEZXNpZ24xX2J0bkxhYmVsOiBTY3JlZW5DaG9pY2VEZXNpZ24xX2J0bkxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRGVzaWduMV9idG46IFNjcmVlbkNob2ljZURlc2lnbjFfYnRuLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlRGVzaWduMV9iYWNrOiBTY3JlZW5DaG9pY2VEZXNpZ24xX2JhY2suY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VEZXNpZ24xX2JhY2tncm91bmQ6IFNjcmVlbkNob2ljZURlc2lnbjFfYmFja2dyb3VuZC5jb3B5KClcblxuICAgICAgICBDYXNpbmcuYXV0b1Bvc2l0aW9uKEAsIEBjb21wcy5TY3JlZW5DaG9pY2VEZXNpZ24xX2JhY2tncm91bmQsIEBjb21wcylcblxuICAgIHdpcmluZ19idG46IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCdG5UYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5DaG9pY2VEZXNpZ24xX2J0bi5vblRhcCA9PlxuICAgICAgICAgICAgaGFuZGxlQnRuVGFwLnZhbHVlKClcblxuICAgIHdpcmluZ19iYWNrOiBDYXNpbmcuaW52b2tlT25jZSAoaGFuZGxlQmFja1RhcCkgLT5cbiAgICAgICAgQGNvbXBzLlNjcmVlbkNob2ljZURlc2lnbjFfYmFjay5vblRhcCA9PlxuICAgICAgICAgICAgaGFuZGxlQmFja1RhcC52YWx1ZSgpXG4iLCJDYXNpbmcgPSByZXF1aXJlIFwiQ2FzaW5nXCJcblxuY2xhc3MgZXhwb3J0cy5TY3JlZW5DaG9pY2VDb21wb25lbnRzNCBleHRlbmRzIExheWVyXG4gICAgY29uc3RydWN0b3I6IChvcHRpb25zID0ge30pIC0+XG4gICAgICAgIF8uZGVmYXVsdHMgb3B0aW9ucyxcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogbnVsbFxuICAgICAgICAgICAgeDogKFNjcmVlbi53aWR0aCAtIFNjcmVlbkNob2ljZUNvbXBvbmVudHM0X2JhY2tncm91bmQud2lkdGgpIC8gMlxuICAgICAgICAgICAgeTogKFNjcmVlbi5oZWlnaHQgLSBTY3JlZW5DaG9pY2VDb21wb25lbnRzNF9iYWNrZ3JvdW5kLmhlaWdodCkgLyAyXG4gICAgICAgIHN1cGVyIG9wdGlvbnNcblxuICAgICAgICBAY29tcHMgPVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlQ29tcG9uZW50czRfbmFtZUxhYmVsOiBTY3JlZW5DaG9pY2VDb21wb25lbnRzNF9uYW1lTGFiZWwuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VDb21wb25lbnRzNF9zZWxlY3RvcjogU2NyZWVuQ2hvaWNlQ29tcG9uZW50czRfc2VsZWN0b3IuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VDb21wb25lbnRzNF9idG5MYWJlbDogU2NyZWVuQ2hvaWNlQ29tcG9uZW50czRfYnRuTGFiZWwuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VDb21wb25lbnRzNF9idG46IFNjcmVlbkNob2ljZUNvbXBvbmVudHM0X2J0bi5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUNvbXBvbmVudHM0X2JhY2s6IFNjcmVlbkNob2ljZUNvbXBvbmVudHM0X2JhY2suY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VDb21wb25lbnRzNF9iYWNrZ3JvdW5kOiBTY3JlZW5DaG9pY2VDb21wb25lbnRzNF9iYWNrZ3JvdW5kLmNvcHkoKVxuXG4gICAgICAgIENhc2luZy5hdXRvUG9zaXRpb24oQCwgQGNvbXBzLlNjcmVlbkNob2ljZUNvbXBvbmVudHM0X2JhY2tncm91bmQsIEBjb21wcylcblxuICAgIHdpcmluZ19idG46IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCdG5UYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5DaG9pY2VDb21wb25lbnRzNF9idG4ub25UYXAgPT5cbiAgICAgICAgICAgIGhhbmRsZUJ0blRhcC52YWx1ZSgpXG5cbiAgICB3aXJpbmdfYmFjazogQ2FzaW5nLmludm9rZU9uY2UgKGhhbmRsZUJhY2tUYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5DaG9pY2VDb21wb25lbnRzNF9iYWNrLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCYWNrVGFwLnZhbHVlKClcbiIsIkNhc2luZyA9IHJlcXVpcmUgXCJDYXNpbmdcIlxuXG5jbGFzcyBleHBvcnRzLlNjcmVlbkNob2ljZUNvbXBvbmVudHMzIGV4dGVuZHMgTGF5ZXJcbiAgICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICAgICAgXy5kZWZhdWx0cyBvcHRpb25zLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBudWxsXG4gICAgICAgICAgICB4OiAoU2NyZWVuLndpZHRoIC0gU2NyZWVuQ2hvaWNlQ29tcG9uZW50czNfYmFja2dyb3VuZC53aWR0aCkgLyAyXG4gICAgICAgICAgICB5OiAoU2NyZWVuLmhlaWdodCAtIFNjcmVlbkNob2ljZUNvbXBvbmVudHMzX2JhY2tncm91bmQuaGVpZ2h0KSAvIDJcbiAgICAgICAgc3VwZXIgb3B0aW9uc1xuXG4gICAgICAgIEBjb21wcyA9XG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VDb21wb25lbnRzM19uYW1lTGFiZWw6IFNjcmVlbkNob2ljZUNvbXBvbmVudHMzX25hbWVMYWJlbC5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUNvbXBvbmVudHMzX3NlbGVjdG9yOiBTY3JlZW5DaG9pY2VDb21wb25lbnRzM19zZWxlY3Rvci5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUNvbXBvbmVudHMzX2J0bkxhYmVsOiBTY3JlZW5DaG9pY2VDb21wb25lbnRzM19idG5MYWJlbC5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUNvbXBvbmVudHMzX2J0bjogU2NyZWVuQ2hvaWNlQ29tcG9uZW50czNfYnRuLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlQ29tcG9uZW50czNfYmFjazogU2NyZWVuQ2hvaWNlQ29tcG9uZW50czNfYmFjay5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUNvbXBvbmVudHMzX2JhY2tncm91bmQ6IFNjcmVlbkNob2ljZUNvbXBvbmVudHMzX2JhY2tncm91bmQuY29weSgpXG5cbiAgICAgICAgQ2FzaW5nLmF1dG9Qb3NpdGlvbihALCBAY29tcHMuU2NyZWVuQ2hvaWNlQ29tcG9uZW50czNfYmFja2dyb3VuZCwgQGNvbXBzKVxuXG4gICAgd2lyaW5nX2J0bjogQ2FzaW5nLmludm9rZU9uY2UgKGhhbmRsZUJ0blRhcCkgLT5cbiAgICAgICAgQGNvbXBzLlNjcmVlbkNob2ljZUNvbXBvbmVudHMzX2J0bi5vblRhcCA9PlxuICAgICAgICAgICAgaGFuZGxlQnRuVGFwLnZhbHVlKClcblxuICAgIHdpcmluZ19iYWNrOiBDYXNpbmcuaW52b2tlT25jZSAoaGFuZGxlQmFja1RhcCkgLT5cbiAgICAgICAgQGNvbXBzLlNjcmVlbkNob2ljZUNvbXBvbmVudHMzX2JhY2sub25UYXAgPT5cbiAgICAgICAgICAgIGhhbmRsZUJhY2tUYXAudmFsdWUoKVxuIiwiQ2FzaW5nID0gcmVxdWlyZSBcIkNhc2luZ1wiXG5cbmNsYXNzIGV4cG9ydHMuU2NyZWVuQ2hvaWNlQ29tcG9uZW50czIgZXh0ZW5kcyBMYXllclxuICAgIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICAgICBfLmRlZmF1bHRzIG9wdGlvbnMsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG51bGxcbiAgICAgICAgICAgIHg6IChTY3JlZW4ud2lkdGggLSBTY3JlZW5DaG9pY2VDb21wb25lbnRzMl9iYWNrZ3JvdW5kLndpZHRoKSAvIDJcbiAgICAgICAgICAgIHk6IChTY3JlZW4uaGVpZ2h0IC0gU2NyZWVuQ2hvaWNlQ29tcG9uZW50czJfYmFja2dyb3VuZC5oZWlnaHQpIC8gMlxuICAgICAgICBzdXBlciBvcHRpb25zXG5cbiAgICAgICAgQGNvbXBzID1cbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUNvbXBvbmVudHMyX25hbWVMYWJlbDogU2NyZWVuQ2hvaWNlQ29tcG9uZW50czJfbmFtZUxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlQ29tcG9uZW50czJfc2VsZWN0b3I6IFNjcmVlbkNob2ljZUNvbXBvbmVudHMyX3NlbGVjdG9yLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlQ29tcG9uZW50czJfYnRuTGFiZWw6IFNjcmVlbkNob2ljZUNvbXBvbmVudHMyX2J0bkxhYmVsLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlQ29tcG9uZW50czJfYnRuOiBTY3JlZW5DaG9pY2VDb21wb25lbnRzMl9idG4uY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VDb21wb25lbnRzMl9iYWNrOiBTY3JlZW5DaG9pY2VDb21wb25lbnRzMl9iYWNrLmNvcHkoKVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlQ29tcG9uZW50czJfYmFja2dyb3VuZDogU2NyZWVuQ2hvaWNlQ29tcG9uZW50czJfYmFja2dyb3VuZC5jb3B5KClcblxuICAgICAgICBDYXNpbmcuYXV0b1Bvc2l0aW9uKEAsIEBjb21wcy5TY3JlZW5DaG9pY2VDb21wb25lbnRzMl9iYWNrZ3JvdW5kLCBAY29tcHMpXG5cbiAgICB3aXJpbmdfYnRuOiBDYXNpbmcuaW52b2tlT25jZSAoaGFuZGxlQnRuVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuQ2hvaWNlQ29tcG9uZW50czJfYnRuLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCdG5UYXAudmFsdWUoKVxuXG4gICAgd2lyaW5nX2JhY2s6IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCYWNrVGFwKSAtPlxuICAgICAgICBAY29tcHMuU2NyZWVuQ2hvaWNlQ29tcG9uZW50czJfYmFjay5vblRhcCA9PlxuICAgICAgICAgICAgaGFuZGxlQmFja1RhcC52YWx1ZSgpXG4iLCJDYXNpbmcgPSByZXF1aXJlIFwiQ2FzaW5nXCJcblxuY2xhc3MgZXhwb3J0cy5TY3JlZW5DaG9pY2VDb21wb25lbnRzMSBleHRlbmRzIExheWVyXG4gICAgY29uc3RydWN0b3I6IChvcHRpb25zID0ge30pIC0+XG4gICAgICAgIF8uZGVmYXVsdHMgb3B0aW9ucyxcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogbnVsbFxuICAgICAgICAgICAgeDogKFNjcmVlbi53aWR0aCAtIFNjcmVlbkNob2ljZUNvbXBvbmVudHMxX2JhY2tncm91bmQud2lkdGgpIC8gMlxuICAgICAgICAgICAgeTogKFNjcmVlbi5oZWlnaHQgLSBTY3JlZW5DaG9pY2VDb21wb25lbnRzMV9iYWNrZ3JvdW5kLmhlaWdodCkgLyAyXG4gICAgICAgIHN1cGVyIG9wdGlvbnNcblxuICAgICAgICBAY29tcHMgPVxuICAgICAgICAgICAgU2NyZWVuQ2hvaWNlQ29tcG9uZW50czFfbmFtZUxhYmVsOiBTY3JlZW5DaG9pY2VDb21wb25lbnRzMV9uYW1lTGFiZWwuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VDb21wb25lbnRzMV9zZWxlY3RvcjogU2NyZWVuQ2hvaWNlQ29tcG9uZW50czFfc2VsZWN0b3IuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VDb21wb25lbnRzMV9idG5MYWJlbDogU2NyZWVuQ2hvaWNlQ29tcG9uZW50czFfYnRuTGFiZWwuY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VDb21wb25lbnRzMV9idG46IFNjcmVlbkNob2ljZUNvbXBvbmVudHMxX2J0bi5jb3B5KClcbiAgICAgICAgICAgIFNjcmVlbkNob2ljZUNvbXBvbmVudHMxX2JhY2s6IFNjcmVlbkNob2ljZUNvbXBvbmVudHMxX2JhY2suY29weSgpXG4gICAgICAgICAgICBTY3JlZW5DaG9pY2VDb21wb25lbnRzMV9iYWNrZ3JvdW5kOiBTY3JlZW5DaG9pY2VDb21wb25lbnRzMV9iYWNrZ3JvdW5kLmNvcHkoKVxuXG4gICAgICAgIENhc2luZy5hdXRvUG9zaXRpb24oQCwgQGNvbXBzLlNjcmVlbkNob2ljZUNvbXBvbmVudHMxX2JhY2tncm91bmQsIEBjb21wcylcblxuICAgIHdpcmluZ19idG46IENhc2luZy5pbnZva2VPbmNlIChoYW5kbGVCdG5UYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5DaG9pY2VDb21wb25lbnRzMV9idG4ub25UYXAgPT5cbiAgICAgICAgICAgIGhhbmRsZUJ0blRhcC52YWx1ZSgpXG5cbiAgICB3aXJpbmdfYmFjazogQ2FzaW5nLmludm9rZU9uY2UgKGhhbmRsZUJhY2tUYXApIC0+XG4gICAgICAgIEBjb21wcy5TY3JlZW5DaG9pY2VDb21wb25lbnRzMV9iYWNrLm9uVGFwID0+XG4gICAgICAgICAgICBoYW5kbGVCYWNrVGFwLnZhbHVlKClcbiIsIiMgQ29weXJpZ2h0IChjKSAyMDE4IE5hdGFsaWUgTWFybGVueVxuIyBDYXNpbmcgLSBVSSBmcmFtZXdvcmsgZm9yIEZyYW1lclxuIyBMaWNlbnNlOiBNSVRcbiMgVVJMOiBodHRwczovL2dpdGh1Yi5jb20vbmF0YWxpZW1hcmxlbnkvQ2FzaW5nXG5cbiMgTW9kaWZpZWQgY29kZSwgb3JpZ2luYWxseSBmcm9tOiBodHRwczovL2dpdGh1Yi5jb20vYWppbWl4L0lucHV0LUZyYW1lclxuIyBUaGFuayB5b3UgYWppbWl4IGZvciB0aGUgYW1hemluZyBjb2RlIC0geW91J3JlIGF3ZXNvbWUhXG5cblxuIyBFeHRlbmRzIHRoZSBMYXllclN0eWxlIGNsYXNzIHdoaWNoIGRvZXMgdGhlIHBpeGVsIHJhdGlvIGNhbGN1bGF0aW9ucyBpbiBmcmFtZXJcbl9pbnB1dFN0eWxlID1cblx0T2JqZWN0LmFzc2lnbih7fSwgRnJhbWVyLkxheWVyU3R5bGUsXG5cdFx0Y2FsY3VsYXRlUGl4ZWxSYXRpbyA9IChsYXllciwgdmFsdWUpIC0+XG5cdFx0XHQodmFsdWUgKiBsYXllci5jb250ZXh0LnBpeGVsTXVsdGlwbGllcikgKyBcInB4XCJcblxuXHRcdGZvbnRTaXplOiAobGF5ZXIpIC0+XG5cdFx0XHRjYWxjdWxhdGVQaXhlbFJhdGlvKGxheWVyLCBsYXllci5fcHJvcGVydGllcy5mb250U2l6ZSlcblxuXHRcdGxpbmVIZWlnaHQ6IChsYXllcikgLT5cblx0XHRcdChsYXllci5fcHJvcGVydGllcy5saW5lSGVpZ2h0KSArIFwiZW1cIlxuXG5cdFx0cGFkZGluZzogKGxheWVyKSAtPlxuXHRcdFx0eyBwaXhlbE11bHRpcGxpZXIgfSA9IGxheWVyLmNvbnRleHRcblx0XHRcdHBhZGRpbmcgPSBbXVxuXHRcdFx0cGFkZGluZ1ZhbHVlID0gbGF5ZXIuX3Byb3BlcnRpZXMucGFkZGluZ1xuXG5cdFx0XHQjIENoZWNrIGlmIHdlIGhhdmUgYSBzaW5nbGUgbnVtYmVyIGFzIGludGVnZXJcblx0XHRcdGlmIE51bWJlci5pc0ludGVnZXIocGFkZGluZ1ZhbHVlKVxuXHRcdFx0XHRyZXR1cm4gY2FsY3VsYXRlUGl4ZWxSYXRpbyhsYXllciwgcGFkZGluZ1ZhbHVlKVxuXG5cdFx0XHQjIElmIHdlIGhhdmUgbXVsdGlwbGUgdmFsdWVzIHRoZXkgY29tZSBhcyBzdHJpbmcgKGUuZy4gXCIxIDIgMyA0XCIpXG5cdFx0XHRwYWRkaW5nVmFsdWVzID0gbGF5ZXIuX3Byb3BlcnRpZXMucGFkZGluZy5zcGxpdChcIiBcIilcblxuXHRcdFx0c3dpdGNoIHBhZGRpbmdWYWx1ZXMubGVuZ3RoXG5cdFx0XHRcdHdoZW4gNFxuXHRcdFx0XHRcdHBhZGRpbmcudG9wID0gcGFyc2VGbG9hdChwYWRkaW5nVmFsdWVzWzBdKVxuXHRcdFx0XHRcdHBhZGRpbmcucmlnaHQgPSBwYXJzZUZsb2F0KHBhZGRpbmdWYWx1ZXNbMV0pXG5cdFx0XHRcdFx0cGFkZGluZy5ib3R0b20gPSBwYXJzZUZsb2F0KHBhZGRpbmdWYWx1ZXNbMl0pXG5cdFx0XHRcdFx0cGFkZGluZy5sZWZ0ID0gcGFyc2VGbG9hdChwYWRkaW5nVmFsdWVzWzNdKVxuXG5cdFx0XHRcdHdoZW4gM1xuXHRcdFx0XHRcdHBhZGRpbmcudG9wID0gcGFyc2VGbG9hdChwYWRkaW5nVmFsdWVzWzBdKVxuXHRcdFx0XHRcdHBhZGRpbmcucmlnaHQgPSBwYXJzZUZsb2F0KHBhZGRpbmdWYWx1ZXNbMV0pXG5cdFx0XHRcdFx0cGFkZGluZy5ib3R0b20gPSBwYXJzZUZsb2F0KHBhZGRpbmdWYWx1ZXNbMl0pXG5cdFx0XHRcdFx0cGFkZGluZy5sZWZ0ID0gcGFyc2VGbG9hdChwYWRkaW5nVmFsdWVzWzFdKVxuXG5cdFx0XHRcdHdoZW4gMlxuXHRcdFx0XHRcdHBhZGRpbmcudG9wID0gcGFyc2VGbG9hdChwYWRkaW5nVmFsdWVzWzBdKVxuXHRcdFx0XHRcdHBhZGRpbmcucmlnaHQgPSBwYXJzZUZsb2F0KHBhZGRpbmdWYWx1ZXNbMV0pXG5cdFx0XHRcdFx0cGFkZGluZy5ib3R0b20gPSBwYXJzZUZsb2F0KHBhZGRpbmdWYWx1ZXNbMF0pXG5cdFx0XHRcdFx0cGFkZGluZy5sZWZ0ID0gcGFyc2VGbG9hdChwYWRkaW5nVmFsdWVzWzFdKVxuXG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRwYWRkaW5nLnRvcCA9IHBhcnNlRmxvYXQocGFkZGluZ1ZhbHVlc1swXSlcblx0XHRcdFx0XHRwYWRkaW5nLnJpZ2h0ID0gcGFyc2VGbG9hdChwYWRkaW5nVmFsdWVzWzBdKVxuXHRcdFx0XHRcdHBhZGRpbmcuYm90dG9tID0gcGFyc2VGbG9hdChwYWRkaW5nVmFsdWVzWzBdKVxuXHRcdFx0XHRcdHBhZGRpbmcubGVmdCA9IHBhcnNlRmxvYXQocGFkZGluZ1ZhbHVlc1swXSlcblxuXHRcdFx0IyBSZXR1cm4gYXMgNC12YWx1ZSBzdHJpbmcgKGUuZyBcIjFweCAycHggM3B4IDRweFwiKVxuXHRcdFx0XCIje3BhZGRpbmcudG9wICogcGl4ZWxNdWx0aXBsaWVyfXB4ICN7cGFkZGluZy5yaWdodCAqIHBpeGVsTXVsdGlwbGllcn1weCAje3BhZGRpbmcuYm90dG9tICogcGl4ZWxNdWx0aXBsaWVyfXB4ICN7cGFkZGluZy5sZWZ0ICogcGl4ZWxNdWx0aXBsaWVyfXB4XCJcblx0KVxuXG5jbGFzcyBleHBvcnRzLkZybXJUZXh0SW5wdXQgZXh0ZW5kcyBMYXllclxuXHRjb25zdHJ1Y3RvcjogKG9wdGlvbnMgPSB7fSkgLT5cblx0XHRfLmRlZmF1bHRzIG9wdGlvbnMsXG5cdFx0XHR3aWR0aDogU2NyZWVuLndpZHRoIC8gMlxuXHRcdFx0aGVpZ2h0OiA2MFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiBcIndoaXRlXCJcblx0XHRcdGZvbnRTaXplOiAzMFxuXHRcdFx0bGluZUhlaWdodDogMVxuXHRcdFx0cGFkZGluZzogMTBcblx0XHRcdHRleHQ6IFwiXCJcblx0XHRcdHBsYWNlaG9sZGVyOiBcIlwiXG5cdFx0XHR0eXBlOiBcInRleHRcIlxuXHRcdFx0YXV0b0NvcnJlY3Q6IHRydWVcblx0XHRcdGF1dG9Db21wbGV0ZTogdHJ1ZVxuXHRcdFx0YXV0b0NhcGl0YWxpemU6IHRydWVcblx0XHRcdHNwZWxsQ2hlY2s6IHRydWVcblx0XHRcdGF1dG9mb2N1czogZmFsc2Vcblx0XHRcdHRleHRDb2xvcjogXCIjMDAwXCJcblx0XHRcdGZvbnRGYW1pbHk6IFwiLWFwcGxlLXN5c3RlbVwiXG5cdFx0XHRmb250V2VpZ2h0OiBcIjUwMFwiXG5cdFx0XHR0YWJJbmRleDogMFxuXHRcdFx0dGV4dGFyZWE6IGZhbHNlXG5cdFx0XHRlbmFibGVkOiB0cnVlXG5cblx0XHRzdXBlciBvcHRpb25zXG5cblx0XHQjIEFkZCBhZGRpdGlvbmFsIHByb3BlcnRpZXNcblx0XHRAX3Byb3BlcnRpZXMuZm9udFNpemUgPSBvcHRpb25zLmZvbnRTaXplXG5cdFx0QF9wcm9wZXJ0aWVzLmxpbmVIZWlnaHQgPSBvcHRpb25zLmxpbmVIZWlnaHRcblx0XHRAX3Byb3BlcnRpZXMucGFkZGluZyA9IG9wdGlvbnMucGFkZGluZ1xuXG5cdFx0QHBsYWNlaG9sZGVyQ29sb3IgPSBvcHRpb25zLnBsYWNlaG9sZGVyQ29sb3IgaWYgb3B0aW9ucy5wbGFjZWhvbGRlckNvbG9yP1xuXHRcdEBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQgaWYgb3B0aW9ucy50ZXh0YXJlYSB0aGVuICd0ZXh0YXJlYScgZWxzZSAnaW5wdXQnXG5cdFx0QGlucHV0LmlkID0gXCJpbnB1dC0je18ubm93KCl9XCJcblxuXHRcdCMgQWRkIHN0eWxpbmcgdG8gdGhlIGlucHV0IGVsZW1lbnRcblx0XHRfLmFzc2lnbiBAaW5wdXQuc3R5bGUsXG5cdFx0XHR3aWR0aDogX2lucHV0U3R5bGVbXCJ3aWR0aFwiXShAKVxuXHRcdFx0aGVpZ2h0OiBfaW5wdXRTdHlsZVtcImhlaWdodFwiXShAKVxuXHRcdFx0Zm9udFNpemU6IF9pbnB1dFN0eWxlW1wiZm9udFNpemVcIl0oQClcblx0XHRcdGxpbmVIZWlnaHQ6IF9pbnB1dFN0eWxlW1wibGluZUhlaWdodFwiXShAKVxuXHRcdFx0b3V0bGluZTogXCJub25lXCJcblx0XHRcdGJvcmRlcjogXCJub25lXCJcblx0XHRcdGJhY2tncm91bmRDb2xvcjogb3B0aW9ucy5iYWNrZ3JvdW5kQ29sb3Jcblx0XHRcdHBhZGRpbmc6IF9pbnB1dFN0eWxlW1wicGFkZGluZ1wiXShAKVxuXHRcdFx0Zm9udEZhbWlseTogb3B0aW9ucy5mb250RmFtaWx5XG5cdFx0XHRjb2xvcjogb3B0aW9ucy50ZXh0Q29sb3Jcblx0XHRcdGZvbnRXZWlnaHQ6IG9wdGlvbnMuZm9udFdlaWdodFxuXG5cdFx0Xy5hc3NpZ24gQGlucHV0LFxuXHRcdFx0dmFsdWU6IG9wdGlvbnMudGV4dFxuXHRcdFx0dHlwZTogb3B0aW9ucy50eXBlXG5cdFx0XHRwbGFjZWhvbGRlcjogb3B0aW9ucy5wbGFjZWhvbGRlclxuXG5cdFx0QGlucHV0LnNldEF0dHJpYnV0ZSBcInRhYmluZGV4XCIsIG9wdGlvbnMudGFiaW5kZXhcblx0XHRAaW5wdXQuc2V0QXR0cmlidXRlIFwiYXV0b2NvcnJlY3RcIiwgaWYgb3B0aW9ucy5hdXRvQ29ycmVjdCB0aGVuIFwib25cIiBlbHNlIFwib2ZmXCJcblx0XHRAaW5wdXQuc2V0QXR0cmlidXRlIFwiYXV0b2NvbXBsZXRlXCIsIGlmIG9wdGlvbnMuYXV0b0NvbXBsZXRlIHRoZW4gXCJvblwiIGVsc2UgXCJvZmZcIlxuXHRcdEBpbnB1dC5zZXRBdHRyaWJ1dGUgXCJhdXRvY2FwaXRhbGl6ZVwiLCBpZiBvcHRpb25zLmF1dG9DYXBpdGFsaXplIHRoZW4gXCJvblwiIGVsc2UgXCJvZmZcIlxuXHRcdEBpbnB1dC5zZXRBdHRyaWJ1dGUgXCJzcGVsbGNoZWNrXCIsIGlmIG9wdGlvbnMuc3BlbGxDaGVjayB0aGVuIFwib25cIiBlbHNlIFwib2ZmXCJcblx0XHRpZiBub3Qgb3B0aW9ucy5lbmFibGVkXG5cdFx0XHRAaW5wdXQuc2V0QXR0cmlidXRlIFwiZGlzYWJsZWRcIiwgdHJ1ZVxuXHRcdGlmIG9wdGlvbnMuYXV0b2ZvY3VzXG5cdFx0XHRAaW5wdXQuc2V0QXR0cmlidXRlIFwiYXV0b2ZvY3VzXCIsIHRydWVcblxuXHRcdEBmb3JtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCBcImZvcm1cIlxuXG5cdFx0QGZvcm0uYXBwZW5kQ2hpbGQgQGlucHV0XG5cdFx0QF9lbGVtZW50LmFwcGVuZENoaWxkIEBmb3JtXG5cblx0XHRAYmFja2dyb3VuZENvbG9yID0gXCJ0cmFuc3BhcmVudFwiXG5cdFx0QHVwZGF0ZVBsYWNlaG9sZGVyQ29sb3Igb3B0aW9ucy5wbGFjZWhvbGRlckNvbG9yIGlmIEBwbGFjZWhvbGRlckNvbG9yXG5cblx0QGRlZmluZSBcInN0eWxlXCIsXG5cdFx0Z2V0OiAtPiBAaW5wdXQuc3R5bGVcblx0XHRzZXQ6ICh2YWx1ZSkgLT5cblx0XHRcdF8uZXh0ZW5kIEBpbnB1dC5zdHlsZSwgdmFsdWVcblxuXHRAZGVmaW5lIFwidmFsdWVcIixcblx0XHRnZXQ6IC0+IEBpbnB1dC52YWx1ZVxuXHRcdHNldDogKHZhbHVlKSAtPlxuXHRcdFx0QGlucHV0LnZhbHVlID0gdmFsdWVcblxuXHR1cGRhdGVQbGFjZWhvbGRlckNvbG9yOiAoY29sb3IpIC0+XG5cdFx0QHBsYWNlaG9sZGVyQ29sb3IgPSBjb2xvclxuXHRcdGlmIEBwYWdlU3R5bGU/XG5cdFx0XHRkb2N1bWVudC5oZWFkLnJlbW92ZUNoaWxkIEBwYWdlU3R5bGVcblx0XHRAcGFnZVN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCBcInN0eWxlXCJcblx0XHRAcGFnZVN0eWxlLnR5cGUgPSBcInRleHQvY3NzXCJcblx0XHRjc3MgPSBcIiMje0BpbnB1dC5pZH06Oi13ZWJraXQtaW5wdXQtcGxhY2Vob2xkZXIgeyBjb2xvcjogI3tAcGxhY2Vob2xkZXJDb2xvcn07IH1cIlxuXHRcdEBwYWdlU3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUgY3NzKVxuXHRcdGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQgQHBhZ2VTdHlsZVxuXG5cdGZvY3VzOiAoKSAtPlxuXHRcdEBpbnB1dC5mb2N1cygpXG5cblx0dW5mb2N1czogKCkgLT5cblx0XHRAaW5wdXQuYmx1cigpXG5cblx0b25Gb2N1czogKGNiKSAtPlxuXHRcdEBpbnB1dC5hZGRFdmVudExpc3RlbmVyIFwiZm9jdXNcIiwgLT5cblx0XHRcdGNiLmFwcGx5KEApXG5cblx0b25VbmZvY3VzOiAoY2IpIC0+XG5cdFx0QGlucHV0LmFkZEV2ZW50TGlzdGVuZXIgXCJibHVyXCIsIC0+XG5cdFx0XHRjYi5hcHBseShAKVxuXG5cdGRpc2FibGU6ICgpIC0+XG5cdFx0QGlucHV0LnNldEF0dHJpYnV0ZSBcImRpc2FibGVkXCIsIHRydWVcblxuXHRlbmFibGU6ICgpID0+XG5cdFx0QGlucHV0LnJlbW92ZUF0dHJpYnV0ZSBcImRpc2FibGVkXCIsIHRydWVcbiIsIiMgQ29weXJpZ2h0IChjKSAyMDE4IE5hdGFsaWUgTWFybGVueVxuIyBDYXNpbmcgLSBVSSBmcmFtZXdvcmsgZm9yIEZyYW1lclxuIyBMaWNlbnNlOiBNSVRcbiMgVVJMOiBodHRwczovL2dpdGh1Yi5jb20vbmF0YWxpZW1hcmxlbnkvQ2FzaW5nXG5cblxuY2xhc3MgZXhwb3J0cy5Gcm1yRHJvcGRvd24gZXh0ZW5kcyBMYXllclxuICAgIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICAgICBET01faWQgPSBcImRyb3Bkb3duLSN7Xy5yYW5kb20oMioqMzEpfS0je18ubm93KCl9XCJcbiAgICAgICAgXy5kZWZhdWx0cyBvcHRpb25zLFxuICAgICAgICAgICAgaHRtbDogXCJcIlwiXG4gICAgICAgICAgICAgICAgPHNlbGVjdFxuICAgICAgICAgICAgICAgICAgICBpZD1cIiN7RE9NX2lkfVwiXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPSdiYWNrZ3JvdW5kLWNvbG9yOiAjRkZGRkZGOyBhcHBlYXJhbmNlOiBub25lOyBvdXRsaW5lOiBub25lOyBsaW5lLWhlaWdodDogbm9ybWFsOyBtYXJnaW46IDA7IGJvcmRlcjogMDsgcGFkZGluZzogMDsgYm9yZGVyLWNvbG9yOiAjRTlFQ0YwOyBmb250LWZhbWlseTogXCItYXBwbGUtc3lzdGVtXCI7IGZvbnQtc2l6ZTogMTRweDsgY29sb3I6ICM3QTgzOEQ7IHdpZHRoOiAzMTBweDsgaGVpZ2h0OiA0NXB4OyBib3JkZXItd2lkdGg6IDJweDsgYm94LXNoYWRvdzogMHB4IDFweCAzcHggcmdiYSgwLCAwLCAwLCAwLjA1KTsnXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwiXCI+PC9vcHRpb24+XG4gICAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICBcIlwiXCJcbiAgICAgICAgICAgIGhlaWdodDogNDRcbiAgICAgICAgICAgIHdpZHRoOiAzMTBcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogXCIjRkZGRkZGXCJcblxuICAgICAgICBzdXBlciBvcHRpb25zXG5cbiAgICAgICAgQGRyb3Bkb3duID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoRE9NX2lkKVxuXG4gICAgQGRlZmluZSBcInZhbHVlXCIsXG4gICAgICAgIGdldDogLT4gQGRyb3Bkb3duLnZhbHVlXG4gICAgICAgIHNldDogKHZhbHVlKSAtPlxuICAgICAgICAgICAgQGRyb3Bkb3duLnZhbHVlID0gdmFsdWVcblxuICAgIEBkZWZpbmUgXCJkcm9wZG93bk9wdGlvbnNcIixcbiAgICAgICAgZ2V0OiAtPiBAX2Ryb3Bkb3duT3B0aW9uc1xuICAgICAgICBzZXQ6IChkcm9wZG93bk9wdGlvbnMpIC0+XG4gICAgICAgICAgICBcIlwiXCJcbiAgICAgICAgICAgIFt7dmFsdWU6ICdvcHRpb24tdmFsdWUnLCB0ZXh0OiAnb3B0aW9uLXRleHQnfV1cbiAgICAgICAgICAgIFwiXCJcIlxuICAgICAgICAgICAgQF9kcm9wZG93bk9wdGlvbnMgPSBkcm9wZG93bk9wdGlvbnNcblxuICAgICAgICAgICAgX29wdGlvbnNIVE1MID0gXCJcIlxuICAgICAgICAgICAgZm9yIG9wdGlvbiBpbiBAZHJvcGRvd25PcHRpb25zXG4gICAgICAgICAgICAgICAgX29wdGlvbnNIVE1MICs9IFwiPG9wdGlvbiB2YWx1ZT0je29wdGlvbi52YWx1ZX0+I3tvcHRpb24udGV4dH08L29wdGlvbj5cIlxuXG4gICAgICAgICAgICBAZHJvcGRvd24uaW5uZXJIVE1MID0gX29wdGlvbnNIVE1MXG4iLCIjIENvcHlyaWdodCAoYykgMjAxOCBOYXRhbGllIE1hcmxlbnlcbiMgQ2FzaW5nIC0gVUkgZnJhbWV3b3JrIGZvciBGcmFtZXJcbiMgTGljZW5zZTogTUlUXG4jIFVSTDogaHR0cHM6Ly9naXRodWIuY29tL25hdGFsaWVtYXJsZW55L0Nhc2luZ1xuXG4jIFV0aWxpdHkgZnVuY3Rpbm9zIGZvciBtYW5pcHVsYXRpbmcgZGF0ZXNcbkRhdGUucHJvdG90eXBlLmFkZERheXMgPSAoZGVsdGFEYXlzKSAtPlxuICAgIHJldHVybiBuZXcgRGF0ZShcbiAgICAgICAgQGdldEZ1bGxZZWFyKCksXG4gICAgICAgIEBnZXRNb250aCgpLFxuICAgICAgICBAZ2V0RGF0ZSgpICsgZGVsdGFEYXlzLFxuICAgIClcblxuRGF0ZS5wcm90b3R5cGUuYWRkTW9udGhzID0gKGRlbHRhTW9udGhzKSAtPlxuICAgIHJldHVybiBuZXcgRGF0ZShcbiAgICAgICAgQGdldEZ1bGxZZWFyKCksXG4gICAgICAgIEBnZXRNb250aCgpICsgZGVsdGFNb250aHMsXG4gICAgKVxuXG4jIFV0aWxpdHkgYXJyYXlzXG5tb250aE5hbWVzID0gW1xuICAgIFwiSmFudWFyeVwiLCBcIkZlYnJ1YXJ5XCIsIFwiTWFyY2hcIiwgXCJBcHJpbFwiLCBcIk1heVwiLCBcIkp1bmVcIixcbiAgICBcIkp1bHlcIiwgXCJBdWd1c3RcIiwgXCJTZXB0ZW1iZXJcIiwgXCJPY3RvYmVyXCIsIFwiTm92ZW1iZXJcIiwgXCJEZWNlbWJlclwiXG5dXG5leHBvcnRzLm1vbnRoTmFtZXMgPSBtb250aE5hbWVzXG5cbm1vbnRoTmFtZXNVcHBlcmNhc2UgPSBbXG4gICAgXCJKQU5VQVJZXCIsIFwiRkVCUlVBUllcIiwgXCJNQVJDSFwiLCBcIkFQUklMXCIsIFwiTUFZXCIsIFwiSlVORVwiLFxuICAgIFwiSlVMWVwiLCBcIkFVR1VTVFwiLCBcIlNFUFRFTUJFUlwiLCBcIk9DVE9CRVJcIiwgXCJOT1ZFTUJFUlwiLCBcIkRFQ0VNQkVSXCJcbl1cbmV4cG9ydHMubW9udGhOYW1lc1VwcGVyY2FzZSA9IG1vbnRoTmFtZXNVcHBlcmNhc2VcblxubW9udGhBYmJyZXZzVXBwZXJjYXNlID0gW1xuICAgIFwiSkFOXCIsIFwiRkVCXCIsIFwiTUFSXCIsIFwiQVBSXCIsIFwiTUFZXCIsIFwiSlVOXCIsXG4gICAgXCJKVUxcIiwgXCJBVUdcIiwgXCJTRVBcIiwgXCJPQ1RcIiwgXCJOT1ZcIiwgXCJERUNcIlxuXVxuZXhwb3J0cy5tb250aEFiYnJldnNVcHBlcmNhc2UgPSBtb250aEFiYnJldnNVcHBlcmNhc2VcblxubW9udGhBYmJyZXZzTG93ZXJjYXNlID0gW1xuICAgIFwiSmFuXCIsIFwiRmViXCIsIFwiTWFyXCIsIFwiQXByXCIsIFwiTWF5XCIsIFwiSnVuXCIsXG4gICAgXCJKdWxcIiwgXCJBdWdcIiwgXCJTZXBcIiwgXCJPY3RcIiwgXCJOb3ZcIiwgXCJEZWNcIlxuXVxuZXhwb3J0cy5tb250aEFiYnJldnNMb3dlcmNhc2UgPSBtb250aEFiYnJldnNMb3dlcmNhc2VcblxuZGF5QWJicmV2cyA9IFtcbiAgICBcIlN1blwiLCBcIk1vblwiLCBcIlR1ZVwiLCBcIldlZFwiLCBcIlRodVwiLCBcIkZyaVwiLCBcIlNhdFwiXG5dXG5leHBvcnRzLmRheUFiYnJldnMgPSBkYXlBYmJyZXZzXG5cblxuY2xhc3MgZXhwb3J0cy5Gcm1yRGF0ZVBpY2tlciBleHRlbmRzIExheWVyXG4gICAgY29uc3RydWN0b3I6IChvcHRpb25zID0ge30pIC0+XG4gICAgICAgICMgQ09ORklHVVJBVElPTlxuICAgICAgICBkZWZhdWx0cyA9XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICAgICAgICBudW1iZXJPZk1vbnRoc1Nob3c6IDFcbiAgICAgICAgICAgIGZpcnN0Q29sdW1uRGF5OiAxXG5cbiAgICAgICAgICAgIHN0YXJ0RGF0ZVNob3c6IG5ldyBEYXRlKERhdGUubm93KCkpXG4gICAgICAgICAgICBkYXRlUmFuZ2VTZWxlY3RlZFN0YXJ0OiB1bmRlZmluZWRcbiAgICAgICAgICAgIGRhdGVSYW5nZVNlbGVjdGVkRW5kOiB1bmRlZmluZWRcblxuICAgICAgICAgICAgaG92ZXJFbmFibGVkOiB0cnVlXG4gICAgICAgICAgICBkYXRlUmFuZ2VTZWxlY3RhYmxlOiBmYWxzZSAgIyBpZiBmYWxzZSBvbmx5IHNpbmdsZSBkYXRlIGlzIHNlbGVjdGFibGVcbiAgICAgICAgICAgIG91dHNpZGVNb250aERhdGVzU2hvdzogZmFsc2VcbiAgICAgICAgICAgIGJ1dHRvbk5leHRTaG93OiB0cnVlXG4gICAgICAgICAgICBidXR0b25QcmV2U2hvdzogdHJ1ZVxuXG4gICAgICAgICAgICBoaWdobGlnaHREYXRlUmFuZ2VzOiBbXG4gICAgICAgICAgICAgICAgIyB7XG4gICAgICAgICAgICAgICAgIyAgICAgZGF0ZVJhbmdlU3RhcnQ6IG5ldyBEYXRlKDIwMTgsIDUsIDUpXG4gICAgICAgICAgICAgICAgIyAgICAgZGF0ZVJhbmdlRW5kOiBuZXcgRGF0ZSgyMDE4LCA1LCA4KVxuICAgICAgICAgICAgICAgICMgICAgIGRhdGVFeHRyYVN0eWxlOlxuICAgICAgICAgICAgICAgICMgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFwicmVkXCJcbiAgICAgICAgICAgICAgICAjICAgICAgICAgY29sb3I6IFwid2hpdGVcIlxuICAgICAgICAgICAgICAgICMgfVxuICAgICAgICAgICAgXVxuXG4gICAgICAgICAgICBoYW5kbGVNb250aHNTaG93Q2hhbmdlOiAocHJldmlvdXNTdGFydERhdGVTaG93LCBjdXJyZW50U3RhcnREYXRlU2hvdykgLT5cbiAgICAgICAgICAgICAgICB1bmRlZmluZWRcblxuICAgICAgICAgICAgaGFuZGxlRGF0ZVJhbmdlU2VsZWN0ZWRDaGFuZ2U6IChcbiAgICAgICAgICAgICAgICBwcmV2aW91c0RhdGVSYW5nZVNlbGVjdGVkU3RhcnRcbiAgICAgICAgICAgICAgICBwcmV2aW91c0RhdGVSYW5nZVNlbGVjdGVkRW5kXG4gICAgICAgICAgICAgICAgY3VycmVudERhdGVSYW5nZVNlbGVjdGVkU3RhcnRcbiAgICAgICAgICAgICAgICBjdXJyZW50RGF0ZVJhbmdlU2VsZWN0ZWRFbmRcbiAgICAgICAgICAgICkgLT5cbiAgICAgICAgICAgICAgICB1bmRlZmluZWRcblxuICAgICAgICAgICAgbW9udGhzQm94U3R5bGU6XG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBcIiNmZmZmZmZcIlxuICAgICAgICAgICAgICAgIHdpZHRoOiAyNzcgKiAob3B0aW9ucy5udW1iZXJPZk1vbnRoc1Nob3cgb3IgMSlcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDI4NVxuICAgICAgICAgICAgICAgIGJvcmRlcldpZHRoOiAxXG4gICAgICAgICAgICAgICAgYm9yZGVyUmFkaXVzOiA2XG4gICAgICAgICAgICAgICAgYm9yZGVyQ29sb3I6IFwiI0U5RUNGMFwiXG4gICAgICAgICAgICAgICAgcGFkZGluZzpcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAzXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogMFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiAxNVxuICAgICAgICAgICAgICAgICAgICByaWdodDogMTVcbiAgICAgICAgICAgIG1vbnRoSGVhZGVyU3R5bGU6XG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAzNlxuICAgICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogXCJ0cmFuc3BhcmVudFwiXG4gICAgICAgICAgICAgICAgY29sb3I6IFwiIzNDNDQ0RFwiXG4gICAgICAgICAgICAgICAgdGV4dEFsaWduOiBcImNlbnRlclwiXG4gICAgICAgICAgICAgICAgZm9udFNpemU6IDE4XG4gICAgICAgICAgICAgICAgZm9udFN0eWxlOiBcImJvbGRcIlxuICAgICAgICAgICAgICAgIGZvbnRGYW1pbHk6IFwiLWFwcGxlLXN5c3RlbVwiXG4gICAgICAgICAgICAgICAgcGFkZGluZzpcbiAgICAgICAgICAgICAgICAgICAgdmVydGljYWw6IDBcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogM1xuICAgICAgICAgICAgICAgICAgICByaWdodDogM1xuICAgICAgICAgICAgd2Vla0hlYWRlclN0eWxlOlxuICAgICAgICAgICAgICAgIGhlaWdodDogMzZcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFwidHJhbnNwYXJlbnRcIlxuICAgICAgICAgICAgICAgIGNvbG9yOiBcIiMzQzQ0NERcIlxuICAgICAgICAgICAgICAgIHRleHRBbGlnbjogXCJjZW50ZXJcIlxuICAgICAgICAgICAgICAgIGZvbnRTaXplOiAxMlxuICAgICAgICAgICAgICAgIGZvbnRGYW1pbHk6IFwiLWFwcGxlLXN5c3RlbVwiXG4gICAgICAgICAgICAgICAgcGFkZGluZzpcbiAgICAgICAgICAgICAgICAgICAgdmVydGljYWw6IDFcbiAgICAgICAgICAgIGRhdGVzQm94U3R5bGU6XG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBcInRyYW5zcGFyZW50XCJcbiAgICAgICAgICAgICAgICBjb2xvcjogXCIjM0M0NDREXCJcbiAgICAgICAgICAgICAgICBwYWRkaW5nOlxuICAgICAgICAgICAgICAgICAgICB0b3A6IDNcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiAwXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDIwXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiAyMFxuICAgICAgICAgICAgYnV0dG9uc1N0eWxlOlxuICAgICAgICAgICAgICAgIGZvbnRTaXplOiAxMlxuICAgICAgICAgICAgZGF0ZUJhc2VTdHlsZTpcbiAgICAgICAgICAgICAgICBjb2xvcjogXCIjM0M0NDREXCJcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFwidHJhbnNwYXJlbnRcIlxuICAgICAgICAgICAgICAgIGJvcmRlckNvbG9yOiBcIiNlNmU2ZTZcIlxuICAgICAgICAgICAgICAgIGJvcmRlcldpZHRoOiAxXG4gICAgICAgICAgICAgICAgYm9yZGVyUmFkaXVzOiAxXG4gICAgICAgICAgICAgICAgdGV4dEFsaWduOiBcImNlbnRlclwiXG4gICAgICAgICAgICAgICAgZm9udFNpemU6IDEyXG4gICAgICAgICAgICAgICAgZm9udEZhbWlseTogXCItYXBwbGUtc3lzdGVtXCJcbiAgICAgICAgICAgICAgICBwYWRkaW5nOlxuICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNhbDogNlxuICAgICAgICAgICAgICAgIG1hcmdpbjpcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAwXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogLTFcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMFxuICAgICAgICAgICAgICAgICAgICByaWdodDogLTFcbiAgICAgICAgICAgIGRhdGVTZWxlY3RlZEV4dHJhU3R5bGU6XG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBcIiMzQzQ0NERcIlxuICAgICAgICAgICAgICAgIGNvbG9yOiBcIndoaXRlXCJcbiAgICAgICAgICAgIGRhdGVIb3ZlcmVkRXh0cmFTdHlsZTpcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFwiI2NjY2NjY1wiXG4gICAgICAgICAgICAgICAgY29sb3I6IFwid2hpdGVcIlxuICAgICAgICAgICAgZGF0ZU91dHNpZGVNb250aEV4dHJhU3R5bGU6XG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMC4yNVxuXG4gICAgICAgICMgYXNzaWduIGFsbCBjb25maWd1cmF0aW9uIHRvIHRoZSBvYmplY3QgYXMgcHJvcGVydGllc1xuICAgICAgICBjb25maWdzX3Bhc3NlZCA9IF8ucGljayBvcHRpb25zLCBfLmtleXMgZGVmYXVsdHNcbiAgICAgICAgXy5hc3NpZ24gQCwgKF8ubWVyZ2Uge30sIGRlZmF1bHRzLCBjb25maWdzX3Bhc3NlZClcblxuICAgICAgICAjIEZJWEVEIFNUWUxFU1xuICAgICAgICBvcHRpb25zLmJhY2tncm91bmRDb2xvciA9IEBtb250aHNCb3hTdHlsZS5iYWNrZ3JvdW5kQ29sb3JcbiAgICAgICAgb3B0aW9ucy53aWR0aCA9IEBtb250aHNCb3hTdHlsZS53aWR0aFxuICAgICAgICBvcHRpb25zLmhlaWdodCA9IEBtb250aHNCb3hTdHlsZS5oZWlnaHRcblxuICAgICAgICBzdXBlciBvcHRpb25zXG5cbiAgICAgICAgIyBMQVlFUiBTVE9SQUdFXG4gICAgICAgIEBkYXRlQ2VsbEJveExheWVyRGljdCA9IHt9XG4gICAgICAgIEB0b3BDb250YWluZXJMYXllciA9IG5ldyBMYXllcihcbiAgICAgICAgICAgIF8ubWVyZ2UoXG4gICAgICAgICAgICAgICAge31cbiAgICAgICAgICAgICAgICBAbW9udGhzQm94U3R5bGVcbiAgICAgICAgICAgICAgICB7cGFyZW50OiBAfVxuICAgICAgICAgICAgKVxuICAgICAgICApXG5cbiAgICAgICAgIyBSRU5ERVJJTkdcbiAgICAgICAgQF9jbGVhbigpXG4gICAgICAgIEBfcmVuZGVyKClcblxuXG4gICAgX3JlbmRlcjogKCkgLT5cbiAgICAgICAgQGlzb2xhdG9yTGF5ZXIgPSBuZXcgTGF5ZXIoXG4gICAgICAgICAgICBfLm1lcmdlKFxuICAgICAgICAgICAgICAgIHt9XG4gICAgICAgICAgICAgICAgQHRvcENvbnRhaW5lckxheWVyLmZyYW1lXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFwidHJhbnNwYXJlbnRcIlxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IEB0b3BDb250YWluZXJMYXllclxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIClcbiAgICAgICAgKVxuXG4gICAgICAgIG1vbnRoc0JveExheWVyID0gbmV3IExheWVyXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFwidHJhbnNwYXJlbnRcIlxuICAgICAgICAgICAgcGFyZW50OiBAaXNvbGF0b3JMYXllclxuICAgICAgICAgICAgeDogQG1vbnRoc0JveFN0eWxlLnBhZGRpbmcubGVmdFxuICAgICAgICAgICAgeTogQG1vbnRoc0JveFN0eWxlLnBhZGRpbmcudG9wXG4gICAgICAgICAgICB3aWR0aDogKFxuICAgICAgICAgICAgICAgIEBpc29sYXRvckxheWVyLndpZHRoICtcbiAgICAgICAgICAgICAgICAoLUBtb250aHNCb3hTdHlsZS5wYWRkaW5nLmxlZnQpICtcbiAgICAgICAgICAgICAgICAoLUBtb250aHNCb3hTdHlsZS5wYWRkaW5nLnJpZ2h0KVxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgaGVpZ2h0OiAoXG4gICAgICAgICAgICAgICAgQGlzb2xhdG9yTGF5ZXIuaGVpZ2h0ICtcbiAgICAgICAgICAgICAgICAoLUBtb250aHNCb3hTdHlsZS5wYWRkaW5nLnRvcCkgK1xuICAgICAgICAgICAgICAgICgtIEBtb250aHNCb3hTdHlsZS5wYWRkaW5nLmJvdHRvbSlcbiAgICAgICAgICAgIClcblxuICAgICAgICBmb3IgbW9udGhJbmRleCBpbiBbMC4uLkBudW1iZXJPZk1vbnRoc1Nob3ddXG5cbiAgICAgICAgICAgICMgU0VDVElPTjogbW9udGhcbiAgICAgICAgICAgIG1vbnRoTGF5ZXIgPSBuZXcgTGF5ZXIoXG4gICAgICAgICAgICAgICAgXy5tZXJnZShcbiAgICAgICAgICAgICAgICAgICAge31cbiAgICAgICAgICAgICAgICAgICAgQGRhdGVzQm94U3R5bGUsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogbW9udGhzQm94TGF5ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IG1vbnRoSW5kZXggKiAobW9udGhzQm94TGF5ZXIud2lkdGggLyBAbnVtYmVyT2ZNb250aHNTaG93KVxuICAgICAgICAgICAgICAgICAgICAgICAgeTogMFxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IChtb250aHNCb3hMYXllci53aWR0aCAvIEBudW1iZXJPZk1vbnRoc1Nob3cpXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IG1vbnRoc0JveExheWVyLmhlaWdodFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgY29udGVudEJveExheWVyID0gbmV3IExheWVyXG4gICAgICAgICAgICAgICAgcGFyZW50OiBtb250aExheWVyXG5cbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFwidHJhbnNwYXJlbnRcIlxuICAgICAgICAgICAgICAgIHg6IEBkYXRlc0JveFN0eWxlLnBhZGRpbmcubGVmdFxuICAgICAgICAgICAgICAgIHk6IEBkYXRlc0JveFN0eWxlLnBhZGRpbmcudG9wXG4gICAgICAgICAgICAgICAgd2lkdGg6IChcbiAgICAgICAgICAgICAgICAgICAgbW9udGhMYXllci53aWR0aCArXG4gICAgICAgICAgICAgICAgICAgICgtQGRhdGVzQm94U3R5bGUucGFkZGluZy5sZWZ0KSArXG4gICAgICAgICAgICAgICAgICAgICgtQGRhdGVzQm94U3R5bGUucGFkZGluZy5yaWdodClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAoXG4gICAgICAgICAgICAgICAgICAgIG1vbnRoTGF5ZXIuaGVpZ2h0ICtcbiAgICAgICAgICAgICAgICAgICAgKC1AZGF0ZXNCb3hTdHlsZS5wYWRkaW5nLnRvcCkgK1xuICAgICAgICAgICAgICAgICAgICAoLUBkYXRlc0JveFN0eWxlLnBhZGRpbmcuYm90dG9tKVxuICAgICAgICAgICAgICAgIClcblxuICAgICAgICAgICAgIyBTRUNUSU9OOiBkYXlzIHJlbmRlcmluZyBwcmUtY2FsY1xuICAgICAgICAgICAgZmlyc3RPZk1vbnRoID0gbmV3IERhdGUoXG4gICAgICAgICAgICAgICAgQHN0YXJ0RGF0ZVNob3cuZ2V0RnVsbFllYXIoKSxcbiAgICAgICAgICAgICAgICBAc3RhcnREYXRlU2hvdy5nZXRNb250aCgpICsgbW9udGhJbmRleCxcbiAgICAgICAgICAgICAgICAxXG4gICAgICAgICAgICApXG5cbiAgICAgICAgICAgIGZpcnN0R3JpZERhdGUgPSBuZXcgRGF0ZShmaXJzdE9mTW9udGgpXG4gICAgICAgICAgICB3aGlsZSBmaXJzdEdyaWREYXRlLmdldERheSgpICE9IEBmaXJzdENvbHVtbkRheVxuICAgICAgICAgICAgICAgIGZpcnN0R3JpZERhdGUgPSBmaXJzdEdyaWREYXRlLmFkZERheXMoLTEpXG5cbiAgICAgICAgICAgICMgU0VDVElPTjogaGVhZGVyc1xuICAgICAgICAgICAgbW9udGhIZWFkZXJMYXllciA9IG5ldyBUZXh0TGF5ZXIoXG4gICAgICAgICAgICAgICAgXy5tZXJnZShcbiAgICAgICAgICAgICAgICAgICAge31cbiAgICAgICAgICAgICAgICAgICAgQG1vbnRoSGVhZGVyU3R5bGUsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogY29udGVudEJveExheWVyXG4gICAgICAgICAgICAgICAgICAgICAgICB4OiAwXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiAwXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogY29udGVudEJveExheWVyLndpZHRoXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiI3ttb250aE5hbWVzVXBwZXJjYXNlW2ZpcnN0T2ZNb250aC5nZXRNb250aCgpXX0gI3tmaXJzdE9mTW9udGguZ2V0RnVsbFllYXIoKX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ1bmNhdGU6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgIClcblxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIG1vbnRoSW5kZXggPT0gMCBhbmRcbiAgICAgICAgICAgICAgICBAYnV0dG9uUHJldlNob3dcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICBAYnRuUHJldkJveExheWVyID0gbmV3IExheWVyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogbW9udGhIZWFkZXJMYXllclxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFwidHJhbnNwYXJlbnRcIlxuICAgICAgICAgICAgICAgICAgICB4OiAwXG4gICAgICAgICAgICAgICAgICAgIHk6IDBcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IG1vbnRoSGVhZGVyTGF5ZXIud2lkdGggLyA0XG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogbW9udGhIZWFkZXJMYXllci5oZWlnaHRcbiAgICAgICAgICAgICAgICBidG5QcmV2QXJyb3dMYXllciA9IG5ldyBUZXh0TGF5ZXJcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBAYnRuUHJldkJveExheWVyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogXCJ0cmFuc3BhcmVudFwiXG4gICAgICAgICAgICAgICAgICAgIHg6IDBcbiAgICAgICAgICAgICAgICAgICAgeTogMFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogQGJ0blByZXZCb3hMYXllci53aWR0aCAvIDNcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBAYnRuUHJldkJveExheWVyLmhlaWdodFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIjxcIlxuICAgICAgICAgICAgICAgICAgICB0ZXh0QWxpZ246IFwibGVmdFwiXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiBcIiMzQzQ0NERcIlxuXG4gICAgICAgICAgICAgICAgICAgICMgaGFja3kuLi5cbiAgICAgICAgICAgICAgICAgICAgZm9udFNpemU6IEBidXR0b25zU3R5bGUuZm9udFNpemUgKiAyXG4gICAgICAgICAgICAgICAgICAgIGZvbnRGYW1pbHk6IFwiLWFwcGxlLXN5c3RlbVwiXG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6XG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNhbDogKEBidG5QcmV2Qm94TGF5ZXIuaGVpZ2h0IC0gMypAYnV0dG9uc1N0eWxlLmZvbnRTaXplKSAvIDJcbiAgICAgICAgICAgICAgICBidG5QcmV2TGFiZWxMYXllciA9IG5ldyBUZXh0TGF5ZXIoXG4gICAgICAgICAgICAgICAgICAgIF8ubWVyZ2UoXG4gICAgICAgICAgICAgICAgICAgICAgICB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgQGJ1dHRvbnNTdHlsZVxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogQGJ0blByZXZCb3hMYXllclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IEBidG5QcmV2Qm94TGF5ZXIud2lkdGggLyAzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBAYnRuUHJldkJveExheWVyLndpZHRoICogMiAvIDNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IEBidG5QcmV2Qm94TGF5ZXIuaGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogXCIje21vbnRoQWJicmV2c1VwcGVyY2FzZVsoZmlyc3RPZk1vbnRoLmdldE1vbnRoKCkgKyAxMiAtIDEpICUgMTJdfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dEFsaWduOiBcImxlZnRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiBcIiMzQzQ0NERcIlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIyBoYWNreSAuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNhbDogKEBidG5QcmV2Qm94TGF5ZXIuaGVpZ2h0IC0gMS41KkBidXR0b25zU3R5bGUuZm9udFNpemUpIC8gMlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIEBidG5QcmV2Qm94TGF5ZXIub25UYXAgPT5cbiAgICAgICAgICAgICAgICAgICAgQHNldFN0YXJ0RGF0ZVNob3cgQHN0YXJ0RGF0ZVNob3cuYWRkTW9udGhzKC0xKVxuXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgbW9udGhJbmRleCA9PSBAbnVtYmVyT2ZNb250aHNTaG93IC0gMSBhbmRcbiAgICAgICAgICAgICAgICBAYnV0dG9uTmV4dFNob3dcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICBAYnRuTmV4dEJveExheWVyID0gbmV3IExheWVyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogbW9udGhIZWFkZXJMYXllclxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFwidHJhbnNwYXJlbnRcIlxuICAgICAgICAgICAgICAgICAgICB4OiBtb250aEhlYWRlckxheWVyLndpZHRoICogMyAvIDRcbiAgICAgICAgICAgICAgICAgICAgeTogMFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogbW9udGhIZWFkZXJMYXllci53aWR0aCAvIDRcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBtb250aEhlYWRlckxheWVyLmhlaWdodFxuICAgICAgICAgICAgICAgIGJ0bk5leHRBcnJvd0xheWVyID0gbmV3IFRleHRMYXllclxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IEBidG5OZXh0Qm94TGF5ZXJcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBcInRyYW5zcGFyZW50XCJcbiAgICAgICAgICAgICAgICAgICAgeDogQGJ0bk5leHRCb3hMYXllci53aWR0aCAqIDIgLyAzXG4gICAgICAgICAgICAgICAgICAgIHk6IDBcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IEBidG5OZXh0Qm94TGF5ZXIud2lkdGggLyAzXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogQGJ0bk5leHRCb3hMYXllci5oZWlnaHRcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCI+XCJcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IFwiIzNDNDQ0RFwiXG4gICAgICAgICAgICAgICAgICAgIHRleHRBbGlnbjogXCJyaWdodFwiXG5cbiAgICAgICAgICAgICAgICAgICAgIyBoYWNreS4uLlxuICAgICAgICAgICAgICAgICAgICBmb250U2l6ZTogQGJ1dHRvbnNTdHlsZS5mb250U2l6ZSAqIDJcbiAgICAgICAgICAgICAgICAgICAgZm9udEZhbWlseTogXCItYXBwbGUtc3lzdGVtXCJcbiAgICAgICAgICAgICAgICAgICAgcGFkZGluZzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2FsOiAoQGJ0bk5leHRCb3hMYXllci5oZWlnaHQgLSAzKkBidXR0b25zU3R5bGUuZm9udFNpemUpIC8gMlxuXG4gICAgICAgICAgICAgICAgYnRuTmV4dExhYmVsTGF5ZXIgPSBuZXcgVGV4dExheWVyKFxuICAgICAgICAgICAgICAgICAgICBfLm1lcmdlKFxuICAgICAgICAgICAgICAgICAgICAgICAge31cbiAgICAgICAgICAgICAgICAgICAgICAgIEBidXR0b25zU3R5bGVcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IEBidG5OZXh0Qm94TGF5ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBAYnRuTmV4dEJveExheWVyLndpZHRoICogMiAvIDNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IEBidG5OZXh0Qm94TGF5ZXIuaGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogXCIje21vbnRoQWJicmV2c1VwcGVyY2FzZVsoZmlyc3RPZk1vbnRoLmdldE1vbnRoKCkgKyAxKSAlIDEyXX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHRBbGlnbjogXCJyaWdodFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6IFwiIzNDNDQ0RFwiXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAjIGhhY2t5IC4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2FsOiAoQGJ0bk5leHRCb3hMYXllci5oZWlnaHQgLSAxLjUqQGJ1dHRvbnNTdHlsZS5mb250U2l6ZSkgLyAyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgQGJ0bk5leHRCb3hMYXllci5vblRhcCA9PlxuICAgICAgICAgICAgICAgICAgICBAc2V0U3RhcnREYXRlU2hvdyBAc3RhcnREYXRlU2hvdy5hZGRNb250aHMoMSlcblxuXG4gICAgICAgICAgICB3ZWVrSGVhZGVyTGF5ZXIgPSBuZXcgTGF5ZXJcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFwidHJhbnNwYXJlbnRcIlxuICAgICAgICAgICAgICAgIHg6IDBcbiAgICAgICAgICAgICAgICB5OiBtb250aEhlYWRlckxheWVyLnkgKyBtb250aEhlYWRlckxheWVyLmhlaWdodFxuICAgICAgICAgICAgICAgIHdpZHRoOiBjb250ZW50Qm94TGF5ZXIud2lkdGhcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IEB3ZWVrSGVhZGVyU3R5bGUuaGVpZ2h0XG4gICAgICAgICAgICAgICAgcGFyZW50OiBjb250ZW50Qm94TGF5ZXJcblxuICAgICAgICAgICAgIyBTdHlsaW5nIGZvciB3ZWVrSGVhZGVyTGF5ZXIgaW50ZW50aW9uYWxseSB1c2VkIGZvciBpdHMgY2hpbGRyZW4uLi5cbiAgICAgICAgICAgIGZvciBkYXlJbmRleCBpbiBbMC4uLjddXG4gICAgICAgICAgICAgICAgbmV3IFRleHRMYXllcihcbiAgICAgICAgICAgICAgICAgICAgXy5tZXJnZShcbiAgICAgICAgICAgICAgICAgICAgICAgIHt9XG4gICAgICAgICAgICAgICAgICAgICAgICBAd2Vla0hlYWRlclN0eWxlXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogZGF5SW5kZXggKiAoY29udGVudEJveExheWVyLndpZHRoIC8gNylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGNvbnRlbnRCb3hMYXllci53aWR0aCAvIDdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHdlZWtIZWFkZXJMYXllci5oZWlnaHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IHdlZWtIZWFkZXJMYXllclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiI3tkYXlBYmJyZXZzWyhkYXlJbmRleCArIEBmaXJzdENvbHVtbkRheSkgJSA3XX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRydW5jYXRlOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICApXG5cbiAgICAgICAgICAgICMgU0VDVElPTjogZGF0ZSBjZWxsc1xuICAgICAgICAgICAgZGF5c0dyaWRMYXllciA9IG5ldyBMYXllclxuICAgICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogXCJ0cmFuc3BhcmVudFwiXG4gICAgICAgICAgICAgICAgeDogMFxuICAgICAgICAgICAgICAgIHk6IHdlZWtIZWFkZXJMYXllci55ICsgd2Vla0hlYWRlckxheWVyLmhlaWdodFxuICAgICAgICAgICAgICAgIHdpZHRoOiBjb250ZW50Qm94TGF5ZXIud2lkdGhcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IChcbiAgICAgICAgICAgICAgICAgICAgY29udGVudEJveExheWVyLmhlaWdodCArXG4gICAgICAgICAgICAgICAgICAgICgtbW9udGhIZWFkZXJMYXllci5oZWlnaHQpICtcbiAgICAgICAgICAgICAgICAgICAgKC13ZWVrSGVhZGVyTGF5ZXIuaGVpZ2h0KSArXG4gICAgICAgICAgICAgICAgICAgICgtQGRhdGVzQm94U3R5bGUucGFkZGluZy50b3ApICtcbiAgICAgICAgICAgICAgICAgICAgKC1AZGF0ZXNCb3hTdHlsZS5wYWRkaW5nLmJvdHRvbSlcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgcGFyZW50OiBjb250ZW50Qm94TGF5ZXJcblxuICAgICAgICAgICAgZGF0ZVJlbmRlcmluZyA9IGZpcnN0R3JpZERhdGVcbiAgICAgICAgICAgIGZvciByb3cgaW4gWzAuLi42XVxuICAgICAgICAgICAgICAgIGZvciBjb2x1bW4gaW4gWzAuLi43XVxuICAgICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICBAb3V0c2lkZU1vbnRoRGF0ZXNTaG93IG9yXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlUmVuZGVyaW5nLmdldE1vbnRoKCkgPT0gZmlyc3RPZk1vbnRoLmdldE1vbnRoKClcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgaXNPdXRzaWRlTW9udGggPSBkYXRlUmVuZGVyaW5nLmdldE1vbnRoKCkgIT0gZmlyc3RPZk1vbnRoLmdldE1vbnRoKClcblxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUNlbGxCb3hMYXllciA9IG5ldyBMYXllclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogZGF5c0dyaWRMYXllclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogXCJ0cmFuc3BhcmVudFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogcm93ICogZGF5c0dyaWRMYXllci5oZWlnaHQgLyA2XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogY29sdW1uICogZGF5c0dyaWRMYXllci53aWR0aCAvIDdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGRheXNHcmlkTGF5ZXIuaGVpZ2h0IC8gNlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBkYXlzR3JpZExheWVyLndpZHRoIC8gN1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBleHRyYVN0eWxlID0ge31cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIG5vdCBpc091dHNpZGVNb250aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICMgYWRkIHRvIHRoZSBtYXAgYWRkcmVzc2FibGUgYnkgZGF0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBkYXRlQ2VsbEJveExheWVyRGljdFtkYXRlUmVuZGVyaW5nXSA9IGRhdGVDZWxsQm94TGF5ZXJcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICMgZXh0cmEgc3R5bGVzIGZvciBoaWdobGlnaHQgcmFuZ2VzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIGhpZ2hsaWdoUmFuZ2UgaW4gQGhpZ2hsaWdodERhdGVSYW5nZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGlnaGxpZ2hSYW5nZS5kYXRlUmFuZ2VTdGFydCA8PSBkYXRlUmVuZGVyaW5nIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZVJlbmRlcmluZyA8PSBoaWdobGlnaFJhbmdlLmRhdGVSYW5nZUVuZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLm1lcmdlIGV4dHJhU3R5bGUsIGhpZ2hsaWdoUmFuZ2UuZGF0ZUV4dHJhU3R5bGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAjIGV4dHJhIHN0eWxlIGZvciBvdXRzaWRlLW1vbnRoIGRhdGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFTdHlsZSA9IEBkYXRlT3V0c2lkZU1vbnRoRXh0cmFTdHlsZVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlQ2VsbExheWVyID0gbmV3IFRleHRMYXllcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLm1lcmdlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBAZGF0ZUJhc2VTdHlsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IGRhdGVDZWxsQm94TGF5ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IEBkYXRlQmFzZVN0eWxlLm1hcmdpbi5sZWZ0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBAZGF0ZUJhc2VTdHlsZS5tYXJnaW4udG9wXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVDZWxsQm94TGF5ZXIud2lkdGggK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgtQGRhdGVCYXNlU3R5bGUubWFyZ2luLmxlZnQpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoLUBkYXRlQmFzZVN0eWxlLm1hcmdpbi5yaWdodClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVDZWxsQm94TGF5ZXIuaGVpZ2h0ICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoLUBkYXRlQmFzZVN0eWxlLm1hcmdpbi50b3ApICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoLUBkYXRlQmFzZVN0eWxlLm1hcmdpbi5ib3R0b20pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIiN7ZGF0ZVJlbmRlcmluZy5nZXREYXRlKCl9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYVN0eWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUNlbGxCb3hMYXllci5kYXRlID0gZGF0ZVJlbmRlcmluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUNlbGxCb3hMYXllci5kYXRlQ2VsbExheWVyID0gZGF0ZUNlbGxMYXllclxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiBub3QgaXNPdXRzaWRlTW9udGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmID0gQFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIyBIYW5kbGUgc2VsZWN0aW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUNlbGxMYXllci55ZXNTZWxlY3RlZFN0eWxlID0gQGRhdGVTZWxlY3RlZEV4dHJhU3R5bGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlQ2VsbExheWVyLm5vU2VsZWN0ZWRTdHlsZSA9IF8ucGljayBkYXRlQ2VsbExheWVyLCBfLmtleXMgQGRhdGVTZWxlY3RlZEV4dHJhU3R5bGVcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvIChkYXRlQ2VsbEJveExheWVyLCBzZWxmKSAtPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlQ2VsbEJveExheWVyLm9uVGFwICgpIC0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiBub3Qgc2VsZi5lbmFibGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5kYXRlUmFuZ2VTZWxlY3RlZFN0YXJ0ID09IHVuZGVmaW5lZCBvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vdCBzZWxmLmRhdGVSYW5nZVNlbGVjdGFibGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnNldERhdGVSYW5nZVNlbGVjdGVkKGRhdGVDZWxsQm94TGF5ZXIuZGF0ZSwgZGF0ZUNlbGxCb3hMYXllci5kYXRlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuX25leHRDaGFuZ2VEYXRlUmFuZ2VTdGFydCBvciBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnNldERhdGVSYW5nZVNlbGVjdGVkKHNlbGYuZGF0ZVJhbmdlU2VsZWN0ZWRTdGFydCwgZGF0ZUNlbGxCb3hMYXllci5kYXRlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc2V0RGF0ZVJhbmdlU2VsZWN0ZWQoZGF0ZUNlbGxCb3hMYXllci5kYXRlLCBzZWxmLmRhdGVSYW5nZVNlbGVjdGVkRW5kKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fbmV4dENoYW5nZURhdGVSYW5nZVN0YXJ0ID0gbm90IChzZWxmLl9uZXh0Q2hhbmdlRGF0ZVJhbmdlU3RhcnQgb3IgZmFsc2UpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAjIEhhbmRsZSBob3ZlcmluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIEBob3ZlckVuYWJsZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUNlbGxMYXllci55ZXNIb3ZlcmVkU3R5bGUgPSBAZGF0ZUhvdmVyZWRFeHRyYVN0eWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVDZWxsTGF5ZXIubm9Ib3ZlcmVkU3R5bGUgPSBfLnBpY2sgZGF0ZUNlbGxMYXllciwgXy5rZXlzIEBkYXRlSG92ZXJlZEV4dHJhU3R5bGVcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkbyAoZGF0ZUNlbGxCb3hMYXllciwgZGF0ZUNlbGxMYXllciwgc2VsZikgLT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVDZWxsQm94TGF5ZXIub24gRXZlbnRzLk1vdXNlT3ZlciwgKGV2ZW50LCBsYXllcikgLT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmFzc2lnbiBkYXRlQ2VsbExheWVyLCBkYXRlQ2VsbExheWVyLnllc0hvdmVyZWRTdHlsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUNlbGxCb3hMYXllci5vbiBFdmVudHMuTW91c2VPdXQsIChldmVudCwgbGF5ZXIpIC0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5hc3NpZ24gZGF0ZUNlbGxMYXllciwgZGF0ZUNlbGxMYXllci5ub0hvdmVyZWRTdHlsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLl9pc0RhdGVTZWxlY3RlZChkYXRlQ2VsbEJveExheWVyLmRhdGUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmFzc2lnbiBkYXRlQ2VsbExheWVyLCBkYXRlQ2VsbExheWVyLnllc1NlbGVjdGVkU3R5bGVcblxuICAgICAgICAgICAgICAgICAgICBkYXRlUmVuZGVyaW5nID0gZGF0ZVJlbmRlcmluZy5hZGREYXlzKDEpXG5cbiAgICAgICAgICAgICMgQWZ0ZXIgdGhlIHJlbmRlcmluZywgc2V0IHRoZSBpbml0aWFsIHNlbGVjdGVkIHJhbmdlXG4gICAgICAgICAgICBAc2V0RGF0ZVJhbmdlU2VsZWN0ZWQoQGRhdGVSYW5nZVNlbGVjdGVkU3RhcnQsIEBkYXRlUmFuZ2VTZWxlY3RlZEVuZCwgZmFsc2UpXG5cbiAgICBfaXNEYXRlU2VsZWN0ZWQ6IChkYXRlKSAtPlxuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgQGRhdGVSYW5nZVNlbGVjdGVkU3RhcnQgPD0gZGF0ZSBhbmRcbiAgICAgICAgICAgIGRhdGUgPD0gQGRhdGVSYW5nZVNlbGVjdGVkRW5kXG4gICAgICAgIClcblxuICAgIF9jbGVhbjogKCkgLT5cbiAgICAgICAgQGlzb2xhdG9yTGF5ZXI/LmRlc3Ryb3koKVxuXG4gICAgIyBJTlRFUkZBQ0UgTUVUSE9EU1xuICAgIGdldFN0YXJ0RGF0ZVNob3c6ICgpIC0+XG4gICAgICAgIHJldHVybiBAc3RhcnREYXRlU2hvd1xuXG4gICAgc2V0U3RhcnREYXRlU2hvdzogKGN1cnJlbnRTdGFydERhdGVTaG93KSAtPlxuICAgICAgICBwcmV2aW91c1N0YXJ0RGF0ZVNob3cgPSBAc3RhcnREYXRlU2hvd1xuXG4gICAgICAgIEBzdGFydERhdGVTaG93ID0gY3VycmVudFN0YXJ0RGF0ZVNob3dcbiAgICAgICAgQF9jbGVhbigpXG4gICAgICAgIEBfcmVuZGVyKClcblxuICAgICAgICBAaGFuZGxlTW9udGhzU2hvd0NoYW5nZShwcmV2aW91c1N0YXJ0RGF0ZVNob3csIGN1cnJlbnRTdGFydERhdGVTaG93KVxuXG4gICAgZ2V0RGF0ZVJhbmdlU2VsZWN0ZWRTdGFydDogKCkgLT5cbiAgICAgICAgcmV0dXJuIEBkYXRlUmFuZ2VTZWxlY3RlZFN0YXJ0XG5cbiAgICBnZXREYXRlUmFuZ2VTZWxlY3RlZEVuZDogKCkgLT5cbiAgICAgICAgcmV0dXJuIEBkYXRlUmFuZ2VTZWxlY3RlZEVuZFxuXG4gICAgc2V0RGF0ZVJhbmdlU2VsZWN0ZWQ6IChjdXJyZW50RGF0ZVJhbmdlU2VsZWN0ZWRTdGFydCwgY3VycmVudERhdGVSYW5nZVNlbGVjdGVkRW5kLCB0cmlnZ2VySGFuZGxlciA9IHRydWUpIC0+XG4gICAgICAgIGlmIGN1cnJlbnREYXRlUmFuZ2VTZWxlY3RlZFN0YXJ0ID4gY3VycmVudERhdGVSYW5nZVNlbGVjdGVkRW5kXG4gICAgICAgICAgICBbY3VycmVudERhdGVSYW5nZVNlbGVjdGVkU3RhcnQsIGN1cnJlbnREYXRlUmFuZ2VTZWxlY3RlZEVuZF0gPVxuICAgICAgICAgICAgICAgIFtjdXJyZW50RGF0ZVJhbmdlU2VsZWN0ZWRFbmQsIGN1cnJlbnREYXRlUmFuZ2VTZWxlY3RlZFN0YXJ0XVxuXG4gICAgICAgIHByZXZpb3VzRGF0ZVJhbmdlU2VsZWN0ZWRTdGFydCA9IEBkYXRlUmFuZ2VTZWxlY3RlZFN0YXJ0XG4gICAgICAgIHByZXZpb3VzRGF0ZVJhbmdlU2VsZWN0ZWRFbmQgPSBAZGF0ZVJhbmdlU2VsZWN0ZWRFbmRcblxuICAgICAgICAjIC4uLiB1bnNlbGVjdCBwcmV2aW91c2x5IHNlbGVjdGVkXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIHByZXZpb3VzRGF0ZVJhbmdlU2VsZWN0ZWRTdGFydCAhPSB1bmRlZmluZWQgYW5kXG4gICAgICAgICAgICBwcmV2aW91c0RhdGVSYW5nZVNlbGVjdGVkRW5kICE9IHVuZGVmaW5lZFxuICAgICAgICApXG4gICAgICAgICAgICBjdXJyZW50RGF0ZSA9IHByZXZpb3VzRGF0ZVJhbmdlU2VsZWN0ZWRTdGFydFxuICAgICAgICAgICAgd2hpbGUgY3VycmVudERhdGUgPD0gcHJldmlvdXNEYXRlUmFuZ2VTZWxlY3RlZEVuZFxuICAgICAgICAgICAgICAgIGRhdGVDZWxsTGF5ZXIgPSBAZGF0ZUNlbGxCb3hMYXllckRpY3RbY3VycmVudERhdGVdLmRhdGVDZWxsTGF5ZXJcbiAgICAgICAgICAgICAgICBfLmFzc2lnbiBkYXRlQ2VsbExheWVyLCBkYXRlQ2VsbExheWVyLm5vU2VsZWN0ZWRTdHlsZVxuICAgICAgICAgICAgICAgIGN1cnJlbnREYXRlID0gY3VycmVudERhdGUuYWRkRGF5cygxKVxuXG4gICAgICAgICMgLi4uIHNlbGVjdCBjdXJyZW50bHkgc2VsZWN0ZWRcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgY3VycmVudERhdGVSYW5nZVNlbGVjdGVkU3RhcnQgIT0gdW5kZWZpbmVkIGFuZFxuICAgICAgICAgICAgY3VycmVudERhdGVSYW5nZVNlbGVjdGVkRW5kICE9IHVuZGVmaW5lZFxuICAgICAgICApXG4gICAgICAgICAgICBjdXJyZW50RGF0ZSA9IGN1cnJlbnREYXRlUmFuZ2VTZWxlY3RlZFN0YXJ0XG4gICAgICAgICAgICB3aGlsZSBjdXJyZW50RGF0ZSA8PSBjdXJyZW50RGF0ZVJhbmdlU2VsZWN0ZWRFbmRcbiAgICAgICAgICAgICAgICBkYXRlQ2VsbExheWVyID0gQGRhdGVDZWxsQm94TGF5ZXJEaWN0W2N1cnJlbnREYXRlXS5kYXRlQ2VsbExheWVyXG4gICAgICAgICAgICAgICAgXy5hc3NpZ24gZGF0ZUNlbGxMYXllciwgZGF0ZUNlbGxMYXllci55ZXNTZWxlY3RlZFN0eWxlXG4gICAgICAgICAgICAgICAgY3VycmVudERhdGUgPSBjdXJyZW50RGF0ZS5hZGREYXlzKDEpXG5cbiAgICAgICAgIyAuLi4gdXBkYXRlIHRoZSBuZXdlc3Qgc3RhdGVcbiAgICAgICAgQGRhdGVSYW5nZVNlbGVjdGVkU3RhcnQgPSBjdXJyZW50RGF0ZVJhbmdlU2VsZWN0ZWRTdGFydFxuICAgICAgICBAZGF0ZVJhbmdlU2VsZWN0ZWRFbmQgPSBjdXJyZW50RGF0ZVJhbmdlU2VsZWN0ZWRFbmRcblxuICAgICAgICAjIC4uLiBjYWxsIHRoZSBoYW5kbGVyXG4gICAgICAgIGlmIHRyaWdnZXJIYW5kbGVyXG4gICAgICAgICAgICBAaGFuZGxlRGF0ZVJhbmdlU2VsZWN0ZWRDaGFuZ2UoXG4gICAgICAgICAgICAgICAgcHJldmlvdXNEYXRlUmFuZ2VTZWxlY3RlZFN0YXJ0XG4gICAgICAgICAgICAgICAgcHJldmlvdXNEYXRlUmFuZ2VTZWxlY3RlZEVuZFxuICAgICAgICAgICAgICAgIGN1cnJlbnREYXRlUmFuZ2VTZWxlY3RlZFN0YXJ0XG4gICAgICAgICAgICAgICAgY3VycmVudERhdGVSYW5nZVNlbGVjdGVkRW5kXG4gICAgICAgICAgICApXG5cbiAgICBnZXRIaWdobGlnaHREYXRlUmFuZ2VzOiAoKSAtPlxuICAgICAgICByZXR1cm4gQGhpZ2hsaWdodERhdGVSYW5nZXNcblxuICAgIHNldEhpZ2hsaWdodERhdGVSYW5nZXM6IChoaWdobGlnaHREYXRlUmFuZ2VzKSAtPlxuICAgICAgICBAaGlnaGxpZ2h0RGF0ZVJhbmdlcyA9IGhpZ2hsaWdodERhdGVSYW5nZXNcbiAgICAgICAgQF9jbGVhbigpXG4gICAgICAgIEBfcmVuZGVyKClcblxuICAgIHNldEhhbmRsZU1vbnRoc1Nob3dDaGFuZ2U6IChoYW5kbGVyKSAtPlxuICAgICAgICBAaGFuZGxlTW9udGhzU2hvd0NoYW5nZSA9IGhhbmRsZXJcblxuICAgIHNldEhhbmRsZURhdGVSYW5nZVNlbGVjdGVkQ2hhbmdlOiAoaGFuZGxlcikgLT5cbiAgICAgICAgQGhhbmRsZURhdGVSYW5nZVNlbGVjdGVkQ2hhbmdlID0gaGFuZGxlclxuIiwiIyBDb3B5cmlnaHQgKGMpIDIwMTggTmF0YWxpZSBNYXJsZW55XG4jIENhc2luZyAtIFVJIGZyYW1ld29yayBmb3IgRnJhbWVyXG4jIExpY2Vuc2U6IE1JVFxuIyBVUkw6IGh0dHBzOi8vZ2l0aHViLmNvbS9uYXRhbGllbWFybGVueS9DYXNpbmdcblxuXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFV0aWxpdHkgZnVuY3Rpb25zXG5leHBvcnRzLmdldFNjcmVlbkZyYW1lUG9pbnQgPSAobGF5ZXIpIC0+IChfLnBpY2sgbGF5ZXIuc2NyZWVuRnJhbWUsIFsneCcsICd5J10pXG5cbmV4cG9ydHMuc2l6ZVBvc2l0aW9uQXBwbHkgPSAoc291cmNlQ29tcCwgdGFyZ2V0Q29tcCkgLT5cbiAgICB0YXJnZXRDb21wLnBhcmVudCA9IHNvdXJjZUNvbXAucGFyZW50XG4gICAgXy5hc3NpZ24gdGFyZ2V0Q29tcCwgc291cmNlQ29tcC5mcmFtZVxuXG5leHBvcnRzLmF1dG9Qb3NpdGlvbiA9IChwYXJlbnRDb21wLCByZWZlcmVuY2VDb21wLCBjb21wcykgLT5cbiAgICByZWZlcmVuY2VGcmFtZVBvaW50ID0gXy5jbG9uZURlZXAoZXhwb3J0cy5nZXRTY3JlZW5GcmFtZVBvaW50KHJlZmVyZW5jZUNvbXApKVxuICAgIGZvciBjb21wTmFtZSwgY29tcCBvZiBjb21wc1xuICAgICAgICBfLmFzc2lnbiBjb21wLCAoXy5tZXJnZVdpdGggZXhwb3J0cy5nZXRTY3JlZW5GcmFtZVBvaW50KGNvbXApLCByZWZlcmVuY2VGcmFtZVBvaW50LCBfLnN1YnRyYWN0KVxuICAgIF8uYXNzaWduKGNvbXAsIHtwYXJlbnQ6IHBhcmVudENvbXB9KSBmb3IgY29tcE5hbWUsIGNvbXAgb2YgY29tcHNcblxuZXhwb3J0cy5pbnZva2VPbmNlID0gKGZ1bmMpIC0+XG4gICAgcmV0dXJuIHtcbiAgICAgICAgJ2ludm9rZU9uY2UnOiB0cnVlXG4gICAgICAgICdmdW5jJzogZnVuY1xuICAgIH1cblxuZXhwb3J0cy5jb25zdHJ1Y3RNb2R1bGUgPSAobW9kdWxlTmFtZSkgLT5cbiAgICAtPlxuICAgICAgICBtb2R1bGUgPSByZXF1aXJlIG1vZHVsZU5hbWVcbiAgICAgICAgbmV3IG1vZHVsZVttb2R1bGVOYW1lXVxuXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFB1cnBvc2Ugb2YgZGF0YS1idW5kbGVzOiBjaGFuZ2VzIHByb3BhZ2F0aW9uLCBoaXN0b3J5IG9mIHZhbHVlcywgY3VzdG9tIHByb3BlcnRpZXNcbmNsYXNzIERhdGFCdW5kbGVcbiAgICBjb25zdHJ1Y3RvcjogKEBfY29tcG9uZW50TmFtZSwgQF9kYXRhTmFtZSwgQF9kYXRhVmFsdWUsIEBfYXBwKSAtPlxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkgRGF0YUJ1bmRsZS5wcm90b3R5cGUsIFwidmFsdWVcIixcbiAgICBjb25maWd1cmFibGU6IHRydWVcblxuICAgIGdldDogKCkgLT4gKEBfZGF0YVZhbHVlKVxuICAgIHNldDogKG5ld1ZhbHVlKSAtPlxuXG4gICAgICAgICMgSWYgdGhlIG5ldyB2YWx1ZSBkaWZmZXJzIGZyb20gdGhlIHJlZ2lzdGVyZWQgdmFsdWVcbiAgICAgICAgaWYgQF9kYXRhVmFsdWUgIT0gbmV3VmFsdWVcblxuICAgICAgICAgICAgQF9kYXRhVmFsdWUgPSBuZXdWYWx1ZVxuICAgICAgICAgICAgQF9hcHAuX3VwZGF0ZURhdGEoQF9jb21wb25lbnROYW1lLCBAX2RhdGFOYW1lLCBuZXdWYWx1ZSlcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5IERhdGFCdW5kbGUucHJvdG90eXBlLCBcIl9kYXRhXCIsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgZ2V0OiAoKSAtPiAoQF9hcHAuX2RhdGEpXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eSBEYXRhQnVuZGxlLnByb3RvdHlwZSwgXCJfaGlzdG9yeVwiLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIGdldDogKCkgLT4gKF8ubWFwIEBfYXBwLl9kYXRhSXNvbGF0ZWRIaXN0b3J5LCBcIiN7QF9jb21wb25lbnROYW1lfS4je0BfZGF0YU5hbWV9XCIpXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eSBEYXRhQnVuZGxlLnByb3RvdHlwZSwgXCJfaGlzdG9yeUNoYW5nZXNcIixcbiAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICBnZXQ6ICgpIC0+XG4gICAgICAgIHRyYWNrVHJhbnNpdGlvbnMgPSAoYWNjLCBuZXh0X2l0ZW0pIC0+XG4gICAgICAgICAgICBpZiBhY2MgPT0gW10gb3IgKG5vdCBfLmlzRXF1YWwoYWNjW2FjYy5sZW5ndGggLSAxXSwgbmV4dF9pdGVtKSlcbiAgICAgICAgICAgICAgICBhY2MucHVzaChuZXh0X2l0ZW0pXG4gICAgICAgICAgICByZXR1cm4gYWNjXG5cbiAgICAgICAgcmV0dXJuIF8ucmVkdWNlIEBfaGlzdG9yeSwgdHJhY2tUcmFuc2l0aW9ucywgW11cblxuIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBSZXRyaWV2ZXMgdGhlIG5hbWVzIG9mIHRoZSBmdW5jdGlvbiBwYXJhbWV0ZXJzIChmb3IgZGVwZW5kZW5jeS1pbmplY3Rpb24pXG4jIEFkYXB0ZWQgZnJvbTogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTAwNzk4MS9ob3ctdG8tZ2V0LWZ1bmN0aW9uLXBhcmFtZXRlci1uYW1lcy12YWx1ZXMtZHluYW1pY2FsbHlcblNUUklQX0NPTU1FTlRTID0gLygoXFwvXFwvLiokKXwoXFwvXFwqW1xcc1xcU10qP1xcKlxcLykpL21nXG5BUkdVTUVOVF9OQU1FUyA9IC8oW15cXHMsXSspL2dcbmdldFBhcmFtTmFtZXMgPSAoZnVuYykgLT5cbiAgICBmblN0ciA9IGZ1bmMudG9TdHJpbmcoKS5yZXBsYWNlKFNUUklQX0NPTU1FTlRTLCAnJylcbiAgICByZXN1bHQgPSBmblN0ci5zbGljZShmblN0ci5pbmRleE9mKCcoJykrMSwgZm5TdHIuaW5kZXhPZignKScpKS5tYXRjaChBUkdVTUVOVF9OQU1FUylcbiAgICBpZiByZXN1bHQgPT0gbnVsbFxuICAgICAgICByZXN1bHQgPSBbXVxuICAgIHJldHVybiByZXN1bHRcblxuIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBBcHBsaWNhdGlvbiBpbXBsZW1lbnRhdGlvbjogbWFuYWdlcyB0aGUgc2NyZWVucyBhbmQgZGF0YVxuIyBlbnRyeXBvaW50IG1ldGhvZFxuY2xhc3MgZXhwb3J0cy5BcHAgZXh0ZW5kcyBMYXllclxuICAgIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICAgICAgW19kLCBfdF0gPSBAX2xvZ19wZXJmb3JtYW5jZV9wcmVwKHRydWUpXG5cbiAgICAgICAgXy5kZWZhdWx0cyBvcHRpb25zLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBcIiNFRkVGRUZcIlxuICAgICAgICAgICAgZnJhbWU6IFNjcmVlbi5mcmFtZVxuICAgICAgICAgICAgIyBQYXR0ZXJuIHRvIHVzZSB3aGVuIGRldGVjdGluZyB3aXJpbmcgZnVuY3Rpb25zXG4gICAgICAgICAgICB3aXJlQ29tcG9uZW50TWV0aG9kUHJlZml4OiBcIndpcmluZ19cIlxuXG4gICAgICAgICAgICBzaG93RXJyb3JzOiB0cnVlXG4gICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWVcbiAgICAgICAgICAgIHNob3dQZXJmb3JtYW5jZTogZmFsc2VcbiAgICAgICAgICAgIGxvd1BlcmZvcm1hbmNlV2lkdGg6IDE0NVxuXG4gICAgICAgICAgICBkYXRhSW5pdDoge31cbiAgICAgICAgICAgIGRhdGFQcm9wZXJ0aWVzOiB7fVxuICAgICAgICBzdXBlciBvcHRpb25zXG5cbiAgICAgICAgXy5hc3NpZ24gQCwgXy5waWNrIG9wdGlvbnMsIFtcbiAgICAgICAgICAgICd3aXJlQ29tcG9uZW50TWV0aG9kUHJlZml4J1xuICAgICAgICAgICAgJ3Nob3dFcnJvcnMnXG4gICAgICAgICAgICAnc2hvd1dhcm5pbmdzJ1xuICAgICAgICAgICAgJ3Nob3dQZXJmb3JtYW5jZSdcbiAgICAgICAgICAgICdsb3dQZXJmb3JtYW5jZVdpZHRoJ1xuICAgICAgICBdXG5cbiAgICAgICAgXy5hc3NpZ24gQCxcbiAgICAgICAgICAgIHNjcmVlbl9zd2l0Y2hfaGFwcGVuZWQ6IGZhbHNlXG5cbiAgICAgICAgIyAuLi4gY29tcG9uZW50TmFtZSA9PSBcIl9cIiBmb3IgZ2xvYmFsLWRhdGFcbiAgICAgICAgIyB7Y29tcG9uZW50TmFtZToge2xvY2FsRGF0YU5hbWU6IERhdGFCdW5kbGUoZGF0YVZhbHVlKX19XG4gICAgICAgIEBfZGF0YUlzb2xhdGVkID0ge31cbiAgICAgICAgIyAuLi4gZ2xvYmFsLWRhdGEgbWFwcGVkIGludG8gY29tcG9uZW50LWxvY2FsLWNvbnRleHQgKHdpdGggYXBwcm9wcmlhdGUgcmVuYW1lKVxuICAgICAgICAjIHtjb21wb25lbnROYW1lOiB7bG9jYWxEYXRhTmFtZTogRGF0YUJ1bmRsZShkYXRhVmFsdWUpfX1cbiAgICAgICAgQGRhdGEgPSBAX2RhdGEgPSB7fVxuXG4gICAgICAgICMgLi4uIGNvbXBvbmVudE5hbWUgPT0gXCJfXCIgZm9yIGdsb2JhbC1kYXRhLWhpc3RvcnlcbiAgICAgICAgIyBbe2NvbXBvbmVudE5hbWU6IHtsb2NhbERhdGFOYW1lOiBkYXRhSW50aWFsVmFsdWV9fSwge2NvbXBvbmVudE5hbWU6IHtsb2NhbERhdGFOYW1lOiBkYXRhVmFsdWUyU25hcHNob3R9fV1cbiAgICAgICAgQGRhdGFIaXN0b3J5ID0gQF9kYXRhSXNvbGF0ZWRIaXN0b3J5ID0gW3t9XVxuICAgICAgICAjIHtjb21wb25lbnROYW1lLCB7bG9jYWxEYXRhTmFtZTogXCJ0YXJnZXRDb21wb25lbnROYW1lLnRhcmdldENvbXBvbmVudFZhbHVlXCJ9fVxuICAgICAgICBAX2RhdGFMaW5rID0ge31cbiAgICAgICAgIyBTZXQocHJvcGVydHlOYW1lKVxuICAgICAgICBAX2RhdGFQcm9wZXJ0aWVzID0gbmV3IFNldCgpXG5cbiAgICAgICAgIyB7Y29tcG9uZW50TmFtZTogY29tcG9uZW50U3BlY31cbiAgICAgICAgQF9jb21wb25lbnRTcGVjcyA9IHt9XG4gICAgICAgICMge3NjcmVlbk5hbWU6IFtjb21wb25lbnROYW1lXX1cbiAgICAgICAgQF9zY3JlZW5TcGVjcyA9IHt9XG5cbiAgICAgICAgIyAuLi4gdmFsdWVzIHRoYXQgY2hhbmdlIHdpdGggdGhlIHNjcmVlbiBvZiB0aGUgYXBwXG4gICAgICAgICMge2NvbXBvbmVudE5hbWU6IGNvbXBvbmVudH1cbiAgICAgICAgQF9hY3RpdmVDb21wb25lbnRzID0ge31cbiAgICAgICAgIyB7c291cmNlQ29tcG9uZW50TmFtZToge3NvdXJjZURhdGFOYW1lOiBbXCJjb21wb25lbnROYW1lLm1ldGhvZE5hbWVcIl19fVxuICAgICAgICBAX2FjdGl2ZVVwZGF0ZUxpc3RzID0ge31cblxuICAgICAgICAjIC4uLiBpbml0aWFsaXplIHRoZSBkYXRhIGFuZCB0aGUgcHJvcGVydGllc1xuICAgICAgICBAX3NldHVwRGF0YURpY3QgXCJfXCIsIG9wdGlvbnMuZGF0YUluaXRcbiAgICAgICAgQF9zZXR1cERhdGFQcm9wZXJ0aWVzRGljdCBvcHRpb25zLmRhdGFQcm9wZXJ0aWVzXG5cbiAgICAgICAgIyBTY3JlZW4gc3RhdGUtbWFjaGluZSB0cmFuc2l0aW9ucyBkZWZpbmVkXG4gICAgICAgIEBvbiBFdmVudHMuU3RhdGVTd2l0Y2hFbmQsIEBfc2NyZWVuVHJhbnNpdGlvblxuXG4gICAgICAgIEBfbG9nX3BlcmZvcm1hbmNlIF9kLCBfdCwgXCJBcHAuY29uc3RydWN0b3JcIlxuXG5cbiAgICAjIGVudHJ5cG9pbnQgbWV0aG9kXG4gICAgZGVmaW5lQ29tcG9uZW50OiAoY29tcG9uZW50U3BlYykgLT5cbiAgICAgICAgW19kLCBfdF0gPSBAX2xvZ19wZXJmb3JtYW5jZV9wcmVwKHRydWUpXG5cbiAgICAgICAgQF9hc3NlcnQoXG4gICAgICAgICAgICBjb21wb25lbnRTcGVjLm5hbWUgbm90IG9mIEBfY29tcG9uZW50U3BlY3NcbiAgICAgICAgICAgIFwiY29tcG9uZW50IFxcXCIje2NvbXBvbmVudFNwZWMubmFtZX1cXFwiIGRlZmluZWQgbXVsdGlwbGUgdGltZXNcIlxuICAgICAgICApXG5cbiAgICAgICAgY29tcG9uZW50TmFtZSA9IGNvbXBvbmVudFNwZWMubmFtZVxuICAgICAgICBAX2NvbXBvbmVudFNwZWNzW2NvbXBvbmVudE5hbWVdID0gY29tcG9uZW50U3BlY1xuXG4gICAgICAgICMgLi4uIGluaXRpYWxpemUgZGF0YSwgZGF0YS1saW5rcywgZGF0YS1wcm9wZXJ0aWVzXG4gICAgICAgIEBfc2V0dXBEYXRhRGljdCBjb21wb25lbnROYW1lLCBjb21wb25lbnRTcGVjLmRhdGFJbml0XG4gICAgICAgIEBfc2V0dXBEYXRhTGlua0RpY3QgY29tcG9uZW50TmFtZSwgY29tcG9uZW50U3BlYy5kYXRhTGlua1xuICAgICAgICBAX3NldHVwRGF0YVByb3BlcnRpZXNEaWN0IGNvbXBvbmVudFNwZWMuZGF0YVByb3BlcnRpZXNcblxuICAgICAgICBAX2xvZ19wZXJmb3JtYW5jZSBfZCwgX3QsIFwiQXBwLmRlZmluZUNvbXBvbmVudCgje2NvbXBvbmVudE5hbWV9KVwiXG5cblxuICAgICMgZW50cnlwb2ludCBtZXRob2RcbiAgICBkZWZpbmVTY3JlZW46IChzY3JlZW5OYW1lLCBjb21wb25lbnRMaXN0KSAtPlxuICAgICAgICBbX2QsIF90XSA9IEBfbG9nX3BlcmZvcm1hbmNlX3ByZXAodHJ1ZSlcblxuICAgICAgICBAX2Fzc2VydChcbiAgICAgICAgICAgIHNjcmVlbk5hbWUgbm90IG9mIEBzdGF0ZXNcbiAgICAgICAgICAgIFwic2NyZWVuIFxcXCIje3NjcmVlbk5hbWV9XFxcIiBkZWZpbmVkIG11bHRpcGxlIHRpbWVzXCJcbiAgICAgICAgKVxuXG4gICAgICAgIEBfc2NyZWVuU3BlY3Nbc2NyZWVuTmFtZV0gPSBjb21wb25lbnRMaXN0XG4gICAgICAgIEBzdGF0ZXNbc2NyZWVuTmFtZV0gPSB7fVxuICAgICAgICBAX2xvZ19wZXJmb3JtYW5jZSBfZCwgX3QsIFwiQXBwLmRlZmluZVNjcmVlbigje3NjcmVlbk5hbWV9KVwiXG5cblxuICAgICMgZW50cnlwb2ludCBtZXRob2RcbiAgICBfc2NyZWVuVHJhbnNpdGlvbjogKG9sZFNjcmVlbiwgbmV3U2NyZWVuKSAtPlxuICAgICAgICBbX2QsIF90XSA9IEBfbG9nX3BlcmZvcm1hbmNlX3ByZXAodHJ1ZSlcblxuICAgICAgICAjIE1hcmsgd2hlbiB0aGUgZmlyc3QgdHJhbnNpdGlvbiBoYXMgaGFwcGVuZWRcbiAgICAgICAgQHNjcmVlbl9zd2l0Y2hfaGFwcGVuZWQgPSB0cnVlXG5cbiAgICAgICAgIyBJZ25vcmUgdGhlIHRyYW5zaXRpb25zIHRvIHRoZSBzYW1lIHNjcmVlblxuICAgICAgICBpZiBvbGRTY3JlZW4gPT0gbmV3U2NyZWVuXG4gICAgICAgICAgICByZXR1cm5cblxuICAgICAgICAjIFJlbW92ZSB0aGUgY29tcG9uZW50cyBmcm9tIHRoZSBwcmV2aW91cyBzY3JlZW5cbiAgICAgICAgZm9yIGNvbXBvbmVudE5hbWUsIGNvbXBvbmVudCBvZiBAX2FjdGl2ZUNvbXBvbmVudHNcbiAgICAgICAgICAgIGNvbXBvbmVudC5kZXN0cm95KClcblxuICAgICAgICAjIFJlc2V0IHNjcmVlbiBkZXBlbmRlbnQgb2JqZWN0c1xuICAgICAgICBAX2FjdGl2ZUNvbXBvbmVudHMgPSB7fVxuICAgICAgICBAX2FjdGl2ZVVwZGF0ZUxpc3RzID0ge31cblxuICAgICAgICAjIENyZWF0ZSBjdXJyZW50bHkgYWN0aXZlIGNvbXBvbmVudHNcbiAgICAgICAgZm9yIGNvbXBvbmVudE5hbWUgaW4gQF9zY3JlZW5TcGVjc1tuZXdTY3JlZW5dXG5cbiAgICAgICAgICAgICMgLi4uIGNyZWF0ZSBhY3RpdmUgY29tcG9uZW50cyBmb3IgdGhpcyBzY3JlZW5cbiAgICAgICAgICAgIGNvbXBvbmVudFNwZWMgPSBAX2NvbXBvbmVudFNwZWNzW2NvbXBvbmVudE5hbWVdXG4gICAgICAgICAgICBjb21wb25lbnQgPSBjb21wb25lbnRTcGVjLmNvbnN0cnVjdCgpXG4gICAgICAgICAgICBjb21wb25lbnQucGFyZW50ID0gQFxuICAgICAgICAgICAgQF9hY3RpdmVDb21wb25lbnRzW2NvbXBvbmVudE5hbWVdID0gY29tcG9uZW50XG5cbiAgICAgICAgICAgICMgV2FybiBpZiBhbnkgZGF0YU5hbWUgaXMgZGVmaW5lZCBpbiBsb2NhbC1kYXRhIGFuZCBsaW5rZWQtZGF0YVxuICAgICAgICAgICAgZm9yIGRhdGFOYW1lIG9mIChjb21wb25lbnRTcGVjPy5kYXRhSW5pdCBvciB7fSlcbiAgICAgICAgICAgICAgICBAX2Fzc2VydChcbiAgICAgICAgICAgICAgICAgICAgbm90IGNvbXBvbmVudFNwZWMuZGF0YUxpbms/W2RhdGFOYW1lXT9cbiAgICAgICAgICAgICAgICAgICAgXCJsb2NhbC1kYXRhIFxcXCIje2RhdGFOYW1lfVxcXCIgcHJlc2VudCBpbiBib3RoIGxvY2FsLWRhdGEgYW5kIGxpbmtlZC1kYXRhXCJcbiAgICAgICAgICAgICAgICApXG5cbiAgICAgICAgICAgICMgLi4uIGNyZWF0ZSBhY3RpdmUgdXBkYXRlIGxpc3RzIGZvciB0aGlzIHNjcmVlblxuICAgICAgICAgICAgZm9yIG1ldGhvZE5hbWUgaW4gT2JqZWN0LmtleXMoT2JqZWN0LmdldFByb3RvdHlwZU9mKGNvbXBvbmVudCkpXG4gICAgICAgICAgICAgICAgaWYgbWV0aG9kTmFtZS5zdGFydHNXaXRoKEB3aXJlQ29tcG9uZW50TWV0aG9kUHJlZml4KVxuXG4gICAgICAgICAgICAgICAgICAgICMgVW53cmFwIHRoZSBtZXRob2QgaWYgbmVjZXNzYXJ5XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZCA9IGNvbXBvbmVudFttZXRob2ROYW1lXVxuICAgICAgICAgICAgICAgICAgICBpZiBub3QgXy5pc0Z1bmN0aW9uIG1ldGhvZFxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kID0gbWV0aG9kWydmdW5jJ11cblxuICAgICAgICAgICAgICAgICAgICBmb3IgbWV0aG9kUGFyYW0gaW4gZ2V0UGFyYW1OYW1lcyhtZXRob2QpXG4gICAgICAgICAgICAgICAgICAgICAgICBAX2Fzc2VydChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBAX2RhdGFbY29tcG9uZW50TmFtZV0/W21ldGhvZFBhcmFtXT9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInBhcmFtZXRlciBcXFwiI3ttZXRob2RQYXJhbX1cXFwiIHByZXNlbnQgaW4gXFxcIiN7Y29tcG9uZW50TmFtZX06I3ttZXRob2ROYW1lfVxcXCIgYnV0IG5vdCBmb3VuZCBhcyBlaXRoZXIgbG9jYWwtZGF0YSBvciBsaW5rZWQtZGF0YVwiXG4gICAgICAgICAgICAgICAgICAgICAgICApXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICMgLi4uIHJlc29sdmUgd2hlcmUgdG8gc3Vic2NyaWJlIHRoZSBtZXRob2RcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldENvbXBvbmVudERhdGFOYW1lID0gXCIje2NvbXBvbmVudE5hbWV9LiN7bWV0aG9kUGFyYW19XCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIGNvbXBvbmVudFNwZWMuZGF0YUxpbms/W21ldGhvZFBhcmFtXT9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRDb21wb25lbnREYXRhTmFtZSA9IGNvbXBvbmVudFNwZWMuZGF0YUxpbmtbbWV0aG9kUGFyYW1dXG4gICAgICAgICAgICAgICAgICAgICAgICBbdGFyZ2V0Q29tcG9uZW50TmFtZSwgdGFyZ2V0RGF0YU5hbWVdID0gdGFyZ2V0Q29tcG9uZW50RGF0YU5hbWUuc3BsaXQoXCIuXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIEBfYWN0aXZlVXBkYXRlTGlzdHNbdGFyZ2V0Q29tcG9uZW50TmFtZV0gPz0ge31cbiAgICAgICAgICAgICAgICAgICAgICAgIEBfYWN0aXZlVXBkYXRlTGlzdHNbdGFyZ2V0Q29tcG9uZW50TmFtZV1bdGFyZ2V0RGF0YU5hbWVdID89IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICBAX2FjdGl2ZVVwZGF0ZUxpc3RzW3RhcmdldENvbXBvbmVudE5hbWVdW3RhcmdldERhdGFOYW1lXS5wdXNoIFwiI3tjb21wb25lbnROYW1lfS4je21ldGhvZE5hbWV9XCJcblxuICAgICAgICBAX3VwZGF0ZUNvbXBvbmVudHNGb3JBbGxEYXRhKClcbiAgICAgICAgQF9sb2dfcGVyZm9ybWFuY2UgX2QsIF90LCBcIkFwcC5fc2NyZWVuVHJhbnNpdGlvbigje29sZFNjcmVlbn0sICN7bmV3U2NyZWVufSlcIlxuXG4gICAgIyBlbnRyeXBvaW50IG1ldGhvZFxuICAgIF91cGRhdGVEYXRhOiAoY29tcG9uZW50TmFtZSwgZGF0YU5hbWUsIG5ld1ZhbHVlKSAtPlxuICAgICAgICBbX2QsIF90XSA9IEBfbG9nX3BlcmZvcm1hbmNlX3ByZXAodHJ1ZSlcbiAgICAgICAgQF91cGRhdGVEYXRhSGlzdG9yeShjb21wb25lbnROYW1lLCBkYXRhTmFtZSwgbmV3VmFsdWUpXG4gICAgICAgIEBfdXBkYXRlQ29tcG9uZW50c0ZvckRhdGEoY29tcG9uZW50TmFtZSwgZGF0YU5hbWUpXG4gICAgICAgIEBfbG9nX3BlcmZvcm1hbmNlIF9kLCBfdCwgXCJBcHAuX3VwZGF0ZURhdGEoI3tjb21wb25lbnROYW1lfToje2RhdGFOYW1lfSwgI3tuZXdWYWx1ZX0pXCJcblxuICAgIF9pbnZva2VDb21wb25lbnRNZXRob2Q6IChjb21wb25lbnROYW1lLCBtZXRob2ROYW1lLCBjb21wb25lbnRKdXN0Q3JlYXRlZCA9IGZhbHNlKSAtPlxuICAgICAgICBbX2QsIF90XSA9IEBfbG9nX3BlcmZvcm1hbmNlX3ByZXAoZmFsc2UpXG5cbiAgICAgICAgY29tcG9uZW50ID0gQF9hY3RpdmVDb21wb25lbnRzW2NvbXBvbmVudE5hbWVdXG4gICAgICAgIG1ldGhvZCA9IGNvbXBvbmVudFttZXRob2ROYW1lXVxuXG4gICAgICAgIGlmIG5vdCBfLmlzRnVuY3Rpb24gbWV0aG9kXG4gICAgICAgICAgICAjIERvbid0IGludm9rZSBtdWx0aXBsZSB0aW1lcyBpZiByZXF1ZXN0ZWRcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICBcImludm9rZU9uY2VcIiBvZiBtZXRob2QgYW5kXG4gICAgICAgICAgICAgICAgbm90IGNvbXBvbmVudEp1c3RDcmVhdGVkXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgICAgICMgVW53cmFwIHRoZSBtZXRob2RcbiAgICAgICAgICAgIG1ldGhvZCA9IG1ldGhvZFtcImZ1bmNcIl1cblxuICAgICAgICBmdW5jQXJndW1lbnRzID0gXy5hdCBAX2RhdGFbY29tcG9uZW50TmFtZV0sIGdldFBhcmFtTmFtZXMobWV0aG9kKVxuICAgICAgICBtZXRob2QuYXBwbHkoY29tcG9uZW50LCBmdW5jQXJndW1lbnRzKVxuICAgICAgICBAX2xvZ19wZXJmb3JtYW5jZSBfZCwgX3QsIFwiQXBwLl9pbnZva2VDb21wb25lbnRNZXRob2QoI3tjb21wb25lbnROYW1lfSwgI3ttZXRob2ROYW1lfSlcIlxuXG4gICAgX3VwZGF0ZUNvbXBvbmVudHNGb3JBbGxEYXRhOiAtPlxuICAgICAgICBbX2QsIF90XSA9IEBfbG9nX3BlcmZvcm1hbmNlX3ByZXAoZmFsc2UpXG4gICAgICAgICMgQ2FsbCBtZXRob2RzIG9mIGFsbCBhY3RpdmUgY29tcG9uZW50cyBvbmx5IG9uY2VcbiAgICAgICAgZm9yIGNvbXBvbmVudE5hbWUsIGNvbXBvbmVudCBvZiAoQF9hY3RpdmVDb21wb25lbnRzIG9yIHt9KVxuICAgICAgICAgICAgZm9yIG1ldGhvZE5hbWUgaW4gT2JqZWN0LmtleXMoT2JqZWN0LmdldFByb3RvdHlwZU9mKGNvbXBvbmVudCkpXG4gICAgICAgICAgICAgICAgaWYgbWV0aG9kTmFtZS5zdGFydHNXaXRoKEB3aXJlQ29tcG9uZW50TWV0aG9kUHJlZml4KVxuICAgICAgICAgICAgICAgICAgICBAX2ludm9rZUNvbXBvbmVudE1ldGhvZChjb21wb25lbnROYW1lLCBtZXRob2ROYW1lLCB0cnVlKVxuICAgICAgICBAX2xvZ19wZXJmb3JtYW5jZSBfZCwgX3QsIFwiQXBwLl91cGRhdGVDb21wb25lbnRzRm9yQWxsRGF0YVwiXG5cbiAgICBfdXBkYXRlQ29tcG9uZW50c0ZvckRhdGE6IChjb21wb25lbnROYW1lLCBkYXRhTmFtZSkgLT5cbiAgICAgICAgW19kLCBfdF0gPSBAX2xvZ19wZXJmb3JtYW5jZV9wcmVwKGZhbHNlKVxuICAgICAgICBmb3IgY29tcG9uZW50TWV0aG9kTmFtZSBpbiAoQF9hY3RpdmVVcGRhdGVMaXN0cz9bY29tcG9uZW50TmFtZV0/W2RhdGFOYW1lXSBvciBbXSlcbiAgICAgICAgICAgIFtjb21wTmFtZSwgbWV0aG9kTmFtZV0gPSBjb21wb25lbnRNZXRob2ROYW1lLnNwbGl0KFwiLlwiKVxuICAgICAgICAgICAgQF9pbnZva2VDb21wb25lbnRNZXRob2QoY29tcE5hbWUsIG1ldGhvZE5hbWUsIGZhbHNlKVxuICAgICAgICBAX2xvZ19wZXJmb3JtYW5jZSBfZCwgX3QsIFwiQXBwLl91cGRhdGVDb21wb25lbnRzRm9yRGF0YSgje2NvbXBvbmVudE5hbWV9OiN7ZGF0YU5hbWV9KVwiXG5cbiAgICBfdXBkYXRlRGF0YUhpc3Rvcnk6IChjb21wb25lbnROYW1lLCBkYXRhTmFtZSwgbmV3VmFsdWUpIC0+XG4gICAgICAgIFtfZCwgX3RdID0gQF9sb2dfcGVyZm9ybWFuY2VfcHJlcChmYWxzZSlcbiAgICAgICAgQF9hc3NlcnQoXG4gICAgICAgICAgICBAX2RhdGFbY29tcG9uZW50TmFtZV0/W2RhdGFOYW1lXT9cbiAgICAgICAgICAgIFwiQ1JJVElDQUwgSU5URVJOQUwgLSBkYXRhIG5vdCByZWdpc3RlcmVkIGluIGhpc3RvcnkgYmVmb3JlIGNoYW5naW5nLCBjb250YWN0IG1haW50YWluZXJcIlxuICAgICAgICApXG5cbiAgICAgICAgX2xhc3RIaXN0b3J5RW50cnkgPSBAX2RhdGFJc29sYXRlZEhpc3RvcnlbQF9kYXRhSXNvbGF0ZWRIaXN0b3J5Lmxlbmd0aCAtIDFdXG4gICAgICAgIF9uZXdIaXN0b3J5RW50cnkgPSBfLmNsb25lRGVlcCBfbGFzdEhpc3RvcnlFbnRyeVxuICAgICAgICBfbmV3SGlzdG9yeUVudHJ5W2NvbXBvbmVudE5hbWVdW2RhdGFOYW1lXSA9IF8uY2xvbmVEZWVwIG5ld1ZhbHVlXG4gICAgICAgIEBfZGF0YUlzb2xhdGVkSGlzdG9yeS5wdXNoKF9uZXdIaXN0b3J5RW50cnkpXG5cbiAgICAgICAgIyBWZXJpZnkgY29uc2l0ZW5jeSBpbiBkYXRhLXN0b3JhZ2VcbiAgICAgICAgX2xhc3RGcm9tSGlzdG9yeSA9IEBfZGF0YUlzb2xhdGVkSGlzdG9yeVtAX2RhdGFJc29sYXRlZEhpc3RvcnkubGVuZ3RoIC0gMV1cbiAgICAgICAgX2xhc3RGcm9tRGF0YSA9IHt9XG5cbiAgICAgICAgZm9yIF9jb21wb25lbnROYW1lIGluIE9iamVjdC5rZXlzKEBfZGF0YUlzb2xhdGVkKVxuICAgICAgICAgICAgX2xhc3RGcm9tRGF0YVtfY29tcG9uZW50TmFtZV0gPz0ge31cbiAgICAgICAgICAgIGZvciBfZGF0YU5hbWUgaW4gT2JqZWN0LmtleXMoQF9kYXRhSXNvbGF0ZWRbX2NvbXBvbmVudE5hbWVdKVxuICAgICAgICAgICAgICAgIF9sYXN0RnJvbURhdGFbX2NvbXBvbmVudE5hbWVdW19kYXRhTmFtZV0gPSBAX2RhdGFJc29sYXRlZFtfY29tcG9uZW50TmFtZV1bX2RhdGFOYW1lXS52YWx1ZVxuICAgICAgICBAX2Fzc2VydChcbiAgICAgICAgICAgIF8uaXNFcXVhbCBfbGFzdEZyb21IaXN0b3J5LCBfbGFzdEZyb21EYXRhXG4gICAgICAgICAgICBcIkNSSVRJQ0FMIElOVEVSTkFMIC0gaW5jb25zaXN0ZW5jeSBiZXR3ZWVuIGhpc3RvcnkgYW5kIGN1cnJlbnQgZGF0YSwgY29udGFjdCBtYWludGFpbmVyXCJcbiAgICAgICAgKVxuICAgICAgICBAX2xvZ19wZXJmb3JtYW5jZSBfZCwgX3QsIFwiQXBwLl91cGRhdGVEYXRhSGlzdG9yeSgje2NvbXBvbmVudE5hbWV9OiN7ZGF0YU5hbWV9LCAje25ld1ZhbHVlfSlcIlxuXG5cbiAgICBfc2V0dXBEYXRhRGljdDogKGNvbXBvbmVudE5hbWUsIGRhdGFEaWN0ID0ge30pIC0+XG4gICAgICAgIFtfZCwgX3RdID0gQF9sb2dfcGVyZm9ybWFuY2VfcHJlcChmYWxzZSlcbiAgICAgICAgZm9yIGRhdGFOYW1lLCBkYXRhVmFsdWUgb2YgZGF0YURpY3RcbiAgICAgICAgICAgIEBfc2V0dXBEYXRhIGNvbXBvbmVudE5hbWUsIGRhdGFOYW1lLCBkYXRhVmFsdWVcbiAgICAgICAgQF9sb2dfcGVyZm9ybWFuY2UgX2QsIF90LCBcIkFwcC5fc2V0dXBEYXRhRGljdCgje2NvbXBvbmVudE5hbWV9LCA8ZGF0YURpY3Q+KVwiXG5cblxuICAgIF9zZXR1cERhdGE6IChjb21wb25lbnROYW1lLCBkYXRhTmFtZSwgZGF0YVZhbHVlKSAtPlxuICAgICAgICBbX2QsIF90XSA9IEBfbG9nX3BlcmZvcm1hbmNlX3ByZXAoZmFsc2UpXG4gICAgICAgIEBfYXNzZXJ0KFxuICAgICAgICAgICAgbm90IEBzY3JlZW5fc3dpdGNoX2hhcHBlbmVkXG4gICAgICAgICAgICBcImRhdGEgXFxcIiN7Y29tcG9uZW50TmFtZX06I3tkYXRhTmFtZX1cXFwiIGluaXRpYWxpemVkIHRvIFxcXCIje2RhdGFWYWx1ZX1cXFwiIGFmdGVyIGZpcnN0IHNjcmVlbi1zd2l0Y2ggaGFwcGVuZWRcIlxuICAgICAgICApXG4gICAgICAgIEBfYXNzZXJ0KFxuICAgICAgICAgICAgbm90IEBfZGF0YVtjb21wb25lbnROYW1lXT9bZGF0YU5hbWVdP1xuICAgICAgICAgICAgXCJkYXRhIFxcXCIje2NvbXBvbmVudE5hbWV9OiN7ZGF0YU5hbWV9XFxcIiBpbml0aWFsaXplZCBtdWx0aXBsZSB0aW1lc1wiXG4gICAgICAgIClcblxuICAgICAgICBAX2RhdGFJc29sYXRlZFtjb21wb25lbnROYW1lXSA/PSB7fVxuICAgICAgICBAX2RhdGFbY29tcG9uZW50TmFtZV0gPz0ge31cbiAgICAgICAgIyAuLi4gZG9uJ3QgY29weSBmdW5jdGlvbnNcbiAgICAgICAgZGF0YVZhbHVlQ29weSA9IGlmIF8uaXNGdW5jdGlvbiBkYXRhVmFsdWUgdGhlbiBkYXRhVmFsdWUgZWxzZSBfLmNsb25lRGVlcCBkYXRhVmFsdWVcbiAgICAgICAgZGF0YUJ1bmRsZSA9IG5ldyBEYXRhQnVuZGxlKGNvbXBvbmVudE5hbWUsIGRhdGFOYW1lLCBkYXRhVmFsdWVDb3B5LCBAKVxuICAgICAgICBAX2RhdGFJc29sYXRlZFtjb21wb25lbnROYW1lXVtkYXRhTmFtZV0gPSBAX2RhdGFbY29tcG9uZW50TmFtZV1bZGF0YU5hbWVdID0gZGF0YUJ1bmRsZVxuXG4gICAgICAgIEBfZGF0YUlzb2xhdGVkSGlzdG9yeVswXVtjb21wb25lbnROYW1lXSA/PSB7fVxuICAgICAgICBkYXRhVmFsdWVDb3B5ID0gaWYgXy5pc0Z1bmN0aW9uIGRhdGFWYWx1ZSB0aGVuIGRhdGFWYWx1ZSBlbHNlIF8uY2xvbmVEZWVwIGRhdGFWYWx1ZVxuICAgICAgICBAX2RhdGFJc29sYXRlZEhpc3RvcnlbMF1bY29tcG9uZW50TmFtZV1bZGF0YU5hbWVdID0gZGF0YVZhbHVlQ29weVxuICAgICAgICBAX2xvZ19wZXJmb3JtYW5jZSBfZCwgX3QsIFwiQXBwLl9zZXR1cERhdGEoI3tjb21wb25lbnROYW1lfToje2RhdGFOYW1lfSwgI3tkYXRhVmFsdWV9KVwiXG5cblxuICAgIF9zZXR1cERhdGFMaW5rRGljdDogKGNvbXBvbmVudE5hbWUsIGRhdGFMaW5rRGljdCA9IHt9KSAtPlxuICAgICAgICBbX2QsIF90XSA9IEBfbG9nX3BlcmZvcm1hbmNlX3ByZXAoZmFsc2UpXG4gICAgICAgIGZvciBkYXRhTGlua05hbWUsIGRhdGFMaW5rVmFsdWUgb2YgZGF0YUxpbmtEaWN0XG4gICAgICAgICAgICBAX3NldHVwRGF0YUxpbmsgY29tcG9uZW50TmFtZSwgZGF0YUxpbmtOYW1lLCBkYXRhTGlua1ZhbHVlXG4gICAgICAgIEBfbG9nX3BlcmZvcm1hbmNlIF9kLCBfdCwgXCJBcHAuX3NldHVwRGF0YUxpbmtEaWN0KCN7Y29tcG9uZW50TmFtZX0sIDxkYXRhTGlua3M+KVwiXG5cblxuICAgIF9zZXR1cERhdGFMaW5rOiAoY29tcG9uZW50TmFtZSwgZGF0YUxpbmtOYW1lLCBkYXRhTGlua1ZhbHVlKSAtPlxuICAgICAgICBbX2QsIF90XSA9IEBfbG9nX3BlcmZvcm1hbmNlX3ByZXAoZmFsc2UpXG4gICAgICAgIEBfYXNzZXJ0KFxuICAgICAgICAgICAgbm90IEBzY3JlZW5fc3dpdGNoX2hhcHBlbmVkXG4gICAgICAgICAgICBcImRhdGEtbGluayBcXFwiI3tjb21wb25lbnROYW1lfToje2RhdGFMaW5rTmFtZX1cXFwiIGluaXRpYWxpemVkIHRvIFxcXCIje2RhdGFMaW5rVmFsdWV9XFxcIiBhZnRlciBmaXJzdCBzY3JlZW4tc3dpdGNoIGhhcHBlbmVkXCJcbiAgICAgICAgKVxuICAgICAgICBAX2Fzc2VydChcbiAgICAgICAgICAgIG5vdCBAX2RhdGFbY29tcG9uZW50TmFtZV0/W2RhdGFMaW5rTmFtZV0/XG4gICAgICAgICAgICBcImRhdGEtbGluayBcXFwiI3tjb21wb25lbnROYW1lfToje2RhdGFMaW5rTmFtZX1cXFwiIGluaXRpYWxpemVkIG11bHRpcGxlIHRpbWVzXCJcbiAgICAgICAgKVxuXG4gICAgICAgIEBfZGF0YUxpbmtbY29tcG9uZW50TmFtZV0gPz0ge31cbiAgICAgICAgQF9kYXRhTGlua1tjb21wb25lbnROYW1lXVtkYXRhTGlua05hbWVdID0gZGF0YUxpbmtWYWx1ZVxuXG4gICAgICAgIEBfZGF0YVtjb21wb25lbnROYW1lXSA/PSB7fVxuICAgICAgICBAX2RhdGFbY29tcG9uZW50TmFtZV1bZGF0YUxpbmtOYW1lXSA9IF8uZ2V0IEBfZGF0YUlzb2xhdGVkLCBkYXRhTGlua1ZhbHVlXG5cbiAgICAgICAgQF9sb2dfcGVyZm9ybWFuY2UgX2QsIF90LCBcIkFwcC5fc2V0dXBEYXRhTGluaygje2NvbXBvbmVudE5hbWV9OiN7ZGF0YUxpbmtOYW1lfSwgI3tkYXRhTGlua1ZhbHVlfSlcIlxuXG5cbiAgICBfc2V0dXBEYXRhUHJvcGVydGllc0RpY3Q6IChkYXRhUHJvcGVydGllc0RpY3QgPSB7fSkgLT5cbiAgICAgICAgW19kLCBfdF0gPSBAX2xvZ19wZXJmb3JtYW5jZV9wcmVwKGZhbHNlKVxuICAgICAgICBmb3IgZGF0YVByb3BlcnR5TmFtZSwgZGF0YVByb3BlcnR5VmFsdWUgb2YgZGF0YVByb3BlcnRpZXNEaWN0XG4gICAgICAgICAgICBAX3NldHVwRGF0YVByb3BlcnR5IGRhdGFQcm9wZXJ0eU5hbWUsIGRhdGFQcm9wZXJ0eVZhbHVlXG4gICAgICAgIEBfbG9nX3BlcmZvcm1hbmNlIF9kLCBfdCwgXCJBcHAuX3NldHVwRGF0YVByb3BlcnRpZXNEaWN0KDxkYXRhUHJvcGVydGllc0RpY3Q+KVwiXG5cblxuICAgIF9zZXR1cERhdGFQcm9wZXJ0eTogKGRhdGFQcm9wZXJ0eU5hbWUsIGRhdGFQcm9wZXJ0eVZhbHVlKSAtPlxuICAgICAgICBbX2QsIF90XSA9IEBfbG9nX3BlcmZvcm1hbmNlX3ByZXAoZmFsc2UpXG4gICAgICAgIEBfYXNzZXJ0KFxuICAgICAgICAgICAgbm90IEBzY3JlZW5fc3dpdGNoX2hhcHBlbmVkXG4gICAgICAgICAgICBcImRhdGEtcHJvcGVydHkgXFxcIiN7ZGF0YVByb3BlcnR5TmFtZX1cXFwiIGluaXRpYWxpemVkIGFmdGVyIGZpcnN0IHNjcmVlbi1zd2l0Y2ggaGFwcGVuZWRcIlxuICAgICAgICApXG4gICAgICAgIEBfYXNzZXJ0KFxuICAgICAgICAgICAgbm90IEBfZGF0YVByb3BlcnRpZXMuaGFzKGRhdGFQcm9wZXJ0eU5hbWUpXG4gICAgICAgICAgICBcImRhdGEtcHJvcGVydHkgXFxcIiN7ZGF0YVByb3BlcnR5TmFtZX1cXFwiIGluaXRpYWxpemVkIG11bHRpcGxlIHRpbWVzXCJcbiAgICAgICAgKVxuXG4gICAgICAgIEBfZGF0YVByb3BlcnRpZXMuYWRkKGRhdGFQcm9wZXJ0eU5hbWUpXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBEYXRhQnVuZGxlLnByb3RvdHlwZSwgZGF0YVByb3BlcnR5TmFtZSxcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICAgICAgZ2V0OiBkYXRhUHJvcGVydHlWYWx1ZVxuICAgICAgICBAX2xvZ19wZXJmb3JtYW5jZSBfZCwgX3QsIFwiQXBwLl9zZXR1cERhdGFQcm9wZXJ0eSgje2RhdGFQcm9wZXJ0eU5hbWV9LCA8ZGF0YVByb3BlcnR5VmFsdWU+KVwiXG5cblxuICAgIF9lcnJvcjogKG1lc3NhZ2UpIC0+XG4gICAgICAgIGlmIEBzaG93RXJyb3JzXG4gICAgICAgICAgICB0aHJvdyBcIkNhc2luZzogRVJST1IgI3ttZXNzYWdlfVwiXG5cbiAgICBfYXNzZXJ0OiAoY29uZCwgbWVzc2FnZSkgLT5cbiAgICAgICAgaWYgbm90IGNvbmRcbiAgICAgICAgICAgIEBfZXJyb3IgbWVzc2FnZVxuXG4gICAgX3dhcm46IChtZXNzYWdlKSAtPlxuICAgICAgICBpZiBAc2hvd0Vycm9ycyBvciBAc2hvd1dhcm5pbmdzXG4gICAgICAgICAgICBwcmludCBcIkNhc2luZzogV0FSTiAje21lc3NhZ2V9XCJcblxuICAgIF9hc3NlcnRfd2FybjogKGNvbmQsIG1lc3NhZ2UpIC0+XG4gICAgICAgIGlmIG5vdCBjb25kXG4gICAgICAgICAgICBAX3dhcm4gbWVzc2FnZVxuXG4gICAgX2xvZ19wZXJmb3JtYW5jZV9wcmVwOiAoaXNFbnRyeVBvaW50TWV0aG9kKSAtPlxuICAgICAgICBpZiBpc0VudHJ5UG9pbnRNZXRob2RcbiAgICAgICAgICAgIEBfbWV0aG9kQ2FsbFN0YWNrRGVwdGggPSAwXG4gICAgICAgIEBfbWV0aG9kQ2FsbFN0YWNrRGVwdGggKz0gMVxuICAgICAgICByZXR1cm4gW0BfbWV0aG9kQ2FsbFN0YWNrRGVwdGgsIHBlcmZvcm1hbmNlLm5vdygpXVxuXG4gICAgX2xvZ19wZXJmb3JtYW5jZTogKF9tZXRob2RDYWxsU3RhY2tEZXB0aCwgc3RhcnRUaW1lLCBtZXNzYWdlKSAtPlxuICAgICAgICBpZiBfbWV0aG9kQ2FsbFN0YWNrRGVwdGggPT0gMVxuICAgICAgICAgICAgZ3JhcGhMaW5lcyA9ICfilJQnXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGdyYXBoTGluZXMgPSBcIuKUnCN7Xy5yZXBlYXQgXCLilIBcIiwgX21ldGhvZENhbGxTdGFja0RlcHRoIC0gMX1cIlxuICAgICAgICBpZiBAc2hvd1BlcmZvcm1hbmNlXG4gICAgICAgICAgICBwcmludCBcIiN7Xy5wYWRTdGFydCAocGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydFRpbWUpLnRvRml4ZWQoMiksIDcsICdfJ30gbXMgI3tncmFwaExpbmVzfSAje21lc3NhZ2V9XCIuc2xpY2UoMCwgQGxvd1BlcmZvcm1hbmNlV2lkdGgpXG4gICAgICAgIEBfbWV0aG9kQ2FsbFN0YWNrRGVwdGggLT0gMVxuXG5leHBvcnRzLkFwcC5wcm90b3R5cGUuc3dpdGNoU2NyZWVuID0gZXhwb3J0cy5BcHAucHJvdG90eXBlLnN0YXRlU3dpdGNoXG4iLCIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQTBCQUE7QURRQSxJQUFBLHlEQUFBO0VBQUE7OztBQUFBLE9BQU8sQ0FBQyxtQkFBUixHQUE4QixTQUFDLEtBQUQ7U0FBWSxDQUFDLENBQUMsSUFBRixDQUFPLEtBQUssQ0FBQyxXQUFiLEVBQTBCLENBQUMsR0FBRCxFQUFNLEdBQU4sQ0FBMUI7QUFBWjs7QUFFOUIsT0FBTyxDQUFDLGlCQUFSLEdBQTRCLFNBQUMsVUFBRCxFQUFhLFVBQWI7RUFDeEIsVUFBVSxDQUFDLE1BQVgsR0FBb0IsVUFBVSxDQUFDO1NBQy9CLENBQUMsQ0FBQyxNQUFGLENBQVMsVUFBVCxFQUFxQixVQUFVLENBQUMsS0FBaEM7QUFGd0I7O0FBSTVCLE9BQU8sQ0FBQyxZQUFSLEdBQXVCLFNBQUMsVUFBRCxFQUFhLGFBQWIsRUFBNEIsS0FBNUI7QUFDbkIsTUFBQTtFQUFBLG1CQUFBLEdBQXNCLENBQUMsQ0FBQyxTQUFGLENBQVksT0FBTyxDQUFDLG1CQUFSLENBQTRCLGFBQTVCLENBQVo7QUFDdEIsT0FBQSxpQkFBQTs7SUFDSSxDQUFDLENBQUMsTUFBRixDQUFTLElBQVQsRUFBZ0IsQ0FBQyxDQUFDLFNBQUYsQ0FBWSxPQUFPLENBQUMsbUJBQVIsQ0FBNEIsSUFBNUIsQ0FBWixFQUErQyxtQkFBL0MsRUFBb0UsQ0FBQyxDQUFDLFFBQXRFLENBQWhCO0FBREo7QUFFQTtPQUFBLGlCQUFBOztpQkFBQSxDQUFDLENBQUMsTUFBRixDQUFTLElBQVQsRUFBZTtNQUFDLE1BQUEsRUFBUSxVQUFUO0tBQWY7QUFBQTs7QUFKbUI7O0FBTXZCLE9BQU8sQ0FBQyxVQUFSLEdBQXFCLFNBQUMsSUFBRDtBQUNqQixTQUFPO0lBQ0gsWUFBQSxFQUFjLElBRFg7SUFFSCxNQUFBLEVBQVEsSUFGTDs7QUFEVTs7QUFNckIsT0FBTyxDQUFDLGVBQVIsR0FBMEIsU0FBQyxVQUFEO1NBQ3RCLFNBQUE7QUFDSSxRQUFBO0lBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxVQUFSO1dBQ1QsSUFBSSxNQUFPLENBQUEsVUFBQTtFQUZmO0FBRHNCOztBQU9wQjtFQUNXLG9CQUFDLGVBQUQsRUFBa0IsVUFBbEIsRUFBOEIsVUFBOUIsRUFBMkMsSUFBM0M7SUFBQyxJQUFDLENBQUEsaUJBQUQ7SUFBaUIsSUFBQyxDQUFBLFlBQUQ7SUFBWSxJQUFDLENBQUEsYUFBRDtJQUFhLElBQUMsQ0FBQSxPQUFEO0VBQTNDOzs7Ozs7QUFFakIsTUFBTSxDQUFDLGNBQVAsQ0FBc0IsVUFBVSxDQUFDLFNBQWpDLEVBQTRDLE9BQTVDLEVBQ0k7RUFBQSxZQUFBLEVBQWMsSUFBZDtFQUVBLEdBQUEsRUFBSyxTQUFBO1dBQU8sSUFBQyxDQUFBO0VBQVIsQ0FGTDtFQUdBLEdBQUEsRUFBSyxTQUFDLFFBQUQ7SUFHRCxJQUFHLElBQUMsQ0FBQSxVQUFELEtBQWUsUUFBbEI7TUFFSSxJQUFDLENBQUEsVUFBRCxHQUFjO2FBQ2QsSUFBQyxDQUFBLElBQUksQ0FBQyxXQUFOLENBQWtCLElBQUMsQ0FBQSxjQUFuQixFQUFtQyxJQUFDLENBQUEsU0FBcEMsRUFBK0MsUUFBL0MsRUFISjs7RUFIQyxDQUhMO0NBREo7O0FBWUEsTUFBTSxDQUFDLGNBQVAsQ0FBc0IsVUFBVSxDQUFDLFNBQWpDLEVBQTRDLE9BQTVDLEVBQ0k7RUFBQSxZQUFBLEVBQWMsSUFBZDtFQUNBLEdBQUEsRUFBSyxTQUFBO1dBQU8sSUFBQyxDQUFBLElBQUksQ0FBQztFQUFiLENBREw7Q0FESjs7QUFJQSxNQUFNLENBQUMsY0FBUCxDQUFzQixVQUFVLENBQUMsU0FBakMsRUFBNEMsVUFBNUMsRUFDSTtFQUFBLFlBQUEsRUFBYyxJQUFkO0VBQ0EsR0FBQSxFQUFLLFNBQUE7V0FBTyxDQUFDLENBQUMsR0FBRixDQUFNLElBQUMsQ0FBQSxJQUFJLENBQUMsb0JBQVosRUFBcUMsSUFBQyxDQUFBLGNBQUYsR0FBaUIsR0FBakIsR0FBb0IsSUFBQyxDQUFBLFNBQXpEO0VBQVAsQ0FETDtDQURKOztBQUlBLE1BQU0sQ0FBQyxjQUFQLENBQXNCLFVBQVUsQ0FBQyxTQUFqQyxFQUE0QyxpQkFBNUMsRUFDSTtFQUFBLFlBQUEsRUFBYyxJQUFkO0VBQ0EsR0FBQSxFQUFLLFNBQUE7QUFDRCxRQUFBO0lBQUEsZ0JBQUEsR0FBbUIsU0FBQyxHQUFELEVBQU0sU0FBTjtNQUNmLElBQUcsR0FBQSxLQUFPLEVBQVAsSUFBYSxDQUFDLENBQUksQ0FBQyxDQUFDLE9BQUYsQ0FBVSxHQUFJLENBQUEsR0FBRyxDQUFDLE1BQUosR0FBYSxDQUFiLENBQWQsRUFBK0IsU0FBL0IsQ0FBTCxDQUFoQjtRQUNJLEdBQUcsQ0FBQyxJQUFKLENBQVMsU0FBVCxFQURKOztBQUVBLGFBQU87SUFIUTtBQUtuQixXQUFPLENBQUMsQ0FBQyxNQUFGLENBQVMsSUFBQyxDQUFBLFFBQVYsRUFBb0IsZ0JBQXBCLEVBQXNDLEVBQXRDO0VBTk4sQ0FETDtDQURKOztBQWFBLGNBQUEsR0FBaUI7O0FBQ2pCLGNBQUEsR0FBaUI7O0FBQ2pCLGFBQUEsR0FBZ0IsU0FBQyxJQUFEO0FBQ1osTUFBQTtFQUFBLEtBQUEsR0FBUSxJQUFJLENBQUMsUUFBTCxDQUFBLENBQWUsQ0FBQyxPQUFoQixDQUF3QixjQUF4QixFQUF3QyxFQUF4QztFQUNSLE1BQUEsR0FBUyxLQUFLLENBQUMsS0FBTixDQUFZLEtBQUssQ0FBQyxPQUFOLENBQWMsR0FBZCxDQUFBLEdBQW1CLENBQS9CLEVBQWtDLEtBQUssQ0FBQyxPQUFOLENBQWMsR0FBZCxDQUFsQyxDQUFxRCxDQUFDLEtBQXRELENBQTRELGNBQTVEO0VBQ1QsSUFBRyxNQUFBLEtBQVUsSUFBYjtJQUNJLE1BQUEsR0FBUyxHQURiOztBQUVBLFNBQU87QUFMSzs7QUFVVixPQUFPLENBQUM7OztFQUNHLGFBQUMsT0FBRDtBQUNULFFBQUE7SUFBQSxNQUFXLElBQUMsQ0FBQSxxQkFBRCxDQUF1QixJQUF2QixDQUFYLEVBQUMsV0FBRCxFQUFLO0lBRUwsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxPQUFYLEVBQ0k7TUFBQSxlQUFBLEVBQWlCLFNBQWpCO01BQ0EsS0FBQSxFQUFPLE1BQU0sQ0FBQyxLQURkO01BR0EseUJBQUEsRUFBMkIsU0FIM0I7TUFLQSxVQUFBLEVBQVksSUFMWjtNQU1BLFlBQUEsRUFBYyxJQU5kO01BT0EsZUFBQSxFQUFpQixLQVBqQjtNQVFBLG1CQUFBLEVBQXFCLEdBUnJCO01BVUEsUUFBQSxFQUFVLEVBVlY7TUFXQSxjQUFBLEVBQWdCLEVBWGhCO0tBREo7SUFhQSxxQ0FBTSxPQUFOO0lBRUEsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxJQUFULEVBQVksQ0FBQyxDQUFDLElBQUYsQ0FBTyxPQUFQLEVBQWdCLENBQ3hCLDJCQUR3QixFQUV4QixZQUZ3QixFQUd4QixjQUh3QixFQUl4QixpQkFKd0IsRUFLeEIscUJBTHdCLENBQWhCLENBQVo7SUFRQSxDQUFDLENBQUMsTUFBRixDQUFTLElBQVQsRUFDSTtNQUFBLHNCQUFBLEVBQXdCLEtBQXhCO0tBREo7SUFLQSxJQUFDLENBQUEsYUFBRCxHQUFpQjtJQUdqQixJQUFDLENBQUEsSUFBRCxHQUFRLElBQUMsQ0FBQSxLQUFELEdBQVM7SUFJakIsSUFBQyxDQUFBLFdBQUQsR0FBZSxJQUFDLENBQUEsb0JBQUQsR0FBd0IsQ0FBQyxFQUFEO0lBRXZDLElBQUMsQ0FBQSxTQUFELEdBQWE7SUFFYixJQUFDLENBQUEsZUFBRCxHQUF1QixJQUFBLEdBQUEsQ0FBQTtJQUd2QixJQUFDLENBQUEsZUFBRCxHQUFtQjtJQUVuQixJQUFDLENBQUEsWUFBRCxHQUFnQjtJQUloQixJQUFDLENBQUEsaUJBQUQsR0FBcUI7SUFFckIsSUFBQyxDQUFBLGtCQUFELEdBQXNCO0lBR3RCLElBQUMsQ0FBQSxjQUFELENBQWdCLEdBQWhCLEVBQXFCLE9BQU8sQ0FBQyxRQUE3QjtJQUNBLElBQUMsQ0FBQSx3QkFBRCxDQUEwQixPQUFPLENBQUMsY0FBbEM7SUFHQSxJQUFDLENBQUEsRUFBRCxDQUFJLE1BQU0sQ0FBQyxjQUFYLEVBQTJCLElBQUMsQ0FBQSxpQkFBNUI7SUFFQSxJQUFDLENBQUEsZ0JBQUQsQ0FBa0IsRUFBbEIsRUFBc0IsRUFBdEIsRUFBMEIsaUJBQTFCO0VBOURTOztnQkFrRWIsZUFBQSxHQUFpQixTQUFDLGFBQUQ7QUFDYixRQUFBO0lBQUEsTUFBVyxJQUFDLENBQUEscUJBQUQsQ0FBdUIsSUFBdkIsQ0FBWCxFQUFDLFdBQUQsRUFBSztJQUVMLElBQUMsQ0FBQSxPQUFELENBQ0ksQ0FBQSxDQUFBLGFBQWEsQ0FBQyxJQUFkLElBQTBCLElBQUMsQ0FBQSxlQUEzQixDQURKLEVBRUksY0FBQSxHQUFlLGFBQWEsQ0FBQyxJQUE3QixHQUFrQywyQkFGdEM7SUFLQSxhQUFBLEdBQWdCLGFBQWEsQ0FBQztJQUM5QixJQUFDLENBQUEsZUFBZ0IsQ0FBQSxhQUFBLENBQWpCLEdBQWtDO0lBR2xDLElBQUMsQ0FBQSxjQUFELENBQWdCLGFBQWhCLEVBQStCLGFBQWEsQ0FBQyxRQUE3QztJQUNBLElBQUMsQ0FBQSxrQkFBRCxDQUFvQixhQUFwQixFQUFtQyxhQUFhLENBQUMsUUFBakQ7SUFDQSxJQUFDLENBQUEsd0JBQUQsQ0FBMEIsYUFBYSxDQUFDLGNBQXhDO1dBRUEsSUFBQyxDQUFBLGdCQUFELENBQWtCLEVBQWxCLEVBQXNCLEVBQXRCLEVBQTBCLHNCQUFBLEdBQXVCLGFBQXZCLEdBQXFDLEdBQS9EO0VBaEJhOztnQkFvQmpCLFlBQUEsR0FBYyxTQUFDLFVBQUQsRUFBYSxhQUFiO0FBQ1YsUUFBQTtJQUFBLE1BQVcsSUFBQyxDQUFBLHFCQUFELENBQXVCLElBQXZCLENBQVgsRUFBQyxXQUFELEVBQUs7SUFFTCxJQUFDLENBQUEsT0FBRCxDQUNJLENBQUEsQ0FBQSxVQUFBLElBQWtCLElBQUMsQ0FBQSxNQUFuQixDQURKLEVBRUksV0FBQSxHQUFZLFVBQVosR0FBdUIsMkJBRjNCO0lBS0EsSUFBQyxDQUFBLFlBQWEsQ0FBQSxVQUFBLENBQWQsR0FBNEI7SUFDNUIsSUFBQyxDQUFBLE1BQU8sQ0FBQSxVQUFBLENBQVIsR0FBc0I7V0FDdEIsSUFBQyxDQUFBLGdCQUFELENBQWtCLEVBQWxCLEVBQXNCLEVBQXRCLEVBQTBCLG1CQUFBLEdBQW9CLFVBQXBCLEdBQStCLEdBQXpEO0VBVlU7O2dCQWNkLGlCQUFBLEdBQW1CLFNBQUMsU0FBRCxFQUFZLFNBQVo7QUFDZixRQUFBO0lBQUEsTUFBVyxJQUFDLENBQUEscUJBQUQsQ0FBdUIsSUFBdkIsQ0FBWCxFQUFDLFdBQUQsRUFBSztJQUdMLElBQUMsQ0FBQSxzQkFBRCxHQUEwQjtJQUcxQixJQUFHLFNBQUEsS0FBYSxTQUFoQjtBQUNJLGFBREo7O0FBSUE7QUFBQSxTQUFBLHFCQUFBOztNQUNJLFNBQVMsQ0FBQyxPQUFWLENBQUE7QUFESjtJQUlBLElBQUMsQ0FBQSxpQkFBRCxHQUFxQjtJQUNyQixJQUFDLENBQUEsa0JBQUQsR0FBc0I7QUFHdEI7QUFBQSxTQUFBLHNDQUFBOztNQUdJLGFBQUEsR0FBZ0IsSUFBQyxDQUFBLGVBQWdCLENBQUEsYUFBQTtNQUNqQyxTQUFBLEdBQVksYUFBYSxDQUFDLFNBQWQsQ0FBQTtNQUNaLFNBQVMsQ0FBQyxNQUFWLEdBQW1CO01BQ25CLElBQUMsQ0FBQSxpQkFBa0IsQ0FBQSxhQUFBLENBQW5CLEdBQW9DO0FBR3BDLFdBQUEsMkVBQUE7UUFDSSxJQUFDLENBQUEsT0FBRCxDQUNRLDJFQURSLEVBRUksZUFBQSxHQUFnQixRQUFoQixHQUF5QiwrQ0FGN0I7QUFESjtBQU9BO0FBQUEsV0FBQSx3Q0FBQTs7UUFDSSxJQUFHLFVBQVUsQ0FBQyxVQUFYLENBQXNCLElBQUMsQ0FBQSx5QkFBdkIsQ0FBSDtVQUdJLE1BQUEsR0FBUyxTQUFVLENBQUEsVUFBQTtVQUNuQixJQUFHLENBQUksQ0FBQyxDQUFDLFVBQUYsQ0FBYSxNQUFiLENBQVA7WUFDSSxNQUFBLEdBQVMsTUFBTyxDQUFBLE1BQUEsRUFEcEI7O0FBR0E7QUFBQSxlQUFBLHdDQUFBOztZQUNJLElBQUMsQ0FBQSxPQUFELENBQ0ksaUZBREosRUFFSSxjQUFBLEdBQWUsV0FBZixHQUEyQixrQkFBM0IsR0FBNkMsYUFBN0MsR0FBMkQsR0FBM0QsR0FBOEQsVUFBOUQsR0FBeUUsc0RBRjdFO1lBTUEsdUJBQUEsR0FBNkIsYUFBRCxHQUFlLEdBQWYsR0FBa0I7WUFDOUMsSUFBRyw4RUFBSDtjQUNJLHVCQUFBLEdBQTBCLGFBQWEsQ0FBQyxRQUFTLENBQUEsV0FBQSxFQURyRDs7WUFFQSxPQUF3Qyx1QkFBdUIsQ0FBQyxLQUF4QixDQUE4QixHQUE5QixDQUF4QyxFQUFDLDZCQUFELEVBQXNCOztrQkFFRixDQUFBLG1CQUFBLElBQXdCOzs7bUJBQ0gsQ0FBQSxjQUFBLElBQW1COztZQUM1RCxJQUFDLENBQUEsa0JBQW1CLENBQUEsbUJBQUEsQ0FBcUIsQ0FBQSxjQUFBLENBQWUsQ0FBQyxJQUF6RCxDQUFpRSxhQUFELEdBQWUsR0FBZixHQUFrQixVQUFsRjtBQWRKLFdBUEo7O0FBREo7QUFoQko7SUF3Q0EsSUFBQyxDQUFBLDJCQUFELENBQUE7V0FDQSxJQUFDLENBQUEsZ0JBQUQsQ0FBa0IsRUFBbEIsRUFBc0IsRUFBdEIsRUFBMEIsd0JBQUEsR0FBeUIsU0FBekIsR0FBbUMsSUFBbkMsR0FBdUMsU0FBdkMsR0FBaUQsR0FBM0U7RUE1RGU7O2dCQStEbkIsV0FBQSxHQUFhLFNBQUMsYUFBRCxFQUFnQixRQUFoQixFQUEwQixRQUExQjtBQUNULFFBQUE7SUFBQSxNQUFXLElBQUMsQ0FBQSxxQkFBRCxDQUF1QixJQUF2QixDQUFYLEVBQUMsV0FBRCxFQUFLO0lBQ0wsSUFBQyxDQUFBLGtCQUFELENBQW9CLGFBQXBCLEVBQW1DLFFBQW5DLEVBQTZDLFFBQTdDO0lBQ0EsSUFBQyxDQUFBLHdCQUFELENBQTBCLGFBQTFCLEVBQXlDLFFBQXpDO1dBQ0EsSUFBQyxDQUFBLGdCQUFELENBQWtCLEVBQWxCLEVBQXNCLEVBQXRCLEVBQTBCLGtCQUFBLEdBQW1CLGFBQW5CLEdBQWlDLEdBQWpDLEdBQW9DLFFBQXBDLEdBQTZDLElBQTdDLEdBQWlELFFBQWpELEdBQTBELEdBQXBGO0VBSlM7O2dCQU1iLHNCQUFBLEdBQXdCLFNBQUMsYUFBRCxFQUFnQixVQUFoQixFQUE0QixvQkFBNUI7QUFDcEIsUUFBQTs7TUFEZ0QsdUJBQXVCOztJQUN2RSxNQUFXLElBQUMsQ0FBQSxxQkFBRCxDQUF1QixLQUF2QixDQUFYLEVBQUMsV0FBRCxFQUFLO0lBRUwsU0FBQSxHQUFZLElBQUMsQ0FBQSxpQkFBa0IsQ0FBQSxhQUFBO0lBQy9CLE1BQUEsR0FBUyxTQUFVLENBQUEsVUFBQTtJQUVuQixJQUFHLENBQUksQ0FBQyxDQUFDLFVBQUYsQ0FBYSxNQUFiLENBQVA7TUFFSSxJQUNJLFlBQUEsSUFBZ0IsTUFBaEIsSUFDQSxDQUFJLG9CQUZSO0FBSUksZUFKSjs7TUFPQSxNQUFBLEdBQVMsTUFBTyxDQUFBLE1BQUEsRUFUcEI7O0lBV0EsYUFBQSxHQUFnQixDQUFDLENBQUMsRUFBRixDQUFLLElBQUMsQ0FBQSxLQUFNLENBQUEsYUFBQSxDQUFaLEVBQTRCLGFBQUEsQ0FBYyxNQUFkLENBQTVCO0lBQ2hCLE1BQU0sQ0FBQyxLQUFQLENBQWEsU0FBYixFQUF3QixhQUF4QjtXQUNBLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixFQUFsQixFQUFzQixFQUF0QixFQUEwQiw2QkFBQSxHQUE4QixhQUE5QixHQUE0QyxJQUE1QyxHQUFnRCxVQUFoRCxHQUEyRCxHQUFyRjtFQW5Cb0I7O2dCQXFCeEIsMkJBQUEsR0FBNkIsU0FBQTtBQUN6QixRQUFBO0lBQUEsTUFBVyxJQUFDLENBQUEscUJBQUQsQ0FBdUIsS0FBdkIsQ0FBWCxFQUFDLFdBQUQsRUFBSztBQUVMO0FBQUEsU0FBQSxxQkFBQTs7QUFDSTtBQUFBLFdBQUEsc0NBQUE7O1FBQ0ksSUFBRyxVQUFVLENBQUMsVUFBWCxDQUFzQixJQUFDLENBQUEseUJBQXZCLENBQUg7VUFDSSxJQUFDLENBQUEsc0JBQUQsQ0FBd0IsYUFBeEIsRUFBdUMsVUFBdkMsRUFBbUQsSUFBbkQsRUFESjs7QUFESjtBQURKO1dBSUEsSUFBQyxDQUFBLGdCQUFELENBQWtCLEVBQWxCLEVBQXNCLEVBQXRCLEVBQTBCLGlDQUExQjtFQVB5Qjs7Z0JBUzdCLHdCQUFBLEdBQTBCLFNBQUMsYUFBRCxFQUFnQixRQUFoQjtBQUN0QixRQUFBO0lBQUEsTUFBVyxJQUFDLENBQUEscUJBQUQsQ0FBdUIsS0FBdkIsQ0FBWCxFQUFDLFdBQUQsRUFBSztBQUNMO0FBQUEsU0FBQSxzQ0FBQTs7TUFDSSxPQUF5QixtQkFBbUIsQ0FBQyxLQUFwQixDQUEwQixHQUExQixDQUF6QixFQUFDLGtCQUFELEVBQVc7TUFDWCxJQUFDLENBQUEsc0JBQUQsQ0FBd0IsUUFBeEIsRUFBa0MsVUFBbEMsRUFBOEMsS0FBOUM7QUFGSjtXQUdBLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixFQUFsQixFQUFzQixFQUF0QixFQUEwQiwrQkFBQSxHQUFnQyxhQUFoQyxHQUE4QyxHQUE5QyxHQUFpRCxRQUFqRCxHQUEwRCxHQUFwRjtFQUxzQjs7Z0JBTzFCLGtCQUFBLEdBQW9CLFNBQUMsYUFBRCxFQUFnQixRQUFoQixFQUEwQixRQUExQjtBQUNoQixRQUFBO0lBQUEsTUFBVyxJQUFDLENBQUEscUJBQUQsQ0FBdUIsS0FBdkIsQ0FBWCxFQUFDLFdBQUQsRUFBSztJQUNMLElBQUMsQ0FBQSxPQUFELENBQ0ksOEVBREosRUFFSSx3RkFGSjtJQUtBLGlCQUFBLEdBQW9CLElBQUMsQ0FBQSxvQkFBcUIsQ0FBQSxJQUFDLENBQUEsb0JBQW9CLENBQUMsTUFBdEIsR0FBK0IsQ0FBL0I7SUFDMUMsZ0JBQUEsR0FBbUIsQ0FBQyxDQUFDLFNBQUYsQ0FBWSxpQkFBWjtJQUNuQixnQkFBaUIsQ0FBQSxhQUFBLENBQWUsQ0FBQSxRQUFBLENBQWhDLEdBQTRDLENBQUMsQ0FBQyxTQUFGLENBQVksUUFBWjtJQUM1QyxJQUFDLENBQUEsb0JBQW9CLENBQUMsSUFBdEIsQ0FBMkIsZ0JBQTNCO0lBR0EsZ0JBQUEsR0FBbUIsSUFBQyxDQUFBLG9CQUFxQixDQUFBLElBQUMsQ0FBQSxvQkFBb0IsQ0FBQyxNQUF0QixHQUErQixDQUEvQjtJQUN6QyxhQUFBLEdBQWdCO0FBRWhCO0FBQUEsU0FBQSxzQ0FBQTs7O1FBQ0ksYUFBYyxDQUFBLGNBQUEsSUFBbUI7O0FBQ2pDO0FBQUEsV0FBQSx3Q0FBQTs7UUFDSSxhQUFjLENBQUEsY0FBQSxDQUFnQixDQUFBLFNBQUEsQ0FBOUIsR0FBMkMsSUFBQyxDQUFBLGFBQWMsQ0FBQSxjQUFBLENBQWdCLENBQUEsU0FBQSxDQUFVLENBQUM7QUFEekY7QUFGSjtJQUlBLElBQUMsQ0FBQSxPQUFELENBQ0ksQ0FBQyxDQUFDLE9BQUYsQ0FBVSxnQkFBVixFQUE0QixhQUE1QixDQURKLEVBRUksd0ZBRko7V0FJQSxJQUFDLENBQUEsZ0JBQUQsQ0FBa0IsRUFBbEIsRUFBc0IsRUFBdEIsRUFBMEIseUJBQUEsR0FBMEIsYUFBMUIsR0FBd0MsR0FBeEMsR0FBMkMsUUFBM0MsR0FBb0QsSUFBcEQsR0FBd0QsUUFBeEQsR0FBaUUsR0FBM0Y7RUF4QmdCOztnQkEyQnBCLGNBQUEsR0FBZ0IsU0FBQyxhQUFELEVBQWdCLFFBQWhCO0FBQ1osUUFBQTs7TUFENEIsV0FBVzs7SUFDdkMsTUFBVyxJQUFDLENBQUEscUJBQUQsQ0FBdUIsS0FBdkIsQ0FBWCxFQUFDLFdBQUQsRUFBSztBQUNMLFNBQUEsb0JBQUE7O01BQ0ksSUFBQyxDQUFBLFVBQUQsQ0FBWSxhQUFaLEVBQTJCLFFBQTNCLEVBQXFDLFNBQXJDO0FBREo7V0FFQSxJQUFDLENBQUEsZ0JBQUQsQ0FBa0IsRUFBbEIsRUFBc0IsRUFBdEIsRUFBMEIscUJBQUEsR0FBc0IsYUFBdEIsR0FBb0MsZUFBOUQ7RUFKWTs7Z0JBT2hCLFVBQUEsR0FBWSxTQUFDLGFBQUQsRUFBZ0IsUUFBaEIsRUFBMEIsU0FBMUI7QUFDUixRQUFBO0lBQUEsTUFBVyxJQUFDLENBQUEscUJBQUQsQ0FBdUIsS0FBdkIsQ0FBWCxFQUFDLFdBQUQsRUFBSztJQUNMLElBQUMsQ0FBQSxPQUFELENBQ0ksQ0FBSSxJQUFDLENBQUEsc0JBRFQsRUFFSSxTQUFBLEdBQVUsYUFBVixHQUF3QixHQUF4QixHQUEyQixRQUEzQixHQUFvQyxzQkFBcEMsR0FBMEQsU0FBMUQsR0FBb0UsdUNBRnhFO0lBSUEsSUFBQyxDQUFBLE9BQUQsQ0FDUSw4RUFEUixFQUVJLFNBQUEsR0FBVSxhQUFWLEdBQXdCLEdBQXhCLEdBQTJCLFFBQTNCLEdBQW9DLCtCQUZ4Qzs7VUFLZSxDQUFBLGFBQUEsSUFBa0I7OztXQUMxQixDQUFBLGFBQUEsSUFBa0I7O0lBRXpCLGFBQUEsR0FBbUIsQ0FBQyxDQUFDLFVBQUYsQ0FBYSxTQUFiLENBQUgsR0FBK0IsU0FBL0IsR0FBOEMsQ0FBQyxDQUFDLFNBQUYsQ0FBWSxTQUFaO0lBQzlELFVBQUEsR0FBaUIsSUFBQSxVQUFBLENBQVcsYUFBWCxFQUEwQixRQUExQixFQUFvQyxhQUFwQyxFQUFtRCxJQUFuRDtJQUNqQixJQUFDLENBQUEsYUFBYyxDQUFBLGFBQUEsQ0FBZSxDQUFBLFFBQUEsQ0FBOUIsR0FBMEMsSUFBQyxDQUFBLEtBQU0sQ0FBQSxhQUFBLENBQWUsQ0FBQSxRQUFBLENBQXRCLEdBQWtDOztXQUVuRCxDQUFBLGFBQUEsSUFBa0I7O0lBQzNDLGFBQUEsR0FBbUIsQ0FBQyxDQUFDLFVBQUYsQ0FBYSxTQUFiLENBQUgsR0FBK0IsU0FBL0IsR0FBOEMsQ0FBQyxDQUFDLFNBQUYsQ0FBWSxTQUFaO0lBQzlELElBQUMsQ0FBQSxvQkFBcUIsQ0FBQSxDQUFBLENBQUcsQ0FBQSxhQUFBLENBQWUsQ0FBQSxRQUFBLENBQXhDLEdBQW9EO1dBQ3BELElBQUMsQ0FBQSxnQkFBRCxDQUFrQixFQUFsQixFQUFzQixFQUF0QixFQUEwQixpQkFBQSxHQUFrQixhQUFsQixHQUFnQyxHQUFoQyxHQUFtQyxRQUFuQyxHQUE0QyxJQUE1QyxHQUFnRCxTQUFoRCxHQUEwRCxHQUFwRjtFQXJCUTs7Z0JBd0JaLGtCQUFBLEdBQW9CLFNBQUMsYUFBRCxFQUFnQixZQUFoQjtBQUNoQixRQUFBOztNQURnQyxlQUFlOztJQUMvQyxNQUFXLElBQUMsQ0FBQSxxQkFBRCxDQUF1QixLQUF2QixDQUFYLEVBQUMsV0FBRCxFQUFLO0FBQ0wsU0FBQSw0QkFBQTs7TUFDSSxJQUFDLENBQUEsY0FBRCxDQUFnQixhQUFoQixFQUErQixZQUEvQixFQUE2QyxhQUE3QztBQURKO1dBRUEsSUFBQyxDQUFBLGdCQUFELENBQWtCLEVBQWxCLEVBQXNCLEVBQXRCLEVBQTBCLHlCQUFBLEdBQTBCLGFBQTFCLEdBQXdDLGdCQUFsRTtFQUpnQjs7Z0JBT3BCLGNBQUEsR0FBZ0IsU0FBQyxhQUFELEVBQWdCLFlBQWhCLEVBQThCLGFBQTlCO0FBQ1osUUFBQTtJQUFBLE1BQVcsSUFBQyxDQUFBLHFCQUFELENBQXVCLEtBQXZCLENBQVgsRUFBQyxXQUFELEVBQUs7SUFDTCxJQUFDLENBQUEsT0FBRCxDQUNJLENBQUksSUFBQyxDQUFBLHNCQURULEVBRUksY0FBQSxHQUFlLGFBQWYsR0FBNkIsR0FBN0IsR0FBZ0MsWUFBaEMsR0FBNkMsc0JBQTdDLEdBQW1FLGFBQW5FLEdBQWlGLHVDQUZyRjtJQUlBLElBQUMsQ0FBQSxPQUFELENBQ1Esa0ZBRFIsRUFFSSxjQUFBLEdBQWUsYUFBZixHQUE2QixHQUE3QixHQUFnQyxZQUFoQyxHQUE2QywrQkFGakQ7O1VBS1csQ0FBQSxhQUFBLElBQWtCOztJQUM3QixJQUFDLENBQUEsU0FBVSxDQUFBLGFBQUEsQ0FBZSxDQUFBLFlBQUEsQ0FBMUIsR0FBMEM7O1dBRW5DLENBQUEsYUFBQSxJQUFrQjs7SUFDekIsSUFBQyxDQUFBLEtBQU0sQ0FBQSxhQUFBLENBQWUsQ0FBQSxZQUFBLENBQXRCLEdBQXNDLENBQUMsQ0FBQyxHQUFGLENBQU0sSUFBQyxDQUFBLGFBQVAsRUFBc0IsYUFBdEI7V0FFdEMsSUFBQyxDQUFBLGdCQUFELENBQWtCLEVBQWxCLEVBQXNCLEVBQXRCLEVBQTBCLHFCQUFBLEdBQXNCLGFBQXRCLEdBQW9DLEdBQXBDLEdBQXVDLFlBQXZDLEdBQW9ELElBQXBELEdBQXdELGFBQXhELEdBQXNFLEdBQWhHO0VBakJZOztnQkFvQmhCLHdCQUFBLEdBQTBCLFNBQUMsa0JBQUQ7QUFDdEIsUUFBQTs7TUFEdUIscUJBQXFCOztJQUM1QyxNQUFXLElBQUMsQ0FBQSxxQkFBRCxDQUF1QixLQUF2QixDQUFYLEVBQUMsV0FBRCxFQUFLO0FBQ0wsU0FBQSxzQ0FBQTs7TUFDSSxJQUFDLENBQUEsa0JBQUQsQ0FBb0IsZ0JBQXBCLEVBQXNDLGlCQUF0QztBQURKO1dBRUEsSUFBQyxDQUFBLGdCQUFELENBQWtCLEVBQWxCLEVBQXNCLEVBQXRCLEVBQTBCLG9EQUExQjtFQUpzQjs7Z0JBTzFCLGtCQUFBLEdBQW9CLFNBQUMsZ0JBQUQsRUFBbUIsaUJBQW5CO0FBQ2hCLFFBQUE7SUFBQSxNQUFXLElBQUMsQ0FBQSxxQkFBRCxDQUF1QixLQUF2QixDQUFYLEVBQUMsV0FBRCxFQUFLO0lBQ0wsSUFBQyxDQUFBLE9BQUQsQ0FDSSxDQUFJLElBQUMsQ0FBQSxzQkFEVCxFQUVJLGtCQUFBLEdBQW1CLGdCQUFuQixHQUFvQyxtREFGeEM7SUFJQSxJQUFDLENBQUEsT0FBRCxDQUNJLENBQUksSUFBQyxDQUFBLGVBQWUsQ0FBQyxHQUFqQixDQUFxQixnQkFBckIsQ0FEUixFQUVJLGtCQUFBLEdBQW1CLGdCQUFuQixHQUFvQywrQkFGeEM7SUFLQSxJQUFDLENBQUEsZUFBZSxDQUFDLEdBQWpCLENBQXFCLGdCQUFyQjtJQUNBLE1BQU0sQ0FBQyxjQUFQLENBQXNCLFVBQVUsQ0FBQyxTQUFqQyxFQUE0QyxnQkFBNUMsRUFDSTtNQUFBLFlBQUEsRUFBYyxJQUFkO01BQ0EsR0FBQSxFQUFLLGlCQURMO0tBREo7V0FHQSxJQUFDLENBQUEsZ0JBQUQsQ0FBa0IsRUFBbEIsRUFBc0IsRUFBdEIsRUFBMEIseUJBQUEsR0FBMEIsZ0JBQTFCLEdBQTJDLHdCQUFyRTtFQWZnQjs7Z0JBa0JwQixNQUFBLEdBQVEsU0FBQyxPQUFEO0lBQ0osSUFBRyxJQUFDLENBQUEsVUFBSjtBQUNJLFlBQU0sZ0JBQUEsR0FBaUIsUUFEM0I7O0VBREk7O2dCQUlSLE9BQUEsR0FBUyxTQUFDLElBQUQsRUFBTyxPQUFQO0lBQ0wsSUFBRyxDQUFJLElBQVA7YUFDSSxJQUFDLENBQUEsTUFBRCxDQUFRLE9BQVIsRUFESjs7RUFESzs7Z0JBSVQsS0FBQSxHQUFPLFNBQUMsT0FBRDtJQUNILElBQUcsSUFBQyxDQUFBLFVBQUQsSUFBZSxJQUFDLENBQUEsWUFBbkI7YUFDSSxLQUFBLENBQU0sZUFBQSxHQUFnQixPQUF0QixFQURKOztFQURHOztnQkFJUCxZQUFBLEdBQWMsU0FBQyxJQUFELEVBQU8sT0FBUDtJQUNWLElBQUcsQ0FBSSxJQUFQO2FBQ0ksSUFBQyxDQUFBLEtBQUQsQ0FBTyxPQUFQLEVBREo7O0VBRFU7O2dCQUlkLHFCQUFBLEdBQXVCLFNBQUMsa0JBQUQ7SUFDbkIsSUFBRyxrQkFBSDtNQUNJLElBQUMsQ0FBQSxxQkFBRCxHQUF5QixFQUQ3Qjs7SUFFQSxJQUFDLENBQUEscUJBQUQsSUFBMEI7QUFDMUIsV0FBTyxDQUFDLElBQUMsQ0FBQSxxQkFBRixFQUF5QixXQUFXLENBQUMsR0FBWixDQUFBLENBQXpCO0VBSlk7O2dCQU12QixnQkFBQSxHQUFrQixTQUFDLHFCQUFELEVBQXdCLFNBQXhCLEVBQW1DLE9BQW5DO0FBQ2QsUUFBQTtJQUFBLElBQUcscUJBQUEsS0FBeUIsQ0FBNUI7TUFDSSxVQUFBLEdBQWEsSUFEakI7S0FBQSxNQUFBO01BR0ksVUFBQSxHQUFhLEdBQUEsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFGLENBQVMsR0FBVCxFQUFjLHFCQUFBLEdBQXdCLENBQXRDLENBQUQsRUFIcEI7O0lBSUEsSUFBRyxJQUFDLENBQUEsZUFBSjtNQUNJLEtBQUEsQ0FBTSxDQUFFLENBQUMsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxDQUFDLFdBQVcsQ0FBQyxHQUFaLENBQUEsQ0FBQSxHQUFvQixTQUFyQixDQUErQixDQUFDLE9BQWhDLENBQXdDLENBQXhDLENBQVgsRUFBdUQsQ0FBdkQsRUFBMEQsR0FBMUQsQ0FBRCxDQUFBLEdBQStELE1BQS9ELEdBQXFFLFVBQXJFLEdBQWdGLEdBQWhGLEdBQW1GLE9BQXJGLENBQThGLENBQUMsS0FBL0YsQ0FBcUcsQ0FBckcsRUFBd0csSUFBQyxDQUFBLG1CQUF6RyxDQUFOLEVBREo7O1dBRUEsSUFBQyxDQUFBLHFCQUFELElBQTBCO0VBUFo7Ozs7R0FuVkk7O0FBNFYxQixPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUF0QixHQUFxQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQzs7OztBRHZhM0QsSUFBQSx5RkFBQTtFQUFBOzs7QUFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQWYsR0FBeUIsU0FBQyxTQUFEO0FBQ3JCLFNBQVcsSUFBQSxJQUFBLENBQ1AsSUFBQyxDQUFBLFdBQUQsQ0FBQSxDQURPLEVBRVAsSUFBQyxDQUFBLFFBQUQsQ0FBQSxDQUZPLEVBR1AsSUFBQyxDQUFBLE9BQUQsQ0FBQSxDQUFBLEdBQWEsU0FITjtBQURVOztBQU96QixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQWYsR0FBMkIsU0FBQyxXQUFEO0FBQ3ZCLFNBQVcsSUFBQSxJQUFBLENBQ1AsSUFBQyxDQUFBLFdBQUQsQ0FBQSxDQURPLEVBRVAsSUFBQyxDQUFBLFFBQUQsQ0FBQSxDQUFBLEdBQWMsV0FGUDtBQURZOztBQU8zQixVQUFBLEdBQWEsQ0FDVCxTQURTLEVBQ0UsVUFERixFQUNjLE9BRGQsRUFDdUIsT0FEdkIsRUFDZ0MsS0FEaEMsRUFDdUMsTUFEdkMsRUFFVCxNQUZTLEVBRUQsUUFGQyxFQUVTLFdBRlQsRUFFc0IsU0FGdEIsRUFFaUMsVUFGakMsRUFFNkMsVUFGN0M7O0FBSWIsT0FBTyxDQUFDLFVBQVIsR0FBcUI7O0FBRXJCLG1CQUFBLEdBQXNCLENBQ2xCLFNBRGtCLEVBQ1AsVUFETyxFQUNLLE9BREwsRUFDYyxPQURkLEVBQ3VCLEtBRHZCLEVBQzhCLE1BRDlCLEVBRWxCLE1BRmtCLEVBRVYsUUFGVSxFQUVBLFdBRkEsRUFFYSxTQUZiLEVBRXdCLFVBRnhCLEVBRW9DLFVBRnBDOztBQUl0QixPQUFPLENBQUMsbUJBQVIsR0FBOEI7O0FBRTlCLHFCQUFBLEdBQXdCLENBQ3BCLEtBRG9CLEVBQ2IsS0FEYSxFQUNOLEtBRE0sRUFDQyxLQURELEVBQ1EsS0FEUixFQUNlLEtBRGYsRUFFcEIsS0FGb0IsRUFFYixLQUZhLEVBRU4sS0FGTSxFQUVDLEtBRkQsRUFFUSxLQUZSLEVBRWUsS0FGZjs7QUFJeEIsT0FBTyxDQUFDLHFCQUFSLEdBQWdDOztBQUVoQyxxQkFBQSxHQUF3QixDQUNwQixLQURvQixFQUNiLEtBRGEsRUFDTixLQURNLEVBQ0MsS0FERCxFQUNRLEtBRFIsRUFDZSxLQURmLEVBRXBCLEtBRm9CLEVBRWIsS0FGYSxFQUVOLEtBRk0sRUFFQyxLQUZELEVBRVEsS0FGUixFQUVlLEtBRmY7O0FBSXhCLE9BQU8sQ0FBQyxxQkFBUixHQUFnQzs7QUFFaEMsVUFBQSxHQUFhLENBQ1QsS0FEUyxFQUNGLEtBREUsRUFDSyxLQURMLEVBQ1ksS0FEWixFQUNtQixLQURuQixFQUMwQixLQUQxQixFQUNpQyxLQURqQzs7QUFHYixPQUFPLENBQUMsVUFBUixHQUFxQjs7QUFHZixPQUFPLENBQUM7OztFQUNHLHdCQUFDLE9BQUQ7QUFFVCxRQUFBOztNQUZVLFVBQVU7O0lBRXBCLFFBQUEsR0FDSTtNQUFBLE9BQUEsRUFBUyxJQUFUO01BQ0Esa0JBQUEsRUFBb0IsQ0FEcEI7TUFFQSxjQUFBLEVBQWdCLENBRmhCO01BSUEsYUFBQSxFQUFtQixJQUFBLElBQUEsQ0FBSyxJQUFJLENBQUMsR0FBTCxDQUFBLENBQUwsQ0FKbkI7TUFLQSxzQkFBQSxFQUF3QixNQUx4QjtNQU1BLG9CQUFBLEVBQXNCLE1BTnRCO01BUUEsWUFBQSxFQUFjLElBUmQ7TUFTQSxtQkFBQSxFQUFxQixLQVRyQjtNQVVBLHFCQUFBLEVBQXVCLEtBVnZCO01BV0EsY0FBQSxFQUFnQixJQVhoQjtNQVlBLGNBQUEsRUFBZ0IsSUFaaEI7TUFjQSxtQkFBQSxFQUFxQixFQWRyQjtNQXdCQSxzQkFBQSxFQUF3QixTQUFDLHFCQUFELEVBQXdCLG9CQUF4QjtlQUNwQjtNQURvQixDQXhCeEI7TUEyQkEsNkJBQUEsRUFBK0IsU0FDM0IsOEJBRDJCLEVBRTNCLDRCQUYyQixFQUczQiw2QkFIMkIsRUFJM0IsMkJBSjJCO2VBTTNCO01BTjJCLENBM0IvQjtNQW1DQSxjQUFBLEVBQ0k7UUFBQSxlQUFBLEVBQWlCLFNBQWpCO1FBQ0EsS0FBQSxFQUFPLEdBQUEsR0FBTSxDQUFDLE9BQU8sQ0FBQyxrQkFBUixJQUE4QixDQUEvQixDQURiO1FBRUEsTUFBQSxFQUFRLEdBRlI7UUFHQSxXQUFBLEVBQWEsQ0FIYjtRQUlBLFlBQUEsRUFBYyxDQUpkO1FBS0EsV0FBQSxFQUFhLFNBTGI7UUFNQSxPQUFBLEVBQ0k7VUFBQSxHQUFBLEVBQUssQ0FBTDtVQUNBLE1BQUEsRUFBUSxDQURSO1VBRUEsSUFBQSxFQUFNLEVBRk47VUFHQSxLQUFBLEVBQU8sRUFIUDtTQVBKO09BcENKO01BK0NBLGdCQUFBLEVBQ0k7UUFBQSxNQUFBLEVBQVEsRUFBUjtRQUNBLGVBQUEsRUFBaUIsYUFEakI7UUFFQSxLQUFBLEVBQU8sU0FGUDtRQUdBLFNBQUEsRUFBVyxRQUhYO1FBSUEsUUFBQSxFQUFVLEVBSlY7UUFLQSxTQUFBLEVBQVcsTUFMWDtRQU1BLFVBQUEsRUFBWSxlQU5aO1FBT0EsT0FBQSxFQUNJO1VBQUEsUUFBQSxFQUFVLENBQVY7VUFDQSxJQUFBLEVBQU0sQ0FETjtVQUVBLEtBQUEsRUFBTyxDQUZQO1NBUko7T0FoREo7TUEyREEsZUFBQSxFQUNJO1FBQUEsTUFBQSxFQUFRLEVBQVI7UUFDQSxlQUFBLEVBQWlCLGFBRGpCO1FBRUEsS0FBQSxFQUFPLFNBRlA7UUFHQSxTQUFBLEVBQVcsUUFIWDtRQUlBLFFBQUEsRUFBVSxFQUpWO1FBS0EsVUFBQSxFQUFZLGVBTFo7UUFNQSxPQUFBLEVBQ0k7VUFBQSxRQUFBLEVBQVUsQ0FBVjtTQVBKO09BNURKO01Bb0VBLGFBQUEsRUFDSTtRQUFBLGVBQUEsRUFBaUIsYUFBakI7UUFDQSxLQUFBLEVBQU8sU0FEUDtRQUVBLE9BQUEsRUFDSTtVQUFBLEdBQUEsRUFBSyxDQUFMO1VBQ0EsTUFBQSxFQUFRLENBRFI7VUFFQSxJQUFBLEVBQU0sRUFGTjtVQUdBLEtBQUEsRUFBTyxFQUhQO1NBSEo7T0FyRUo7TUE0RUEsWUFBQSxFQUNJO1FBQUEsUUFBQSxFQUFVLEVBQVY7T0E3RUo7TUE4RUEsYUFBQSxFQUNJO1FBQUEsS0FBQSxFQUFPLFNBQVA7UUFDQSxlQUFBLEVBQWlCLGFBRGpCO1FBRUEsV0FBQSxFQUFhLFNBRmI7UUFHQSxXQUFBLEVBQWEsQ0FIYjtRQUlBLFlBQUEsRUFBYyxDQUpkO1FBS0EsU0FBQSxFQUFXLFFBTFg7UUFNQSxRQUFBLEVBQVUsRUFOVjtRQU9BLFVBQUEsRUFBWSxlQVBaO1FBUUEsT0FBQSxFQUNJO1VBQUEsUUFBQSxFQUFVLENBQVY7U0FUSjtRQVVBLE1BQUEsRUFDSTtVQUFBLEdBQUEsRUFBSyxDQUFMO1VBQ0EsTUFBQSxFQUFRLENBQUMsQ0FEVDtVQUVBLElBQUEsRUFBTSxDQUZOO1VBR0EsS0FBQSxFQUFPLENBQUMsQ0FIUjtTQVhKO09BL0VKO01BOEZBLHNCQUFBLEVBQ0k7UUFBQSxlQUFBLEVBQWlCLFNBQWpCO1FBQ0EsS0FBQSxFQUFPLE9BRFA7T0EvRko7TUFpR0EscUJBQUEsRUFDSTtRQUFBLGVBQUEsRUFBaUIsU0FBakI7UUFDQSxLQUFBLEVBQU8sT0FEUDtPQWxHSjtNQW9HQSwwQkFBQSxFQUNJO1FBQUEsT0FBQSxFQUFTLElBQVQ7T0FyR0o7O0lBd0dKLGNBQUEsR0FBaUIsQ0FBQyxDQUFDLElBQUYsQ0FBTyxPQUFQLEVBQWdCLENBQUMsQ0FBQyxJQUFGLENBQU8sUUFBUCxDQUFoQjtJQUNqQixDQUFDLENBQUMsTUFBRixDQUFTLElBQVQsRUFBYSxDQUFDLENBQUMsS0FBRixDQUFRLEVBQVIsRUFBWSxRQUFaLEVBQXNCLGNBQXRCLENBQWI7SUFHQSxPQUFPLENBQUMsZUFBUixHQUEwQixJQUFDLENBQUEsY0FBYyxDQUFDO0lBQzFDLE9BQU8sQ0FBQyxLQUFSLEdBQWdCLElBQUMsQ0FBQSxjQUFjLENBQUM7SUFDaEMsT0FBTyxDQUFDLE1BQVIsR0FBaUIsSUFBQyxDQUFBLGNBQWMsQ0FBQztJQUVqQyxnREFBTSxPQUFOO0lBR0EsSUFBQyxDQUFBLG9CQUFELEdBQXdCO0lBQ3hCLElBQUMsQ0FBQSxpQkFBRCxHQUF5QixJQUFBLEtBQUEsQ0FDckIsQ0FBQyxDQUFDLEtBQUYsQ0FDSSxFQURKLEVBRUksSUFBQyxDQUFBLGNBRkwsRUFHSTtNQUFDLE1BQUEsRUFBUSxJQUFUO0tBSEosQ0FEcUI7SUFTekIsSUFBQyxDQUFBLE1BQUQsQ0FBQTtJQUNBLElBQUMsQ0FBQSxPQUFELENBQUE7RUFqSVM7OzJCQW9JYixPQUFBLEdBQVMsU0FBQTtBQUNMLFFBQUE7SUFBQSxJQUFDLENBQUEsYUFBRCxHQUFxQixJQUFBLEtBQUEsQ0FDakIsQ0FBQyxDQUFDLEtBQUYsQ0FDSSxFQURKLEVBRUksSUFBQyxDQUFBLGlCQUFpQixDQUFDLEtBRnZCLEVBR0k7TUFDSSxlQUFBLEVBQWlCLGFBRHJCO01BRUksTUFBQSxFQUFRLElBQUMsQ0FBQSxpQkFGYjtLQUhKLENBRGlCO0lBV3JCLGNBQUEsR0FBcUIsSUFBQSxLQUFBLENBQ2pCO01BQUEsZUFBQSxFQUFpQixhQUFqQjtNQUNBLE1BQUEsRUFBUSxJQUFDLENBQUEsYUFEVDtNQUVBLENBQUEsRUFBRyxJQUFDLENBQUEsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUYzQjtNQUdBLENBQUEsRUFBRyxJQUFDLENBQUEsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUgzQjtNQUlBLEtBQUEsRUFDSSxJQUFDLENBQUEsYUFBYSxDQUFDLEtBQWYsR0FDQSxDQUFDLENBQUMsSUFBQyxDQUFBLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBMUIsQ0FEQSxHQUVBLENBQUMsQ0FBQyxJQUFDLENBQUEsY0FBYyxDQUFDLE9BQU8sQ0FBQyxLQUExQixDQVBKO01BU0EsTUFBQSxFQUNJLElBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixHQUNBLENBQUMsQ0FBQyxJQUFDLENBQUEsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUExQixDQURBLEdBRUEsQ0FBQyxDQUFFLElBQUMsQ0FBQSxjQUFjLENBQUMsT0FBTyxDQUFDLE1BQTNCLENBWko7S0FEaUI7QUFnQnJCO1NBQWtCLGtIQUFsQjtNQUdJLFVBQUEsR0FBaUIsSUFBQSxLQUFBLENBQ2IsQ0FBQyxDQUFDLEtBQUYsQ0FDSSxFQURKLEVBRUksSUFBQyxDQUFBLGFBRkwsRUFHSTtRQUNJLE1BQUEsRUFBUSxjQURaO1FBRUksQ0FBQSxFQUFHLFVBQUEsR0FBYSxDQUFDLGNBQWMsQ0FBQyxLQUFmLEdBQXVCLElBQUMsQ0FBQSxrQkFBekIsQ0FGcEI7UUFHSSxDQUFBLEVBQUcsQ0FIUDtRQUlJLEtBQUEsRUFBUSxjQUFjLENBQUMsS0FBZixHQUF1QixJQUFDLENBQUEsa0JBSnBDO1FBS0ksTUFBQSxFQUFRLGNBQWMsQ0FBQyxNQUwzQjtPQUhKLENBRGE7TUFhakIsZUFBQSxHQUFzQixJQUFBLEtBQUEsQ0FDbEI7UUFBQSxNQUFBLEVBQVEsVUFBUjtRQUVBLGVBQUEsRUFBaUIsYUFGakI7UUFHQSxDQUFBLEVBQUcsSUFBQyxDQUFBLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFIMUI7UUFJQSxDQUFBLEVBQUcsSUFBQyxDQUFBLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FKMUI7UUFLQSxLQUFBLEVBQ0ksVUFBVSxDQUFDLEtBQVgsR0FDQSxDQUFDLENBQUMsSUFBQyxDQUFBLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBekIsQ0FEQSxHQUVBLENBQUMsQ0FBQyxJQUFDLENBQUEsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUF6QixDQVJKO1FBVUEsTUFBQSxFQUNJLFVBQVUsQ0FBQyxNQUFYLEdBQ0EsQ0FBQyxDQUFDLElBQUMsQ0FBQSxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQXpCLENBREEsR0FFQSxDQUFDLENBQUMsSUFBQyxDQUFBLGFBQWEsQ0FBQyxPQUFPLENBQUMsTUFBekIsQ0FiSjtPQURrQjtNQWtCdEIsWUFBQSxHQUFtQixJQUFBLElBQUEsQ0FDZixJQUFDLENBQUEsYUFBYSxDQUFDLFdBQWYsQ0FBQSxDQURlLEVBRWYsSUFBQyxDQUFBLGFBQWEsQ0FBQyxRQUFmLENBQUEsQ0FBQSxHQUE0QixVQUZiLEVBR2YsQ0FIZTtNQU1uQixhQUFBLEdBQW9CLElBQUEsSUFBQSxDQUFLLFlBQUw7QUFDcEIsYUFBTSxhQUFhLENBQUMsTUFBZCxDQUFBLENBQUEsS0FBMEIsSUFBQyxDQUFBLGNBQWpDO1FBQ0ksYUFBQSxHQUFnQixhQUFhLENBQUMsT0FBZCxDQUFzQixDQUFDLENBQXZCO01BRHBCO01BSUEsZ0JBQUEsR0FBdUIsSUFBQSxTQUFBLENBQ25CLENBQUMsQ0FBQyxLQUFGLENBQ0ksRUFESixFQUVJLElBQUMsQ0FBQSxnQkFGTCxFQUdJO1FBQ0ksTUFBQSxFQUFRLGVBRFo7UUFFSSxDQUFBLEVBQUcsQ0FGUDtRQUdJLENBQUEsRUFBRyxDQUhQO1FBSUksS0FBQSxFQUFPLGVBQWUsQ0FBQyxLQUozQjtRQU1JLElBQUEsRUFBUyxtQkFBb0IsQ0FBQSxZQUFZLENBQUMsUUFBYixDQUFBLENBQUEsQ0FBckIsR0FBOEMsR0FBOUMsR0FBZ0QsQ0FBQyxZQUFZLENBQUMsV0FBYixDQUFBLENBQUQsQ0FONUQ7UUFPSSxRQUFBLEVBQVUsSUFQZDtPQUhKLENBRG1CO01BZ0J2QixJQUNJLFVBQUEsS0FBYyxDQUFkLElBQ0EsSUFBQyxDQUFBLGNBRkw7UUFJSSxJQUFDLENBQUEsZUFBRCxHQUF1QixJQUFBLEtBQUEsQ0FDbkI7VUFBQSxNQUFBLEVBQVEsZ0JBQVI7VUFDQSxlQUFBLEVBQWlCLGFBRGpCO1VBRUEsQ0FBQSxFQUFHLENBRkg7VUFHQSxDQUFBLEVBQUcsQ0FISDtVQUlBLEtBQUEsRUFBTyxnQkFBZ0IsQ0FBQyxLQUFqQixHQUF5QixDQUpoQztVQUtBLE1BQUEsRUFBUSxnQkFBZ0IsQ0FBQyxNQUx6QjtTQURtQjtRQU92QixpQkFBQSxHQUF3QixJQUFBLFNBQUEsQ0FDcEI7VUFBQSxNQUFBLEVBQVEsSUFBQyxDQUFBLGVBQVQ7VUFDQSxlQUFBLEVBQWlCLGFBRGpCO1VBRUEsQ0FBQSxFQUFHLENBRkg7VUFHQSxDQUFBLEVBQUcsQ0FISDtVQUlBLEtBQUEsRUFBTyxJQUFDLENBQUEsZUFBZSxDQUFDLEtBQWpCLEdBQXlCLENBSmhDO1VBS0EsTUFBQSxFQUFRLElBQUMsQ0FBQSxlQUFlLENBQUMsTUFMekI7VUFNQSxJQUFBLEVBQU0sR0FOTjtVQU9BLFNBQUEsRUFBVyxNQVBYO1VBUUEsS0FBQSxFQUFPLFNBUlA7VUFXQSxRQUFBLEVBQVUsSUFBQyxDQUFBLFlBQVksQ0FBQyxRQUFkLEdBQXlCLENBWG5DO1VBWUEsVUFBQSxFQUFZLGVBWlo7VUFhQSxPQUFBLEVBQ0k7WUFBQSxRQUFBLEVBQVUsQ0FBQyxJQUFDLENBQUEsZUFBZSxDQUFDLE1BQWpCLEdBQTBCLENBQUEsR0FBRSxJQUFDLENBQUEsWUFBWSxDQUFDLFFBQTNDLENBQUEsR0FBdUQsQ0FBakU7V0FkSjtTQURvQjtRQWdCeEIsaUJBQUEsR0FBd0IsSUFBQSxTQUFBLENBQ3BCLENBQUMsQ0FBQyxLQUFGLENBQ0ksRUFESixFQUVJLElBQUMsQ0FBQSxZQUZMLEVBR0k7VUFDSSxNQUFBLEVBQVEsSUFBQyxDQUFBLGVBRGI7VUFFSSxDQUFBLEVBQUcsSUFBQyxDQUFBLGVBQWUsQ0FBQyxLQUFqQixHQUF5QixDQUZoQztVQUdJLENBQUEsRUFBRyxDQUhQO1VBSUksS0FBQSxFQUFPLElBQUMsQ0FBQSxlQUFlLENBQUMsS0FBakIsR0FBeUIsQ0FBekIsR0FBNkIsQ0FKeEM7VUFLSSxNQUFBLEVBQVEsSUFBQyxDQUFBLGVBQWUsQ0FBQyxNQUw3QjtVQU1JLElBQUEsRUFBTSxFQUFBLEdBQUcscUJBQXNCLENBQUEsQ0FBQyxZQUFZLENBQUMsUUFBYixDQUFBLENBQUEsR0FBMEIsRUFBMUIsR0FBK0IsQ0FBaEMsQ0FBQSxHQUFxQyxFQUFyQyxDQU5uQztVQU9JLFNBQUEsRUFBVyxNQVBmO1VBUUksS0FBQSxFQUFPLFNBUlg7VUFXSSxPQUFBLEVBQ0k7WUFBQSxRQUFBLEVBQVUsQ0FBQyxJQUFDLENBQUEsZUFBZSxDQUFDLE1BQWpCLEdBQTBCLEdBQUEsR0FBSSxJQUFDLENBQUEsWUFBWSxDQUFDLFFBQTdDLENBQUEsR0FBeUQsQ0FBbkU7V0FaUjtTQUhKLENBRG9CO1FBb0J4QixJQUFDLENBQUEsZUFBZSxDQUFDLEtBQWpCLENBQXVCLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUE7bUJBQ25CLEtBQUMsQ0FBQSxnQkFBRCxDQUFrQixLQUFDLENBQUEsYUFBYSxDQUFDLFNBQWYsQ0FBeUIsQ0FBQyxDQUExQixDQUFsQjtVQURtQjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdkIsRUEvQ0o7O01Ba0RBLElBQ0ksVUFBQSxLQUFjLElBQUMsQ0FBQSxrQkFBRCxHQUFzQixDQUFwQyxJQUNBLElBQUMsQ0FBQSxjQUZMO1FBSUksSUFBQyxDQUFBLGVBQUQsR0FBdUIsSUFBQSxLQUFBLENBQ25CO1VBQUEsTUFBQSxFQUFRLGdCQUFSO1VBQ0EsZUFBQSxFQUFpQixhQURqQjtVQUVBLENBQUEsRUFBRyxnQkFBZ0IsQ0FBQyxLQUFqQixHQUF5QixDQUF6QixHQUE2QixDQUZoQztVQUdBLENBQUEsRUFBRyxDQUhIO1VBSUEsS0FBQSxFQUFPLGdCQUFnQixDQUFDLEtBQWpCLEdBQXlCLENBSmhDO1VBS0EsTUFBQSxFQUFRLGdCQUFnQixDQUFDLE1BTHpCO1NBRG1CO1FBT3ZCLGlCQUFBLEdBQXdCLElBQUEsU0FBQSxDQUNwQjtVQUFBLE1BQUEsRUFBUSxJQUFDLENBQUEsZUFBVDtVQUNBLGVBQUEsRUFBaUIsYUFEakI7VUFFQSxDQUFBLEVBQUcsSUFBQyxDQUFBLGVBQWUsQ0FBQyxLQUFqQixHQUF5QixDQUF6QixHQUE2QixDQUZoQztVQUdBLENBQUEsRUFBRyxDQUhIO1VBSUEsS0FBQSxFQUFPLElBQUMsQ0FBQSxlQUFlLENBQUMsS0FBakIsR0FBeUIsQ0FKaEM7VUFLQSxNQUFBLEVBQVEsSUFBQyxDQUFBLGVBQWUsQ0FBQyxNQUx6QjtVQU1BLElBQUEsRUFBTSxHQU5OO1VBT0EsS0FBQSxFQUFPLFNBUFA7VUFRQSxTQUFBLEVBQVcsT0FSWDtVQVdBLFFBQUEsRUFBVSxJQUFDLENBQUEsWUFBWSxDQUFDLFFBQWQsR0FBeUIsQ0FYbkM7VUFZQSxVQUFBLEVBQVksZUFaWjtVQWFBLE9BQUEsRUFDSTtZQUFBLFFBQUEsRUFBVSxDQUFDLElBQUMsQ0FBQSxlQUFlLENBQUMsTUFBakIsR0FBMEIsQ0FBQSxHQUFFLElBQUMsQ0FBQSxZQUFZLENBQUMsUUFBM0MsQ0FBQSxHQUF1RCxDQUFqRTtXQWRKO1NBRG9CO1FBaUJ4QixpQkFBQSxHQUF3QixJQUFBLFNBQUEsQ0FDcEIsQ0FBQyxDQUFDLEtBQUYsQ0FDSSxFQURKLEVBRUksSUFBQyxDQUFBLFlBRkwsRUFHSTtVQUNJLE1BQUEsRUFBUSxJQUFDLENBQUEsZUFEYjtVQUVJLENBQUEsRUFBRyxDQUZQO1VBR0ksQ0FBQSxFQUFHLENBSFA7VUFJSSxLQUFBLEVBQU8sSUFBQyxDQUFBLGVBQWUsQ0FBQyxLQUFqQixHQUF5QixDQUF6QixHQUE2QixDQUp4QztVQUtJLE1BQUEsRUFBUSxJQUFDLENBQUEsZUFBZSxDQUFDLE1BTDdCO1VBTUksSUFBQSxFQUFNLEVBQUEsR0FBRyxxQkFBc0IsQ0FBQSxDQUFDLFlBQVksQ0FBQyxRQUFiLENBQUEsQ0FBQSxHQUEwQixDQUEzQixDQUFBLEdBQWdDLEVBQWhDLENBTm5DO1VBT0ksU0FBQSxFQUFXLE9BUGY7VUFRSSxLQUFBLEVBQU8sU0FSWDtVQVdJLE9BQUEsRUFDSTtZQUFBLFFBQUEsRUFBVSxDQUFDLElBQUMsQ0FBQSxlQUFlLENBQUMsTUFBakIsR0FBMEIsR0FBQSxHQUFJLElBQUMsQ0FBQSxZQUFZLENBQUMsUUFBN0MsQ0FBQSxHQUF5RCxDQUFuRTtXQVpSO1NBSEosQ0FEb0I7UUFvQnhCLElBQUMsQ0FBQSxlQUFlLENBQUMsS0FBakIsQ0FBdUIsQ0FBQSxTQUFBLEtBQUE7aUJBQUEsU0FBQTttQkFDbkIsS0FBQyxDQUFBLGdCQUFELENBQWtCLEtBQUMsQ0FBQSxhQUFhLENBQUMsU0FBZixDQUF5QixDQUF6QixDQUFsQjtVQURtQjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdkIsRUFoREo7O01Bb0RBLGVBQUEsR0FBc0IsSUFBQSxLQUFBLENBQ2xCO1FBQUEsZUFBQSxFQUFpQixhQUFqQjtRQUNBLENBQUEsRUFBRyxDQURIO1FBRUEsQ0FBQSxFQUFHLGdCQUFnQixDQUFDLENBQWpCLEdBQXFCLGdCQUFnQixDQUFDLE1BRnpDO1FBR0EsS0FBQSxFQUFPLGVBQWUsQ0FBQyxLQUh2QjtRQUlBLE1BQUEsRUFBUSxJQUFDLENBQUEsZUFBZSxDQUFDLE1BSnpCO1FBS0EsTUFBQSxFQUFRLGVBTFI7T0FEa0I7QUFTdEIsV0FBZ0IsdUNBQWhCO1FBQ1EsSUFBQSxTQUFBLENBQ0EsQ0FBQyxDQUFDLEtBQUYsQ0FDSSxFQURKLEVBRUksSUFBQyxDQUFBLGVBRkwsRUFHSTtVQUNJLENBQUEsRUFBRyxRQUFBLEdBQVcsQ0FBQyxlQUFlLENBQUMsS0FBaEIsR0FBd0IsQ0FBekIsQ0FEbEI7VUFFSSxDQUFBLEVBQUcsQ0FGUDtVQUdJLEtBQUEsRUFBTyxlQUFlLENBQUMsS0FBaEIsR0FBd0IsQ0FIbkM7VUFJSSxNQUFBLEVBQVEsZUFBZSxDQUFDLE1BSjVCO1VBS0ksTUFBQSxFQUFRLGVBTFo7VUFNSSxJQUFBLEVBQU0sRUFBQSxHQUFHLFVBQVcsQ0FBQSxDQUFDLFFBQUEsR0FBVyxJQUFDLENBQUEsY0FBYixDQUFBLEdBQStCLENBQS9CLENBTnhCO1VBT0ksUUFBQSxFQUFVLElBUGQ7U0FISixDQURBO0FBRFI7TUFrQkEsYUFBQSxHQUFvQixJQUFBLEtBQUEsQ0FDaEI7UUFBQSxlQUFBLEVBQWlCLGFBQWpCO1FBQ0EsQ0FBQSxFQUFHLENBREg7UUFFQSxDQUFBLEVBQUcsZUFBZSxDQUFDLENBQWhCLEdBQW9CLGVBQWUsQ0FBQyxNQUZ2QztRQUdBLEtBQUEsRUFBTyxlQUFlLENBQUMsS0FIdkI7UUFJQSxNQUFBLEVBQ0ksZUFBZSxDQUFDLE1BQWhCLEdBQ0EsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQW5CLENBREEsR0FFQSxDQUFDLENBQUMsZUFBZSxDQUFDLE1BQWxCLENBRkEsR0FHQSxDQUFDLENBQUMsSUFBQyxDQUFBLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBekIsQ0FIQSxHQUlBLENBQUMsQ0FBQyxJQUFDLENBQUEsYUFBYSxDQUFDLE9BQU8sQ0FBQyxNQUF6QixDQVRKO1FBV0EsTUFBQSxFQUFRLGVBWFI7T0FEZ0I7TUFjcEIsYUFBQSxHQUFnQjtBQUNoQixXQUFXLDZCQUFYO0FBQ0ksYUFBYyxtQ0FBZDtVQUNJLElBQ0ksSUFBQyxDQUFBLHFCQUFELElBQ0EsYUFBYSxDQUFDLFFBQWQsQ0FBQSxDQUFBLEtBQTRCLFlBQVksQ0FBQyxRQUFiLENBQUEsQ0FGaEM7WUFJSSxjQUFBLEdBQWlCLGFBQWEsQ0FBQyxRQUFkLENBQUEsQ0FBQSxLQUE0QixZQUFZLENBQUMsUUFBYixDQUFBO1lBRTdDLGdCQUFBLEdBQXVCLElBQUEsS0FBQSxDQUNuQjtjQUFBLE1BQUEsRUFBUSxhQUFSO2NBQ0EsZUFBQSxFQUFpQixhQURqQjtjQUVBLENBQUEsRUFBRyxHQUFBLEdBQU0sYUFBYSxDQUFDLE1BQXBCLEdBQTZCLENBRmhDO2NBR0EsQ0FBQSxFQUFHLE1BQUEsR0FBUyxhQUFhLENBQUMsS0FBdkIsR0FBK0IsQ0FIbEM7Y0FJQSxNQUFBLEVBQVEsYUFBYSxDQUFDLE1BQWQsR0FBdUIsQ0FKL0I7Y0FLQSxLQUFBLEVBQU8sYUFBYSxDQUFDLEtBQWQsR0FBc0IsQ0FMN0I7YUFEbUI7WUFRdkIsVUFBQSxHQUFhO1lBQ2IsSUFBRyxDQUFJLGNBQVA7Y0FFSSxJQUFDLENBQUEsb0JBQXFCLENBQUEsYUFBQSxDQUF0QixHQUF1QztBQUd2QztBQUFBLG1CQUFBLHNDQUFBOztnQkFDSSxJQUNJLGFBQWEsQ0FBQyxjQUFkLElBQWdDLGFBQWhDLElBQ0EsYUFBQSxJQUFpQixhQUFhLENBQUMsWUFGbkM7a0JBSUksQ0FBQyxDQUFDLEtBQUYsQ0FBUSxVQUFSLEVBQW9CLGFBQWEsQ0FBQyxjQUFsQyxFQUpKOztBQURKLGVBTEo7YUFBQSxNQUFBO2NBYUksVUFBQSxHQUFhLElBQUMsQ0FBQSwyQkFibEI7O1lBZUEsYUFBQSxHQUFvQixJQUFBLFNBQUEsQ0FDaEIsQ0FBQyxDQUFDLEtBQUYsQ0FDSSxFQURKLEVBRUksSUFBQyxDQUFBLGFBRkwsRUFHSTtjQUNJLE1BQUEsRUFBUSxnQkFEWjtjQUVJLENBQUEsRUFBRyxJQUFDLENBQUEsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUY3QjtjQUdJLENBQUEsRUFBRyxJQUFDLENBQUEsYUFBYSxDQUFDLE1BQU0sQ0FBQyxHQUg3QjtjQUlJLEtBQUEsRUFDSSxnQkFBZ0IsQ0FBQyxLQUFqQixHQUNBLENBQUMsQ0FBQyxJQUFDLENBQUEsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUF4QixDQURBLEdBRUEsQ0FBQyxDQUFDLElBQUMsQ0FBQSxhQUFhLENBQUMsTUFBTSxDQUFDLEtBQXhCLENBUFI7Y0FTSSxNQUFBLEVBQ0ksZ0JBQWdCLENBQUMsTUFBakIsR0FDQSxDQUFDLENBQUMsSUFBQyxDQUFBLGFBQWEsQ0FBQyxNQUFNLENBQUMsR0FBeEIsQ0FEQSxHQUVBLENBQUMsQ0FBQyxJQUFDLENBQUEsYUFBYSxDQUFDLE1BQU0sQ0FBQyxNQUF4QixDQVpSO2NBY0ksSUFBQSxFQUFNLEVBQUEsR0FBRSxDQUFDLGFBQWEsQ0FBQyxPQUFkLENBQUEsQ0FBRCxDQWRaO2FBSEosRUFtQkksVUFuQkosQ0FEZ0I7WUF1QnBCLGdCQUFnQixDQUFDLElBQWpCLEdBQXdCO1lBQ3hCLGdCQUFnQixDQUFDLGFBQWpCLEdBQWlDO1lBRWpDLElBQUcsQ0FBSSxjQUFQO2NBQ0ksSUFBQSxHQUFPO2NBR1AsYUFBYSxDQUFDLGdCQUFkLEdBQWlDLElBQUMsQ0FBQTtjQUNsQyxhQUFhLENBQUMsZUFBZCxHQUFnQyxDQUFDLENBQUMsSUFBRixDQUFPLGFBQVAsRUFBc0IsQ0FBQyxDQUFDLElBQUYsQ0FBTyxJQUFDLENBQUEsc0JBQVIsQ0FBdEI7Y0FFN0IsQ0FBQSxTQUFDLGdCQUFELEVBQW1CLElBQW5CO3VCQUNDLGdCQUFnQixDQUFDLEtBQWpCLENBQXVCLFNBQUE7a0JBQ25CLElBQUcsQ0FBSSxJQUFJLENBQUMsT0FBWjtBQUNJLDJCQURKOztrQkFFQSxJQUNJLElBQUksQ0FBQyxzQkFBTCxLQUErQixNQUEvQixJQUNBLENBQUksSUFBSSxDQUFDLG1CQUZiO29CQUlJLElBQUksQ0FBQyxvQkFBTCxDQUEwQixnQkFBZ0IsQ0FBQyxJQUEzQyxFQUFpRCxnQkFBZ0IsQ0FBQyxJQUFsRTtBQUNBLDJCQUxKOztrQkFNQSxJQUFJLElBQUksQ0FBQyx5QkFBTCxJQUFrQyxLQUF0QztvQkFDSSxJQUFJLENBQUMsb0JBQUwsQ0FBMEIsSUFBSSxDQUFDLHNCQUEvQixFQUF1RCxnQkFBZ0IsQ0FBQyxJQUF4RSxFQURKO21CQUFBLE1BQUE7b0JBR0ksSUFBSSxDQUFDLG9CQUFMLENBQTBCLGdCQUFnQixDQUFDLElBQTNDLEVBQWlELElBQUksQ0FBQyxvQkFBdEQsRUFISjs7eUJBSUEsSUFBSSxDQUFDLHlCQUFMLEdBQWlDLENBQUksQ0FBQyxJQUFJLENBQUMseUJBQUwsSUFBa0MsS0FBbkM7Z0JBYmxCLENBQXZCO2NBREQsQ0FBQSxDQUFILENBQUksZ0JBQUosRUFBc0IsSUFBdEI7Y0FpQkEsSUFBRyxJQUFDLENBQUEsWUFBSjtnQkFDSSxhQUFhLENBQUMsZUFBZCxHQUFnQyxJQUFDLENBQUE7Z0JBQ2pDLGFBQWEsQ0FBQyxjQUFkLEdBQStCLENBQUMsQ0FBQyxJQUFGLENBQU8sYUFBUCxFQUFzQixDQUFDLENBQUMsSUFBRixDQUFPLElBQUMsQ0FBQSxxQkFBUixDQUF0QjtnQkFFNUIsQ0FBQSxTQUFDLGdCQUFELEVBQW1CLGFBQW5CLEVBQWtDLElBQWxDO2tCQUNDLGdCQUFnQixDQUFDLEVBQWpCLENBQW9CLE1BQU0sQ0FBQyxTQUEzQixFQUFzQyxTQUFDLEtBQUQsRUFBUSxLQUFSOzJCQUNsQyxDQUFDLENBQUMsTUFBRixDQUFTLGFBQVQsRUFBd0IsYUFBYSxDQUFDLGVBQXRDO2tCQURrQyxDQUF0Qzt5QkFFQSxnQkFBZ0IsQ0FBQyxFQUFqQixDQUFvQixNQUFNLENBQUMsUUFBM0IsRUFBcUMsU0FBQyxLQUFELEVBQVEsS0FBUjtvQkFDakMsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxhQUFULEVBQXdCLGFBQWEsQ0FBQyxjQUF0QztvQkFDQSxJQUFJLElBQUksQ0FBQyxlQUFMLENBQXFCLGdCQUFnQixDQUFDLElBQXRDLENBQUo7NkJBQ0ksQ0FBQyxDQUFDLE1BQUYsQ0FBUyxhQUFULEVBQXdCLGFBQWEsQ0FBQyxnQkFBdEMsRUFESjs7a0JBRmlDLENBQXJDO2dCQUhELENBQUEsQ0FBSCxDQUFJLGdCQUFKLEVBQXNCLGFBQXRCLEVBQXFDLElBQXJDLEVBSko7ZUF4Qko7YUF4REo7O1VBNEZBLGFBQUEsR0FBZ0IsYUFBYSxDQUFDLE9BQWQsQ0FBc0IsQ0FBdEI7QUE3RnBCO0FBREo7bUJBaUdBLElBQUMsQ0FBQSxvQkFBRCxDQUFzQixJQUFDLENBQUEsc0JBQXZCLEVBQStDLElBQUMsQ0FBQSxvQkFBaEQsRUFBc0UsS0FBdEU7QUE5U0o7O0VBNUJLOzsyQkE0VVQsZUFBQSxHQUFpQixTQUFDLElBQUQ7QUFDYixXQUNJLElBQUMsQ0FBQSxzQkFBRCxJQUEyQixJQUEzQixJQUNBLElBQUEsSUFBUSxJQUFDLENBQUE7RUFIQTs7MkJBTWpCLE1BQUEsR0FBUSxTQUFBO0FBQ0osUUFBQTttREFBYyxDQUFFLE9BQWhCLENBQUE7RUFESTs7MkJBSVIsZ0JBQUEsR0FBa0IsU0FBQTtBQUNkLFdBQU8sSUFBQyxDQUFBO0VBRE07OzJCQUdsQixnQkFBQSxHQUFrQixTQUFDLG9CQUFEO0FBQ2QsUUFBQTtJQUFBLHFCQUFBLEdBQXdCLElBQUMsQ0FBQTtJQUV6QixJQUFDLENBQUEsYUFBRCxHQUFpQjtJQUNqQixJQUFDLENBQUEsTUFBRCxDQUFBO0lBQ0EsSUFBQyxDQUFBLE9BQUQsQ0FBQTtXQUVBLElBQUMsQ0FBQSxzQkFBRCxDQUF3QixxQkFBeEIsRUFBK0Msb0JBQS9DO0VBUGM7OzJCQVNsQix5QkFBQSxHQUEyQixTQUFBO0FBQ3ZCLFdBQU8sSUFBQyxDQUFBO0VBRGU7OzJCQUczQix1QkFBQSxHQUF5QixTQUFBO0FBQ3JCLFdBQU8sSUFBQyxDQUFBO0VBRGE7OzJCQUd6QixvQkFBQSxHQUFzQixTQUFDLDZCQUFELEVBQWdDLDJCQUFoQyxFQUE2RCxjQUE3RDtBQUNsQixRQUFBOztNQUQrRSxpQkFBaUI7O0lBQ2hHLElBQUcsNkJBQUEsR0FBZ0MsMkJBQW5DO01BQ0ksTUFDSSxDQUFDLDJCQUFELEVBQThCLDZCQUE5QixDQURKLEVBQUMsc0NBQUQsRUFBZ0MscUNBRHBDOztJQUlBLDhCQUFBLEdBQWlDLElBQUMsQ0FBQTtJQUNsQyw0QkFBQSxHQUErQixJQUFDLENBQUE7SUFHaEMsSUFDSSw4QkFBQSxLQUFrQyxNQUFsQyxJQUNBLDRCQUFBLEtBQWdDLE1BRnBDO01BSUksV0FBQSxHQUFjO0FBQ2QsYUFBTSxXQUFBLElBQWUsNEJBQXJCO1FBQ0ksYUFBQSxHQUFnQixJQUFDLENBQUEsb0JBQXFCLENBQUEsV0FBQSxDQUFZLENBQUM7UUFDbkQsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxhQUFULEVBQXdCLGFBQWEsQ0FBQyxlQUF0QztRQUNBLFdBQUEsR0FBYyxXQUFXLENBQUMsT0FBWixDQUFvQixDQUFwQjtNQUhsQixDQUxKOztJQVdBLElBQ0ksNkJBQUEsS0FBaUMsTUFBakMsSUFDQSwyQkFBQSxLQUErQixNQUZuQztNQUlJLFdBQUEsR0FBYztBQUNkLGFBQU0sV0FBQSxJQUFlLDJCQUFyQjtRQUNJLGFBQUEsR0FBZ0IsSUFBQyxDQUFBLG9CQUFxQixDQUFBLFdBQUEsQ0FBWSxDQUFDO1FBQ25ELENBQUMsQ0FBQyxNQUFGLENBQVMsYUFBVCxFQUF3QixhQUFhLENBQUMsZ0JBQXRDO1FBQ0EsV0FBQSxHQUFjLFdBQVcsQ0FBQyxPQUFaLENBQW9CLENBQXBCO01BSGxCLENBTEo7O0lBV0EsSUFBQyxDQUFBLHNCQUFELEdBQTBCO0lBQzFCLElBQUMsQ0FBQSxvQkFBRCxHQUF3QjtJQUd4QixJQUFHLGNBQUg7YUFDSSxJQUFDLENBQUEsNkJBQUQsQ0FDSSw4QkFESixFQUVJLDRCQUZKLEVBR0ksNkJBSEosRUFJSSwyQkFKSixFQURKOztFQW5Da0I7OzJCQTJDdEIsc0JBQUEsR0FBd0IsU0FBQTtBQUNwQixXQUFPLElBQUMsQ0FBQTtFQURZOzsyQkFHeEIsc0JBQUEsR0FBd0IsU0FBQyxtQkFBRDtJQUNwQixJQUFDLENBQUEsbUJBQUQsR0FBdUI7SUFDdkIsSUFBQyxDQUFBLE1BQUQsQ0FBQTtXQUNBLElBQUMsQ0FBQSxPQUFELENBQUE7RUFIb0I7OzJCQUt4Qix5QkFBQSxHQUEyQixTQUFDLE9BQUQ7V0FDdkIsSUFBQyxDQUFBLHNCQUFELEdBQTBCO0VBREg7OzJCQUczQixnQ0FBQSxHQUFrQyxTQUFDLE9BQUQ7V0FDOUIsSUFBQyxDQUFBLDZCQUFELEdBQWlDO0VBREg7Ozs7R0FuaUJEOzs7O0FENUNyQyxJQUFBOzs7QUFBTSxPQUFPLENBQUM7OztFQUNHLHNCQUFDLE9BQUQ7QUFDVCxRQUFBOztNQURVLFVBQVU7O0lBQ3BCLE1BQUEsR0FBUyxXQUFBLEdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBRixVQUFTLEdBQUcsR0FBWixDQUFELENBQVgsR0FBNEIsR0FBNUIsR0FBOEIsQ0FBQyxDQUFDLENBQUMsR0FBRixDQUFBLENBQUQ7SUFDdkMsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxPQUFYLEVBQ0k7TUFBQSxJQUFBLEVBQU0sb0JBQUEsR0FFUSxNQUZSLEdBRWUsd1dBRnJCO01BUUEsTUFBQSxFQUFRLEVBUlI7TUFTQSxLQUFBLEVBQU8sR0FUUDtNQVVBLGVBQUEsRUFBaUIsU0FWakI7S0FESjtJQWFBLDhDQUFNLE9BQU47SUFFQSxJQUFDLENBQUEsUUFBRCxHQUFZLFFBQVEsQ0FBQyxjQUFULENBQXdCLE1BQXhCO0VBakJIOztFQW1CYixZQUFDLENBQUEsTUFBRCxDQUFRLE9BQVIsRUFDSTtJQUFBLEdBQUEsRUFBSyxTQUFBO2FBQUcsSUFBQyxDQUFBLFFBQVEsQ0FBQztJQUFiLENBQUw7SUFDQSxHQUFBLEVBQUssU0FBQyxLQUFEO2FBQ0QsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLEdBQWtCO0lBRGpCLENBREw7R0FESjs7RUFLQSxZQUFDLENBQUEsTUFBRCxDQUFRLGlCQUFSLEVBQ0k7SUFBQSxHQUFBLEVBQUssU0FBQTthQUFHLElBQUMsQ0FBQTtJQUFKLENBQUw7SUFDQSxHQUFBLEVBQUssU0FBQyxlQUFEO01BQ0Q7QUFBQSxVQUFBO01BR0EsSUFBQyxDQUFBLGdCQUFELEdBQW9CO01BRXBCLFlBQUEsR0FBZTtBQUNmO0FBQUEsV0FBQSxxQ0FBQTs7UUFDSSxZQUFBLElBQWdCLGdCQUFBLEdBQWlCLE1BQU0sQ0FBQyxLQUF4QixHQUE4QixHQUE5QixHQUFpQyxNQUFNLENBQUMsSUFBeEMsR0FBNkM7QUFEakU7YUFHQSxJQUFDLENBQUEsUUFBUSxDQUFDLFNBQVYsR0FBc0I7SUFWckIsQ0FETDtHQURKOzs7O0dBekIrQjs7OztBREluQyxJQUFBLGdDQUFBO0VBQUE7Ozs7QUFBQSxXQUFBLEdBQ0MsTUFBTSxDQUFDLE1BQVAsQ0FBYyxFQUFkLEVBQWtCLE1BQU0sQ0FBQyxVQUF6QixFQUNDLG1CQUFBLEdBQXNCLFNBQUMsS0FBRCxFQUFRLEtBQVI7U0FDckIsQ0FBQyxLQUFBLEdBQVEsS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUF2QixDQUFBLEdBQTBDO0FBRHJCLENBRHZCLEVBSUM7RUFBQSxRQUFBLEVBQVUsU0FBQyxLQUFEO1dBQ1QsbUJBQUEsQ0FBb0IsS0FBcEIsRUFBMkIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUE3QztFQURTLENBQVY7RUFHQSxVQUFBLEVBQVksU0FBQyxLQUFEO1dBQ1YsS0FBSyxDQUFDLFdBQVcsQ0FBQyxVQUFuQixHQUFpQztFQUR0QixDQUhaO0VBTUEsT0FBQSxFQUFTLFNBQUMsS0FBRDtBQUNSLFFBQUE7SUFBRSxrQkFBb0IsS0FBSyxDQUFDO0lBQzVCLE9BQUEsR0FBVTtJQUNWLFlBQUEsR0FBZSxLQUFLLENBQUMsV0FBVyxDQUFDO0lBR2pDLElBQUcsTUFBTSxDQUFDLFNBQVAsQ0FBaUIsWUFBakIsQ0FBSDtBQUNDLGFBQU8sbUJBQUEsQ0FBb0IsS0FBcEIsRUFBMkIsWUFBM0IsRUFEUjs7SUFJQSxhQUFBLEdBQWdCLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQTFCLENBQWdDLEdBQWhDO0FBRWhCLFlBQU8sYUFBYSxDQUFDLE1BQXJCO0FBQUEsV0FDTSxDQUROO1FBRUUsT0FBTyxDQUFDLEdBQVIsR0FBYyxVQUFBLENBQVcsYUFBYyxDQUFBLENBQUEsQ0FBekI7UUFDZCxPQUFPLENBQUMsS0FBUixHQUFnQixVQUFBLENBQVcsYUFBYyxDQUFBLENBQUEsQ0FBekI7UUFDaEIsT0FBTyxDQUFDLE1BQVIsR0FBaUIsVUFBQSxDQUFXLGFBQWMsQ0FBQSxDQUFBLENBQXpCO1FBQ2pCLE9BQU8sQ0FBQyxJQUFSLEdBQWUsVUFBQSxDQUFXLGFBQWMsQ0FBQSxDQUFBLENBQXpCO0FBSlg7QUFETixXQU9NLENBUE47UUFRRSxPQUFPLENBQUMsR0FBUixHQUFjLFVBQUEsQ0FBVyxhQUFjLENBQUEsQ0FBQSxDQUF6QjtRQUNkLE9BQU8sQ0FBQyxLQUFSLEdBQWdCLFVBQUEsQ0FBVyxhQUFjLENBQUEsQ0FBQSxDQUF6QjtRQUNoQixPQUFPLENBQUMsTUFBUixHQUFpQixVQUFBLENBQVcsYUFBYyxDQUFBLENBQUEsQ0FBekI7UUFDakIsT0FBTyxDQUFDLElBQVIsR0FBZSxVQUFBLENBQVcsYUFBYyxDQUFBLENBQUEsQ0FBekI7QUFKWDtBQVBOLFdBYU0sQ0FiTjtRQWNFLE9BQU8sQ0FBQyxHQUFSLEdBQWMsVUFBQSxDQUFXLGFBQWMsQ0FBQSxDQUFBLENBQXpCO1FBQ2QsT0FBTyxDQUFDLEtBQVIsR0FBZ0IsVUFBQSxDQUFXLGFBQWMsQ0FBQSxDQUFBLENBQXpCO1FBQ2hCLE9BQU8sQ0FBQyxNQUFSLEdBQWlCLFVBQUEsQ0FBVyxhQUFjLENBQUEsQ0FBQSxDQUF6QjtRQUNqQixPQUFPLENBQUMsSUFBUixHQUFlLFVBQUEsQ0FBVyxhQUFjLENBQUEsQ0FBQSxDQUF6QjtBQUpYO0FBYk47UUFvQkUsT0FBTyxDQUFDLEdBQVIsR0FBYyxVQUFBLENBQVcsYUFBYyxDQUFBLENBQUEsQ0FBekI7UUFDZCxPQUFPLENBQUMsS0FBUixHQUFnQixVQUFBLENBQVcsYUFBYyxDQUFBLENBQUEsQ0FBekI7UUFDaEIsT0FBTyxDQUFDLE1BQVIsR0FBaUIsVUFBQSxDQUFXLGFBQWMsQ0FBQSxDQUFBLENBQXpCO1FBQ2pCLE9BQU8sQ0FBQyxJQUFSLEdBQWUsVUFBQSxDQUFXLGFBQWMsQ0FBQSxDQUFBLENBQXpCO0FBdkJqQjtXQTBCRSxDQUFDLE9BQU8sQ0FBQyxHQUFSLEdBQWMsZUFBZixDQUFBLEdBQStCLEtBQS9CLEdBQW1DLENBQUMsT0FBTyxDQUFDLEtBQVIsR0FBZ0IsZUFBakIsQ0FBbkMsR0FBb0UsS0FBcEUsR0FBd0UsQ0FBQyxPQUFPLENBQUMsTUFBUixHQUFpQixlQUFsQixDQUF4RSxHQUEwRyxLQUExRyxHQUE4RyxDQUFDLE9BQU8sQ0FBQyxJQUFSLEdBQWUsZUFBaEIsQ0FBOUcsR0FBOEk7RUF0Q3hJLENBTlQ7Q0FKRDs7QUFtREssT0FBTyxDQUFDOzs7RUFDQSx1QkFBQyxPQUFEOztNQUFDLFVBQVU7OztJQUN2QixDQUFDLENBQUMsUUFBRixDQUFXLE9BQVgsRUFDQztNQUFBLEtBQUEsRUFBTyxNQUFNLENBQUMsS0FBUCxHQUFlLENBQXRCO01BQ0EsTUFBQSxFQUFRLEVBRFI7TUFFQSxlQUFBLEVBQWlCLE9BRmpCO01BR0EsUUFBQSxFQUFVLEVBSFY7TUFJQSxVQUFBLEVBQVksQ0FKWjtNQUtBLE9BQUEsRUFBUyxFQUxUO01BTUEsSUFBQSxFQUFNLEVBTk47TUFPQSxXQUFBLEVBQWEsRUFQYjtNQVFBLElBQUEsRUFBTSxNQVJOO01BU0EsV0FBQSxFQUFhLElBVGI7TUFVQSxZQUFBLEVBQWMsSUFWZDtNQVdBLGNBQUEsRUFBZ0IsSUFYaEI7TUFZQSxVQUFBLEVBQVksSUFaWjtNQWFBLFNBQUEsRUFBVyxLQWJYO01BY0EsU0FBQSxFQUFXLE1BZFg7TUFlQSxVQUFBLEVBQVksZUFmWjtNQWdCQSxVQUFBLEVBQVksS0FoQlo7TUFpQkEsUUFBQSxFQUFVLENBakJWO01Ba0JBLFFBQUEsRUFBVSxLQWxCVjtNQW1CQSxPQUFBLEVBQVMsSUFuQlQ7S0FERDtJQXNCQSwrQ0FBTSxPQUFOO0lBR0EsSUFBQyxDQUFBLFdBQVcsQ0FBQyxRQUFiLEdBQXdCLE9BQU8sQ0FBQztJQUNoQyxJQUFDLENBQUEsV0FBVyxDQUFDLFVBQWIsR0FBMEIsT0FBTyxDQUFDO0lBQ2xDLElBQUMsQ0FBQSxXQUFXLENBQUMsT0FBYixHQUF1QixPQUFPLENBQUM7SUFFL0IsSUFBZ0QsZ0NBQWhEO01BQUEsSUFBQyxDQUFBLGdCQUFELEdBQW9CLE9BQU8sQ0FBQyxpQkFBNUI7O0lBQ0EsSUFBQyxDQUFBLEtBQUQsR0FBUyxRQUFRLENBQUMsYUFBVCxDQUEwQixPQUFPLENBQUMsUUFBWCxHQUF5QixVQUF6QixHQUF5QyxPQUFoRTtJQUNULElBQUMsQ0FBQSxLQUFLLENBQUMsRUFBUCxHQUFZLFFBQUEsR0FBUSxDQUFDLENBQUMsQ0FBQyxHQUFGLENBQUEsQ0FBRDtJQUdwQixDQUFDLENBQUMsTUFBRixDQUFTLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBaEIsRUFDQztNQUFBLEtBQUEsRUFBTyxXQUFZLENBQUEsT0FBQSxDQUFaLENBQXFCLElBQXJCLENBQVA7TUFDQSxNQUFBLEVBQVEsV0FBWSxDQUFBLFFBQUEsQ0FBWixDQUFzQixJQUF0QixDQURSO01BRUEsUUFBQSxFQUFVLFdBQVksQ0FBQSxVQUFBLENBQVosQ0FBd0IsSUFBeEIsQ0FGVjtNQUdBLFVBQUEsRUFBWSxXQUFZLENBQUEsWUFBQSxDQUFaLENBQTBCLElBQTFCLENBSFo7TUFJQSxPQUFBLEVBQVMsTUFKVDtNQUtBLE1BQUEsRUFBUSxNQUxSO01BTUEsZUFBQSxFQUFpQixPQUFPLENBQUMsZUFOekI7TUFPQSxPQUFBLEVBQVMsV0FBWSxDQUFBLFNBQUEsQ0FBWixDQUF1QixJQUF2QixDQVBUO01BUUEsVUFBQSxFQUFZLE9BQU8sQ0FBQyxVQVJwQjtNQVNBLEtBQUEsRUFBTyxPQUFPLENBQUMsU0FUZjtNQVVBLFVBQUEsRUFBWSxPQUFPLENBQUMsVUFWcEI7S0FERDtJQWFBLENBQUMsQ0FBQyxNQUFGLENBQVMsSUFBQyxDQUFBLEtBQVYsRUFDQztNQUFBLEtBQUEsRUFBTyxPQUFPLENBQUMsSUFBZjtNQUNBLElBQUEsRUFBTSxPQUFPLENBQUMsSUFEZDtNQUVBLFdBQUEsRUFBYSxPQUFPLENBQUMsV0FGckI7S0FERDtJQUtBLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBUCxDQUFvQixVQUFwQixFQUFnQyxPQUFPLENBQUMsUUFBeEM7SUFDQSxJQUFDLENBQUEsS0FBSyxDQUFDLFlBQVAsQ0FBb0IsYUFBcEIsRUFBc0MsT0FBTyxDQUFDLFdBQVgsR0FBNEIsSUFBNUIsR0FBc0MsS0FBekU7SUFDQSxJQUFDLENBQUEsS0FBSyxDQUFDLFlBQVAsQ0FBb0IsY0FBcEIsRUFBdUMsT0FBTyxDQUFDLFlBQVgsR0FBNkIsSUFBN0IsR0FBdUMsS0FBM0U7SUFDQSxJQUFDLENBQUEsS0FBSyxDQUFDLFlBQVAsQ0FBb0IsZ0JBQXBCLEVBQXlDLE9BQU8sQ0FBQyxjQUFYLEdBQStCLElBQS9CLEdBQXlDLEtBQS9FO0lBQ0EsSUFBQyxDQUFBLEtBQUssQ0FBQyxZQUFQLENBQW9CLFlBQXBCLEVBQXFDLE9BQU8sQ0FBQyxVQUFYLEdBQTJCLElBQTNCLEdBQXFDLEtBQXZFO0lBQ0EsSUFBRyxDQUFJLE9BQU8sQ0FBQyxPQUFmO01BQ0MsSUFBQyxDQUFBLEtBQUssQ0FBQyxZQUFQLENBQW9CLFVBQXBCLEVBQWdDLElBQWhDLEVBREQ7O0lBRUEsSUFBRyxPQUFPLENBQUMsU0FBWDtNQUNDLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBUCxDQUFvQixXQUFwQixFQUFpQyxJQUFqQyxFQUREOztJQUdBLElBQUMsQ0FBQSxJQUFELEdBQVEsUUFBUSxDQUFDLGFBQVQsQ0FBdUIsTUFBdkI7SUFFUixJQUFDLENBQUEsSUFBSSxDQUFDLFdBQU4sQ0FBa0IsSUFBQyxDQUFBLEtBQW5CO0lBQ0EsSUFBQyxDQUFBLFFBQVEsQ0FBQyxXQUFWLENBQXNCLElBQUMsQ0FBQSxJQUF2QjtJQUVBLElBQUMsQ0FBQSxlQUFELEdBQW1CO0lBQ25CLElBQW9ELElBQUMsQ0FBQSxnQkFBckQ7TUFBQSxJQUFDLENBQUEsc0JBQUQsQ0FBd0IsT0FBTyxDQUFDLGdCQUFoQyxFQUFBOztFQXJFWTs7RUF1RWIsYUFBQyxDQUFBLE1BQUQsQ0FBUSxPQUFSLEVBQ0M7SUFBQSxHQUFBLEVBQUssU0FBQTthQUFHLElBQUMsQ0FBQSxLQUFLLENBQUM7SUFBVixDQUFMO0lBQ0EsR0FBQSxFQUFLLFNBQUMsS0FBRDthQUNKLENBQUMsQ0FBQyxNQUFGLENBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFoQixFQUF1QixLQUF2QjtJQURJLENBREw7R0FERDs7RUFLQSxhQUFDLENBQUEsTUFBRCxDQUFRLE9BQVIsRUFDQztJQUFBLEdBQUEsRUFBSyxTQUFBO2FBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQztJQUFWLENBQUw7SUFDQSxHQUFBLEVBQUssU0FBQyxLQUFEO2FBQ0osSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFQLEdBQWU7SUFEWCxDQURMO0dBREQ7OzBCQUtBLHNCQUFBLEdBQXdCLFNBQUMsS0FBRDtBQUN2QixRQUFBO0lBQUEsSUFBQyxDQUFBLGdCQUFELEdBQW9CO0lBQ3BCLElBQUcsc0JBQUg7TUFDQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQWQsQ0FBMEIsSUFBQyxDQUFBLFNBQTNCLEVBREQ7O0lBRUEsSUFBQyxDQUFBLFNBQUQsR0FBYSxRQUFRLENBQUMsYUFBVCxDQUF1QixPQUF2QjtJQUNiLElBQUMsQ0FBQSxTQUFTLENBQUMsSUFBWCxHQUFrQjtJQUNsQixHQUFBLEdBQU0sR0FBQSxHQUFJLElBQUMsQ0FBQSxLQUFLLENBQUMsRUFBWCxHQUFjLHVDQUFkLEdBQXFELElBQUMsQ0FBQSxnQkFBdEQsR0FBdUU7SUFDN0UsSUFBQyxDQUFBLFNBQVMsQ0FBQyxXQUFYLENBQXVCLFFBQVEsQ0FBQyxjQUFULENBQXdCLEdBQXhCLENBQXZCO1dBQ0EsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFkLENBQTBCLElBQUMsQ0FBQSxTQUEzQjtFQVJ1Qjs7MEJBVXhCLEtBQUEsR0FBTyxTQUFBO1dBQ04sSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFQLENBQUE7RUFETTs7MEJBR1AsT0FBQSxHQUFTLFNBQUE7V0FDUixJQUFDLENBQUEsS0FBSyxDQUFDLElBQVAsQ0FBQTtFQURROzswQkFHVCxPQUFBLEdBQVMsU0FBQyxFQUFEO1dBQ1IsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFBUCxDQUF3QixPQUF4QixFQUFpQyxTQUFBO2FBQ2hDLEVBQUUsQ0FBQyxLQUFILENBQVMsSUFBVDtJQURnQyxDQUFqQztFQURROzswQkFJVCxTQUFBLEdBQVcsU0FBQyxFQUFEO1dBQ1YsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFBUCxDQUF3QixNQUF4QixFQUFnQyxTQUFBO2FBQy9CLEVBQUUsQ0FBQyxLQUFILENBQVMsSUFBVDtJQUQrQixDQUFoQztFQURVOzswQkFJWCxPQUFBLEdBQVMsU0FBQTtXQUNSLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBUCxDQUFvQixVQUFwQixFQUFnQyxJQUFoQztFQURROzswQkFHVCxNQUFBLEdBQVEsU0FBQTtXQUNQLElBQUMsQ0FBQSxLQUFLLENBQUMsZUFBUCxDQUF1QixVQUF2QixFQUFtQyxJQUFuQztFQURPOzs7O0dBN0cyQjs7OztBRDlEcEMsSUFBQSxNQUFBO0VBQUE7OztBQUFBLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7QUFFSCxPQUFPLENBQUM7OztFQUNHLGlDQUFDLE9BQUQ7O01BQUMsVUFBVTs7SUFDcEIsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxPQUFYLEVBQ0k7TUFBQSxlQUFBLEVBQWlCLElBQWpCO01BQ0EsQ0FBQSxFQUFHLENBQUMsTUFBTSxDQUFDLEtBQVAsR0FBZSxrQ0FBa0MsQ0FBQyxLQUFuRCxDQUFBLEdBQTRELENBRC9EO01BRUEsQ0FBQSxFQUFHLENBQUMsTUFBTSxDQUFDLE1BQVAsR0FBZ0Isa0NBQWtDLENBQUMsTUFBcEQsQ0FBQSxHQUE4RCxDQUZqRTtLQURKO0lBSUEseURBQU0sT0FBTjtJQUVBLElBQUMsQ0FBQSxLQUFELEdBQ0k7TUFBQSxpQ0FBQSxFQUFtQyxpQ0FBaUMsQ0FBQyxJQUFsQyxDQUFBLENBQW5DO01BQ0EsZ0NBQUEsRUFBa0MsZ0NBQWdDLENBQUMsSUFBakMsQ0FBQSxDQURsQztNQUVBLGdDQUFBLEVBQWtDLGdDQUFnQyxDQUFDLElBQWpDLENBQUEsQ0FGbEM7TUFHQSwyQkFBQSxFQUE2QiwyQkFBMkIsQ0FBQyxJQUE1QixDQUFBLENBSDdCO01BSUEsNEJBQUEsRUFBOEIsNEJBQTRCLENBQUMsSUFBN0IsQ0FBQSxDQUo5QjtNQUtBLGtDQUFBLEVBQW9DLGtDQUFrQyxDQUFDLElBQW5DLENBQUEsQ0FMcEM7O0lBT0osTUFBTSxDQUFDLFlBQVAsQ0FBb0IsSUFBcEIsRUFBdUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxrQ0FBOUIsRUFBa0UsSUFBQyxDQUFBLEtBQW5FO0VBZlM7O29DQWlCYixVQUFBLEdBQVksTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxZQUFEO1dBQzFCLElBQUMsQ0FBQSxLQUFLLENBQUMsMkJBQTJCLENBQUMsS0FBbkMsQ0FBeUMsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ3JDLFlBQVksQ0FBQyxLQUFiLENBQUE7TUFEcUM7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXpDO0VBRDBCLENBQWxCOztvQ0FJWixXQUFBLEdBQWEsTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxhQUFEO1dBQzNCLElBQUMsQ0FBQSxLQUFLLENBQUMsNEJBQTRCLENBQUMsS0FBcEMsQ0FBMEMsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ3RDLGFBQWEsQ0FBQyxLQUFkLENBQUE7TUFEc0M7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTFDO0VBRDJCLENBQWxCOzs7O0dBdEI2Qjs7OztBREY5QyxJQUFBLE1BQUE7RUFBQTs7O0FBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSOztBQUVILE9BQU8sQ0FBQzs7O0VBQ0csaUNBQUMsT0FBRDs7TUFBQyxVQUFVOztJQUNwQixDQUFDLENBQUMsUUFBRixDQUFXLE9BQVgsRUFDSTtNQUFBLGVBQUEsRUFBaUIsSUFBakI7TUFDQSxDQUFBLEVBQUcsQ0FBQyxNQUFNLENBQUMsS0FBUCxHQUFlLGtDQUFrQyxDQUFDLEtBQW5ELENBQUEsR0FBNEQsQ0FEL0Q7TUFFQSxDQUFBLEVBQUcsQ0FBQyxNQUFNLENBQUMsTUFBUCxHQUFnQixrQ0FBa0MsQ0FBQyxNQUFwRCxDQUFBLEdBQThELENBRmpFO0tBREo7SUFJQSx5REFBTSxPQUFOO0lBRUEsSUFBQyxDQUFBLEtBQUQsR0FDSTtNQUFBLGlDQUFBLEVBQW1DLGlDQUFpQyxDQUFDLElBQWxDLENBQUEsQ0FBbkM7TUFDQSxnQ0FBQSxFQUFrQyxnQ0FBZ0MsQ0FBQyxJQUFqQyxDQUFBLENBRGxDO01BRUEsZ0NBQUEsRUFBa0MsZ0NBQWdDLENBQUMsSUFBakMsQ0FBQSxDQUZsQztNQUdBLDJCQUFBLEVBQTZCLDJCQUEyQixDQUFDLElBQTVCLENBQUEsQ0FIN0I7TUFJQSw0QkFBQSxFQUE4Qiw0QkFBNEIsQ0FBQyxJQUE3QixDQUFBLENBSjlCO01BS0Esa0NBQUEsRUFBb0Msa0NBQWtDLENBQUMsSUFBbkMsQ0FBQSxDQUxwQzs7SUFPSixNQUFNLENBQUMsWUFBUCxDQUFvQixJQUFwQixFQUF1QixJQUFDLENBQUEsS0FBSyxDQUFDLGtDQUE5QixFQUFrRSxJQUFDLENBQUEsS0FBbkU7RUFmUzs7b0NBaUJiLFVBQUEsR0FBWSxNQUFNLENBQUMsVUFBUCxDQUFrQixTQUFDLFlBQUQ7V0FDMUIsSUFBQyxDQUFBLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxLQUFuQyxDQUF5QyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDckMsWUFBWSxDQUFDLEtBQWIsQ0FBQTtNQURxQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBekM7RUFEMEIsQ0FBbEI7O29DQUlaLFdBQUEsR0FBYSxNQUFNLENBQUMsVUFBUCxDQUFrQixTQUFDLGFBQUQ7V0FDM0IsSUFBQyxDQUFBLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxLQUFwQyxDQUEwQyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDdEMsYUFBYSxDQUFDLEtBQWQsQ0FBQTtNQURzQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMUM7RUFEMkIsQ0FBbEI7Ozs7R0F0QjZCOzs7O0FERjlDLElBQUEsTUFBQTtFQUFBOzs7QUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0FBRUgsT0FBTyxDQUFDOzs7RUFDRyxpQ0FBQyxPQUFEOztNQUFDLFVBQVU7O0lBQ3BCLENBQUMsQ0FBQyxRQUFGLENBQVcsT0FBWCxFQUNJO01BQUEsZUFBQSxFQUFpQixJQUFqQjtNQUNBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxLQUFQLEdBQWUsa0NBQWtDLENBQUMsS0FBbkQsQ0FBQSxHQUE0RCxDQUQvRDtNQUVBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxNQUFQLEdBQWdCLGtDQUFrQyxDQUFDLE1BQXBELENBQUEsR0FBOEQsQ0FGakU7S0FESjtJQUlBLHlEQUFNLE9BQU47SUFFQSxJQUFDLENBQUEsS0FBRCxHQUNJO01BQUEsaUNBQUEsRUFBbUMsaUNBQWlDLENBQUMsSUFBbEMsQ0FBQSxDQUFuQztNQUNBLGdDQUFBLEVBQWtDLGdDQUFnQyxDQUFDLElBQWpDLENBQUEsQ0FEbEM7TUFFQSxnQ0FBQSxFQUFrQyxnQ0FBZ0MsQ0FBQyxJQUFqQyxDQUFBLENBRmxDO01BR0EsMkJBQUEsRUFBNkIsMkJBQTJCLENBQUMsSUFBNUIsQ0FBQSxDQUg3QjtNQUlBLDRCQUFBLEVBQThCLDRCQUE0QixDQUFDLElBQTdCLENBQUEsQ0FKOUI7TUFLQSxrQ0FBQSxFQUFvQyxrQ0FBa0MsQ0FBQyxJQUFuQyxDQUFBLENBTHBDOztJQU9KLE1BQU0sQ0FBQyxZQUFQLENBQW9CLElBQXBCLEVBQXVCLElBQUMsQ0FBQSxLQUFLLENBQUMsa0NBQTlCLEVBQWtFLElBQUMsQ0FBQSxLQUFuRTtFQWZTOztvQ0FpQmIsVUFBQSxHQUFZLE1BQU0sQ0FBQyxVQUFQLENBQWtCLFNBQUMsWUFBRDtXQUMxQixJQUFDLENBQUEsS0FBSyxDQUFDLDJCQUEyQixDQUFDLEtBQW5DLENBQXlDLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUNyQyxZQUFZLENBQUMsS0FBYixDQUFBO01BRHFDO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF6QztFQUQwQixDQUFsQjs7b0NBSVosV0FBQSxHQUFhLE1BQU0sQ0FBQyxVQUFQLENBQWtCLFNBQUMsYUFBRDtXQUMzQixJQUFDLENBQUEsS0FBSyxDQUFDLDRCQUE0QixDQUFDLEtBQXBDLENBQTBDLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUN0QyxhQUFhLENBQUMsS0FBZCxDQUFBO01BRHNDO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUExQztFQUQyQixDQUFsQjs7OztHQXRCNkI7Ozs7QURGOUMsSUFBQSxNQUFBO0VBQUE7OztBQUFBLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7QUFFSCxPQUFPLENBQUM7OztFQUNHLGlDQUFDLE9BQUQ7O01BQUMsVUFBVTs7SUFDcEIsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxPQUFYLEVBQ0k7TUFBQSxlQUFBLEVBQWlCLElBQWpCO01BQ0EsQ0FBQSxFQUFHLENBQUMsTUFBTSxDQUFDLEtBQVAsR0FBZSxrQ0FBa0MsQ0FBQyxLQUFuRCxDQUFBLEdBQTRELENBRC9EO01BRUEsQ0FBQSxFQUFHLENBQUMsTUFBTSxDQUFDLE1BQVAsR0FBZ0Isa0NBQWtDLENBQUMsTUFBcEQsQ0FBQSxHQUE4RCxDQUZqRTtLQURKO0lBSUEseURBQU0sT0FBTjtJQUVBLElBQUMsQ0FBQSxLQUFELEdBQ0k7TUFBQSxpQ0FBQSxFQUFtQyxpQ0FBaUMsQ0FBQyxJQUFsQyxDQUFBLENBQW5DO01BQ0EsZ0NBQUEsRUFBa0MsZ0NBQWdDLENBQUMsSUFBakMsQ0FBQSxDQURsQztNQUVBLGdDQUFBLEVBQWtDLGdDQUFnQyxDQUFDLElBQWpDLENBQUEsQ0FGbEM7TUFHQSwyQkFBQSxFQUE2QiwyQkFBMkIsQ0FBQyxJQUE1QixDQUFBLENBSDdCO01BSUEsNEJBQUEsRUFBOEIsNEJBQTRCLENBQUMsSUFBN0IsQ0FBQSxDQUo5QjtNQUtBLGtDQUFBLEVBQW9DLGtDQUFrQyxDQUFDLElBQW5DLENBQUEsQ0FMcEM7O0lBT0osTUFBTSxDQUFDLFlBQVAsQ0FBb0IsSUFBcEIsRUFBdUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxrQ0FBOUIsRUFBa0UsSUFBQyxDQUFBLEtBQW5FO0VBZlM7O29DQWlCYixVQUFBLEdBQVksTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxZQUFEO1dBQzFCLElBQUMsQ0FBQSxLQUFLLENBQUMsMkJBQTJCLENBQUMsS0FBbkMsQ0FBeUMsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ3JDLFlBQVksQ0FBQyxLQUFiLENBQUE7TUFEcUM7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXpDO0VBRDBCLENBQWxCOztvQ0FJWixXQUFBLEdBQWEsTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxhQUFEO1dBQzNCLElBQUMsQ0FBQSxLQUFLLENBQUMsNEJBQTRCLENBQUMsS0FBcEMsQ0FBMEMsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ3RDLGFBQWEsQ0FBQyxLQUFkLENBQUE7TUFEc0M7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTFDO0VBRDJCLENBQWxCOzs7O0dBdEI2Qjs7OztBREY5QyxJQUFBLE1BQUE7RUFBQTs7O0FBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSOztBQUVILE9BQU8sQ0FBQzs7O0VBQ0csNkJBQUMsT0FBRDs7TUFBQyxVQUFVOztJQUNwQixDQUFDLENBQUMsUUFBRixDQUFXLE9BQVgsRUFDSTtNQUFBLGVBQUEsRUFBaUIsSUFBakI7TUFDQSxDQUFBLEVBQUcsQ0FBQyxNQUFNLENBQUMsS0FBUCxHQUFlLDhCQUE4QixDQUFDLEtBQS9DLENBQUEsR0FBd0QsQ0FEM0Q7TUFFQSxDQUFBLEVBQUcsQ0FBQyxNQUFNLENBQUMsTUFBUCxHQUFnQiw4QkFBOEIsQ0FBQyxNQUFoRCxDQUFBLEdBQTBELENBRjdEO0tBREo7SUFJQSxxREFBTSxPQUFOO0lBRUEsSUFBQyxDQUFBLEtBQUQsR0FDSTtNQUFBLDZCQUFBLEVBQStCLDZCQUE2QixDQUFDLElBQTlCLENBQUEsQ0FBL0I7TUFDQSw0QkFBQSxFQUE4Qiw0QkFBNEIsQ0FBQyxJQUE3QixDQUFBLENBRDlCO01BRUEsNEJBQUEsRUFBOEIsNEJBQTRCLENBQUMsSUFBN0IsQ0FBQSxDQUY5QjtNQUdBLHVCQUFBLEVBQXlCLHVCQUF1QixDQUFDLElBQXhCLENBQUEsQ0FIekI7TUFJQSx3QkFBQSxFQUEwQix3QkFBd0IsQ0FBQyxJQUF6QixDQUFBLENBSjFCO01BS0EsOEJBQUEsRUFBZ0MsOEJBQThCLENBQUMsSUFBL0IsQ0FBQSxDQUxoQzs7SUFPSixNQUFNLENBQUMsWUFBUCxDQUFvQixJQUFwQixFQUF1QixJQUFDLENBQUEsS0FBSyxDQUFDLDhCQUE5QixFQUE4RCxJQUFDLENBQUEsS0FBL0Q7RUFmUzs7Z0NBaUJiLFVBQUEsR0FBWSxNQUFNLENBQUMsVUFBUCxDQUFrQixTQUFDLFlBQUQ7V0FDMUIsSUFBQyxDQUFBLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxLQUEvQixDQUFxQyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDakMsWUFBWSxDQUFDLEtBQWIsQ0FBQTtNQURpQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBckM7RUFEMEIsQ0FBbEI7O2dDQUlaLFdBQUEsR0FBYSxNQUFNLENBQUMsVUFBUCxDQUFrQixTQUFDLGFBQUQ7V0FDM0IsSUFBQyxDQUFBLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxLQUFoQyxDQUFzQyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDbEMsYUFBYSxDQUFDLEtBQWQsQ0FBQTtNQURrQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdEM7RUFEMkIsQ0FBbEI7Ozs7R0F0QnlCOzs7O0FERjFDLElBQUEsTUFBQTtFQUFBOzs7QUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0FBRUgsT0FBTyxDQUFDOzs7RUFDRyw2QkFBQyxPQUFEOztNQUFDLFVBQVU7O0lBQ3BCLENBQUMsQ0FBQyxRQUFGLENBQVcsT0FBWCxFQUNJO01BQUEsZUFBQSxFQUFpQixJQUFqQjtNQUNBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxLQUFQLEdBQWUsOEJBQThCLENBQUMsS0FBL0MsQ0FBQSxHQUF3RCxDQUQzRDtNQUVBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxNQUFQLEdBQWdCLDhCQUE4QixDQUFDLE1BQWhELENBQUEsR0FBMEQsQ0FGN0Q7S0FESjtJQUlBLHFEQUFNLE9BQU47SUFFQSxJQUFDLENBQUEsS0FBRCxHQUNJO01BQUEsNkJBQUEsRUFBK0IsNkJBQTZCLENBQUMsSUFBOUIsQ0FBQSxDQUEvQjtNQUNBLDRCQUFBLEVBQThCLDRCQUE0QixDQUFDLElBQTdCLENBQUEsQ0FEOUI7TUFFQSw0QkFBQSxFQUE4Qiw0QkFBNEIsQ0FBQyxJQUE3QixDQUFBLENBRjlCO01BR0EsdUJBQUEsRUFBeUIsdUJBQXVCLENBQUMsSUFBeEIsQ0FBQSxDQUh6QjtNQUlBLHdCQUFBLEVBQTBCLHdCQUF3QixDQUFDLElBQXpCLENBQUEsQ0FKMUI7TUFLQSw4QkFBQSxFQUFnQyw4QkFBOEIsQ0FBQyxJQUEvQixDQUFBLENBTGhDOztJQU9KLE1BQU0sQ0FBQyxZQUFQLENBQW9CLElBQXBCLEVBQXVCLElBQUMsQ0FBQSxLQUFLLENBQUMsOEJBQTlCLEVBQThELElBQUMsQ0FBQSxLQUEvRDtFQWZTOztnQ0FpQmIsVUFBQSxHQUFZLE1BQU0sQ0FBQyxVQUFQLENBQWtCLFNBQUMsWUFBRDtXQUMxQixJQUFDLENBQUEsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEtBQS9CLENBQXFDLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUNqQyxZQUFZLENBQUMsS0FBYixDQUFBO01BRGlDO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFyQztFQUQwQixDQUFsQjs7Z0NBSVosV0FBQSxHQUFhLE1BQU0sQ0FBQyxVQUFQLENBQWtCLFNBQUMsYUFBRDtXQUMzQixJQUFDLENBQUEsS0FBSyxDQUFDLHdCQUF3QixDQUFDLEtBQWhDLENBQXNDLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUNsQyxhQUFhLENBQUMsS0FBZCxDQUFBO01BRGtDO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF0QztFQUQyQixDQUFsQjs7OztHQXRCeUI7Ozs7QURGMUMsSUFBQSxNQUFBO0VBQUE7OztBQUFBLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7QUFFSCxPQUFPLENBQUM7OztFQUNHLDZCQUFDLE9BQUQ7O01BQUMsVUFBVTs7SUFDcEIsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxPQUFYLEVBQ0k7TUFBQSxlQUFBLEVBQWlCLElBQWpCO01BQ0EsQ0FBQSxFQUFHLENBQUMsTUFBTSxDQUFDLEtBQVAsR0FBZSw4QkFBOEIsQ0FBQyxLQUEvQyxDQUFBLEdBQXdELENBRDNEO01BRUEsQ0FBQSxFQUFHLENBQUMsTUFBTSxDQUFDLE1BQVAsR0FBZ0IsOEJBQThCLENBQUMsTUFBaEQsQ0FBQSxHQUEwRCxDQUY3RDtLQURKO0lBSUEscURBQU0sT0FBTjtJQUVBLElBQUMsQ0FBQSxLQUFELEdBQ0k7TUFBQSw2QkFBQSxFQUErQiw2QkFBNkIsQ0FBQyxJQUE5QixDQUFBLENBQS9CO01BQ0EsNEJBQUEsRUFBOEIsNEJBQTRCLENBQUMsSUFBN0IsQ0FBQSxDQUQ5QjtNQUVBLDRCQUFBLEVBQThCLDRCQUE0QixDQUFDLElBQTdCLENBQUEsQ0FGOUI7TUFHQSx1QkFBQSxFQUF5Qix1QkFBdUIsQ0FBQyxJQUF4QixDQUFBLENBSHpCO01BSUEsd0JBQUEsRUFBMEIsd0JBQXdCLENBQUMsSUFBekIsQ0FBQSxDQUoxQjtNQUtBLDhCQUFBLEVBQWdDLDhCQUE4QixDQUFDLElBQS9CLENBQUEsQ0FMaEM7O0lBT0osTUFBTSxDQUFDLFlBQVAsQ0FBb0IsSUFBcEIsRUFBdUIsSUFBQyxDQUFBLEtBQUssQ0FBQyw4QkFBOUIsRUFBOEQsSUFBQyxDQUFBLEtBQS9EO0VBZlM7O2dDQWlCYixVQUFBLEdBQVksTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxZQUFEO1dBQzFCLElBQUMsQ0FBQSxLQUFLLENBQUMsdUJBQXVCLENBQUMsS0FBL0IsQ0FBcUMsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ2pDLFlBQVksQ0FBQyxLQUFiLENBQUE7TUFEaUM7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXJDO0VBRDBCLENBQWxCOztnQ0FJWixXQUFBLEdBQWEsTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxhQUFEO1dBQzNCLElBQUMsQ0FBQSxLQUFLLENBQUMsd0JBQXdCLENBQUMsS0FBaEMsQ0FBc0MsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ2xDLGFBQWEsQ0FBQyxLQUFkLENBQUE7TUFEa0M7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXRDO0VBRDJCLENBQWxCOzs7O0dBdEJ5Qjs7OztBREYxQyxJQUFBLE1BQUE7RUFBQTs7O0FBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSOztBQUVILE9BQU8sQ0FBQzs7O0VBQ0csaUNBQUMsT0FBRDs7TUFBQyxVQUFVOztJQUNwQixDQUFDLENBQUMsUUFBRixDQUFXLE9BQVgsRUFDSTtNQUFBLGVBQUEsRUFBaUIsSUFBakI7TUFDQSxDQUFBLEVBQUcsQ0FBQyxNQUFNLENBQUMsS0FBUCxHQUFlLGtDQUFrQyxDQUFDLEtBQW5ELENBQUEsR0FBNEQsQ0FEL0Q7TUFFQSxDQUFBLEVBQUcsQ0FBQyxNQUFNLENBQUMsTUFBUCxHQUFnQixrQ0FBa0MsQ0FBQyxNQUFwRCxDQUFBLEdBQThELENBRmpFO0tBREo7SUFJQSx5REFBTSxPQUFOO0lBRUEsSUFBQyxDQUFBLEtBQUQsR0FDSTtNQUFBLGlDQUFBLEVBQW1DLGlDQUFpQyxDQUFDLElBQWxDLENBQUEsQ0FBbkM7TUFDQSxnQ0FBQSxFQUFrQyxnQ0FBZ0MsQ0FBQyxJQUFqQyxDQUFBLENBRGxDO01BRUEsZ0NBQUEsRUFBa0MsZ0NBQWdDLENBQUMsSUFBakMsQ0FBQSxDQUZsQztNQUdBLDJCQUFBLEVBQTZCLDJCQUEyQixDQUFDLElBQTVCLENBQUEsQ0FIN0I7TUFJQSw0QkFBQSxFQUE4Qiw0QkFBNEIsQ0FBQyxJQUE3QixDQUFBLENBSjlCO01BS0Esa0NBQUEsRUFBb0Msa0NBQWtDLENBQUMsSUFBbkMsQ0FBQSxDQUxwQzs7SUFPSixNQUFNLENBQUMsWUFBUCxDQUFvQixJQUFwQixFQUF1QixJQUFDLENBQUEsS0FBSyxDQUFDLGtDQUE5QixFQUFrRSxJQUFDLENBQUEsS0FBbkU7RUFmUzs7b0NBaUJiLFVBQUEsR0FBWSxNQUFNLENBQUMsVUFBUCxDQUFrQixTQUFDLFlBQUQ7V0FDMUIsSUFBQyxDQUFBLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxLQUFuQyxDQUF5QyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDckMsWUFBWSxDQUFDLEtBQWIsQ0FBQTtNQURxQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBekM7RUFEMEIsQ0FBbEI7O29DQUlaLFdBQUEsR0FBYSxNQUFNLENBQUMsVUFBUCxDQUFrQixTQUFDLGFBQUQ7V0FDM0IsSUFBQyxDQUFBLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxLQUFwQyxDQUEwQyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDdEMsYUFBYSxDQUFDLEtBQWQsQ0FBQTtNQURzQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMUM7RUFEMkIsQ0FBbEI7Ozs7R0F0QjZCOzs7O0FERjlDLElBQUEsTUFBQTtFQUFBOzs7QUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0FBRUgsT0FBTyxDQUFDOzs7RUFDRyxpQ0FBQyxPQUFEOztNQUFDLFVBQVU7O0lBQ3BCLENBQUMsQ0FBQyxRQUFGLENBQVcsT0FBWCxFQUNJO01BQUEsZUFBQSxFQUFpQixJQUFqQjtNQUNBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxLQUFQLEdBQWUsa0NBQWtDLENBQUMsS0FBbkQsQ0FBQSxHQUE0RCxDQUQvRDtNQUVBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxNQUFQLEdBQWdCLGtDQUFrQyxDQUFDLE1BQXBELENBQUEsR0FBOEQsQ0FGakU7S0FESjtJQUlBLHlEQUFNLE9BQU47SUFFQSxJQUFDLENBQUEsS0FBRCxHQUNJO01BQUEsaUNBQUEsRUFBbUMsaUNBQWlDLENBQUMsSUFBbEMsQ0FBQSxDQUFuQztNQUNBLGdDQUFBLEVBQWtDLGdDQUFnQyxDQUFDLElBQWpDLENBQUEsQ0FEbEM7TUFFQSxnQ0FBQSxFQUFrQyxnQ0FBZ0MsQ0FBQyxJQUFqQyxDQUFBLENBRmxDO01BR0EsMkJBQUEsRUFBNkIsMkJBQTJCLENBQUMsSUFBNUIsQ0FBQSxDQUg3QjtNQUlBLDRCQUFBLEVBQThCLDRCQUE0QixDQUFDLElBQTdCLENBQUEsQ0FKOUI7TUFLQSxrQ0FBQSxFQUFvQyxrQ0FBa0MsQ0FBQyxJQUFuQyxDQUFBLENBTHBDOztJQU9KLE1BQU0sQ0FBQyxZQUFQLENBQW9CLElBQXBCLEVBQXVCLElBQUMsQ0FBQSxLQUFLLENBQUMsa0NBQTlCLEVBQWtFLElBQUMsQ0FBQSxLQUFuRTtFQWZTOztvQ0FpQmIsVUFBQSxHQUFZLE1BQU0sQ0FBQyxVQUFQLENBQWtCLFNBQUMsWUFBRDtXQUMxQixJQUFDLENBQUEsS0FBSyxDQUFDLDJCQUEyQixDQUFDLEtBQW5DLENBQXlDLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUNyQyxZQUFZLENBQUMsS0FBYixDQUFBO01BRHFDO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF6QztFQUQwQixDQUFsQjs7b0NBSVosV0FBQSxHQUFhLE1BQU0sQ0FBQyxVQUFQLENBQWtCLFNBQUMsYUFBRDtXQUMzQixJQUFDLENBQUEsS0FBSyxDQUFDLDRCQUE0QixDQUFDLEtBQXBDLENBQTBDLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUN0QyxhQUFhLENBQUMsS0FBZCxDQUFBO01BRHNDO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUExQztFQUQyQixDQUFsQjs7OztHQXRCNkI7Ozs7QURGOUMsSUFBQSxNQUFBO0VBQUE7OztBQUFBLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7QUFFSCxPQUFPLENBQUM7OztFQUNHLGlDQUFDLE9BQUQ7O01BQUMsVUFBVTs7SUFDcEIsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxPQUFYLEVBQ0k7TUFBQSxlQUFBLEVBQWlCLElBQWpCO01BQ0EsQ0FBQSxFQUFHLENBQUMsTUFBTSxDQUFDLEtBQVAsR0FBZSxrQ0FBa0MsQ0FBQyxLQUFuRCxDQUFBLEdBQTRELENBRC9EO01BRUEsQ0FBQSxFQUFHLENBQUMsTUFBTSxDQUFDLE1BQVAsR0FBZ0Isa0NBQWtDLENBQUMsTUFBcEQsQ0FBQSxHQUE4RCxDQUZqRTtLQURKO0lBSUEseURBQU0sT0FBTjtJQUVBLElBQUMsQ0FBQSxLQUFELEdBQ0k7TUFBQSxpQ0FBQSxFQUFtQyxpQ0FBaUMsQ0FBQyxJQUFsQyxDQUFBLENBQW5DO01BQ0EsZ0NBQUEsRUFBa0MsZ0NBQWdDLENBQUMsSUFBakMsQ0FBQSxDQURsQztNQUVBLGdDQUFBLEVBQWtDLGdDQUFnQyxDQUFDLElBQWpDLENBQUEsQ0FGbEM7TUFHQSwyQkFBQSxFQUE2QiwyQkFBMkIsQ0FBQyxJQUE1QixDQUFBLENBSDdCO01BSUEsNEJBQUEsRUFBOEIsNEJBQTRCLENBQUMsSUFBN0IsQ0FBQSxDQUo5QjtNQUtBLGtDQUFBLEVBQW9DLGtDQUFrQyxDQUFDLElBQW5DLENBQUEsQ0FMcEM7O0lBT0osTUFBTSxDQUFDLFlBQVAsQ0FBb0IsSUFBcEIsRUFBdUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxrQ0FBOUIsRUFBa0UsSUFBQyxDQUFBLEtBQW5FO0VBZlM7O29DQWlCYixVQUFBLEdBQVksTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxZQUFEO1dBQzFCLElBQUMsQ0FBQSxLQUFLLENBQUMsMkJBQTJCLENBQUMsS0FBbkMsQ0FBeUMsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ3JDLFlBQVksQ0FBQyxLQUFiLENBQUE7TUFEcUM7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXpDO0VBRDBCLENBQWxCOztvQ0FJWixXQUFBLEdBQWEsTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxhQUFEO1dBQzNCLElBQUMsQ0FBQSxLQUFLLENBQUMsNEJBQTRCLENBQUMsS0FBcEMsQ0FBMEMsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ3RDLGFBQWEsQ0FBQyxLQUFkLENBQUE7TUFEc0M7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTFDO0VBRDJCLENBQWxCOzs7O0dBdEI2Qjs7OztBREY5QyxJQUFBLE1BQUE7RUFBQTs7O0FBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSOztBQUVILE9BQU8sQ0FBQzs7O0VBQ0csaUNBQUMsT0FBRDs7TUFBQyxVQUFVOztJQUNwQixDQUFDLENBQUMsUUFBRixDQUFXLE9BQVgsRUFDSTtNQUFBLGVBQUEsRUFBaUIsSUFBakI7TUFDQSxDQUFBLEVBQUcsQ0FBQyxNQUFNLENBQUMsS0FBUCxHQUFlLGtDQUFrQyxDQUFDLEtBQW5ELENBQUEsR0FBNEQsQ0FEL0Q7TUFFQSxDQUFBLEVBQUcsQ0FBQyxNQUFNLENBQUMsTUFBUCxHQUFnQixrQ0FBa0MsQ0FBQyxNQUFwRCxDQUFBLEdBQThELENBRmpFO0tBREo7SUFJQSx5REFBTSxPQUFOO0lBRUEsSUFBQyxDQUFBLEtBQUQsR0FDSTtNQUFBLGlDQUFBLEVBQW1DLGlDQUFpQyxDQUFDLElBQWxDLENBQUEsQ0FBbkM7TUFDQSxnQ0FBQSxFQUFrQyxnQ0FBZ0MsQ0FBQyxJQUFqQyxDQUFBLENBRGxDO01BRUEsZ0NBQUEsRUFBa0MsZ0NBQWdDLENBQUMsSUFBakMsQ0FBQSxDQUZsQztNQUdBLDJCQUFBLEVBQTZCLDJCQUEyQixDQUFDLElBQTVCLENBQUEsQ0FIN0I7TUFJQSw0QkFBQSxFQUE4Qiw0QkFBNEIsQ0FBQyxJQUE3QixDQUFBLENBSjlCO01BS0Esa0NBQUEsRUFBb0Msa0NBQWtDLENBQUMsSUFBbkMsQ0FBQSxDQUxwQzs7SUFPSixNQUFNLENBQUMsWUFBUCxDQUFvQixJQUFwQixFQUF1QixJQUFDLENBQUEsS0FBSyxDQUFDLGtDQUE5QixFQUFrRSxJQUFDLENBQUEsS0FBbkU7RUFmUzs7b0NBaUJiLFVBQUEsR0FBWSxNQUFNLENBQUMsVUFBUCxDQUFrQixTQUFDLFlBQUQ7V0FDMUIsSUFBQyxDQUFBLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxLQUFuQyxDQUF5QyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDckMsWUFBWSxDQUFDLEtBQWIsQ0FBQTtNQURxQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBekM7RUFEMEIsQ0FBbEI7O29DQUlaLFdBQUEsR0FBYSxNQUFNLENBQUMsVUFBUCxDQUFrQixTQUFDLGFBQUQ7V0FDM0IsSUFBQyxDQUFBLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxLQUFwQyxDQUEwQyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDdEMsYUFBYSxDQUFDLEtBQWQsQ0FBQTtNQURzQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMUM7RUFEMkIsQ0FBbEI7Ozs7R0F0QjZCOzs7O0FERjlDLElBQUEsTUFBQTtFQUFBOzs7QUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0FBRUgsT0FBTyxDQUFDOzs7RUFDRywrQkFBQyxPQUFEOztNQUFDLFVBQVU7O0lBQ3BCLENBQUMsQ0FBQyxRQUFGLENBQVcsT0FBWCxFQUNJO01BQUEsZUFBQSxFQUFpQixJQUFqQjtNQUNBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxLQUFQLEdBQWUsZ0NBQWdDLENBQUMsS0FBakQsQ0FBQSxHQUEwRCxDQUQ3RDtNQUVBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxNQUFQLEdBQWdCLGdDQUFnQyxDQUFDLE1BQWxELENBQUEsR0FBNEQsQ0FGL0Q7S0FESjtJQUlBLHVEQUFNLE9BQU47SUFFQSxJQUFDLENBQUEsS0FBRCxHQUNJO01BQUEsK0JBQUEsRUFBaUMsK0JBQStCLENBQUMsSUFBaEMsQ0FBQSxDQUFqQztNQUNBLDhCQUFBLEVBQWdDLDhCQUE4QixDQUFDLElBQS9CLENBQUEsQ0FEaEM7TUFFQSw4QkFBQSxFQUFnQyw4QkFBOEIsQ0FBQyxJQUEvQixDQUFBLENBRmhDO01BR0EseUJBQUEsRUFBMkIseUJBQXlCLENBQUMsSUFBMUIsQ0FBQSxDQUgzQjtNQUlBLDBCQUFBLEVBQTRCLDBCQUEwQixDQUFDLElBQTNCLENBQUEsQ0FKNUI7TUFLQSxnQ0FBQSxFQUFrQyxnQ0FBZ0MsQ0FBQyxJQUFqQyxDQUFBLENBTGxDOztJQU9KLE1BQU0sQ0FBQyxZQUFQLENBQW9CLElBQXBCLEVBQXVCLElBQUMsQ0FBQSxLQUFLLENBQUMsZ0NBQTlCLEVBQWdFLElBQUMsQ0FBQSxLQUFqRTtFQWZTOztrQ0FpQmIsVUFBQSxHQUFZLE1BQU0sQ0FBQyxVQUFQLENBQWtCLFNBQUMsWUFBRDtXQUMxQixJQUFDLENBQUEsS0FBSyxDQUFDLHlCQUF5QixDQUFDLEtBQWpDLENBQXVDLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUNuQyxZQUFZLENBQUMsS0FBYixDQUFBO01BRG1DO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF2QztFQUQwQixDQUFsQjs7a0NBSVosV0FBQSxHQUFhLE1BQU0sQ0FBQyxVQUFQLENBQWtCLFNBQUMsYUFBRDtXQUMzQixJQUFDLENBQUEsS0FBSyxDQUFDLDBCQUEwQixDQUFDLEtBQWxDLENBQXdDLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUNwQyxhQUFhLENBQUMsS0FBZCxDQUFBO01BRG9DO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF4QztFQUQyQixDQUFsQjs7OztHQXRCMkI7Ozs7QURGNUMsSUFBQSxNQUFBO0VBQUE7OztBQUFBLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7QUFFSCxPQUFPLENBQUM7OztFQUNHLCtCQUFDLE9BQUQ7O01BQUMsVUFBVTs7SUFDcEIsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxPQUFYLEVBQ0k7TUFBQSxlQUFBLEVBQWlCLElBQWpCO01BQ0EsQ0FBQSxFQUFHLENBQUMsTUFBTSxDQUFDLEtBQVAsR0FBZSxnQ0FBZ0MsQ0FBQyxLQUFqRCxDQUFBLEdBQTBELENBRDdEO01BRUEsQ0FBQSxFQUFHLENBQUMsTUFBTSxDQUFDLE1BQVAsR0FBZ0IsZ0NBQWdDLENBQUMsTUFBbEQsQ0FBQSxHQUE0RCxDQUYvRDtLQURKO0lBSUEsdURBQU0sT0FBTjtJQUVBLElBQUMsQ0FBQSxLQUFELEdBQ0k7TUFBQSwrQkFBQSxFQUFpQywrQkFBK0IsQ0FBQyxJQUFoQyxDQUFBLENBQWpDO01BQ0EsOEJBQUEsRUFBZ0MsOEJBQThCLENBQUMsSUFBL0IsQ0FBQSxDQURoQztNQUVBLDhCQUFBLEVBQWdDLDhCQUE4QixDQUFDLElBQS9CLENBQUEsQ0FGaEM7TUFHQSx5QkFBQSxFQUEyQix5QkFBeUIsQ0FBQyxJQUExQixDQUFBLENBSDNCO01BSUEsMEJBQUEsRUFBNEIsMEJBQTBCLENBQUMsSUFBM0IsQ0FBQSxDQUo1QjtNQUtBLGdDQUFBLEVBQWtDLGdDQUFnQyxDQUFDLElBQWpDLENBQUEsQ0FMbEM7O0lBT0osTUFBTSxDQUFDLFlBQVAsQ0FBb0IsSUFBcEIsRUFBdUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQ0FBOUIsRUFBZ0UsSUFBQyxDQUFBLEtBQWpFO0VBZlM7O2tDQWlCYixVQUFBLEdBQVksTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxZQUFEO1dBQzFCLElBQUMsQ0FBQSxLQUFLLENBQUMseUJBQXlCLENBQUMsS0FBakMsQ0FBdUMsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ25DLFlBQVksQ0FBQyxLQUFiLENBQUE7TUFEbUM7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXZDO0VBRDBCLENBQWxCOztrQ0FJWixXQUFBLEdBQWEsTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxhQUFEO1dBQzNCLElBQUMsQ0FBQSxLQUFLLENBQUMsMEJBQTBCLENBQUMsS0FBbEMsQ0FBd0MsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ3BDLGFBQWEsQ0FBQyxLQUFkLENBQUE7TUFEb0M7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXhDO0VBRDJCLENBQWxCOzs7O0dBdEIyQjs7OztBREY1QyxJQUFBLE1BQUE7RUFBQTs7O0FBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSOztBQUVILE9BQU8sQ0FBQzs7O0VBQ0csOEJBQUMsT0FBRDs7TUFBQyxVQUFVOztJQUNwQixDQUFDLENBQUMsUUFBRixDQUFXLE9BQVgsRUFDSTtNQUFBLGVBQUEsRUFBaUIsSUFBakI7TUFDQSxDQUFBLEVBQUcsQ0FBQyxNQUFNLENBQUMsS0FBUCxHQUFlLCtCQUErQixDQUFDLEtBQWhELENBQUEsR0FBeUQsQ0FENUQ7TUFFQSxDQUFBLEVBQUcsQ0FBQyxNQUFNLENBQUMsTUFBUCxHQUFnQiwrQkFBK0IsQ0FBQyxNQUFqRCxDQUFBLEdBQTJELENBRjlEO0tBREo7SUFJQSxzREFBTSxPQUFOO0lBRUEsSUFBQyxDQUFBLEtBQUQsR0FDSTtNQUFBLDhCQUFBLEVBQWdDLDhCQUE4QixDQUFDLElBQS9CLENBQUEsQ0FBaEM7TUFDQSw2QkFBQSxFQUErQiw2QkFBNkIsQ0FBQyxJQUE5QixDQUFBLENBRC9CO01BRUEsNkJBQUEsRUFBK0IsNkJBQTZCLENBQUMsSUFBOUIsQ0FBQSxDQUYvQjtNQUdBLHdCQUFBLEVBQTBCLHdCQUF3QixDQUFDLElBQXpCLENBQUEsQ0FIMUI7TUFJQSx5QkFBQSxFQUEyQix5QkFBeUIsQ0FBQyxJQUExQixDQUFBLENBSjNCO01BS0EsK0JBQUEsRUFBaUMsK0JBQStCLENBQUMsSUFBaEMsQ0FBQSxDQUxqQzs7SUFPSixNQUFNLENBQUMsWUFBUCxDQUFvQixJQUFwQixFQUF1QixJQUFDLENBQUEsS0FBSyxDQUFDLCtCQUE5QixFQUErRCxJQUFDLENBQUEsS0FBaEU7RUFmUzs7aUNBaUJiLFVBQUEsR0FBWSxNQUFNLENBQUMsVUFBUCxDQUFrQixTQUFDLFlBQUQ7V0FDMUIsSUFBQyxDQUFBLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxLQUFoQyxDQUFzQyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDbEMsWUFBWSxDQUFDLEtBQWIsQ0FBQTtNQURrQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdEM7RUFEMEIsQ0FBbEI7O2lDQUlaLFdBQUEsR0FBYSxNQUFNLENBQUMsVUFBUCxDQUFrQixTQUFDLGFBQUQ7V0FDM0IsSUFBQyxDQUFBLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxLQUFqQyxDQUF1QyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDbkMsYUFBYSxDQUFDLEtBQWQsQ0FBQTtNQURtQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdkM7RUFEMkIsQ0FBbEI7Ozs7R0F0QjBCOzs7O0FERjNDLElBQUEsTUFBQTtFQUFBOzs7QUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0FBRUgsT0FBTyxDQUFDOzs7RUFDRyw4QkFBQyxPQUFEOztNQUFDLFVBQVU7O0lBQ3BCLENBQUMsQ0FBQyxRQUFGLENBQVcsT0FBWCxFQUNJO01BQUEsZUFBQSxFQUFpQixJQUFqQjtNQUNBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxLQUFQLEdBQWUsK0JBQStCLENBQUMsS0FBaEQsQ0FBQSxHQUF5RCxDQUQ1RDtNQUVBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxNQUFQLEdBQWdCLCtCQUErQixDQUFDLE1BQWpELENBQUEsR0FBMkQsQ0FGOUQ7S0FESjtJQUlBLHNEQUFNLE9BQU47SUFFQSxJQUFDLENBQUEsS0FBRCxHQUNJO01BQUEsOEJBQUEsRUFBZ0MsOEJBQThCLENBQUMsSUFBL0IsQ0FBQSxDQUFoQztNQUNBLDZCQUFBLEVBQStCLDZCQUE2QixDQUFDLElBQTlCLENBQUEsQ0FEL0I7TUFFQSw2QkFBQSxFQUErQiw2QkFBNkIsQ0FBQyxJQUE5QixDQUFBLENBRi9CO01BR0Esd0JBQUEsRUFBMEIsd0JBQXdCLENBQUMsSUFBekIsQ0FBQSxDQUgxQjtNQUlBLHlCQUFBLEVBQTJCLHlCQUF5QixDQUFDLElBQTFCLENBQUEsQ0FKM0I7TUFLQSwrQkFBQSxFQUFpQywrQkFBK0IsQ0FBQyxJQUFoQyxDQUFBLENBTGpDOztJQU9KLE1BQU0sQ0FBQyxZQUFQLENBQW9CLElBQXBCLEVBQXVCLElBQUMsQ0FBQSxLQUFLLENBQUMsK0JBQTlCLEVBQStELElBQUMsQ0FBQSxLQUFoRTtFQWZTOztpQ0FpQmIsVUFBQSxHQUFZLE1BQU0sQ0FBQyxVQUFQLENBQWtCLFNBQUMsWUFBRDtXQUMxQixJQUFDLENBQUEsS0FBSyxDQUFDLHdCQUF3QixDQUFDLEtBQWhDLENBQXNDLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUNsQyxZQUFZLENBQUMsS0FBYixDQUFBO01BRGtDO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF0QztFQUQwQixDQUFsQjs7aUNBSVosV0FBQSxHQUFhLE1BQU0sQ0FBQyxVQUFQLENBQWtCLFNBQUMsYUFBRDtXQUMzQixJQUFDLENBQUEsS0FBSyxDQUFDLHlCQUF5QixDQUFDLEtBQWpDLENBQXVDLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUNuQyxhQUFhLENBQUMsS0FBZCxDQUFBO01BRG1DO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF2QztFQUQyQixDQUFsQjs7OztHQXRCMEI7Ozs7QURGM0MsSUFBQSxNQUFBO0VBQUE7OztBQUFBLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7QUFFSCxPQUFPLENBQUM7OztFQUNHLDhCQUFDLE9BQUQ7O01BQUMsVUFBVTs7SUFDcEIsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxPQUFYLEVBQ0k7TUFBQSxlQUFBLEVBQWlCLElBQWpCO01BQ0EsQ0FBQSxFQUFHLENBQUMsTUFBTSxDQUFDLEtBQVAsR0FBZSwrQkFBK0IsQ0FBQyxLQUFoRCxDQUFBLEdBQXlELENBRDVEO01BRUEsQ0FBQSxFQUFHLENBQUMsTUFBTSxDQUFDLE1BQVAsR0FBZ0IsK0JBQStCLENBQUMsTUFBakQsQ0FBQSxHQUEyRCxDQUY5RDtLQURKO0lBSUEsc0RBQU0sT0FBTjtJQUVBLElBQUMsQ0FBQSxLQUFELEdBQ0k7TUFBQSw4QkFBQSxFQUFnQyw4QkFBOEIsQ0FBQyxJQUEvQixDQUFBLENBQWhDO01BQ0EsNkJBQUEsRUFBK0IsNkJBQTZCLENBQUMsSUFBOUIsQ0FBQSxDQUQvQjtNQUVBLDZCQUFBLEVBQStCLDZCQUE2QixDQUFDLElBQTlCLENBQUEsQ0FGL0I7TUFHQSx3QkFBQSxFQUEwQix3QkFBd0IsQ0FBQyxJQUF6QixDQUFBLENBSDFCO01BSUEseUJBQUEsRUFBMkIseUJBQXlCLENBQUMsSUFBMUIsQ0FBQSxDQUozQjtNQUtBLCtCQUFBLEVBQWlDLCtCQUErQixDQUFDLElBQWhDLENBQUEsQ0FMakM7O0lBT0osTUFBTSxDQUFDLFlBQVAsQ0FBb0IsSUFBcEIsRUFBdUIsSUFBQyxDQUFBLEtBQUssQ0FBQywrQkFBOUIsRUFBK0QsSUFBQyxDQUFBLEtBQWhFO0VBZlM7O2lDQWlCYixVQUFBLEdBQVksTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxZQUFEO1dBQzFCLElBQUMsQ0FBQSxLQUFLLENBQUMsd0JBQXdCLENBQUMsS0FBaEMsQ0FBc0MsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ2xDLFlBQVksQ0FBQyxLQUFiLENBQUE7TUFEa0M7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXRDO0VBRDBCLENBQWxCOztpQ0FJWixXQUFBLEdBQWEsTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxhQUFEO1dBQzNCLElBQUMsQ0FBQSxLQUFLLENBQUMseUJBQXlCLENBQUMsS0FBakMsQ0FBdUMsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ25DLGFBQWEsQ0FBQyxLQUFkLENBQUE7TUFEbUM7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXZDO0VBRDJCLENBQWxCOzs7O0dBdEIwQjs7OztBREYzQyxJQUFBLE1BQUE7RUFBQTs7O0FBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSOztBQUVILE9BQU8sQ0FBQzs7O0VBQ0csOEJBQUMsT0FBRDs7TUFBQyxVQUFVOztJQUNwQixDQUFDLENBQUMsUUFBRixDQUFXLE9BQVgsRUFDSTtNQUFBLGVBQUEsRUFBaUIsSUFBakI7TUFDQSxDQUFBLEVBQUcsQ0FBQyxNQUFNLENBQUMsS0FBUCxHQUFlLCtCQUErQixDQUFDLEtBQWhELENBQUEsR0FBeUQsQ0FENUQ7TUFFQSxDQUFBLEVBQUcsQ0FBQyxNQUFNLENBQUMsTUFBUCxHQUFnQiwrQkFBK0IsQ0FBQyxNQUFqRCxDQUFBLEdBQTJELENBRjlEO0tBREo7SUFJQSxzREFBTSxPQUFOO0lBRUEsSUFBQyxDQUFBLEtBQUQsR0FDSTtNQUFBLDhCQUFBLEVBQWdDLDhCQUE4QixDQUFDLElBQS9CLENBQUEsQ0FBaEM7TUFDQSw2QkFBQSxFQUErQiw2QkFBNkIsQ0FBQyxJQUE5QixDQUFBLENBRC9CO01BRUEsNkJBQUEsRUFBK0IsNkJBQTZCLENBQUMsSUFBOUIsQ0FBQSxDQUYvQjtNQUdBLHdCQUFBLEVBQTBCLHdCQUF3QixDQUFDLElBQXpCLENBQUEsQ0FIMUI7TUFJQSx5QkFBQSxFQUEyQix5QkFBeUIsQ0FBQyxJQUExQixDQUFBLENBSjNCO01BS0EsK0JBQUEsRUFBaUMsK0JBQStCLENBQUMsSUFBaEMsQ0FBQSxDQUxqQzs7SUFPSixNQUFNLENBQUMsWUFBUCxDQUFvQixJQUFwQixFQUF1QixJQUFDLENBQUEsS0FBSyxDQUFDLCtCQUE5QixFQUErRCxJQUFDLENBQUEsS0FBaEU7RUFmUzs7aUNBaUJiLFVBQUEsR0FBWSxNQUFNLENBQUMsVUFBUCxDQUFrQixTQUFDLFlBQUQ7V0FDMUIsSUFBQyxDQUFBLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxLQUFoQyxDQUFzQyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDbEMsWUFBWSxDQUFDLEtBQWIsQ0FBQTtNQURrQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdEM7RUFEMEIsQ0FBbEI7O2lDQUlaLFdBQUEsR0FBYSxNQUFNLENBQUMsVUFBUCxDQUFrQixTQUFDLGFBQUQ7V0FDM0IsSUFBQyxDQUFBLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxLQUFqQyxDQUF1QyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDbkMsYUFBYSxDQUFDLEtBQWQsQ0FBQTtNQURtQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdkM7RUFEMkIsQ0FBbEI7Ozs7R0F0QjBCOzs7O0FERjNDLElBQUEscUJBQUE7RUFBQTs7O0FBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSOztBQUNULGFBQUEsR0FBZ0IsT0FBQSxDQUFRLGVBQVI7O0FBRVYsT0FBTyxDQUFDOzs7RUFDRyxvQkFBQyxPQUFEOztNQUFDLFVBQVU7O0lBQ3BCLENBQUMsQ0FBQyxRQUFGLENBQVcsT0FBWCxFQUNJO01BQUEsZUFBQSxFQUFpQixJQUFqQjtNQUNBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxLQUFQLEdBQWUscUJBQXFCLENBQUMsS0FBdEMsQ0FBQSxHQUErQyxDQURsRDtNQUVBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxNQUFQLEdBQWdCLHFCQUFxQixDQUFDLE1BQXZDLENBQUEsR0FBaUQsQ0FGcEQ7S0FESjtJQUlBLDRDQUFNLE9BQU47SUFFQSxJQUFDLENBQUEsS0FBRCxHQUNJO01BQUEsbUJBQUEsRUFBcUIsbUJBQW1CLENBQUMsSUFBcEIsQ0FBQSxDQUFyQjtNQUNBLG9CQUFBLEVBQXNCLG9CQUFvQixDQUFDLElBQXJCLENBQUEsQ0FEdEI7TUFFQSxtQkFBQSxFQUFxQixtQkFBbUIsQ0FBQyxJQUFwQixDQUFBLENBRnJCO01BR0EsY0FBQSxFQUFnQixjQUFjLENBQUMsSUFBZixDQUFBLENBSGhCO01BSUEsZUFBQSxFQUFpQixlQUFlLENBQUMsSUFBaEIsQ0FBQSxDQUpqQjtNQUtBLHVCQUFBLEVBQXlCLHVCQUF1QixDQUFDLElBQXhCLENBQUEsQ0FMekI7TUFNQSxxQkFBQSxFQUF1QixxQkFBcUIsQ0FBQyxJQUF0QixDQUFBLENBTnZCOztJQVFKLE1BQU0sQ0FBQyxZQUFQLENBQW9CLElBQXBCLEVBQXVCLElBQUMsQ0FBQSxLQUFLLENBQUMscUJBQTlCLEVBQXFELElBQUMsQ0FBQSxLQUF0RDtJQUdBLElBQUMsQ0FBQSxLQUFLLENBQUMsZ0JBQVAsR0FBMEIsTUFBTSxDQUFDLGlCQUFQLENBQXlCLElBQUMsQ0FBQSxLQUFLLENBQUMsdUJBQWhDLEVBQTZELElBQUEsYUFBYSxDQUFDLGFBQWQsQ0FDbkY7TUFBQSxVQUFBLEVBQVksZUFBWjtNQUNBLFFBQUEsRUFBVSxFQURWO01BRUEsVUFBQSxFQUFZLEdBRlo7TUFHQSxXQUFBLEVBQWEsMkJBSGI7S0FEbUYsQ0FBN0Q7SUFLMUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxPQUF4QixDQUFnQyxTQUFBO01BQzVCLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBUCxHQUFzQjtNQUN0QixJQUFDLENBQUEsS0FBSyxDQUFDLFdBQVAsR0FBcUI7YUFDckIsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFQLEdBQWdCO0lBSFksQ0FBaEM7SUFJQSxJQUFDLENBQUEsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFNBQXhCLENBQWtDLFNBQUE7TUFDOUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxZQUFQLEdBQXNCO2FBQ3RCLElBQUMsQ0FBQSxLQUFLLENBQUMsV0FBUCxHQUFxQjtJQUZTLENBQWxDO0lBR0EsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUF4QixDQUFBO0VBL0JTOzt1QkFtQ2IsVUFBQSxHQUFZLE1BQU0sQ0FBQyxVQUFQLENBQWtCLFNBQUMsWUFBRDtXQUMxQixJQUFDLENBQUEsS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUF0QixDQUE0QixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDeEIsWUFBWSxDQUFDLEtBQWIsQ0FBQTtNQUR3QjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBNUI7RUFEMEIsQ0FBbEI7O3VCQUlaLFdBQUEsR0FBYSxNQUFNLENBQUMsVUFBUCxDQUFrQixTQUFDLGFBQUQ7V0FDM0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBdkIsQ0FBNkIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ3pCLGFBQWEsQ0FBQyxLQUFkLENBQUE7TUFEeUI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTdCO0VBRDJCLENBQWxCOzt1QkFJYixnQkFBQSxHQUFrQixNQUFNLENBQUMsVUFBUCxDQUFrQixTQUFDLFFBQUQ7QUFFaEMsUUFBQTttR0FBNkIsQ0FBQyxpQkFBa0IsU0FBUyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDckQsUUFBUSxDQUFDLEtBQVQsR0FBaUIsS0FBQyxDQUFBLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQztNQURZO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQTtFQUZ6QixDQUFsQjs7OztHQTVDVzs7OztBREhqQyxJQUFBLHNCQUFBO0VBQUE7OztBQUFBLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7QUFDVCxjQUFBLEdBQWlCLE9BQUEsQ0FBUSxnQkFBUjs7QUFFWCxPQUFPLENBQUM7OztFQUNHLHVCQUFDLE9BQUQ7O01BQUMsVUFBVTs7SUFDcEIsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxPQUFYLEVBQ0k7TUFBQSxlQUFBLEVBQWlCLElBQWpCO01BQ0EsQ0FBQSxFQUFHLENBQUMsTUFBTSxDQUFDLEtBQVAsR0FBZSx3QkFBd0IsQ0FBQyxLQUF6QyxDQUFBLEdBQWtELENBRHJEO01BRUEsQ0FBQSxFQUFHLENBQUMsTUFBTSxDQUFDLE1BQVAsR0FBZ0Isd0JBQXdCLENBQUMsTUFBMUMsQ0FBQSxHQUFvRCxDQUZ2RDtLQURKO0lBSUEsK0NBQU0sT0FBTjtJQUVBLElBQUMsQ0FBQSxLQUFELEdBQ0k7TUFBQSxzQkFBQSxFQUF3QixzQkFBc0IsQ0FBQyxJQUF2QixDQUFBLENBQXhCO01BQ0Esa0JBQUEsRUFBb0Isa0JBQWtCLENBQUMsSUFBbkIsQ0FBQSxDQURwQjtNQUVBLDJCQUFBLEVBQTZCLDJCQUEyQixDQUFDLElBQTVCLENBQUEsQ0FGN0I7TUFHQSwwQkFBQSxFQUE0QiwwQkFBMEIsQ0FBQyxJQUEzQixDQUFBLENBSDVCO01BSUEseUJBQUEsRUFBMkIseUJBQXlCLENBQUMsSUFBMUIsQ0FBQSxDQUozQjtNQUtBLHdCQUFBLEVBQTBCLHdCQUF3QixDQUFDLElBQXpCLENBQUEsQ0FMMUI7O0lBT0osTUFBTSxDQUFDLFlBQVAsQ0FBb0IsSUFBcEIsRUFBdUIsSUFBQyxDQUFBLEtBQUssQ0FBQyx3QkFBOUIsRUFBd0QsSUFBQyxDQUFBLEtBQXpEO0VBZlM7OzBCQWtCYixXQUFBLEdBQWEsTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxhQUFEO1dBQzNCLElBQUMsQ0FBQSxLQUFLLENBQUMsa0JBQWtCLENBQUMsS0FBMUIsQ0FBZ0MsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQzVCLGFBQWEsQ0FBQyxLQUFkLENBQUE7TUFENEI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWhDO0VBRDJCLENBQWxCOzswQkFJYixnQkFBQSxHQUFrQixTQUFDLFFBQUQ7QUFDZCxRQUFBOztTQUEyQixDQUFFLE9BQTdCLENBQUE7O1dBQ0EsSUFBQyxDQUFBLEtBQUssQ0FBQyxvQkFBUCxHQUE4QixNQUFNLENBQUMsaUJBQVAsQ0FBeUIsSUFBQyxDQUFBLEtBQUssQ0FBQywyQkFBaEMsRUFBaUUsSUFBQSxTQUFBLENBQzNGO01BQUEsSUFBQSxFQUFNLGdCQUFBLEdBQWdCLENBQUksUUFBUSxDQUFDLEtBQVQsS0FBa0IsRUFBckIsR0FBNkIsUUFBUSxDQUFDLEtBQXRDLEdBQWlELFlBQWxELENBQWhCLEdBQStFLEdBQXJGO01BQ0EsU0FBQSxFQUFXLE1BRFg7S0FEMkYsQ0FBakU7RUFGaEI7OzBCQU1sQixnQkFBQSxHQUFrQixTQUFDLFFBQUQ7QUFDZCxRQUFBOztTQUEyQixDQUFFLE9BQTdCLENBQUE7O1dBQ0EsSUFBQyxDQUFBLEtBQUssQ0FBQyxvQkFBUCxHQUE4QixNQUFNLENBQUMsaUJBQVAsQ0FBeUIsSUFBQyxDQUFBLEtBQUssQ0FBQywyQkFBaEMsRUFBaUUsSUFBQSxTQUFBLENBQzNGO01BQUEsSUFBQSxFQUFNLGdCQUFBLEdBQWdCLENBQUksUUFBUSxDQUFDLEtBQVQsS0FBa0IsRUFBckIsR0FBNkIsUUFBUSxDQUFDLEtBQXRDLEdBQWlELFlBQWxELENBQWhCLEdBQStFLEdBQXJGO01BQ0EsU0FBQSxFQUFXLE1BRFg7S0FEMkYsQ0FBakU7RUFGaEI7OzBCQU1sQixtQkFBQSxHQUFxQixTQUFDLFdBQUQ7QUFDakIsUUFBQTs7U0FBMEIsQ0FBRSxPQUE1QixDQUFBOztXQUNBLElBQUMsQ0FBQSxLQUFLLENBQUMsbUJBQVAsR0FBNkIsTUFBTSxDQUFDLGlCQUFQLENBQXlCLElBQUMsQ0FBQSxLQUFLLENBQUMsMEJBQWhDLEVBQWdFLElBQUEsU0FBQSxDQUN6RjtNQUFBLElBQUEsRUFBTSxxQ0FBQSxHQUFxQyxDQUFDLENBQUMsQ0FBQyxVQUFGLENBQWEsV0FBVyxDQUFDLEtBQXpCLENBQUQsQ0FBckMsR0FBcUUsSUFBM0U7TUFDQSxTQUFBLEVBQVcsTUFEWDtLQUR5RixDQUFoRTtFQUZaOzswQkFNckIsb0JBQUEsR0FBc0IsU0FBQyxZQUFEO0FBQ2xCLFFBQUE7O1NBQXlCLENBQUUsT0FBM0IsQ0FBQTs7SUFDQSxDQUFBLEdBQUksWUFBWSxDQUFDO0lBQ2pCLENBQUEsR0FBSTtXQUNKLElBQUMsQ0FBQSxLQUFLLENBQUMsa0JBQVAsR0FBNEIsTUFBTSxDQUFDLGlCQUFQLENBQXlCLElBQUMsQ0FBQSxLQUFLLENBQUMseUJBQWhDLEVBQStELElBQUEsU0FBQSxDQUN2RjtNQUFBLElBQUEsRUFBTSxDQUNDLENBQUgsR0FDSyxLQUFBLEdBQU0sQ0FBQyxDQUFDLFVBQVcsQ0FBQSxDQUFDLENBQUMsUUFBRixDQUFBLENBQUEsQ0FBbkIsR0FBaUMsSUFBakMsR0FBb0MsQ0FBQyxDQUFDLENBQUMsT0FBRixDQUFBLENBQUQsQ0FEekMsR0FFSyx5QkFISCxDQUFOO01BS0EsU0FBQSxFQUFXLE1BTFg7S0FEdUYsQ0FBL0Q7RUFKVjs7OztHQXpDVTs7OztBREhwQyxJQUFBLG9CQUFBO0VBQUE7OztBQUFBLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7QUFDVCxZQUFBLEdBQWUsT0FBQSxDQUFRLGNBQVI7O0FBRVQsT0FBTyxDQUFDOzs7RUFDRyxxQkFBQyxPQUFEOztNQUFDLFVBQVU7O0lBQ3BCLENBQUMsQ0FBQyxRQUFGLENBQVcsT0FBWCxFQUNJO01BQUEsZUFBQSxFQUFpQixJQUFqQjtNQUNBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxLQUFQLEdBQWUsc0JBQXNCLENBQUMsS0FBdkMsQ0FBQSxHQUFnRCxDQURuRDtNQUVBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxNQUFQLEdBQWdCLHNCQUFzQixDQUFDLE1BQXhDLENBQUEsR0FBa0QsQ0FGckQ7S0FESjtJQUlBLDZDQUFNLE9BQU47SUFFQSxJQUFDLENBQUEsS0FBRCxHQUNJO01BQUEscUJBQUEsRUFBdUIscUJBQXFCLENBQUMsSUFBdEIsQ0FBQSxDQUF2QjtNQUNBLG9CQUFBLEVBQXNCLG9CQUFvQixDQUFDLElBQXJCLENBQUEsQ0FEdEI7TUFFQSxvQkFBQSxFQUFzQixvQkFBb0IsQ0FBQyxJQUFyQixDQUFBLENBRnRCO01BR0EsZUFBQSxFQUFpQixlQUFlLENBQUMsSUFBaEIsQ0FBQSxDQUhqQjtNQUlBLGdCQUFBLEVBQWtCLGdCQUFnQixDQUFDLElBQWpCLENBQUEsQ0FKbEI7TUFLQSwwQkFBQSxFQUE0QiwwQkFBMEIsQ0FBQyxJQUEzQixDQUFBLENBTDVCO01BTUEsc0JBQUEsRUFBd0Isc0JBQXNCLENBQUMsSUFBdkIsQ0FBQSxDQU54Qjs7SUFRSixNQUFNLENBQUMsWUFBUCxDQUFvQixJQUFwQixFQUF1QixJQUFDLENBQUEsS0FBSyxDQUFDLHNCQUE5QixFQUFzRCxJQUFDLENBQUEsS0FBdkQ7SUFFQSxJQUFDLENBQUEsS0FBSyxDQUFDLG1CQUFQLEdBQTZCLE1BQU0sQ0FBQyxpQkFBUCxDQUF5QixJQUFDLENBQUEsS0FBSyxDQUFDLDBCQUFoQyxFQUE0RCxJQUFJLFlBQVksQ0FBQyxZQUE3RTtFQWxCcEI7O3dCQW9CYixVQUFBLEdBQVksTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxZQUFEO1dBQzFCLElBQUMsQ0FBQSxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQXZCLENBQTZCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtBQUN6QixZQUFBO1FBQUEsYUFBQSxHQUFnQixLQUFDLENBQUEsS0FBSyxDQUFDLG1CQUFtQixDQUFDO2VBQzNDLFlBQVksQ0FBQyxLQUFiLENBQW1CLGFBQW5CO01BRnlCO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE3QjtFQUQwQixDQUFsQjs7d0JBS1osV0FBQSxHQUFhLE1BQU0sQ0FBQyxVQUFQLENBQWtCLFNBQUMsYUFBRDtXQUMzQixJQUFDLENBQUEsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEtBQXhCLENBQThCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUMxQixhQUFhLENBQUMsS0FBZCxDQUFBO01BRDBCO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE5QjtFQUQyQixDQUFsQjs7d0JBSWIsdUJBQUEsR0FBeUIsU0FBQyxlQUFEO1dBQ3JCLElBQUMsQ0FBQSxLQUFLLENBQUMsbUJBQW1CLENBQUMsZUFBM0IsR0FBNkMsZUFBZSxDQUFDO0VBRHhDOzt3QkFHekIscUJBQUEsR0FBdUIsU0FBQyxXQUFEO1dBQ25CLElBQUMsQ0FBQSxLQUFLLENBQUMsbUJBQW1CLENBQUMsS0FBM0IsR0FBbUMsV0FBVyxDQUFDO0VBRDVCOzs7O0dBakNPOzs7O0FESGxDLElBQUEsTUFBQTtFQUFBOzs7QUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0FBRUgsT0FBTyxDQUFDOzs7RUFDRyx1QkFBQyxPQUFEOztNQUFDLFVBQVU7O0lBQ3BCLENBQUMsQ0FBQyxRQUFGLENBQVcsT0FBWCxFQUNJO01BQUEsZUFBQSxFQUFpQixJQUFqQjtNQUNBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxLQUFQLEdBQWUsd0JBQXdCLENBQUMsS0FBekMsQ0FBQSxHQUFrRCxDQURyRDtNQUVBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxNQUFQLEdBQWdCLHdCQUF3QixDQUFDLE1BQTFDLENBQUEsR0FBb0QsQ0FGdkQ7S0FESjtJQUlBLCtDQUFNLE9BQU47SUFFQSxJQUFDLENBQUEsS0FBRCxHQUNJO01BQUEsc0JBQUEsRUFBd0Isc0JBQXNCLENBQUMsSUFBdkIsQ0FBQSxDQUF4QjtNQUNBLGlCQUFBLEVBQW1CLGlCQUFpQixDQUFDLElBQWxCLENBQUEsQ0FEbkI7TUFFQSx3QkFBQSxFQUEwQix3QkFBd0IsQ0FBQyxJQUF6QixDQUFBLENBRjFCOztJQUlKLE1BQU0sQ0FBQyxZQUFQLENBQW9CLElBQXBCLEVBQXVCLElBQUMsQ0FBQSxLQUFLLENBQUMsd0JBQTlCLEVBQXdELElBQUMsQ0FBQSxLQUF6RDtFQVpTOzswQkFjYixVQUFBLEdBQVksTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxZQUFEO1dBQzFCLElBQUMsQ0FBQSxLQUFLLENBQUMsaUJBQWlCLENBQUMsS0FBekIsQ0FBK0IsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQzNCLFlBQVksQ0FBQyxLQUFiLENBQUE7TUFEMkI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQS9CO0VBRDBCLENBQWxCOzs7O0dBZm9COzs7O0FERnBDLElBQUEsc0JBQUE7RUFBQTs7O0FBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSOztBQUNULGNBQUEsR0FBaUIsT0FBQSxDQUFRLGdCQUFSOztBQUVYLE9BQU8sQ0FBQzs7O0VBQ0csb0JBQUMsT0FBRDs7TUFBQyxVQUFVOztJQUNwQixDQUFDLENBQUMsUUFBRixDQUFXLE9BQVgsRUFDSTtNQUFBLGVBQUEsRUFBaUIsSUFBakI7TUFDQSxDQUFBLEVBQUcsQ0FBQyxNQUFNLENBQUMsS0FBUCxHQUFlLHFCQUFxQixDQUFDLEtBQXRDLENBQUEsR0FBK0MsQ0FEbEQ7TUFFQSxDQUFBLEVBQUcsQ0FBQyxNQUFNLENBQUMsTUFBUCxHQUFnQixxQkFBcUIsQ0FBQyxNQUF2QyxDQUFBLEdBQWlELENBRnBEO0tBREo7SUFJQSw0Q0FBTSxPQUFOO0lBRUEsSUFBQyxDQUFBLEtBQUQsR0FDSTtNQUFBLG9CQUFBLEVBQXNCLG9CQUFvQixDQUFDLElBQXJCLENBQUEsQ0FBdEI7TUFDQSxtQkFBQSxFQUFxQixtQkFBbUIsQ0FBQyxJQUFwQixDQUFBLENBRHJCO01BRUEsbUJBQUEsRUFBcUIsbUJBQW1CLENBQUMsSUFBcEIsQ0FBQSxDQUZyQjtNQUdBLGNBQUEsRUFBZ0IsY0FBYyxDQUFDLElBQWYsQ0FBQSxDQUhoQjtNQUlBLGVBQUEsRUFBaUIsZUFBZSxDQUFDLElBQWhCLENBQUEsQ0FKakI7TUFLQSw0QkFBQSxFQUE4Qiw0QkFBNEIsQ0FBQyxJQUE3QixDQUFBLENBTDlCO01BTUEscUJBQUEsRUFBdUIscUJBQXFCLENBQUMsSUFBdEIsQ0FBQSxDQU52Qjs7SUFRSixNQUFNLENBQUMsWUFBUCxDQUFvQixJQUFwQixFQUF1QixJQUFDLENBQUEsS0FBSyxDQUFDLHFCQUE5QixFQUFxRCxJQUFDLENBQUEsS0FBdEQ7SUFFQSxJQUFDLENBQUEsS0FBSyxDQUFDLHFCQUFQLEdBQStCLE1BQU0sQ0FBQyxpQkFBUCxDQUF5QixJQUFDLENBQUEsS0FBSyxDQUFDLDRCQUFoQyxFQUFrRSxJQUFBLGNBQWMsQ0FBQyxjQUFmLENBQ3pGO01BQUEsY0FBQSxFQUNJO1FBQUEsTUFBQSxFQUFRLElBQUMsQ0FBQSxLQUFLLENBQUMsNEJBQTRCLENBQUMsTUFBNUM7UUFDQSxLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxLQUQzQztPQURKO01BR0EsZ0JBQUEsRUFDSTtRQUFBLE1BQUEsRUFBUSxFQUFSO1FBQ0EsUUFBQSxFQUFVLEVBRFY7T0FKSjtNQU1BLGtCQUFBLEVBQW9CLENBTnBCO01BT0EsbUJBQUEsRUFBcUIsS0FQckI7S0FEeUYsQ0FBbEU7RUFsQnRCOzt1QkE0QmIsVUFBQSxHQUFZLE1BQU0sQ0FBQyxVQUFQLENBQWtCLFNBQUMsWUFBRDtXQUMxQixJQUFDLENBQUEsS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUF0QixDQUE0QixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7QUFDeEIsWUFBQTtRQUFBLFlBQUEsR0FBZSxLQUFDLENBQUEsS0FBSyxDQUFDLHFCQUFxQixDQUFDLHlCQUE3QixDQUFBO2VBQ2YsWUFBWSxDQUFDLEtBQWIsQ0FBbUIsWUFBbkI7TUFGd0I7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTVCO0VBRDBCLENBQWxCOzt1QkFLWixXQUFBLEdBQWEsTUFBTSxDQUFDLFVBQVAsQ0FBa0IsU0FBQyxhQUFEO1dBQzNCLElBQUMsQ0FBQSxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQXZCLENBQTZCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUN6QixhQUFhLENBQUMsS0FBZCxDQUFBO01BRHlCO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE3QjtFQUQyQixDQUFsQjs7dUJBSWIsb0JBQUEsR0FBc0IsU0FBQyxZQUFEO1dBQ2xCLElBQUMsQ0FBQSxLQUFLLENBQUMscUJBQXFCLENBQUMsb0JBQTdCLENBQ0ksWUFBWSxDQUFDLEtBRGpCLEVBRUksWUFBWSxDQUFDLEtBRmpCLEVBR0ksS0FISjtFQURrQjs7OztHQXRDTyJ9
