Casing = require "Casing"

class exports.ScreenChoiceDesign3 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceDesign3_background.width) / 2
            y: (Screen.height - ScreenChoiceDesign3_background.height) / 2
        super options

        @comps =
            ScreenChoiceDesign3_nameLabel: ScreenChoiceDesign3_nameLabel.copy()
            ScreenChoiceDesign3_selector: ScreenChoiceDesign3_selector.copy()
            ScreenChoiceDesign3_btnLabel: ScreenChoiceDesign3_btnLabel.copy()
            ScreenChoiceDesign3_btn: ScreenChoiceDesign3_btn.copy()
            ScreenChoiceDesign3_back: ScreenChoiceDesign3_back.copy()
            ScreenChoiceDesign3_background: ScreenChoiceDesign3_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceDesign3_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceDesign3_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceDesign3_back.onTap =>
            handleBackTap.value()
