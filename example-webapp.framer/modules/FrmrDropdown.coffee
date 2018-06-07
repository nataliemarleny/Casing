# Copyright (c) 2018 Natalie Marleny
# Casing - UI framework for Framer
# License: MIT
# URL: https://github.com/nataliemarleny/Casing


class exports.FrmrDropdown extends Layer
    constructor: (options = {}) ->
        DOM_id = "dropdown-#{_.random(2**31)}-#{_.now()}"
        _.defaults options,
            html: """
                <select
                    id="#{DOM_id}"
                    style='background-color: #FFFFFF; appearance: none; outline: none; line-height: normal; margin: 0; border: 0; padding: 0; border-color: #E9ECF0; font-family: "-apple-system"; font-size: 14px; color: #7A838D; width: 310px; height: 45px; border-width: 2px; box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.05);'
                >
                    <option value=""></option>
                </select>
            """
            height: 44
            width: 310
            backgroundColor: "#FFFFFF"

        super options

        @dropdown = document.getElementById(DOM_id)

    @define "value",
        get: -> @dropdown.value
        set: (value) ->
            @dropdown.value = value

    @define "dropdownOptions",
        get: -> @_dropdownOptions
        set: (dropdownOptions) ->
            """
            [{value: 'option-value', text: 'option-text'}]
            """
            @_dropdownOptions = dropdownOptions

            _optionsHTML = ""
            for option in @dropdownOptions
                _optionsHTML += "<option value=#{option.value}>#{option.text}</option>"

            @dropdown.innerHTML = _optionsHTML
