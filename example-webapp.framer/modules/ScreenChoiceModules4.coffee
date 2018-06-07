Casing = require "Casing"

class exports.ScreenChoiceModules4 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceModules4_background.width) / 2
            y: (Screen.height - ScreenChoiceModules4_background.height) / 2
        super options

        @comps =
            ScreenChoiceModules4_nameLabel: ScreenChoiceModules4_nameLabel.copy()
            ScreenChoiceModules4_selector: ScreenChoiceModules4_selector.copy()
            ScreenChoiceModules4_btnLabel: ScreenChoiceModules4_btnLabel.copy()
            ScreenChoiceModules4_btn: ScreenChoiceModules4_btn.copy()
            ScreenChoiceModules4_back: ScreenChoiceModules4_back.copy()
            ScreenChoiceModules4_background: ScreenChoiceModules4_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceModules4_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceModules4_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceModules4_back.onTap =>
            handleBackTap.value()
