Casing = require "Casing"

class exports.ScreenChoiceComponents3 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceComponents3_background.width) / 2
            y: (Screen.height - ScreenChoiceComponents3_background.height) / 2
        super options

        @comps =
            ScreenChoiceComponents3_nameLabel: ScreenChoiceComponents3_nameLabel.copy()
            ScreenChoiceComponents3_selector: ScreenChoiceComponents3_selector.copy()
            ScreenChoiceComponents3_btnLabel: ScreenChoiceComponents3_btnLabel.copy()
            ScreenChoiceComponents3_btn: ScreenChoiceComponents3_btn.copy()
            ScreenChoiceComponents3_back: ScreenChoiceComponents3_back.copy()
            ScreenChoiceComponents3_background: ScreenChoiceComponents3_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceComponents3_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceComponents3_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceComponents3_back.onTap =>
            handleBackTap.value()
