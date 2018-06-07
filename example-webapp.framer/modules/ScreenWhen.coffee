Casing = require "Casing"
FrmrDatePicker = require "FrmrDatePicker"

class exports.ScreenWhen extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenWhen_background.width) / 2
            y: (Screen.height - ScreenWhen_background.height) / 2
        super options

        @comps =
            ScreenWhen_nameLabel: ScreenWhen_nameLabel.copy()
            ScreenWhen_selector: ScreenWhen_selector.copy()
            ScreenWhen_btnLabel: ScreenWhen_btnLabel.copy()
            ScreenWhen_btn: ScreenWhen_btn.copy()
            ScreenWhen_back: ScreenWhen_back.copy()
            ScreenWhen_datepicker_anchor: ScreenWhen_datepicker_anchor.copy()
            ScreenWhen_background: ScreenWhen_background.copy()

        Casing.autoPosition(@, @comps.ScreenWhen_background, @comps)

        @comps.ScreenWhen_datepicker = Casing.sizePositionApply @comps.ScreenWhen_datepicker_anchor, new FrmrDatePicker.FrmrDatePicker
                monthsBoxStyle:
                    height: @comps.ScreenWhen_datepicker_anchor.height
                    width: @comps.ScreenWhen_datepicker_anchor.width
                monthHeaderStyle:
                    height: 36
                    fontSize: 14
                numberOfMonthsShow: 2
                dateRangeSelectable: false

    wiring_btn: Casing.invokeOnce (handleBtnTap) ->
        @comps.ScreenWhen_btn.onTap =>
            dateSelected = @comps.ScreenWhen_datepicker.getDateRangeSelectedStart()
            handleBtnTap.value(dateSelected)

    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenWhen_back.onTap =>
            handleBackTap.value()
    
    wiring_date_selected: (dateSelected) ->
        @comps.ScreenWhen_datepicker.setDateRangeSelected(
            dateSelected.value
            dateSelected.value
            false
        )
