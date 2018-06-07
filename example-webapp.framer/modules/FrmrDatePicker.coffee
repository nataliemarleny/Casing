# Copyright (c) 2018 Natalie Marleny
# Casing - UI framework for Framer
# License: MIT
# URL: https://github.com/nataliemarleny/Casing

# Utility functinos for manipulating dates
Date.prototype.addDays = (deltaDays) ->
    return new Date(
        @getFullYear(),
        @getMonth(),
        @getDate() + deltaDays,
    )

Date.prototype.addMonths = (deltaMonths) ->
    return new Date(
        @getFullYear(),
        @getMonth() + deltaMonths,
    )

# Utility arrays
monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]
exports.monthNames = monthNames

monthNamesUppercase = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
]
exports.monthNamesUppercase = monthNamesUppercase

monthAbbrevsUppercase = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
]
exports.monthAbbrevsUppercase = monthAbbrevsUppercase

monthAbbrevsLowercase = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]
exports.monthAbbrevsLowercase = monthAbbrevsLowercase

dayAbbrevs = [
    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
]
exports.dayAbbrevs = dayAbbrevs


class exports.FrmrDatePicker extends Layer
    constructor: (options = {}) ->
        # CONFIGURATION
        defaults =
            enabled: true
            numberOfMonthsShow: 1
            firstColumnDay: 1

            startDateShow: new Date(Date.now())
            dateRangeSelectedStart: undefined
            dateRangeSelectedEnd: undefined

            hoverEnabled: true
            dateRangeSelectable: false  # if false only single date is selectable
            outsideMonthDatesShow: false
            buttonNextShow: true
            buttonPrevShow: true

            highlightDateRanges: [
                # {
                #     dateRangeStart: new Date(2018, 5, 5)
                #     dateRangeEnd: new Date(2018, 5, 8)
                #     dateExtraStyle:
                #         backgroundColor: "red"
                #         color: "white"
                # }
            ]

            handleMonthsShowChange: (previousStartDateShow, currentStartDateShow) ->
                undefined

            handleDateRangeSelectedChange: (
                previousDateRangeSelectedStart
                previousDateRangeSelectedEnd
                currentDateRangeSelectedStart
                currentDateRangeSelectedEnd
            ) ->
                undefined

            monthsBoxStyle:
                backgroundColor: "#ffffff"
                width: 277 * (options.numberOfMonthsShow or 1)
                height: 285
                borderWidth: 1
                borderRadius: 6
                borderColor: "#E9ECF0"
                padding:
                    top: 3
                    bottom: 0
                    left: 15
                    right: 15
            monthHeaderStyle:
                height: 36
                backgroundColor: "transparent"
                color: "#3C444D"
                textAlign: "center"
                fontSize: 18
                fontStyle: "bold"
                fontFamily: "-apple-system"
                padding:
                    vertical: 0
                    left: 3
                    right: 3
            weekHeaderStyle:
                height: 36
                backgroundColor: "transparent"
                color: "#3C444D"
                textAlign: "center"
                fontSize: 12
                fontFamily: "-apple-system"
                padding:
                    vertical: 1
            datesBoxStyle:
                backgroundColor: "transparent"
                color: "#3C444D"
                padding:
                    top: 3
                    bottom: 0
                    left: 20
                    right: 20
            buttonsStyle:
                fontSize: 12
            dateBaseStyle:
                color: "#3C444D"
                backgroundColor: "transparent"
                borderColor: "#e6e6e6"
                borderWidth: 1
                borderRadius: 1
                textAlign: "center"
                fontSize: 12
                fontFamily: "-apple-system"
                padding:
                    vertical: 6
                margin:
                    top: 0
                    bottom: -1
                    left: 0
                    right: -1
            dateSelectedExtraStyle:
                backgroundColor: "#3C444D"
                color: "white"
            dateHoveredExtraStyle:
                backgroundColor: "#cccccc"
                color: "white"
            dateOutsideMonthExtraStyle:
                opacity: 0.25

        # assign all configuration to the object as properties
        configs_passed = _.pick options, _.keys defaults
        _.assign @, (_.merge {}, defaults, configs_passed)

        # FIXED STYLES
        options.backgroundColor = @monthsBoxStyle.backgroundColor
        options.width = @monthsBoxStyle.width
        options.height = @monthsBoxStyle.height

        super options

        # LAYER STORAGE
        @dateCellBoxLayerDict = {}
        @topContainerLayer = new Layer(
            _.merge(
                {}
                @monthsBoxStyle
                {parent: @}
            )
        )

        # RENDERING
        @_clean()
        @_render()


    _render: () ->
        @isolatorLayer = new Layer(
            _.merge(
                {}
                @topContainerLayer.frame
                {
                    backgroundColor: "transparent"
                    parent: @topContainerLayer
                }
            )
        )

        monthsBoxLayer = new Layer
            backgroundColor: "transparent"
            parent: @isolatorLayer
            x: @monthsBoxStyle.padding.left
            y: @monthsBoxStyle.padding.top
            width: (
                @isolatorLayer.width +
                (-@monthsBoxStyle.padding.left) +
                (-@monthsBoxStyle.padding.right)
            )
            height: (
                @isolatorLayer.height +
                (-@monthsBoxStyle.padding.top) +
                (- @monthsBoxStyle.padding.bottom)
            )

        for monthIndex in [0...@numberOfMonthsShow]

            # SECTION: month
            monthLayer = new Layer(
                _.merge(
                    {}
                    @datesBoxStyle,
                    {
                        parent: monthsBoxLayer
                        x: monthIndex * (monthsBoxLayer.width / @numberOfMonthsShow)
                        y: 0
                        width: (monthsBoxLayer.width / @numberOfMonthsShow)
                        height: monthsBoxLayer.height
                    }
                )
            )
            contentBoxLayer = new Layer
                parent: monthLayer

                backgroundColor: "transparent"
                x: @datesBoxStyle.padding.left
                y: @datesBoxStyle.padding.top
                width: (
                    monthLayer.width +
                    (-@datesBoxStyle.padding.left) +
                    (-@datesBoxStyle.padding.right)
                )
                height: (
                    monthLayer.height +
                    (-@datesBoxStyle.padding.top) +
                    (-@datesBoxStyle.padding.bottom)
                )

            # SECTION: days rendering pre-calc
            firstOfMonth = new Date(
                @startDateShow.getFullYear(),
                @startDateShow.getMonth() + monthIndex,
                1
            )

            firstGridDate = new Date(firstOfMonth)
            while firstGridDate.getDay() != @firstColumnDay
                firstGridDate = firstGridDate.addDays(-1)

            # SECTION: headers
            monthHeaderLayer = new TextLayer(
                _.merge(
                    {}
                    @monthHeaderStyle,
                    {
                        parent: contentBoxLayer
                        x: 0
                        y: 0
                        width: contentBoxLayer.width

                        text: "#{monthNamesUppercase[firstOfMonth.getMonth()]} #{firstOfMonth.getFullYear()}"
                        truncate: true
                    }
                )
            )

            if (
                monthIndex == 0 and
                @buttonPrevShow
            )
                @btnPrevBoxLayer = new Layer
                    parent: monthHeaderLayer
                    backgroundColor: "transparent"
                    x: 0
                    y: 0
                    width: monthHeaderLayer.width / 4
                    height: monthHeaderLayer.height
                btnPrevArrowLayer = new TextLayer
                    parent: @btnPrevBoxLayer
                    backgroundColor: "transparent"
                    x: 0
                    y: 0
                    width: @btnPrevBoxLayer.width / 3
                    height: @btnPrevBoxLayer.height
                    text: "<"
                    textAlign: "left"
                    color: "#3C444D"

                    # hacky...
                    fontSize: @buttonsStyle.fontSize * 2
                    fontFamily: "-apple-system"
                    padding:
                        vertical: (@btnPrevBoxLayer.height - 3*@buttonsStyle.fontSize) / 2
                btnPrevLabelLayer = new TextLayer(
                    _.merge(
                        {}
                        @buttonsStyle
                        {
                            parent: @btnPrevBoxLayer
                            x: @btnPrevBoxLayer.width / 3
                            y: 0
                            width: @btnPrevBoxLayer.width * 2 / 3
                            height: @btnPrevBoxLayer.height
                            text: "#{monthAbbrevsUppercase[(firstOfMonth.getMonth() + 12 - 1) % 12]}"
                            textAlign: "left"
                            color: "#3C444D"

                            # hacky ...
                            padding:
                                vertical: (@btnPrevBoxLayer.height - 1.5*@buttonsStyle.fontSize) / 2
                        }
                    )
                )
                @btnPrevBoxLayer.onTap =>
                    @setStartDateShow @startDateShow.addMonths(-1)

            if (
                monthIndex == @numberOfMonthsShow - 1 and
                @buttonNextShow
            )
                @btnNextBoxLayer = new Layer
                    parent: monthHeaderLayer
                    backgroundColor: "transparent"
                    x: monthHeaderLayer.width * 3 / 4
                    y: 0
                    width: monthHeaderLayer.width / 4
                    height: monthHeaderLayer.height
                btnNextArrowLayer = new TextLayer
                    parent: @btnNextBoxLayer
                    backgroundColor: "transparent"
                    x: @btnNextBoxLayer.width * 2 / 3
                    y: 0
                    width: @btnNextBoxLayer.width / 3
                    height: @btnNextBoxLayer.height
                    text: ">"
                    color: "#3C444D"
                    textAlign: "right"

                    # hacky...
                    fontSize: @buttonsStyle.fontSize * 2
                    fontFamily: "-apple-system"
                    padding:
                        vertical: (@btnNextBoxLayer.height - 3*@buttonsStyle.fontSize) / 2

                btnNextLabelLayer = new TextLayer(
                    _.merge(
                        {}
                        @buttonsStyle
                        {
                            parent: @btnNextBoxLayer
                            x: 0
                            y: 0
                            width: @btnNextBoxLayer.width * 2 / 3
                            height: @btnNextBoxLayer.height
                            text: "#{monthAbbrevsUppercase[(firstOfMonth.getMonth() + 1) % 12]}"
                            textAlign: "right"
                            color: "#3C444D"

                            # hacky ...
                            padding:
                                vertical: (@btnNextBoxLayer.height - 1.5*@buttonsStyle.fontSize) / 2
                        }
                    )
                )
                @btnNextBoxLayer.onTap =>
                    @setStartDateShow @startDateShow.addMonths(1)


            weekHeaderLayer = new Layer
                backgroundColor: "transparent"
                x: 0
                y: monthHeaderLayer.y + monthHeaderLayer.height
                width: contentBoxLayer.width
                height: @weekHeaderStyle.height
                parent: contentBoxLayer

            # Styling for weekHeaderLayer intentionally used for its children...
            for dayIndex in [0...7]
                new TextLayer(
                    _.merge(
                        {}
                        @weekHeaderStyle
                        {
                            x: dayIndex * (contentBoxLayer.width / 7)
                            y: 0
                            width: contentBoxLayer.width / 7
                            height: weekHeaderLayer.height
                            parent: weekHeaderLayer
                            text: "#{dayAbbrevs[(dayIndex + @firstColumnDay) % 7]}"
                            truncate: true
                        }
                    )
                )

            # SECTION: date cells
            daysGridLayer = new Layer
                backgroundColor: "transparent"
                x: 0
                y: weekHeaderLayer.y + weekHeaderLayer.height
                width: contentBoxLayer.width
                height: (
                    contentBoxLayer.height +
                    (-monthHeaderLayer.height) +
                    (-weekHeaderLayer.height) +
                    (-@datesBoxStyle.padding.top) +
                    (-@datesBoxStyle.padding.bottom)
                )
                parent: contentBoxLayer

            dateRendering = firstGridDate
            for row in [0...6]
                for column in [0...7]
                    if (
                        @outsideMonthDatesShow or
                        dateRendering.getMonth() == firstOfMonth.getMonth()
                    )
                        isOutsideMonth = dateRendering.getMonth() != firstOfMonth.getMonth()

                        dateCellBoxLayer = new Layer
                            parent: daysGridLayer
                            backgroundColor: "transparent"
                            y: row * daysGridLayer.height / 6
                            x: column * daysGridLayer.width / 7
                            height: daysGridLayer.height / 6
                            width: daysGridLayer.width / 7

                        extraStyle = {}
                        if not isOutsideMonth
                            # add to the map addressable by date
                            @dateCellBoxLayerDict[dateRendering] = dateCellBoxLayer

                            # extra styles for highlight ranges
                            for highlighRange in @highlightDateRanges
                                if (
                                    highlighRange.dateRangeStart <= dateRendering and
                                    dateRendering <= highlighRange.dateRangeEnd
                                )
                                    _.merge extraStyle, highlighRange.dateExtraStyle
                        else
                            # extra style for outside-month dates
                            extraStyle = @dateOutsideMonthExtraStyle

                        dateCellLayer = new TextLayer(
                            _.merge(
                                {}
                                @dateBaseStyle
                                {
                                    parent: dateCellBoxLayer
                                    x: @dateBaseStyle.margin.left
                                    y: @dateBaseStyle.margin.top
                                    width: (
                                        dateCellBoxLayer.width +
                                        (-@dateBaseStyle.margin.left) +
                                        (-@dateBaseStyle.margin.right)
                                    )
                                    height: (
                                        dateCellBoxLayer.height +
                                        (-@dateBaseStyle.margin.top) +
                                        (-@dateBaseStyle.margin.bottom)
                                    )
                                    text: "#{dateRendering.getDate()}"
                                }
                                extraStyle
                            )
                        )
                        dateCellBoxLayer.date = dateRendering
                        dateCellBoxLayer.dateCellLayer = dateCellLayer

                        if not isOutsideMonth
                            self = @

                            # Handle selecting
                            dateCellLayer.yesSelectedStyle = @dateSelectedExtraStyle
                            dateCellLayer.noSelectedStyle = _.pick dateCellLayer, _.keys @dateSelectedExtraStyle

                            do (dateCellBoxLayer, self) ->
                                dateCellBoxLayer.onTap () ->
                                    if not self.enabled
                                        return
                                    if (
                                        self.dateRangeSelectedStart == undefined or
                                        not self.dateRangeSelectable
                                    )
                                        self.setDateRangeSelected(dateCellBoxLayer.date, dateCellBoxLayer.date)
                                        return
                                    if (self._nextChangeDateRangeStart or false)
                                        self.setDateRangeSelected(self.dateRangeSelectedStart, dateCellBoxLayer.date)
                                    else
                                        self.setDateRangeSelected(dateCellBoxLayer.date, self.dateRangeSelectedEnd)
                                    self._nextChangeDateRangeStart = not (self._nextChangeDateRangeStart or false)

                            # Handle hovering
                            if @hoverEnabled
                                dateCellLayer.yesHoveredStyle = @dateHoveredExtraStyle
                                dateCellLayer.noHoveredStyle = _.pick dateCellLayer, _.keys @dateHoveredExtraStyle

                                do (dateCellBoxLayer, dateCellLayer, self) ->
                                    dateCellBoxLayer.on Events.MouseOver, (event, layer) ->
                                        _.assign dateCellLayer, dateCellLayer.yesHoveredStyle
                                    dateCellBoxLayer.on Events.MouseOut, (event, layer) ->
                                        _.assign dateCellLayer, dateCellLayer.noHoveredStyle
                                        if (self._isDateSelected(dateCellBoxLayer.date))
                                            _.assign dateCellLayer, dateCellLayer.yesSelectedStyle

                    dateRendering = dateRendering.addDays(1)

            # After the rendering, set the initial selected range
            @setDateRangeSelected(@dateRangeSelectedStart, @dateRangeSelectedEnd, false)

    _isDateSelected: (date) ->
        return (
            @dateRangeSelectedStart <= date and
            date <= @dateRangeSelectedEnd
        )

    _clean: () ->
        @isolatorLayer?.destroy()

    # INTERFACE METHODS
    getStartDateShow: () ->
        return @startDateShow

    setStartDateShow: (currentStartDateShow) ->
        previousStartDateShow = @startDateShow

        @startDateShow = currentStartDateShow
        @_clean()
        @_render()

        @handleMonthsShowChange(previousStartDateShow, currentStartDateShow)

    getDateRangeSelectedStart: () ->
        return @dateRangeSelectedStart

    getDateRangeSelectedEnd: () ->
        return @dateRangeSelectedEnd

    setDateRangeSelected: (currentDateRangeSelectedStart, currentDateRangeSelectedEnd, triggerHandler = true) ->
        if currentDateRangeSelectedStart > currentDateRangeSelectedEnd
            [currentDateRangeSelectedStart, currentDateRangeSelectedEnd] =
                [currentDateRangeSelectedEnd, currentDateRangeSelectedStart]

        previousDateRangeSelectedStart = @dateRangeSelectedStart
        previousDateRangeSelectedEnd = @dateRangeSelectedEnd

        # ... unselect previously selected
        if (
            previousDateRangeSelectedStart != undefined and
            previousDateRangeSelectedEnd != undefined
        )
            currentDate = previousDateRangeSelectedStart
            while currentDate <= previousDateRangeSelectedEnd
                dateCellLayer = @dateCellBoxLayerDict[currentDate].dateCellLayer
                _.assign dateCellLayer, dateCellLayer.noSelectedStyle
                currentDate = currentDate.addDays(1)

        # ... select currently selected
        if (
            currentDateRangeSelectedStart != undefined and
            currentDateRangeSelectedEnd != undefined
        )
            currentDate = currentDateRangeSelectedStart
            while currentDate <= currentDateRangeSelectedEnd
                dateCellLayer = @dateCellBoxLayerDict[currentDate].dateCellLayer
                _.assign dateCellLayer, dateCellLayer.yesSelectedStyle
                currentDate = currentDate.addDays(1)

        # ... update the newest state
        @dateRangeSelectedStart = currentDateRangeSelectedStart
        @dateRangeSelectedEnd = currentDateRangeSelectedEnd

        # ... call the handler
        if triggerHandler
            @handleDateRangeSelectedChange(
                previousDateRangeSelectedStart
                previousDateRangeSelectedEnd
                currentDateRangeSelectedStart
                currentDateRangeSelectedEnd
            )

    getHighlightDateRanges: () ->
        return @highlightDateRanges

    setHighlightDateRanges: (highlightDateRanges) ->
        @highlightDateRanges = highlightDateRanges
        @_clean()
        @_render()

    setHandleMonthsShowChange: (handler) ->
        @handleMonthsShowChange = handler

    setHandleDateRangeSelectedChange: (handler) ->
        @handleDateRangeSelectedChange = handler
