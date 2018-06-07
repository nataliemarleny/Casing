Casing = require "Casing"

class exports.ScreenChoiceFeatures2 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceFeatures2_background.width) / 2
            y: (Screen.height - ScreenChoiceFeatures2_background.height) / 2
        super options

        @comps =
            ScreenChoiceFeatures2_nameLabel: ScreenChoiceFeatures2_nameLabel.copy()
            ScreenChoiceFeatures2_selector: ScreenChoiceFeatures2_selector.copy()
            ScreenChoiceFeatures2_btnLabel: ScreenChoiceFeatures2_btnLabel.copy()
            ScreenChoiceFeatures2_btn: ScreenChoiceFeatures2_btn.copy()
            ScreenChoiceFeatures2_back: ScreenChoiceFeatures2_back.copy()
            ScreenChoiceFeatures2_background: ScreenChoiceFeatures2_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceFeatures2_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceFeatures2_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceFeatures2_back.onTap =>
            handleBackTap.value()
