Casing = require "Casing"

class exports.ScreenChoiceDesign2 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceDesign2_background.width) / 2
            y: (Screen.height - ScreenChoiceDesign2_background.height) / 2
        super options

        @comps =
            ScreenChoiceDesign2_nameLabel: ScreenChoiceDesign2_nameLabel.copy()
            ScreenChoiceDesign2_selector: ScreenChoiceDesign2_selector.copy()
            ScreenChoiceDesign2_btnLabel: ScreenChoiceDesign2_btnLabel.copy()
            ScreenChoiceDesign2_btn: ScreenChoiceDesign2_btn.copy()
            ScreenChoiceDesign2_back: ScreenChoiceDesign2_back.copy()
            ScreenChoiceDesign2_background: ScreenChoiceDesign2_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceDesign2_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceDesign2_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceDesign2_back.onTap =>
            handleBackTap.value()
