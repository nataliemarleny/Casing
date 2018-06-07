Casing = require "Casing"

class exports.ScreenChoiceComponents1 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceComponents1_background.width) / 2
            y: (Screen.height - ScreenChoiceComponents1_background.height) / 2
        super options

        @comps =
            ScreenChoiceComponents1_nameLabel: ScreenChoiceComponents1_nameLabel.copy()
            ScreenChoiceComponents1_selector: ScreenChoiceComponents1_selector.copy()
            ScreenChoiceComponents1_btnLabel: ScreenChoiceComponents1_btnLabel.copy()
            ScreenChoiceComponents1_btn: ScreenChoiceComponents1_btn.copy()
            ScreenChoiceComponents1_back: ScreenChoiceComponents1_back.copy()
            ScreenChoiceComponents1_background: ScreenChoiceComponents1_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceComponents1_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceComponents1_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceComponents1_back.onTap =>
            handleBackTap.value()
