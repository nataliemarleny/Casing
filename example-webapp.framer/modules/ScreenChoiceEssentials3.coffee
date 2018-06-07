Casing = require "Casing"

class exports.ScreenChoiceEssentials3 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceEssentials3_background.width) / 2
            y: (Screen.height - ScreenChoiceEssentials3_background.height) / 2
        super options

        @comps =
            ScreenChoiceEssentials3_nameLabel: ScreenChoiceEssentials3_nameLabel.copy()
            ScreenChoiceEssentials3_selector: ScreenChoiceEssentials3_selector.copy()
            ScreenChoiceEssentials3_btnLabel: ScreenChoiceEssentials3_btnLabel.copy()
            ScreenChoiceEssentials3_btn: ScreenChoiceEssentials3_btn.copy()
            ScreenChoiceEssentials3_back: ScreenChoiceEssentials3_back.copy()
            ScreenChoiceEssentials3_background: ScreenChoiceEssentials3_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceEssentials3_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceEssentials3_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceEssentials3_back.onTap =>
            handleBackTap.value()
