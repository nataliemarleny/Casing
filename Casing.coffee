# Copyright (c) 2018 Natalie Marleny
# Casing - UI framework for Framer
# License: MIT
# URL: https://github.com/nataliemarleny/Casing


# -----------------------------------------------------------------------------
# Utility functions
exports.getScreenFramePoint = (layer) -> (_.pick layer.screenFrame, ['x', 'y'])

exports.sizePositionApply = (sourceComp, targetComp) ->
    targetComp.parent = sourceComp.parent
    _.assign targetComp, sourceComp.frame

exports.autoPosition = (parentComp, referenceComp, comps) ->
    referenceFramePoint = _.cloneDeep(exports.getScreenFramePoint(referenceComp))
    for compName, comp of comps
        _.assign comp, (_.mergeWith exports.getScreenFramePoint(comp), referenceFramePoint, _.subtract)
    _.assign(comp, {parent: parentComp}) for compName, comp of comps

exports.invokeOnce = (func) ->
    return {
        'invokeOnce': true
        'func': func
    }

exports.constructModule = (moduleName) ->
    ->
        module = require moduleName
        new module[moduleName]

# -----------------------------------------------------------------------------
# Purpose of data-bundles: changes propagation, history of values, custom properties
class DataBundle
    constructor: (@_componentName, @_dataName, @_dataValue, @_app) ->

Object.defineProperty DataBundle.prototype, "value",
    configurable: true
    
    get: () -> (@_dataValue)
    set: (newValue) ->

        # If the new value differs from registered
        if @_dataValue != newValue

            @_dataValue = newValue
            @_app._updateData(@_componentName, @_dataName, newValue)

Object.defineProperty DataBundle.prototype, "_data",
    configurable: true
    get: () -> (@_app._data)

Object.defineProperty DataBundle.prototype, "_history",
    configurable: true
    get: () -> (_.map @_app._dataIsolatedHistory, "#{@_componentName}.#{@_dataName}")

Object.defineProperty DataBundle.prototype, "_historyChanges",
    configurable: true
    get: () ->
        trackTransitions = (acc, next_item) ->
            if acc == [] or (not _.isEqual(acc[acc.length - 1], next_item))
                acc.push(next_item)
            return acc

        return _.reduce @_history, trackTransitions, []

# -----------------------------------------------------------------------------
# Retrieves the names of the function parameters (for dependency-injection)
# Adapted from: https://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically
STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg
ARGUMENT_NAMES = /([^\s,]+)/g
getParamNames = (func) ->
    fnStr = func.toString().replace(STRIP_COMMENTS, '')
    result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES)
    if result == null
        result = []
    return result

