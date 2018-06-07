Casing = require "Casing"
FrmrDropdown = require "FrmrDropdown"

class exports.ScreenTopic extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenTopic_background.width) / 2
            y: (Screen.height - ScreenTopic_background.height) / 2
        super options

        @comps =
            ScreenTopic_nameLabel: ScreenTopic_nameLabel.copy()
            ScreenTopic_selector: ScreenTopic_selector.copy()
            ScreenTopic_btnLabel: ScreenTopic_btnLabel.copy()
            ScreenTopic_btn: ScreenTopic_btn.copy()
            ScreenTopic_back: ScreenTopic_back.copy()
            SceenTopic_dropdown_anchor: SceenTopic_dropdown_anchor.copy()
            ScreenTopic_background: ScreenTopic_background.copy()

        Casing.autoPosition(@, @comps.ScreenTopic_background, @comps)

        @comps.SceenTopic_dropdown = Casing.sizePositionApply @comps.SceenTopic_dropdown_anchor, new FrmrDropdown.FrmrDropdown

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenTopic_btn.onTap =>
            dropdownValue = @comps.SceenTopic_dropdown.value
            handleBtnTap.value(dropdownValue)

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenTopic_back.onTap =>
            handleBackTap.value()

    wiring_dropdown_options: (dropdownOptions) ->
        @comps.SceenTopic_dropdown.dropdownOptions = dropdownOptions.value

    wiring_dropdown_value: (topicChosen) ->
        @comps.SceenTopic_dropdown.value = topicChosen.value