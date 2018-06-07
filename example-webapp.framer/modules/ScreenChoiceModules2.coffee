Casing = require "Casing"

class exports.ScreenChoiceModules2 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceModules2_background.width) / 2
            y: (Screen.height - ScreenChoiceModules2_background.height) / 2
        super options

        @comps =
            ScreenChoiceModules2_nameLabel: ScreenChoiceModules2_nameLabel.copy()
            ScreenChoiceModules2_selector: ScreenChoiceModules2_selector.copy()
            ScreenChoiceModules2_btnLabel: ScreenChoiceModules2_btnLabel.copy()
            ScreenChoiceModules2_btn: ScreenChoiceModules2_btn.copy()
            ScreenChoiceModules2_back: ScreenChoiceModules2_back.copy()
            ScreenChoiceModules2_background: ScreenChoiceModules2_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceModules2_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceModules2_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceModules2_back.onTap =>
            handleBackTap.value()