# -----------------------------------------------------------------------------
# Application implementation: manages the screens and data
# entrypoint method
class exports.App extends Layer
    constructor: (options) ->
        [_d, _t] = @_log_performance_prep(true)

        _.defaults options,
            backgroundColor: "#EFEFEF"
            frame: Screen.frame
            # Pattern to use when detecting wiring functions
            wireComponentMethodPrefix: "wiring_"

            showErrors: true
            showWarnings: true
            showPerformance: false
            lowPerformanceWidth: 145

            dataInit: {}
            dataProperties: {}
        super options
        
        _.assign @, _.pick options, [
            'wireComponentMethodPrefix'
            'showErrors'
            'showWarnings'
            'showPerformance'
            'lowPerformanceWidth'
        ]

        _.assign @,
            screen_switch_happened: false

        # ... componentName == "_" for global-data
        # {componentName: {localDataName: DataBundle(dataValue)}}
        @_dataIsolated = {}
        # ... global-data mapped into component-local-context (with appropriate rename)
        # {componentName: {localDataName: DataBundle(dataValue)}}
        @data = @_data = {}

        # ... componentName == "_" for global-data-history
        # [{componentName: {localDataName: dataIntialValue}}, {componentName: {localDataName: dataValue2Snapshot}}]
        @dataHistory = @_dataIsolatedHistory = [{}]
        # {componentName, {localDataName: "targetComponentName.targetComponentValue"}}
        @_dataLink = {}
        # Set(propertyName)
        @_dataProperties = new Set()

        # {componentName: componentSpec}
        @_componentSpecs = {}
        # {screenName: [componentName]}
        @_screenSpecs = {}

        # ... values that change with the screen of the app
        # {componentName: component}
        @_activeComponents = {}
        # {sourceComponentName: {sourceDataName: ["componentName.methodName"]}}
        @_activeUpdateLists = {}

        # ... initialize the data and the properties
        @_setupDataDict "_", options.dataInit
        @_setupDataPropertiesDict options.dataProperties

        # Screen state-machine transitions defined
        @on Events.StateSwitchEnd, @_screenTransition

        @_log_performance _d, _t, "App.constructor"


    # entrypoint method
    defineComponent: (componentSpec) ->
        [_d, _t] = @_log_performance_prep(true)

        @_assert(
            componentSpec.name not of @_componentSpecs
            "component \"#{componentSpec.name}\" defined multiple times"
        )

        componentName = componentSpec.name
        @_componentSpecs[componentName] = componentSpec

        # ... initialize data, data-links, data-properties
        @_setupDataDict componentName, componentSpec.dataInit
        @_setupDataLinkDict componentName, componentSpec.dataLink
        @_setupDataPropertiesDict componentSpec.dataProperties

        @_log_performance _d, _t, "App.defineComponent(#{componentName})"


    # entrypoint method
    defineScreen: (screenName, componentList) ->
        [_d, _t] = @_log_performance_prep(true)

        @_assert(
            screenName not of @states
            "screen \"#{screenName}\" defined multiple times"
        )

        @_screenSpecs[screenName] = componentList
        @states[screenName] = {}
        @_log_performance _d, _t, "App.defineScreen(#{screenName})"


    # entrypoint method
    _screenTransition: (oldScreen, newScreen) ->
        [_d, _t] = @_log_performance_prep(true)

        # Mark when the first transition has happened
        @screen_switch_happened = true

        # Ignore the transitions to the same screen
        if oldScreen == newScreen
            return

        # Remove the components from the previous screen
        for componentName, component of @_activeComponents
            component.destroy()

        # Reset screen dependent objects
        @_activeComponents = {}
        @_activeUpdateLists = {}

        # Create currently active components
        for componentName in @_screenSpecs[newScreen]

            # ... create active components for this screen
            componentSpec = @_componentSpecs[componentName]
            component = componentSpec.construct()
            component.parent = @
            @_activeComponents[componentName] = component

            # Warn if any dataName is defined in local-data and linked-data
            for dataName of (componentSpec?.dataInit or {})
                @_assert(
                    not componentSpec.dataLink?[dataName]?
                    "local-data \"#{dataName}\" present in both local-data and linked-data"
                )

            # ... create active update lists for this screen
            for methodName in Object.keys(Object.getPrototypeOf(component))
                if methodName.startsWith(@wireComponentMethodPrefix)

                    # Unwrap the method if necessary
                    method = component[methodName]
                    if not _.isFunction method
                        method = method['func']

                    for methodParam in getParamNames(method)
                        @_assert(
                            @_data[componentName]?[methodParam]?
                            "parameter \"#{methodParam}\" present in \"#{componentName}:#{methodName}\" but not found as either local-data or linked-data"
                        )

                        # ... resolve where to subscribe the method
                        targetComponentDataName = "#{componentName}.#{methodParam}"
                        if componentSpec.dataLink?[methodParam]?
                            targetComponentDataName = componentSpec.dataLink[methodParam]
                        [targetComponentName, targetDataName] = targetComponentDataName.split(".")
                       
                        @_activeUpdateLists[targetComponentName] ?= {}
                        @_activeUpdateLists[targetComponentName][targetDataName] ?= []
                        @_activeUpdateLists[targetComponentName][targetDataName].push "#{componentName}.#{methodName}"

        @_updateComponentsForAllData()
        @_log_performance _d, _t, "App._screenTransition(#{oldScreen}, #{newScreen})"

    # entrypoint method
    _updateData: (componentName, dataName, newValue) ->
        [_d, _t] = @_log_performance_prep(true)
        @_updateDataHistory(componentName, dataName, newValue)
        @_updateComponentsForData(componentName, dataName)
        @_log_performance _d, _t, "App._updateData(#{componentName}:#{dataName}, #{newValue})"

    _invokeComponentMethod: (componentName, methodName, componentJustCreated = false) ->
        [_d, _t] = @_log_performance_prep(false)

        component = @_activeComponents[componentName]
        method = component[methodName]

        if not _.isFunction method
            # Don't invoke multiple times if requested
            if (
                "invokeOnce" of method and
                not componentJustCreated
            )
                return
            
            # Unwrap the method
            method = method["func"]

        funcArguments = _.at @_data[componentName], getParamNames(method)    
        method.apply(component, funcArguments)
        @_log_performance _d, _t, "App._invokeComponentMethod(#{componentName}, #{methodName})"

    _updateComponentsForAllData: ->
        [_d, _t] = @_log_performance_prep(false)
        # Call methods of all active components only once
        for componentName, component of (@_activeComponents or {})
            for methodName in Object.keys(Object.getPrototypeOf(component))
                if methodName.startsWith(@wireComponentMethodPrefix)
                    @_invokeComponentMethod(componentName, methodName, true)
        @_log_performance _d, _t, "App._updateComponentsForAllData"

    _updateComponentsForData: (componentName, dataName) ->
        [_d, _t] = @_log_performance_prep(false)
        for componentMethodName in (@_activeUpdateLists?[componentName]?[dataName] or [])
            [compName, methodName] = componentMethodName.split(".")
            @_invokeComponentMethod(compName, methodName, false)
        @_log_performance _d, _t, "App._updateComponentsForData(#{componentName}:#{dataName})"

    _updateDataHistory: (componentName, dataName, newValue) ->
        [_d, _t] = @_log_performance_prep(false)
        @_assert(
            @_data[componentName]?[dataName]?
            "CRITICAL INTERNAL - data not registered in history before changing, contact maintainer"
        )

        _lastHistoryEntry = @_dataIsolatedHistory[@_dataIsolatedHistory.length - 1]
        _newHistoryEntry = _.cloneDeep _lastHistoryEntry
        _newHistoryEntry[componentName][dataName] = _.cloneDeep newValue
        @_dataIsolatedHistory.push(_newHistoryEntry)

        # Verify consitency in data-storage
        _lastFromHistory = @_dataIsolatedHistory[@_dataIsolatedHistory.length - 1]
        _lastFromData = {}

        for _componentName in Object.keys(@_dataIsolated)
            _lastFromData[_componentName] ?= {}
            for _dataName in Object.keys(@_dataIsolated[_componentName])
                _lastFromData[_componentName][_dataName] = @_dataIsolated[_componentName][_dataName].value
        @_assert(
            _.isEqual _lastFromHistory, _lastFromData
            "CRITICAL INTERNAL - inconsistency between history and current data, contact maintainer"
        )
        @_log_performance _d, _t, "App._updateDataHistory(#{componentName}:#{dataName}, #{newValue})"


    _setupDataDict: (componentName, dataDict = {}) ->
        [_d, _t] = @_log_performance_prep(false)
        for dataName, dataValue of dataDict
            @_setupData componentName, dataName, dataValue
        @_log_performance _d, _t, "App._setupDataDict(#{componentName}, <dataDict>)"


    _setupData: (componentName, dataName, dataValue) ->
        [_d, _t] = @_log_performance_prep(false)
        @_assert(
            not @screen_switch_happened
            "data \"#{componentName}:#{dataName}\" initialized to \"#{dataValue}\" after first screen-switch happened"
        )
        @_assert(
            not @_data[componentName]?[dataName]?
            "data \"#{componentName}:#{dataName}\" initialized multiple times"
        )

        @_dataIsolated[componentName] ?= {}
        @_data[componentName] ?= {}
        # ... don't copy functions
        dataValueCopy = if _.isFunction dataValue then dataValue else _.cloneDeep dataValue
        dataBundle = new DataBundle(componentName, dataName, dataValueCopy, @)
        @_dataIsolated[componentName][dataName] = @_data[componentName][dataName] = dataBundle

        @_dataIsolatedHistory[0][componentName] ?= {}
        dataValueCopy = if _.isFunction dataValue then dataValue else _.cloneDeep dataValue
        @_dataIsolatedHistory[0][componentName][dataName] = dataValueCopy
        @_log_performance _d, _t, "App._setupData(#{componentName}:#{dataName}, #{dataValue})"


    _setupDataLinkDict: (componentName, dataLinkDict = {}) ->
        [_d, _t] = @_log_performance_prep(false)
        for dataLinkName, dataLinkValue of dataLinkDict
            @_setupDataLink componentName, dataLinkName, dataLinkValue
        @_log_performance _d, _t, "App._setupDataLinkDict(#{componentName}, <dataLinks>)"


    _setupDataLink: (componentName, dataLinkName, dataLinkValue) ->
        [_d, _t] = @_log_performance_prep(false)
        @_assert(
            not @screen_switch_happened
            "data-link \"#{componentName}:#{dataLinkName}\" initialized to \"#{dataLinkValue}\" after first screen-switch happened"
        )
        @_assert(
            not @_data[componentName]?[dataLinkName]?
            "data-link \"#{componentName}:#{dataLinkName}\" initialized multiple times"
        )

        @_dataLink[componentName] ?= {}
        @_dataLink[componentName][dataLinkName] = dataLinkValue

        @_data[componentName] ?= {}
        @_data[componentName][dataLinkName] = _.get @_dataIsolated, dataLinkValue

        @_log_performance _d, _t, "App._setupDataLink(#{componentName}:#{dataLinkName}, #{dataLinkValue})"


    _setupDataPropertiesDict: (dataPropertiesDict = {}) ->
        [_d, _t] = @_log_performance_prep(false)
        for dataPropertyName, dataPropertyValue of dataPropertiesDict
            @_setupDataProperty dataPropertyName, dataPropertyValue
        @_log_performance _d, _t, "App._setupDataPropertiesDict(<dataPropertiesDict>)"


    _setupDataProperty: (dataPropertyName, dataPropertyValue) ->
        [_d, _t] = @_log_performance_prep(false)
        @_assert(
            not @screen_switch_happened
            "data-property \"#{dataPropertyName}\" initialized after first screen-switch happened"
        )
        @_assert(
            not @_dataProperties.has(dataPropertyName)
            "data-property \"#{dataPropertyName}\" initialized multiple times"
        )

        @_dataProperties.add(dataPropertyName)
        Object.defineProperty DataBundle.prototype, dataPropertyName,
            configurable: true
            get: dataPropertyValue
        @_log_performance _d, _t, "App._setupDataProperty(#{dataPropertyName}, <dataPropertyValue>)"


    _error: (message) ->
        if @showErrors
            throw "Casing: ERROR #{message}"

    _assert: (cond, message) ->
        if not cond
            @_error message

    _warn: (message) ->
        if @showErrors or @showWarnings
            print "Casing: WARN #{message}"

    _assert_warn: (cond, message) ->
        if not cond
            @_warn message

    _log_performance_prep: (isEntryPointMethod) ->
        if isEntryPointMethod
            @_methodCallStackDepth = 0
        @_methodCallStackDepth += 1
        return [@_methodCallStackDepth, performance.now()]

    _log_performance: (_methodCallStackDepth, startTime, message) ->
        if _methodCallStackDepth == 1
            graphLines = '└'
        else
            graphLines = "├#{_.repeat "─", _methodCallStackDepth - 1}"
        if @showPerformance  
            print "#{_.padStart (performance.now() - startTime).toFixed(2), 7, '_'} ms #{graphLines} #{message}".slice(0, @lowPerformanceWidth)
        @_methodCallStackDepth -= 1

exports.App.prototype.switchScreen = exports.App.prototype.stateSwitch
