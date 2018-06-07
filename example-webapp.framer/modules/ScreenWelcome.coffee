Casing = require "Casing"

class exports.ScreenWelcome extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenWelcome_background.width) / 2
            y: (Screen.height - ScreenWelcome_background.height) / 2
        super options

        @comps =
            ScreenWelcome_btnLabel: ScreenWelcome_btnLabel.copy()
            ScreenWelcome_btn: ScreenWelcome_btn.copy()
            ScreenWelcome_background: ScreenWelcome_background.copy()
        
        Casing.autoPosition(@, @comps.ScreenWelcome_background, @comps)

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenWelcome_btn.onTap =>
            handleBtnTap.value()