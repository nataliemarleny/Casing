Casing = require "Casing"

class exports.ScreenChoiceEssentials2 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceEssentials2_background.width) / 2
            y: (Screen.height - ScreenChoiceEssentials2_background.height) / 2
        super options

        @comps =
            ScreenChoiceEssentials2_nameLabel: ScreenChoiceEssentials2_nameLabel.copy()
            ScreenChoiceEssentials2_selector: ScreenChoiceEssentials2_selector.copy()
            ScreenChoiceEssentials2_btnLabel: ScreenChoiceEssentials2_btnLabel.copy()
            ScreenChoiceEssentials2_btn: ScreenChoiceEssentials2_btn.copy()
            ScreenChoiceEssentials2_back: ScreenChoiceEssentials2_back.copy()
            ScreenChoiceEssentials2_background: ScreenChoiceEssentials2_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceEssentials2_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceEssentials2_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceEssentials2_back.onTap =>
            handleBackTap.value()
