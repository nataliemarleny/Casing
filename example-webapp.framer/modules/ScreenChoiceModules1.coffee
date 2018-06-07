Casing = require "Casing"

class exports.ScreenChoiceModules1 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceModules1_background.width) / 2
            y: (Screen.height - ScreenChoiceModules1_background.height) / 2
        super options

        @comps =
            ScreenChoiceModules1_nameLabel: ScreenChoiceModules1_nameLabel.copy()
            ScreenChoiceModules1_selector: ScreenChoiceModules1_selector.copy()
            ScreenChoiceModules1_btnLabel: ScreenChoiceModules1_btnLabel.copy()
            ScreenChoiceModules1_btn: ScreenChoiceModules1_btn.copy()
            ScreenChoiceModules1_back: ScreenChoiceModules1_back.copy()
            ScreenChoiceModules1_background: ScreenChoiceModules1_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceModules1_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceModules1_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceModules1_back.onTap =>
            handleBackTap.value()
