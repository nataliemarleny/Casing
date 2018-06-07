Casing = require "Casing"

class exports.ScreenChoiceEssentials1 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceEssentials1_background.width) / 2
            y: (Screen.height - ScreenChoiceEssentials1_background.height) / 2
        super options

        @comps =
            ScreenChoiceEssentials1_nameLabel: ScreenChoiceEssentials1_nameLabel.copy()
            ScreenChoiceEssentials1_selector: ScreenChoiceEssentials1_selector.copy()
            ScreenChoiceEssentials1_btnLabel: ScreenChoiceEssentials1_btnLabel.copy()
            ScreenChoiceEssentials1_btn: ScreenChoiceEssentials1_btn.copy()
            ScreenChoiceEssentials1_back: ScreenChoiceEssentials1_back.copy()
            ScreenChoiceEssentials1_background: ScreenChoiceEssentials1_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceEssentials1_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceEssentials1_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceEssentials1_back.onTap =>
            handleBackTap.value()
