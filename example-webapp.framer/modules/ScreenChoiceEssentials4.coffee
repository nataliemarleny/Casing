Casing = require "Casing"

class exports.ScreenChoiceEssentials4 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceEssentials4_background.width) / 2
            y: (Screen.height - ScreenChoiceEssentials4_background.height) / 2
        super options

        @comps =
            ScreenChoiceEssentials4_nameLabel: ScreenChoiceEssentials4_nameLabel.copy()
            ScreenChoiceEssentials4_selector: ScreenChoiceEssentials4_selector.copy()
            ScreenChoiceEssentials4_btnLabel: ScreenChoiceEssentials4_btnLabel.copy()
            ScreenChoiceEssentials4_btn: ScreenChoiceEssentials4_btn.copy()
            ScreenChoiceEssentials4_back: ScreenChoiceEssentials4_back.copy()
            ScreenChoiceEssentials4_background: ScreenChoiceEssentials4_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceEssentials4_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceEssentials4_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceEssentials4_back.onTap =>
            handleBackTap.value()
