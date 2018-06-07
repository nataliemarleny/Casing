Casing = require "Casing"

app = new Casing.App
    showPerformance: false
    dataInit:
        topicChosen: "design"
        userName: ""
        dateSelected: undefined

app.defineComponent
    name: "ScreenWelcome"
    construct: Casing.constructModule "ScreenWelcome"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_name")

app.defineComponent
    name: "ScreenName"
    construct: Casing.constructModule "ScreenName"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_topic")
        handleBackTap: -> app.switchScreen("screen_welcome")
    dataLink:
        userName: "_.userName"

app.defineComponent
    name: "ScreenTopic"
    construct: Casing.constructModule "ScreenTopic"
    dataInit:
        handleBtnTap: (dropdownValue) ->
            # update the data
            app.data['ScreenTopic']['topicChosen'].value = dropdownValue

            # change the screen
            if dropdownValue == 'design'
                app.switchScreen("screen_design1")
            if dropdownValue == 'essentials'
                app.switchScreen("screen_essentials1")
            if dropdownValue == 'modules'
                app.switchScreen("screen_modules1")
            if dropdownValue == 'components'
                app.switchScreen("screen_components1")
            if dropdownValue == 'features'
                app.switchScreen("screen_features1")
        handleBackTap: -> app.switchScreen("screen_name")
        dropdownOptions: [
            {value: 'design', text: 'Design'}
            {value: 'essentials', text: 'Essentials'}
            {value: 'modules', text: 'Modules'}
            {value: 'components', text: 'Components'}
            {value: 'features', text: 'Features'}
        ]
    dataLink:
        topicChosen: "_.topicChosen"

app.defineComponent
    name: "ScreenChoiceDesign1"
    construct: Casing.constructModule "ScreenChoiceDesign1"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_design2")
        handleBackTap: -> app.switchScreen("screen_topic")

app.defineComponent
    name: "ScreenChoiceDesign2"
    construct: Casing.constructModule "ScreenChoiceDesign2"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_design3")
        handleBackTap: -> app.switchScreen("screen_design1")

app.defineComponent
    name: "ScreenChoiceDesign3"
    construct: Casing.constructModule "ScreenChoiceDesign3"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_when")
        handleBackTap: -> app.switchScreen("screen_design2")


app.defineComponent
    name: "ScreenChoiceEssentials1"
    construct: Casing.constructModule "ScreenChoiceEssentials1"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_essentials2")
        handleBackTap: -> app.switchScreen("screen_topic")

app.defineComponent
    name: "ScreenChoiceEssentials2"
    construct: Casing.constructModule "ScreenChoiceEssentials2"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_essentials3")
        handleBackTap: -> app.switchScreen("screen_essentials1")

app.defineComponent
    name: "ScreenChoiceEssentials3"
    construct: Casing.constructModule "ScreenChoiceEssentials3"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_essentials4")
        handleBackTap: -> app.switchScreen("screen_essentials2")

app.defineComponent
    name: "ScreenChoiceEssentials4"
    construct: Casing.constructModule "ScreenChoiceEssentials4"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_when")
        handleBackTap: -> app.switchScreen("screen_essentials3")


app.defineComponent
    name: "ScreenChoiceModules1"
    construct: Casing.constructModule "ScreenChoiceModules1"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_modules2")
        handleBackTap: -> app.switchScreen("screen_topic")

app.defineComponent
    name: "ScreenChoiceModules2"
    construct: Casing.constructModule "ScreenChoiceModules2"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_modules3")
        handleBackTap: -> app.switchScreen("screen_modules1")

app.defineComponent
    name: "ScreenChoiceModules3"
    construct: Casing.constructModule "ScreenChoiceModules3"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_modules4")
        handleBackTap: -> app.switchScreen("screen_modules2")

app.defineComponent
    name: "ScreenChoiceModules4"
    construct: Casing.constructModule "ScreenChoiceModules4"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_when")
        handleBackTap: -> app.switchScreen("screen_modules3")


app.defineComponent
    name: "ScreenChoiceComponents1"
    construct: Casing.constructModule "ScreenChoiceComponents1"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_components2")
        handleBackTap: -> app.switchScreen("screen_topic")

