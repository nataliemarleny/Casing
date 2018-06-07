Casing = require "Casing"

class exports.ScreenChoiceComponents4 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceComponents4_background.width) / 2
            y: (Screen.height - ScreenChoiceComponents4_background.height) / 2
        super options

        @comps =
            ScreenChoiceComponents4_nameLabel: ScreenChoiceComponents4_nameLabel.copy()
            ScreenChoiceComponents4_selector: ScreenChoiceComponents4_selector.copy()
            ScreenChoiceComponents4_btnLabel: ScreenChoiceComponents4_btnLabel.copy()
            ScreenChoiceComponents4_btn: ScreenChoiceComponents4_btn.copy()
            ScreenChoiceComponents4_back: ScreenChoiceComponents4_back.copy()
            ScreenChoiceComponents4_background: ScreenChoiceComponents4_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceComponents4_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceComponents4_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceComponents4_back.onTap =>
            handleBackTap.value()
