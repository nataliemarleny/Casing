Casing = require "Casing"
FrmrTextInput = require "FrmrTextInput"

class exports.ScreenName extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenName_background.width) / 2
            y: (Screen.height - ScreenName_background.height) / 2
        super options

        @comps =
            ScreenName_selector: ScreenName_selector.copy()
            ScreenName_nameLabel: ScreenName_nameLabel.copy()
            ScreenName_btnLabel: ScreenName_btnLabel.copy()
            ScreenName_btn: ScreenName_btn.copy()
            ScreenName_back: ScreenName_back.copy()
            ScreenName_input_anchor: ScreenName_input_anchor.copy()
            ScreenName_background: ScreenName_background.copy()

        Casing.autoPosition(@, @comps.ScreenName_background, @comps)

        # Style input
        @comps.ScreenName_input = Casing.sizePositionApply @comps.ScreenName_input_anchor, new FrmrTextInput.FrmrTextInput
            fontFamily: "-apple-system"
            fontSize: 24
            fontWeight: 400
            placeholder: "Please enter your name..."
        @comps.ScreenName_input.onFocus ->
            @style.borderRadius = "4px"
            @style.borderColor = "#3C444D"
            @style.border = "1px solid #3C444D"
        @comps.ScreenName_input.onUnfocus ->
            @style.borderRadius = "4px"
            @style.borderColor = "#C9CCD0"
        @comps.ScreenName_input.focus()



    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenName_btn.onTap =>
            handleBtnTap.value()

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenName_back.onTap =>
            handleBackTap.value()

    wiring_user_name: Casing.invokeOnce (userName) ->
        # Input handling
        @comps.ScreenName_input.input.addEventListener? 'keyup', =>
            userName.value = @comps.ScreenName_input.value