app.defineComponent
    name: "ScreenChoiceComponents2"
    construct: Casing.constructModule "ScreenChoiceComponents2"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_components3")
        handleBackTap: -> app.switchScreen("screen_components1")

app.defineComponent
    name: "ScreenChoiceComponents3"
    construct: Casing.constructModule "ScreenChoiceComponents3"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_components4")
        handleBackTap: -> app.switchScreen("screen_components2")

app.defineComponent
    name: "ScreenChoiceComponents4"
    construct: Casing.constructModule "ScreenChoiceComponents4"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_when")
        handleBackTap: -> app.switchScreen("screen_components3")


app.defineComponent
    name: "ScreenChoiceFeatures1"
    construct: Casing.constructModule "ScreenChoiceFeatures1"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_features2")
        handleBackTap: -> app.switchScreen("screen_topic")


app.defineComponent
    name: "ScreenChoiceFeatures2"
    construct: Casing.constructModule "ScreenChoiceFeatures2"
    dataInit:
        handleBtnTap: -> app.switchScreen("screen_when")
        handleBackTap: -> app.switchScreen("screen_features1")


app.defineComponent
    name: "ScreenWhen"
    construct: Casing.constructModule "ScreenWhen"
    dataInit:
        handleBtnTap: (dateSelected) ->
            app.data['ScreenWhen']['dateSelected'].value = dateSelected
            app.switchScreen("screen_summary")
        handleBackTap: ->
            # get the data from the global namespace
            topicChosen = app.data['_']['topicChosen'].value

            # change the screen
            if topicChosen == 'design'
                app.switchScreen("screen_design3")
            if topicChosen == 'essentials'
                app.switchScreen("screen_essentials4")
            if topicChosen == 'modules'
                app.switchScreen("screen_modules4")
            if topicChosen == 'components'
                app.switchScreen("screen_components4")
            if topicChosen == 'features'
                app.switchScreen("screen_features2")
    dataLink:
        dateSelected: "_.dateSelected"


app.defineComponent
    name: "ScreenSummary"
    construct: Casing.constructModule "ScreenSummary"
    dataInit:
        handleBackTap: -> app.switchScreen("screen_when")
    dataLink:
        topicChosen: "_.topicChosen"
        userName: "_.userName"
        dateSelected: "_.dateSelected"

app.defineScreen "screen_welcome", ["ScreenWelcome"]
app.defineScreen "screen_name", ["ScreenName"]
app.defineScreen "screen_topic", ["ScreenTopic"]

app.defineScreen "screen_design1", ["ScreenChoiceDesign1"]
app.defineScreen "screen_design2", ["ScreenChoiceDesign2"]
app.defineScreen "screen_design3", ["ScreenChoiceDesign3"]

app.defineScreen "screen_essentials1", ["ScreenChoiceEssentials1"]
app.defineScreen "screen_essentials2", ["ScreenChoiceEssentials2"]
app.defineScreen "screen_essentials3", ["ScreenChoiceEssentials3"]
app.defineScreen "screen_essentials4", ["ScreenChoiceEssentials4"]

app.defineScreen "screen_modules1", ["ScreenChoiceModules1"]
app.defineScreen "screen_modules2", ["ScreenChoiceModules2"]
app.defineScreen "screen_modules3", ["ScreenChoiceModules3"]
app.defineScreen "screen_modules4", ["ScreenChoiceModules4"]

app.defineScreen "screen_components1", ["ScreenChoiceComponents1"]
app.defineScreen "screen_components2", ["ScreenChoiceComponents2"]
app.defineScreen "screen_components3", ["ScreenChoiceComponents3"]
app.defineScreen "screen_components4", ["ScreenChoiceComponents4"]

app.defineScreen "screen_features1", ["ScreenChoiceFeatures1"]
app.defineScreen "screen_features2", ["ScreenChoiceFeatures2"]

app.defineScreen "screen_when", ["ScreenWhen"]
app.defineScreen "screen_summary", ["ScreenSummary"]

app.switchScreen("screen_welcome")
