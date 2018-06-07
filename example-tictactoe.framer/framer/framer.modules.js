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


},{}],"Tictactoe":[function(require,module,exports){
var Casing,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Casing = require("Casing");

exports.Tictactoe = (function(superClass) {
  extend(Tictactoe, superClass);

  function Tictactoe(options) {
    if (options == null) {
      options = {};
    }
    _.defaults(options, {
      backgroundColor: null,
      x: (Screen.width - Tictactoe_background.width) / 2,
      y: (Screen.height - Tictactoe_background.height) / 2
    });
    Tictactoe.__super__.constructor.call(this, options);
    this.comps = {
      Tictactoe_statusbar: Tictactoe_statusbar.copy(),
      Tictactoe_grid: Tictactoe_grid.copy(),
      Tictactoe_o: Tictactoe_o.copy(),
      Tictactoe_x: Tictactoe_x.copy(),
      Tictactoe_next_x: Tictactoe_next_x.copy(),
      Tictactoe_next_o: Tictactoe_next_o.copy(),
      Tictactoe_field00: Tictactoe_field00.copy(),
      Tictactoe_field01: Tictactoe_field01.copy(),
      Tictactoe_field02: Tictactoe_field02.copy(),
      Tictactoe_field10: Tictactoe_field10.copy(),
      Tictactoe_field11: Tictactoe_field11.copy(),
      Tictactoe_field12: Tictactoe_field12.copy(),
      Tictactoe_field20: Tictactoe_field20.copy(),
      Tictactoe_field21: Tictactoe_field21.copy(),
      Tictactoe_field22: Tictactoe_field22.copy(),
      Tictactoe_background: Tictactoe_background.copy()
    };
    Casing.autoPosition(this, this.comps.Tictactoe_grid, this.comps);
    this.board_fields = [[this.comps.Tictactoe_field00, this.comps.Tictactoe_field01, this.comps.Tictactoe_field02], [this.comps.Tictactoe_field10, this.comps.Tictactoe_field11, this.comps.Tictactoe_field12], [this.comps.Tictactoe_field20, this.comps.Tictactoe_field21, this.comps.Tictactoe_field22]];
    this.board_symbols = {
      "O": Tictactoe_o,
      "X": Tictactoe_x
    };
    this.board_marks = [];
  }

  Tictactoe.prototype.compStyles = {
    borderActive: {
      borderRadius: 10,
      borderWidth: 3,
      borderColor: "#555555"
    },
    borderInactive: {
      borderWidth: 0
    },
    nextText: {
      text: "NEXT",
      fontSize: 20,
      fontWeight: "bold",
      textAlign: "center",
      color: "#555555"
    }
  };

  Tictactoe.prototype.wiring_statusbar = function(nextPlayer) {
    var ref, ref1;
    if (nextPlayer.value === "O") {
      _.assign(this.comps.Tictactoe_o, this.compStyles.borderActive);
      _.assign(this.comps.Tictactoe_x, this.compStyles.borderInactive);
      this.temp_Tictactoe_next_o = Casing.sizePositionApply(this.comps.Tictactoe_next_o, new TextLayer(this.compStyles.nextText));
      if ((ref = this.temp_Tictactoe_next_x) != null) {
        ref.destroy();
      }
    }
    if (nextPlayer.value === "X") {
      _.assign(this.comps.Tictactoe_o, this.compStyles.borderInactive);
      _.assign(this.comps.Tictactoe_x, this.compStyles.borderActive);
      if ((ref1 = this.temp_Tictactoe_next_o) != null) {
        ref1.destroy();
      }
      return this.temp_Tictactoe_next_x = Casing.sizePositionApply(this.comps.Tictactoe_next_x, new TextLayer(this.compStyles.nextText));
    }
  };

  Tictactoe.prototype.wiring_grid = function(gameState) {
    var cellSymbol, col, comp, endCol, endRow, i, j, k, l, len, len1, mark, new_symbol, ref, ref1, ref2, ref3, results, row, startCol, startRow, x_1, x_2, y_1, y_2;
    ref = this.board_marks;
    for (i = 0, len = ref.length; i < len; i++) {
      mark = ref[i];
      mark.destroy();
    }
    this.board_marks = [];
    for (row = j = 0; j <= 2; row = ++j) {
      for (col = k = 0; k <= 2; col = ++k) {
        cellSymbol = gameState.value[row][col];
        if (cellSymbol !== "") {
          new_symbol = Casing.sizePositionApply(this.board_fields[row][col], this.board_symbols[cellSymbol].copy());
          new_symbol.z = 10;
          this.board_marks.push(new_symbol);
        }
      }
    }
    if ((ref1 = this.win_line) != null) {
      ref1.destroy();
    }
    if (!_.isEqual(gameState.checkWinner, {})) {
      ref2 = gameState.checkWinner, startRow = ref2.startRow, endRow = ref2.endRow, startCol = ref2.startCol, endCol = ref2.endCol;
      y_1 = (2 * this.board_fields[startRow][0].screenFrame.y + this.board_fields[startRow][0].height) / 2;
      y_2 = (2 * this.board_fields[endRow][0].screenFrame.y + this.board_fields[endRow][0].height) / 2;
      x_1 = (2 * this.board_fields[0][startCol].screenFrame.x + this.board_fields[0][startCol].height) / 2;
      x_2 = (2 * this.board_fields[0][endCol].screenFrame.x + this.board_fields[0][endCol].height) / 2;
      this.win_line = new SVGLayer({
        svg: "<svg><line x1='" + x_1 + "' y1='" + y_1 + "' x2='" + x_2 + "' y2='" + y_2 + "' style='stroke:rgb(255,98,183);stroke-width:10'/>",
        z: 10
      });
      ref3 = this.comps;
      results = [];
      for (l = 0, len1 = ref3.length; l < len1; l++) {
        comp = ref3[l];
        results.push(comp.destroy());
      }
      return results;
    }
  };

  Tictactoe.prototype.wiring_grid_press = Casing.invokeOnce(function(gameState, nextPlayer) {
    return this.comps.Tictactoe_grid.on(Events.Tap, (function(_this) {
      return function(event) {
        var col, i, in_frame, new_board, results, row;
        in_frame = function(frame, point) {
          return frame.x <= point.x && point.x <= frame.x + frame.width && frame.y <= point.y && point.y <= frame.y + frame.height;
        };
        results = [];
        for (row = i = 0; i <= 2; row = ++i) {
          results.push((function() {
            var j, results1;
            results1 = [];
            for (col = j = 0; j <= 2; col = ++j) {
              if (in_frame(this.board_fields[row][col].screenFrame, event) && gameState.value[row][col] === "" && _.isEqual(gameState.checkWinner, {})) {
                new_board = _.cloneDeep(gameState.value);
                new_board[row][col] = nextPlayer.value;
                gameState.value = new_board;
                if (nextPlayer.value === "O") {
                  results1.push(nextPlayer.value = "X");
                } else {
                  results1.push(nextPlayer.value = "O");
                }
              } else {
                results1.push(void 0);
              }
            }
            return results1;
          }).call(_this));
        }
        return results;
      };
    })(this));
  });

  return Tictactoe;

})(Layer);


},{"Casing":"Casing"}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJhbWVyLm1vZHVsZXMuanMiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL1VzZXJzL25hdGFsaWUvRGVza3RvcC9jYXNpbmcvZXhhbXBsZS10aWN0YWN0b2UuZnJhbWVyL21vZHVsZXMvVGljdGFjdG9lLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uL1VzZXJzL25hdGFsaWUvRGVza3RvcC9jYXNpbmcvZXhhbXBsZS10aWN0YWN0b2UuZnJhbWVyL21vZHVsZXMvQ2FzaW5nLmNvZmZlZSIsIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiQ2FzaW5nID0gcmVxdWlyZSBcIkNhc2luZ1wiXG5cbmNsYXNzIGV4cG9ydHMuVGljdGFjdG9lIGV4dGVuZHMgTGF5ZXJcbiAgICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICAgICAgXy5kZWZhdWx0cyBvcHRpb25zLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBudWxsXG4gICAgICAgICAgICB4OiAoU2NyZWVuLndpZHRoIC0gVGljdGFjdG9lX2JhY2tncm91bmQud2lkdGgpIC8gMlxuICAgICAgICAgICAgeTogKFNjcmVlbi5oZWlnaHQgLSBUaWN0YWN0b2VfYmFja2dyb3VuZC5oZWlnaHQpIC8gMlxuICAgICAgICBzdXBlciBvcHRpb25zXG5cbiAgICAgICAgQGNvbXBzID1cbiAgICAgICAgICAgIFRpY3RhY3RvZV9zdGF0dXNiYXI6IFRpY3RhY3RvZV9zdGF0dXNiYXIuY29weSgpXG4gICAgICAgICAgICBUaWN0YWN0b2VfZ3JpZDogVGljdGFjdG9lX2dyaWQuY29weSgpXG4gICAgICAgICAgICBUaWN0YWN0b2VfbzogVGljdGFjdG9lX28uY29weSgpXG4gICAgICAgICAgICBUaWN0YWN0b2VfeDogVGljdGFjdG9lX3guY29weSgpXG4gICAgICAgICAgICBUaWN0YWN0b2VfbmV4dF94OiBUaWN0YWN0b2VfbmV4dF94LmNvcHkoKVxuICAgICAgICAgICAgVGljdGFjdG9lX25leHRfbzogVGljdGFjdG9lX25leHRfby5jb3B5KClcbiAgICAgICAgICAgIFRpY3RhY3RvZV9maWVsZDAwOiBUaWN0YWN0b2VfZmllbGQwMC5jb3B5KClcbiAgICAgICAgICAgIFRpY3RhY3RvZV9maWVsZDAxOiBUaWN0YWN0b2VfZmllbGQwMS5jb3B5KClcbiAgICAgICAgICAgIFRpY3RhY3RvZV9maWVsZDAyOiBUaWN0YWN0b2VfZmllbGQwMi5jb3B5KClcbiAgICAgICAgICAgIFRpY3RhY3RvZV9maWVsZDEwOiBUaWN0YWN0b2VfZmllbGQxMC5jb3B5KClcbiAgICAgICAgICAgIFRpY3RhY3RvZV9maWVsZDExOiBUaWN0YWN0b2VfZmllbGQxMS5jb3B5KClcbiAgICAgICAgICAgIFRpY3RhY3RvZV9maWVsZDEyOiBUaWN0YWN0b2VfZmllbGQxMi5jb3B5KClcbiAgICAgICAgICAgIFRpY3RhY3RvZV9maWVsZDIwOiBUaWN0YWN0b2VfZmllbGQyMC5jb3B5KClcbiAgICAgICAgICAgIFRpY3RhY3RvZV9maWVsZDIxOiBUaWN0YWN0b2VfZmllbGQyMS5jb3B5KClcbiAgICAgICAgICAgIFRpY3RhY3RvZV9maWVsZDIyOiBUaWN0YWN0b2VfZmllbGQyMi5jb3B5KClcbiAgICAgICAgICAgIFRpY3RhY3RvZV9iYWNrZ3JvdW5kOiBUaWN0YWN0b2VfYmFja2dyb3VuZC5jb3B5KClcblxuICAgICAgICBDYXNpbmcuYXV0b1Bvc2l0aW9uKEAsIEBjb21wcy5UaWN0YWN0b2VfZ3JpZCwgQGNvbXBzKVxuXG4gICAgICAgIEBib2FyZF9maWVsZHMgPSBbXG4gICAgICAgICAgICBbQGNvbXBzLlRpY3RhY3RvZV9maWVsZDAwLCBAY29tcHMuVGljdGFjdG9lX2ZpZWxkMDEsIEBjb21wcy5UaWN0YWN0b2VfZmllbGQwMl1cbiAgICAgICAgICAgIFtAY29tcHMuVGljdGFjdG9lX2ZpZWxkMTAsIEBjb21wcy5UaWN0YWN0b2VfZmllbGQxMSwgQGNvbXBzLlRpY3RhY3RvZV9maWVsZDEyXVxuICAgICAgICAgICAgW0Bjb21wcy5UaWN0YWN0b2VfZmllbGQyMCwgQGNvbXBzLlRpY3RhY3RvZV9maWVsZDIxLCBAY29tcHMuVGljdGFjdG9lX2ZpZWxkMjJdXG4gICAgICAgIF1cbiAgICAgICAgQGJvYXJkX3N5bWJvbHMgPVxuICAgICAgICAgICAgXCJPXCI6IFRpY3RhY3RvZV9vXG4gICAgICAgICAgICBcIlhcIjogVGljdGFjdG9lX3hcbiAgICAgICAgQGJvYXJkX21hcmtzID0gW11cblxuXG4gICAgY29tcFN0eWxlczpcbiAgICAgICAgYm9yZGVyQWN0aXZlOlxuICAgICAgICAgICAgYm9yZGVyUmFkaXVzOiAxMFxuICAgICAgICAgICAgYm9yZGVyV2lkdGg6IDNcbiAgICAgICAgICAgIGJvcmRlckNvbG9yOiBcIiM1NTU1NTVcIlxuICAgICAgICBib3JkZXJJbmFjdGl2ZTpcbiAgICAgICAgICAgIGJvcmRlcldpZHRoOiAwXG4gICAgICAgIG5leHRUZXh0OlxuICAgICAgICAgICAgdGV4dDogXCJORVhUXCJcbiAgICAgICAgICAgIGZvbnRTaXplOiAyMFxuICAgICAgICAgICAgZm9udFdlaWdodDogXCJib2xkXCJcbiAgICAgICAgICAgIHRleHRBbGlnbjogXCJjZW50ZXJcIlxuICAgICAgICAgICAgY29sb3I6IFwiIzU1NTU1NVwiXG5cblxuICAgIHdpcmluZ19zdGF0dXNiYXI6IChuZXh0UGxheWVyKSAtPlxuICAgICAgICBpZiBuZXh0UGxheWVyLnZhbHVlID09IFwiT1wiXG4gICAgICAgICAgICBfLmFzc2lnbiBAY29tcHMuVGljdGFjdG9lX28sIEBjb21wU3R5bGVzLmJvcmRlckFjdGl2ZVxuICAgICAgICAgICAgXy5hc3NpZ24gQGNvbXBzLlRpY3RhY3RvZV94LCBAY29tcFN0eWxlcy5ib3JkZXJJbmFjdGl2ZVxuICAgICAgICAgICAgQHRlbXBfVGljdGFjdG9lX25leHRfbyA9IENhc2luZy5zaXplUG9zaXRpb25BcHBseShcbiAgICAgICAgICAgICAgICBAY29tcHMuVGljdGFjdG9lX25leHRfbyxcbiAgICAgICAgICAgICAgICBuZXcgVGV4dExheWVyIEBjb21wU3R5bGVzLm5leHRUZXh0XG4gICAgICAgICAgICApXG4gICAgICAgICAgICBAdGVtcF9UaWN0YWN0b2VfbmV4dF94Py5kZXN0cm95KClcblxuICAgICAgICBpZiBuZXh0UGxheWVyLnZhbHVlID09IFwiWFwiXG4gICAgICAgICAgICBfLmFzc2lnbiBAY29tcHMuVGljdGFjdG9lX28sIEBjb21wU3R5bGVzLmJvcmRlckluYWN0aXZlXG4gICAgICAgICAgICBfLmFzc2lnbiBAY29tcHMuVGljdGFjdG9lX3gsIEBjb21wU3R5bGVzLmJvcmRlckFjdGl2ZVxuICAgICAgICAgICAgQHRlbXBfVGljdGFjdG9lX25leHRfbz8uZGVzdHJveSgpXG4gICAgICAgICAgICBAdGVtcF9UaWN0YWN0b2VfbmV4dF94ID0gQ2FzaW5nLnNpemVQb3NpdGlvbkFwcGx5KFxuICAgICAgICAgICAgICAgIEBjb21wcy5UaWN0YWN0b2VfbmV4dF94XG4gICAgICAgICAgICAgICAgbmV3IFRleHRMYXllciBAY29tcFN0eWxlcy5uZXh0VGV4dFxuICAgICAgICAgICAgKVxuXG5cbiAgICB3aXJpbmdfZ3JpZDogKGdhbWVTdGF0ZSkgLT5cbiAgICAgICAgIyBjbGVhciBwcmV2aW91cyBjZWxsc1xuICAgICAgICBmb3IgbWFyayBpbiBAYm9hcmRfbWFya3NcbiAgICAgICAgICAgIG1hcmsuZGVzdHJveSgpXG4gICAgICAgIEBib2FyZF9tYXJrcyA9IFtdXG5cbiAgICAgICAgIyBmaWxsIGluIGNlbGxzXG4gICAgICAgIGZvciByb3cgaW4gWzAuLjJdXG4gICAgICAgICAgICBmb3IgY29sIGluIFswLi4yXVxuICAgICAgICAgICAgICAgIGNlbGxTeW1ib2wgPSBnYW1lU3RhdGUudmFsdWVbcm93XVtjb2xdXG4gICAgICAgICAgICAgICAgaWYgY2VsbFN5bWJvbCAhPSBcIlwiXG4gICAgICAgICAgICAgICAgICAgIG5ld19zeW1ib2wgPSBDYXNpbmcuc2l6ZVBvc2l0aW9uQXBwbHkoXG4gICAgICAgICAgICAgICAgICAgICAgICBAYm9hcmRfZmllbGRzW3Jvd11bY29sXVxuICAgICAgICAgICAgICAgICAgICAgICAgQGJvYXJkX3N5bWJvbHNbY2VsbFN5bWJvbF0uY29weSgpXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgbmV3X3N5bWJvbC56ID0gMTBcbiAgICAgICAgICAgICAgICAgICAgQGJvYXJkX21hcmtzLnB1c2ggbmV3X3N5bWJvbFxuXG4gICAgICAgICMgZGVsZXRlIHRoZSB3aW5uaW5nIGxpbmVcbiAgICAgICAgQHdpbl9saW5lPy5kZXN0cm95KClcblxuICAgICAgICAjIGRyYXcgdGhlIHdpbm5pbmcgbGluZVxuICAgICAgICBpZiBub3QgXy5pc0VxdWFsIGdhbWVTdGF0ZS5jaGVja1dpbm5lciwge31cbiAgICAgICAgICAgIHtzdGFydFJvdywgZW5kUm93LCBzdGFydENvbCwgZW5kQ29sfSA9IGdhbWVTdGF0ZS5jaGVja1dpbm5lclxuICAgICAgICAgICAgeV8xID0gKDIgKiBAYm9hcmRfZmllbGRzW3N0YXJ0Um93XVswXS5zY3JlZW5GcmFtZS55ICsgQGJvYXJkX2ZpZWxkc1tzdGFydFJvd11bMF0uaGVpZ2h0KSAvIDJcbiAgICAgICAgICAgIHlfMiA9ICgyICogQGJvYXJkX2ZpZWxkc1tlbmRSb3ddWzBdLnNjcmVlbkZyYW1lLnkgKyBAYm9hcmRfZmllbGRzW2VuZFJvd11bMF0uaGVpZ2h0KSAvIDJcblxuICAgICAgICAgICAgeF8xID0gKDIgKiBAYm9hcmRfZmllbGRzWzBdW3N0YXJ0Q29sXS5zY3JlZW5GcmFtZS54ICsgQGJvYXJkX2ZpZWxkc1swXVtzdGFydENvbF0uaGVpZ2h0KSAvIDJcbiAgICAgICAgICAgIHhfMiA9ICgyICogQGJvYXJkX2ZpZWxkc1swXVtlbmRDb2xdLnNjcmVlbkZyYW1lLnggKyBAYm9hcmRfZmllbGRzWzBdW2VuZENvbF0uaGVpZ2h0KSAvIDJcblxuICAgICAgICAgICAgQHdpbl9saW5lID0gbmV3IFNWR0xheWVyXG4gICAgICAgICAgICAgICAgc3ZnOiBcIjxzdmc+PGxpbmUgeDE9JyN7eF8xfScgeTE9JyN7eV8xfScgeDI9JyN7eF8yfScgeTI9JyN7eV8yfScgc3R5bGU9J3N0cm9rZTpyZ2IoMjU1LDk4LDE4Myk7c3Ryb2tlLXdpZHRoOjEwJy8+XCJcbiAgICAgICAgICAgICAgICB6OiAxMFxuXG4gICAgICAgICAgICBmb3IgY29tcCBpbiBAY29tcHNcbiAgICAgICAgICAgICAgICBjb21wLmRlc3Ryb3koKVxuXG5cbiAgICB3aXJpbmdfZ3JpZF9wcmVzczogQ2FzaW5nLmludm9rZU9uY2UgKGdhbWVTdGF0ZSwgbmV4dFBsYXllcikgLT5cbiAgICAgICAgQGNvbXBzLlRpY3RhY3RvZV9ncmlkLm9uIEV2ZW50cy5UYXAsIChldmVudCkgPT5cbiAgICAgICAgICAgIGluX2ZyYW1lID0gKGZyYW1lLCBwb2ludCkgLT5cbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICBmcmFtZS54IDw9IHBvaW50LnggYW5kXG4gICAgICAgICAgICAgICAgICAgIHBvaW50LnggPD0gZnJhbWUueCArIGZyYW1lLndpZHRoIGFuZFxuICAgICAgICAgICAgICAgICAgICBmcmFtZS55IDw9IHBvaW50LnkgYW5kXG4gICAgICAgICAgICAgICAgICAgIHBvaW50LnkgPD0gZnJhbWUueSArIGZyYW1lLmhlaWdodFxuICAgICAgICAgICAgICAgIClcblxuICAgICAgICAgICAgZm9yIHJvdyBpbiBbMC4uMl1cbiAgICAgICAgICAgICAgICBmb3IgY29sIGluIFswLi4yXVxuICAgICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICBpbl9mcmFtZShAYm9hcmRfZmllbGRzW3Jvd11bY29sXS5zY3JlZW5GcmFtZSwgZXZlbnQpIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2FtZVN0YXRlLnZhbHVlW3Jvd11bY29sXSA9PSBcIlwiIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgXy5pc0VxdWFsIGdhbWVTdGF0ZS5jaGVja1dpbm5lciwge31cbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3X2JvYXJkID0gXy5jbG9uZURlZXAoZ2FtZVN0YXRlLnZhbHVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3X2JvYXJkW3Jvd11bY29sXSA9IG5leHRQbGF5ZXIudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgIGdhbWVTdGF0ZS52YWx1ZSA9IG5ld19ib2FyZFxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiBuZXh0UGxheWVyLnZhbHVlID09IFwiT1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFBsYXllci52YWx1ZSA9IFwiWFwiXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFBsYXllci52YWx1ZSA9IFwiT1wiXG4iLCIjIENvcHlyaWdodCAoYykgMjAxOCBOYXRhbGllIE1hcmxlbnlcbiMgQ2FzaW5nIC0gVUkgZnJhbWV3b3JrIGZvciBGcmFtZXJcbiMgTGljZW5zZTogTUlUXG4jIFVSTDogaHR0cHM6Ly9naXRodWIuY29tL25hdGFsaWVtYXJsZW55L0Nhc2luZ1xuXG5cbiMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgVXRpbGl0eSBmdW5jdGlvbnNcbmV4cG9ydHMuZ2V0U2NyZWVuRnJhbWVQb2ludCA9IChsYXllcikgLT4gKF8ucGljayBsYXllci5zY3JlZW5GcmFtZSwgWyd4JywgJ3knXSlcblxuZXhwb3J0cy5zaXplUG9zaXRpb25BcHBseSA9IChzb3VyY2VDb21wLCB0YXJnZXRDb21wKSAtPlxuICAgIHRhcmdldENvbXAucGFyZW50ID0gc291cmNlQ29tcC5wYXJlbnRcbiAgICBfLmFzc2lnbiB0YXJnZXRDb21wLCBzb3VyY2VDb21wLmZyYW1lXG5cbmV4cG9ydHMuYXV0b1Bvc2l0aW9uID0gKHBhcmVudENvbXAsIHJlZmVyZW5jZUNvbXAsIGNvbXBzKSAtPlxuICAgIHJlZmVyZW5jZUZyYW1lUG9pbnQgPSBfLmNsb25lRGVlcChleHBvcnRzLmdldFNjcmVlbkZyYW1lUG9pbnQocmVmZXJlbmNlQ29tcCkpXG4gICAgZm9yIGNvbXBOYW1lLCBjb21wIG9mIGNvbXBzXG4gICAgICAgIF8uYXNzaWduIGNvbXAsIChfLm1lcmdlV2l0aCBleHBvcnRzLmdldFNjcmVlbkZyYW1lUG9pbnQoY29tcCksIHJlZmVyZW5jZUZyYW1lUG9pbnQsIF8uc3VidHJhY3QpXG4gICAgXy5hc3NpZ24oY29tcCwge3BhcmVudDogcGFyZW50Q29tcH0pIGZvciBjb21wTmFtZSwgY29tcCBvZiBjb21wc1xuXG5leHBvcnRzLmludm9rZU9uY2UgPSAoZnVuYykgLT5cbiAgICByZXR1cm4ge1xuICAgICAgICAnaW52b2tlT25jZSc6IHRydWVcbiAgICAgICAgJ2Z1bmMnOiBmdW5jXG4gICAgfVxuXG5leHBvcnRzLmNvbnN0cnVjdE1vZHVsZSA9IChtb2R1bGVOYW1lKSAtPlxuICAgIC0+XG4gICAgICAgIG1vZHVsZSA9IHJlcXVpcmUgbW9kdWxlTmFtZVxuICAgICAgICBuZXcgbW9kdWxlW21vZHVsZU5hbWVdXG5cbiMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUHVycG9zZSBvZiBkYXRhLWJ1bmRsZXM6IGNoYW5nZXMgcHJvcGFnYXRpb24sIGhpc3Rvcnkgb2YgdmFsdWVzLCBjdXN0b20gcHJvcGVydGllc1xuY2xhc3MgRGF0YUJ1bmRsZVxuICAgIGNvbnN0cnVjdG9yOiAoQF9jb21wb25lbnROYW1lLCBAX2RhdGFOYW1lLCBAX2RhdGFWYWx1ZSwgQF9hcHApIC0+XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eSBEYXRhQnVuZGxlLnByb3RvdHlwZSwgXCJ2YWx1ZVwiLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXG4gICAgZ2V0OiAoKSAtPiAoQF9kYXRhVmFsdWUpXG4gICAgc2V0OiAobmV3VmFsdWUpIC0+XG5cbiAgICAgICAgIyBJZiB0aGUgbmV3IHZhbHVlIGRpZmZlcnMgZnJvbSB0aGUgcmVnaXN0ZXJlZCB2YWx1ZVxuICAgICAgICBpZiBAX2RhdGFWYWx1ZSAhPSBuZXdWYWx1ZVxuXG4gICAgICAgICAgICBAX2RhdGFWYWx1ZSA9IG5ld1ZhbHVlXG4gICAgICAgICAgICBAX2FwcC5fdXBkYXRlRGF0YShAX2NvbXBvbmVudE5hbWUsIEBfZGF0YU5hbWUsIG5ld1ZhbHVlKVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkgRGF0YUJ1bmRsZS5wcm90b3R5cGUsIFwiX2RhdGFcIixcbiAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICBnZXQ6ICgpIC0+IChAX2FwcC5fZGF0YSlcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5IERhdGFCdW5kbGUucHJvdG90eXBlLCBcIl9oaXN0b3J5XCIsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgZ2V0OiAoKSAtPiAoXy5tYXAgQF9hcHAuX2RhdGFJc29sYXRlZEhpc3RvcnksIFwiI3tAX2NvbXBvbmVudE5hbWV9LiN7QF9kYXRhTmFtZX1cIilcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5IERhdGFCdW5kbGUucHJvdG90eXBlLCBcIl9oaXN0b3J5Q2hhbmdlc1wiLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIGdldDogKCkgLT5cbiAgICAgICAgdHJhY2tUcmFuc2l0aW9ucyA9IChhY2MsIG5leHRfaXRlbSkgLT5cbiAgICAgICAgICAgIGlmIGFjYyA9PSBbXSBvciAobm90IF8uaXNFcXVhbChhY2NbYWNjLmxlbmd0aCAtIDFdLCBuZXh0X2l0ZW0pKVxuICAgICAgICAgICAgICAgIGFjYy5wdXNoKG5leHRfaXRlbSlcbiAgICAgICAgICAgIHJldHVybiBhY2NcblxuICAgICAgICByZXR1cm4gXy5yZWR1Y2UgQF9oaXN0b3J5LCB0cmFja1RyYW5zaXRpb25zLCBbXVxuXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFJldHJpZXZlcyB0aGUgbmFtZXMgb2YgdGhlIGZ1bmN0aW9uIHBhcmFtZXRlcnMgKGZvciBkZXBlbmRlbmN5LWluamVjdGlvbilcbiMgQWRhcHRlZCBmcm9tOiBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDA3OTgxL2hvdy10by1nZXQtZnVuY3Rpb24tcGFyYW1ldGVyLW5hbWVzLXZhbHVlcy1keW5hbWljYWxseVxuU1RSSVBfQ09NTUVOVFMgPSAvKChcXC9cXC8uKiQpfChcXC9cXCpbXFxzXFxTXSo/XFwqXFwvKSkvbWdcbkFSR1VNRU5UX05BTUVTID0gLyhbXlxccyxdKykvZ1xuZ2V0UGFyYW1OYW1lcyA9IChmdW5jKSAtPlxuICAgIGZuU3RyID0gZnVuYy50b1N0cmluZygpLnJlcGxhY2UoU1RSSVBfQ09NTUVOVFMsICcnKVxuICAgIHJlc3VsdCA9IGZuU3RyLnNsaWNlKGZuU3RyLmluZGV4T2YoJygnKSsxLCBmblN0ci5pbmRleE9mKCcpJykpLm1hdGNoKEFSR1VNRU5UX05BTUVTKVxuICAgIGlmIHJlc3VsdCA9PSBudWxsXG4gICAgICAgIHJlc3VsdCA9IFtdXG4gICAgcmV0dXJuIHJlc3VsdFxuXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIEFwcGxpY2F0aW9uIGltcGxlbWVudGF0aW9uOiBtYW5hZ2VzIHRoZSBzY3JlZW5zIGFuZCBkYXRhXG4jIGVudHJ5cG9pbnQgbWV0aG9kXG5jbGFzcyBleHBvcnRzLkFwcCBleHRlbmRzIExheWVyXG4gICAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgICAgICBbX2QsIF90XSA9IEBfbG9nX3BlcmZvcm1hbmNlX3ByZXAodHJ1ZSlcblxuICAgICAgICBfLmRlZmF1bHRzIG9wdGlvbnMsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFwiI0VGRUZFRlwiXG4gICAgICAgICAgICBmcmFtZTogU2NyZWVuLmZyYW1lXG4gICAgICAgICAgICAjIFBhdHRlcm4gdG8gdXNlIHdoZW4gZGV0ZWN0aW5nIHdpcmluZyBmdW5jdGlvbnNcbiAgICAgICAgICAgIHdpcmVDb21wb25lbnRNZXRob2RQcmVmaXg6IFwid2lyaW5nX1wiXG5cbiAgICAgICAgICAgIHNob3dFcnJvcnM6IHRydWVcbiAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZVxuICAgICAgICAgICAgc2hvd1BlcmZvcm1hbmNlOiBmYWxzZVxuICAgICAgICAgICAgbG93UGVyZm9ybWFuY2VXaWR0aDogMTQ1XG5cbiAgICAgICAgICAgIGRhdGFJbml0OiB7fVxuICAgICAgICAgICAgZGF0YVByb3BlcnRpZXM6IHt9XG4gICAgICAgIHN1cGVyIG9wdGlvbnNcblxuICAgICAgICBfLmFzc2lnbiBALCBfLnBpY2sgb3B0aW9ucywgW1xuICAgICAgICAgICAgJ3dpcmVDb21wb25lbnRNZXRob2RQcmVmaXgnXG4gICAgICAgICAgICAnc2hvd0Vycm9ycydcbiAgICAgICAgICAgICdzaG93V2FybmluZ3MnXG4gICAgICAgICAgICAnc2hvd1BlcmZvcm1hbmNlJ1xuICAgICAgICAgICAgJ2xvd1BlcmZvcm1hbmNlV2lkdGgnXG4gICAgICAgIF1cblxuICAgICAgICBfLmFzc2lnbiBALFxuICAgICAgICAgICAgc2NyZWVuX3N3aXRjaF9oYXBwZW5lZDogZmFsc2VcblxuICAgICAgICAjIC4uLiBjb21wb25lbnROYW1lID09IFwiX1wiIGZvciBnbG9iYWwtZGF0YVxuICAgICAgICAjIHtjb21wb25lbnROYW1lOiB7bG9jYWxEYXRhTmFtZTogRGF0YUJ1bmRsZShkYXRhVmFsdWUpfX1cbiAgICAgICAgQF9kYXRhSXNvbGF0ZWQgPSB7fVxuICAgICAgICAjIC4uLiBnbG9iYWwtZGF0YSBtYXBwZWQgaW50byBjb21wb25lbnQtbG9jYWwtY29udGV4dCAod2l0aCBhcHByb3ByaWF0ZSByZW5hbWUpXG4gICAgICAgICMge2NvbXBvbmVudE5hbWU6IHtsb2NhbERhdGFOYW1lOiBEYXRhQnVuZGxlKGRhdGFWYWx1ZSl9fVxuICAgICAgICBAZGF0YSA9IEBfZGF0YSA9IHt9XG5cbiAgICAgICAgIyAuLi4gY29tcG9uZW50TmFtZSA9PSBcIl9cIiBmb3IgZ2xvYmFsLWRhdGEtaGlzdG9yeVxuICAgICAgICAjIFt7Y29tcG9uZW50TmFtZToge2xvY2FsRGF0YU5hbWU6IGRhdGFJbnRpYWxWYWx1ZX19LCB7Y29tcG9uZW50TmFtZToge2xvY2FsRGF0YU5hbWU6IGRhdGFWYWx1ZTJTbmFwc2hvdH19XVxuICAgICAgICBAZGF0YUhpc3RvcnkgPSBAX2RhdGFJc29sYXRlZEhpc3RvcnkgPSBbe31dXG4gICAgICAgICMge2NvbXBvbmVudE5hbWUsIHtsb2NhbERhdGFOYW1lOiBcInRhcmdldENvbXBvbmVudE5hbWUudGFyZ2V0Q29tcG9uZW50VmFsdWVcIn19XG4gICAgICAgIEBfZGF0YUxpbmsgPSB7fVxuICAgICAgICAjIFNldChwcm9wZXJ0eU5hbWUpXG4gICAgICAgIEBfZGF0YVByb3BlcnRpZXMgPSBuZXcgU2V0KClcblxuICAgICAgICAjIHtjb21wb25lbnROYW1lOiBjb21wb25lbnRTcGVjfVxuICAgICAgICBAX2NvbXBvbmVudFNwZWNzID0ge31cbiAgICAgICAgIyB7c2NyZWVuTmFtZTogW2NvbXBvbmVudE5hbWVdfVxuICAgICAgICBAX3NjcmVlblNwZWNzID0ge31cblxuICAgICAgICAjIC4uLiB2YWx1ZXMgdGhhdCBjaGFuZ2Ugd2l0aCB0aGUgc2NyZWVuIG9mIHRoZSBhcHBcbiAgICAgICAgIyB7Y29tcG9uZW50TmFtZTogY29tcG9uZW50fVxuICAgICAgICBAX2FjdGl2ZUNvbXBvbmVudHMgPSB7fVxuICAgICAgICAjIHtzb3VyY2VDb21wb25lbnROYW1lOiB7c291cmNlRGF0YU5hbWU6IFtcImNvbXBvbmVudE5hbWUubWV0aG9kTmFtZVwiXX19XG4gICAgICAgIEBfYWN0aXZlVXBkYXRlTGlzdHMgPSB7fVxuXG4gICAgICAgICMgLi4uIGluaXRpYWxpemUgdGhlIGRhdGEgYW5kIHRoZSBwcm9wZXJ0aWVzXG4gICAgICAgIEBfc2V0dXBEYXRhRGljdCBcIl9cIiwgb3B0aW9ucy5kYXRhSW5pdFxuICAgICAgICBAX3NldHVwRGF0YVByb3BlcnRpZXNEaWN0IG9wdGlvbnMuZGF0YVByb3BlcnRpZXNcblxuICAgICAgICAjIFNjcmVlbiBzdGF0ZS1tYWNoaW5lIHRyYW5zaXRpb25zIGRlZmluZWRcbiAgICAgICAgQG9uIEV2ZW50cy5TdGF0ZVN3aXRjaEVuZCwgQF9zY3JlZW5UcmFuc2l0aW9uXG5cbiAgICAgICAgQF9sb2dfcGVyZm9ybWFuY2UgX2QsIF90LCBcIkFwcC5jb25zdHJ1Y3RvclwiXG5cblxuICAgICMgZW50cnlwb2ludCBtZXRob2RcbiAgICBkZWZpbmVDb21wb25lbnQ6IChjb21wb25lbnRTcGVjKSAtPlxuICAgICAgICBbX2QsIF90XSA9IEBfbG9nX3BlcmZvcm1hbmNlX3ByZXAodHJ1ZSlcblxuICAgICAgICBAX2Fzc2VydChcbiAgICAgICAgICAgIGNvbXBvbmVudFNwZWMubmFtZSBub3Qgb2YgQF9jb21wb25lbnRTcGVjc1xuICAgICAgICAgICAgXCJjb21wb25lbnQgXFxcIiN7Y29tcG9uZW50U3BlYy5uYW1lfVxcXCIgZGVmaW5lZCBtdWx0aXBsZSB0aW1lc1wiXG4gICAgICAgIClcblxuICAgICAgICBjb21wb25lbnROYW1lID0gY29tcG9uZW50U3BlYy5uYW1lXG4gICAgICAgIEBfY29tcG9uZW50U3BlY3NbY29tcG9uZW50TmFtZV0gPSBjb21wb25lbnRTcGVjXG5cbiAgICAgICAgIyAuLi4gaW5pdGlhbGl6ZSBkYXRhLCBkYXRhLWxpbmtzLCBkYXRhLXByb3BlcnRpZXNcbiAgICAgICAgQF9zZXR1cERhdGFEaWN0IGNvbXBvbmVudE5hbWUsIGNvbXBvbmVudFNwZWMuZGF0YUluaXRcbiAgICAgICAgQF9zZXR1cERhdGFMaW5rRGljdCBjb21wb25lbnROYW1lLCBjb21wb25lbnRTcGVjLmRhdGFMaW5rXG4gICAgICAgIEBfc2V0dXBEYXRhUHJvcGVydGllc0RpY3QgY29tcG9uZW50U3BlYy5kYXRhUHJvcGVydGllc1xuXG4gICAgICAgIEBfbG9nX3BlcmZvcm1hbmNlIF9kLCBfdCwgXCJBcHAuZGVmaW5lQ29tcG9uZW50KCN7Y29tcG9uZW50TmFtZX0pXCJcblxuXG4gICAgIyBlbnRyeXBvaW50IG1ldGhvZFxuICAgIGRlZmluZVNjcmVlbjogKHNjcmVlbk5hbWUsIGNvbXBvbmVudExpc3QpIC0+XG4gICAgICAgIFtfZCwgX3RdID0gQF9sb2dfcGVyZm9ybWFuY2VfcHJlcCh0cnVlKVxuXG4gICAgICAgIEBfYXNzZXJ0KFxuICAgICAgICAgICAgc2NyZWVuTmFtZSBub3Qgb2YgQHN0YXRlc1xuICAgICAgICAgICAgXCJzY3JlZW4gXFxcIiN7c2NyZWVuTmFtZX1cXFwiIGRlZmluZWQgbXVsdGlwbGUgdGltZXNcIlxuICAgICAgICApXG5cbiAgICAgICAgQF9zY3JlZW5TcGVjc1tzY3JlZW5OYW1lXSA9IGNvbXBvbmVudExpc3RcbiAgICAgICAgQHN0YXRlc1tzY3JlZW5OYW1lXSA9IHt9XG4gICAgICAgIEBfbG9nX3BlcmZvcm1hbmNlIF9kLCBfdCwgXCJBcHAuZGVmaW5lU2NyZWVuKCN7c2NyZWVuTmFtZX0pXCJcblxuXG4gICAgIyBlbnRyeXBvaW50IG1ldGhvZFxuICAgIF9zY3JlZW5UcmFuc2l0aW9uOiAob2xkU2NyZWVuLCBuZXdTY3JlZW4pIC0+XG4gICAgICAgIFtfZCwgX3RdID0gQF9sb2dfcGVyZm9ybWFuY2VfcHJlcCh0cnVlKVxuXG4gICAgICAgICMgTWFyayB3aGVuIHRoZSBmaXJzdCB0cmFuc2l0aW9uIGhhcyBoYXBwZW5lZFxuICAgICAgICBAc2NyZWVuX3N3aXRjaF9oYXBwZW5lZCA9IHRydWVcblxuICAgICAgICAjIElnbm9yZSB0aGUgdHJhbnNpdGlvbnMgdG8gdGhlIHNhbWUgc2NyZWVuXG4gICAgICAgIGlmIG9sZFNjcmVlbiA9PSBuZXdTY3JlZW5cbiAgICAgICAgICAgIHJldHVyblxuXG4gICAgICAgICMgUmVtb3ZlIHRoZSBjb21wb25lbnRzIGZyb20gdGhlIHByZXZpb3VzIHNjcmVlblxuICAgICAgICBmb3IgY29tcG9uZW50TmFtZSwgY29tcG9uZW50IG9mIEBfYWN0aXZlQ29tcG9uZW50c1xuICAgICAgICAgICAgY29tcG9uZW50LmRlc3Ryb3koKVxuXG4gICAgICAgICMgUmVzZXQgc2NyZWVuIGRlcGVuZGVudCBvYmplY3RzXG4gICAgICAgIEBfYWN0aXZlQ29tcG9uZW50cyA9IHt9XG4gICAgICAgIEBfYWN0aXZlVXBkYXRlTGlzdHMgPSB7fVxuXG4gICAgICAgICMgQ3JlYXRlIGN1cnJlbnRseSBhY3RpdmUgY29tcG9uZW50c1xuICAgICAgICBmb3IgY29tcG9uZW50TmFtZSBpbiBAX3NjcmVlblNwZWNzW25ld1NjcmVlbl1cblxuICAgICAgICAgICAgIyAuLi4gY3JlYXRlIGFjdGl2ZSBjb21wb25lbnRzIGZvciB0aGlzIHNjcmVlblxuICAgICAgICAgICAgY29tcG9uZW50U3BlYyA9IEBfY29tcG9uZW50U3BlY3NbY29tcG9uZW50TmFtZV1cbiAgICAgICAgICAgIGNvbXBvbmVudCA9IGNvbXBvbmVudFNwZWMuY29uc3RydWN0KClcbiAgICAgICAgICAgIGNvbXBvbmVudC5wYXJlbnQgPSBAXG4gICAgICAgICAgICBAX2FjdGl2ZUNvbXBvbmVudHNbY29tcG9uZW50TmFtZV0gPSBjb21wb25lbnRcblxuICAgICAgICAgICAgIyBXYXJuIGlmIGFueSBkYXRhTmFtZSBpcyBkZWZpbmVkIGluIGxvY2FsLWRhdGEgYW5kIGxpbmtlZC1kYXRhXG4gICAgICAgICAgICBmb3IgZGF0YU5hbWUgb2YgKGNvbXBvbmVudFNwZWM/LmRhdGFJbml0IG9yIHt9KVxuICAgICAgICAgICAgICAgIEBfYXNzZXJ0KFxuICAgICAgICAgICAgICAgICAgICBub3QgY29tcG9uZW50U3BlYy5kYXRhTGluaz9bZGF0YU5hbWVdP1xuICAgICAgICAgICAgICAgICAgICBcImxvY2FsLWRhdGEgXFxcIiN7ZGF0YU5hbWV9XFxcIiBwcmVzZW50IGluIGJvdGggbG9jYWwtZGF0YSBhbmQgbGlua2VkLWRhdGFcIlxuICAgICAgICAgICAgICAgIClcblxuICAgICAgICAgICAgIyAuLi4gY3JlYXRlIGFjdGl2ZSB1cGRhdGUgbGlzdHMgZm9yIHRoaXMgc2NyZWVuXG4gICAgICAgICAgICBmb3IgbWV0aG9kTmFtZSBpbiBPYmplY3Qua2V5cyhPYmplY3QuZ2V0UHJvdG90eXBlT2YoY29tcG9uZW50KSlcbiAgICAgICAgICAgICAgICBpZiBtZXRob2ROYW1lLnN0YXJ0c1dpdGgoQHdpcmVDb21wb25lbnRNZXRob2RQcmVmaXgpXG5cbiAgICAgICAgICAgICAgICAgICAgIyBVbndyYXAgdGhlIG1ldGhvZCBpZiBuZWNlc3NhcnlcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kID0gY29tcG9uZW50W21ldGhvZE5hbWVdXG4gICAgICAgICAgICAgICAgICAgIGlmIG5vdCBfLmlzRnVuY3Rpb24gbWV0aG9kXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2QgPSBtZXRob2RbJ2Z1bmMnXVxuXG4gICAgICAgICAgICAgICAgICAgIGZvciBtZXRob2RQYXJhbSBpbiBnZXRQYXJhbU5hbWVzKG1ldGhvZClcbiAgICAgICAgICAgICAgICAgICAgICAgIEBfYXNzZXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBfZGF0YVtjb21wb25lbnROYW1lXT9bbWV0aG9kUGFyYW1dP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicGFyYW1ldGVyIFxcXCIje21ldGhvZFBhcmFtfVxcXCIgcHJlc2VudCBpbiBcXFwiI3tjb21wb25lbnROYW1lfToje21ldGhvZE5hbWV9XFxcIiBidXQgbm90IGZvdW5kIGFzIGVpdGhlciBsb2NhbC1kYXRhIG9yIGxpbmtlZC1kYXRhXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIClcblxuICAgICAgICAgICAgICAgICAgICAgICAgIyAuLi4gcmVzb2x2ZSB3aGVyZSB0byBzdWJzY3JpYmUgdGhlIG1ldGhvZFxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Q29tcG9uZW50RGF0YU5hbWUgPSBcIiN7Y29tcG9uZW50TmFtZX0uI3ttZXRob2RQYXJhbX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgY29tcG9uZW50U3BlYy5kYXRhTGluaz9bbWV0aG9kUGFyYW1dP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldENvbXBvbmVudERhdGFOYW1lID0gY29tcG9uZW50U3BlYy5kYXRhTGlua1ttZXRob2RQYXJhbV1cbiAgICAgICAgICAgICAgICAgICAgICAgIFt0YXJnZXRDb21wb25lbnROYW1lLCB0YXJnZXREYXRhTmFtZV0gPSB0YXJnZXRDb21wb25lbnREYXRhTmFtZS5zcGxpdChcIi5cIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgQF9hY3RpdmVVcGRhdGVMaXN0c1t0YXJnZXRDb21wb25lbnROYW1lXSA/PSB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgQF9hY3RpdmVVcGRhdGVMaXN0c1t0YXJnZXRDb21wb25lbnROYW1lXVt0YXJnZXREYXRhTmFtZV0gPz0gW11cbiAgICAgICAgICAgICAgICAgICAgICAgIEBfYWN0aXZlVXBkYXRlTGlzdHNbdGFyZ2V0Q29tcG9uZW50TmFtZV1bdGFyZ2V0RGF0YU5hbWVdLnB1c2ggXCIje2NvbXBvbmVudE5hbWV9LiN7bWV0aG9kTmFtZX1cIlxuXG4gICAgICAgIEBfdXBkYXRlQ29tcG9uZW50c0ZvckFsbERhdGEoKVxuICAgICAgICBAX2xvZ19wZXJmb3JtYW5jZSBfZCwgX3QsIFwiQXBwLl9zY3JlZW5UcmFuc2l0aW9uKCN7b2xkU2NyZWVufSwgI3tuZXdTY3JlZW59KVwiXG5cbiAgICAjIGVudHJ5cG9pbnQgbWV0aG9kXG4gICAgX3VwZGF0ZURhdGE6IChjb21wb25lbnROYW1lLCBkYXRhTmFtZSwgbmV3VmFsdWUpIC0+XG4gICAgICAgIFtfZCwgX3RdID0gQF9sb2dfcGVyZm9ybWFuY2VfcHJlcCh0cnVlKVxuICAgICAgICBAX3VwZGF0ZURhdGFIaXN0b3J5KGNvbXBvbmVudE5hbWUsIGRhdGFOYW1lLCBuZXdWYWx1ZSlcbiAgICAgICAgQF91cGRhdGVDb21wb25lbnRzRm9yRGF0YShjb21wb25lbnROYW1lLCBkYXRhTmFtZSlcbiAgICAgICAgQF9sb2dfcGVyZm9ybWFuY2UgX2QsIF90LCBcIkFwcC5fdXBkYXRlRGF0YSgje2NvbXBvbmVudE5hbWV9OiN7ZGF0YU5hbWV9LCAje25ld1ZhbHVlfSlcIlxuXG4gICAgX2ludm9rZUNvbXBvbmVudE1ldGhvZDogKGNvbXBvbmVudE5hbWUsIG1ldGhvZE5hbWUsIGNvbXBvbmVudEp1c3RDcmVhdGVkID0gZmFsc2UpIC0+XG4gICAgICAgIFtfZCwgX3RdID0gQF9sb2dfcGVyZm9ybWFuY2VfcHJlcChmYWxzZSlcblxuICAgICAgICBjb21wb25lbnQgPSBAX2FjdGl2ZUNvbXBvbmVudHNbY29tcG9uZW50TmFtZV1cbiAgICAgICAgbWV0aG9kID0gY29tcG9uZW50W21ldGhvZE5hbWVdXG5cbiAgICAgICAgaWYgbm90IF8uaXNGdW5jdGlvbiBtZXRob2RcbiAgICAgICAgICAgICMgRG9uJ3QgaW52b2tlIG11bHRpcGxlIHRpbWVzIGlmIHJlcXVlc3RlZFxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIFwiaW52b2tlT25jZVwiIG9mIG1ldGhvZCBhbmRcbiAgICAgICAgICAgICAgICBub3QgY29tcG9uZW50SnVzdENyZWF0ZWRcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICByZXR1cm5cblxuICAgICAgICAgICAgIyBVbndyYXAgdGhlIG1ldGhvZFxuICAgICAgICAgICAgbWV0aG9kID0gbWV0aG9kW1wiZnVuY1wiXVxuXG4gICAgICAgIGZ1bmNBcmd1bWVudHMgPSBfLmF0IEBfZGF0YVtjb21wb25lbnROYW1lXSwgZ2V0UGFyYW1OYW1lcyhtZXRob2QpXG4gICAgICAgIG1ldGhvZC5hcHBseShjb21wb25lbnQsIGZ1bmNBcmd1bWVudHMpXG4gICAgICAgIEBfbG9nX3BlcmZvcm1hbmNlIF9kLCBfdCwgXCJBcHAuX2ludm9rZUNvbXBvbmVudE1ldGhvZCgje2NvbXBvbmVudE5hbWV9LCAje21ldGhvZE5hbWV9KVwiXG5cbiAgICBfdXBkYXRlQ29tcG9uZW50c0ZvckFsbERhdGE6IC0+XG4gICAgICAgIFtfZCwgX3RdID0gQF9sb2dfcGVyZm9ybWFuY2VfcHJlcChmYWxzZSlcbiAgICAgICAgIyBDYWxsIG1ldGhvZHMgb2YgYWxsIGFjdGl2ZSBjb21wb25lbnRzIG9ubHkgb25jZVxuICAgICAgICBmb3IgY29tcG9uZW50TmFtZSwgY29tcG9uZW50IG9mIChAX2FjdGl2ZUNvbXBvbmVudHMgb3Ige30pXG4gICAgICAgICAgICBmb3IgbWV0aG9kTmFtZSBpbiBPYmplY3Qua2V5cyhPYmplY3QuZ2V0UHJvdG90eXBlT2YoY29tcG9uZW50KSlcbiAgICAgICAgICAgICAgICBpZiBtZXRob2ROYW1lLnN0YXJ0c1dpdGgoQHdpcmVDb21wb25lbnRNZXRob2RQcmVmaXgpXG4gICAgICAgICAgICAgICAgICAgIEBfaW52b2tlQ29tcG9uZW50TWV0aG9kKGNvbXBvbmVudE5hbWUsIG1ldGhvZE5hbWUsIHRydWUpXG4gICAgICAgIEBfbG9nX3BlcmZvcm1hbmNlIF9kLCBfdCwgXCJBcHAuX3VwZGF0ZUNvbXBvbmVudHNGb3JBbGxEYXRhXCJcblxuICAgIF91cGRhdGVDb21wb25lbnRzRm9yRGF0YTogKGNvbXBvbmVudE5hbWUsIGRhdGFOYW1lKSAtPlxuICAgICAgICBbX2QsIF90XSA9IEBfbG9nX3BlcmZvcm1hbmNlX3ByZXAoZmFsc2UpXG4gICAgICAgIGZvciBjb21wb25lbnRNZXRob2ROYW1lIGluIChAX2FjdGl2ZVVwZGF0ZUxpc3RzP1tjb21wb25lbnROYW1lXT9bZGF0YU5hbWVdIG9yIFtdKVxuICAgICAgICAgICAgW2NvbXBOYW1lLCBtZXRob2ROYW1lXSA9IGNvbXBvbmVudE1ldGhvZE5hbWUuc3BsaXQoXCIuXCIpXG4gICAgICAgICAgICBAX2ludm9rZUNvbXBvbmVudE1ldGhvZChjb21wTmFtZSwgbWV0aG9kTmFtZSwgZmFsc2UpXG4gICAgICAgIEBfbG9nX3BlcmZvcm1hbmNlIF9kLCBfdCwgXCJBcHAuX3VwZGF0ZUNvbXBvbmVudHNGb3JEYXRhKCN7Y29tcG9uZW50TmFtZX06I3tkYXRhTmFtZX0pXCJcblxuICAgIF91cGRhdGVEYXRhSGlzdG9yeTogKGNvbXBvbmVudE5hbWUsIGRhdGFOYW1lLCBuZXdWYWx1ZSkgLT5cbiAgICAgICAgW19kLCBfdF0gPSBAX2xvZ19wZXJmb3JtYW5jZV9wcmVwKGZhbHNlKVxuICAgICAgICBAX2Fzc2VydChcbiAgICAgICAgICAgIEBfZGF0YVtjb21wb25lbnROYW1lXT9bZGF0YU5hbWVdP1xuICAgICAgICAgICAgXCJDUklUSUNBTCBJTlRFUk5BTCAtIGRhdGEgbm90IHJlZ2lzdGVyZWQgaW4gaGlzdG9yeSBiZWZvcmUgY2hhbmdpbmcsIGNvbnRhY3QgbWFpbnRhaW5lclwiXG4gICAgICAgIClcblxuICAgICAgICBfbGFzdEhpc3RvcnlFbnRyeSA9IEBfZGF0YUlzb2xhdGVkSGlzdG9yeVtAX2RhdGFJc29sYXRlZEhpc3RvcnkubGVuZ3RoIC0gMV1cbiAgICAgICAgX25ld0hpc3RvcnlFbnRyeSA9IF8uY2xvbmVEZWVwIF9sYXN0SGlzdG9yeUVudHJ5XG4gICAgICAgIF9uZXdIaXN0b3J5RW50cnlbY29tcG9uZW50TmFtZV1bZGF0YU5hbWVdID0gXy5jbG9uZURlZXAgbmV3VmFsdWVcbiAgICAgICAgQF9kYXRhSXNvbGF0ZWRIaXN0b3J5LnB1c2goX25ld0hpc3RvcnlFbnRyeSlcblxuICAgICAgICAjIFZlcmlmeSBjb25zaXRlbmN5IGluIGRhdGEtc3RvcmFnZVxuICAgICAgICBfbGFzdEZyb21IaXN0b3J5ID0gQF9kYXRhSXNvbGF0ZWRIaXN0b3J5W0BfZGF0YUlzb2xhdGVkSGlzdG9yeS5sZW5ndGggLSAxXVxuICAgICAgICBfbGFzdEZyb21EYXRhID0ge31cblxuICAgICAgICBmb3IgX2NvbXBvbmVudE5hbWUgaW4gT2JqZWN0LmtleXMoQF9kYXRhSXNvbGF0ZWQpXG4gICAgICAgICAgICBfbGFzdEZyb21EYXRhW19jb21wb25lbnROYW1lXSA/PSB7fVxuICAgICAgICAgICAgZm9yIF9kYXRhTmFtZSBpbiBPYmplY3Qua2V5cyhAX2RhdGFJc29sYXRlZFtfY29tcG9uZW50TmFtZV0pXG4gICAgICAgICAgICAgICAgX2xhc3RGcm9tRGF0YVtfY29tcG9uZW50TmFtZV1bX2RhdGFOYW1lXSA9IEBfZGF0YUlzb2xhdGVkW19jb21wb25lbnROYW1lXVtfZGF0YU5hbWVdLnZhbHVlXG4gICAgICAgIEBfYXNzZXJ0KFxuICAgICAgICAgICAgXy5pc0VxdWFsIF9sYXN0RnJvbUhpc3RvcnksIF9sYXN0RnJvbURhdGFcbiAgICAgICAgICAgIFwiQ1JJVElDQUwgSU5URVJOQUwgLSBpbmNvbnNpc3RlbmN5IGJldHdlZW4gaGlzdG9yeSBhbmQgY3VycmVudCBkYXRhLCBjb250YWN0IG1haW50YWluZXJcIlxuICAgICAgICApXG4gICAgICAgIEBfbG9nX3BlcmZvcm1hbmNlIF9kLCBfdCwgXCJBcHAuX3VwZGF0ZURhdGFIaXN0b3J5KCN7Y29tcG9uZW50TmFtZX06I3tkYXRhTmFtZX0sICN7bmV3VmFsdWV9KVwiXG5cblxuICAgIF9zZXR1cERhdGFEaWN0OiAoY29tcG9uZW50TmFtZSwgZGF0YURpY3QgPSB7fSkgLT5cbiAgICAgICAgW19kLCBfdF0gPSBAX2xvZ19wZXJmb3JtYW5jZV9wcmVwKGZhbHNlKVxuICAgICAgICBmb3IgZGF0YU5hbWUsIGRhdGFWYWx1ZSBvZiBkYXRhRGljdFxuICAgICAgICAgICAgQF9zZXR1cERhdGEgY29tcG9uZW50TmFtZSwgZGF0YU5hbWUsIGRhdGFWYWx1ZVxuICAgICAgICBAX2xvZ19wZXJmb3JtYW5jZSBfZCwgX3QsIFwiQXBwLl9zZXR1cERhdGFEaWN0KCN7Y29tcG9uZW50TmFtZX0sIDxkYXRhRGljdD4pXCJcblxuXG4gICAgX3NldHVwRGF0YTogKGNvbXBvbmVudE5hbWUsIGRhdGFOYW1lLCBkYXRhVmFsdWUpIC0+XG4gICAgICAgIFtfZCwgX3RdID0gQF9sb2dfcGVyZm9ybWFuY2VfcHJlcChmYWxzZSlcbiAgICAgICAgQF9hc3NlcnQoXG4gICAgICAgICAgICBub3QgQHNjcmVlbl9zd2l0Y2hfaGFwcGVuZWRcbiAgICAgICAgICAgIFwiZGF0YSBcXFwiI3tjb21wb25lbnROYW1lfToje2RhdGFOYW1lfVxcXCIgaW5pdGlhbGl6ZWQgdG8gXFxcIiN7ZGF0YVZhbHVlfVxcXCIgYWZ0ZXIgZmlyc3Qgc2NyZWVuLXN3aXRjaCBoYXBwZW5lZFwiXG4gICAgICAgIClcbiAgICAgICAgQF9hc3NlcnQoXG4gICAgICAgICAgICBub3QgQF9kYXRhW2NvbXBvbmVudE5hbWVdP1tkYXRhTmFtZV0/XG4gICAgICAgICAgICBcImRhdGEgXFxcIiN7Y29tcG9uZW50TmFtZX06I3tkYXRhTmFtZX1cXFwiIGluaXRpYWxpemVkIG11bHRpcGxlIHRpbWVzXCJcbiAgICAgICAgKVxuXG4gICAgICAgIEBfZGF0YUlzb2xhdGVkW2NvbXBvbmVudE5hbWVdID89IHt9XG4gICAgICAgIEBfZGF0YVtjb21wb25lbnROYW1lXSA/PSB7fVxuICAgICAgICAjIC4uLiBkb24ndCBjb3B5IGZ1bmN0aW9uc1xuICAgICAgICBkYXRhVmFsdWVDb3B5ID0gaWYgXy5pc0Z1bmN0aW9uIGRhdGFWYWx1ZSB0aGVuIGRhdGFWYWx1ZSBlbHNlIF8uY2xvbmVEZWVwIGRhdGFWYWx1ZVxuICAgICAgICBkYXRhQnVuZGxlID0gbmV3IERhdGFCdW5kbGUoY29tcG9uZW50TmFtZSwgZGF0YU5hbWUsIGRhdGFWYWx1ZUNvcHksIEApXG4gICAgICAgIEBfZGF0YUlzb2xhdGVkW2NvbXBvbmVudE5hbWVdW2RhdGFOYW1lXSA9IEBfZGF0YVtjb21wb25lbnROYW1lXVtkYXRhTmFtZV0gPSBkYXRhQnVuZGxlXG5cbiAgICAgICAgQF9kYXRhSXNvbGF0ZWRIaXN0b3J5WzBdW2NvbXBvbmVudE5hbWVdID89IHt9XG4gICAgICAgIGRhdGFWYWx1ZUNvcHkgPSBpZiBfLmlzRnVuY3Rpb24gZGF0YVZhbHVlIHRoZW4gZGF0YVZhbHVlIGVsc2UgXy5jbG9uZURlZXAgZGF0YVZhbHVlXG4gICAgICAgIEBfZGF0YUlzb2xhdGVkSGlzdG9yeVswXVtjb21wb25lbnROYW1lXVtkYXRhTmFtZV0gPSBkYXRhVmFsdWVDb3B5XG4gICAgICAgIEBfbG9nX3BlcmZvcm1hbmNlIF9kLCBfdCwgXCJBcHAuX3NldHVwRGF0YSgje2NvbXBvbmVudE5hbWV9OiN7ZGF0YU5hbWV9LCAje2RhdGFWYWx1ZX0pXCJcblxuXG4gICAgX3NldHVwRGF0YUxpbmtEaWN0OiAoY29tcG9uZW50TmFtZSwgZGF0YUxpbmtEaWN0ID0ge30pIC0+XG4gICAgICAgIFtfZCwgX3RdID0gQF9sb2dfcGVyZm9ybWFuY2VfcHJlcChmYWxzZSlcbiAgICAgICAgZm9yIGRhdGFMaW5rTmFtZSwgZGF0YUxpbmtWYWx1ZSBvZiBkYXRhTGlua0RpY3RcbiAgICAgICAgICAgIEBfc2V0dXBEYXRhTGluayBjb21wb25lbnROYW1lLCBkYXRhTGlua05hbWUsIGRhdGFMaW5rVmFsdWVcbiAgICAgICAgQF9sb2dfcGVyZm9ybWFuY2UgX2QsIF90LCBcIkFwcC5fc2V0dXBEYXRhTGlua0RpY3QoI3tjb21wb25lbnROYW1lfSwgPGRhdGFMaW5rcz4pXCJcblxuXG4gICAgX3NldHVwRGF0YUxpbms6IChjb21wb25lbnROYW1lLCBkYXRhTGlua05hbWUsIGRhdGFMaW5rVmFsdWUpIC0+XG4gICAgICAgIFtfZCwgX3RdID0gQF9sb2dfcGVyZm9ybWFuY2VfcHJlcChmYWxzZSlcbiAgICAgICAgQF9hc3NlcnQoXG4gICAgICAgICAgICBub3QgQHNjcmVlbl9zd2l0Y2hfaGFwcGVuZWRcbiAgICAgICAgICAgIFwiZGF0YS1saW5rIFxcXCIje2NvbXBvbmVudE5hbWV9OiN7ZGF0YUxpbmtOYW1lfVxcXCIgaW5pdGlhbGl6ZWQgdG8gXFxcIiN7ZGF0YUxpbmtWYWx1ZX1cXFwiIGFmdGVyIGZpcnN0IHNjcmVlbi1zd2l0Y2ggaGFwcGVuZWRcIlxuICAgICAgICApXG4gICAgICAgIEBfYXNzZXJ0KFxuICAgICAgICAgICAgbm90IEBfZGF0YVtjb21wb25lbnROYW1lXT9bZGF0YUxpbmtOYW1lXT9cbiAgICAgICAgICAgIFwiZGF0YS1saW5rIFxcXCIje2NvbXBvbmVudE5hbWV9OiN7ZGF0YUxpbmtOYW1lfVxcXCIgaW5pdGlhbGl6ZWQgbXVsdGlwbGUgdGltZXNcIlxuICAgICAgICApXG5cbiAgICAgICAgQF9kYXRhTGlua1tjb21wb25lbnROYW1lXSA/PSB7fVxuICAgICAgICBAX2RhdGFMaW5rW2NvbXBvbmVudE5hbWVdW2RhdGFMaW5rTmFtZV0gPSBkYXRhTGlua1ZhbHVlXG5cbiAgICAgICAgQF9kYXRhW2NvbXBvbmVudE5hbWVdID89IHt9XG4gICAgICAgIEBfZGF0YVtjb21wb25lbnROYW1lXVtkYXRhTGlua05hbWVdID0gXy5nZXQgQF9kYXRhSXNvbGF0ZWQsIGRhdGFMaW5rVmFsdWVcblxuICAgICAgICBAX2xvZ19wZXJmb3JtYW5jZSBfZCwgX3QsIFwiQXBwLl9zZXR1cERhdGFMaW5rKCN7Y29tcG9uZW50TmFtZX06I3tkYXRhTGlua05hbWV9LCAje2RhdGFMaW5rVmFsdWV9KVwiXG5cblxuICAgIF9zZXR1cERhdGFQcm9wZXJ0aWVzRGljdDogKGRhdGFQcm9wZXJ0aWVzRGljdCA9IHt9KSAtPlxuICAgICAgICBbX2QsIF90XSA9IEBfbG9nX3BlcmZvcm1hbmNlX3ByZXAoZmFsc2UpXG4gICAgICAgIGZvciBkYXRhUHJvcGVydHlOYW1lLCBkYXRhUHJvcGVydHlWYWx1ZSBvZiBkYXRhUHJvcGVydGllc0RpY3RcbiAgICAgICAgICAgIEBfc2V0dXBEYXRhUHJvcGVydHkgZGF0YVByb3BlcnR5TmFtZSwgZGF0YVByb3BlcnR5VmFsdWVcbiAgICAgICAgQF9sb2dfcGVyZm9ybWFuY2UgX2QsIF90LCBcIkFwcC5fc2V0dXBEYXRhUHJvcGVydGllc0RpY3QoPGRhdGFQcm9wZXJ0aWVzRGljdD4pXCJcblxuXG4gICAgX3NldHVwRGF0YVByb3BlcnR5OiAoZGF0YVByb3BlcnR5TmFtZSwgZGF0YVByb3BlcnR5VmFsdWUpIC0+XG4gICAgICAgIFtfZCwgX3RdID0gQF9sb2dfcGVyZm9ybWFuY2VfcHJlcChmYWxzZSlcbiAgICAgICAgQF9hc3NlcnQoXG4gICAgICAgICAgICBub3QgQHNjcmVlbl9zd2l0Y2hfaGFwcGVuZWRcbiAgICAgICAgICAgIFwiZGF0YS1wcm9wZXJ0eSBcXFwiI3tkYXRhUHJvcGVydHlOYW1lfVxcXCIgaW5pdGlhbGl6ZWQgYWZ0ZXIgZmlyc3Qgc2NyZWVuLXN3aXRjaCBoYXBwZW5lZFwiXG4gICAgICAgIClcbiAgICAgICAgQF9hc3NlcnQoXG4gICAgICAgICAgICBub3QgQF9kYXRhUHJvcGVydGllcy5oYXMoZGF0YVByb3BlcnR5TmFtZSlcbiAgICAgICAgICAgIFwiZGF0YS1wcm9wZXJ0eSBcXFwiI3tkYXRhUHJvcGVydHlOYW1lfVxcXCIgaW5pdGlhbGl6ZWQgbXVsdGlwbGUgdGltZXNcIlxuICAgICAgICApXG5cbiAgICAgICAgQF9kYXRhUHJvcGVydGllcy5hZGQoZGF0YVByb3BlcnR5TmFtZSlcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5IERhdGFCdW5kbGUucHJvdG90eXBlLCBkYXRhUHJvcGVydHlOYW1lLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgICAgICBnZXQ6IGRhdGFQcm9wZXJ0eVZhbHVlXG4gICAgICAgIEBfbG9nX3BlcmZvcm1hbmNlIF9kLCBfdCwgXCJBcHAuX3NldHVwRGF0YVByb3BlcnR5KCN7ZGF0YVByb3BlcnR5TmFtZX0sIDxkYXRhUHJvcGVydHlWYWx1ZT4pXCJcblxuXG4gICAgX2Vycm9yOiAobWVzc2FnZSkgLT5cbiAgICAgICAgaWYgQHNob3dFcnJvcnNcbiAgICAgICAgICAgIHRocm93IFwiQ2FzaW5nOiBFUlJPUiAje21lc3NhZ2V9XCJcblxuICAgIF9hc3NlcnQ6IChjb25kLCBtZXNzYWdlKSAtPlxuICAgICAgICBpZiBub3QgY29uZFxuICAgICAgICAgICAgQF9lcnJvciBtZXNzYWdlXG5cbiAgICBfd2FybjogKG1lc3NhZ2UpIC0+XG4gICAgICAgIGlmIEBzaG93RXJyb3JzIG9yIEBzaG93V2FybmluZ3NcbiAgICAgICAgICAgIHByaW50IFwiQ2FzaW5nOiBXQVJOICN7bWVzc2FnZX1cIlxuXG4gICAgX2Fzc2VydF93YXJuOiAoY29uZCwgbWVzc2FnZSkgLT5cbiAgICAgICAgaWYgbm90IGNvbmRcbiAgICAgICAgICAgIEBfd2FybiBtZXNzYWdlXG5cbiAgICBfbG9nX3BlcmZvcm1hbmNlX3ByZXA6IChpc0VudHJ5UG9pbnRNZXRob2QpIC0+XG4gICAgICAgIGlmIGlzRW50cnlQb2ludE1ldGhvZFxuICAgICAgICAgICAgQF9tZXRob2RDYWxsU3RhY2tEZXB0aCA9IDBcbiAgICAgICAgQF9tZXRob2RDYWxsU3RhY2tEZXB0aCArPSAxXG4gICAgICAgIHJldHVybiBbQF9tZXRob2RDYWxsU3RhY2tEZXB0aCwgcGVyZm9ybWFuY2Uubm93KCldXG5cbiAgICBfbG9nX3BlcmZvcm1hbmNlOiAoX21ldGhvZENhbGxTdGFja0RlcHRoLCBzdGFydFRpbWUsIG1lc3NhZ2UpIC0+XG4gICAgICAgIGlmIF9tZXRob2RDYWxsU3RhY2tEZXB0aCA9PSAxXG4gICAgICAgICAgICBncmFwaExpbmVzID0gJ+KUlCdcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgZ3JhcGhMaW5lcyA9IFwi4pScI3tfLnJlcGVhdCBcIuKUgFwiLCBfbWV0aG9kQ2FsbFN0YWNrRGVwdGggLSAxfVwiXG4gICAgICAgIGlmIEBzaG93UGVyZm9ybWFuY2VcbiAgICAgICAgICAgIHByaW50IFwiI3tfLnBhZFN0YXJ0IChwZXJmb3JtYW5jZS5ub3coKSAtIHN0YXJ0VGltZSkudG9GaXhlZCgyKSwgNywgJ18nfSBtcyAje2dyYXBoTGluZXN9ICN7bWVzc2FnZX1cIi5zbGljZSgwLCBAbG93UGVyZm9ybWFuY2VXaWR0aClcbiAgICAgICAgQF9tZXRob2RDYWxsU3RhY2tEZXB0aCAtPSAxXG5cbmV4cG9ydHMuQXBwLnByb3RvdHlwZS5zd2l0Y2hTY3JlZW4gPSBleHBvcnRzLkFwcC5wcm90b3R5cGUuc3RhdGVTd2l0Y2hcbiIsIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBRUFBO0FEUUEsSUFBQSx5REFBQTtFQUFBOzs7QUFBQSxPQUFPLENBQUMsbUJBQVIsR0FBOEIsU0FBQyxLQUFEO1NBQVksQ0FBQyxDQUFDLElBQUYsQ0FBTyxLQUFLLENBQUMsV0FBYixFQUEwQixDQUFDLEdBQUQsRUFBTSxHQUFOLENBQTFCO0FBQVo7O0FBRTlCLE9BQU8sQ0FBQyxpQkFBUixHQUE0QixTQUFDLFVBQUQsRUFBYSxVQUFiO0VBQ3hCLFVBQVUsQ0FBQyxNQUFYLEdBQW9CLFVBQVUsQ0FBQztTQUMvQixDQUFDLENBQUMsTUFBRixDQUFTLFVBQVQsRUFBcUIsVUFBVSxDQUFDLEtBQWhDO0FBRndCOztBQUk1QixPQUFPLENBQUMsWUFBUixHQUF1QixTQUFDLFVBQUQsRUFBYSxhQUFiLEVBQTRCLEtBQTVCO0FBQ25CLE1BQUE7RUFBQSxtQkFBQSxHQUFzQixDQUFDLENBQUMsU0FBRixDQUFZLE9BQU8sQ0FBQyxtQkFBUixDQUE0QixhQUE1QixDQUFaO0FBQ3RCLE9BQUEsaUJBQUE7O0lBQ0ksQ0FBQyxDQUFDLE1BQUYsQ0FBUyxJQUFULEVBQWdCLENBQUMsQ0FBQyxTQUFGLENBQVksT0FBTyxDQUFDLG1CQUFSLENBQTRCLElBQTVCLENBQVosRUFBK0MsbUJBQS9DLEVBQW9FLENBQUMsQ0FBQyxRQUF0RSxDQUFoQjtBQURKO0FBRUE7T0FBQSxpQkFBQTs7aUJBQUEsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxJQUFULEVBQWU7TUFBQyxNQUFBLEVBQVEsVUFBVDtLQUFmO0FBQUE7O0FBSm1COztBQU12QixPQUFPLENBQUMsVUFBUixHQUFxQixTQUFDLElBQUQ7QUFDakIsU0FBTztJQUNILFlBQUEsRUFBYyxJQURYO0lBRUgsTUFBQSxFQUFRLElBRkw7O0FBRFU7O0FBTXJCLE9BQU8sQ0FBQyxlQUFSLEdBQTBCLFNBQUMsVUFBRDtTQUN0QixTQUFBO0FBQ0ksUUFBQTtJQUFBLE1BQUEsR0FBUyxPQUFBLENBQVEsVUFBUjtXQUNULElBQUksTUFBTyxDQUFBLFVBQUE7RUFGZjtBQURzQjs7QUFPcEI7RUFDVyxvQkFBQyxlQUFELEVBQWtCLFVBQWxCLEVBQThCLFVBQTlCLEVBQTJDLElBQTNDO0lBQUMsSUFBQyxDQUFBLGlCQUFEO0lBQWlCLElBQUMsQ0FBQSxZQUFEO0lBQVksSUFBQyxDQUFBLGFBQUQ7SUFBYSxJQUFDLENBQUEsT0FBRDtFQUEzQzs7Ozs7O0FBRWpCLE1BQU0sQ0FBQyxjQUFQLENBQXNCLFVBQVUsQ0FBQyxTQUFqQyxFQUE0QyxPQUE1QyxFQUNJO0VBQUEsWUFBQSxFQUFjLElBQWQ7RUFFQSxHQUFBLEVBQUssU0FBQTtXQUFPLElBQUMsQ0FBQTtFQUFSLENBRkw7RUFHQSxHQUFBLEVBQUssU0FBQyxRQUFEO0lBR0QsSUFBRyxJQUFDLENBQUEsVUFBRCxLQUFlLFFBQWxCO01BRUksSUFBQyxDQUFBLFVBQUQsR0FBYzthQUNkLElBQUMsQ0FBQSxJQUFJLENBQUMsV0FBTixDQUFrQixJQUFDLENBQUEsY0FBbkIsRUFBbUMsSUFBQyxDQUFBLFNBQXBDLEVBQStDLFFBQS9DLEVBSEo7O0VBSEMsQ0FITDtDQURKOztBQVlBLE1BQU0sQ0FBQyxjQUFQLENBQXNCLFVBQVUsQ0FBQyxTQUFqQyxFQUE0QyxPQUE1QyxFQUNJO0VBQUEsWUFBQSxFQUFjLElBQWQ7RUFDQSxHQUFBLEVBQUssU0FBQTtXQUFPLElBQUMsQ0FBQSxJQUFJLENBQUM7RUFBYixDQURMO0NBREo7O0FBSUEsTUFBTSxDQUFDLGNBQVAsQ0FBc0IsVUFBVSxDQUFDLFNBQWpDLEVBQTRDLFVBQTVDLEVBQ0k7RUFBQSxZQUFBLEVBQWMsSUFBZDtFQUNBLEdBQUEsRUFBSyxTQUFBO1dBQU8sQ0FBQyxDQUFDLEdBQUYsQ0FBTSxJQUFDLENBQUEsSUFBSSxDQUFDLG9CQUFaLEVBQXFDLElBQUMsQ0FBQSxjQUFGLEdBQWlCLEdBQWpCLEdBQW9CLElBQUMsQ0FBQSxTQUF6RDtFQUFQLENBREw7Q0FESjs7QUFJQSxNQUFNLENBQUMsY0FBUCxDQUFzQixVQUFVLENBQUMsU0FBakMsRUFBNEMsaUJBQTVDLEVBQ0k7RUFBQSxZQUFBLEVBQWMsSUFBZDtFQUNBLEdBQUEsRUFBSyxTQUFBO0FBQ0QsUUFBQTtJQUFBLGdCQUFBLEdBQW1CLFNBQUMsR0FBRCxFQUFNLFNBQU47TUFDZixJQUFHLEdBQUEsS0FBTyxFQUFQLElBQWEsQ0FBQyxDQUFJLENBQUMsQ0FBQyxPQUFGLENBQVUsR0FBSSxDQUFBLEdBQUcsQ0FBQyxNQUFKLEdBQWEsQ0FBYixDQUFkLEVBQStCLFNBQS9CLENBQUwsQ0FBaEI7UUFDSSxHQUFHLENBQUMsSUFBSixDQUFTLFNBQVQsRUFESjs7QUFFQSxhQUFPO0lBSFE7QUFLbkIsV0FBTyxDQUFDLENBQUMsTUFBRixDQUFTLElBQUMsQ0FBQSxRQUFWLEVBQW9CLGdCQUFwQixFQUFzQyxFQUF0QztFQU5OLENBREw7Q0FESjs7QUFhQSxjQUFBLEdBQWlCOztBQUNqQixjQUFBLEdBQWlCOztBQUNqQixhQUFBLEdBQWdCLFNBQUMsSUFBRDtBQUNaLE1BQUE7RUFBQSxLQUFBLEdBQVEsSUFBSSxDQUFDLFFBQUwsQ0FBQSxDQUFlLENBQUMsT0FBaEIsQ0FBd0IsY0FBeEIsRUFBd0MsRUFBeEM7RUFDUixNQUFBLEdBQVMsS0FBSyxDQUFDLEtBQU4sQ0FBWSxLQUFLLENBQUMsT0FBTixDQUFjLEdBQWQsQ0FBQSxHQUFtQixDQUEvQixFQUFrQyxLQUFLLENBQUMsT0FBTixDQUFjLEdBQWQsQ0FBbEMsQ0FBcUQsQ0FBQyxLQUF0RCxDQUE0RCxjQUE1RDtFQUNULElBQUcsTUFBQSxLQUFVLElBQWI7SUFDSSxNQUFBLEdBQVMsR0FEYjs7QUFFQSxTQUFPO0FBTEs7O0FBVVYsT0FBTyxDQUFDOzs7RUFDRyxhQUFDLE9BQUQ7QUFDVCxRQUFBO0lBQUEsTUFBVyxJQUFDLENBQUEscUJBQUQsQ0FBdUIsSUFBdkIsQ0FBWCxFQUFDLFdBQUQsRUFBSztJQUVMLENBQUMsQ0FBQyxRQUFGLENBQVcsT0FBWCxFQUNJO01BQUEsZUFBQSxFQUFpQixTQUFqQjtNQUNBLEtBQUEsRUFBTyxNQUFNLENBQUMsS0FEZDtNQUdBLHlCQUFBLEVBQTJCLFNBSDNCO01BS0EsVUFBQSxFQUFZLElBTFo7TUFNQSxZQUFBLEVBQWMsSUFOZDtNQU9BLGVBQUEsRUFBaUIsS0FQakI7TUFRQSxtQkFBQSxFQUFxQixHQVJyQjtNQVVBLFFBQUEsRUFBVSxFQVZWO01BV0EsY0FBQSxFQUFnQixFQVhoQjtLQURKO0lBYUEscUNBQU0sT0FBTjtJQUVBLENBQUMsQ0FBQyxNQUFGLENBQVMsSUFBVCxFQUFZLENBQUMsQ0FBQyxJQUFGLENBQU8sT0FBUCxFQUFnQixDQUN4QiwyQkFEd0IsRUFFeEIsWUFGd0IsRUFHeEIsY0FId0IsRUFJeEIsaUJBSndCLEVBS3hCLHFCQUx3QixDQUFoQixDQUFaO0lBUUEsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxJQUFULEVBQ0k7TUFBQSxzQkFBQSxFQUF3QixLQUF4QjtLQURKO0lBS0EsSUFBQyxDQUFBLGFBQUQsR0FBaUI7SUFHakIsSUFBQyxDQUFBLElBQUQsR0FBUSxJQUFDLENBQUEsS0FBRCxHQUFTO0lBSWpCLElBQUMsQ0FBQSxXQUFELEdBQWUsSUFBQyxDQUFBLG9CQUFELEdBQXdCLENBQUMsRUFBRDtJQUV2QyxJQUFDLENBQUEsU0FBRCxHQUFhO0lBRWIsSUFBQyxDQUFBLGVBQUQsR0FBdUIsSUFBQSxHQUFBLENBQUE7SUFHdkIsSUFBQyxDQUFBLGVBQUQsR0FBbUI7SUFFbkIsSUFBQyxDQUFBLFlBQUQsR0FBZ0I7SUFJaEIsSUFBQyxDQUFBLGlCQUFELEdBQXFCO0lBRXJCLElBQUMsQ0FBQSxrQkFBRCxHQUFzQjtJQUd0QixJQUFDLENBQUEsY0FBRCxDQUFnQixHQUFoQixFQUFxQixPQUFPLENBQUMsUUFBN0I7SUFDQSxJQUFDLENBQUEsd0JBQUQsQ0FBMEIsT0FBTyxDQUFDLGNBQWxDO0lBR0EsSUFBQyxDQUFBLEVBQUQsQ0FBSSxNQUFNLENBQUMsY0FBWCxFQUEyQixJQUFDLENBQUEsaUJBQTVCO0lBRUEsSUFBQyxDQUFBLGdCQUFELENBQWtCLEVBQWxCLEVBQXNCLEVBQXRCLEVBQTBCLGlCQUExQjtFQTlEUzs7Z0JBa0ViLGVBQUEsR0FBaUIsU0FBQyxhQUFEO0FBQ2IsUUFBQTtJQUFBLE1BQVcsSUFBQyxDQUFBLHFCQUFELENBQXVCLElBQXZCLENBQVgsRUFBQyxXQUFELEVBQUs7SUFFTCxJQUFDLENBQUEsT0FBRCxDQUNJLENBQUEsQ0FBQSxhQUFhLENBQUMsSUFBZCxJQUEwQixJQUFDLENBQUEsZUFBM0IsQ0FESixFQUVJLGNBQUEsR0FBZSxhQUFhLENBQUMsSUFBN0IsR0FBa0MsMkJBRnRDO0lBS0EsYUFBQSxHQUFnQixhQUFhLENBQUM7SUFDOUIsSUFBQyxDQUFBLGVBQWdCLENBQUEsYUFBQSxDQUFqQixHQUFrQztJQUdsQyxJQUFDLENBQUEsY0FBRCxDQUFnQixhQUFoQixFQUErQixhQUFhLENBQUMsUUFBN0M7SUFDQSxJQUFDLENBQUEsa0JBQUQsQ0FBb0IsYUFBcEIsRUFBbUMsYUFBYSxDQUFDLFFBQWpEO0lBQ0EsSUFBQyxDQUFBLHdCQUFELENBQTBCLGFBQWEsQ0FBQyxjQUF4QztXQUVBLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixFQUFsQixFQUFzQixFQUF0QixFQUEwQixzQkFBQSxHQUF1QixhQUF2QixHQUFxQyxHQUEvRDtFQWhCYTs7Z0JBb0JqQixZQUFBLEdBQWMsU0FBQyxVQUFELEVBQWEsYUFBYjtBQUNWLFFBQUE7SUFBQSxNQUFXLElBQUMsQ0FBQSxxQkFBRCxDQUF1QixJQUF2QixDQUFYLEVBQUMsV0FBRCxFQUFLO0lBRUwsSUFBQyxDQUFBLE9BQUQsQ0FDSSxDQUFBLENBQUEsVUFBQSxJQUFrQixJQUFDLENBQUEsTUFBbkIsQ0FESixFQUVJLFdBQUEsR0FBWSxVQUFaLEdBQXVCLDJCQUYzQjtJQUtBLElBQUMsQ0FBQSxZQUFhLENBQUEsVUFBQSxDQUFkLEdBQTRCO0lBQzVCLElBQUMsQ0FBQSxNQUFPLENBQUEsVUFBQSxDQUFSLEdBQXNCO1dBQ3RCLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixFQUFsQixFQUFzQixFQUF0QixFQUEwQixtQkFBQSxHQUFvQixVQUFwQixHQUErQixHQUF6RDtFQVZVOztnQkFjZCxpQkFBQSxHQUFtQixTQUFDLFNBQUQsRUFBWSxTQUFaO0FBQ2YsUUFBQTtJQUFBLE1BQVcsSUFBQyxDQUFBLHFCQUFELENBQXVCLElBQXZCLENBQVgsRUFBQyxXQUFELEVBQUs7SUFHTCxJQUFDLENBQUEsc0JBQUQsR0FBMEI7SUFHMUIsSUFBRyxTQUFBLEtBQWEsU0FBaEI7QUFDSSxhQURKOztBQUlBO0FBQUEsU0FBQSxxQkFBQTs7TUFDSSxTQUFTLENBQUMsT0FBVixDQUFBO0FBREo7SUFJQSxJQUFDLENBQUEsaUJBQUQsR0FBcUI7SUFDckIsSUFBQyxDQUFBLGtCQUFELEdBQXNCO0FBR3RCO0FBQUEsU0FBQSxzQ0FBQTs7TUFHSSxhQUFBLEdBQWdCLElBQUMsQ0FBQSxlQUFnQixDQUFBLGFBQUE7TUFDakMsU0FBQSxHQUFZLGFBQWEsQ0FBQyxTQUFkLENBQUE7TUFDWixTQUFTLENBQUMsTUFBVixHQUFtQjtNQUNuQixJQUFDLENBQUEsaUJBQWtCLENBQUEsYUFBQSxDQUFuQixHQUFvQztBQUdwQyxXQUFBLDJFQUFBO1FBQ0ksSUFBQyxDQUFBLE9BQUQsQ0FDUSwyRUFEUixFQUVJLGVBQUEsR0FBZ0IsUUFBaEIsR0FBeUIsK0NBRjdCO0FBREo7QUFPQTtBQUFBLFdBQUEsd0NBQUE7O1FBQ0ksSUFBRyxVQUFVLENBQUMsVUFBWCxDQUFzQixJQUFDLENBQUEseUJBQXZCLENBQUg7VUFHSSxNQUFBLEdBQVMsU0FBVSxDQUFBLFVBQUE7VUFDbkIsSUFBRyxDQUFJLENBQUMsQ0FBQyxVQUFGLENBQWEsTUFBYixDQUFQO1lBQ0ksTUFBQSxHQUFTLE1BQU8sQ0FBQSxNQUFBLEVBRHBCOztBQUdBO0FBQUEsZUFBQSx3Q0FBQTs7WUFDSSxJQUFDLENBQUEsT0FBRCxDQUNJLGlGQURKLEVBRUksY0FBQSxHQUFlLFdBQWYsR0FBMkIsa0JBQTNCLEdBQTZDLGFBQTdDLEdBQTJELEdBQTNELEdBQThELFVBQTlELEdBQXlFLHNEQUY3RTtZQU1BLHVCQUFBLEdBQTZCLGFBQUQsR0FBZSxHQUFmLEdBQWtCO1lBQzlDLElBQUcsOEVBQUg7Y0FDSSx1QkFBQSxHQUEwQixhQUFhLENBQUMsUUFBUyxDQUFBLFdBQUEsRUFEckQ7O1lBRUEsT0FBd0MsdUJBQXVCLENBQUMsS0FBeEIsQ0FBOEIsR0FBOUIsQ0FBeEMsRUFBQyw2QkFBRCxFQUFzQjs7a0JBRUYsQ0FBQSxtQkFBQSxJQUF3Qjs7O21CQUNILENBQUEsY0FBQSxJQUFtQjs7WUFDNUQsSUFBQyxDQUFBLGtCQUFtQixDQUFBLG1CQUFBLENBQXFCLENBQUEsY0FBQSxDQUFlLENBQUMsSUFBekQsQ0FBaUUsYUFBRCxHQUFlLEdBQWYsR0FBa0IsVUFBbEY7QUFkSixXQVBKOztBQURKO0FBaEJKO0lBd0NBLElBQUMsQ0FBQSwyQkFBRCxDQUFBO1dBQ0EsSUFBQyxDQUFBLGdCQUFELENBQWtCLEVBQWxCLEVBQXNCLEVBQXRCLEVBQTBCLHdCQUFBLEdBQXlCLFNBQXpCLEdBQW1DLElBQW5DLEdBQXVDLFNBQXZDLEdBQWlELEdBQTNFO0VBNURlOztnQkErRG5CLFdBQUEsR0FBYSxTQUFDLGFBQUQsRUFBZ0IsUUFBaEIsRUFBMEIsUUFBMUI7QUFDVCxRQUFBO0lBQUEsTUFBVyxJQUFDLENBQUEscUJBQUQsQ0FBdUIsSUFBdkIsQ0FBWCxFQUFDLFdBQUQsRUFBSztJQUNMLElBQUMsQ0FBQSxrQkFBRCxDQUFvQixhQUFwQixFQUFtQyxRQUFuQyxFQUE2QyxRQUE3QztJQUNBLElBQUMsQ0FBQSx3QkFBRCxDQUEwQixhQUExQixFQUF5QyxRQUF6QztXQUNBLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixFQUFsQixFQUFzQixFQUF0QixFQUEwQixrQkFBQSxHQUFtQixhQUFuQixHQUFpQyxHQUFqQyxHQUFvQyxRQUFwQyxHQUE2QyxJQUE3QyxHQUFpRCxRQUFqRCxHQUEwRCxHQUFwRjtFQUpTOztnQkFNYixzQkFBQSxHQUF3QixTQUFDLGFBQUQsRUFBZ0IsVUFBaEIsRUFBNEIsb0JBQTVCO0FBQ3BCLFFBQUE7O01BRGdELHVCQUF1Qjs7SUFDdkUsTUFBVyxJQUFDLENBQUEscUJBQUQsQ0FBdUIsS0FBdkIsQ0FBWCxFQUFDLFdBQUQsRUFBSztJQUVMLFNBQUEsR0FBWSxJQUFDLENBQUEsaUJBQWtCLENBQUEsYUFBQTtJQUMvQixNQUFBLEdBQVMsU0FBVSxDQUFBLFVBQUE7SUFFbkIsSUFBRyxDQUFJLENBQUMsQ0FBQyxVQUFGLENBQWEsTUFBYixDQUFQO01BRUksSUFDSSxZQUFBLElBQWdCLE1BQWhCLElBQ0EsQ0FBSSxvQkFGUjtBQUlJLGVBSko7O01BT0EsTUFBQSxHQUFTLE1BQU8sQ0FBQSxNQUFBLEVBVHBCOztJQVdBLGFBQUEsR0FBZ0IsQ0FBQyxDQUFDLEVBQUYsQ0FBSyxJQUFDLENBQUEsS0FBTSxDQUFBLGFBQUEsQ0FBWixFQUE0QixhQUFBLENBQWMsTUFBZCxDQUE1QjtJQUNoQixNQUFNLENBQUMsS0FBUCxDQUFhLFNBQWIsRUFBd0IsYUFBeEI7V0FDQSxJQUFDLENBQUEsZ0JBQUQsQ0FBa0IsRUFBbEIsRUFBc0IsRUFBdEIsRUFBMEIsNkJBQUEsR0FBOEIsYUFBOUIsR0FBNEMsSUFBNUMsR0FBZ0QsVUFBaEQsR0FBMkQsR0FBckY7RUFuQm9COztnQkFxQnhCLDJCQUFBLEdBQTZCLFNBQUE7QUFDekIsUUFBQTtJQUFBLE1BQVcsSUFBQyxDQUFBLHFCQUFELENBQXVCLEtBQXZCLENBQVgsRUFBQyxXQUFELEVBQUs7QUFFTDtBQUFBLFNBQUEscUJBQUE7O0FBQ0k7QUFBQSxXQUFBLHNDQUFBOztRQUNJLElBQUcsVUFBVSxDQUFDLFVBQVgsQ0FBc0IsSUFBQyxDQUFBLHlCQUF2QixDQUFIO1VBQ0ksSUFBQyxDQUFBLHNCQUFELENBQXdCLGFBQXhCLEVBQXVDLFVBQXZDLEVBQW1ELElBQW5ELEVBREo7O0FBREo7QUFESjtXQUlBLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixFQUFsQixFQUFzQixFQUF0QixFQUEwQixpQ0FBMUI7RUFQeUI7O2dCQVM3Qix3QkFBQSxHQUEwQixTQUFDLGFBQUQsRUFBZ0IsUUFBaEI7QUFDdEIsUUFBQTtJQUFBLE1BQVcsSUFBQyxDQUFBLHFCQUFELENBQXVCLEtBQXZCLENBQVgsRUFBQyxXQUFELEVBQUs7QUFDTDtBQUFBLFNBQUEsc0NBQUE7O01BQ0ksT0FBeUIsbUJBQW1CLENBQUMsS0FBcEIsQ0FBMEIsR0FBMUIsQ0FBekIsRUFBQyxrQkFBRCxFQUFXO01BQ1gsSUFBQyxDQUFBLHNCQUFELENBQXdCLFFBQXhCLEVBQWtDLFVBQWxDLEVBQThDLEtBQTlDO0FBRko7V0FHQSxJQUFDLENBQUEsZ0JBQUQsQ0FBa0IsRUFBbEIsRUFBc0IsRUFBdEIsRUFBMEIsK0JBQUEsR0FBZ0MsYUFBaEMsR0FBOEMsR0FBOUMsR0FBaUQsUUFBakQsR0FBMEQsR0FBcEY7RUFMc0I7O2dCQU8xQixrQkFBQSxHQUFvQixTQUFDLGFBQUQsRUFBZ0IsUUFBaEIsRUFBMEIsUUFBMUI7QUFDaEIsUUFBQTtJQUFBLE1BQVcsSUFBQyxDQUFBLHFCQUFELENBQXVCLEtBQXZCLENBQVgsRUFBQyxXQUFELEVBQUs7SUFDTCxJQUFDLENBQUEsT0FBRCxDQUNJLDhFQURKLEVBRUksd0ZBRko7SUFLQSxpQkFBQSxHQUFvQixJQUFDLENBQUEsb0JBQXFCLENBQUEsSUFBQyxDQUFBLG9CQUFvQixDQUFDLE1BQXRCLEdBQStCLENBQS9CO0lBQzFDLGdCQUFBLEdBQW1CLENBQUMsQ0FBQyxTQUFGLENBQVksaUJBQVo7SUFDbkIsZ0JBQWlCLENBQUEsYUFBQSxDQUFlLENBQUEsUUFBQSxDQUFoQyxHQUE0QyxDQUFDLENBQUMsU0FBRixDQUFZLFFBQVo7SUFDNUMsSUFBQyxDQUFBLG9CQUFvQixDQUFDLElBQXRCLENBQTJCLGdCQUEzQjtJQUdBLGdCQUFBLEdBQW1CLElBQUMsQ0FBQSxvQkFBcUIsQ0FBQSxJQUFDLENBQUEsb0JBQW9CLENBQUMsTUFBdEIsR0FBK0IsQ0FBL0I7SUFDekMsYUFBQSxHQUFnQjtBQUVoQjtBQUFBLFNBQUEsc0NBQUE7OztRQUNJLGFBQWMsQ0FBQSxjQUFBLElBQW1COztBQUNqQztBQUFBLFdBQUEsd0NBQUE7O1FBQ0ksYUFBYyxDQUFBLGNBQUEsQ0FBZ0IsQ0FBQSxTQUFBLENBQTlCLEdBQTJDLElBQUMsQ0FBQSxhQUFjLENBQUEsY0FBQSxDQUFnQixDQUFBLFNBQUEsQ0FBVSxDQUFDO0FBRHpGO0FBRko7SUFJQSxJQUFDLENBQUEsT0FBRCxDQUNJLENBQUMsQ0FBQyxPQUFGLENBQVUsZ0JBQVYsRUFBNEIsYUFBNUIsQ0FESixFQUVJLHdGQUZKO1dBSUEsSUFBQyxDQUFBLGdCQUFELENBQWtCLEVBQWxCLEVBQXNCLEVBQXRCLEVBQTBCLHlCQUFBLEdBQTBCLGFBQTFCLEdBQXdDLEdBQXhDLEdBQTJDLFFBQTNDLEdBQW9ELElBQXBELEdBQXdELFFBQXhELEdBQWlFLEdBQTNGO0VBeEJnQjs7Z0JBMkJwQixjQUFBLEdBQWdCLFNBQUMsYUFBRCxFQUFnQixRQUFoQjtBQUNaLFFBQUE7O01BRDRCLFdBQVc7O0lBQ3ZDLE1BQVcsSUFBQyxDQUFBLHFCQUFELENBQXVCLEtBQXZCLENBQVgsRUFBQyxXQUFELEVBQUs7QUFDTCxTQUFBLG9CQUFBOztNQUNJLElBQUMsQ0FBQSxVQUFELENBQVksYUFBWixFQUEyQixRQUEzQixFQUFxQyxTQUFyQztBQURKO1dBRUEsSUFBQyxDQUFBLGdCQUFELENBQWtCLEVBQWxCLEVBQXNCLEVBQXRCLEVBQTBCLHFCQUFBLEdBQXNCLGFBQXRCLEdBQW9DLGVBQTlEO0VBSlk7O2dCQU9oQixVQUFBLEdBQVksU0FBQyxhQUFELEVBQWdCLFFBQWhCLEVBQTBCLFNBQTFCO0FBQ1IsUUFBQTtJQUFBLE1BQVcsSUFBQyxDQUFBLHFCQUFELENBQXVCLEtBQXZCLENBQVgsRUFBQyxXQUFELEVBQUs7SUFDTCxJQUFDLENBQUEsT0FBRCxDQUNJLENBQUksSUFBQyxDQUFBLHNCQURULEVBRUksU0FBQSxHQUFVLGFBQVYsR0FBd0IsR0FBeEIsR0FBMkIsUUFBM0IsR0FBb0Msc0JBQXBDLEdBQTBELFNBQTFELEdBQW9FLHVDQUZ4RTtJQUlBLElBQUMsQ0FBQSxPQUFELENBQ1EsOEVBRFIsRUFFSSxTQUFBLEdBQVUsYUFBVixHQUF3QixHQUF4QixHQUEyQixRQUEzQixHQUFvQywrQkFGeEM7O1VBS2UsQ0FBQSxhQUFBLElBQWtCOzs7V0FDMUIsQ0FBQSxhQUFBLElBQWtCOztJQUV6QixhQUFBLEdBQW1CLENBQUMsQ0FBQyxVQUFGLENBQWEsU0FBYixDQUFILEdBQStCLFNBQS9CLEdBQThDLENBQUMsQ0FBQyxTQUFGLENBQVksU0FBWjtJQUM5RCxVQUFBLEdBQWlCLElBQUEsVUFBQSxDQUFXLGFBQVgsRUFBMEIsUUFBMUIsRUFBb0MsYUFBcEMsRUFBbUQsSUFBbkQ7SUFDakIsSUFBQyxDQUFBLGFBQWMsQ0FBQSxhQUFBLENBQWUsQ0FBQSxRQUFBLENBQTlCLEdBQTBDLElBQUMsQ0FBQSxLQUFNLENBQUEsYUFBQSxDQUFlLENBQUEsUUFBQSxDQUF0QixHQUFrQzs7V0FFbkQsQ0FBQSxhQUFBLElBQWtCOztJQUMzQyxhQUFBLEdBQW1CLENBQUMsQ0FBQyxVQUFGLENBQWEsU0FBYixDQUFILEdBQStCLFNBQS9CLEdBQThDLENBQUMsQ0FBQyxTQUFGLENBQVksU0FBWjtJQUM5RCxJQUFDLENBQUEsb0JBQXFCLENBQUEsQ0FBQSxDQUFHLENBQUEsYUFBQSxDQUFlLENBQUEsUUFBQSxDQUF4QyxHQUFvRDtXQUNwRCxJQUFDLENBQUEsZ0JBQUQsQ0FBa0IsRUFBbEIsRUFBc0IsRUFBdEIsRUFBMEIsaUJBQUEsR0FBa0IsYUFBbEIsR0FBZ0MsR0FBaEMsR0FBbUMsUUFBbkMsR0FBNEMsSUFBNUMsR0FBZ0QsU0FBaEQsR0FBMEQsR0FBcEY7RUFyQlE7O2dCQXdCWixrQkFBQSxHQUFvQixTQUFDLGFBQUQsRUFBZ0IsWUFBaEI7QUFDaEIsUUFBQTs7TUFEZ0MsZUFBZTs7SUFDL0MsTUFBVyxJQUFDLENBQUEscUJBQUQsQ0FBdUIsS0FBdkIsQ0FBWCxFQUFDLFdBQUQsRUFBSztBQUNMLFNBQUEsNEJBQUE7O01BQ0ksSUFBQyxDQUFBLGNBQUQsQ0FBZ0IsYUFBaEIsRUFBK0IsWUFBL0IsRUFBNkMsYUFBN0M7QUFESjtXQUVBLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixFQUFsQixFQUFzQixFQUF0QixFQUEwQix5QkFBQSxHQUEwQixhQUExQixHQUF3QyxnQkFBbEU7RUFKZ0I7O2dCQU9wQixjQUFBLEdBQWdCLFNBQUMsYUFBRCxFQUFnQixZQUFoQixFQUE4QixhQUE5QjtBQUNaLFFBQUE7SUFBQSxNQUFXLElBQUMsQ0FBQSxxQkFBRCxDQUF1QixLQUF2QixDQUFYLEVBQUMsV0FBRCxFQUFLO0lBQ0wsSUFBQyxDQUFBLE9BQUQsQ0FDSSxDQUFJLElBQUMsQ0FBQSxzQkFEVCxFQUVJLGNBQUEsR0FBZSxhQUFmLEdBQTZCLEdBQTdCLEdBQWdDLFlBQWhDLEdBQTZDLHNCQUE3QyxHQUFtRSxhQUFuRSxHQUFpRix1Q0FGckY7SUFJQSxJQUFDLENBQUEsT0FBRCxDQUNRLGtGQURSLEVBRUksY0FBQSxHQUFlLGFBQWYsR0FBNkIsR0FBN0IsR0FBZ0MsWUFBaEMsR0FBNkMsK0JBRmpEOztVQUtXLENBQUEsYUFBQSxJQUFrQjs7SUFDN0IsSUFBQyxDQUFBLFNBQVUsQ0FBQSxhQUFBLENBQWUsQ0FBQSxZQUFBLENBQTFCLEdBQTBDOztXQUVuQyxDQUFBLGFBQUEsSUFBa0I7O0lBQ3pCLElBQUMsQ0FBQSxLQUFNLENBQUEsYUFBQSxDQUFlLENBQUEsWUFBQSxDQUF0QixHQUFzQyxDQUFDLENBQUMsR0FBRixDQUFNLElBQUMsQ0FBQSxhQUFQLEVBQXNCLGFBQXRCO1dBRXRDLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixFQUFsQixFQUFzQixFQUF0QixFQUEwQixxQkFBQSxHQUFzQixhQUF0QixHQUFvQyxHQUFwQyxHQUF1QyxZQUF2QyxHQUFvRCxJQUFwRCxHQUF3RCxhQUF4RCxHQUFzRSxHQUFoRztFQWpCWTs7Z0JBb0JoQix3QkFBQSxHQUEwQixTQUFDLGtCQUFEO0FBQ3RCLFFBQUE7O01BRHVCLHFCQUFxQjs7SUFDNUMsTUFBVyxJQUFDLENBQUEscUJBQUQsQ0FBdUIsS0FBdkIsQ0FBWCxFQUFDLFdBQUQsRUFBSztBQUNMLFNBQUEsc0NBQUE7O01BQ0ksSUFBQyxDQUFBLGtCQUFELENBQW9CLGdCQUFwQixFQUFzQyxpQkFBdEM7QUFESjtXQUVBLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixFQUFsQixFQUFzQixFQUF0QixFQUEwQixvREFBMUI7RUFKc0I7O2dCQU8xQixrQkFBQSxHQUFvQixTQUFDLGdCQUFELEVBQW1CLGlCQUFuQjtBQUNoQixRQUFBO0lBQUEsTUFBVyxJQUFDLENBQUEscUJBQUQsQ0FBdUIsS0FBdkIsQ0FBWCxFQUFDLFdBQUQsRUFBSztJQUNMLElBQUMsQ0FBQSxPQUFELENBQ0ksQ0FBSSxJQUFDLENBQUEsc0JBRFQsRUFFSSxrQkFBQSxHQUFtQixnQkFBbkIsR0FBb0MsbURBRnhDO0lBSUEsSUFBQyxDQUFBLE9BQUQsQ0FDSSxDQUFJLElBQUMsQ0FBQSxlQUFlLENBQUMsR0FBakIsQ0FBcUIsZ0JBQXJCLENBRFIsRUFFSSxrQkFBQSxHQUFtQixnQkFBbkIsR0FBb0MsK0JBRnhDO0lBS0EsSUFBQyxDQUFBLGVBQWUsQ0FBQyxHQUFqQixDQUFxQixnQkFBckI7SUFDQSxNQUFNLENBQUMsY0FBUCxDQUFzQixVQUFVLENBQUMsU0FBakMsRUFBNEMsZ0JBQTVDLEVBQ0k7TUFBQSxZQUFBLEVBQWMsSUFBZDtNQUNBLEdBQUEsRUFBSyxpQkFETDtLQURKO1dBR0EsSUFBQyxDQUFBLGdCQUFELENBQWtCLEVBQWxCLEVBQXNCLEVBQXRCLEVBQTBCLHlCQUFBLEdBQTBCLGdCQUExQixHQUEyQyx3QkFBckU7RUFmZ0I7O2dCQWtCcEIsTUFBQSxHQUFRLFNBQUMsT0FBRDtJQUNKLElBQUcsSUFBQyxDQUFBLFVBQUo7QUFDSSxZQUFNLGdCQUFBLEdBQWlCLFFBRDNCOztFQURJOztnQkFJUixPQUFBLEdBQVMsU0FBQyxJQUFELEVBQU8sT0FBUDtJQUNMLElBQUcsQ0FBSSxJQUFQO2FBQ0ksSUFBQyxDQUFBLE1BQUQsQ0FBUSxPQUFSLEVBREo7O0VBREs7O2dCQUlULEtBQUEsR0FBTyxTQUFDLE9BQUQ7SUFDSCxJQUFHLElBQUMsQ0FBQSxVQUFELElBQWUsSUFBQyxDQUFBLFlBQW5CO2FBQ0ksS0FBQSxDQUFNLGVBQUEsR0FBZ0IsT0FBdEIsRUFESjs7RUFERzs7Z0JBSVAsWUFBQSxHQUFjLFNBQUMsSUFBRCxFQUFPLE9BQVA7SUFDVixJQUFHLENBQUksSUFBUDthQUNJLElBQUMsQ0FBQSxLQUFELENBQU8sT0FBUCxFQURKOztFQURVOztnQkFJZCxxQkFBQSxHQUF1QixTQUFDLGtCQUFEO0lBQ25CLElBQUcsa0JBQUg7TUFDSSxJQUFDLENBQUEscUJBQUQsR0FBeUIsRUFEN0I7O0lBRUEsSUFBQyxDQUFBLHFCQUFELElBQTBCO0FBQzFCLFdBQU8sQ0FBQyxJQUFDLENBQUEscUJBQUYsRUFBeUIsV0FBVyxDQUFDLEdBQVosQ0FBQSxDQUF6QjtFQUpZOztnQkFNdkIsZ0JBQUEsR0FBa0IsU0FBQyxxQkFBRCxFQUF3QixTQUF4QixFQUFtQyxPQUFuQztBQUNkLFFBQUE7SUFBQSxJQUFHLHFCQUFBLEtBQXlCLENBQTVCO01BQ0ksVUFBQSxHQUFhLElBRGpCO0tBQUEsTUFBQTtNQUdJLFVBQUEsR0FBYSxHQUFBLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBRixDQUFTLEdBQVQsRUFBYyxxQkFBQSxHQUF3QixDQUF0QyxDQUFELEVBSHBCOztJQUlBLElBQUcsSUFBQyxDQUFBLGVBQUo7TUFDSSxLQUFBLENBQU0sQ0FBRSxDQUFDLENBQUMsQ0FBQyxRQUFGLENBQVcsQ0FBQyxXQUFXLENBQUMsR0FBWixDQUFBLENBQUEsR0FBb0IsU0FBckIsQ0FBK0IsQ0FBQyxPQUFoQyxDQUF3QyxDQUF4QyxDQUFYLEVBQXVELENBQXZELEVBQTBELEdBQTFELENBQUQsQ0FBQSxHQUErRCxNQUEvRCxHQUFxRSxVQUFyRSxHQUFnRixHQUFoRixHQUFtRixPQUFyRixDQUE4RixDQUFDLEtBQS9GLENBQXFHLENBQXJHLEVBQXdHLElBQUMsQ0FBQSxtQkFBekcsQ0FBTixFQURKOztXQUVBLElBQUMsQ0FBQSxxQkFBRCxJQUEwQjtFQVBaOzs7O0dBblZJOztBQTRWMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBdEIsR0FBcUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7Ozs7QUQ3YTNELElBQUEsTUFBQTtFQUFBOzs7QUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0FBRUgsT0FBTyxDQUFDOzs7RUFDRyxtQkFBQyxPQUFEOztNQUFDLFVBQVU7O0lBQ3BCLENBQUMsQ0FBQyxRQUFGLENBQVcsT0FBWCxFQUNJO01BQUEsZUFBQSxFQUFpQixJQUFqQjtNQUNBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxLQUFQLEdBQWUsb0JBQW9CLENBQUMsS0FBckMsQ0FBQSxHQUE4QyxDQURqRDtNQUVBLENBQUEsRUFBRyxDQUFDLE1BQU0sQ0FBQyxNQUFQLEdBQWdCLG9CQUFvQixDQUFDLE1BQXRDLENBQUEsR0FBZ0QsQ0FGbkQ7S0FESjtJQUlBLDJDQUFNLE9BQU47SUFFQSxJQUFDLENBQUEsS0FBRCxHQUNJO01BQUEsbUJBQUEsRUFBcUIsbUJBQW1CLENBQUMsSUFBcEIsQ0FBQSxDQUFyQjtNQUNBLGNBQUEsRUFBZ0IsY0FBYyxDQUFDLElBQWYsQ0FBQSxDQURoQjtNQUVBLFdBQUEsRUFBYSxXQUFXLENBQUMsSUFBWixDQUFBLENBRmI7TUFHQSxXQUFBLEVBQWEsV0FBVyxDQUFDLElBQVosQ0FBQSxDQUhiO01BSUEsZ0JBQUEsRUFBa0IsZ0JBQWdCLENBQUMsSUFBakIsQ0FBQSxDQUpsQjtNQUtBLGdCQUFBLEVBQWtCLGdCQUFnQixDQUFDLElBQWpCLENBQUEsQ0FMbEI7TUFNQSxpQkFBQSxFQUFtQixpQkFBaUIsQ0FBQyxJQUFsQixDQUFBLENBTm5CO01BT0EsaUJBQUEsRUFBbUIsaUJBQWlCLENBQUMsSUFBbEIsQ0FBQSxDQVBuQjtNQVFBLGlCQUFBLEVBQW1CLGlCQUFpQixDQUFDLElBQWxCLENBQUEsQ0FSbkI7TUFTQSxpQkFBQSxFQUFtQixpQkFBaUIsQ0FBQyxJQUFsQixDQUFBLENBVG5CO01BVUEsaUJBQUEsRUFBbUIsaUJBQWlCLENBQUMsSUFBbEIsQ0FBQSxDQVZuQjtNQVdBLGlCQUFBLEVBQW1CLGlCQUFpQixDQUFDLElBQWxCLENBQUEsQ0FYbkI7TUFZQSxpQkFBQSxFQUFtQixpQkFBaUIsQ0FBQyxJQUFsQixDQUFBLENBWm5CO01BYUEsaUJBQUEsRUFBbUIsaUJBQWlCLENBQUMsSUFBbEIsQ0FBQSxDQWJuQjtNQWNBLGlCQUFBLEVBQW1CLGlCQUFpQixDQUFDLElBQWxCLENBQUEsQ0FkbkI7TUFlQSxvQkFBQSxFQUFzQixvQkFBb0IsQ0FBQyxJQUFyQixDQUFBLENBZnRCOztJQWlCSixNQUFNLENBQUMsWUFBUCxDQUFvQixJQUFwQixFQUF1QixJQUFDLENBQUEsS0FBSyxDQUFDLGNBQTlCLEVBQThDLElBQUMsQ0FBQSxLQUEvQztJQUVBLElBQUMsQ0FBQSxZQUFELEdBQWdCLENBQ1osQ0FBQyxJQUFDLENBQUEsS0FBSyxDQUFDLGlCQUFSLEVBQTJCLElBQUMsQ0FBQSxLQUFLLENBQUMsaUJBQWxDLEVBQXFELElBQUMsQ0FBQSxLQUFLLENBQUMsaUJBQTVELENBRFksRUFFWixDQUFDLElBQUMsQ0FBQSxLQUFLLENBQUMsaUJBQVIsRUFBMkIsSUFBQyxDQUFBLEtBQUssQ0FBQyxpQkFBbEMsRUFBcUQsSUFBQyxDQUFBLEtBQUssQ0FBQyxpQkFBNUQsQ0FGWSxFQUdaLENBQUMsSUFBQyxDQUFBLEtBQUssQ0FBQyxpQkFBUixFQUEyQixJQUFDLENBQUEsS0FBSyxDQUFDLGlCQUFsQyxFQUFxRCxJQUFDLENBQUEsS0FBSyxDQUFDLGlCQUE1RCxDQUhZO0lBS2hCLElBQUMsQ0FBQSxhQUFELEdBQ0k7TUFBQSxHQUFBLEVBQUssV0FBTDtNQUNBLEdBQUEsRUFBSyxXQURMOztJQUVKLElBQUMsQ0FBQSxXQUFELEdBQWU7RUFuQ047O3NCQXNDYixVQUFBLEdBQ0k7SUFBQSxZQUFBLEVBQ0k7TUFBQSxZQUFBLEVBQWMsRUFBZDtNQUNBLFdBQUEsRUFBYSxDQURiO01BRUEsV0FBQSxFQUFhLFNBRmI7S0FESjtJQUlBLGNBQUEsRUFDSTtNQUFBLFdBQUEsRUFBYSxDQUFiO0tBTEo7SUFNQSxRQUFBLEVBQ0k7TUFBQSxJQUFBLEVBQU0sTUFBTjtNQUNBLFFBQUEsRUFBVSxFQURWO01BRUEsVUFBQSxFQUFZLE1BRlo7TUFHQSxTQUFBLEVBQVcsUUFIWDtNQUlBLEtBQUEsRUFBTyxTQUpQO0tBUEo7OztzQkFjSixnQkFBQSxHQUFrQixTQUFDLFVBQUQ7QUFDZCxRQUFBO0lBQUEsSUFBRyxVQUFVLENBQUMsS0FBWCxLQUFvQixHQUF2QjtNQUNJLENBQUMsQ0FBQyxNQUFGLENBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxXQUFoQixFQUE2QixJQUFDLENBQUEsVUFBVSxDQUFDLFlBQXpDO01BQ0EsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxJQUFDLENBQUEsS0FBSyxDQUFDLFdBQWhCLEVBQTZCLElBQUMsQ0FBQSxVQUFVLENBQUMsY0FBekM7TUFDQSxJQUFDLENBQUEscUJBQUQsR0FBeUIsTUFBTSxDQUFDLGlCQUFQLENBQ3JCLElBQUMsQ0FBQSxLQUFLLENBQUMsZ0JBRGMsRUFFakIsSUFBQSxTQUFBLENBQVUsSUFBQyxDQUFBLFVBQVUsQ0FBQyxRQUF0QixDQUZpQjs7V0FJSCxDQUFFLE9BQXhCLENBQUE7T0FQSjs7SUFTQSxJQUFHLFVBQVUsQ0FBQyxLQUFYLEtBQW9CLEdBQXZCO01BQ0ksQ0FBQyxDQUFDLE1BQUYsQ0FBUyxJQUFDLENBQUEsS0FBSyxDQUFDLFdBQWhCLEVBQTZCLElBQUMsQ0FBQSxVQUFVLENBQUMsY0FBekM7TUFDQSxDQUFDLENBQUMsTUFBRixDQUFTLElBQUMsQ0FBQSxLQUFLLENBQUMsV0FBaEIsRUFBNkIsSUFBQyxDQUFBLFVBQVUsQ0FBQyxZQUF6Qzs7WUFDc0IsQ0FBRSxPQUF4QixDQUFBOzthQUNBLElBQUMsQ0FBQSxxQkFBRCxHQUF5QixNQUFNLENBQUMsaUJBQVAsQ0FDckIsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFEYyxFQUVqQixJQUFBLFNBQUEsQ0FBVSxJQUFDLENBQUEsVUFBVSxDQUFDLFFBQXRCLENBRmlCLEVBSjdCOztFQVZjOztzQkFvQmxCLFdBQUEsR0FBYSxTQUFDLFNBQUQ7QUFFVCxRQUFBO0FBQUE7QUFBQSxTQUFBLHFDQUFBOztNQUNJLElBQUksQ0FBQyxPQUFMLENBQUE7QUFESjtJQUVBLElBQUMsQ0FBQSxXQUFELEdBQWU7QUFHZixTQUFXLDhCQUFYO0FBQ0ksV0FBVyw4QkFBWDtRQUNJLFVBQUEsR0FBYSxTQUFTLENBQUMsS0FBTSxDQUFBLEdBQUEsQ0FBSyxDQUFBLEdBQUE7UUFDbEMsSUFBRyxVQUFBLEtBQWMsRUFBakI7VUFDSSxVQUFBLEdBQWEsTUFBTSxDQUFDLGlCQUFQLENBQ1QsSUFBQyxDQUFBLFlBQWEsQ0FBQSxHQUFBLENBQUssQ0FBQSxHQUFBLENBRFYsRUFFVCxJQUFDLENBQUEsYUFBYyxDQUFBLFVBQUEsQ0FBVyxDQUFDLElBQTNCLENBQUEsQ0FGUztVQUliLFVBQVUsQ0FBQyxDQUFYLEdBQWU7VUFDZixJQUFDLENBQUEsV0FBVyxDQUFDLElBQWIsQ0FBa0IsVUFBbEIsRUFOSjs7QUFGSjtBQURKOztVQVlTLENBQUUsT0FBWCxDQUFBOztJQUdBLElBQUcsQ0FBSSxDQUFDLENBQUMsT0FBRixDQUFVLFNBQVMsQ0FBQyxXQUFwQixFQUFpQyxFQUFqQyxDQUFQO01BQ0ksT0FBdUMsU0FBUyxDQUFDLFdBQWpELEVBQUMsd0JBQUQsRUFBVyxvQkFBWCxFQUFtQix3QkFBbkIsRUFBNkI7TUFDN0IsR0FBQSxHQUFNLENBQUMsQ0FBQSxHQUFJLElBQUMsQ0FBQSxZQUFhLENBQUEsUUFBQSxDQUFVLENBQUEsQ0FBQSxDQUFFLENBQUMsV0FBVyxDQUFDLENBQTNDLEdBQStDLElBQUMsQ0FBQSxZQUFhLENBQUEsUUFBQSxDQUFVLENBQUEsQ0FBQSxDQUFFLENBQUMsTUFBM0UsQ0FBQSxHQUFxRjtNQUMzRixHQUFBLEdBQU0sQ0FBQyxDQUFBLEdBQUksSUFBQyxDQUFBLFlBQWEsQ0FBQSxNQUFBLENBQVEsQ0FBQSxDQUFBLENBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBekMsR0FBNkMsSUFBQyxDQUFBLFlBQWEsQ0FBQSxNQUFBLENBQVEsQ0FBQSxDQUFBLENBQUUsQ0FBQyxNQUF2RSxDQUFBLEdBQWlGO01BRXZGLEdBQUEsR0FBTSxDQUFDLENBQUEsR0FBSSxJQUFDLENBQUEsWUFBYSxDQUFBLENBQUEsQ0FBRyxDQUFBLFFBQUEsQ0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUEzQyxHQUErQyxJQUFDLENBQUEsWUFBYSxDQUFBLENBQUEsQ0FBRyxDQUFBLFFBQUEsQ0FBUyxDQUFDLE1BQTNFLENBQUEsR0FBcUY7TUFDM0YsR0FBQSxHQUFNLENBQUMsQ0FBQSxHQUFJLElBQUMsQ0FBQSxZQUFhLENBQUEsQ0FBQSxDQUFHLENBQUEsTUFBQSxDQUFPLENBQUMsV0FBVyxDQUFDLENBQXpDLEdBQTZDLElBQUMsQ0FBQSxZQUFhLENBQUEsQ0FBQSxDQUFHLENBQUEsTUFBQSxDQUFPLENBQUMsTUFBdkUsQ0FBQSxHQUFpRjtNQUV2RixJQUFDLENBQUEsUUFBRCxHQUFnQixJQUFBLFFBQUEsQ0FDWjtRQUFBLEdBQUEsRUFBSyxpQkFBQSxHQUFrQixHQUFsQixHQUFzQixRQUF0QixHQUE4QixHQUE5QixHQUFrQyxRQUFsQyxHQUEwQyxHQUExQyxHQUE4QyxRQUE5QyxHQUFzRCxHQUF0RCxHQUEwRCxvREFBL0Q7UUFDQSxDQUFBLEVBQUcsRUFESDtPQURZO0FBSWhCO0FBQUE7V0FBQSx3Q0FBQTs7cUJBQ0ksSUFBSSxDQUFDLE9BQUwsQ0FBQTtBQURKO3FCQVpKOztFQXRCUzs7c0JBc0NiLGlCQUFBLEdBQW1CLE1BQU0sQ0FBQyxVQUFQLENBQWtCLFNBQUMsU0FBRCxFQUFZLFVBQVo7V0FDakMsSUFBQyxDQUFBLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBdEIsQ0FBeUIsTUFBTSxDQUFDLEdBQWhDLEVBQXFDLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxLQUFEO0FBQ2pDLFlBQUE7UUFBQSxRQUFBLEdBQVcsU0FBQyxLQUFELEVBQVEsS0FBUjtBQUNQLGlCQUNJLEtBQUssQ0FBQyxDQUFOLElBQVcsS0FBSyxDQUFDLENBQWpCLElBQ0EsS0FBSyxDQUFDLENBQU4sSUFBVyxLQUFLLENBQUMsQ0FBTixHQUFVLEtBQUssQ0FBQyxLQUQzQixJQUVBLEtBQUssQ0FBQyxDQUFOLElBQVcsS0FBSyxDQUFDLENBRmpCLElBR0EsS0FBSyxDQUFDLENBQU4sSUFBVyxLQUFLLENBQUMsQ0FBTixHQUFVLEtBQUssQ0FBQztRQUx4QjtBQVFYO2FBQVcsOEJBQVg7OztBQUNJO2lCQUFXLDhCQUFYO2NBQ0ksSUFDSSxRQUFBLENBQVMsSUFBQyxDQUFBLFlBQWEsQ0FBQSxHQUFBLENBQUssQ0FBQSxHQUFBLENBQUksQ0FBQyxXQUFqQyxFQUE4QyxLQUE5QyxDQUFBLElBQ0EsU0FBUyxDQUFDLEtBQU0sQ0FBQSxHQUFBLENBQUssQ0FBQSxHQUFBLENBQXJCLEtBQTZCLEVBRDdCLElBRUEsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxTQUFTLENBQUMsV0FBcEIsRUFBaUMsRUFBakMsQ0FISjtnQkFLSSxTQUFBLEdBQVksQ0FBQyxDQUFDLFNBQUYsQ0FBWSxTQUFTLENBQUMsS0FBdEI7Z0JBQ1osU0FBVSxDQUFBLEdBQUEsQ0FBSyxDQUFBLEdBQUEsQ0FBZixHQUFzQixVQUFVLENBQUM7Z0JBQ2pDLFNBQVMsQ0FBQyxLQUFWLEdBQWtCO2dCQUVsQixJQUFHLFVBQVUsQ0FBQyxLQUFYLEtBQW9CLEdBQXZCO2dDQUNJLFVBQVUsQ0FBQyxLQUFYLEdBQW1CLEtBRHZCO2lCQUFBLE1BQUE7Z0NBR0ksVUFBVSxDQUFDLEtBQVgsR0FBbUIsS0FIdkI7aUJBVEo7ZUFBQSxNQUFBO3NDQUFBOztBQURKOzs7QUFESjs7TUFUaUM7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXJDO0VBRGlDLENBQWxCOzs7O0dBaEhTIn0=
