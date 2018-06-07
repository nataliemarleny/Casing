Casing = require "Casing"

class exports.ScreenChoiceDesign1 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceDesign1_background.width) / 2
            y: (Screen.height - ScreenChoiceDesign1_background.height) / 2
        super options

        @comps =
            ScreenChoiceDesign1_nameLabel: ScreenChoiceDesign1_nameLabel.copy()
            ScreenChoiceDesign1_selector: ScreenChoiceDesign1_selector.copy()
            ScreenChoiceDesign1_btnLabel: ScreenChoiceDesign1_btnLabel.copy()
            ScreenChoiceDesign1_btn: ScreenChoiceDesign1_btn.copy()
            ScreenChoiceDesign1_back: ScreenChoiceDesign1_back.copy()
            ScreenChoiceDesign1_background: ScreenChoiceDesign1_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceDesign1_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceDesign1_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceDesign1_back.onTap =>
            handleBackTap.value()
