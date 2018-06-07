Casing = require "Casing"

class exports.ScreenChoiceComponents2 extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenChoiceComponents2_background.width) / 2
            y: (Screen.height - ScreenChoiceComponents2_background.height) / 2
        super options

        @comps =
            ScreenChoiceComponents2_nameLabel: ScreenChoiceComponents2_nameLabel.copy()
            ScreenChoiceComponents2_selector: ScreenChoiceComponents2_selector.copy()
            ScreenChoiceComponents2_btnLabel: ScreenChoiceComponents2_btnLabel.copy()
            ScreenChoiceComponents2_btn: ScreenChoiceComponents2_btn.copy()
            ScreenChoiceComponents2_back: ScreenChoiceComponents2_back.copy()
            ScreenChoiceComponents2_background: ScreenChoiceComponents2_background.copy()

        Casing.autoPosition(@, @comps.ScreenChoiceComponents2_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenChoiceComponents2_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenChoiceComponents2_back.onTap =>
            handleBackTap.value()
