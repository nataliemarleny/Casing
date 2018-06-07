Casing = require "Casing"

class exports.ScreenChoiceModules3 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceModules3_background.width) / 2
            y: (Screen.height - ScreenChoiceModules3_background.height) / 2
        super options

        @comps =
            ScreenChoiceModules3_nameLabel: ScreenChoiceModules3_nameLabel.copy()
            ScreenChoiceModules3_selector: ScreenChoiceModules3_selector.copy()
            ScreenChoiceModules3_btnLabel: ScreenChoiceModules3_btnLabel.copy()
            ScreenChoiceModules3_btn: ScreenChoiceModules3_btn.copy()
            ScreenChoiceModules3_back: ScreenChoiceModules3_back.copy()
            ScreenChoiceModules3_background: ScreenChoiceModules3_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceModules3_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceModules3_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceModules3_back.onTap =>
            handleBackTap.value()
