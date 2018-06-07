Casing = require "Casing"
FrmrDatePicker = require "FrmrDatePicker"

class exports.ScreenSummary extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - ScreenSummary_background.width) / 2
            y: (Screen.height - ScreenSummary_background.height) / 2
        super options

        @comps =
            ScreenSummary_selector: ScreenSummary_selector.copy()
            ScreenSummary_back: ScreenSummary_back.copy()
            ScreenSummary_salute_anchor: ScreenSummary_salute_anchor.copy()
            ScreenSummary_topic_anchor: ScreenSummary_topic_anchor.copy()
            ScreenSummary_date_anchor: ScreenSummary_date_anchor.copy()
            ScreenSummary_background: ScreenSummary_background.copy()

        Casing.autoPosition(@, @comps.ScreenSummary_background, @comps)


    wiring_back: Casing.invokeOnce (handleBackTap) ->
        @comps.ScreenSummary_back.onTap =>
            handleBackTap.value()

    wiring_user_name: (userName) ->
        @comps.ScreenSummary_salute?.destroy()
        @comps.ScreenSummary_salute = Casing.sizePositionApply @comps.ScreenSummary_salute_anchor, new TextLayer
            text: "That's great, #{if userName.value != "" then userName.value else "Annonymous"}!"
            textAlign: "left"

    wiring_user_name: (userName) ->
        @comps.ScreenSummary_salute?.destroy()
        @comps.ScreenSummary_salute = Casing.sizePositionApply @comps.ScreenSummary_salute_anchor, new TextLayer
            text: "That's great, #{if userName.value != "" then userName.value else "Annonymous"}!"
            textAlign: "left"

    wiring_topic_chosen: (topicChosen) ->
        @comps.ScreenSummary_topic?.destroy()
        @comps.ScreenSummary_topic = Casing.sizePositionApply @comps.ScreenSummary_topic_anchor, new TextLayer
            text: "You're set to learn Casing topic \"#{_.upperFirst topicChosen.value}\""
            textAlign: "left"

    wiring_date_selected: (dateSelected) ->
        @comps.ScreenSummary_date?.destroy()
        d = dateSelected.value
        f = FrmrDatePicker
        @comps.ScreenSummary_date = Casing.sizePositionApply @comps.ScreenSummary_date_anchor, new TextLayer
            text: (
                if d
                then "on #{f.monthNames[d.getMonth()]}, #{d.getDate()}"
                else "on an unspecified date!"
            )
            textAlign: "left"