Casing = require "Casing"

class exports.ScreenChoiceFeatures1 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceFeatures1_background.width) / 2
            y: (Screen.height - ScreenChoiceFeatures1_background.height) / 2
        super options

        @comps =
            ScreenChoiceFeatures1_nameLabel: ScreenChoiceFeatures1_nameLabel.copy()
            ScreenChoiceFeatures1_selector: ScreenChoiceFeatures1_selector.copy()
            ScreenChoiceFeatures1_btnLabel: ScreenChoiceFeatures1_btnLabel.copy()
            ScreenChoiceFeatures1_btn: ScreenChoiceFeatures1_btn.copy()
            ScreenChoiceFeatures1_back: ScreenChoiceFeatures1_back.copy()
            ScreenChoiceFeatures1_background: ScreenChoiceFeatures1_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceFeatures1_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceFeatures1_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceFeatures1_back.onTap =>
            handleBackTap.value()
